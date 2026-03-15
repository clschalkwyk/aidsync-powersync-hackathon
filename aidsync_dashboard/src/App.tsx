import { RouterProvider } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Activity } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { router } from '@/lib/router'

export function App() {
  const auth = useAuth()

  useEffect(() => {
    router.invalidate()
  }, [auth.user, auth.isLoading, auth.profile])

  if (auth.isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-clinical-50">
        <Activity className="h-10 w-10 text-clinical-600 animate-pulse mb-4" />
        <p className="text-xs font-black uppercase tracking-[0.2em] text-clinical-400">Synchronizing Session...</p>
      </div>
    )
  }

  return <RouterProvider router={router} context={{ auth }} />
}
