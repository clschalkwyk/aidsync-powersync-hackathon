import { createFileRoute, Link, Outlet, useRouterState } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { 
  Search, 
  Plus,
  Beaker,
  ArrowRightLeft,
  Edit,
  Trash2,
  ShieldAlert,
  Info,
} from 'lucide-react'
import { fetchInteractionRules, removeInteractionRule } from '@/data/queries'
import { canManageReferenceData, formatDateTime } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import type { MedicationInteractionRule } from '@/types/database'

export const Route = createFileRoute('/_authenticated/interactions')({
  component: InteractionsPage,
})

function InteractionsPage() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const canEdit = canManageReferenceData(profile?.role)
  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  
  const { data: rules, isLoading } = useQuery({
    queryKey: ['interaction-rules'],
    queryFn: fetchInteractionRules,
  })

  const deleteMutation = useMutation({
    mutationFn: removeInteractionRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interaction-rules'] })
    },
  })

  const filteredRules = rules?.filter((rule) => {
    const query = searchQuery.toLowerCase()
    const ingredientName = (rule as any).ingredient?.canonical_name?.toLowerCase() || ''
    const matchesSearch = (
      ingredientName.includes(query) ||
      rule.interacting_name.toLowerCase().includes(query) ||
      rule.effect_text.toLowerCase().includes(query)
    )
    const matchesSeverity = severityFilter === 'all' || rule.severity === severityFilter
    return matchesSearch && matchesSeverity
  })

  const handleDelete = (id: string) => {
    if (!canEdit) return
    if (confirm('Are you sure you want to delete this interaction rule?')) {
      deleteMutation.mutate(id)
    }
  }

  if (pathname !== '/interactions') {
    return <Outlet />
  }

  return (
    <div className="space-y-6 pb-12 animate-in-fade">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-clinical-400">Reference Prep</span>
            <div className="h-1 w-1 rounded-full bg-clinical-200" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-clinical-600">Interaction Logic</span>
          </div>
          <h2 className="text-3xl font-black text-clinical-900 tracking-tight leading-none">Safety Engine Rules</h2>
          <p className="text-xs font-bold text-clinical-500 uppercase tracking-widest">Drug-to-Drug and Substance interaction definitions</p>
        </div>
        <Button asChild disabled={!canEdit} className="h-12 px-8 font-black uppercase tracking-widest text-[11px] shadow-xl shadow-clinical-600/10 active:scale-95 transition-all">
          <Link to="/interactions/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Interaction Rule
          </Link>
        </Button>
      </div>

      {!canEdit && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-safety-yellow/10 border border-safety-yellow/20 text-safety-yellow text-xs font-black uppercase tracking-wider">
          <Info className="h-4 w-4" />
          Review Mode Only: Higher privileges required to modify safety rules
        </div>
      )}

      {/* Filters */}
      <div className="animate-in-slide-up" style={{ animationDelay: '0.1s' }}>
        <Card className="border-clinical-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-clinical-100">
              <div className="relative flex-1">
                <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-clinical-400" />
                <Input
                  placeholder="Search by substance or clinical effect..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-14 border-none shadow-none focus:ring-0 h-14 text-base font-bold placeholder:text-clinical-300"
                />
              </div>
              <div className="flex items-center gap-4 px-6 py-2 bg-clinical-50/30">
                <span className="text-[9px] font-black uppercase tracking-widest text-clinical-400 whitespace-nowrap">Severity</span>
                <Select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="min-w-[160px] h-10 font-black uppercase tracking-widest text-[10px] border-clinical-200"
                >
                  <option value="all">All Levels</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="severe">Severe</option>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      <div className="space-y-4 animate-in-slide-up" style={{ animationDelay: '0.15s' }}>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-3xl" />)}
          </div>
        ) : filteredRules?.length === 0 ? (
          <div className="py-24 text-center bg-clinical-50/30 rounded-[2.5rem] border-2 border-dashed border-clinical-100">
            <ShieldAlert className="h-16 w-16 mx-auto text-clinical-200 mb-6 opacity-40" />
            <h3 className="text-xl font-black text-clinical-900 tracking-tight uppercase">No Rules Defined</h3>
            <p className="text-clinical-500 mt-2 max-w-sm mx-auto font-bold text-xs uppercase tracking-widest px-6">
              Establish safety logic by defining substance interactions
            </p>
            <Button asChild variant="primary" disabled={!canEdit} className="mt-10 font-black uppercase tracking-widest text-[10px] h-11 px-8">
              <Link to="/interactions/new">
                <Plus className="h-4 w-4 mr-2" />
                Add First Rule
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredRules?.map((rule, idx) => (
              <div key={rule.id} className="animate-in-slide-up" style={{ animationDelay: `${0.15 + (idx * 0.03)}s` }}>
                <InteractionRuleRow 
                  rule={rule} 
                  canEdit={canEdit}
                  onDelete={() => handleDelete(rule.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

function InteractionRuleRow({ rule, canEdit, onDelete }: { rule: MedicationInteractionRule, canEdit: boolean, onDelete: () => void }) {
  const ingredientName = (rule as any).ingredient?.canonical_name || 'Unknown Ingredient'

  return (
    <Card className="border-2 border-clinical-100 hover:border-clinical-400 hover:shadow-xl transition-all duration-500 overflow-hidden group active:scale-[0.995]">
      <CardContent className="p-0">
        <div className="flex flex-col lg:flex-row">
          {/* Severity Strip */}
          <div className={`w-full lg:w-2 shrink-0 ${
            rule.severity === 'severe' || rule.severity === 'high' ? 'bg-safety-red' : 
            rule.severity === 'medium' ? 'bg-safety-yellow' : 'bg-clinical-400'
          }`} />
          
          <div className="flex-1 p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row lg:items-start gap-8">
              
              {/* Context Column */}
              <div className="lg:w-1/3 space-y-6">
                <div className="flex items-center gap-3">
                  <Badge variant={rule.severity === 'severe' || rule.severity === 'high' ? 'danger' : rule.severity === 'medium' ? 'warning' : 'info'} className="px-3 py-1 text-[10px] font-black uppercase tracking-widest h-7 border-none shadow-sm">
                    {rule.severity} Severity
                  </Badge>
                  {!rule.is_active && (
                    <Badge variant="default" className="text-[10px] font-black uppercase tracking-widest h-7 border-none bg-clinical-100 text-clinical-400">Inactive</Badge>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-clinical-50 border border-clinical-100 shadow-inner group-hover:bg-white transition-all">
                    <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center border border-clinical-100 shrink-0">
                      <Beaker className="h-4 w-4 text-clinical-500" />
                    </div>
                    <span className="font-black text-clinical-900 text-sm tracking-tight truncate">{ingredientName}</span>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="h-px bg-clinical-100 flex-1" />
                    <div className="h-7 w-7 rounded-full bg-clinical-50 flex items-center justify-center border border-clinical-100 shrink-0 mx-2 shadow-sm">
                      <ArrowRightLeft className="h-3 w-3 text-clinical-400" />
                    </div>
                    <div className="h-px bg-clinical-100 flex-1" />
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-brand-50 border border-brand-100 shadow-inner group-hover:bg-white transition-all">
                    <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center border border-brand-100 shrink-0 text-brand-600">
                      <ShieldAlert className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-brand-900 text-sm tracking-tight truncate">{rule.interacting_name}</p>
                      <p className="text-[8px] font-black uppercase tracking-[0.2em] text-brand-400 mt-0.5">{rule.interacting_type}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Effect Column */}
              <div className="flex-1 space-y-6 min-w-0">
                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-clinical-400 px-1">Clinical Interaction Effect</p>
                  <div className="p-5 rounded-2xl bg-clinical-50/30 border border-clinical-100 group-hover:bg-white group-hover:border-clinical-200 transition-all shadow-inner group-hover:shadow-sm">
                    <p className="text-base font-black text-clinical-900 leading-relaxed tracking-tight">
                      {rule.effect_text}
                    </p>
                  </div>
                </div>

                {rule.guidance_text && (
                  <div className="space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-clinical-400 px-1">Clinician Guidance</p>
                    <div className="p-5 rounded-2xl bg-brand-50/20 border border-brand-100/50 italic text-sm font-bold text-clinical-700 leading-relaxed group-hover:bg-white transition-all">
                      "{rule.guidance_text}"
                    </div>
                  </div>
                )}
              </div>

              {/* Actions Column */}
              <div className="flex items-center lg:items-start justify-end gap-2 lg:pt-1">
                <Button variant="outline" size="sm" asChild disabled={!canEdit} className="h-10 px-4 rounded-xl text-clinical-600 hover:text-clinical-900 border-clinical-200 bg-white hover:border-clinical-400 active:scale-95 transition-all shadow-sm group/edit">
                  <Link to="/interactions/$ruleId/edit" params={{ ruleId: rule.id }}>
                    <Edit className="h-3.5 w-3.5 mr-2 text-clinical-400 group-hover/edit:text-clinical-900 transition-colors" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Edit</span>
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={onDelete} disabled={!canEdit} className="h-10 w-10 p-0 rounded-xl text-clinical-300 hover:text-safety-red hover:bg-safety-red/5 border border-transparent hover:border-safety-red/10 active:scale-95 transition-all">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="mt-8 pt-5 border-t border-clinical-50 flex flex-wrap items-center justify-between gap-4 text-[9px] font-black uppercase tracking-[0.2em] text-clinical-300">
              <span className="flex items-center gap-2">
                <Info className="h-3 w-3" />
                Source: {rule.source_name}
              </span>
              <span>Last Validated: {formatDateTime(rule.updated_at)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
