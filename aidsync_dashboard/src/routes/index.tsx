import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { ArrowRight, ShieldCheck, Smartphone, Database } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'

export const Route = createFileRoute('/')({
  component: HomePage,
  beforeLoad: async ({ context }) => {
    if (context.auth?.user) {
      throw redirect({ to: '/overview' })
    }
  },
})

function HomePage() {
  return (
    <div className="min-h-screen bg-clinical-50 font-sans text-clinical-900">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-clinical-100 bg-white shadow-sm overflow-hidden">
              <img src="/logo.png" alt="AidSync Logo" className="h-10 w-10 object-contain" />
            </div>
            <div>
              <div className="text-2xl font-black italic tracking-tight">AidSync</div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-clinical-400">
                Offline Medication Safety
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link to="/signup">Request Access</Link>
            </Button>
          </div>
        </header>

        <main className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-clinical-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-clinical-500">
              <ShieldCheck className="h-4 w-4 text-safety-green" />
              Prepare online. Use offline. Sync back.
            </div>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-black tracking-tight text-clinical-950 sm:text-5xl">
                Medication reference data prepared online for disconnected care.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-clinical-600 sm:text-lg">
                AidSync helps supervisors prepare medication safety reference data online, sync it to
                field devices through PowerSync, and support clinicians working offline with local
                patient records and clear safety checks.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="gap-2">
                <Link to="/login">
                  Open Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/signup">Create a clinician account</Link>
              </Button>
            </div>
          </section>

          <section className="grid gap-4">
            <Card className="border-clinical-200 shadow-sm">
              <CardContent className="flex gap-4 p-5">
                <div className="mt-1 rounded-2xl bg-clinical-100 p-3 text-clinical-700">
                  <Database className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-sm font-black uppercase tracking-[0.18em] text-clinical-500">
                    Reference Preparation
                  </h2>
                  <p className="text-sm leading-6 text-clinical-700">
                    Review and publish medication reference data online so it can sync safely to
                    mobile devices.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-clinical-200 shadow-sm">
              <CardContent className="flex gap-4 p-5">
                <div className="mt-1 rounded-2xl bg-clinical-100 p-3 text-clinical-700">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-sm font-black uppercase tracking-[0.18em] text-clinical-500">
                    Offline Field Use
                  </h2>
                  <p className="text-sm leading-6 text-clinical-700">
                    Clinicians use local SQLite data on device, continue working while offline, and
                    sync results back when connectivity returns.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  )
}
