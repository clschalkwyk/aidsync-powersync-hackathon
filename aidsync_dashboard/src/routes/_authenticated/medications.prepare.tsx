import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, ChevronRight, FilePlus2, Layers, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { fetchPreparationSessions, createPreparationSession, deletePreparationSession } from '@/data/queries'
import { useAuth } from '@/hooks/useAuth'
import { canManageReferenceData } from '@/lib/utils'
import { queryClient } from '@/lib/queryClient'

export const Route = createFileRoute('/_authenticated/medications/prepare')({
  component: PreparationSessionsPage,
})

function PreparationSessionsPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const canEdit = canManageReferenceData(profile?.role)

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['preparation-sessions'],
    queryFn: fetchPreparationSessions,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error('Profile is required to create a session')
      return createPreparationSession({ created_by: profile.id, source_name: 'Leaflet Upload' })
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['preparation-sessions'] })
      navigate({ to: '/medications/prepare-session/$sessionId' as any, params: { sessionId: session.id } as any })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deletePreparationSession,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['preparation-sessions'] })
    },
  })

  return (
    <div className="space-y-6 animate-in-fade">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="sm" asChild className="mt-1 h-10 w-10 p-0 rounded-xl text-clinical-400 hover:text-clinical-900 bg-white shadow-sm border border-clinical-100 shrink-0">
            <Link to="/medications">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-clinical-400">Preparation</span>
              <div className="h-1 w-1 rounded-full bg-clinical-200" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-clinical-600">Online Workflow</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-clinical-900 tracking-tight">Medication Preparation Sessions</h2>
            <p className="text-sm font-medium text-clinical-500 max-w-2xl">
              Prepare medication reference data online, process leaflet pages one at a time, and publish curated data into the synced catalog.
            </p>
          </div>
        </div>
        <Button
          disabled={!canEdit || createMutation.isPending}
          onClick={() => createMutation.mutate()}
          className="h-11 px-6 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-clinical-900/10"
        >
          <FilePlus2 className="mr-2 h-4 w-4" />
          {createMutation.isPending ? 'Creating...' : 'New Preparation Session'}
        </Button>
      </div>

      {!canEdit && (
        <div className="rounded-2xl border border-safety-yellow/20 bg-safety-yellow/10 p-4 text-sm font-bold text-safety-yellow">
          You can review medication preparation sessions, but only supervisor and admin users can create or edit them.
        </div>
      )}

      <div className="rounded-3xl border border-brand-100 bg-brand-50 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-100 bg-white shadow-sm">
            <Sparkles className="h-5 w-5 text-brand-600" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-700">Durable Preparation</p>
            <p className="text-sm font-medium leading-6 text-brand-900">
              Upload and process pages individually. Drafts remain editable until you explicitly publish them into the medication reference catalog.
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-clinical-200 bg-clinical-50/50 py-24 text-center">
          <Layers className="mx-auto mb-6 h-16 w-16 text-clinical-200" />
          <h3 className="text-xl font-black uppercase tracking-tight text-clinical-900">No preparation sessions yet</h3>
          <p className="mx-auto mt-2 max-w-md text-sm font-medium text-clinical-500">
            Start a new session to upload leaflet pages, process them online, and publish medication reference data for PowerSync distribution.
          </p>
          <Button
            disabled={!canEdit || createMutation.isPending}
            onClick={() => createMutation.mutate()}
            className="mt-8 h-11 px-8 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-clinical-900/10"
          >
            <FilePlus2 className="mr-2 h-4 w-4" />
            Create first session
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sessions.map((session) => (
            <Card
              key={session.id}
              className="h-full border-clinical-200/70 transition-all duration-300 hover:border-clinical-400 hover:shadow-xl hover:shadow-clinical-900/5"
            >
              <Link
                to={'/medications/prepare-session/$sessionId' as any}
                params={{ sessionId: session.id } as any}
                className="group block"
              >
                <CardHeader className="space-y-3 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg font-black tracking-tight text-clinical-900">
                        {session.source_name || session.brand_name || 'Untitled Session'}
                      </CardTitle>
                      <p className="mt-1 text-xs font-bold uppercase tracking-[0.15em] text-clinical-400">
                        Updated {new Date(session.updated_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="default">{session.status.replaceAll('_', ' ')}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl border border-clinical-100 bg-clinical-50 p-3">
                      <div className="text-[10px] font-black uppercase tracking-widest text-clinical-400">Pages</div>
                      <div className="mt-2 text-2xl font-black text-clinical-900">{session.page_count}</div>
                    </div>
                    <div className="rounded-2xl border border-clinical-100 bg-clinical-50 p-3">
                      <div className="text-[10px] font-black uppercase tracking-widest text-clinical-400">Confidence</div>
                      <div className="mt-2 text-2xl font-black text-clinical-900">
                        {typeof session.confidence === 'number' ? `${session.confidence}%` : '—'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-clinical-100 bg-white px-4 py-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-clinical-500">Open session workspace</span>
                    <ChevronRight className="h-4 w-4 text-clinical-400 transition-transform group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Link>
              {session.status !== 'published' && (
                <div className="px-6 pb-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-center text-safety-red hover:text-safety-red"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      const ok = confirm('Delete this draft session and all uploaded pages? This cannot be undone.')
                      if (ok) deleteMutation.mutate(session.id)
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Draft
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
