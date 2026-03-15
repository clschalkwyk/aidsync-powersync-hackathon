import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { useAuth } from '@/hooks/useAuth'

interface MyRouterContext {
  auth: ReturnType<typeof useAuth>
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => (
    <>
      <Outlet />
      {import.meta.env.DEV && import.meta.env.VITE_SHOW_ROUTER_DEVTOOLS === 'true' ? (
        <TanStackRouterDevtools />
      ) : null}
    </>
  ),
})
