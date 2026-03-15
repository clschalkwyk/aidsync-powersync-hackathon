import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { AlertCircle } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/login')({
  component: LoginPage,
  beforeLoad: async ({ context }) => {
    if (context.auth?.user) {
      throw redirect({ to: '/overview' })
    }
  },
})

function LoginPage() {
  const { signIn, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const redirectTarget = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('redirect') || '/overview'
  }, [])

  useEffect(() => {
    if (!user) {
      return
    }

    navigate({ to: redirectTarget as '/overview' })
  }, [navigate, redirectTarget, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const { error } = await signIn(email, password)
    
    if (error) {
      setError(error.message || 'Invalid email or password. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-clinical-50 p-4 font-sans">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-6 sm:mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm overflow-hidden border border-clinical-100">
            <img src="/logo.png" alt="AidSync Logo" className="h-10 w-10 object-contain" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-clinical-900 tracking-tight italic text-balance">AidSync</span>
        </div>

        <Card className="shadow-lg border-clinical-200">
          <CardHeader className="space-y-1 p-4 sm:p-6 pb-2">
            <CardTitle className="text-xl sm:text-2xl font-black text-center tracking-tight text-clinical-900 uppercase">Sign in</CardTitle>
            <CardDescription className="text-center text-xs font-bold uppercase tracking-widest text-clinical-400">
              Operations Control Console
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-safety-red/10 p-4 text-xs text-safety-red font-bold border border-safety-red/20">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-clinical-500 ml-1">
                  System Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@aidsync.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="font-bold h-12"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" title="password" className="text-[10px] font-black uppercase tracking-widest text-clinical-500 ml-1">
                  Access Key
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="font-bold h-12"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 font-black uppercase tracking-widest text-xs shadow-lg shadow-clinical-600/20"
                disabled={isLoading}
              >
                {isLoading ? 'Authenticating...' : 'Authorize Access'}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-clinical-100 space-y-4">
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-clinical-300 italic">
                  Medication Reference & Review Console
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold text-clinical-400 uppercase tracking-widest">
                  New clinician?{' '}
                  <Link to="/signup" className="text-clinical-600 hover:text-clinical-900 underline underline-offset-4">
                    Register here
                  </Link>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-[10px] font-black uppercase tracking-[0.3em] text-clinical-400 px-10">
          Access is restricted to authorized clinical personnel only.
        </p>
      </div>
    </div>
  )
}
