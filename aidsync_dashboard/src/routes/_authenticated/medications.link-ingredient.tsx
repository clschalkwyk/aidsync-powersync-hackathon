import { createFileRoute, Link, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { MedicationIngredientForm } from '@/components/forms/MedicationIngredientForm'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { fetchMedications, fetchActiveIngredients } from '@/data/queries'

export const Route = createFileRoute('/_authenticated/medications/link-ingredient')({
  component: LinkIngredientPage,
  validateSearch: (search: Record<string, unknown>): { medicationId?: string } => {
    return {
      medicationId: (search.medicationId as string) || undefined,
    }
  },
})

function LinkIngredientPage() {
  const { medicationId } = useSearch({ from: '/_authenticated/medications/link-ingredient' })
  
  const { data: medications } = useQuery({
    queryKey: ['medications'],
    queryFn: fetchMedications,
  })

  const { data: ingredients } = useQuery({
    queryKey: ['ingredients'],
    queryFn: fetchActiveIngredients,
  })

  const targetMedication = medications?.find(m => m.id === medicationId)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="h-10 w-10 p-0 rounded-full text-clinical-400 hover:text-clinical-900 bg-white shadow-sm border border-clinical-100">
          <Link to={medicationId ? "/medications/$medicationId" : "/medications"} params={medicationId ? { medicationId } : undefined}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400">Composition Editor</span>
            <div className="h-1 w-1 rounded-full bg-clinical-200" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-600">Link Substance</span>
          </div>
          <h2 className="text-2xl font-black text-clinical-900 tracking-tight leading-none mt-1">
            {targetMedication ? `Composition: ${targetMedication.brand_name}` : 'Link Clinical Substance'}
          </h2>
        </div>
      </div>

      <div className="py-4">
        <MedicationIngredientForm 
          medications={medications || []}
          ingredients={ingredients || []}
          initialMedicationId={medicationId}
        />
      </div>
    </div>
  )
}
