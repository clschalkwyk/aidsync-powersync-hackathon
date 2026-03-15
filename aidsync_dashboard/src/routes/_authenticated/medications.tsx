import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { 
  Search, 
  Plus, 
  Pill,
  Edit,
  ChevronRight,
  Building2,
  Info
} from 'lucide-react'
import { fetchMedications } from '@/data/queries'
import { canManageReferenceData } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import type { MedicationCatalog } from '@/types/database'
import { useState } from 'react'

export const Route = createFileRoute('/_authenticated/medications')({
  component: MedicationsPage,
})

function MedicationsPage() {
  const { profile } = useAuth()
  const canEdit = canManageReferenceData(profile?.role)
  const [searchQuery, setSearchQuery] = useState('')
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  const { data: medications, isLoading } = useQuery({
    queryKey: ['medications'],
    queryFn: fetchMedications,
  })

  const filteredMedications = medications?.filter((med) => {
    const query = searchQuery.toLowerCase()
    return (
      med.brand_name.toLowerCase().includes(query) ||
      med.generic_name?.toLowerCase().includes(query) ||
      med.manufacturer_name?.toLowerCase().includes(query)
    )
  })

  if (pathname !== '/medications') {
    return <Outlet />
  }

  return (
    <div className="space-y-6 animate-in-fade">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-clinical-400">Editorial</span>
            <div className="h-1 w-1 rounded-full bg-clinical-200" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-clinical-600">Reference Catalog</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-clinical-900 tracking-tight leading-none">Medication Reference</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button variant="outline" asChild disabled={!canEdit} className="w-full sm:w-auto shadow-sm font-black uppercase tracking-widest text-[10px] h-11 px-6 active:scale-95 transition-all border-clinical-200 bg-white hover:border-clinical-400">
            <Link to="/medications/prepare">
              <Plus className="h-5 w-5 mr-2 text-clinical-400" />
              Prepare Reference
            </Link>
          </Button>
          <Button asChild disabled={!canEdit} className="w-full sm:w-auto shadow-lg shadow-clinical-600/20 font-black uppercase tracking-widest text-[10px] h-11 px-6 active:scale-95 transition-all">
            <Link to="/medications/new">
              <Plus className="h-5 w-5 mr-2" />
              Add Medication Reference
            </Link>
          </Button>
        </div>
      </div>

      {!canEdit && (
        <div className="p-4 rounded-2xl bg-safety-yellow/10 border border-safety-yellow/20 text-safety-yellow text-sm font-bold">
          You can review medication reference data, but only supervisor and admin users can add or edit it.
        </div>
      )}

      {/* Sync Status Info */}
      <div className="p-4 rounded-2xl bg-brand-50 border border-brand-100 flex items-start gap-4 animate-in-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm border border-brand-100 animate-clinical-pulse">
          <Info className="h-5 w-5 text-brand-600" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-brand-900 leading-tight">Prepared Online, Available Offline</p>
          <p className="text-xs text-brand-900 mt-1 leading-relaxed font-semibold">
            Changes made here are synchronized to clinician devices via PowerSync. Ensure safety rules and ingredient compositions are fully verified before publishing.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3 animate-in-slide-up" style={{ animationDelay: '0.15s' }}>
        <Card className="flex-1 border-clinical-200 shadow-md shadow-clinical-900/5">
          <CardContent className="p-2 px-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-clinical-400" />
              <Input
                placeholder="Search by brand, generic name, or manufacturer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-none shadow-none focus:ring-0 h-10 font-medium"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 animate-in-slide-up" style={{ animationDelay: '0.2s' }}>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : filteredMedications?.length === 0 ? (
          <div className="py-24 text-center bg-clinical-50/50 rounded-3xl border-2 border-dashed border-clinical-200">
            <Pill className="h-16 w-16 mx-auto text-clinical-200 mb-6 opacity-40" />
            <h3 className="text-xl font-black text-clinical-900 tracking-tight uppercase">No Medication References Found</h3>
            <p className="text-clinical-500 mt-2 max-w-sm mx-auto font-medium">
              Start building your clinical reference library. Once added, medications can be linked to ingredients and safety rules.
            </p>
            <Button asChild variant="primary" disabled={!canEdit} className="mt-8 shadow-lg shadow-clinical-600/20 h-11 px-8 font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all">
              <Link to="/medications/new">
                <Plus className="h-4 w-4 mr-2" />
                Add First Reference
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {filteredMedications?.map((med, idx) => (
              <div key={med.id} className="animate-in-slide-up" style={{ animationDelay: `${0.2 + (idx * 0.05)}s` }}>
                <MedicationCard medication={med} />
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

function MedicationCard({ medication }: { medication: MedicationCatalog }) {
  const { profile } = useAuth()
  const canEdit = canManageReferenceData(profile?.role)
  const navigate = useNavigate()

  const handleQuickEdit = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    navigate({ to: `/medications/${medication.id}/edit` })
  }

  return (
    <Link
      to="/medications/$medicationId"
      params={{ medicationId: medication.id }}
      className="group block h-full"
    >
      <Card className="h-full border-clinical-200/60 hover:border-clinical-400 hover:shadow-xl hover:shadow-clinical-900/5 transition-all duration-300 cursor-pointer overflow-visible relative active:scale-[0.99]">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-clinical-50 group-hover:bg-clinical-100 transition-colors shrink-0 shadow-inner group-hover:scale-110 duration-300 transition-transform">
              <Pill className="h-6 w-6 text-clinical-600" />
            </div>
            <div className="flex items-center gap-2">
              {canEdit && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleQuickEdit}
                  className="h-8 px-3 text-[9px] font-black uppercase tracking-widest text-clinical-400 hover:text-clinical-900 hover:bg-clinical-100 rounded-lg border border-transparent hover:border-clinical-200 transition-all"
                >
                  <Edit className="h-3 w-3 mr-1.5" />
                  Quick Edit
                </Button>
              )}
              {!medication.is_active && (
                <Badge variant="default" className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5">Inactive</Badge>
              )}
            </div>
          </div>
          
          <div className="mt-5">
            <h3 className="font-black text-clinical-900 text-lg leading-tight group-hover:text-clinical-600 transition-colors truncate tracking-tight">
              {medication.brand_name}
            </h3>
            <p className="text-sm font-bold text-clinical-500 mt-1 truncate">
              {medication.generic_name || 'Generic Name N/A'}
            </p>
          </div>

          <div className="mt-8 pt-5 border-t border-clinical-50 space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-black text-clinical-400 uppercase tracking-widest">
              <Building2 className="h-3 w-3" />
              <span className="truncate">{medication.manufacturer_name || 'Unknown Manufacturer'}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {medication.dosage_form && (
                  <span className="px-2 py-0.5 rounded-lg bg-clinical-50 text-clinical-600 text-[9px] font-black border border-clinical-100 uppercase tracking-wider">
                    {medication.dosage_form}
                  </span>
                )}
                {medication.strength_text && (
                  <span className="px-2 py-0.5 rounded-lg bg-clinical-50 text-clinical-600 text-[9px] font-black border border-clinical-100 uppercase tracking-wider">
                    {medication.strength_text}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-clinical-50 border border-clinical-100 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 shadow-sm shrink-0">
                <span className="text-[8px] font-black uppercase tracking-widest text-clinical-600">Review & Edit</span>
                <ChevronRight className="h-3.5 w-3.5 text-clinical-600" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
