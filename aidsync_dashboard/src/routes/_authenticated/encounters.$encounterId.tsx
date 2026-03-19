import { useEffect, useState } from 'react'
import { createFileRoute, useParams, Link, Outlet, useRouterState } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { TextArea } from '@/components/ui/TextArea'
import { 
  ArrowLeft, 
  Activity, 
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  MessageSquare,
  Zap,
  FileText,
  Mic,
  ClipboardList,
  User,
} from 'lucide-react'
import { fetchEncounterById, updateEncounter, updateInteractionCheck } from '@/data/queries'
import { canManageReferenceData, formatClinicianAction, formatDate, formatDateTime, getEncounterAttentionState, getInteractionCheckFlagReasons, getSeverityBadgeColor, getUserFriendlyErrorMessage, parseEncounterNarrative } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

export const Route = createFileRoute('/_authenticated/encounters/$encounterId')({
  component: EncounterDetailPage,
})

type CheckWarningView = {
  title: string
  detail: string
  severity: 'red' | 'yellow' | 'green'
}

function normalizeWarningSeverity(value: unknown): 'red' | 'yellow' | 'green' {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (normalized === 'red' || normalized === 'high' || normalized === 'severe') return 'red'
  if (normalized === 'yellow' || normalized === 'medium' || normalized === 'warning') return 'yellow'
  return 'green'
}

function formatWarningCode(code: unknown): string {
  const normalized = String(code ?? '').trim().toLowerCase()
  switch (normalized) {
    case 'allergy_overlap':
      return 'Allergy overlap'
    case 'drug_interaction':
      return 'Drug interaction'
    case 'pregnancy_caution':
      return 'Pregnancy caution'
    case 'lactation_caution':
      return 'Lactation caution'
    case 'age_restriction':
      return 'Age restriction'
    default:
      return normalized ? normalized.replace(/_/g, ' ') : 'Clinical warning'
  }
}

function formatInteractionWarning(warning: unknown, fallbackSeverity: string): CheckWarningView {
  if (typeof warning === 'string') {
    return {
      title: 'Clinical warning',
      detail: warning,
      severity: normalizeWarningSeverity(fallbackSeverity),
    }
  }

  if (warning && typeof warning === 'object' && !Array.isArray(warning)) {
    const record = warning as Record<string, unknown>
    const title =
      String(record.title ?? '').trim() ||
      formatWarningCode(record.code)
    const detail =
      String(record.detail ?? '').trim() ||
      String(record.reason ?? '').trim() ||
      String(record.effect_text ?? '').trim() ||
      'Clinical review note recorded for this check.'

    return {
      title,
      detail,
      severity: normalizeWarningSeverity(record.severity ?? fallbackSeverity),
    }
  }

  return {
    title: 'Clinical warning',
    detail: String(warning ?? 'Clinical review note recorded for this check.'),
    severity: normalizeWarningSeverity(fallbackSeverity),
  }
}

function EncounterDetailPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const { encounterId } = useParams({ from: '/_authenticated/encounters/$encounterId' }) as { encounterId: string }

  if (pathname !== `/encounters/${encounterId}`) {
    return <Outlet />
  }

  const { data: encounter, isLoading } = useQuery({
    queryKey: ['encounter', encounterId],
    queryFn: () => fetchEncounterById(encounterId),
  })

  const reviewCheckMutation = useMutation({
    mutationFn: (id: string) =>
      updateInteractionCheck(id, {
        reviewed_at: new Date().toISOString(),
        reviewed_by: profile?.id ?? null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encounter', encounterId] })
      queryClient.invalidateQueries({ queryKey: ['encounters'] })
      queryClient.invalidateQueries({ queryKey: ['overview-counts'] })
      queryClient.invalidateQueries({ queryKey: ['overview-stats'] })
      queryClient.invalidateQueries({ queryKey: ['patient', encounter?.patient_id] })
    },
  })
  const [reviewNote, setReviewNote] = useState('')

  useEffect(() => {
    setReviewNote(encounter?.supervisor_review_note || '')
  }, [encounter?.supervisor_review_note])

  const canReviewEncounter = canManageReferenceData(profile?.role)

  const reviewEncounterMutation = useMutation({
    mutationFn: () =>
      updateEncounter(encounterId, {
        supervisor_review_note: reviewNote.trim() || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: profile?.id ?? null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encounter', encounterId] })
      queryClient.invalidateQueries({ queryKey: ['encounters'] })
      queryClient.invalidateQueries({ queryKey: ['patient', encounter?.patient_id] })
    },
  })

  if (isLoading) {
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
          <div className="lg:col-span-8 space-y-6">
            <Skeleton className="h-32 rounded-3xl" />
            <Skeleton className="h-96 rounded-3xl" />
          </div>
          <div className="lg:col-span-4 space-y-6">
            <Skeleton className="h-64 rounded-3xl" />
          </div>
        </div>
      </div>
    )
  }

  if (!encounter) {
    return (
      <div className="space-y-6 animate-in-fade">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/encounters">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Queue
          </Link>
        </Button>
        <div className="p-16 text-center text-clinical-500 bg-white rounded-2xl border border-clinical-200 shadow-sm">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-safety-red opacity-40" />
          <h3 className="text-xl font-bold text-clinical-900">Encounter Record Not Found</h3>
          <p className="mt-2 text-sm text-clinical-500 max-w-xs mx-auto">The requested encounter audit trail could not be retrieved.</p>
        </div>
      </div>
    )
  }

  const narrative = parseEncounterNarrative(encounter.notes_text)
  const attentionState = getEncounterAttentionState(encounter.interaction_checks || [])
  const sidebarVitals = encounter.vitals && encounter.vitals.length > 0
    ? [
        { label: 'Temp', value: encounter.vitals[0].temperature_c, unit: '°C' },
        { label: 'Pulse', value: encounter.vitals[0].pulse_bpm, unit: 'BPM' },
        { label: 'BP Sys', value: encounter.vitals[0].blood_pressure_sys, unit: 'mmHg' },
        { label: 'BP Dia', value: encounter.vitals[0].blood_pressure_dia, unit: 'mmHg' },
        { label: 'SpO2', value: encounter.vitals[0].spo2, unit: '%' },
        { label: 'Resp', value: encounter.vitals[0].respiration_rate, unit: '/m' },
        { label: 'Weight', value: encounter.vitals[0].weight_kg, unit: 'kg' },
      ].filter((item) => item.value !== null)
    : narrative.vitals.map((item) => ({ label: item.label, value: item.value, unit: '' }))

  const totalChecks = encounter.interaction_checks?.length || 0
  const highSeverityCount = attentionState.highSeverityCount
  const warningCount = attentionState.warningCount
  const noteOnlyCount = attentionState.noteOnlyCount
  const needsManualAudit = attentionState.needsAttention
  const hasVitals = sidebarVitals.length > 0
  const hasEncounterReview = Boolean(encounter.reviewed_at || encounter.supervisor_review_note)
  const showSidebar = hasVitals || canReviewEncounter || hasEncounterReview
  const overallSeverity = highSeverityCount > 0 ? 'red' : warningCount > 0 || noteOnlyCount > 0 ? 'yellow' : 'green'
  const overallOutcomeLabel =
    narrative.safetyResult ||
    encounter.ai_summary ||
    (overallSeverity === 'red'
      ? 'Critical medication risk identified during field care.'
      : overallSeverity === 'yellow'
        ? 'Medication decision recorded with caution or follow-up note.'
        : 'No blocking medication safety issue recorded for this encounter.')
  const recordedActionLabel =
    encounter.interaction_checks?.find((check) => check.clinician_action)?.clinician_action || narrative.clinicianAction || null
  const flagReasons = [
    ...new Set(
      (encounter.interaction_checks || [])
        .flatMap((check) => getInteractionCheckFlagReasons(check))
    ),
  ]
  const summaryTiles = [
    { label: 'Medication checks', value: String(totalChecks) },
    { label: 'Flagged decisions', value: String(attentionState.flaggedCount) },
    { label: 'Voice transcript', value: narrative.voiceNoteTranscript ? '1' : '0' },
  ]

  return (
    <div className="space-y-6 pb-12 animate-in-fade">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5">
        <div className="flex items-start gap-4 min-w-0">
          <Button variant="ghost" size="sm" asChild className="mt-1 h-10 w-10 p-0 rounded-xl text-clinical-400 hover:text-clinical-900 bg-white shadow-sm border border-clinical-100 hover:border-clinical-200 active:scale-95 transition-all shrink-0">
            <Link to="/encounters">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400">Clinical Audit Trail</span>
              <div className="h-1 w-1 rounded-full bg-clinical-200" />
              <Badge variant={needsManualAudit ? 'warning' : 'success'} className="h-4 py-0 px-1.5 text-[8px] border-none uppercase tracking-widest font-black">
                {needsManualAudit ? 'Flagged Field Decision' : 'Procedural Clearance'}
              </Badge>
            </div>
            <h2 className="text-3xl font-black text-clinical-900 tracking-tight leading-none truncate">
              Review Session #{encounter.id.slice(0, 8)}
            </h2>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] font-bold text-clinical-500">
              <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 border border-clinical-100 shadow-sm">
                <div className="h-8 w-8 rounded-lg bg-clinical-50 flex items-center justify-center text-clinical-600 font-black shrink-0">
                  {encounter.patient?.full_name?.charAt(0) || 'P'}
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.15em] text-clinical-400">Patient</p>
                  <p className="text-sm font-black text-clinical-900 truncate">{encounter.patient?.full_name || 'Unknown Patient'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-clinical-400">
                <Clock className="h-3.5 w-3.5" />
                DOB: {formatDate(encounter.patient?.dob)}
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-clinical-400">
                <Activity className="h-3.5 w-3.5" />
                {encounter.patient?.sex || 'Unknown'}
              </div>
              <Button variant="outline" size="sm" asChild className="h-9 px-4 font-black text-[10px] uppercase tracking-widest border-clinical-200 bg-white shadow-sm hover:bg-clinical-50 active:scale-95 transition-all">
                <Link to="/patients/$patientId" params={{ patientId: encounter.patient_id }}>
                  <User className="h-3.5 w-3.5 mr-1.5" />
                  Patient Profile
                </Link>
              </Button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 pl-5 rounded-2xl border border-clinical-100 shadow-sm shrink-0">
          <div className="flex flex-col items-end">
            <p className="text-[9px] font-black text-clinical-400 uppercase tracking-widest leading-none mb-1">Session Recorded</p>
            <p className="text-sm font-bold text-clinical-900 tracking-tight">{formatDateTime(encounter.created_at)}</p>
          </div>
          <div className="h-8 w-px bg-clinical-50 mx-1" />
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-clinical-900 text-brand-400 shadow-lg animate-glint shrink-0">
            <Zap className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Decision Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in-slide-up" style={{ animationDelay: '0.1s' }}>
        <Card className={`lg:col-span-8 overflow-hidden border-2 shadow-sm ${overallSeverity === 'red' ? 'border-safety-red/30 bg-safety-red/[0.02]' : overallSeverity === 'yellow' ? 'border-safety-yellow/30 bg-safety-yellow/[0.02]' : 'border-clinical-200'}`}>
          <CardContent className="p-6 sm:p-7">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="space-y-4 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Badge variant={overallSeverity === 'red' ? 'danger' : overallSeverity === 'yellow' ? 'warning' : 'success'} className="h-6 px-2.5 text-[9px] border-none uppercase tracking-widest font-black">
                    {overallSeverity === 'red' ? 'Critical risk' : overallSeverity === 'yellow' ? 'Caution required' : 'No blocking issue'}
                  </Badge>
                  {recordedActionLabel ? (
                    <Badge variant="info" className="h-6 px-2.5 text-[9px] border-none uppercase tracking-widest font-black bg-clinical-100 text-clinical-700">
                      {formatClinicianAction(recordedActionLabel)}
                    </Badge>
                  ) : null}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400 mb-2">Encounter decision</p>
                  <p className="text-2xl font-black text-clinical-900 leading-tight tracking-tight max-w-3xl">{overallOutcomeLabel}</p>
                </div>
                {flagReasons.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-clinical-400">Flagged because</span>
                    {flagReasons.map((reason) => (
                      <Badge key={reason} variant="warning" className="h-6 px-2.5 text-[9px] border-none uppercase tracking-widest font-black">
                        {reason}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white border border-clinical-100 shadow-sm">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-clinical-400 mb-2">Medication under consideration</p>
                    <p className="text-sm font-bold text-clinical-900 leading-relaxed">
                      {narrative.medicationUnderConsideration || 'Not captured in the field encounter note'}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white border border-clinical-100 shadow-sm">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-clinical-400 mb-2">Field summary</p>
                    <p className="text-sm font-bold text-clinical-900 leading-relaxed">
                      {narrative.patientContext || narrative.clinicianNote || 'No additional field context recorded'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
          {summaryTiles.map((tile) => (
            <Card key={tile.label} className="border-clinical-200 shadow-sm overflow-hidden">
              <CardContent className="p-5">
                <p className="text-[10px] font-black text-clinical-400 uppercase tracking-[0.15em]">{tile.label}</p>
                <p className="text-2xl font-black text-clinical-900 tabular-nums leading-none mt-2">{tile.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Content Area: Session Details & Safety */}
        <div className={`${showSidebar ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-8 animate-in-slide-up`} style={{ animationDelay: '0.15s' }}>
          {/* Clinical Outcome & Safety Checks */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="space-y-1">
                <h3 className="flex items-center gap-2 text-xl font-black text-clinical-900 tracking-tight">
                  <ShieldCheck className="h-5 w-5 text-clinical-400" />
                  Safety Engine Audit Outcome
                </h3>
                <p className="text-[10px] font-black text-clinical-400 uppercase tracking-[0.15em]">
                  Real-time substance analysis results from the field device
                </p>
              </div>
            </div>

            <Card className="border-clinical-200 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {encounter.interaction_checks && encounter.interaction_checks.length > 0 ? (
                  <div className="divide-y divide-clinical-100">
                    {encounter.interaction_checks.map((check) => (
                      <div key={check.id} className="p-6 hover:bg-clinical-50/20 transition-colors">
                        <div className="space-y-6">
                          {/* Check Header */}
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                            <div className="flex items-start gap-5">
                              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 border-2 shadow-inner ${getSeverityBadgeColor(check.severity)}`}>
                                {check.severity === 'red' ? (
                                  <AlertCircle className="h-7 w-7 text-white" />
                                ) : check.severity === 'yellow' ? (
                                  <AlertTriangle className="h-7 w-7 text-white" />
                                ) : (
                                  <CheckCircle2 className="h-7 w-7 text-white" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2.5 mb-2">
                                  <span className={`text-[11px] font-black uppercase tracking-[0.15em] ${check.severity === 'red' ? 'text-safety-red' : check.severity === 'yellow' ? 'text-safety-yellow' : 'text-safety-green'}`}>
                                    {check.severity} Severity Alert
                                  </span>
                                  <Badge variant="info" className="py-0 px-2 h-5 text-[9px] font-black uppercase tracking-widest bg-clinical-100 text-clinical-600 border-none">
                                    {check.result_status.replace('_', ' ')}
                                  </Badge>
                                  {check.reviewed_at ? (
                                    <Badge variant="success" className="py-0 px-2 h-5 text-[9px] font-black uppercase tracking-widest border-none">
                                      Reviewed
                                    </Badge>
                                  ) : null}
                                </div>
                                <p className="text-xs font-bold text-clinical-400 uppercase tracking-widest flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5 opacity-50" />
                                  Trace Timestamp: {formatDateTime(check.created_at)}
                                </p>
                                {!check.reviewed_at && getInteractionCheckFlagReasons(check).length > 0 ? (
                                  <p className="mt-2 text-[10px] font-black uppercase tracking-[0.15em] text-safety-yellow">
                                    Flagged because: {getInteractionCheckFlagReasons(check).join(', ')}
                                  </p>
                                ) : null}
                                {check.reviewed_at ? (
                                  <p className="mt-2 text-[10px] font-black uppercase tracking-[0.15em] text-safety-green">
                                    Reviewed {formatDateTime(check.reviewed_at)}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row items-end sm:items-start gap-3">
                              {!check.reviewed_at && getInteractionCheckFlagReasons(check).length > 0 ? (
                                <Button
                                  size="sm"
                                  onClick={() => reviewCheckMutation.mutate(check.id)}
                                  disabled={reviewCheckMutation.isPending}
                                  className="h-9 px-4 font-black text-[10px] uppercase tracking-widest bg-clinical-900 text-white shadow-lg active:scale-95 transition-all shrink-0"
                                >
                                  Mark reviewed
                                </Button>
                              ) : null}
                            </div>
                          </div>

                          {/* Warnings / Rules Triggered */}
                          {Array.isArray(check.warnings_json) && check.warnings_json.length > 0 && (
                            <div className="space-y-3">
                              <p className="text-[9px] font-black text-clinical-400 uppercase tracking-[0.2em] px-1">Triggered Clinical Rules</p>
                              <div className="space-y-2">
                                {check.warnings_json.map((warning: any, idx: number) => {
                                  const formattedWarning = formatInteractionWarning(warning, check.severity)
                                  const severityTone =
                                    formattedWarning.severity === 'red'
                                      ? 'bg-safety-red'
                                      : formattedWarning.severity === 'yellow'
                                        ? 'bg-safety-yellow'
                                        : 'bg-safety-green'

                                  return (
                                    <div key={idx} className="flex items-start gap-4 p-5 rounded-2xl bg-clinical-50/50 border border-clinical-100/60 shadow-inner group/warn hover:bg-white hover:border-clinical-200 transition-all">
                                      <div className={`h-2 w-2 rounded-full mt-2 shrink-0 ${severityTone}`} />
                                      <div className="space-y-1.5 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-clinical-900">
                                            {formattedWarning.title}
                                          </p>
                                          <Badge
                                            variant={
                                              formattedWarning.severity === 'red'
                                                ? 'danger'
                                                : formattedWarning.severity === 'yellow'
                                                  ? 'warning'
                                                  : 'success'
                                            }
                                            className="h-5 px-2 text-[8px] border-none uppercase tracking-widest font-black"
                                          >
                                            {formattedWarning.severity === 'red'
                                              ? 'Critical'
                                              : formattedWarning.severity === 'yellow'
                                                ? 'Caution'
                                                : 'Info'}
                                          </Badge>
                                        </div>
                                        <p className="text-sm font-bold text-clinical-700 leading-relaxed tracking-tight">
                                          {formattedWarning.detail}
                                        </p>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Clinician's Field Audit Section */}
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-5 border-t border-clinical-50">
                            <div className="md:col-span-4 space-y-3">
                              <p className="text-[9px] font-black text-clinical-400 uppercase tracking-[0.2em]">Clinician Decision</p>
                              {check.clinician_action ? (
                                <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-clinical-900 text-white w-full shadow-lg shadow-clinical-900/10 border border-clinical-800">
                                  <CheckCircle2 className="h-4 w-4 text-brand-400 shrink-0" />
                                  <span className="text-[10px] font-black uppercase tracking-[0.1em] truncate">{formatClinicianAction(check.clinician_action)}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-clinical-50 text-clinical-300 w-full border border-clinical-100 border-dashed">
                                  <Activity className="h-4 w-4 shrink-0" />
                                  <span className="text-[10px] font-black uppercase tracking-[0.15em]">Action Deferred</span>
                                </div>
                              )}
                            </div>
                            <div className="md:col-span-8 space-y-3">
                              <p className="text-[9px] font-black text-clinical-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <MessageSquare className="h-3.5 w-3.5" />
                                Field Rationale Narrative
                              </p>
                              <div className="p-4 rounded-2xl bg-white border-2 border-clinical-50 min-h-[88px] shadow-sm italic text-[13px] font-bold text-clinical-700 leading-relaxed transition-all hover:border-clinical-200">
                                {check.clinician_note ? `"${check.clinician_note}"` : "The clinician did not record a specific rationale for this safety alert response."}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-24 bg-clinical-50/10">
                    <div className="h-16 w-16 rounded-2xl bg-white flex items-center justify-center mx-auto mb-6 shadow-sm border border-clinical-100">
                      <CheckCircle2 className="h-8 w-8 text-clinical-200" />
                    </div>
                    <p className="text-sm font-black text-clinical-900 uppercase tracking-widest">No Alerts Detected</p>
                    <p className="text-[11px] text-clinical-500 mt-2 max-w-[300px] mx-auto leading-relaxed">
                      All substance checks passed automated clinical safety validation during this session.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Session Narrative Card */}
          <Card className="border-clinical-200 shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="py-5 px-8 border-b border-clinical-100 bg-clinical-50/20">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-500 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Field Encounter Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-4">
                {(narrative.patientContext || narrative.clinicianAction || narrative.clinicianNote) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {narrative.patientContext ? (
                      <div className="p-5 rounded-2xl border border-clinical-100 bg-clinical-50/30">
                        <p className="text-[9px] font-black text-clinical-400 uppercase tracking-[0.2em] mb-2">Patient Context</p>
                        <p className="text-sm font-bold text-clinical-900 leading-relaxed">{narrative.patientContext}</p>
                      </div>
                    ) : null}
                    {(narrative.clinicianAction || narrative.clinicianNote) ? (
                      <div className="p-5 rounded-2xl border border-clinical-100 bg-clinical-50/30">
                        <p className="text-[9px] font-black text-clinical-400 uppercase tracking-[0.2em] mb-2">Clinician Capture</p>
                        <p className="text-sm font-bold text-clinical-900 leading-relaxed whitespace-pre-line">
                          {narrative.clinicianAction ? `${narrative.clinicianAction}\n` : ''}
                          {narrative.clinicianNote || 'No additional note recorded'}
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}

                {narrative.safetyReasoning.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[9px] font-black text-clinical-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <ClipboardList className="h-3.5 w-3.5" />
                      Safety Reasoning
                    </p>
                    <div className="space-y-2">
                      {narrative.safetyReasoning.map((item, index) => (
                        <div key={index} className="p-4 rounded-2xl bg-clinical-50/30 border border-clinical-100 text-sm font-bold text-clinical-800 leading-relaxed">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {narrative.voiceNoteTranscript && (
                <div className="p-5 rounded-2xl border border-clinical-100 bg-brand-50/30">
                  <p className="text-[9px] font-black text-clinical-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                    <Mic className="h-3.5 w-3.5 text-brand-600" />
                    Voice Note Transcript
                  </p>
                  <p className="text-sm font-bold text-clinical-900 leading-relaxed">{narrative.voiceNoteTranscript}</p>
                </div>
              )}

                {!narrative.patientContext &&
              !narrative.safetyResult &&
              !narrative.clinicianAction &&
              !narrative.clinicianNote &&
              !narrative.voiceNoteTranscript &&
              !encounter.notes_text ? (
                  <div className="p-6 rounded-2xl bg-clinical-50/30 text-clinical-900 text-lg font-black leading-relaxed border-2 border-clinical-50 min-h-[160px] shadow-inner transition-all hover:bg-white hover:border-clinical-200">
                    No clinical session summary was recorded in the field.
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar: Contextual Audit Data */}
        {showSidebar ? (
        <div className="lg:col-span-4 space-y-6 animate-in-slide-up" style={{ animationDelay: '0.2s' }}>
          {(canReviewEncounter || hasEncounterReview) ? (
          <Card className="rounded-3xl border-clinical-200 shadow-sm overflow-hidden">
            <CardHeader className="py-4 px-6 border-b border-clinical-50 bg-white">
              <CardTitle className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-clinical-500">
                <MessageSquare className="h-4 w-4" />
                Supervisor Review
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {encounter.reviewed_at ? (
                <div className="rounded-2xl bg-clinical-50/40 border border-clinical-100 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-clinical-400">Last reviewed</p>
                  <p className="mt-1 text-sm font-bold text-clinical-900">{formatDateTime(encounter.reviewed_at)}</p>
                </div>
              ) : null}
              {canReviewEncounter ? (
                <>
                  <TextArea
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                    rows={5}
                    placeholder="Add a supervisor review note for this encounter audit trail..."
                    className="font-bold border-2 border-clinical-100 focus:border-brand-400"
                  />
                  {reviewEncounterMutation.error ? (
                    <p className="text-xs font-bold text-safety-red leading-relaxed">
                      {getUserFriendlyErrorMessage(reviewEncounterMutation.error, 'Failed to save supervisor review note.')}
                    </p>
                  ) : null}
                  <Button
                    onClick={() => reviewEncounterMutation.mutate()}
                    disabled={reviewEncounterMutation.isPending}
                    className="w-full h-11 font-black text-[10px] uppercase tracking-widest"
                  >
                    {reviewEncounterMutation.isPending ? 'Saving review...' : 'Save review note'}
                  </Button>
                </>
              ) : encounter.supervisor_review_note ? (
                <div className="rounded-2xl bg-clinical-50/40 border border-clinical-100 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-clinical-400">Review note</p>
                  <p className="mt-2 text-sm font-bold text-clinical-900 leading-relaxed whitespace-pre-line">
                    {encounter.supervisor_review_note}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl bg-clinical-50/40 border border-clinical-100 p-4">
                  <p className="text-sm font-bold text-clinical-700 leading-relaxed">No supervisor review note has been recorded for this encounter.</p>
                </div>
              )}
            </CardContent>
          </Card>
          ) : null}
          
          {/* Vitals Trace Card */}
          {hasVitals ? (
          <Card className="rounded-3xl border-clinical-200 shadow-sm overflow-hidden">
            <CardHeader className="py-4 px-6 border-b border-clinical-50 bg-white">
              <CardTitle className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-clinical-500">
                <Activity className="h-4 w-4" />
                Physiological Trace
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4">
                {sidebarVitals.map((v, i) => (
                  <div key={i} className="p-4 rounded-xl bg-clinical-50/50 border border-clinical-100 shadow-inner group transition-all hover:bg-white hover:border-clinical-200">
                    <p className="text-[9px] font-black text-clinical-400 uppercase tracking-tighter mb-1">{v.label}</p>
                    <p className="text-xl font-black text-clinical-900 leading-none tabular-nums tracking-tighter group-hover:text-clinical-600 transition-colors">
                      {v.value}
                      {v.unit ? <span className="text-[9px] ml-1 font-black text-clinical-300 uppercase">{v.unit}</span> : null}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          ) : null}
        </div>
        ) : null}
      </div>
    </div>
  )
}
