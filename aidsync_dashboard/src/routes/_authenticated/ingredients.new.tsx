import { createFileRoute } from '@tanstack/react-router'
import { IngredientForm } from '@/components/forms/IngredientForm'

export const Route = createFileRoute('/_authenticated/ingredients/new')({
  component: NewIngredientPage,
})

function NewIngredientPage() {
  return (
    <IngredientForm />
  )
}
