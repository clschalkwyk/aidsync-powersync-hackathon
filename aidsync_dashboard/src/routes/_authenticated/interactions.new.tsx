import { createFileRoute, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { InteractionRuleForm } from '@/components/forms/InteractionRuleForm'
import { fetchActiveIngredients } from '@/data/queries'

export const Route = createFileRoute('/_authenticated/interactions/new')({
  component: NewInteractionPage,
  validateSearch: (search: Record<string, unknown>): { ingredientId?: string } => {
    return {
      ingredientId: (search.ingredientId as string) || undefined,
    }
  },
})

function NewInteractionPage() {
  const { ingredientId } = useSearch({ from: '/_authenticated/interactions/new' })
  
  const { data: ingredients } = useQuery({
    queryKey: ['ingredients'],
    queryFn: fetchActiveIngredients,
  })

  return (
    <InteractionRuleForm 
      ingredients={ingredients?.map(i => ({ id: i.id, canonical_name: i.canonical_name })) || []} 
      initialIngredientId={ingredientId}
    />
  )
}
