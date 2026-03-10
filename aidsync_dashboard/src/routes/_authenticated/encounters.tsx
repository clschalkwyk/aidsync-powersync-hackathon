import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { 
  Search, 
  ChevronRight,
  Clock,
  User,
  Filter,
  AlertTriangle,
  ClipboardCheck
} from 'lucide-react'
import { fetchEncounters } from '@/data/queries'
import { formatDate } from '@/lib/utils'
import type { EncounterWithPatient } from '@/types/database'

export const Route = createFileRoute('/_authenticated/encounters')({
  component: EncountersPage,
})

function EncountersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const { data: encounters, isLoading } = useQuery({
    queryKey: ['encounters'],
    queryFn: async () => {
      const data = await fetchEncounters()
      return data as EncounterWithPatient[]
    },
  })

  const filteredEncounters = (encounters || [])?.filter((encounter) => {
    const query = searchQuery.toLowerCase()
    return (
      encounter.patient?.full_name?.toLowerCase().includes(query) ||
      encounter.status.toLowerCase().includes(query) ||
      encounter.encounter_type?.toLowerCase().includes(query)
    )
  })

  return (
    <div className="space-y-6 animate-in-fade">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-clinical-400">Post-Care Audit</span>
            <div className="h-1 w-1 rounded-full bg-clinical-200" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-clinical-600">Encounter Review</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-clinical-900 tracking-tight leading-none">Review Queue</h2>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 animate-in-slide-up" style={{ animationDelay: '0.1s' }}>
        <Card className="flex-1 border-clinical-200 shadow-md shadow-clinical-900/5">
          <CardContent className="p-2 px-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-clinical-400" />
              <Input
                placeholder="Search by patient name or status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-none shadow-none focus:ring-0 h-10 font-medium"
              />
            </div>
          </CardContent>
        </Card>
        <Button variant="outline" className="h-14 sm:h-auto px-4 rounded-2xl border-clinical-200 bg-white">
          <Filter className="h-4 w-4 mr-2" />
          <span className="font-bold text-xs uppercase tracking-widest text-clinical-600">Filters</span>
        </Button>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 animate-in-slide-up" style={{ animationDelay: '0.15s' }}>
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : filteredEncounters?.length === 0 ? (
          <div className="py-24 text-center bg-clinical-50/50 rounded-3xl border-2 border-dashed border-clinical-200">
            <ClipboardCheck className="h-16 w-16 mx-auto text-clinical-200 mb-6 opacity-50" />
            <h3 className="text-xl font-black text-clinical-900 tracking-tight">No Encounters Found</h3>
            <p className="text-clinical-500 mt-2 max-w-sm mx-auto font-medium">
              Encounters will appear here once they are synchronized from clinician devices in the field.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {filteredEncounters?.map((encounter, idx) => (
              <div key={encounter.id} className="animate-in-slide-up" style={{ animationDelay: `${0.15 + (idx * 0.05)}s` }}>
                <EncounterCard encounter={encounter} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EncounterCard({ encounter }: { encounter: any }) {
  const interactionChecks = encounter.interaction_checks || []
  const manualReviewRequired = interactionChecks.some((c: any) => c.result_status === 'manual_review_required')
  const highSeverityAlert = interactionChecks.some((c: any) => c.severity === 'red')
  const totalAlerts = interactionChecks.filter((c: any) => c.severity === 'red' || c.severity === 'yellow').length
  
  return (
    <Link
      to="/encounters/$encounterId"
      params={{ encounterId: encounter.id }}
      className="group block h-full transition-all duration-300 active:scale-[0.99]"
    >
      <Card className={`h-full border-2 transition-all duration-300 cursor-pointer overflow-hidden relative shadow-sm hover:shadow-xl ${manualReviewRequired ? 'border-safety-yellow/30 bg-safety-yellow/[0.01] hover:border-safety-yellow/60' : 'border-clinical-100 hover:border-clinical-400'}`}>
        <CardContent className="p-0">
          <div className="flex flex-col h-full">
            {/* Status & Date Header */}
            <div className={`px-5 py-3 border-b flex items-center justify-between ${manualReviewRequired ? 'border-safety-yellow/20 bg-safety-yellow/[0.04]' : 'border-clinical-50 bg-clinical-50/30'}`}>
              <div className="flex items-center gap-2.5">
                <div className={`h-2 w-2 rounded-full ${encounter.status === 'completed' || encounter.status === 'synced' ? 'bg-safety-green shadow-[0_0_8px_rgba(5,150,105,0.4)]' : 'bg-safety-yellow animate-pulse shadow-[0_0_8px_rgba(217,119,6,0.4)]'}`} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-500">
                  {encounter.status === 'synced' ? 'Ready for Audit' : encounter.status.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-clinical-400">
                <Clock className="h-3 w-3" />
                {formatDate(encounter.created_at)}
              </div>
            </div>

            <div className="p-6 flex-1">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl font-black text-lg shrink-0 transition-all duration-500 shadow-inner group-hover:rotate-3 ${manualReviewRequired ? 'bg-safety-yellow/20 text-safety-yellow' : 'bg-clinical-100 text-clinical-600 group-hover:bg-clinical-200'}`}>
                    {encounter.patient?.full_name?.charAt(0) || 'P'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-clinical-900 text-lg leading-none group-hover:text-clinical-600 transition-colors truncate tracking-tight mb-1">
                      {encounter.patient?.full_name || 'Unknown Patient'}
                    </h3>
                    <p className="text-[9px] font-black text-clinical-400 uppercase tracking-[0.2em]">
                      {encounter.encounter_type || 'Clinical Session'}
                    </p>
                  </div>
                </div>
                <div className="h-8 w-8 rounded-lg bg-clinical-50 flex items-center justify-center shrink-0 border border-clinical-100 group-hover:border-clinical-300 transition-all">
                  <ChevronRight className="h-4 w-4 text-clinical-400 group-hover:text-clinical-900" />
                </div>
              </div>

              {/* Safety Summary Cues */}
              <div className="mt-6 flex flex-wrap gap-2">
                {manualReviewRequired ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-safety-yellow text-white shadow-sm shadow-safety-yellow/20">
                    <AlertTriangle className="h-3 w-3" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Manual Review Required</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-clinical-900 text-white shadow-sm shadow-clinical-900/20">
                    <ClipboardCheck className="h-3 w-3 text-brand-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Procedural Check Cleared</span>
                  </div>
                )}
                
                {totalAlerts > 0 && (
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border-2 font-black text-[9px] uppercase tracking-widest ${highSeverityAlert ? 'bg-safety-red/5 border-safety-red text-safety-red' : 'bg-safety-yellow/5 border-safety-yellow text-safety-yellow'}`}>
                    {totalAlerts} Safety {totalAlerts === 1 ? 'Alert' : 'Alerts'}
                  </div>
                )}
              </div>

              {/* Field Notes Highlight */}
              <div className="mt-5 pt-5 border-t border-clinical-50/80">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-clinical-300">Clinician Observations</span>
                </div>
                <div className={`p-4 rounded-xl border text-[11px] font-medium leading-relaxed italic ${manualReviewRequired ? 'bg-white/60 border-safety-yellow/10 text-clinical-800' : 'bg-clinical-50/30 border-clinical-100/50 text-clinical-500'}`}>
                  {encounter.notes_text ? (
                    <span className="line-clamp-2">"{encounter.notes_text}"</span>
                  ) : (
                    <span className="uppercase tracking-widest opacity-40 text-[9px] font-black">No field observations recorded</span>
                  )}
                </div>
              </div>

              {/* Footer Trace */}
              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-2 text-clinical-400">
                  <div className="h-5 w-5 rounded-full bg-clinical-50 flex items-center justify-center border border-clinical-100 shadow-sm shrink-0">
                    <User className="h-2.5 w-2.5" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest">Trace ID:</span>
                  <span className="text-[9px] font-black font-mono bg-clinical-50 px-1.5 py-0.5 rounded border border-clinical-100">
                    {encounter.id.slice(0, 8)}
                  </span>
                </div>
                
                <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-clinical-300 group-hover:text-clinical-900 transition-colors">
                  Open Audit
                  <ChevronRight className="h-3 w-3" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
