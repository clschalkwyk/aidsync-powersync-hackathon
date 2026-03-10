import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { 
  Users, 
  Pill, 
  Stethoscope, 
  Activity, 
  ShieldCheck, 
  Database,
  ArrowRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Zap,
  ClipboardCheck
} from 'lucide-react'
import { fetchOverviewCounts, fetchOverviewStats } from '@/data/queries'
import { formatDateTime } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/overview')({
  component: OverviewPage,
})

function OverviewPage() {
  const { data: counts, isLoading: isCountsLoading } = useQuery({
    queryKey: ['overview-counts'],
    queryFn: fetchOverviewCounts,
  })

  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['overview-stats'],
    queryFn: fetchOverviewStats,
  })

  const currentTime = new Intl.DateTimeFormat('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date())

  const stats_items = [
    { 
      name: 'Medication Reference', 
      value: counts?.medications || 0, 
      icon: Pill, 
      color: 'text-clinical-600', 
      bg: 'bg-clinical-100',
      href: '/medications',
      description: 'Source data for field care'
    },
    { 
      name: 'Patient Directory', 
      value: counts?.patients || 0, 
      icon: Users, 
      color: 'text-brand-600', 
      bg: 'bg-brand-100',
      href: '/patients',
      description: 'Active clinical profiles'
    },
    { 
      name: 'Encounter Review', 
      value: counts?.encounters || 0, 
      icon: Stethoscope, 
      color: 'text-clinical-700', 
      bg: 'bg-clinical-50',
      href: '/encounters',
      description: 'Synced field sessions'
    },
    { 
      name: 'Manual Audit Flag', 
      value: counts?.pendingChecks || 0, 
      icon: AlertTriangle, 
      color: 'text-safety-yellow', 
      bg: 'bg-safety-yellow/10',
      href: '/encounters',
      description: 'Awaiting clinical review'
    },
  ]

  return (
    <div className="space-y-8 pb-12 animate-in-fade">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-clinical-400 leading-none">Operational Console</span>
            <div className="h-1 w-1 rounded-full bg-clinical-200" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-clinical-600 leading-none">AidSync Dashboard</span>
          </div>
          <h2 className="text-4xl font-black text-clinical-900 tracking-tight leading-none">Clinical Integrity Flow</h2>
          <p className="text-sm font-bold text-clinical-500 uppercase tracking-widest max-w-xl">
            Maintain high-fidelity medication reference data online, available anywhere offline.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-clinical-100 shadow-sm shrink-0">
          <div className="h-2 w-2 rounded-full bg-safety-green shadow-[0_0_10px_rgba(5,150,105,0.4)] animate-pulse" />
          <span className="text-[10px] font-black text-clinical-900 uppercase tracking-widest">PowerSync Engine Online</span>
          <div className="h-4 w-px bg-clinical-100 mx-1" />
          <Clock className="h-4 w-4 text-clinical-400" />
          <span className="text-xs font-black text-clinical-900 tabular-nums">{currentTime}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 animate-in-slide-up" style={{ animationDelay: '0.1s' }}>
        {stats_items.map((stat) => (
          <Link key={stat.name} to={stat.href} className="group h-full">
            <Card className={`h-full border-2 hover:border-clinical-400 hover:shadow-2xl transition-all duration-500 overflow-hidden relative shadow-sm ${stat.name === 'Manual Audit Flag' && (counts?.pendingChecks || 0) > 0 ? 'border-safety-yellow/40 bg-safety-yellow/[0.02] animate-glint' : 'border-clinical-100'}`}>
              {isCountsLoading ? (
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-14 w-14 rounded-2xl" />
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-8 w-12" />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-full" />
                </CardContent>
              ) : (
                <>
                  <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-all pointer-events-none group-hover:scale-125 duration-1000">
                    <stat.icon size={110} />
                  </div>
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex items-center gap-4 mb-8">
                      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${stat.bg} ${stat.color} shadow-inner group-hover:rotate-6 transition-all duration-500`}>
                        <stat.icon className="h-7 w-7" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-clinical-400 uppercase tracking-[0.2em]">{stat.name}</p>
                        <p className="text-3xl font-black text-clinical-900 tracking-tighter mt-1 tabular-nums leading-none">{stat.value}</p>
                      </div>
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-4">
                      <p className="text-[10px] font-black text-clinical-500 uppercase tracking-widest leading-tight">{stat.description}</p>
                      <div className="h-9 w-9 rounded-xl bg-clinical-50 flex items-center justify-center group-hover:bg-clinical-900 group-hover:text-white transition-all shadow-sm border border-clinical-100 shrink-0">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </CardContent>
                </>
              )}
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* End-to-End Architecture Flow */}
        <div className="lg:col-span-8 animate-in-slide-up" style={{ animationDelay: '0.2s' }}>
          <Card className="border-none bg-clinical-900 text-white shadow-2xl overflow-visible relative h-full rounded-[2.5rem]">
            <div className="absolute -top-4 -right-4 h-48 w-48 bg-brand-500/20 rounded-full blur-[100px] animate-pulse pointer-events-none" />
            <CardHeader className="bg-white/[0.03] border-white/5 py-8 px-10 relative overflow-hidden rounded-t-[2.5rem]">
              <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                <Zap size={120} className="text-brand-400" />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                <div className="space-y-1.5">
                  <CardTitle className="flex items-center gap-3 text-white text-2xl font-black tracking-tight uppercase">
                    <ShieldCheck className="h-7 w-7 text-brand-400" />
                    Clinical Integrity Architecture
                  </CardTitle>
                  <CardDescription className="text-clinical-400 font-black uppercase tracking-[0.25em] text-[10px]">
                    End-to-End Medication Safety Lifecycle
                  </CardDescription>
                </div>
                <Badge variant="success" className="w-fit h-7 px-4 font-black uppercase tracking-widest text-[9px] bg-brand-500/20 text-brand-400 border-none shadow-lg shadow-brand-500/10">
                  Ready for Sync
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-8 sm:p-12 relative z-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 relative">
                {/* Connector Line (Desktop) */}
                <div className="hidden md:block absolute top-[28px] left-[5%] right-[5%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
                
                {[
                  { step: '01', title: 'Prepare', icon: Database, desc: 'Maintain reference data online' },
                  { step: '02', title: 'Sync', icon: Activity, desc: 'PowerSync packages data for field' },
                  { step: '03', title: 'Care', icon: Stethoscope, desc: 'Clinician uses data offline' },
                  { step: '04', title: 'Audit', icon: ClipboardCheck, desc: 'Review synced results here' },
                ].map((item, i) => (
                  <div key={i} className="relative space-y-5 group">
                    <div className="flex items-center gap-4 sm:flex-col sm:items-start sm:gap-6">
                      <div className="h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner group-hover:bg-white/10 group-hover:scale-110 transition-all duration-500 relative z-10">
                        <item.icon className="h-6 w-6 text-brand-400" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-clinical-500 font-mono tracking-tighter bg-white/5 px-1.5 rounded">STEP {item.step}</span>
                          <span className="font-black text-lg tracking-tight group-hover:text-brand-400 transition-colors">{item.title}</span>
                        </div>
                        <p className="text-[10px] font-bold text-clinical-400 leading-relaxed uppercase tracking-widest max-w-[120px]">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-16 flex flex-col sm:flex-row gap-5 items-center justify-center border-t border-white/5 pt-12">
                <Button asChild variant="primary" className="w-full sm:w-auto h-14 px-10 font-black uppercase tracking-[0.15em] text-[11px] shadow-2xl shadow-clinical-600/20 border-none active:scale-95 transition-all animate-glint bg-white text-clinical-900 hover:bg-clinical-50">
                  <Link to="/medications">
                    <Database className="h-4 w-4 mr-3" />
                    Manage Reference Data
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full sm:w-auto h-14 px-10 font-black uppercase tracking-[0.15em] text-[11px] text-white bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 active:scale-95 transition-all">
                  <Link to="/encounters">
                    <ShieldCheck className="h-4 w-4 mr-3 text-brand-400" />
                    Audit Field Sessions
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Queue / Manual Review */}
        <div className="lg:col-span-4 space-y-6 animate-in-slide-up" style={{ animationDelay: '0.3s' }}>
          <Card className="border-clinical-200 shadow-lg h-full flex flex-col overflow-hidden rounded-[2rem]">
            <CardHeader className="py-6 px-8 border-b border-clinical-100 flex flex-row items-center justify-between bg-white shrink-0">
              <div className="space-y-1">
                <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-clinical-900">Priority Audit Queue</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-clinical-400">Manual Intervention Required</CardDescription>
              </div>
              {counts?.pendingChecks && counts.pendingChecks > 0 ? (
                <Badge variant="warning" className="h-7 px-3 font-black uppercase tracking-tighter text-[10px] shadow-sm animate-clinical-pulse bg-safety-yellow text-white border-none">
                  {counts.pendingChecks} PENDING
                </Badge>
              ) : null}
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
              {isStatsLoading ? (
                <div className="p-8 space-y-6">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="h-12 w-12 rounded-xl" />
                      <div className="flex-1 space-y-3">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : stats?.pendingReviews && stats.pendingReviews.length > 0 ? (
                <div className="divide-y divide-clinical-50 overflow-y-auto flex-1 custom-scrollbar">
                  {stats.pendingReviews.map((review: any) => (
                    <Link
                      key={review.id}
                      to="/encounters/$encounterId"
                      params={{ encounterId: review.encounter_id }}
                      className="p-6 flex items-start gap-5 hover:bg-clinical-50/40 transition-all group relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 bottom-0 w-1 bg-safety-yellow opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-500 ${review.severity === 'red' ? 'bg-safety-red/10 text-safety-red' : 'bg-safety-yellow/10 text-safety-yellow'}`}>
                        <AlertTriangle className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm font-black text-clinical-900 truncate tracking-tight">
                            {review.encounter?.patient?.full_name || 'Anonymous Patient'}
                          </p>
                          <span className="text-[9px] font-black text-clinical-300 font-mono">#{review.id.slice(0, 4)}</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Badge variant="info" className="py-0 px-2 h-5 text-[9px] font-black uppercase tracking-widest bg-clinical-50 text-clinical-500 border-none group-hover:bg-clinical-900 group-hover:text-white transition-colors">
                            Flagged for Audit
                          </Badge>
                          <span className="text-[9px] font-bold text-clinical-400 uppercase tracking-widest">
                            {formatDateTime(review.created_at)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-clinical-50/10">
                  <div className="h-20 w-20 rounded-[2rem] bg-white flex items-center justify-center mb-6 shadow-sm border border-clinical-100 animate-clinical-pulse">
                    <CheckCircle2 className="h-10 w-10 text-clinical-200" />
                  </div>
                  <p className="text-sm font-black text-clinical-900 uppercase tracking-[0.2em]">Queue Fully Cleared</p>
                  <p className="text-xs text-clinical-400 font-bold mt-2 uppercase tracking-widest max-w-[200px] leading-relaxed">
                    No clinical sessions require manual audit at this time.
                  </p>
                </div>
              )}
              <div className="p-6 bg-clinical-50/30 border-t border-clinical-100 mt-auto shrink-0">
                <Button asChild variant="ghost" size="sm" className="w-full h-12 text-[10px] font-black uppercase tracking-widest text-clinical-500 hover:text-clinical-900 hover:bg-white hover:shadow-md group rounded-xl border border-transparent hover:border-clinical-100">
                  <Link to="/encounters" className="flex items-center justify-center gap-3">
                    View Complete Audit Log
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1.5 transition-transform" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
