import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
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
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isAddModalOpen = pathname === '/contraindications/new'
  const isEditModalOpen = /^\/contraindications\/[^/]+\/edit$/.test(pathname)
  
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

  return (
    <div className="space-y-6 pb-12 animate-in-fade">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-clinical-400">Reference Prep</span>
            <div className="h-1 w-1 rounded-full bg-clinical-200" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-clinical-600">Clinical Cautions</span>
          </div>
          <h2 className="text-3xl font-black text-clinical-900 tracking-tight leading-none">Contraindications</h2>
          <p className="text-xs font-bold text-clinical-500 uppercase tracking-widest">Risk definitions based on patient physiological factors</p>
        </div>
        <Button asChild disabled={!canEdit} className="h-12 px-8 font-black uppercase tracking-widest text-[11px] shadow-xl shadow-clinical-600/10 active:scale-95 transition-all">
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
                <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-clinical-400" />
                <Input
                  placeholder="Search by substance or clinical factor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-14 border-none shadow-none focus:ring-0 h-14 text-base font-bold placeholder:text-clinical-300"
                />
              </div>
              <div className="flex items-center gap-4 px-6 py-2 bg-clinical-50/30">
                <span className="text-[9px] font-black uppercase tracking-widest text-clinical-400 whitespace-nowrap">Filter Type</span>
                <Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="min-w-[200px] h-10 font-black uppercase tracking-widest text-[10px] border-clinical-200"
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
      <div className="space-y-4 animate-in-slide-up" style={{ animationDelay: '0.15s' }}>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-3xl" />)}
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
          <div className="grid grid-cols-1 gap-6">
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

      <Modal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => navigate({ to: '/contraindications' })}
        title={isEditModalOpen ? 'Edit Caution Rule' : 'Add Caution Rule'}
        description={
          isEditModalOpen
            ? 'Update the contraindication or caution rule used for offline medication checks.'
            : 'Define a contraindication or caution rule for offline medication checks.'
        }
        size="lg"
      >
        <Outlet />
      </Modal>
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
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant={rule.severity === 'severe' || rule.severity === 'high' ? 'danger' : rule.severity === 'medium' ? 'warning' : 'info'} className="px-3 py-1 text-[10px] font-black uppercase tracking-widest h-7 border-none shadow-sm">
                    {rule.severity} Severity
                  </Badge>
                  <Badge className={typeInfo.color + " px-3 py-1 text-[10px] font-black uppercase tracking-widest h-7 border-none"}>
                    {typeInfo.label}
                  </Badge>
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
                      <ArrowRight className="h-3.5 w-3.5 text-clinical-400" />
                    </div>
                    <div className="h-px bg-clinical-100 flex-1" />
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-safety-red/5 border border-safety-red/10 shadow-inner group-hover:bg-white transition-all">
                    <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center border border-clinical-100 shrink-0 text-safety-red">
                      <Ban className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-safety-red text-sm tracking-tight truncate">{rule.contraindication_name}</p>
                      <p className="text-[8px] font-black uppercase tracking-[0.2em] text-clinical-400 mt-0.5">Safety Barrier</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Effect Column */}
              <div className="flex-1 space-y-6 min-w-0">
                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-clinical-400 px-1">Clinical Caution & Logic</p>
                  <div className="p-5 rounded-2xl bg-clinical-50/30 border border-clinical-100 group-hover:bg-white group-hover:border-clinical-200 transition-all shadow-inner group-hover:shadow-sm min-h-[100px] flex items-center">
                    {rule.guidance_text ? (
                      <p className="text-base font-black text-clinical-900 leading-relaxed tracking-tight italic">
                        "{rule.guidance_text}"
                      </p>
                    ) : (
                      <p className="text-xs font-bold text-clinical-400 uppercase tracking-widest italic">
                        No specific clinical guidance documented for this caution.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Column */}
              <div className="flex items-center lg:items-start justify-end gap-2 lg:pt-1">
                <Button variant="ghost" size="sm" asChild disabled={!canEdit} className="h-10 w-10 p-0 rounded-xl text-clinical-400 hover:text-clinical-900 hover:bg-clinical-50 border border-transparent hover:border-clinical-100 active:scale-95 transition-all">
                  <Link to="/contraindications/$ruleId/edit" params={{ ruleId: rule.id }}>
                    <Edit className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={onDelete} disabled={!canEdit} className="h-10 w-10 p-0 rounded-xl text-clinical-300 hover:text-safety-red hover:bg-safety-red/5 border border-transparent hover:border-safety-red/10 active:scale-95 transition-all">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="mt-8 pt-5 border-t border-clinical-50 flex flex-wrap items-center justify-between gap-4 text-[9px] font-black uppercase tracking-[0.2em] text-clinical-300">
              <span className="flex items-center gap-2">
                <ShieldAlert className="h-3 w-3" />
                Review System: AidSync Manual Dashboard
              </span>
              <span>Last Updated: {formatDateTime(rule.updated_at)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
