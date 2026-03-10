import { createFileRoute, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { MedicationForm } from '@/components/forms/MedicationForm'
import { Pill } from 'lucide-react'
import { fetchMedicationById } from '@/data/queries'

export const Route = createFileRoute('/_authenticated/medications/$medicationId/edit')({
  component: EditMedicationPage,
})

function EditMedicationPage() {
  const { medicationId } = useParams({ from: '/_authenticated/medications/$medicationId/edit' }) as { medicationId: string }
  
  const { data: medication, isLoading } = useQuery({
    queryKey: ['medication', medicationId],
    queryFn: () => fetchMedicationById(medicationId),
  })

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Pill className="h-10 w-10 text-clinical-200 animate-pulse mb-4" />
        <p className="text-sm font-bold text-clinical-400 uppercase tracking-widest">Loading Reference...</p>
      </div>
    )
  }

  return (
    <div className="py-2">
      <MedicationForm medication={medication} />
    </div>
  )
}
