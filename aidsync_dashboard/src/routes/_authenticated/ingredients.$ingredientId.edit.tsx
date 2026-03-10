import { createFileRoute, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { IngredientForm } from '@/components/forms/IngredientForm'
import { Beaker } from 'lucide-react'
import { fetchActiveIngredients } from '@/data/queries'

export const Route = createFileRoute('/_authenticated/ingredients/$ingredientId/edit')({
  component: EditIngredientPage,
})

function EditIngredientPage() {
  const { ingredientId } = useParams({ from: '/_authenticated/ingredients/$ingredientId/edit' }) as { ingredientId: string }
  
  const { data: ingredients, isLoading } = useQuery({
    queryKey: ['ingredients'],
    queryFn: fetchActiveIngredients,
  })

  const ingredient = ingredients?.find(i => i.id === ingredientId)

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Beaker className="h-10 w-10 text-clinical-200 animate-pulse mb-4" />
        <p className="text-sm font-bold text-clinical-400 uppercase tracking-widest">Loading Substance...</p>
      </div>
    )
  }

  return (
    <div className="py-2">
      <IngredientForm ingredient={ingredient} />
    </div>
  )
}
