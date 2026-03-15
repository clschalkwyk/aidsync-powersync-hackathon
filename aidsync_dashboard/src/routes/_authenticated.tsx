import { createFileRoute, redirect } from '@tanstack/react-router'
import { Layout } from '@/components/layout/Layout'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context }) => {
    if (!context.auth?.user) {
      throw redirect({
        to: '/',
      })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return <Layout />
}
