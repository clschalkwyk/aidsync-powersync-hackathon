import { createFileRoute, useParams, Link, Outlet, useRouterState } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Activity,
  AlertTriangle,
  Stethoscope,
  ChevronRight,
  ClipboardList,
  Heart,
  Droplets,
  User as UserIcon,
  ShieldAlert,
  Clock,
  Edit
} from 'lucide-react'
import { fetchPatientById } from '@/data/queries'
import { formatDate, parseEncounterNarrative, truncateText } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/patients/$patientId')({
  component: MedicationPatientDetailPage,
})

function MedicationPatientDetailPage() {
  const { patientId } = useParams({ from: '/_authenticated/patients/$patientId' }) as { patientId: string }
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => fetchPatientById(patientId),
  })

  if (pathname !== `/patients/${patientId}`) {
    return <Outlet />
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in-fade">
        <Button variant="ghost" size="sm" asChild className="h-10 w-10 p-0 rounded-full">
          <Link to="/patients">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <Skeleton className="h-40 rounded-3xl" />
            <Skeleton className="h-96 rounded-3xl" />
          </div>
          <div className="lg:col-span-4 space-y-6">
            <Skeleton className="h-64 rounded-3xl" />
          </div>
        </div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="space-y-6 animate-in-fade">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/patients">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
        <div className="p-12 text-center text-clinical-500 bg-white rounded-3xl border border-clinical-200">
          <UserIcon className="h-10 w-10 mx-auto mb-4 text-clinical-300 opacity-50" />
          <p className="text-lg font-bold text-clinical-900">Patient Profile Not Found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12 animate-in-fade">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="h-10 w-10 p-0 rounded-full text-clinical-400 hover:text-clinical-900 bg-white shadow-sm border border-clinical-100 active:scale-95 transition-all">
            <Link to="/patients">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 text-clinical-400">
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Patient Records</span>
              <div className="h-1 w-1 rounded-full bg-clinical-200" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Clinical Profile</span>
            </div>
            <h2 className="text-2xl font-black text-clinical-900 tracking-tight leading-none mt-1">{patient.full_name}</h2>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Button variant="outline" size="md" asChild className="h-11 px-5 font-black uppercase tracking-widest text-[10px] rounded-xl border-clinical-200">
            <Link to="/patients/$patientId/edit" params={{ patientId }}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Patient
            </Link>
          </Button>
          <div className="flex items-center gap-3 bg-white p-1.5 pl-4 rounded-2xl border border-clinical-100 shadow-sm">
            <div className="flex flex-col items-end">
              <p className="text-[9px] font-black text-clinical-400 uppercase tracking-widest leading-none mb-1">External System ID</p>
              <p className="text-xs font-bold text-clinical-900 font-mono tracking-tighter">{patient.external_id || 'NOT ASSIGNED'}</p>
            </div>
            <div className="h-8 w-px bg-clinical-50 mx-1" />
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-clinical-900 text-brand-400 shadow-lg animate-glint shrink-0">
              <UserIcon className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Patient Profile Header */}
      <div className="flex items-start gap-6 sm:gap-10 bg-white p-8 sm:p-10 rounded-[2.5rem] border border-clinical-200/60 shadow-sm relative overflow-hidden group animate-in-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none group-hover:scale-110 transition-transform duration-700">
          <UserIcon size={160} />
        </div>
        <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-[2rem] bg-clinical-100 flex items-center justify-center text-clinical-600 font-black text-4xl shrink-0 shadow-inner group-hover:rotate-2 transition-transform">
          {patient.full_name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0 relative z-10">
          <h1 className="text-3xl sm:text-5xl font-black text-clinical-900 tracking-tight truncate leading-none">
            {patient.full_name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mt-6 text-clinical-500 font-black uppercase tracking-widest text-[11px]">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-clinical-300" />
              Born: {formatDate(patient.dob)}
            </span>
            <span className="flex items-center gap-2 capitalize">
              <Activity className="h-4 w-4 text-clinical-300" />
              Sex: {patient.sex || 'Unknown'}
            </span>
            {patient.location_text && (
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-clinical-300" />
                Region: {patient.location_text}
              </span>
            )}
          </div>
          {patient.pregnancy_status && (
            <div className="mt-6 flex items-center gap-2.5 px-4 py-2 bg-clinical-900 text-white rounded-xl w-fit text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-clinical-900/20">
              <Droplets className="h-4 w-4 text-brand-400 animate-clinical-pulse" />
              Pregnancy: {patient.pregnancy_status}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Clinical Summary */}
        <div className="lg:col-span-8 space-y-6 animate-in-slide-up" style={{ animationDelay: '0.15s' }}>
          
          {/* Allergies Card - High Priority */}
          <Card className="border-safety-red/20 shadow-lg rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <ShieldAlert size={80} className="text-safety-red" />
            </div>
            <CardHeader className="bg-safety-red/[0.03] py-5 px-8 border-b border-safety-red/10">
              <CardTitle className="flex items-center gap-2.5 text-lg font-black tracking-tight text-safety-red uppercase">
                <AlertTriangle className="h-5 w-5" />
                Critical Allergies & Hypersensitivity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 sm:p-8">
              {patient.allergies && patient.allergies.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {patient.allergies.map((allergy) => (
                    <div key={allergy.id} className="p-5 rounded-2xl bg-white border border-clinical-100 shadow-sm flex flex-col justify-between gap-4 group hover:border-safety-red/30 transition-all">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-clinical-400 uppercase tracking-widest mb-1">{allergy.allergen_type || 'Unknown Type'}</p>
                          <p className="font-black text-clinical-900 text-lg tracking-tight group-hover:text-safety-red transition-colors">{allergy.allergen_name}</p>
                        </div>
                        <Badge variant={allergy.severity === 'severe' || allergy.severity === 'high' ? 'danger' : 'warning'} className="uppercase text-[9px] h-6 px-2">
                          {allergy.severity || 'unknown'}
                        </Badge>
                      </div>
                      {allergy.notes && (
                        <p className="text-xs text-clinical-500 font-medium leading-relaxed bg-clinical-50/50 p-3 rounded-xl italic">
                          "{allergy.notes}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-clinical-50/30 rounded-[2rem] border-2 border-dashed border-clinical-100">
                  <ShieldAlert className="h-12 w-12 mx-auto mb-4 text-clinical-200" />
                  <p className="text-sm font-black text-clinical-400 uppercase tracking-[0.15em]">No known allergies recorded</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Conditions Card */}
            <Card className="rounded-3xl border-clinical-200 shadow-md">
              <CardHeader className="py-4 px-6 border-b border-clinical-50 bg-clinical-50/10">
                <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-clinical-500">
                  <Heart className="h-4 w-4 text-brand-500" />
                  Clinical Conditions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {patient.conditions && patient.conditions.length > 0 ? (
                  <div className="divide-y divide-clinical-50">
                    {patient.conditions.map((condition) => (
                      <div key={condition.id} className="p-5 hover:bg-clinical-50/30 transition-colors">
                        <p className="font-black text-clinical-900 text-sm tracking-tight">{condition.condition_name}</p>
                        {condition.notes && <p className="text-xs text-clinical-500 font-medium mt-1 line-clamp-2 leading-relaxed italic">"{condition.notes}"</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-[10px] font-black text-clinical-300 uppercase tracking-widest italic">No chronic conditions listed</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Current Medications Card */}
            <Card className="rounded-3xl border-clinical-200 shadow-md">
              <CardHeader className="py-4 px-6 border-b border-clinical-50 bg-clinical-50/10">
                <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-clinical-500">
                  <ClipboardList className="h-4 w-4 text-clinical-600" />
                  Active Treatments
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {patient.current_medications && patient.current_medications.length > 0 ? (
                  <div className="divide-y divide-clinical-50">
                    {patient.current_medications.map((med) => (
                      <div key={med.id} className="p-5 flex items-center justify-between group hover:bg-clinical-50/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-clinical-50 flex items-center justify-center text-clinical-600 shrink-0 shadow-inner group-hover:bg-white transition-colors">
                            <Droplets className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-black text-clinical-900 text-sm tracking-tight leading-none">{med.med_name}</p>
                            <div className="flex gap-2 mt-1.5 text-[9px] font-black text-clinical-400 uppercase tracking-widest">
                              <span>{med.dose_text || 'Dose N/A'}</span>
                              <span className="opacity-30">•</span>
                              <span>{med.route_text || 'Route N/A'}</span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-clinical-200 group-hover:text-clinical-400 transition-colors" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-[10px] font-black text-clinical-300 uppercase tracking-widest italic">No current treatments recorded</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>

        {/* Right Column: Encounters Timeline */}
        <div className="lg:col-span-4 space-y-6 animate-in-slide-up" style={{ animationDelay: '0.2s' }}>
          <Card className="flex flex-col h-full rounded-3xl border-clinical-200 shadow-md overflow-hidden">
            <CardHeader className="py-5 px-8 border-b border-clinical-50 bg-white rounded-t-3xl">
              <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-clinical-900">
                <Clock className="h-4 w-4 text-clinical-400" />
                Encounter Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-auto max-h-[800px] custom-scrollbar">
              {patient.encounters && patient.encounters.length > 0 ? (
                <div className="divide-y divide-clinical-50">
                  {patient.encounters.map((encounter) => (
                    <PatientEncounterTimelineItem key={encounter.id} encounter={encounter} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-24 bg-clinical-50/10 rounded-3xl m-6 border border-dashed border-clinical-200">
                  <Stethoscope className="h-12 w-12 mx-auto mb-4 text-clinical-100" />
                  <p className="text-xs font-black text-clinical-400 uppercase tracking-widest italic px-10 leading-relaxed">No past clinical encounters have been recorded for this patient.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function PatientEncounterTimelineItem({ encounter }: { encounter: any }) {
  const narrative = parseEncounterNarrative(encounter.notes_text)
  const summary =
    narrative.safetyResult ||
    narrative.patientContext ||
    encounter.ai_summary ||
    truncateText(encounter.notes_text, 120)

  return (
    <Link
      to="/encounters/$encounterId"
      params={{ encounterId: encounter.id }}
      className="flex items-center justify-between p-6 hover:bg-clinical-50 transition-all group cursor-pointer active:scale-[0.98]"
    >
      <div className="flex items-start gap-5">
        <div className="mt-1 h-3 w-3 rounded-full bg-clinical-200 group-hover:scale-125 group-hover:bg-clinical-600 transition-all shrink-0 shadow-sm border-2 border-white outline outline-1 outline-clinical-50" />
        <div className="min-w-0">
          <p className="font-black text-clinical-900 text-lg tracking-tight leading-none group-hover:text-clinical-600 transition-colors">
            {formatDate(encounter.created_at)}
          </p>
          <p className="text-[10px] font-black text-clinical-400 uppercase tracking-[0.15em] mt-2 leading-none">
            {encounter.encounter_type?.replace('_', ' ') || 'Routine Session'}
          </p>
          {summary ? (
            <p className="mt-3 text-xs font-bold text-clinical-600 leading-relaxed line-clamp-2 max-w-[220px]">
              {summary}
            </p>
          ) : null}
          <Badge variant={encounter.status === 'completed' || encounter.status === 'synced' ? 'success' : 'warning'} className="mt-3 text-[8px] px-1.5 border-none h-5">
            {encounter.status.toUpperCase()}
          </Badge>
        </div>
      </div>
      <div className="h-10 w-10 rounded-full bg-white shadow-sm border border-clinical-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 shrink-0">
        <ChevronRight className="h-5 w-5 text-clinical-600" />
      </div>
    </Link>
  )
}
