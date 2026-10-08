import { projectPage, type Project } from './workspace-api';
import { OrganizationSettings } from './Organization';
import { Brand, AuthArtwork } from './Brand';
import { NotificationBadge } from './NotificationBadge';
import { NotifyPopover } from './NotifyPopover';
import { organizationReply } from './organization-api';
import { Trash } from './Trash';
import { Workspaces } from './Workspaces';
import { useCallback, useEffect, useRef, useState, lazy, Suspense, type ReactNode } from 'react';
import { subscribeRefresh, refreshCurrentReaders } from './shared/refresh';
import { setWritable, useWritable } from './shared/connection';
import { readFailureCount } from './api';
import { Pwa } from './Pwa';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { MyOverview } from './MyOverview';
import { useFavorites } from './favorites-api';
import { usePreferences } from './preferences';
import { motionAllowed } from './motion';
import { MotionSettings } from './MotionSettings';
import { apiClient, ApiError, selfSchema, metaSchema, type Self } from './api';
import { Login, Password } from './Auth';
import { AdminCenter, MyPermissions } from './AdminCenter';
import { Setup } from './Setup';
import { allowedPages, pages } from './navigation';
import { Loading, ErrorNotice, EmptyState, Dialog, Toast } from './shared/components';
const client = apiClient();
const TaskWorkspace = lazy(() =>
  import('./TaskWorkspace').then((m) => ({ default: m.TaskWorkspace })),
);
const Reports = lazy(() => import('./Reports').then((m) => ({ default: m.Reports })));
const Notifications = lazy(() =>
  import('./Notifications').then((m) => ({ default: m.Notifications })),
);
export function App() {
  const writable = useWritable();
  const [boardProject, setBoardProject] = useState<Project>();
  const [sidebarProjects, setSidebarProjects] = useState<Project[]>([]);
  const boardChanged = useCallback((project?: Project) => setBoardProject(project), []);
  const [reconnecting, setReconnecting] = useState(false);
  const [self, setSelf] = useState<Self>();
  const [organizationName, setOrganizationName] = useState<string>();
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [settingsSection, setSettingsSectionState] = useState<SettingsSection>(() => {
    const s =
      typeof window === 'undefined'
        ? null
        : new URLSearchParams(window.location.search).get('section');
    return settingsSections.some(([k]) => k === s) ? (s as SettingsSection) : 'profile';
  });
  // Keep the open Settings section in the URL so reload and links return to it.
  const setSettingsSection = (s: SettingsSection) => {
    setSettingsSectionState(s);
    window.history.replaceState(window.history.state, '', `/settings?section=${s}`);
  };
  const [organizationReload, setOrganizationReload] = useState(0);
  const [error, setError] = useState<ApiError>();
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' || navigator.onLine !== false,
  );
  const [help, setHelp] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [setupComplete, setSetupComplete] = useState<'created' | 'existing'>();
  const location = useLocation();
  const [epoch, setEpoch] = useState(0),
    [logoutPending, setLogoutPending] = useState(false);
  const generation = useRef(0),
    channel = useRef<BroadcastChannel | null>(null),
    lastActivity = useRef(0),
    logoutBusy = useRef(false);
  const clear = useCallback(() => {
    generation.current++;
    setReconnecting(false);
    setWritable(navigator.onLine !== false);
    setSelf(undefined);
    setOrganizationName(undefined);
    setEpoch((n) => n + 1);
    setError(new ApiError('session', 401, undefined, {}, 'UNAUTHENTICATED'));
    setLoading(false);
    setHelp(false);
  }, []);
  const refresh = useCallback(async () => {
    const at = generation.current;
    try {
      const value = await client.request('/api/me', { parse: (v) => selfSchema.parse(v) });
      if (at === generation.current) {
        setSelf(value);
        setError(undefined);
      }
    } catch (e) {
      if (at === generation.current && e instanceof ApiError && e.code === 'UNAUTHENTICATED')
        clear();
    }
  }, [clear]);
  const failure = useCallback(
    (e: ApiError) => {
      if (e.code === 'UNAUTHENTICATED') {
        clear();
        channel.current?.postMessage('clear');
      } else if (
        e.code === 'INVALID_CSRF' ||
        e.code === 'PASSWORD_CHANGE_REQUIRED' ||
        e.code === 'FORBIDDEN'
      )
        void refresh();
    },
    [clear, refresh],
  );
  const authenticated = useCallback((value: Self) => {
    generation.current++;
    setReconnecting(false);
    setWritable(true);
    setSelf(value);
    setError(undefined);
    setLoading(false);
    setEpoch((n) => n + 1);
    setSetupComplete(undefined);
    channel.current?.postMessage('changed');
  }, []);
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const events = new BroadcastChannel('friday-auth-events');
    channel.current = events;
    events.onmessage = (e) => {
      if (e.data === 'clear') clear();
      else if (e.data === 'changed') {
        clear();
        void refresh();
      }
    };
    return () => {
      channel.current = null;
      events.close();
    };
  }, [clear, refresh]);
  const authCsrf = self?.csrf;
  useEffect(() => {
    if (!authCsrf || !online) return;
    const controller = new AbortController();
    let reading = false,
      activityPending = false;
    const at = generation.current;
    const read = async (signal: AbortSignal) => {
      if (document.hidden || reading) return;
      reading = true;
      try {
        const value = await client.request('/api/me', {
          signal,
          parse: (v) => selfSchema.parse(v),
        });
        if (!signal.aborted && at === generation.current) setSelf(value);
      } catch (e) {
        if (
          !signal.aborted &&
          at === generation.current &&
          e instanceof ApiError &&
          e.code === 'UNAUTHENTICATED'
        )
          clear();
      } finally {
        reading = false;
      }
    };
    const activity = (event: Event) => {
      if (
        !event.isTrusted ||
        document.hidden ||
        activityPending ||
        Date.now() - lastActivity.current < 15000
      )
        return;
      lastActivity.current = Date.now();
      activityPending = true;
      void client
        .request('/api/session/activity', {
          method: 'POST',
          csrf: authCsrf,
          signal: controller.signal,
          parse: () => undefined,
        })
        .catch((e: unknown) => {
          if (!controller.signal.aborted && e instanceof ApiError) failure(e);
        })
        .finally(() => {
          activityPending = false;
        });
    };
    const unsubscribe = subscribeRefresh(read);
    document.addEventListener('pointerdown', activity, { passive: true });
    document.addEventListener('keydown', activity, { passive: true });
    return () => {
      controller.abort();
      unsubscribe();
      document.removeEventListener('pointerdown', activity);
      document.removeEventListener('keydown', activity);
    };
  }, [authCsrf, online, clear, failure]);
  const logout = async () => {
    if (!self || logoutBusy.current || !online) return;
    logoutBusy.current = true;
    setLogoutPending(true);
    try {
      await client.request('/api/logout', {
        method: 'POST',
        csrf: self.csrf,
        parse: () => undefined,
      });
      clear();
      channel.current?.postMessage('clear');
    } catch (e) {
      if (e instanceof ApiError) {
        failure(e);
        setError(e);
      }
    } finally {
      logoutBusy.current = false;
      setLogoutPending(false);
    }
  };
  useEffect(() => {
    const change = () => {
      setWritable(false);
      setOnline(navigator.onLine);
      setReconnecting(navigator.onLine);
    };
    window.addEventListener('online', change);
    window.addEventListener('offline', change);
    return () => {
      window.removeEventListener('online', change);
      window.removeEventListener('offline', change);
    };
  }, []);
  useEffect(() => {
    if (!online || !reconnecting) return;
    let stopped = false;
    let controller: AbortController | undefined;
    let retry: ReturnType<typeof setTimeout>;
    const check = async () => {
      if (document.hidden) {
        retry = setTimeout(() => void check(), 1000);
        return;
      }
      controller = new AbortController();
      const at = generation.current;
      let deadline: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_resolve, reject) => {
        deadline = setTimeout(() => {
          controller?.abort();
          reject(new ApiError('unavailable', 0));
        }, 10000);
      });
      const failures = readFailureCount();
      try {
        const value = await Promise.race([
          client.request('/api/me', {
            signal: controller.signal,
            parse: (v) => selfSchema.parse(v),
          }),
          timeout,
        ]);
        if (stopped || at !== generation.current) return;
        setSelf(value);
        // Let current permissions and mounted reader callbacks commit before refreshing resources.
        await new Promise((resolve) => setTimeout(resolve, 0));
        await Promise.race([refreshCurrentReaders(), timeout]);
        if (stopped || at !== generation.current || !navigator.onLine) return;
        if (document.hidden || failures !== readFailureCount())
          throw new ApiError('unavailable', 0);
        setWritable(true);
        setReconnecting(false);
      } catch (e) {
        if (stopped || at !== generation.current) return;
        if (e instanceof ApiError && e.code === 'UNAUTHENTICATED') {
          if (authCsrf) clear();
          setWritable(true);
          setReconnecting(false);
        } else retry = setTimeout(() => void check(), 5000);
      } finally {
        clearTimeout(deadline);
      }
    };
    void check();
    return () => {
      stopped = true;
      controller?.abort();
      clearTimeout(retry);
    };
  }, [online, reconnecting, clear, authCsrf]);
  useEffect(() => {
    const controller = new AbortController();
    const at = generation.current;
    client
      .request('/api/meta', {
        signal: controller.signal,
        parse: (value) => metaSchema.parse(value),
      })
      .then(async (meta) => {
        if (controller.signal.aborted || at !== generation.current) return;
        setSetupRequired(meta.setupRequired);
        if (meta.setupRequired) {
          setSelf(undefined);
          setLoading(false);
          setError(undefined);
          return;
        }
        return client.request('/api/me', {
          signal: controller.signal,
          parse: (value) => selfSchema.parse(value),
        });
      })
      .then((value) => {
        if (!controller.signal.aborted && at === generation.current && value) {
          setSelf(value);
          setLoading(false);
          setError(undefined);
        }
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted && at === generation.current) {
          setSelf(undefined);
          setLoading(false);
          setError(reason instanceof ApiError ? reason : new ApiError('unavailable', 503));
        }
      });
    return () => controller.abort();
  }, [reload]);
  const orgSession =
    self && !self.must_change_password && !self.user.must_change_password ? self.csrf : undefined;
  const favorites = useFavorites(orgSession, online);
  // T-089: applies .reduce-motion on <html> from the user's saved preference.
  usePreferences(orgSession);
  useEffect(() => {
    if (!orgSession || !online) return;
    const read = async (signal: AbortSignal) => {
      try {
        const value = await client.request('/api/organization', {
          signal,
          parse: (v) => organizationReply.parse(v),
        });
        if (!signal.aborted) setOrganizationName(value.item.name);
      } catch {
        /* Session reader owns authentication errors. */
      }
    };
    const controller = new AbortController();
    void read(controller.signal);
    const unsubscribe = subscribeRefresh(read);
    return () => {
      controller.abort();
      unsubscribe();
    };
  }, [orgSession, organizationReload, online]);
  useEffect(() => {
    if (!orgSession || !online) return;
    const controller = new AbortController();
    void client
      .request('/api/projects?pageSize=100', {
        signal: controller.signal,
        parse: (v) => projectPage.parse(v),
      })
      .then((r) => {
        if (!controller.signal.aborted) setSidebarProjects(r.items);
      })
      .catch(() => {
        if (!controller.signal.aborted) setSidebarProjects([]);
      });
    return () => controller.abort();
  }, [orgSession, online, self?.view_revision]);
  useEffect(() => {
    if (!motionAllowed()) return;
    const page = document.querySelector('.content > section');
    const motion = page?.animate(
      [
        { opacity: 0, transform: 'translateY(6px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 220, easing: 'cubic-bezier(.2,.7,.2,1)' },
    );
    return () => motion?.cancel();
  }, [location.pathname, location.search]);
  const navigate = useNavigate();
  // FR-53 deep link /projects/{id}/tasks/{taskId}: the task GET still enforces access.
  const deepLink = /^\/projects\/([1-9][0-9]{0,9})\/tasks\/([1-9][0-9]{0,9})$/.exec(
    location.pathname,
  );
  const [linkProject, linkTask] = [deepLink?.[1], deepLink?.[2]];
  useEffect(() => {
    if (linkProject && linkTask)
      navigate(`/projects?project=${linkProject}&task=${linkTask}`, { replace: true });
  }, [linkProject, linkTask, navigate]);
  const nav = allowedPages(self);
  const page = pages.find((p) => p.path === location.pathname);
  const allowed = nav.some((p) => p.path === location.pathname);
  const heading = setupComplete
    ? 'Setup complete'
    : setupRequired
      ? 'First-time setup'
      : page?.path === '/'
        ? 'Home'
        : (page?.label ?? 'Page not found');
  useEffect(() => {
    document.title = `${heading} · Friday Management`;
    document.getElementById('page-heading')?.focus();
  }, [heading]);
  return (
    <div className={`app-layout ${!self || setupRequired ? 'auth-layout' : ''}`}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="topbar">
        <button
          className="mobile-menu"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          aria-controls="workspace-navigation"
          onClick={() => setMenuOpen((v) => !v)}
        >
          ☰
        </button>
        <NavLink to="/">
          <Brand />
        </NavLink>
        {self && organizationName && <span className="top-title">{organizationName}</span>}
        <div className="topbar-actions">
          {self && (
            <button className="icon-button" aria-label="Help" onClick={() => setHelp(true)}>
              <NavIcon path={navIcons.help} />
            </button>
          )}
          {orgSession && self && (
            <div className="notify-anchor">
              <button
                className="notify-link"
                aria-expanded={notifyOpen}
                aria-haspopup="dialog"
                onClick={() => setNotifyOpen((v) => !v)}
              >
                <NavIcon path={navIcons['/notifications']} />
                <span>Notify</span>
                <NotificationBadge
                  key={epoch + self.csrf + location.pathname + notifyOpen}
                  {...{ self, online }}
                  onFailure={failure}
                />
              </button>
              {notifyOpen && (
                <NotifyPopover
                  {...{ self, online }}
                  onFailure={failure}
                  onClose={() => setNotifyOpen(false)}
                />
              )}
            </div>
          )}
          {self && (
            <NavLink
              className="topbar-avatar"
              to="/settings"
              aria-label={`Profile of ${self.user.display_name}`}
            >
              {initials(self.user.display_name)}
            </NavLink>
          )}
        </div>
      </div>
      {menuOpen && (
        <button
          className="menu-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside id="workspace-navigation" className={`sidebar ${menuOpen ? 'menu-open' : ''}`}>
        <NavLink className="workspace-box" to="/">
          <span className="workspace-icon">F</span>
          <span>
            <strong>{organizationName ?? 'Workspace'}</strong>
            <small>Organization workspace</small>
          </span>
        </NavLink>
        <nav aria-label="Main navigation">
          {!!orgSession && !!favorites.items.length && (
            <div className="nav-section project-navigation" aria-label="Favorites">
              <p className="nav-heading">Favorites</p>
              {favorites.items.map((f) => (
                <NavLink
                  key={f.project_id}
                  to={`/projects?project=${f.project_id}`}
                  onClick={() => setMenuOpen(false)}
                  aria-current={boardProject?.id === f.project_id ? 'page' : false}
                  className={boardProject?.id === f.project_id ? 'project-active' : ''}
                >
                  <span className="nav-star" aria-hidden="true">
                    ★
                  </span>
                  <span className="nav-label">
                    {f.project_name}
                    <small>{f.owner_team_name}</small>
                  </span>
                </NavLink>
              ))}
            </div>
          )}
          {[
            { label: 'Personal', paths: ['/', '/my-tasks'] },
            { label: 'Workspace', paths: ['/projects', '/teams', '/calendar', '/reports'] },
          ].map((section) => (
            <div className="nav-section" key={section.label}>
              <p className="nav-heading">{section.label}</p>
              {nav
                .filter((p) => section.paths.includes(p.path))
                .map((p) => (
                  <NavLink
                    key={p.path}
                    to={p.path}
                    end
                    aria-current={p.path === '/projects' && boardProject ? false : 'page'}
                    className={({ isActive }) =>
                      isActive && !(p.path === '/projects' && boardProject) ? 'active' : ''
                    }
                    onClick={() => setMenuOpen(false)}
                  >
                    <NavIcon path={navIcons[p.path]} />
                    <span>{navLabels[p.path] ?? p.label}</span>
                  </NavLink>
                ))}
            </div>
          ))}
          {!!orgSession && !!sidebarProjects.length && (
            <div className="nav-section project-navigation">
              <p className="nav-heading">Your projects</p>
              {sidebarProjects.map((project) => (
                <NavLink
                  key={project.id}
                  to={`/projects?project=${project.id}`}
                  onClick={() => setMenuOpen(false)}
                  aria-current={boardProject?.id === project.id ? 'page' : false}
                  className={boardProject?.id === project.id ? 'project-active' : ''}
                >
                  <NavIcon path={navIcons.project} />
                  <span className="nav-label">
                    {project.name}
                    <small>{project.owner_team_name}</small>
                  </span>
                </NavLink>
              ))}
            </div>
          )}
          {nav.some((p) => ['/trash', '/users'].includes(p.path)) && (
            <div className="nav-section">
              <p className="nav-heading">Manage</p>
              {nav
                .filter((p) => ['/trash', '/users'].includes(p.path))
                .map((p) => (
                  <NavLink key={p.path} to={p.path} end onClick={() => setMenuOpen(false)}>
                    <NavIcon path={navIcons[p.path]} />
                    <span>{p.label}</span>
                  </NavLink>
                ))}
            </div>
          )}
        </nav>
        {self && (
          <div className="sidebar-bottom">
            {nav.some((p) => p.path === '/settings') && (
              <NavLink to="/settings" end onClick={() => setMenuOpen(false)}>
                <NavIcon path={navIcons['/settings']} />
                <span>Settings</span>
              </NavLink>
            )}
            <button
              className="sidebar-signout"
              disabled={!online || !writable || logoutPending}
              onClick={() => void logout()}
            >
              <NavIcon path={navIcons.logout} />
              <span>Sign out</span>
            </button>
            <div className="sidebar-profile">
              <span className="profile-initials">{initials(self.user.display_name)}</span>
              <span>
                <strong>{self.user.display_name}</strong>
                <small>{self.user.org_role}</small>
              </span>
            </div>
          </div>
        )}
      </aside>
      <main
        id="main-content"
        className={`content ${(boardProject && location.pathname === '/projects') || location.pathname === '/my-tasks' || location.pathname === '/calendar' ? 'board-page' : ''}`}
      >
        <header className="page-header">
          {organizationName && page && (
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <span>{organizationName}</span>
              <span aria-hidden="true">›</span>
              <span>{navLabels[page.path] ?? heading}</span>
            </nav>
          )}
          <h1 id="page-heading" tabIndex={-1}>
            {heading}
          </h1>
          {page && pageDescriptions[page.path] && <p>{pageDescriptions[page.path]}</p>}
        </header>
        {!online && <Toast>Connect to save changes. Offline saving is unavailable.</Toast>}
        {online && !writable && <Toast>Checking for updates before enabling changes</Toast>}
        <Pwa mode={self ? 'update-only' : 'floating'} />
        {self?.maintenance && <Toast>Maintenance in progress. Please try again later.</Toast>}
        {self && (self.must_change_password || self.user.must_change_password) && (
          <Toast>Change your password to continue</Toast>
        )}
        <section aria-label="Page content">
          <div className={!self || setupRequired ? 'auth-content' : undefined}>
            {(!self || setupRequired) && <Brand />}
            {setupComplete ? (
              <div role="status">
                <p>
                  {setupComplete === 'created'
                    ? 'Administrator created. Setup complete.'
                    : 'Already configured'}
                </p>
                <p>Sign in with the administrator account you created</p>
                <button
                  onClick={() => {
                    setSetupComplete(undefined);
                    setError(new ApiError('session', 401));
                  }}
                >
                  Sign in
                </button>
              </div>
            ) : loading ? (
              <Loading />
            ) : setupRequired ? (
              <Setup
                online={online}
                onDone={(result) => {
                  setSetupComplete(result);
                  setSetupRequired(false);
                }}
              />
            ) : !self && error?.status === 401 ? (
              <>
                {error.code !== 'UNAUTHENTICATED' && <ErrorNotice error={error} />}
                <Login key={epoch} online={online} onDone={authenticated} onFailure={failure} />
              </>
            ) : self && (self.must_change_password || self.user.must_change_password) ? (
              <Password
                key={epoch + self.csrf}
                self={self}
                online={online}
                onDone={authenticated}
                onFailure={failure}
              />
            ) : error ? (
              <ErrorNotice
                error={error}
                retry={() => {
                  setLoading(true);
                  setReload((n) => n + 1);
                }}
              />
            ) : !allowed ? (
              <EmptyState title={page ? 'You do not have access to this page' : 'Page not found'} />
            ) : self && page?.path === '/' ? (
              <MyOverview key={epoch + self.csrf} {...{ self, online }} onFailure={failure} />
            ) : self && page?.path === '/reports' ? (
              <Suspense fallback={<Loading />}>
                <Reports
                  key={page.path + epoch + self.csrf}
                  {...{ self, online }}
                  onFailure={failure}
                />
              </Suspense>
            ) : self && page?.path === '/notifications' ? (
              <Suspense fallback={<Loading />}>
                <Notifications key={epoch + self.csrf} {...{ self, online }} onFailure={failure} />
              </Suspense>
            ) : self && page?.path === '/settings' ? (
              <SettingsPage
                section={settingsSection}
                onSection={setSettingsSection}
                profile={
                  <>
                    <h2>Profile</h2>
                    <p className="settings-lead">Your name appears on tasks and comments</p>
                    <div className="profile-card">
                      <span className="profile-avatar" aria-hidden="true">
                        {initials(self.user.display_name)}
                      </span>
                      <div>
                        <strong>{self.user.display_name}</strong>
                        <small>
                          {self.user.username} · {self.user.org_role}
                        </small>
                      </div>
                    </div>
                    <dl className="profile-fields">
                      <dt>Display name</dt>
                      <dd>{self.user.display_name}</dd>
                      <dt>Username</dt>
                      <dd>{self.user.username}</dd>
                    </dl>
                    <p className="settings-lead">
                      Contact your administrator to update your name or permissions
                    </p>
                    <MyPermissions self={self} />
                  </>
                }
                password={
                  <Password
                    key={epoch + self.csrf}
                    self={self}
                    online={online}
                    onDone={authenticated}
                    onFailure={failure}
                  />
                }
                appearance={
                  <>
                    <MotionSettings self={self} online={online} onFailure={failure} />
                    <Pwa mode="settings" />
                  </>
                }
                organization={
                  <OrganizationSettings
                    self={self}
                    online={online}
                    onFailure={failure}
                    onChange={() => setOrganizationReload((n) => n + 1)}
                  />
                }
              />
            ) : self && (page?.path === '/my-tasks' || page?.path === '/calendar') ? (
              <Suspense fallback={<Loading />}>
                <TaskWorkspace
                  key={page.path + epoch + self.csrf}
                  mode={page.path === '/my-tasks' ? 'my' : 'calendar'}
                  {...{ self, online }}
                  onFailure={failure}
                />
              </Suspense>
            ) : self && page?.path === '/trash' ? (
              <Trash key={epoch + self.csrf} {...{ self, online }} onFailure={failure} />
            ) : self && (page?.path === '/teams' || page?.path === '/projects') ? (
              <Workspaces
                key={page.path + epoch + self.csrf}
                kind={page.path === '/teams' ? 'teams' : 'projects'}
                self={self}
                online={online}
                onFailure={failure}
                onSelfChange={() => void refresh()}
                onBoardChange={boardChanged}
              />
            ) : self && page?.path === '/users' && self.user.org_role === 'admin' ? (
              <AdminCenter
                key={epoch + self.csrf}
                self={self}
                online={online}
                onFailure={failure}
                onSelfChange={() => void refresh()}
              />
            ) : (
              <EmptyState
                title={page?.path === '/' ? 'Your workspace is ready' : 'Nothing to display yet'}
              >
                <p>Tools will appear when this feature is available</p>
              </EmptyState>
            )}
            {(!self || setupRequired) && (
              <footer className="auth-foot">
                <span>FridayManagement · Internal use</span>
                <span>Contact your Admin for access</span>
              </footer>
            )}
          </div>
          {(!self || setupRequired) && <AuthArtwork />}
        </section>
      </main>
      {help && (
        <Dialog title="Workspace help" onClose={() => setHelp(false)}>
          <p>
            Menus follow your permissions. Retry failed actions or contact your administrator with
            the reference ID.
          </p>
          <p>Connect to the internet or organization network</p>
        </Dialog>
      )}
    </div>
  );
}

type SettingsSection = 'profile' | 'password' | 'appearance' | 'organization';
const settingsSections: [SettingsSection, string][] = [
  ['profile', 'Profile'],
  ['password', 'Change password'],
  ['appearance', 'Appearance'],
  ['organization', 'Organization'],
];
function SettingsPage({
  section,
  onSection,
  ...panels
}: { section: SettingsSection; onSection: (s: SettingsSection) => void } & Record<
  SettingsSection,
  ReactNode
>) {
  return (
    <div className="settings-layout">
      <nav className="settings-nav" aria-label="Settings sections">
        {settingsSections.map(([key, label]) => (
          <button
            key={key}
            aria-current={section === key ? 'page' : undefined}
            className={section === key ? 'active' : undefined}
            onClick={() => onSection(key)}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="settings-panel">{panels[section]}</div>
    </div>
  );
}
const pageDescriptions: Record<string, string> = {
  '/': 'Your starting point for the working day',
  '/projects': 'Every project you can access',
  '/reports': 'Track statuses and due dates within your access scope',
  '/notifications': 'Updates on tasks you follow',
  '/teams': 'People and responsibilities across teams',
  '/trash': 'Restore deleted tasks within 30 days',
  '/users': 'Manage members, teams, job titles and permissions',
  '/settings': 'Manage your profile and preferences',
};
const navLabels: Record<string, string> = {
  '/projects': 'All projects',
  '/calendar': 'Work calendar',
  '/reports': 'Reports overview',
  '/teams': 'Teams & members',
};
function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
function NavIcon({ path }: { path?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}
const navIcons: Record<string, string> = {
  help: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01',
  logout: 'M9 21H5V3h4M16 17l5-5-5-5M21 12H9',
  project: 'M3 4h18v16H3zM3 10h18M9 4v16',
  '/': 'M3 11 12 3l9 8M5 9v12h5v-7h4v7h5V9',
  '/my-tasks': 'M4 5h16v16H4zM8 3v4m8-4v4M8 13l2 2 5-5',
  '/projects': 'M3 7h7l2-3h9v16H3z',
  '/calendar': 'M3 5h18v16H3zM3 10h18M8 3v4m8-4v4M7 14h2m6 0h2m-10 4h2',
  '/reports': 'M4 3v18h17M8 17v-5m5 5V8m5 9V5',
  '/notifications': 'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5zM10 21h4',
  '/teams':
    'M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M2 21v-3a6 6 0 0 1 12 0v3m3-16a4 4 0 0 1 0 8m1 3a5 5 0 0 1 4 5',
  '/trash': 'M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7',
  '/users': 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21v-2a8 8 0 0 1 16 0v2',
  '/settings':
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z',
};
