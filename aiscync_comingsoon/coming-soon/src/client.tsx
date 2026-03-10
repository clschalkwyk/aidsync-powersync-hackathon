import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { createRouter } from './router';

const router = createRouter();

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<RouterProvider router={router} />);
}
