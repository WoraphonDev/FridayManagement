import type { Self } from './api';
export const pages = [
  { path: '/', label: "Home", access: 'public' },
  { path: '/my-tasks', label: "My work", access: 'user' },
  { path: '/projects', label: "Projects", access: 'user' },
  { path: '/calendar', label: "Calendar", access: 'user' },
  { path: '/reports', label: "Reports", access: 'user' },
  { path: '/notifications', label: "Notifications", access: 'user' },
  { path: '/teams', label: "Teams", access: 'user' },
  { path: '/trash', label: "Trash", access: 'lead' },
  { path: '/users', label: "Admin", access: 'admin' },
  { path: '/settings', label: "Profile & settings", access: 'user' },
] as const;
export function allowedPages(self?: Self) {
  return pages.filter(
    (page) =>
      page.access === 'public' ||
      (!!self?.user.active &&
        (page.path === '/settings' ||
          (!self.must_change_password &&
            !self.user.must_change_password &&
            (page.access === 'user' ||
              self.user.org_role === 'admin' ||
              (page.access === 'lead' && self.effective_summary.lead_team_ids.length > 0))))),
  );
}
