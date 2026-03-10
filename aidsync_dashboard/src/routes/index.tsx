import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    // Redirect root to overview (if authenticated) or login
    throw redirect({ to: '/overview' })
  },
})
