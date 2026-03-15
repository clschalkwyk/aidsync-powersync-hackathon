import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, FileText } from 'lucide-react'

import { EncounterForm } from '@/components/forms/EncounterForm'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { fetchEncounterById } from '@/data/queries'

export const Route = createFileRoute('/_authenticated/encounters/$encounterId/edit')({
  component: EditEncounterPage,
})

function EditEncounterPage() {
  const { encounterId } = useParams({ from: '/_authenticated/encounters/$encounterId/edit' })
  const { data: encounter, isLoading } = useQuery({
    queryKey: ['encounter', encounterId],
    queryFn: () => fetchEncounterById(encounterId),
  })

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in-fade">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-24 rounded-3xl" />
        <Skeleton className="h-[40rem] rounded-3xl" />
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
        <div className="rounded-3xl border border-clinical-200 bg-white p-12 text-center shadow-sm">
          <FileText className="mx-auto mb-4 h-10 w-10 text-clinical-300" />
          <h3 className="text-xl font-black text-clinical-900">Encounter Not Found</h3>
          <p className="mt-2 text-sm font-bold text-clinical-500">The requested encounter could not be loaded for editing.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in-fade">
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="sm" asChild className="mt-1">
          <Link to="/encounters/$encounterId" params={{ encounterId }}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Encounter
          </Link>
        </Button>
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-400">Encounter Review</span>
            <div className="h-1 w-1 rounded-full bg-clinical-200" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-600">Edit Session</span>
          </div>
          <h2 className="text-3xl font-black tracking-tight text-clinical-900">Edit Encounter #{encounter.id.slice(0, 8)}</h2>
          <p className="mt-2 text-sm font-bold text-clinical-500">Adjust the encounter summary and review metadata for the synced field session.</p>
        </div>
      </div>

      <EncounterForm encounter={encounter} />
    </div>
  )
}
