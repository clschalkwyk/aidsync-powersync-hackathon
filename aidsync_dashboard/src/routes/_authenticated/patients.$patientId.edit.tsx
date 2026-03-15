import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Edit, UserRound } from 'lucide-react'
import { fetchPatientById } from '@/data/queries'
import { PatientForm } from '@/components/forms/PatientForm'
import { Button } from '@/components/ui/Button'

export const Route = createFileRoute('/_authenticated/patients/$patientId/edit')({
  component: EditPatientPage,
})

function EditPatientPage() {
  const { patientId } = useParams({ from: '/_authenticated/patients/$patientId/edit' }) as { patientId: string }

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => fetchPatientById(patientId),
  })

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <UserRound className="h-10 w-10 text-clinical-200 animate-pulse mb-4" />
        <p className="text-sm font-bold text-clinical-400 uppercase tracking-widest">Loading Patient...</p>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="space-y-6 pb-12 animate-in-fade">
        <Button variant="ghost" size="sm" asChild className="mt-1 h-10 w-10 p-0 rounded-xl text-clinical-400 hover:text-clinical-900 bg-white shadow-sm border border-clinical-100 hover:border-clinical-200 active:scale-95 transition-all shrink-0">
          <Link to="/patients">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="rounded-3xl border border-clinical-200 bg-white p-12 text-center">
          <p className="text-lg font-black text-clinical-900 tracking-tight">Patient record not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12 animate-in-fade">
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="sm" asChild className="mt-1 h-10 w-10 p-0 rounded-xl text-clinical-400 hover:text-clinical-900 bg-white shadow-sm border border-clinical-100 hover:border-clinical-200 active:scale-95 transition-all shrink-0">
          <Link to="/patients/$patientId" params={{ patientId }}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400">Clinical Records</span>
            <div className="h-1 w-1 rounded-full bg-clinical-200" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-600">Edit Patient</span>
          </div>
          <h2 className="text-3xl font-black text-clinical-900 tracking-tight leading-none flex items-center gap-3">
            <Edit className="h-7 w-7 text-clinical-500" />
            Edit Patient Profile
          </h2>
          <p className="text-sm font-bold text-clinical-500 mt-2">
            Update {patient.full_name} so the synced record stays usable during offline care sessions.
          </p>
        </div>
      </div>

      <PatientForm patient={patient} />
    </div>
  )
}
