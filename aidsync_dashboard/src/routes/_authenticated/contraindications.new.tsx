import { createFileRoute, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ContraindicationRuleForm } from '@/components/forms/ContraindicationRuleForm'
import { fetchActiveIngredients } from '@/data/queries'

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
    <ContraindicationRuleForm 
      ingredients={ingredients?.map(i => ({ id: i.id, canonical_name: i.canonical_name })) || []} 
      initialIngredientId={ingredientId}
    />
  )
}
