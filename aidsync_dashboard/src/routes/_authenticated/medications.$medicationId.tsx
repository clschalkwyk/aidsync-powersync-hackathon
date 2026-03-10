import { createFileRoute, useParams, Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { 
  ArrowLeft, 
  Pill,
  Beaker,
  AlertTriangle,
  Ban,
  Edit,
  Plus,
  Trash2,
  ShieldCheck,
  ChevronRight,
  Info,
  ExternalLink,
  Database
} from 'lucide-react'
import { 
  fetchMedicationById, 
  removeMedicationCatalogIngredient,
  fetchRulesByIngredientIds
} from '@/data/queries'
import { canManageReferenceData, getSeverityBadgeColor } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

export const Route = createFileRoute('/_authenticated/medications/$medicationId')({
  component: MedicationDetailPage,
})

function MedicationDetailPage() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const canEdit = canManageReferenceData(profile?.role)
  const { medicationId } = useParams({ from: '/_authenticated/medications/$medicationId' }) as { medicationId: string }
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isEditModalOpen = pathname === `/medications/${medicationId}/edit`
  
  const { data: medication, isLoading: isMedicationLoading } = useQuery({
    queryKey: ['medication', medicationId],
    queryFn: () => fetchMedicationById(medicationId),
  })

  const ingredientIds = medication?.ingredients?.map(i => i.ingredient_id) || []
  
  const { data: rules, isLoading: isRulesLoading } = useQuery({
    queryKey: ['medication-rules', ingredientIds],
    queryFn: () => fetchRulesByIngredientIds(ingredientIds),
    enabled: ingredientIds.length > 0,
  })

  const removeIngredientMutation = useMutation({
    mutationFn: removeMedicationCatalogIngredient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medication', medicationId] })
    },
  })

  const handleRemoveIngredient = (id: string) => {
    if (!canEdit) return
    if (confirm('Are you sure you want to remove this ingredient from this medication?')) {
      removeIngredientMutation.mutate(id)
    }
  }

  if (isMedicationLoading) {
    return (
      <div className="space-y-6 animate-in-fade">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-6">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
          <div className="lg:col-span-8 space-y-6">
            <Skeleton className="h-96 rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  if (!medication) {
    return (
      <div className="space-y-6 animate-in-fade">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/medications">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Catalog
          </Link>
        </Button>
        <div className="p-16 text-center text-clinical-500 bg-white rounded-2xl border border-clinical-200 shadow-sm">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-safety-yellow opacity-40" />
          <h3 className="text-xl font-bold text-clinical-900">Medication Reference Not Found</h3>
          <p className="mt-2 text-sm text-clinical-500 max-w-xs mx-auto">This medication may have been removed or the ID is incorrect.</p>
        </div>
      </div>
    )
  }

  const ingredientCount = medication.ingredients?.length || 0
  const interactionCount = rules?.interactions?.length || 0
  const contraindicationCount = rules?.contraindications?.length || 0

  return (
    <div className="space-y-6 pb-12 animate-in-fade">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="sm" asChild className="mt-1 h-10 w-10 p-0 rounded-xl text-clinical-400 hover:text-clinical-900 bg-white shadow-sm border border-clinical-100 hover:border-clinical-200 active:scale-95 transition-all shrink-0">
            <Link to="/medications">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400">Medication Reference</span>
              <div className="h-1 w-1 rounded-full bg-clinical-200" />
              <Badge variant="info" className="h-4 px-1.5 text-[8px] border-none bg-clinical-100 text-clinical-600 font-black uppercase tracking-wider">
                Active Reference
              </Badge>
            </div>
            <h2 className="text-3xl font-black text-clinical-900 tracking-tight leading-tight truncate">
              {medication.brand_name}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" asChild disabled={!canEdit} className="h-10 px-5 font-black uppercase tracking-widest text-[10px] border-clinical-200 bg-white hover:bg-clinical-50 active:scale-95 transition-all shadow-sm">
            <Link to="/medications/$medicationId/edit" params={{ medicationId }}>
              <Edit className="h-3.5 w-3.5 mr-2" />
              Edit Profile
            </Link>
          </Button>
          <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-clinical-900 text-white shadow-lg shadow-clinical-900/20">
            <ShieldCheck className="h-4 w-4 text-brand-400" />
            <span className="text-[10px] font-black uppercase tracking-widest">Ready for Sync</span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Sidebar: Details & Metadata */}
        <div className="lg:col-span-4 space-y-6 animate-in-slide-up" style={{ animationDelay: '0.1s' }}>
          <Card className="border-clinical-200 shadow-sm overflow-hidden">
            <CardHeader className="py-4 px-6 border-b border-clinical-100 bg-clinical-50/30">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.15em] text-clinical-500">Clinical Identity</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-clinical-50/50 border border-clinical-100/50">
                <div className="h-11 w-11 rounded-lg bg-white flex items-center justify-center shadow-sm shrink-0">
                  <Pill className="h-5 w-5 text-clinical-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-widest text-clinical-400">Dosage Form</p>
                  <p className="font-bold text-clinical-900 truncate tracking-tight">{medication.dosage_form || 'Not Specified'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-clinical-400 font-black uppercase tracking-widest text-[8px]">Generic Name</span>
                  <span className="font-bold text-clinical-900 tracking-tight leading-tight">{medication.generic_name || '—'}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-clinical-400 font-black uppercase tracking-widest text-[8px]">Manufacturer</span>
                  <span className="font-bold text-clinical-900 tracking-tight leading-tight">{medication.manufacturer_name || '—'}</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-clinical-400 font-black uppercase tracking-widest text-[8px]">Data Source</span>
                  <span className="font-black text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100 text-[9px] uppercase tracking-wider">{medication.source_name}</span>
                </div>
              </div>

              {medication.notes && (
                <div className="pt-5 border-t border-clinical-100">
                  <p className="text-[9px] font-black uppercase tracking-widest text-clinical-400 mb-2.5 flex items-center gap-1.5">
                    <Info className="h-3 w-3" />
                    Internal Notes
                  </p>
                  <div className="text-[11px] text-clinical-600 leading-relaxed font-medium bg-clinical-50/30 p-4 rounded-xl border border-clinical-100/40 italic">
                    "{medication.notes}"
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-clinical-900 border-none shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <ShieldCheck size={140} />
            </div>
            <CardContent className="p-6 relative z-10">
              <h3 className="text-white font-black uppercase tracking-[0.2em] text-[10px] mb-6 flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                Safety Engine Status
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-3xl font-black text-white tabular-nums tracking-tighter">{ingredientCount}</p>
                  <p className="text-[9px] font-bold text-clinical-400 uppercase tracking-widest">Ingredients</p>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-black text-white tabular-nums tracking-tighter">{interactionCount + contraindicationCount}</p>
                  <p className="text-[9px] font-bold text-clinical-400 uppercase tracking-widest">Safety Rules</p>
                </div>
              </div>
              <div className="mt-8 space-y-3 pt-6 border-t border-white/5">
                <div className="flex items-center justify-between text-[10px] font-bold text-clinical-400">
                  <span className="uppercase tracking-widest">Drug Interactions</span>
                  <span className="tabular-nums font-black text-white">{interactionCount}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold text-clinical-400">
                  <span className="uppercase tracking-widest">Contraindications</span>
                  <span className="tabular-nums font-black text-white">{contraindicationCount}</span>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-white/5">
                <div className="flex items-center gap-2 text-[10px] font-black text-brand-400 uppercase tracking-widest">
                  <div className="h-1.5 w-1.5 rounded-full bg-safety-green" />
                  Validated for Sync
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Workspace: Ingredients & Safety Context */}
        <div className="lg:col-span-8 space-y-8 animate-in-slide-up" style={{ animationDelay: '0.15s' }}>
          {!canEdit && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-safety-yellow/10 border border-safety-yellow/20 text-safety-yellow text-xs font-black uppercase tracking-wider">
              <Info className="h-4 w-4" />
              Review Mode Only: Higher privileges required to edit composition
            </div>
          )}
          
          {/* Active Ingredients Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="space-y-1">
                <h3 className="flex items-center gap-2 text-xl font-black text-clinical-900 tracking-tight">
                  <Beaker className="h-5 w-5 text-clinical-400" />
                  Active Ingredient Composition
                </h3>
                <p className="text-[10px] font-black text-clinical-400 uppercase tracking-[0.15em]">
                  Validated Safety Engine Substances
                </p>
              </div>
              <Button size="sm" variant="primary" asChild disabled={!canEdit} className="h-9 px-4 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-clinical-600/10 active:scale-95 transition-all">
                <Link to="/medications/link-ingredient" search={{ medicationId }}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Link Ingredient
                </Link>
              </Button>
            </div>

            <Card className="border-clinical-200 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {medication.ingredients && medication.ingredients.length > 0 ? (
                  <div className="divide-y divide-clinical-100">
                    {medication.ingredients.map((ing) => (
                      <div key={ing.id} className="p-6 hover:bg-clinical-50/30 transition-colors group">
                        <div className="flex items-center justify-between gap-6">
                          <div className="flex items-center gap-5 min-w-0">
                            <div className="h-12 w-12 rounded-xl bg-clinical-50 flex items-center justify-center shrink-0 border border-clinical-100 group-hover:border-clinical-200 group-hover:bg-white transition-all duration-300">
                              <Beaker className="h-5 w-5 text-clinical-500" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2.5 mb-1.5">
                                <p className="font-black text-clinical-900 text-lg tracking-tight truncate">
                                  {ing.ingredient.canonical_name}
                                </p>
                                {ing.is_primary && (
                                  <Badge variant="success" className="py-0 px-2 h-5 text-[8px] font-black uppercase tracking-widest border-none bg-safety-green/10 text-safety-green">Primary</Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-3">
                                {ing.strength_text && (
                                  <div className="flex items-center gap-1 text-[10px] font-black text-clinical-600 bg-clinical-50 px-2 py-0.5 rounded border border-clinical-100/50">
                                    <span className="text-[8px] text-clinical-400 uppercase">Strength:</span>
                                    <span className="tabular-nums">{ing.strength_text}</span>
                                  </div>
                                )}
                                {ing.ingredient.common_name && (
                                  <span className="text-[10px] font-bold text-clinical-400 italic">
                                    AKA: {ing.ingredient.common_name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex items-center gap-1 mr-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                asChild
                                className="h-8 px-3 text-[9px] font-black uppercase tracking-widest border-clinical-100 bg-white hover:border-clinical-200 shadow-sm"
                                disabled={!canEdit}
                              >
                                <Link to="/interactions/new" search={{ ingredientId: ing.ingredient_id }}>
                                  <Plus className="h-3 w-3 mr-1" />
                                  Rule
                                </Link>
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                asChild
                                className="h-8 px-3 text-[9px] font-black uppercase tracking-widest border-clinical-100 bg-white hover:border-clinical-200 shadow-sm"
                                disabled={!canEdit}
                              >
                                <Link to="/contraindications/new" search={{ ingredientId: ing.ingredient_id }}>
                                  <Plus className="h-3 w-3 mr-1" />
                                  Caution
                                </Link>
                              </Button>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleRemoveIngredient(ing.id)}
                              className="h-8 w-8 p-0 text-clinical-300 hover:text-safety-red hover:bg-safety-red/5 rounded-lg"
                              disabled={!canEdit}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-16 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-clinical-50 flex items-center justify-center mx-auto mb-6 border border-clinical-100">
                      <Beaker className="h-8 w-8 text-clinical-200" />
                    </div>
                    <p className="text-sm font-black text-clinical-900 uppercase tracking-widest">Composition Empty</p>
                    <p className="text-[11px] text-clinical-500 mt-2 max-w-[280px] mx-auto leading-relaxed">
                      No substances linked. The safety engine cannot evaluate risks without active ingredients.
                    </p>
                    <Button size="sm" variant="primary" asChild disabled={!canEdit} className="mt-8 font-black text-[10px] uppercase tracking-widest h-10 px-8">
                      <Link to="/medications/link-ingredient" search={{ medicationId }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Link First Ingredient
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Safety Engine Rules Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Interaction Summary */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-500 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-safety-yellow" />
                  Drug Interactions ({interactionCount})
                </h3>
                <Button size="icon" variant="ghost" asChild disabled={!canEdit} className="h-8 w-8 rounded-lg text-clinical-400 hover:text-clinical-900 bg-white border border-clinical-100 shadow-sm">
                  <Link to="/interactions/new">
                    <Plus className="h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <Card className="border-clinical-200 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  {!isRulesLoading && rules?.interactions && rules.interactions.length > 0 ? (
                    <div className="divide-y divide-clinical-50 max-h-[400px] overflow-y-auto custom-scrollbar">
                      {rules.interactions.map((rule) => (
                        <div key={rule.id} className="p-5 hover:bg-clinical-50/30 transition-colors group relative">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge className={getSeverityBadgeColor(rule.severity) + " py-0 px-1.5 text-[8px] font-black uppercase border-none text-white"}>
                                  {rule.severity}
                                </Badge>
                                <span className="text-[11px] font-black text-clinical-900 tracking-tight">
                                  vs. {rule.interacting_name}
                                </span>
                              </div>
                              <p className="text-[11px] font-medium text-clinical-600 line-clamp-3 leading-relaxed border-l-2 border-clinical-100 pl-3">
                                {rule.effect_text}
                              </p>
                            </div>
                            <Link 
                              to="/interactions/$ruleId/edit" 
                              params={{ ruleId: rule.id }} 
                              className="h-8 w-8 rounded-lg bg-white flex items-center justify-center shrink-0 border border-clinical-100 shadow-sm group-hover:border-clinical-300 transition-all"
                            >
                              <ChevronRight className="h-4 w-4 text-clinical-400 group-hover:text-clinical-900" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-10 text-center">
                      <p className="text-[10px] font-bold text-clinical-300 uppercase tracking-widest italic">No linked interactions</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Contraindication Summary */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-500 flex items-center gap-2">
                  <Ban className="h-4 w-4 text-safety-red" />
                  Cautions & Risks ({contraindicationCount})
                </h3>
                <Button size="icon" variant="ghost" asChild disabled={!canEdit} className="h-8 w-8 rounded-lg text-clinical-400 hover:text-clinical-900 bg-white border border-clinical-100 shadow-sm">
                  <Link to="/contraindications/new">
                    <Plus className="h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <Card className="border-clinical-200 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  {!isRulesLoading && rules?.contraindications && rules.contraindications.length > 0 ? (
                    <div className="divide-y divide-clinical-50 max-h-[400px] overflow-y-auto custom-scrollbar">
                      {rules.contraindications.map((rule) => (
                        <div key={rule.id} className="p-5 hover:bg-clinical-50/30 transition-colors group relative">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge className={getSeverityBadgeColor(rule.severity) + " py-0 px-1.5 text-[8px] font-black uppercase border-none text-white"}>
                                  {rule.severity}
                                </Badge>
                                <span className="text-[11px] font-black text-clinical-900 tracking-tight">
                                  {rule.contraindication_name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[8px] font-black uppercase tracking-widest text-clinical-400 bg-clinical-50 px-1.5 py-0.5 rounded border border-clinical-100">
                                  {rule.contraindication_type}
                                </span>
                              </div>
                            </div>
                            <Link 
                              to="/contraindications/$ruleId/edit" 
                              params={{ ruleId: rule.id }} 
                              className="h-8 w-8 rounded-lg bg-white flex items-center justify-center shrink-0 border border-clinical-100 shadow-sm group-hover:border-clinical-300 transition-all"
                            >
                              <ChevronRight className="h-4 w-4 text-clinical-400 group-hover:text-clinical-900" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-10 text-center">
                      <p className="text-[10px] font-bold text-clinical-300 uppercase tracking-widest italic">No linked contraindications</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

          </div>

          <div className="p-8 rounded-2xl bg-clinical-900 text-white flex items-start gap-6 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:rotate-12 transition-transform duration-700 pointer-events-none">
              <Database size={100} />
            </div>
            <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10 shadow-inner">
              <ShieldCheck className="h-6 w-6 text-brand-400" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-black tracking-tight">Reference Integrity Architecture</p>
              <p className="text-[11px] text-clinical-400 mt-2 leading-relaxed font-medium max-w-2xl">
                This medication reference is a core node in the clinical safety engine. Changes here are propagated to synchronized field devices for offline risk evaluation. Ensure all substance mappings and safety rules follow established clinical guidelines.
              </p>
              <div className="mt-6">
                <button className="text-[10px] font-black uppercase tracking-widest text-brand-400 hover:text-white transition-colors flex items-center gap-1.5 group/btn">
                  Technical Implementation Specs
                  <ExternalLink className="h-3 w-3 group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => navigate({ to: '/medications/$medicationId', params: { medicationId } })}
        title="Edit Medication Reference"
        description="Update the medication record used for online review and offline sync."
        size="lg"
      >
        <Outlet />
      </Modal>
    </div>
  )
}
