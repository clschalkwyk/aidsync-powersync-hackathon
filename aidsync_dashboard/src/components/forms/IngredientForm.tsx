import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent } from '@/components/ui/Card'
import { createActiveIngredient, updateActiveIngredient, removeActiveIngredient } from '@/data/queries'
import { AlertCircle, X, Plus, Trash2, Tag, Info } from 'lucide-react'
import { canManageReferenceData, getUserFriendlyErrorMessage, normalizeName } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from '@tanstack/react-router'
import type { ActiveIngredient } from '@/types/database'

interface IngredientFormProps {
  ingredient?: ActiveIngredient | null
  onSuccess?: () => void
  onCancel?: () => void
}

export function IngredientForm({ ingredient, onSuccess, onCancel }: IngredientFormProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const isEditing = !!ingredient
  const { profile } = useAuth()
  const canEdit = canManageReferenceData(profile?.role)
  
  const [formData, setFormData] = useState({
    canonical_name: '',
    common_name: '',
    ingredient_class: '',
    synonyms: [] as string[],
  })
  
  const [newSynonym, setNewSynonym] = useState('')

  useEffect(() => {
    if (ingredient) {
      setFormData({
        canonical_name: ingredient.canonical_name || '',
        common_name: ingredient.common_name || '',
        ingredient_class: ingredient.ingredient_class || '',
        synonyms: Array.isArray(ingredient.synonyms_json) ? (ingredient.synonyms_json as string[]) : [],
      })
    }
  }, [ingredient])

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        canonical_name: data.canonical_name.trim(),
        normalized_name: normalizeName(data.canonical_name),
        common_name: data.common_name.trim() || null,
        ingredient_class: data.ingredient_class.trim() || null,
        synonyms_json: data.synonyms,
      }
      
      if (isEditing && ingredient) {
        return updateActiveIngredient(ingredient.id, payload)
      }
      return createActiveIngredient(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
      queryClient.invalidateQueries({ queryKey: ['overview-counts'] })
      if (onSuccess) onSuccess()
      else navigate({ to: '/ingredients' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: removeActiveIngredient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
      queryClient.invalidateQueries({ queryKey: ['overview-counts'] })
      navigate({ to: '/ingredients' })
    },
  })

  const handleDelete = () => {
    if (!canEdit) return
    if (ingredient && confirm('Are you sure you want to delete this clinical substance? This will affect all medications linked to it.')) {
      deleteMutation.mutate(ingredient.id)
    }
  }

  const handleAddSynonym = () => {
    if (!canEdit) return
    const trimmed = newSynonym.trim()
    if (trimmed && !formData.synonyms.includes(trimmed)) {
      setFormData({
        ...formData,
        synonyms: [...formData.synonyms, trimmed]
      })
      setNewSynonym('')
    }
  }

  const handleRemoveSynonym = (synonym: string) => {
    if (!canEdit) return
    setFormData({
      ...formData,
      synonyms: formData.synonyms.filter(s => s !== synonym)
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canEdit) return
    if (!formData.canonical_name.trim()) return
    mutation.mutate(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10 animate-in-fade">
        {mutation.error && (
          <div className="flex items-center gap-3 rounded-2xl bg-safety-red/10 p-5 text-sm text-safety-red font-black uppercase tracking-tight border border-safety-red/20">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {getUserFriendlyErrorMessage(mutation.error, 'System Error: Failed to save clinical substance')}
          </div>
        )}

        {!canEdit && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-safety-yellow/10 border border-safety-yellow/20 text-safety-yellow text-xs font-black uppercase tracking-wider">
            <Info className="h-4 w-4" />
            Review Mode Only: Higher privileges required to modify clinical substance dictionary
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-2">
            <h3 className="text-xl font-black text-clinical-900 tracking-tight leading-none">Primary Identity</h3>
            <p className="text-xs text-clinical-500 font-bold uppercase tracking-widest leading-relaxed">
              Master clinical record for this pharmacological substance
            </p>
          </div>
          
          <Card className="lg:col-span-2 border-2 border-clinical-100 shadow-sm rounded-3xl">
            <CardContent className="p-8 space-y-6">
              <div className="space-y-3">
                <Label htmlFor="canonical_name" className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400 px-1">Canonical Name *</Label>
                <Input
                  id="canonical_name"
                  value={formData.canonical_name}
                  onChange={(e) => setFormData({ ...formData, canonical_name: e.target.value })}
                  placeholder="e.g., Paracetamol"
                  className="h-12 text-lg font-black tracking-tight placeholder:text-clinical-200 border-2 border-clinical-100 focus:border-brand-400"
                  disabled={!canEdit}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="common_name" className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400 px-1">Common Alias</Label>
                  <Input
                    id="common_name"
                    value={formData.common_name}
                    onChange={(e) => setFormData({ ...formData, common_name: e.target.value })}
                    placeholder="e.g., Acetaminophen"
                    className="h-12 font-bold border-2 border-clinical-100 focus:border-brand-400"
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="ingredient_class" className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400 px-1">Substance Class</Label>
                  <Input
                    id="ingredient_class"
                    value={formData.ingredient_class}
                    onChange={(e) => setFormData({ ...formData, ingredient_class: e.target.value })}
                    placeholder="e.g., Analgesic"
                    className="h-12 font-bold border-2 border-clinical-100 focus:border-brand-400"
                    disabled={!canEdit}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-2">
            <h3 className="text-xl font-black text-clinical-900 tracking-tight leading-none">Normalization</h3>
            <p className="text-xs text-clinical-500 font-bold uppercase tracking-widest leading-relaxed">
              Alternative names for cross-source identification
            </p>
          </div>
          
          <Card className="lg:col-span-2 border-2 border-clinical-100 shadow-sm rounded-3xl">
            <CardContent className="p-8 space-y-6">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400 px-1 flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5" />
                  Substance Synonyms
                </Label>
                <div className="flex gap-3">
                  <Input
                    value={newSynonym}
                    onChange={(e) => setNewSynonym(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddSynonym()
                      }
                    }}
                    placeholder="Add scientific or trade alias..."
                    className="h-12 font-bold border-2 border-clinical-100 border-dashed bg-clinical-50/20 focus:border-brand-400 focus:bg-white"
                    disabled={!canEdit}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleAddSynonym} className="h-12 px-5 border-2 border-clinical-100" disabled={!canEdit}>
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2.5 mt-4 p-5 rounded-[2rem] bg-clinical-50/30 border-2 border-clinical-100 border-dashed min-h-[80px]">
                  {formData.synonyms.map((synonym) => (
                    <span 
                      key={synonym}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white text-clinical-900 text-[10px] font-black uppercase tracking-widest border-2 border-clinical-100 shadow-sm transition-all hover:border-brand-300"
                    >
                      {synonym}
                      <button
                        type="button"
                        onClick={() => handleRemoveSynonym(synonym)}
                        disabled={!canEdit}
                        className="text-clinical-300 hover:text-safety-red transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                  {formData.synonyms.length === 0 && (
                    <div className="flex items-center justify-center w-full py-2">
                      <p className="text-[10px] text-clinical-300 font-black uppercase tracking-widest italic opacity-60">No additional synonyms defined</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-6 py-10 border-t-2 border-clinical-100">
          <div className="w-full sm:w-auto">
            {isEditing && (
              <Button 
                type="button" 
                variant="ghost" 
                size="md" 
                onClick={handleDelete}
                disabled={!canEdit || deleteMutation.isPending}
                className="w-full h-12 px-6 text-clinical-400 hover:text-safety-red hover:bg-safety-red/5 font-black uppercase tracking-widest text-[10px] rounded-xl"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove Substance Record
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
                else navigate({ to: '/ingredients' })
              }} 
              className="h-12 px-10 font-black uppercase tracking-widest text-[10px] border-2 border-clinical-200 rounded-xl"
            >
              Discard Changes
            </Button>
            <Button 
              type="submit" 
              size="md" 
              disabled={!canEdit || mutation.isPending || !formData.canonical_name.trim()} 
              className="h-12 px-12 font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-clinical-600/20 rounded-xl bg-clinical-900 hover:bg-clinical-800"
            >
              {mutation.isPending ? 'Publishing Reference...' : isEditing ? 'Commit Update' : 'Publish Substance'}
            </Button>
          </div>
        </div>
      </form>
  )
}
