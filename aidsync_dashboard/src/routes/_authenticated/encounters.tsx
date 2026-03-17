import { createFileRoute, Link, Outlet, useRouterState } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { 
  Search, 
  Clock,
  User,
  AlertTriangle,
  ClipboardCheck,
} from 'lucide-react'
import { fetchEncounters } from '@/data/queries'
import { formatDate, getEncounterAttentionState, getInteractionCheckFlagReasons, parseEncounterNarrative } from '@/lib/utils'
import type { EncounterWithPatient } from '@/types/database'

export const Route = createFileRoute('/_authenticated/encounters')({
  component: EncountersPage,
})

function EncountersPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  if (pathname !== '/encounters') {
    return <Outlet />
  }

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

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
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
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : filteredEncounters?.length === 0 ? (
          <div className="py-24 text-center bg-clinical-50/30 rounded-[2.5rem] border-2 border-dashed border-clinical-100">
            <div className="h-20 w-20 rounded-[2.5rem] bg-white flex items-center justify-center mx-auto mb-6 shadow-sm border border-clinical-100 animate-clinical-pulse">
              <ClipboardCheck className="h-10 w-10 text-clinical-200" />
            </div>
            <h3 className="text-xl font-black text-clinical-900 tracking-tight uppercase">Audit Queue Empty</h3>
            <p className="text-clinical-500 mt-2 max-w-sm mx-auto font-bold text-xs uppercase tracking-[0.15em] leading-relaxed px-6">
              No field sessions have been synced to the dashboard. Clinical sessions recorded on mobile devices will appear here once synchronized via PowerSync.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {filteredEncounters?.map((encounter) => (
              <EncounterCard key={encounter.id} encounter={encounter} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EncounterCard({ encounter }: { encounter: any }) {
  const interactionChecks = encounter.interaction_checks || []
  const attentionState = getEncounterAttentionState(interactionChecks)
  const narrative = parseEncounterNarrative(encounter.notes_text)
  const highSeverityAlert = attentionState.highSeverityCount > 0
  const totalAlerts = attentionState.warningCount
  const flagReasons = [
    ...new Set(
      interactionChecks.flatMap((check: any) => getInteractionCheckFlagReasons(check))
    ),
  ]
  const primaryFlagReason =
    flagReasons.includes('critical severity')
      ? 'critical severity'
      : flagReasons.includes('caution severity')
        ? 'caution severity'
        : flagReasons.includes('note-only action')
          ? 'note-only action'
          : ''
  const narrativePreview =
    narrative.patientContext ||
    narrative.safetyResult ||
    narrative.clinicianNote ||
    encounter.ai_summary ||
    ''
  
  return (
      <Card className={`h-full border-2 transition-all duration-300 overflow-hidden relative shadow-sm hover:shadow-xl ${attentionState.needsAttention ? 'border-safety-yellow/30 bg-safety-yellow/[0.01] hover:border-safety-yellow/60' : 'border-clinical-100 hover:border-clinical-400'}`}>
        <CardContent className="p-0">
          <div className="flex flex-col h-full">
            {/* Status & Date Header */}
            <div className={`px-5 py-3 border-b flex items-center justify-between ${attentionState.needsAttention ? 'border-safety-yellow/20 bg-safety-yellow/[0.04]' : 'border-clinical-50 bg-clinical-50/30'}`}>
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
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl font-black text-lg shrink-0 transition-all duration-500 shadow-inner group-hover:rotate-3 ${attentionState.needsAttention ? 'bg-safety-yellow/20 text-safety-yellow' : 'bg-clinical-100 text-clinical-600 group-hover:bg-clinical-200'}`}>
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
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" asChild className="h-9 px-3 font-black text-[10px] uppercase tracking-widest border-clinical-200 bg-white">
                    <Link to="/encounters/$encounterId" params={{ encounterId: encounter.id }}>
                      View
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Safety Summary Cues */}
              <div className="mt-6 flex flex-wrap gap-2">
                {attentionState.needsAttention ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-safety-yellow text-white shadow-sm shadow-safety-yellow/20">
                    <AlertTriangle className="h-3 w-3" />
                    <span className="text-[9px] font-black uppercase tracking-widest">
                      {primaryFlagReason ? `Flagged: ${primaryFlagReason}` : 'Flagged For Review'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-clinical-900 text-white shadow-sm shadow-clinical-900/20">
                    <ClipboardCheck className="h-3 w-3 text-brand-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Procedural Check Cleared</span>
                  </div>
                )}
                
                {attentionState.noteOnlyCount > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-clinical-200 bg-white text-clinical-700 shadow-sm">
                    <ClipboardCheck className="h-3 w-3 text-brand-500" />
                    <span className="text-[9px] font-black uppercase tracking-widest">{attentionState.noteOnlyCount} note-only {attentionState.noteOnlyCount === 1 ? 'decision' : 'decisions'}</span>
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
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-clinical-300">Visit Summary</span>
                </div>
                <div className={`p-4 rounded-xl border text-[11px] font-medium leading-relaxed italic ${attentionState.needsAttention ? 'bg-white/60 border-safety-yellow/10 text-clinical-800' : 'bg-clinical-50/30 border-clinical-100/50 text-clinical-500'}`}>
                  {narrativePreview ? (
                    <span className="line-clamp-3">"{narrativePreview}"</span>
                  ) : (
                    <span className="uppercase tracking-widest opacity-40 text-[9px] font-black">No structured visit summary recorded</span>
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
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
  )
}
