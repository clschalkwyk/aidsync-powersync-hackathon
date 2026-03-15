import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { AlertCircle, MapPin, Save } from 'lucide-react'
import { updatePatient } from '@/data/queries'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { getUserFriendlyErrorMessage } from '@/lib/utils'
import type { Patient } from '@/types/database'

interface PatientFormProps {
  patient: Patient
}

export function PatientForm({ patient }: PatientFormProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState({
    full_name: '',
    external_id: '',
    dob: '',
    sex: '',
    pregnancy_status: '',
    location_text: '',
  })

  useEffect(() => {
    setFormData({
      full_name: patient.full_name || '',
      external_id: patient.external_id || '',
      dob: patient.dob || '',
      sex: patient.sex || '',
      pregnancy_status: patient.pregnancy_status || '',
      location_text: patient.location_text || '',
    })
  }, [patient])

  const mutation = useMutation({
    mutationFn: async () =>
      updatePatient(patient.id, {
        full_name: formData.full_name.trim(),
        external_id: formData.external_id.trim() || null,
        dob: formData.dob || null,
        sex: formData.sex || null,
        pregnancy_status: formData.pregnancy_status || null,
        location_text: formData.location_text.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      queryClient.invalidateQueries({ queryKey: ['patient', patient.id] })
      navigate({ to: '/patients/$patientId', params: { patientId: patient.id } })
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!formData.full_name.trim()) return
        mutation.mutate()
      }}
      className="space-y-10 animate-in-fade"
    >
      {mutation.error && (
        <div className="flex items-center gap-3 rounded-2xl bg-safety-red/10 p-5 text-sm text-safety-red font-black uppercase tracking-tight border border-safety-red/20">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {getUserFriendlyErrorMessage(
            mutation.error,
            'System Error: Failed to update patient record',
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-2">
          <h3 className="text-xl font-black text-clinical-900 tracking-tight leading-none">Patient Identity</h3>
          <p className="text-xs text-clinical-500 font-bold uppercase tracking-widest leading-relaxed">
            Keep the demographic record aligned with what field clinicians sync back from the device.
          </p>
        </div>

        <Card className="lg:col-span-2 border-2 border-clinical-100 shadow-sm rounded-3xl">
          <CardContent className="p-8 space-y-6">
            <div className="space-y-3">
              <Label htmlFor="full_name" className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400 px-1">
                Full Name *
              </Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData((current) => ({ ...current, full_name: e.target.value }))}
                placeholder="e.g., Lindiwe Dlamini"
                className="h-12 text-lg font-black tracking-tight placeholder:text-clinical-200 border-2 border-clinical-100 focus:border-brand-400"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="external_id" className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400 px-1">
                  External ID
                </Label>
                <Input
                  id="external_id"
                  value={formData.external_id}
                  onChange={(e) => setFormData((current) => ({ ...current, external_id: e.target.value }))}
                  placeholder="e.g., DEMO-0001"
                  className="h-12 font-bold border-2 border-clinical-100 focus:border-brand-400"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="dob" className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400 px-1">
                  Date of Birth
                </Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData((current) => ({ ...current, dob: e.target.value }))}
                  className="h-12 font-bold border-2 border-clinical-100 focus:border-brand-400"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-2">
          <h3 className="text-xl font-black text-clinical-900 tracking-tight leading-none">Clinical Context</h3>
          <p className="text-xs text-clinical-500 font-bold uppercase tracking-widest leading-relaxed">
            These base fields influence safety checks on the device once the record is synced locally.
          </p>
        </div>

        <Card className="lg:col-span-2 border-2 border-clinical-100 shadow-sm rounded-3xl">
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="sex" className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400 px-1">
                  Sex
                </Label>
                <select
                  id="sex"
                  value={formData.sex}
                  onChange={(e) => setFormData((current) => ({ ...current, sex: e.target.value }))}
                  className="flex h-12 w-full rounded-xl border-2 border-clinical-100 bg-white px-4 text-sm font-bold text-clinical-900 shadow-sm outline-none focus:border-brand-400"
                >
                  <option value="">Not specified</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
              <div className="space-y-3">
                <Label htmlFor="pregnancy_status" className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400 px-1">
                  Pregnancy Status
                </Label>
                <select
                  id="pregnancy_status"
                  value={formData.pregnancy_status}
                  onChange={(e) => setFormData((current) => ({ ...current, pregnancy_status: e.target.value }))}
                  className="flex h-12 w-full rounded-xl border-2 border-clinical-100 bg-white px-4 text-sm font-bold text-clinical-900 shadow-sm outline-none focus:border-brand-400"
                >
                  <option value="">Not specified</option>
                  <option value="pregnant">Pregnant</option>
                  <option value="not_pregnant">Not pregnant</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="location_text" className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400 px-1 flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" />
                Location
              </Label>
              <Input
                id="location_text"
                value={formData.location_text}
                onChange={(e) => setFormData((current) => ({ ...current, location_text: e.target.value }))}
                placeholder="e.g., Clinic 4, Outreach Route B"
                className="h-12 font-bold border-2 border-clinical-100 focus:border-brand-400"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row justify-end items-center gap-4 py-10 border-t-2 border-clinical-100">
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={() => navigate({ to: '/patients/$patientId', params: { patientId: patient.id } })}
          className="h-12 px-10 font-black uppercase tracking-widest text-[10px] border-2 border-clinical-200 rounded-xl w-full sm:w-auto"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="md"
          disabled={mutation.isPending || !formData.full_name.trim()}
          className="h-12 px-12 font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-clinical-600/20 rounded-xl bg-clinical-900 hover:bg-clinical-800 w-full sm:w-auto"
        >
          <Save className="mr-2 h-4 w-4" />
          {mutation.isPending ? 'Saving Profile...' : 'Save Patient'}
        </Button>
      </div>
    </form>
  )
}
