import { createFileRoute, Link } from '@tanstack/react-router'
import { IngredientForm } from '@/components/forms/IngredientForm'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Beaker } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/ingredients/new')({
  component: NewIngredientPage,
})

function NewIngredientPage() {
  return (
    <div className="space-y-6 pb-12 animate-in-fade">
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="sm" asChild className="mt-1 h-10 w-10 p-0 rounded-xl text-clinical-400 hover:text-clinical-900 bg-white shadow-sm border border-clinical-100 hover:border-clinical-200 active:scale-95 transition-all shrink-0">
          <Link to="/ingredients">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400">Substance Dictionary</span>
            <div className="h-1 w-1 rounded-full bg-clinical-200" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-600">Create</span>
          </div>
          <h2 className="text-3xl font-black text-clinical-900 tracking-tight leading-none flex items-center gap-3">
            <Beaker className="h-7 w-7 text-clinical-500" />
            Add Clinical Substance
          </h2>
          <p className="text-sm font-bold text-clinical-500 mt-2">
            Create a normalized active ingredient record for the medication safety catalog.
          </p>
        </div>
      </div>
      <IngredientForm />
    </div>
  )
}
