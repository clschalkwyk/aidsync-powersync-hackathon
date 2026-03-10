import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { Activity } from 'lucide-react'
import './index.css'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

// Create a new router instance
const router = createRouter({ 
  routeTree,
  defaultPreload: 'intent',
  context: {
    auth: undefined!,
  },
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

// App wrapper that provides auth context to router
function App() {
  const auth = useAuth()

  // IMPORTANT: Re-validate router whenever auth state changes
  // This fixes the issue where login doesn't redirect until refresh
  useEffect(() => {
    router.invalidate()
  }, [auth.user, auth.profile, auth.isLoading])

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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
