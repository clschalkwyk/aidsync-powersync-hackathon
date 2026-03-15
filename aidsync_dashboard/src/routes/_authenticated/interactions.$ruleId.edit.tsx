import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { InteractionRuleForm } from '@/components/forms/InteractionRuleForm'
import { AlertTriangle, ArrowLeft, Edit } from 'lucide-react'
import { fetchInteractionRules, fetchActiveIngredients } from '@/data/queries'
import { Button } from '@/components/ui/Button'

export const Route = createFileRoute('/_authenticated/interactions/$ruleId/edit')({
  component: EditInteractionPage,
})

function EditInteractionPage() {
  const { ruleId } = useParams({ from: '/_authenticated/interactions/$ruleId/edit' }) as { ruleId: string }
  
  const { data: rules, isLoading: isLoadingRules } = useQuery({
    queryKey: ['interaction-rules'],
    queryFn: fetchInteractionRules,
  })

  const { data: ingredients, isLoading: isLoadingIngredients } = useQuery({
    queryKey: ['ingredients'],
    queryFn: fetchActiveIngredients,
  })

  const rule = rules?.find(r => r.id === ruleId)

  if (isLoadingRules || isLoadingIngredients) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="h-10 w-10 text-clinical-200 animate-pulse mb-4" />
        <p className="text-sm font-bold text-clinical-400 uppercase tracking-widest">Loading Rule...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12 animate-in-fade">
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="sm" asChild className="mt-1 h-10 w-10 p-0 rounded-xl text-clinical-400 hover:text-clinical-900 bg-white shadow-sm border border-clinical-100 hover:border-clinical-200 active:scale-95 transition-all shrink-0">
          <Link to="/interactions">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400">Safety Rules</span>
            <div className="h-1 w-1 rounded-full bg-clinical-200" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-600">Edit</span>
          </div>
          <h2 className="text-3xl font-black text-clinical-900 tracking-tight leading-none flex items-center gap-3">
            <Edit className="h-7 w-7 text-clinical-500" />
            Edit Interaction Rule
          </h2>
          <p className="text-sm font-bold text-clinical-500 mt-2">
            Update the clinical interaction rule used during offline medication checks.
          </p>
        </div>
      </div>
      <InteractionRuleForm 
        rule={rule}
        ingredients={ingredients?.map(i => ({ id: i.id, canonical_name: i.canonical_name })) || []} 
      />
    </div>
  )
}
