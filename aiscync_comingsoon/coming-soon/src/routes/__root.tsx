import { createRootRoute, HeadContent, Scripts } from '@tanstack/react-router';
import { Outlet } from '@tanstack/react-router';
import appCss from '../styles/app.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
      { title: 'AidSync — Field care, even offline' },
      { name: 'description', content: 'AidSync is an offline-first field care app for clinicians. Scan medicine inserts, check medication safety against patient history, and sync when connectivity returns.' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <>
      <HeadContent />
      <Outlet />
      <Scripts />
    </>
  );
}
