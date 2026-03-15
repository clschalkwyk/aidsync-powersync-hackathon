import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { TextArea } from '@/components/ui/TextArea'
import { Label } from '@/components/ui/Label'
import { Card, CardContent } from '@/components/ui/Card'
import { createMedication, updateMedication, removeMedication } from '@/data/queries'
import { AlertCircle, Trash2, ShieldCheck, Building2 } from 'lucide-react'
import { normalizeName } from '@/lib/utils'
import { useNavigate } from '@tanstack/react-router'
import type { MedicationCatalog } from '@/types/database'

interface MedicationFormProps {
  medication?: MedicationCatalog | null
  onSuccess?: () => void
  onCancel?: () => void
}

export function MedicationForm({ medication, onSuccess, onCancel }: MedicationFormProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const isEditing = !!medication
  
  const [formData, setFormData] = useState({
    brand_name: '',
    generic_name: '',
    dosage_form: '',
    strength_text: '',
    manufacturer_name: '',
    notes: '',
    is_active: true,
  })

  useEffect(() => {
    if (medication) {
      setFormData({
        brand_name: medication.brand_name || '',
        generic_name: medication.generic_name || '',
        dosage_form: medication.dosage_form || '',
        strength_text: medication.strength_text || '',
        manufacturer_name: medication.manufacturer_name || '',
        notes: medication.notes || '',
        is_active: medication.is_active ?? true,
      })
    }
  }, [medication])

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        brand_name: data.brand_name.trim(),
        generic_name: data.generic_name.trim() || null,
        dosage_form: data.dosage_form.trim() || null,
        strength_text: data.strength_text.trim() || null,
        manufacturer_name: data.manufacturer_name.trim() || null,
        notes: data.notes.trim() || null,
        is_active: data.is_active,
        normalized_brand_name: normalizeName(data.brand_name),
        source_name: 'manual_dashboard',
      }
      
      if (isEditing && medication) {
        return updateMedication(medication.id, payload)
      }
      return createMedication(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] })
      if (medication?.id) {
        queryClient.invalidateQueries({ queryKey: ['medication', medication.id] })
      }
      if (onSuccess) {
        onSuccess()
      } else {
        navigate({ to: isEditing ? `/medications/${medication?.id}` : '/medications' })
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: removeMedication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] })
      navigate({ to: '/medications' })
    },
  })

  const handleDelete = () => {
    if (medication && confirm('Are you sure you want to delete this medication reference? This cannot be undone.')) {
      deleteMutation.mutate(medication.id)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.brand_name.trim()) return
    mutation.mutate(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10 animate-in-fade">
        {mutation.error && (
          <div className="flex items-center gap-3 rounded-2xl bg-safety-red/10 p-5 text-sm text-safety-red font-black uppercase tracking-tight border border-safety-red/20">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {mutation.error instanceof Error ? mutation.error.message : 'System Error: Failed to save medication reference'}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-2">
            <h3 className="text-xl font-black text-clinical-900 tracking-tight leading-none">Clinical Identity</h3>
            <p className="text-xs text-clinical-500 font-bold uppercase tracking-widest leading-relaxed">
              Brand and Generic nomenclature for identification
            </p>
          </div>
          
          <Card className="lg:col-span-2 border-2 border-clinical-100 shadow-sm rounded-3xl">
            <CardContent className="p-8 space-y-6">
              <div className="space-y-3">
                <Label htmlFor="brand_name" className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400 px-1">Brand Name *</Label>
                <Input
                  id="brand_name"
                  value={formData.brand_name}
                  onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                  placeholder="e.g., Panadol"
                  className="h-12 text-lg font-black tracking-tight placeholder:text-clinical-200 border-2 border-clinical-100 focus:border-brand-400"
                  required
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="generic_name" className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400 px-1">Generic Name (Active Compound)</Label>
                <Input
                  id="generic_name"
                  value={formData.generic_name}
                  onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
                  placeholder="e.g., Paracetamol"
                  className="h-12 font-bold border-2 border-clinical-100 focus:border-brand-400"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-2">
            <h3 className="text-xl font-black text-clinical-900 tracking-tight leading-none">Presentation</h3>
            <p className="text-xs text-clinical-500 font-bold uppercase tracking-widest leading-relaxed">
              Physical dosage form and source of manufacture
            </p>
          </div>
          
          <Card className="lg:col-span-2 border-2 border-clinical-100 shadow-sm rounded-3xl">
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="dosage_form" className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400 px-1">Dosage Form</Label>
                  <Input
                    id="dosage_form"
                    value={formData.dosage_form}
                    onChange={(e) => setFormData({ ...formData, dosage_form: e.target.value })}
                    placeholder="e.g., Tablet"
                    className="h-12 font-bold border-2 border-clinical-100 focus:border-brand-400"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="strength_text" className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400 px-1">Label Strength</Label>
                  <Input
                    id="strength_text"
                    value={formData.strength_text}
                    onChange={(e) => setFormData({ ...formData, strength_text: e.target.value })}
                    placeholder="e.g., 500mg"
                    className="h-12 font-bold border-2 border-clinical-100 focus:border-brand-400"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <Label htmlFor="manufacturer_name" className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400 px-1 flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5" />
                  Manufacturer
                </Label>
                <Input
                  id="manufacturer_name"
                  value={formData.manufacturer_name}
                  onChange={(e) => setFormData({ ...formData, manufacturer_name: e.target.value })}
                  placeholder="e.g., GlaxoSmithKline"
                  className="h-12 font-bold border-2 border-clinical-100 focus:border-brand-400"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-2">
            <h3 className="text-xl font-black text-clinical-900 tracking-tight leading-none">Metadata</h3>
            <p className="text-xs text-clinical-500 font-bold uppercase tracking-widest leading-relaxed">
              Clinical notes and publication availability
            </p>
          </div>
          
          <Card className="lg:col-span-2 border-2 border-clinical-100 shadow-sm rounded-3xl">
            <CardContent className="p-8 space-y-8">
              <div className="space-y-3">
                <Label htmlFor="notes" className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400 px-1">Editorial Audit Notes</Label>
                <TextArea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Internal editorial notes or special usage warnings..."
                  rows={4}
                  className="font-bold border-2 border-clinical-100 border-dashed bg-clinical-50/20 focus:border-brand-400 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-5 p-6 rounded-[2rem] bg-clinical-900 text-white shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                  <ShieldCheck size={100} />
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 border border-white/10 shrink-0">
                  <ShieldCheck className="h-6 w-6 text-brand-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-clinical-400 mb-2">Sync Availability</p>
                  <label className="flex items-center gap-3 cursor-pointer group/label">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="h-5 w-5 rounded-lg border-white/20 bg-white/10 text-brand-500 focus:ring-brand-500 cursor-pointer transition-all"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-black tracking-tight group-hover/label:text-brand-400 transition-colors">
                        Mark as Active Reference
                      </span>
                      <span className="text-[10px] font-bold text-clinical-500 uppercase tracking-widest mt-0.5">
                        Include in field device PowerSync packages
                      </span>
                    </div>
                  </label>
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
                disabled={deleteMutation.isPending}
                className="w-full h-12 px-6 text-clinical-400 hover:text-safety-red hover:bg-safety-red/5 font-black uppercase tracking-widest text-[10px] rounded-xl"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Decommission Reference
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
                else navigate({ to: isEditing ? `/medications/${medication?.id}` : '/medications' })
              }} 
              className="h-12 px-10 font-black uppercase tracking-widest text-[10px] border-2 border-clinical-200 rounded-xl"
            >
              Discard Changes
            </Button>
            <Button 
              type="submit" 
              size="md" 
              disabled={mutation.isPending || !formData.brand_name.trim()} 
              className="h-12 px-12 font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-clinical-600/20 rounded-xl bg-clinical-900 hover:bg-clinical-800"
            >
              {mutation.isPending ? 'Propagating Changes...' : isEditing ? 'Commit Update' : 'Publish Reference'}
            </Button>
          </div>
        </div>
      </form>
  )
}
