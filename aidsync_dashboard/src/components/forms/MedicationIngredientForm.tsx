import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { createMedicationCatalogIngredient } from '@/data/queries'
import { useAuth } from '@/hooks/useAuth'
import { canManageReferenceData, getUserFriendlyErrorMessage } from '@/lib/utils'
import { AlertCircle, Beaker, Info } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import type { ActiveIngredient, MedicationCatalog } from '@/types/database'

interface MedicationIngredientFormProps {
  medications: MedicationCatalog[]
  ingredients: ActiveIngredient[]
  initialMedicationId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function MedicationIngredientForm({ 
  medications, 
  ingredients,
  initialMedicationId,
  onSuccess,
  onCancel
}: MedicationIngredientFormProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const canEdit = canManageReferenceData(profile?.role)
  
  const [formData, setFormData] = useState({
    medication_id: '',
    ingredient_id: '',
    strength_text: '',
    sort_order: 0,
    is_primary: false,
  })

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      medication_id: initialMedicationId || prev.medication_id || '',
    }))
  }, [initialMedicationId])

  const mutation = useMutation({
    mutationFn: (data: typeof formData) => createMedicationCatalogIngredient({
      medication_id: data.medication_id,
      ingredient_id: data.ingredient_id,
      strength_text: data.strength_text.trim() || null,
      sort_order: data.sort_order,
      is_primary: data.is_primary,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medication', formData.medication_id] })
      queryClient.invalidateQueries({ queryKey: ['medications'] })
      queryClient.invalidateQueries({ queryKey: ['overview-counts'] })
      if (onSuccess) onSuccess()
      else navigate({ to: `/medications/${formData.medication_id}` })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canEdit) return
    if (!formData.medication_id || !formData.ingredient_id) return
    mutation.mutate(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10 animate-in-fade">
        {mutation.error && (
          <div className="flex items-center gap-3 rounded-2xl bg-safety-red/10 p-5 text-sm text-safety-red font-black uppercase tracking-tight border border-safety-red/20">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {getUserFriendlyErrorMessage(mutation.error, 'System Error: Failed to link clinical substance')}
          </div>
        )}

        {!canEdit && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-safety-yellow/10 border border-safety-yellow/20 text-safety-yellow text-xs font-black uppercase tracking-wider">
            <Info className="h-4 w-4" />
            Review Mode Only: Higher privileges required to modify medication composition
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-2">
            <h3 className="text-xl font-black text-clinical-900 tracking-tight leading-none">Composition Logic</h3>
            <p className="text-xs text-clinical-500 font-bold uppercase tracking-widest leading-relaxed">
              Establish the active substance relationship
            </p>
          </div>
          
          <Card className="lg:col-span-2 border-2 border-clinical-100 shadow-sm rounded-3xl">
            <CardContent className="p-8 space-y-6">
              <div className="space-y-3">
                <Label htmlFor="medication_id" className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400 px-1">Target Medication Profile *</Label>
                <Select
                  id="medication_id"
                  value={formData.medication_id}
                  onChange={(e) => setFormData({ ...formData, medication_id: e.target.value })}
                  required
                  disabled={!canEdit || !!initialMedicationId}
                  className="h-12 font-black text-clinical-900 border-2 border-clinical-100 focus:border-brand-400"
                >
                  <option value="">Select a medication record...</option>
                  {medications.map((med) => (
                    <option key={med.id} value={med.id}>
                      {med.brand_name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="ingredient_id" className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400 px-1 flex items-center gap-2">
                  <Beaker className="h-3.5 w-3.5" />
                  Active Clinical Substance *
                </Label>
                <Select
                  id="ingredient_id"
                  value={formData.ingredient_id}
                  onChange={(e) => setFormData({ ...formData, ingredient_id: e.target.value })}
                  required
                  disabled={!canEdit}
                  className="h-12 font-black text-clinical-900 border-2 border-clinical-100 focus:border-brand-400"
                >
                  <option value="">Select a normalized substance dictionary entry...</option>
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.canonical_name}
                    </option>
                  ))}
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-2">
            <h3 className="text-xl font-black text-clinical-900 tracking-tight leading-none">Strength & Order</h3>
            <p className="text-xs text-clinical-500 font-bold uppercase tracking-widest leading-relaxed">
              Define the concentration and display priority
            </p>
          </div>
          
          <Card className="lg:col-span-2 border-2 border-clinical-100 shadow-sm rounded-3xl">
            <CardContent className="p-8 space-y-8">
              <div className="space-y-3">
                <Label htmlFor="strength_text" className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400 px-1">Substance Concentration</Label>
                <Input
                  id="strength_text"
                  value={formData.strength_text}
                  onChange={(e) => setFormData({ ...formData, strength_text: e.target.value })}
                  placeholder="e.g., 500mg, 5ml, 10%"
                  disabled={!canEdit}
                  className="h-12 font-bold border-2 border-clinical-100 focus:border-brand-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label htmlFor="sort_order" className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400 px-1">Display Priority</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                    disabled={!canEdit}
                    className="h-12 font-bold border-2 border-clinical-100 focus:border-brand-400"
                  />
                </div>
                <div className="flex flex-col justify-end pb-1">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      id="is_primary"
                      checked={formData.is_primary}
                      onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                      className="h-5 w-5 rounded-lg border-2 border-clinical-200 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      disabled={!canEdit}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-black tracking-tight text-clinical-900 group-hover:text-brand-600 transition-colors">Primary Ingredient</span>
                      <span className="text-[9px] font-bold text-clinical-400 uppercase tracking-widest">Mark as main active compound</span>
                    </div>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end items-center gap-6 py-10 border-t-2 border-clinical-100">
          <Button 
            type="button" 
            variant="outline" 
            size="md" 
            onClick={() => {
              if (onCancel) onCancel()
              else navigate({ to: `/medications/${formData.medication_id || initialMedicationId}` })
            }} 
            className="w-full sm:w-auto h-12 px-10 font-black uppercase tracking-widest text-[10px] border-2 border-clinical-200 rounded-xl"
          >
            Discard Link
          </Button>
          <Button 
            type="submit" 
            size="md" 
            disabled={!canEdit || mutation.isPending || !formData.medication_id || !formData.ingredient_id} 
            className="w-full sm:w-auto h-12 px-12 font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-clinical-600/20 rounded-xl bg-clinical-900 hover:bg-clinical-800"
          >
            {mutation.isPending ? 'Propagating Link...' : 'Link Substance to Profile'}
          </Button>
        </div>
      </form>
  )
}
