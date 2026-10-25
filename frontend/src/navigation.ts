import type { Self } from './api';
export type TrashScope = {
  actorId: number;
  session: string;
  viewRevision: string;
  status: 'loading' | 'allowed' | 'denied' | 'error';
};
export function currentTrashScope(self: Self | undefined, scope?: TrashScope) {
  return (
    !!self &&
    scope?.actorId === self.user.id &&
    scope.session === self.csrf &&
    scope.viewRevision === self.view_revision
  );
}
export const pages = [
  { path: '/', label: 'Home', access: 'public' },
  { path: '/my-tasks', label: 'My work', access: 'user' },
  { path: '/projects', label: 'Projects', access: 'user' },
  { path: '/calendar', label: 'Calendar', access: 'user' },
  { path: '/reports', label: 'Reports', access: 'user' },
  { path: '/notifications', label: 'Notifications', access: 'user' },
  { path: '/teams', label: 'Teams', access: 'user' },
  { path: '/trash', label: 'Trash', access: 'lead' },
  { path: '/users', label: 'Admin', access: 'admin' },
  { path: '/settings', label: 'Profile & settings', access: 'user' },
] as const;
export function allowedPages(self?: Self, scope?: TrashScope) {
  return pages.filter(
    (page) =>
      page.access === 'public' ||
      (!!self?.user.active &&
        (page.path === '/settings' ||
          (!self.must_change_password &&
            !self.user.must_change_password &&
            (page.access === 'user' ||
              self.user.org_role === 'admin' ||
              (page.access === 'lead' &&
                (self.effective_summary.lead_team_ids.length > 0 ||
                  (self.user.permission_keys.includes('P-04') &&
                    currentTrashScope(self, scope) &&
                    scope?.status === 'allowed'))))))),
  );
}
