import { createFileRoute, Link, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ContraindicationRuleForm } from '@/components/forms/ContraindicationRuleForm'
import { fetchActiveIngredients } from '@/data/queries'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Ban } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/contraindications/new')({
  component: NewContraindicationPage,
  validateSearch: (search: Record<string, unknown>): { ingredientId?: string } => {
    return {
      ingredientId: (search.ingredientId as string) || undefined,
    }
  },
})

function NewContraindicationPage() {
  const { ingredientId } = useSearch({ from: '/_authenticated/contraindications/new' })
  
  const { data: ingredients } = useQuery({
    queryKey: ['ingredients'],
    queryFn: fetchActiveIngredients,
  })

  return (
    <div className="space-y-6 pb-12 animate-in-fade">
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="sm" asChild className="mt-1 h-10 w-10 p-0 rounded-xl text-clinical-400 hover:text-clinical-900 bg-white shadow-sm border border-clinical-100 hover:border-clinical-200 active:scale-95 transition-all shrink-0">
          <Link to="/contraindications">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400">Clinical Cautions</span>
            <div className="h-1 w-1 rounded-full bg-clinical-200" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-600">Create</span>
          </div>
          <h2 className="text-3xl font-black text-clinical-900 tracking-tight leading-none flex items-center gap-3">
            <Ban className="h-7 w-7 text-safety-red" />
            Add Caution Rule
          </h2>
          <p className="text-sm font-bold text-clinical-500 mt-2">
            Define a contraindication or caution rule for offline medication checks.
          </p>
        </div>
      </div>
      <ContraindicationRuleForm 
        ingredients={ingredients?.map(i => ({ id: i.id, canonical_name: i.canonical_name })) || []} 
        initialIngredientId={ingredientId}
      />
    </div>
  )
}
