import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { AlertCircle, ClipboardCheck, FileText, Stethoscope } from 'lucide-react'

import { updateEncounter } from '@/data/queries'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { TextArea } from '@/components/ui/TextArea'
import type { Encounter } from '@/types/database'

interface EncounterFormProps {
  encounter: Encounter
  onSuccess?: () => void
  onCancel?: () => void
}

export function EncounterForm({ encounter, onSuccess, onCancel }: EncounterFormProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    encounter_type: '',
    status: 'draft',
    notes_text: '',
    ai_summary: '',
  })

  useEffect(() => {
    setFormData({
      encounter_type: encounter.encounter_type || '',
      status: encounter.status || 'draft',
      notes_text: encounter.notes_text || '',
      ai_summary: encounter.ai_summary || '',
    })
  }, [encounter])

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) =>
      updateEncounter(encounter.id, {
        encounter_type: data.encounter_type.trim() || null,
        status: data.status as Encounter['status'],
        notes_text: data.notes_text.trim() || null,
        ai_summary: data.ai_summary.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encounters'] })
      queryClient.invalidateQueries({ queryKey: ['encounter', encounter.id] })
      queryClient.invalidateQueries({ queryKey: ['patient', encounter.patient_id] })
      if (onSuccess) {
        onSuccess()
      } else {
        navigate({ to: `/encounters/${encounter.id}` })
      }
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10 animate-in-fade">
      {mutation.error && (
        <div className="flex items-center gap-3 rounded-2xl bg-safety-red/10 p-5 text-sm text-safety-red font-black uppercase tracking-tight border border-safety-red/20">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {mutation.error instanceof Error ? mutation.error.message : 'System Error: Failed to save encounter'}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-2">
          <h3 className="text-xl font-black text-clinical-900 tracking-tight leading-none">Encounter Identity</h3>
          <p className="text-xs text-clinical-500 font-bold uppercase tracking-widest leading-relaxed">
            Control the operational state and session classification.
          </p>
        </div>
        <Card className="lg:col-span-2 border-2 border-clinical-100 shadow-sm rounded-3xl">
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="encounter_type" className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400 px-1 flex items-center gap-2">
                  <Stethoscope className="h-3.5 w-3.5" /> Encounter Type
                </Label>
                <Input
                  id="encounter_type"
                  value={formData.encounter_type}
                  onChange={(e) => setFormData({ ...formData, encounter_type: e.target.value })}
                  placeholder="e.g., medication_check"
                  className="h-12 font-bold border-2 border-clinical-100 focus:border-brand-400"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="status" className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400 px-1 flex items-center gap-2">
                  <ClipboardCheck className="h-3.5 w-3.5" /> Status
                </Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="h-12 w-full rounded-2xl border-2 border-clinical-100 bg-white px-4 font-bold text-clinical-900 focus:border-brand-400 focus:outline-none"
                >
                  <option value="draft">Draft</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="synced">Synced</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-2">
          <h3 className="text-xl font-black text-clinical-900 tracking-tight leading-none">Clinical Notes</h3>
          <p className="text-xs text-clinical-500 font-bold uppercase tracking-widest leading-relaxed">
            Review and update the field clinician summary for dashboard oversight.
          </p>
        </div>
        <Card className="lg:col-span-2 border-2 border-clinical-100 shadow-sm rounded-3xl">
          <CardContent className="p-8 space-y-6">
            <div className="space-y-3">
              <Label htmlFor="notes_text" className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400 px-1 flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" /> Encounter Note
              </Label>
              <TextArea
                id="notes_text"
                value={formData.notes_text}
                onChange={(e) => setFormData({ ...formData, notes_text: e.target.value })}
                rows={5}
                placeholder="Clinical summary recorded from the field encounter..."
                className="font-bold border-2 border-clinical-100 focus:border-brand-400"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="ai_summary" className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400 px-1">AI Summary</Label>
              <TextArea
                id="ai_summary"
                value={formData.ai_summary}
                onChange={(e) => setFormData({ ...formData, ai_summary: e.target.value })}
                rows={4}
                placeholder="Optional structured summary for the review team..."
                className="font-bold border-2 border-clinical-100 focus:border-brand-400"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between gap-4 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (onCancel) {
              onCancel()
            } else {
              navigate({ to: `/encounters/${encounter.id}` })
            }
          }}
          className="h-12 px-6 font-black uppercase tracking-widest text-xs"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="h-12 px-6 font-black uppercase tracking-widest text-xs"
        >
          {mutation.isPending ? 'Saving...' : 'Save Encounter'}
        </Button>
      </div>
    </form>
  )
}
