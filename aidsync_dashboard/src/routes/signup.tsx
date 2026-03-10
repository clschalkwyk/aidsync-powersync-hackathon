import { createFileRoute, redirect, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { AlertCircle, ShieldCheck } from 'lucide-react'

export const Route = createFileRoute('/signup')({
  component: SignupPage,
  beforeLoad: async ({ context }) => {
    if (context.auth?.user) {
      throw redirect({ to: '/overview' })
    }
  },
})

function SignupPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const { error } = await signUp(email, password, fullName)
    
    if (error) {
      setError(error.message || 'Failed to create account. Please try again.')
      setIsLoading(false)
    } else {
      setIsSuccess(true)
      setIsLoading(false)
      // Redirect after a short delay to allow success message visibility
      setTimeout(() => {
        navigate({ to: '/login' })
      }, 3000)
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
            <CardTitle className="text-xl sm:text-2xl font-black text-center tracking-tight text-clinical-900 uppercase">Register</CardTitle>
            <CardDescription className="text-center text-xs font-bold uppercase tracking-widest text-clinical-400">
              Clinician Enrollment Console
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {isSuccess ? (
              <div className="space-y-6 py-4 text-center">
                <div className="h-16 w-16 bg-safety-green/10 text-safety-green rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-clinical-900 uppercase tracking-tight">Registration Submitted</h3>
                  <p className="text-sm text-clinical-600 font-medium">
                    Your account has been created. You will be redirected to the sign in page shortly.
                  </p>
                </div>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/login">Go to Sign in Now</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-xl bg-safety-red/10 p-4 text-xs text-safety-red font-bold border border-safety-red/20">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="fullName" className="text-[10px] font-black uppercase tracking-widest text-clinical-500 ml-1">
                    Full Name
                  </label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Dr. Jane Smith"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="font-bold h-12"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-clinical-500 ml-1">
                    System Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="clinician@aidsync.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="font-bold h-12"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" title="password" className="text-[10px] font-black uppercase tracking-widest text-clinical-500 ml-1">
                    Access Key (Password)
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
                  {isLoading ? 'Processing...' : 'Request Authorization'}
                </Button>
              </form>
            )}

            <div className="mt-8 pt-6 border-t border-clinical-100">
              <div className="text-center">
                <p className="text-[10px] font-bold text-clinical-400 uppercase tracking-widest">
                  Already registered?{' '}
                  <Link to="/login" className="text-clinical-600 hover:text-clinical-900 underline underline-offset-4">
                    Sign in here
                  </Link>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-[10px] font-black uppercase tracking-[0.3em] text-clinical-400 px-10">
          AidSync Medication Reference & Review Console
        </p>
      </div>
    </div>
  )
}
