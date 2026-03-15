import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { TextArea } from '@/components/ui/TextArea'
import { Label } from '@/components/ui/Label'
import { Card, CardContent } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { createContraindicationRule, updateContraindicationRule, removeContraindicationRule } from '@/data/queries'
import { AlertCircle, Trash2, Ban, ShieldAlert } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import type { ContraindicationSeverity, ContraindicationType, MedicationContraindicationRule } from '@/types/database'

interface ContraindicationRuleFormProps {
  ingredients: { id: string; canonical_name: string }[]
  rule?: MedicationContraindicationRule | null
  initialIngredientId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function ContraindicationRuleForm({ ingredients, rule, initialIngredientId, onSuccess, onCancel }: ContraindicationRuleFormProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const isEditing = !!rule
  
  const [formData, setFormData] = useState({
    ingredient_id: '',
    contraindication_name: '',
    contraindication_type: 'condition' as ContraindicationType,
    severity: 'high' as ContraindicationSeverity,
    guidance_text: '',
    source_name: 'manual_dashboard',
    is_active: true,
  })

  useEffect(() => {
    if (rule) {
      setFormData({
        ingredient_id: rule.ingredient_id || '',
        contraindication_name: rule.contraindication_name || '',
        contraindication_type: rule.contraindication_type || 'condition',
        severity: rule.severity || 'high',
        guidance_text: rule.guidance_text || '',
        source_name: rule.source_name || 'manual_dashboard',
        is_active: rule.is_active ?? true,
      })
    } else if (initialIngredientId) {
      setFormData(prev => ({ ...prev, ingredient_id: initialIngredientId }))
    }
  }, [rule, initialIngredientId])

  const mutation = useMutation({
    mutationFn: (data: typeof formData) => {
      const payload = {
        ingredient_id: data.ingredient_id,
        contraindication_name: data.contraindication_name.trim(),
        contraindication_type: data.contraindication_type,
        severity: data.severity,
        guidance_text: data.guidance_text.trim() || null,
        source_name: data.source_name,
        is_active: data.is_active,
      }
      
      if (isEditing && rule) {
        return updateContraindicationRule(rule.id, payload)
      }
      return createContraindicationRule(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contraindication-rules'] })
      queryClient.invalidateQueries({ queryKey: ['medication-rules'] })
      queryClient.invalidateQueries({ queryKey: ['overview-counts'] })
      if (onSuccess) onSuccess()
      else navigate({ to: '/contraindications' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: removeContraindicationRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contraindication-rules'] })
      queryClient.invalidateQueries({ queryKey: ['medication-rules'] })
      queryClient.invalidateQueries({ queryKey: ['overview-counts'] })
      navigate({ to: '/contraindications' })
    },
  })

  const handleDelete = () => {
    if (rule && confirm('Are you sure you want to delete this contraindication rule?')) {
      deleteMutation.mutate(rule.id)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.ingredient_id || !formData.contraindication_name.trim()) return
    mutation.mutate(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10 animate-in-fade">
        {mutation.error && (
          <div className="flex items-center gap-3 rounded-2xl bg-safety-red/10 p-5 text-sm text-safety-red font-black uppercase tracking-tight border border-safety-red/20">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {mutation.error instanceof Error ? mutation.error.message : 'System Error: Failed to save caution rule'}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-2">
            <h3 className="text-xl font-black text-clinical-900 tracking-tight leading-none">Caution Logic</h3>
            <p className="text-xs text-clinical-500 font-bold uppercase tracking-widest leading-relaxed">
              Define absolute contraindications based on patient factors
            </p>
          </div>
          
          <Card className="lg:col-span-2 border-2 border-clinical-100 shadow-sm rounded-3xl">
            <CardContent className="p-8 space-y-8">
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="ingredient_id" className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400 px-1">Active Substance *</Label>
                  <Select
                    id="ingredient_id"
                    value={formData.ingredient_id}
                    onChange={(e) => setFormData({ ...formData, ingredient_id: e.target.value })}
                    required
                    className="h-12 font-black text-clinical-900 border-2 border-clinical-100 focus:border-brand-400"
                  >
                    <option value="">Select substance...</option>
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.canonical_name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="contraindication_name" className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400 px-1 flex items-center gap-2">
                    <Ban className="h-3.5 w-3.5 text-safety-red" />
                    Condition or Physiological Factor *
                  </Label>
                  <Input
                    id="contraindication_name"
                    value={formData.contraindication_name}
                    onChange={(e) => setFormData({ ...formData, contraindication_name: e.target.value })}
                    placeholder="e.g., Severe renal impairment, Pregnancy"
                    className="h-12 font-black border-2 border-clinical-100 focus:border-brand-400 placeholder:text-clinical-200"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="contraindication_type" className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400 px-1">Caution Category</Label>
                  <Select
                    id="contraindication_type"
                    value={formData.contraindication_type}
                    onChange={(e) => setFormData({ ...formData, contraindication_type: e.target.value as ContraindicationType })}
                    className="h-12 font-bold border-2 border-clinical-100 focus:border-brand-400"
                  >
                    <option value="condition">Condition (Disease)</option>
                    <option value="allergy">Allergy (Hypersensitivity)</option>
                    <option value="age">Age Group</option>
                    <option value="pregnancy">Pregnancy</option>
                    <option value="lactation">Lactation</option>
                    <option value="organ_function">Organ Function</option>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="severity" className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400 px-1">Clinical Severity</Label>
                  <Select
                    id="severity"
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value as ContraindicationSeverity })}
                    className="h-12 font-black border-2 border-clinical-100 focus:border-brand-400 uppercase tracking-widest text-xs"
                  >
                    <option value="low">LOW (Precaution)</option>
                    <option value="medium">MEDIUM (Moderate Risk)</option>
                    <option value="high">HIGH (Strong Precaution)</option>
                    <option value="severe">SEVERE (Absolute Risk)</option>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-2">
            <h3 className="text-xl font-black text-clinical-900 tracking-tight leading-none">Clinical Guidance</h3>
            <p className="text-xs text-clinical-500 font-bold uppercase tracking-widest leading-relaxed">
              Actionable advice for triggered safety barriers
            </p>
          </div>
          
          <Card className="lg:col-span-2 border-2 border-clinical-100 shadow-sm rounded-3xl">
            <CardContent className="p-8">
              <div className="space-y-3">
                <Label htmlFor="guidance_text" className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400 px-1">Clinician Direction</Label>
                <TextArea
                  id="guidance_text"
                  value={formData.guidance_text}
                  onChange={(e) => setFormData({ ...formData, guidance_text: e.target.value })}
                  placeholder="Recommended action or clinical alternative..."
                  rows={4}
                  className="font-bold border-2 border-clinical-100 border-dashed bg-clinical-50/20 focus:border-brand-400 focus:bg-white"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-5 p-6 rounded-[2rem] bg-clinical-900 text-white shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
            <ShieldAlert size={100} />
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 border border-white/10 shrink-0">
            <ShieldAlert className="h-6 w-6 text-brand-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-clinical-400 mb-2">Rule Distribution</p>
            <label className="flex items-center gap-3 cursor-pointer group/label">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-5 w-5 rounded-lg border-white/20 bg-white/10 text-brand-500 focus:ring-brand-500 cursor-pointer transition-all"
              />
              <div className="flex flex-col">
                <span className="text-sm font-black tracking-tight group-hover/label:text-brand-400 transition-colors">
                  Enable Logic Synchronization
                </span>
                <span className="text-[10px] font-bold text-clinical-500 uppercase tracking-widest mt-0.5">
                  Distribute this barrier to offline safety engines
                </span>
              </div>
            </label>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-6 py-10 border-t-2 border-clinical-100">
          <div className="w-full sm:w-auto">
            {isEditing && (
              <Button 
                type="button" 
                variant="ghost" 
                size="md" 
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="w-full h-12 px-6 text-clinical-400 hover:text-safety-red hover:bg-safety-red/5 font-black uppercase tracking-widest text-[10px] rounded-xl"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Discard Caution Rule
              </Button>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Button 
              type="button" 
              variant="outline" 
              size="md" 
              onClick={() => {
                if (onCancel) onCancel()
                else navigate({ to: '/contraindications' })
              }} 
              className="h-12 px-10 font-black uppercase tracking-widest text-[10px] border-2 border-clinical-200 rounded-xl"
            >
              Cancel Edit
            </Button>
            <Button 
              type="submit" 
              size="md" 
              disabled={mutation.isPending || !formData.ingredient_id || !formData.contraindication_name.trim()} 
              className="h-12 px-12 font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-clinical-600/20 rounded-xl bg-clinical-900 hover:bg-clinical-800"
            >
              {mutation.isPending ? 'Committing Logic...' : isEditing ? 'Update Caution' : 'Publish Caution'}
            </Button>
          </div>
        </div>
      </form>
  )
}
