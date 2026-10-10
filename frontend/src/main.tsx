import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { App } from './App';
import '@fontsource/nunito/latin-900.css';
import './style.css';
import '@vibe/core/tokens';
import './vibe.css';
import './approved-design.css';
import '../../design-preview/vibe/workspace-theme.css';
import './login-design.css';
import './my-work-visual.css';
import './management-visual.css';
import './all-projects-visual.css';
import './work-calendar-visual.css';
import './teams-visual.css';
import './project-detail-visual.css';
import './task-editor-tabs.css';
import './page-headers.css';
import './motion.css';
import './cell-pickers.css';
import './compact.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={createBrowserRouter([{ path: '*', element: <App /> }])} />
  </StrictMode>,
);
