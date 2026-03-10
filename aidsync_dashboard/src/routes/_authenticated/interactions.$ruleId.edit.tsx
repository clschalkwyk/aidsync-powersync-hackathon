import { createFileRoute, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { InteractionRuleForm } from '@/components/forms/InteractionRuleForm'
import { AlertTriangle } from 'lucide-react'
import { fetchInteractionRules, fetchActiveIngredients } from '@/data/queries'

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
    <div className="py-2">
      <InteractionRuleForm 
        rule={rule}
        ingredients={ingredients?.map(i => ({ id: i.id, canonical_name: i.canonical_name })) || []} 
      />
    </div>
  )
}
