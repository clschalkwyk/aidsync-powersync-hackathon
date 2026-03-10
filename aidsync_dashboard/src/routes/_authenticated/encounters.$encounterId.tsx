import { createFileRoute, useParams, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { 
  ArrowLeft, 
  Activity, 
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ClipboardCheck,
  Paperclip,
  ShieldCheck,
  Stethoscope,
  Scan,
  MessageSquare,
  ChevronRight,
  Zap,
  FileText
} from 'lucide-react'
import { fetchEncounterById } from '@/data/queries'
import { formatDate, formatDateTime, getSeverityBadgeColor } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/encounters/$encounterId')({
  component: EncounterDetailPage,
})

function EncounterDetailPage() {
  const { encounterId } = useParams({ from: '/_authenticated/encounters/$encounterId' }) as { encounterId: string }
  const { data: encounter, isLoading } = useQuery({
    queryKey: ['encounter', encounterId],
    queryFn: () => fetchEncounterById(encounterId),
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

  // Calculate high-level summary
  const totalChecks = encounter.interaction_checks?.length || 0
  const highSeverityCount = encounter.interaction_checks?.filter(c => c.severity === 'red').length || 0
  const manualReviewsCount = encounter.interaction_checks?.filter(c => c.result_status === 'manual_review_required').length || 0
  const needsManualAudit = manualReviewsCount > 0 || highSeverityCount > 0

  return (
    <div className="space-y-6 pb-12 animate-in-fade">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="flex items-start gap-4">
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
                {needsManualAudit ? 'Manual Review Flagged' : 'Procedural Clearance'}
              </Badge>
            </div>
            <h2 className="text-3xl font-black text-clinical-900 tracking-tight leading-none truncate">
              Review Session #{encounter.id.slice(0, 8)}
            </h2>
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

      {/* Audit Outcome Summary Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in-slide-up" style={{ animationDelay: '0.1s' }}>
        <Card className="border-clinical-200 shadow-sm overflow-hidden group hover:border-clinical-300 transition-all">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-clinical-50 flex items-center justify-center shrink-0 border border-clinical-100 group-hover:bg-white transition-all">
              <ClipboardCheck className="h-6 w-6 text-clinical-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-clinical-400 uppercase tracking-[0.15em]">Procedural Checks</p>
              <p className="text-2xl font-black text-clinical-900 tabular-nums leading-none mt-1">{totalChecks}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={`shadow-sm overflow-hidden group transition-all ${highSeverityCount > 0 ? 'border-safety-red/30 bg-safety-red/[0.01] hover:border-safety-red/50' : 'border-clinical-200 hover:border-clinical-300'}`}>
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border transition-all ${highSeverityCount > 0 ? 'bg-safety-red/10 border-safety-red/20 text-safety-red group-hover:bg-safety-red group-hover:text-white' : 'bg-clinical-50 border-clinical-100 text-clinical-300 group-hover:bg-white'}`}>
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-clinical-400 uppercase tracking-[0.15em]">High Severity Alerts</p>
              <p className={`text-2xl font-black tabular-nums leading-none mt-1 ${highSeverityCount > 0 ? 'text-safety-red' : 'text-clinical-900'}`}>{highSeverityCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={`shadow-sm overflow-hidden group transition-all ${manualReviewsCount > 0 ? 'border-safety-yellow/30 bg-safety-yellow/[0.01] hover:border-safety-yellow/50' : 'border-clinical-200 hover:border-clinical-300'}`}>
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border transition-all ${manualReviewsCount > 0 ? 'bg-safety-yellow/10 border-safety-yellow/20 text-safety-yellow group-hover:bg-safety-yellow group-hover:text-white' : 'bg-clinical-50 border-clinical-100 text-clinical-300 group-hover:bg-white'}`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-clinical-400 uppercase tracking-[0.15em]">Manual Reviews</p>
              <p className={`text-2xl font-black tabular-nums leading-none mt-1 ${manualReviewsCount > 0 ? 'text-safety-yellow' : 'text-clinical-900'}`}>{manualReviewsCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Content Area: Session Details & Safety */}
        <div className="lg:col-span-8 space-y-8 animate-in-slide-up" style={{ animationDelay: '0.15s' }}>
          
          {/* Patient Context Card */}
          <Card className="border-clinical-200 shadow-sm overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-5 min-w-0">
                  <div className="h-16 w-16 rounded-2xl bg-clinical-50 flex items-center justify-center text-clinical-600 font-black text-2xl shrink-0 border border-clinical-100 group-hover:border-clinical-300 group-hover:bg-white transition-all duration-500">
                    {encounter.patient?.full_name?.charAt(0) || 'P'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-2xl font-black text-clinical-900 tracking-tight leading-none mb-2">
                      {encounter.patient?.full_name || 'Unknown Patient'}
                    </h3>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] font-black text-clinical-400 uppercase tracking-[0.15em]">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        DOB: {formatDate(encounter.patient?.dob)}
                      </span>
                      <span className="flex items-center gap-1.5 capitalize">
                        <Activity className="h-3.5 w-3.5" />
                        {encounter.patient?.sex || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild className="h-10 px-5 font-black text-[10px] uppercase tracking-widest border-clinical-200 bg-white shadow-sm hover:bg-clinical-50 active:scale-95 transition-all shrink-0">
                  <Link to="/patients/$patientId" params={{ patientId: encounter.patient_id }}>
                    Patient Profile
                    <ChevronRight className="h-3.5 w-3.5 ml-1.5" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

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
                      <div key={check.id} className="p-8 hover:bg-clinical-50/20 transition-colors">
                        <div className="space-y-8">
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
                                </div>
                                <p className="text-xs font-bold text-clinical-400 uppercase tracking-widest flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5 opacity-50" />
                                  Trace Timestamp: {formatDateTime(check.created_at)}
                                </p>
                              </div>
                            </div>
                            
                            {check.scanned_insert_id && (
                              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-50 border-2 border-brand-100 self-start sm:self-auto shadow-sm">
                                <Scan className="h-4 w-4 text-brand-600" />
                                <span className="text-[10px] font-black text-brand-700 uppercase tracking-[0.1em]">Evidence via Lens</span>
                              </div>
                            )}
                          </div>

                          {/* Warnings / Rules Triggered */}
                          {Array.isArray(check.warnings_json) && check.warnings_json.length > 0 && (
                            <div className="space-y-3">
                              <p className="text-[9px] font-black text-clinical-400 uppercase tracking-[0.2em] px-1">Triggered Clinical Rules</p>
                              <div className="space-y-2">
                                {check.warnings_json.map((warning: any, idx: number) => (
                                  <div key={idx} className="flex items-start gap-4 p-5 rounded-2xl bg-clinical-50/50 border border-clinical-100/60 shadow-inner group/warn hover:bg-white hover:border-clinical-200 transition-all">
                                    <div className={`h-2 w-2 rounded-full mt-2 shrink-0 ${check.severity === 'red' ? 'bg-safety-red' : 'bg-safety-yellow'}`} />
                                    <p className="text-sm font-bold text-clinical-900 leading-relaxed tracking-tight">
                                      {typeof warning === 'string' ? warning : JSON.stringify(warning)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Clinician's Field Audit Section */}
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-6 border-t border-clinical-50">
                            <div className="md:col-span-4 space-y-3">
                              <p className="text-[9px] font-black text-clinical-400 uppercase tracking-[0.2em]">Clinician Decision</p>
                              {check.clinician_action ? (
                                <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-clinical-900 text-white w-full shadow-lg shadow-clinical-900/10 border border-clinical-800">
                                  <CheckCircle2 className="h-4 w-4 text-brand-400 shrink-0" />
                                  <span className="text-[10px] font-black uppercase tracking-[0.1em] truncate">{check.clinician_action}</span>
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
                              <div className="p-5 rounded-2xl bg-white border-2 border-clinical-50 min-h-[100px] shadow-sm italic text-[13px] font-bold text-clinical-700 leading-relaxed transition-all hover:border-clinical-200">
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
                Session Audit Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="p-6 rounded-2xl bg-clinical-50/30 text-clinical-900 text-lg font-black leading-relaxed border-2 border-clinical-50 min-h-[160px] shadow-inner transition-all hover:bg-white hover:border-clinical-200">
                {encounter.notes_text || 'No clinical session summary was recorded in the field.'}
              </div>
              
              {encounter.ai_summary && (
                <div className="p-6 rounded-2xl bg-clinical-900 text-white text-sm font-black border border-clinical-800 shadow-xl leading-relaxed flex gap-5 animate-glint">
                  <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10 shadow-inner">
                    <ShieldCheck className="h-6 w-6 text-brand-400" />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-clinical-400">Intelligence Core Summary</p>
                    <p className="text-base tracking-tight">{encounter.ai_summary}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar: Contextual Audit Data */}
        <div className="lg:col-span-4 space-y-6 animate-in-slide-up" style={{ animationDelay: '0.2s' }}>
          
          {/* Vitals Trace Card */}
          <Card className="rounded-3xl border-clinical-200 shadow-sm overflow-hidden">
            <CardHeader className="py-4 px-6 border-b border-clinical-50 bg-white">
              <CardTitle className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-clinical-500">
                <Activity className="h-4 w-4" />
                Physiological Trace
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {encounter.vitals && encounter.vitals.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Temp', value: encounter.vitals[0].temperature_c, unit: '°C' },
                    { label: 'Pulse', value: encounter.vitals[0].pulse_bpm, unit: 'BPM' },
                    { label: 'BP Sys', value: encounter.vitals[0].blood_pressure_sys, unit: 'mmHg' },
                    { label: 'BP Dia', value: encounter.vitals[0].blood_pressure_dia, unit: 'mmHg' },
                    { label: 'SpO2', value: encounter.vitals[0].spo2, unit: '%' },
                    { label: 'Resp', value: encounter.vitals[0].respiration_rate, unit: '/m' },
                  ].filter(v => v.value !== null).map((v, i) => (
                    <div key={i} className="p-4 rounded-xl bg-clinical-50/50 border border-clinical-100 shadow-inner group transition-all hover:bg-white hover:border-clinical-200">
                      <p className="text-[9px] font-black text-clinical-400 uppercase tracking-tighter mb-1">{v.label}</p>
                      <p className="text-xl font-black text-clinical-900 leading-none tabular-nums tracking-tighter group-hover:text-clinical-600 transition-colors">
                        {v.value}
                        <span className="text-[9px] ml-1 font-black text-clinical-300 uppercase">{v.unit}</span>
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-clinical-50/20 rounded-2xl border border-dashed border-clinical-100">
                  <p className="text-[9px] font-black text-clinical-300 uppercase tracking-widest italic">Vitals Not Logged</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Evidence Scans Card */}
          <Card className="rounded-3xl border-clinical-200 shadow-sm overflow-hidden">
            <CardHeader className="py-4 px-6 border-b border-clinical-50 bg-white">
              <CardTitle className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-clinical-500">
                <Scan className="h-4 w-4" />
                Field Evidence Trace
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="space-y-1">
                {encounter.scanned_inserts?.map((scan) => (
                  <div key={scan.id} className="p-4 rounded-2xl bg-white border border-transparent hover:border-brand-200 hover:bg-brand-50/30 transition-all group cursor-pointer active:scale-[0.98]">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-clinical-50 flex items-center justify-center text-clinical-400 shrink-0 group-hover:bg-brand-500 group-hover:text-white transition-all shadow-inner border border-clinical-100 group-hover:border-brand-600">
                        <Scan className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black text-clinical-900 uppercase tracking-widest truncate">Medication Reference Leaflet</p>
                        <p className="text-[9px] font-bold text-clinical-400 mt-0.5 uppercase tracking-tighter">Certainty: {(scan.extraction_confidence || 0) * 100}%</p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-clinical-200 group-hover:text-brand-600" />
                    </div>
                  </div>
                ))}
                
                {encounter.attachments?.map((file) => (
                  <div key={file.id} className="p-4 rounded-2xl bg-white border border-transparent hover:border-clinical-200 hover:bg-clinical-50/50 transition-all group cursor-pointer active:scale-[0.98]">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-clinical-50 flex items-center justify-center text-clinical-400 shrink-0 border border-clinical-100 shadow-inner group-hover:border-clinical-300">
                        <Paperclip className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black text-clinical-700 uppercase tracking-widest truncate">{file.storage_path.split('/').pop()}</p>
                        <p className="text-[9px] font-bold text-clinical-400 mt-0.5 uppercase tracking-widest italic">Binary Attachment</p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-clinical-200 group-hover:text-clinical-600" />
                    </div>
                  </div>
                ))}

                {(!encounter.scanned_inserts?.length && !encounter.attachments?.length) && (
                  <div className="text-center py-10 px-6">
                    <p className="text-[10px] font-black text-clinical-300 uppercase tracking-widest italic leading-relaxed">No associated evidence files detected from source device.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Audit Integrity Sidebar Card */}
          <Card className="bg-clinical-900 border-none shadow-xl overflow-hidden relative rounded-3xl group animate-glint">
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none group-hover:scale-125 transition-transform duration-1000">
              <ShieldCheck size={120} />
            </div>
            <CardHeader className="py-4 border-white/5 bg-white/5">
              <CardTitle className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-clinical-300 relative z-10">
                <ShieldCheck className="h-3.5 w-3.5 text-brand-400" />
                System Integrity Trace
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6 relative z-10">
              <div className="space-y-4">
                <div className="flex justify-between items-center group/item">
                  <span className="text-[9px] font-black text-clinical-500 uppercase tracking-widest">Field Source</span>
                  <span className="text-[11px] font-black text-white flex items-center gap-2 tracking-tight">
                    <div className="h-5 w-5 rounded bg-white/10 flex items-center justify-center">
                      <Stethoscope className="h-3 w-3 text-brand-400" />
                    </div>
                    Clinician #42-S
                  </span>
                </div>
                <div className="flex justify-between items-center group/item">
                  <span className="text-[9px] font-black text-clinical-500 uppercase tracking-widest">Sync Layer</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-safety-green animate-pulse" />
                    <span className="text-[9px] font-black text-white bg-white/10 px-2 py-1 rounded-lg border border-white/10 tracking-widest">POWERSYNC_V1</span>
                  </div>
                </div>
              </div>
              <div className="pt-6 border-t border-white/10">
                <Button variant="outline" className="w-full h-10 border-white/10 bg-white/5 text-white hover:bg-white hover:text-clinical-900 font-black text-[9px] uppercase tracking-widest transition-all">
                  Generate Formal Audit PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
