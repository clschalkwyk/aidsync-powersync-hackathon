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
import { AlertCircle, Beaker } from 'lucide-react'
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
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-8 animate-in-fade pt-2">
        {mutation.error && (
          <div className="flex items-center gap-2 rounded-xl bg-safety-red/10 p-4 text-sm text-safety-red font-bold border border-safety-red/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {getUserFriendlyErrorMessage(mutation.error, 'Failed to link ingredient')}
          </div>
        )}

        {!canEdit && (
          <div className="flex items-center gap-2 rounded-xl bg-safety-yellow/10 p-4 text-sm text-safety-yellow font-bold border border-safety-yellow/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Only supervisor and admin users can modify medication reference data.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <h3 className="text-lg font-black text-clinical-900 uppercase tracking-tight">Composition Logic</h3>
            <p className="text-xs text-clinical-500 font-medium mt-2 leading-relaxed">
              Link an active substance to a medication record. This establishes the chemical profile used for safety validation.
            </p>
          </div>
          
          <Card className="md:col-span-2 border-clinical-200/60 shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="medication_id" className="text-[10px] font-black uppercase tracking-widest text-clinical-600">Target Medication *</Label>
                <Select
                  id="medication_id"
                  value={formData.medication_id}
                  onChange={(e) => setFormData({ ...formData, medication_id: e.target.value })}
                  required
                  disabled={!canEdit || !!initialMedicationId}
                  className="font-bold"
                >
                  <option value="">Select a medication...</option>
                  {medications.map((med) => (
                    <option key={med.id} value={med.id}>
                      {med.brand_name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ingredient_id" className="text-[10px] font-black uppercase tracking-widest text-clinical-600 flex items-center gap-2">
                  <Beaker className="h-3 w-3" />
                  Active Substance *
                </Label>
                <Select
                  id="ingredient_id"
                  value={formData.ingredient_id}
                  onChange={(e) => setFormData({ ...formData, ingredient_id: e.target.value })}
                  required
                  disabled={!canEdit}
                  className="font-bold"
                >
                  <option value="">Select an ingredient...</option>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <h3 className="text-lg font-black text-clinical-900 uppercase tracking-tight">Strength & Order</h3>
            <p className="text-xs text-clinical-500 font-medium mt-2 leading-relaxed">
              Specify the exact strength of this ingredient in the context of this product.
            </p>
          </div>
          
          <Card className="md:col-span-2 border-clinical-200/60 shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="strength_text" className="text-[10px] font-black uppercase tracking-widest text-clinical-600">Product-Specific Strength</Label>
                <Input
                  id="strength_text"
                  value={formData.strength_text}
                  onChange={(e) => setFormData({ ...formData, strength_text: e.target.value })}
                  placeholder="e.g., 500mg"
                  disabled={!canEdit}
                  className="font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="sort_order" className="text-[10px] font-black uppercase tracking-widest text-clinical-600">Display Order</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                    disabled={!canEdit}
                  />
                </div>
                <div className="flex items-center gap-3 pt-8">
                  <input
                    type="checkbox"
                    id="is_primary"
                    checked={formData.is_primary}
                    onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                    className="h-5 w-5 rounded border-clinical-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                    disabled={!canEdit}
                  />
                  <Label htmlFor="is_primary" className="mb-0 text-sm font-bold text-clinical-700 cursor-pointer">Primary Ingredient</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 pt-8 border-t border-clinical-100">
          <Button 
            type="button" 
            variant="outline" 
            size="md" 
            onClick={() => {
              if (onCancel) onCancel()
              else navigate({ to: `/medications/${formData.medication_id || initialMedicationId}` })
            }} 
            className="font-bold h-12 px-8"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            size="md" 
            disabled={!canEdit || mutation.isPending || !formData.medication_id || !formData.ingredient_id} 
            className="font-black uppercase tracking-widest text-[11px] h-12 px-10 shadow-lg shadow-clinical-600/20"
          >
            {mutation.isPending ? 'Linking Substance...' : 'Link Substance to Profile'}
          </Button>
        </div>
      </form>
    </div>
  )
}
