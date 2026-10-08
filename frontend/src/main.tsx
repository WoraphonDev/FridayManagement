import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { App } from './App';
import './style.css';
import '@vibe/core/tokens';
import './vibe.css';
import './approved-design.css';
import '../../design-preview/vibe/workspace-theme.css';
import './login-design.css';
import './motion.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={createBrowserRouter([{ path: '*', element: <App /> }])} />
  </StrictMode>,
);
