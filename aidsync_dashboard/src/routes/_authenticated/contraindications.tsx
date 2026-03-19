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
  Ban,
  Beaker,
  ArrowRight,
  Edit,
  Trash2,
  ShieldAlert,
  Info
} from 'lucide-react'
import { fetchContraindicationRules, removeContraindicationRule } from '@/data/queries'
import { canManageReferenceData, formatDateTime } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import type { MedicationContraindicationRule } from '@/types/database'

export const Route = createFileRoute('/_authenticated/contraindications')({
  component: ContraindicationsPage,
})

function ContraindicationsPage() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const canEdit = canManageReferenceData(profile?.role)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  
  const { data: rules, isLoading } = useQuery({
    queryKey: ['contraindication-rules'],
    queryFn: fetchContraindicationRules,
  })

  const deleteMutation = useMutation({
    mutationFn: removeContraindicationRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contraindication-rules'] })
    },
  })

  const filteredRules = rules?.filter((rule) => {
    const query = searchQuery.toLowerCase()
    const ingredientName = (rule as any).ingredient?.canonical_name?.toLowerCase() || ''
    const matchesSearch = (
      ingredientName.includes(query) ||
      rule.contraindication_name.toLowerCase().includes(query)
    )
    const matchesType = typeFilter === 'all' || rule.contraindication_type === typeFilter
    return matchesSearch && matchesType
  })

  const handleDelete = (id: string) => {
    if (!canEdit) return
    if (confirm('Are you sure you want to delete this contraindication rule?')) {
      deleteMutation.mutate(id)
    }
  }

  if (pathname !== '/contraindications') {
    return <Outlet />
  }

  return (
    <div className="space-y-5 pb-10 animate-in-fade">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-clinical-400">Reference Prep</span>
            <div className="h-1 w-1 rounded-full bg-clinical-200" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-clinical-600">Clinical Cautions</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-clinical-900 tracking-tight leading-none">Contraindications</h2>
          <p className="text-[11px] font-bold text-clinical-500 uppercase tracking-[0.18em]">Risk definitions based on patient physiological factors</p>
        </div>
        <Button asChild disabled={!canEdit} className="h-11 px-6 font-black uppercase tracking-widest text-[11px] shadow-lg shadow-clinical-600/10 active:scale-95 transition-all">
          <Link to="/contraindications/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Caution Rule
          </Link>
        </Button>
      </div>

      {!canEdit && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-safety-yellow/10 border border-safety-yellow/20 text-safety-yellow text-xs font-black uppercase tracking-wider">
          <Info className="h-4 w-4" />
          Review Mode Only: Higher privileges required to modify caution rules
        </div>
      )}

      {/* Filters */}
      <div className="animate-in-slide-up" style={{ animationDelay: '0.1s' }}>
        <Card className="border-clinical-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-clinical-100">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-clinical-400" />
                <Input
                  placeholder="Search by substance or clinical factor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 border-none shadow-none focus:ring-0 h-12 text-sm font-bold placeholder:text-clinical-300"
                />
              </div>
              <div className="flex items-center gap-3 px-4 py-2 bg-clinical-50/30">
                <span className="text-[9px] font-black uppercase tracking-widest text-clinical-400 whitespace-nowrap">Filter Type</span>
                <Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="min-w-[180px] h-9 font-black uppercase tracking-widest text-[10px] border-clinical-200"
                >
                  <option value="all">All Types</option>
                  <option value="condition">Condition</option>
                  <option value="allergy">Allergy</option>
                  <option value="age">Age Group</option>
                  <option value="pregnancy">Pregnancy</option>
                  <option value="lactation">Lactation</option>
                  <option value="organ_function">Organ Function</option>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      <div className="space-y-3 animate-in-slide-up" style={{ animationDelay: '0.15s' }}>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-36 rounded-3xl" />)}
          </div>
        ) : filteredRules?.length === 0 ? (
          <div className="py-24 text-center bg-clinical-50/30 rounded-[2.5rem] border-2 border-dashed border-clinical-100">
            <Ban className="h-16 w-16 mx-auto text-clinical-200 mb-6 opacity-40" />
            <h3 className="text-xl font-black text-clinical-900 tracking-tight uppercase">No Cautions Found</h3>
            <p className="text-clinical-500 mt-2 max-w-sm mx-auto font-bold text-xs uppercase tracking-widest px-6">
              Establish patient-safety logic by defining absolute contraindications
            </p>
            <Button asChild variant="primary" disabled={!canEdit} className="mt-10 font-black uppercase tracking-widest text-[10px] h-11 px-8">
              <Link to="/contraindications/new">
                <Plus className="h-4 w-4 mr-2" />
                Add First Caution
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredRules?.map((rule, idx) => (
              <div key={rule.id} className="animate-in-slide-up" style={{ animationDelay: `${0.15 + (idx * 0.03)}s` }}>
                <ContraindicationRuleRow 
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

function ContraindicationRuleRow({ rule, canEdit, onDelete }: { rule: MedicationContraindicationRule, canEdit: boolean, onDelete: () => void }) {
  const ingredientName = (rule as any).ingredient?.canonical_name || 'Unknown Ingredient'
  
  const typeConfig: Record<string, { color: string; label: string }> = {
    condition: { color: 'bg-clinical-100 text-clinical-700', label: 'Condition' },
    allergy: { color: 'bg-safety-red/10 text-safety-red', label: 'Allergy' },
    age: { color: 'bg-safety-yellow/10 text-safety-yellow', label: 'Age' },
    pregnancy: { color: 'bg-brand-100 text-brand-700', label: 'Pregnancy' },
    lactation: { color: 'bg-brand-100 text-brand-700', label: 'Lactation' },
    organ_function: { color: 'bg-clinical-900 text-white', label: 'Organ Function' },
  }
  
  const typeInfo = typeConfig[rule.contraindication_type] || typeConfig.condition
  const severityVariant =
    rule.severity === 'severe' || rule.severity === 'high'
      ? 'danger'
      : rule.severity === 'medium'
        ? 'warning'
        : 'info'

  return (
    <Card className="border border-clinical-100 hover:border-clinical-300 hover:shadow-sm transition-all duration-300 overflow-hidden">
      <CardContent className="p-0">
        <div className="grid gap-3 p-4 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)_auto] xl:items-start">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={severityVariant} className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest h-6 border-none shadow-none">
                {rule.severity}
              </Badge>
              <Badge className={`${typeInfo.color} px-2.5 py-1 text-[10px] font-black uppercase tracking-widest h-6 border-none shadow-none`}>
                {typeInfo.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-clinical-100 bg-clinical-50 shrink-0">
                <Beaker className="h-3.5 w-3.5 text-clinical-500" />
              </div>
              <p className="min-w-0 truncate text-sm font-black tracking-tight text-clinical-900">
                {ingredientName}
              </p>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-clinical-300" />
              <p className="min-w-0 truncate text-sm font-black tracking-tight text-safety-red">
                {rule.contraindication_name}
              </p>
            </div>
          </div>

          <div className="min-w-0 space-y-2">
            <div className="rounded-xl border border-clinical-100 bg-clinical-50/40 px-3 py-2.5">
              {rule.guidance_text ? (
                <p className="line-clamp-2 text-sm font-bold leading-6 text-clinical-900">
                  {rule.guidance_text}
                </p>
              ) : (
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-clinical-400">
                  No specific clinical guidance documented for this caution.
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] font-black uppercase tracking-[0.16em] text-clinical-300">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="h-3 w-3" />
                Review System: Dashboard
              </span>
              <span>Updated: {formatDateTime(rule.updated_at)}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 xl:pl-2">
            <Button variant="outline" size="sm" asChild disabled={!canEdit} className="h-8 px-3 rounded-lg text-clinical-600 hover:text-clinical-900 border-clinical-200 bg-white hover:border-clinical-400 shadow-none">
              <Link to="/contraindications/$ruleId/edit" params={{ ruleId: rule.id }}>
                <Edit className="h-3.5 w-3.5 mr-1.5 text-clinical-400" />
                <span className="text-[10px] font-black uppercase tracking-widest">Edit</span>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete} disabled={!canEdit} className="h-8 w-8 p-0 rounded-lg text-clinical-300 hover:text-safety-red hover:bg-safety-red/5 shadow-none">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
