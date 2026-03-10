import { createFileRoute, redirect } from '@tanstack/react-router'
import { Layout } from '@/components/layout/Layout'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    console.log('Checking authentication for route:', location.href)
    console.log('Auth context user:', context.auth?.user?.email)
    console.log('Auth context isLoading:', context.auth?.isLoading)
    
    // Check if user is authenticated
    if (!context.auth?.user) {
      console.warn('User not authenticated, redirecting to login')
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      })
    }
    
    console.log('Authentication verified, allowing access')
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return <Layout />
}
