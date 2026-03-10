import { createFileRoute } from '@tanstack/react-router'
import { MedicationForm } from '@/components/forms/MedicationForm'

export const Route = createFileRoute('/_authenticated/medications/new')({
  component: NewMedicationPage,
})

function NewMedicationPage() {
  return (
    <MedicationForm />
  )
}
