import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { 
  Search, 
  Plus, 
  Beaker,
  ChevronRight,
  Tags,
  Info
} from 'lucide-react'
import { fetchActiveIngredients } from '@/data/queries'
import { useAuth } from '@/hooks/useAuth'
import { canManageReferenceData } from '@/lib/utils'
export const Route = createFileRoute('/_authenticated/ingredients')({
  component: IngredientsPage,
})

function IngredientsPage() {
  const { profile } = useAuth()
  const canEdit = canManageReferenceData(profile?.role)
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isAddModalOpen = pathname === '/ingredients/new'
  const isEditModalOpen = /^\/ingredients\/[^/]+\/edit$/.test(pathname)

  const { data: ingredients, isLoading } = useQuery({
    queryKey: ['ingredients'],
    queryFn: fetchActiveIngredients,
  })

  const filteredIngredients = ingredients?.filter((ing) => {
    const query = searchQuery.toLowerCase()
    return (
      ing.canonical_name.toLowerCase().includes(query) ||
      ing.common_name?.toLowerCase().includes(query) ||
      ing.ingredient_class?.toLowerCase().includes(query)
    )
  })

  return (
    <div className="space-y-6 pb-12 animate-in-fade">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-clinical-400">Reference Prep</span>
            <div className="h-1 w-1 rounded-full bg-clinical-200" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-clinical-600">Clinical Substances</span>
          </div>
          <h2 className="text-3xl font-black text-clinical-900 tracking-tight leading-none">Substance Dictionary</h2>
          <p className="text-xs font-bold text-clinical-500 uppercase tracking-widest">Normalized ingredient mapping for safety checks</p>
        </div>
        <Button asChild disabled={!canEdit} className="h-12 px-8 font-black uppercase tracking-widest text-[11px] shadow-xl shadow-clinical-600/10 active:scale-95 transition-all">
          <Link to="/ingredients/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Substance Reference
          </Link>
        </Button>
      </div>

      {!canEdit && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-safety-yellow/10 border border-safety-yellow/20 text-safety-yellow text-xs font-black uppercase tracking-wider">
          <Info className="h-4 w-4" />
          Review Mode Only: Higher privileges required to modify dictionary
        </div>
      )}

      {/* Search & Filter */}
      <div className="animate-in-slide-up" style={{ animationDelay: '0.1s' }}>
        <Card className="border-clinical-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="relative">
              <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-clinical-400" />
              <Input
                placeholder="Search by canonical name, common name, or clinical class..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-14 border-none shadow-none focus:ring-0 h-14 text-base font-bold placeholder:text-clinical-300"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      <div className="animate-in-slide-up" style={{ animationDelay: '0.15s' }}>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
        ) : filteredIngredients?.length === 0 ? (
          <div className="py-24 text-center bg-clinical-50/30 rounded-[2.5rem] border-2 border-dashed border-clinical-100">
            <Beaker className="h-16 w-16 mx-auto text-clinical-200 mb-6 opacity-40" />
            <h3 className="text-xl font-black text-clinical-900 tracking-tight uppercase">Dictionary Empty</h3>
            <p className="text-clinical-500 mt-2 max-w-sm mx-auto font-bold text-xs uppercase tracking-widest px-6">
              Create substance references to start building the clinical catalog
            </p>
            <Button asChild variant="primary" disabled={!canEdit} className="mt-10 font-black uppercase tracking-widest text-[10px] h-11 px-8">
              <Link to="/ingredients/new">
                <Plus className="h-4 w-4 mr-2" />
                Add First Substance
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIngredients?.map((ing) => (
              <Link 
                key={ing.id} 
                to="/ingredients/$ingredientId/edit"
                params={{ ingredientId: ing.id }}
                disabled={!canEdit}
                className="group h-full"
              >
                <Card className="h-full border-2 border-clinical-100 hover:border-clinical-400 hover:shadow-xl transition-all duration-500 overflow-hidden relative active:scale-[0.98]">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-5">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-clinical-50 shrink-0 border border-clinical-100 group-hover:bg-white group-hover:border-clinical-300 transition-all duration-500 shadow-inner">
                        <Beaker className="h-6 w-6 text-clinical-500 group-hover:text-clinical-900 group-hover:rotate-12 transition-all" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-black text-clinical-900 text-lg leading-tight truncate tracking-tight mb-1">
                            {ing.canonical_name}
                          </h3>
                          <ChevronRight className="h-4 w-4 text-clinical-200 group-hover:text-clinical-900 group-hover:translate-x-1 transition-all" />
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {ing.ingredient_class && (
                            <span className="flex items-center gap-1.5 bg-clinical-50 px-2 py-0.5 rounded border border-clinical-100 text-[9px] font-black uppercase tracking-widest text-clinical-600">
                              {ing.ingredient_class}
                            </span>
                          )}
                          {ing.common_name && (
                            <span className="text-[9px] font-bold text-clinical-400 italic truncate">AKA: {ing.common_name}</span>
                          )}
                        </div>
                        
                        {Array.isArray(ing.synonyms_json) && ing.synonyms_json.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-clinical-50 flex items-start gap-2">
                            <Tags className="h-3 w-3 text-clinical-300 mt-0.5 shrink-0" />
                            <p className="text-[10px] font-bold text-clinical-400 italic leading-relaxed line-clamp-2">
                              {ing.synonyms_json.join(', ')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => navigate({ to: '/ingredients' })}
        title={isEditModalOpen ? 'Edit Clinical Substance' : 'Add Clinical Substance'}
        description={
          isEditModalOpen
            ? 'Update the normalized active ingredient record used by the medication safety catalog.'
            : 'Create a normalized active ingredient record for the medication safety catalog.'
        }
        size="lg"
      >
        <Outlet />
      </Modal>
    </div>
  )
}
