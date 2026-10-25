import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { isValidElement, type ReactNode } from 'react';
import { selfFixture } from './test-fixtures';
import type { Self } from './api';
import type { Project } from './workspace-api';

// Exercise App's actual effects in the existing Node-only test environment. Child
// components are inspected as elements; DOM interaction remains a browser gate.
const h = vi.hoisted(() => ({
  slots: [] as { value?: unknown; deps?: unknown[]; cleanup?: () => void }[],
  index: 0,
  dirty: false,
  effects: [] as (() => void)[],
  fetch: vi.fn<typeof fetch>(),
  readers: new Set<(signal: AbortSignal) => void | Promise<void>>(),
  path: '/trash',
  writable: true,
}));
vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const slot = () => h.slots[h.index++] ?? (h.slots[h.index - 1] = {});
  const changed = (a?: unknown[], b?: unknown[]) =>
    !a || !b || a.length !== b.length || a.some((v, i) => !Object.is(v, b[i]));
  return {
    ...actual,
    useState(initial: unknown) {
      const s = slot();
      if (!('value' in s)) s.value = typeof initial === 'function' ? initial() : initial;
      return [
        s.value,
        (next: unknown) => {
          const value = typeof next === 'function' ? next(s.value) : next;
          if (!Object.is(value, s.value)) {
            s.value = value;
            h.dirty = true;
          }
        },
      ];
    },
    useRef(initial: unknown) {
      const s = slot();
      return s.value ?? (s.value = { current: initial });
    },
    useCallback(fn: unknown, deps: unknown[]) {
      const s = slot();
      if (changed(s.deps, deps)) {
        s.value = fn;
        s.deps = deps;
      }
      return s.value;
    },
    useEffect(effect: () => void | (() => void), deps?: unknown[]) {
      const s = slot();
      if (changed(s.deps, deps)) {
        s.deps = deps;
        h.effects.push(() => {
          s.cleanup?.();
          s.cleanup = effect() || undefined;
        });
      }
    },
  };
});
vi.mock('react-router-dom', async (original) => ({
  ...(await original<typeof import('react-router-dom')>()),
  useLocation: () => ({ pathname: h.path }),
  useNavigate: () => () => {},
}));
vi.mock('./api', async (original) => {
  const actual = await original<typeof import('./api')>();
  return { ...actual, apiClient: () => actual.apiClient(h.fetch, () => true) };
});
vi.mock('./shared/refresh', () => ({
  subscribeRefresh: (read: (signal: AbortSignal) => void | Promise<void>) => {
    h.readers.add(read);
    return () => h.readers.delete(read);
  },
  refreshCurrentReaders: () =>
    Promise.all([...h.readers].map((r) => r(new AbortController().signal))),
}));
vi.mock('./shared/connection', () => ({
  useWritable: () => h.writable,
  setWritable: (value: boolean) => {
    if (h.writable !== value) {
      h.writable = value;
      h.dirty = true;
    }
  },
  canWrite: () => h.writable,
}));
vi.mock('./favorites-api', () => ({ useFavorites: () => ({ items: [] }) }));
vi.mock('./preferences', () => ({ usePreferences: () => {} }));
vi.mock('./motion', () => ({ motionAllowed: () => false }));
import { App } from './App';
import { Trash } from './Trash';
import { Loading, EmptyState, ErrorNotice } from './shared/components';

let self: Self;
let tree: ReactNode;
let renderedTrash: boolean[] = [];
let projectRead: (url: URL, signal?: AbortSignal | null) => unknown | Promise<unknown>;
const page = (items: Project[] = [], n = 1, total = items.length) => ({
  items,
  page: n,
  pageSize: 100,
  total,
});
function project(
  id = 1,
  access: Project['effective_access'] = 'manager',
  archived = false,
): Project {
  return {
    id,
    owner_team_id: 1,
    owner_team_name: 'Private owner',
    name: `Private project ${id}`,
    description: '',
    project_type: 'internal',
    project_category: 'general',
    code: null,
    archived_at: archived ? '2026-10-01T00:00:00.000Z' : null,
    version: 1,
    created_by: 1,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    effective_access: access,
  };
}
function render() {
  h.index = 0;
  h.dirty = false;
  tree = App();
  renderedTrash.push(has(Trash));
  const effects = h.effects.splice(0);
  effects.forEach((effect) => effect());
}
async function flush() {
  for (let i = 0; i < 40; i++) {
    await Promise.resolve();
    if (h.dirty) render();
  }
}
function elements(
  node: ReactNode,
): { type: unknown; props: Record<string, unknown>; key: unknown }[] {
  if (Array.isArray(node)) return node.flatMap((n) => elements(n));
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  return [{ type: node.type, props: node.props, key: node.key }, ...elements(node.props.children)];
}
const has = (type: unknown) => elements(tree).some((e) => e.type === type);
const trashLink = () => elements(tree).some((e) => e.props.to === '/trash');
const scopedCalls = () =>
  h.fetch.mock.calls.filter(([url]) => String(url).includes('includeArchived=true'));
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
beforeEach(() => {
  h.slots = [];
  h.index = 0;
  h.dirty = false;
  h.effects = [];
  h.readers.clear();
  h.path = '/trash';
  h.writable = true;
  renderedTrash = [];
  self = selfFixture();
  self.user.permission_keys = ['P-04'];
  projectRead = () => page([project()]);
  const win = Object.assign(new EventTarget(), {
    location: { search: '' },
    history: { replaceState() {} },
  });
  vi.stubGlobal('window', win);
  vi.stubGlobal(
    'document',
    Object.assign(new EventTarget(), { hidden: false, getElementById: () => null }),
  );
  vi.stubGlobal('navigator', { onLine: true });
  vi.stubGlobal('BroadcastChannel', undefined);
  h.fetch.mockReset().mockImplementation(async (input, init) => {
    const url = new URL(String(input), 'http://friday.local');
    let body: unknown = {};
    if (url.pathname === '/api/meta') body = { setupRequired: false, version: 'fixture' };
    else if (url.pathname === '/api/me') body = structuredClone(self);
    else if (url.pathname === '/api/organization')
      body = {
        item: {
          id: 1,
          name: 'Workspace',
          timezone: 'Asia/Bangkok',
          workload_threshold: 5,
          version: 1,
        },
      };
    else if (url.pathname === '/api/projects')
      body = url.searchParams.has('includeArchived')
        ? await projectRead(url, init?.signal)
        : page([]);
    if (body instanceof Response) return body;
    return Response.json(body);
  });
});
afterEach(() => {
  h.slots.forEach((s) => s.cleanup?.());
  vi.unstubAllGlobals();
});

test('plain P-04 manager gets the shared sidebar and cold direct route after a separate scoped read', async () => {
  render();
  await flush();
  expect(scopedCalls().length).toBeGreaterThan(0);
  expect(trashLink()).toBe(true);
  expect(has(Trash)).toBe(true);
  expect(h.fetch.mock.calls.some(([url]) => url === '/api/projects?pageSize=100')).toBe(true);
});

test('manager after the first 100 readable projects is found without adding archived boards to sidebar', async () => {
  projectRead = (url) =>
    Number(url.searchParams.get('page')) === 1
      ? page(
          Array.from({ length: 100 }, (_, i) => project(i + 1, 'viewer')),
          1,
          101,
        )
      : page([project(101, 'manager', true)], 2, 101);
  render();
  await flush();
  expect(
    scopedCalls().map(([url]) => new URL(String(url), 'http://local').searchParams.get('page')),
  ).toEqual(['1', '2']);
  expect(trashLink()).toBe(true);
  expect(has(Trash)).toBe(true);
  expect(elements(tree).some((e) => e.props.to === '/projects?project=101')).toBe(false);
});

test('all readable pages are exhausted before a P-04 viewer is denied', async () => {
  projectRead = (url) =>
    Number(url.searchParams.get('page')) === 1
      ? page(
          Array.from({ length: 100 }, (_, i) => project(i + 1, 'viewer')),
          1,
          101,
        )
      : page([project(101, 'editor')], 2, 101);
  render();
  await flush();
  expect(scopedCalls()).toHaveLength(2);
  expect(trashLink()).toBe(false);
  expect(has(Trash)).toBe(false);
  expect(
    elements(tree).some(
      (e) => e.type === EmptyState && e.props.title === 'You do not have access to this page',
    ),
  ).toBe(true);
});

async function refreshSelf() {
  await Promise.all([...h.readers].map((r) => r(new AbortController().signal)));
  await flush();
}
function retryScope() {
  const notice = elements(tree).find((e) => e.type === ErrorNotice);
  expect(notice).toBeDefined();
  (notice!.props.retry as () => void)();
}

test('pending cold scope stays loading with no denial, names or private child; transient failure retries safely', async () => {
  const held = deferred<unknown>();
  projectRead = () => held.promise;
  render();
  await flush();
  expect(has(Loading)).toBe(true);
  expect(has(EmptyState)).toBe(false);
  expect(has(Trash)).toBe(false);
  expect(trashLink()).toBe(false);
  held.resolve(new Response('upstream Private project 1 SQL SECRET', { status: 503 }));
  await flush();
  expect(has(ErrorNotice)).toBe(true);
  expect(has(EmptyState)).toBe(false);
  expect(JSON.stringify(tree)).not.toContain('SQL SECRET');
  projectRead = () => page([project()]);
  retryScope();
  await flush();
  expect(has(Trash)).toBe(true);
  expect(trashLink()).toBe(true);
});

test.each(['editor', 'viewer', 'empty'] as const)(
  'P-04 %s and job title Lead do not imply manager access',
  async (role) => {
    self.user.job_title = 'Lead';
    self.user.job_title_id = 1;
    self.user.teams = [{ id: 1, name: 'Team', team_role: 'member', team_position: 'lead' }];
    projectRead = () => page(role === 'empty' ? [] : [project(1, role)]);
    render();
    await flush();
    expect(has(Trash)).toBe(false);
    expect(trashLink()).toBe(false);
    expect(has(EmptyState)).toBe(true);
  },
);

test.each([
  'no-P04',
  'admin',
  'access-lead',
  'inactive',
  'self-password',
  'user-password',
] as const)('%s retains existing gates without a scoped lookup', async (kind) => {
  if (kind === 'no-P04') self.user.permission_keys = [];
  if (kind === 'admin') self.user.org_role = 'admin';
  if (kind === 'access-lead') self.effective_summary.lead_team_ids = [9];
  if (kind === 'inactive') self.user.active = false;
  if (kind === 'self-password') self.must_change_password = true;
  if (kind === 'user-password') self.user.must_change_password = true;
  render();
  await flush();
  expect(scopedCalls()).toHaveLength(0);
  expect(has(Trash)).toBe(['admin', 'access-lead'].includes(kind));
  expect(trashLink()).toBe(['admin', 'access-lead'].includes(kind));
});

test.each(['revision', 'actor', 'session', 'password', 'inactive', 'revoke'] as const)(
  'held second page cannot allow after %s invalidation',
  async (change) => {
    const held = deferred<unknown>();
    let oldSignal: AbortSignal | null | undefined;
    projectRead = (url, signal) => {
      if (url.searchParams.get('page') === '1') return page([project(1, 'viewer')], 1, 101);
      oldSignal = signal;
      return held.promise;
    };
    render();
    await flush();
    expect(oldSignal).toBeDefined();
    if (change === 'revision') self.view_revision = '00000000-0000-4000-8000-000000000002';
    if (change === 'actor') self.user.id = 2;
    if (change === 'session') self.csrf = 'different-fixture-session-00000000000';
    if (change === 'password') self.must_change_password = true;
    if (change === 'inactive') self.user.active = false;
    if (change === 'revoke') self.user.permission_keys = [];
    projectRead = () => page([]);
    await refreshSelf();
    expect(oldSignal?.aborted).toBe(true);
    held.resolve(page([project(101)], 2, 101));
    await flush();
    expect(trashLink()).toBe(false);
    expect(has(Trash)).toBe(false);
  },
);

test('view_revision invalidation unmounts private Trash and changes its identity on fresh allow', async () => {
  render();
  await flush();
  const previous = elements(tree).find((e) => e.type === Trash)?.key;
  const held = deferred<unknown>();
  projectRead = () => held.promise;
  self.view_revision = '00000000-0000-4000-8000-000000000002';
  await refreshSelf();
  expect(has(Trash)).toBe(false);
  expect(has(Loading)).toBe(true);
  held.resolve(page([project()]));
  await flush();
  expect(has(Trash)).toBe(true);
  expect(elements(tree).find((e) => e.type === Trash)?.key).not.toBe(previous);
});

test('unmount aborts a held scoped lookup and late completion publishes no state', async () => {
  const held = deferred<unknown>();
  let signal: AbortSignal | null | undefined;
  projectRead = (_url, s) => {
    signal = s;
    return held.promise;
  };
  render();
  await flush();
  h.slots.forEach((s) => s.cleanup?.());
  h.dirty = false;
  expect(signal?.aborted).toBe(true);
  held.resolve(page([project()]));
  await flush();
  expect(h.dirty).toBe(false);
  expect(has(Trash)).toBe(false);
});

test('focus revalidation aborts an old page even when the opaque revision is unchanged', async () => {
  const held = deferred<unknown>();
  let signal: AbortSignal | null | undefined;
  projectRead = (_url, s) => {
    signal = s;
    return held.promise;
  };
  render();
  await flush();
  projectRead = () => page([]);
  window.dispatchEvent(new Event('focus'));
  await flush();
  expect(signal?.aborted).toBe(true);
  held.resolve(page([project()]));
  await flush();
  expect(has(Trash)).toBe(false);
  expect(trashLink()).toBe(false);
});

test('disconnect/reconnect discards held old pages and clears a previously allowed private child', async () => {
  render();
  await flush();
  expect(has(Trash)).toBe(true);
  const held = deferred<unknown>();
  let oldSignal: AbortSignal | null | undefined;
  projectRead = (_url, signal) => {
    oldSignal = signal;
    return held.promise;
  };
  window.dispatchEvent(new Event('focus'));
  await flush();
  expect(has(Trash)).toBe(false);
  Object.assign(navigator, { onLine: false });
  window.dispatchEvent(new Event('offline'));
  await flush();
  expect(oldSignal?.aborted).toBe(true);
  projectRead = () => page([]);
  Object.assign(navigator, { onLine: true });
  window.dispatchEvent(new Event('online'));
  await flush();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await flush();
  held.resolve(page([project()]));
  await flush();
  expect(has(Trash)).toBe(false);
  expect(trashLink()).toBe(false);
  expect(has(EmptyState)).toBe(true);
});

test.each([401, 403, 404])(
  'scoped HTTP %s cannot mount private Trash or disclose server detail',
  async (status) => {
    projectRead = () => new Response('Private project 1 SECRET', { status });
    render();
    await flush();
    expect(has(Trash)).toBe(false);
    expect(trashLink()).toBe(false);
    expect(JSON.stringify(tree)).not.toContain('SECRET');
    if (status === 401) expect(has(Loading)).toBe(false);
    else expect(has(EmptyState)).toBe(true);
  },
);

test('logout followed by another account rejects a held old manager page', async () => {
  const held = deferred<unknown>();
  let oldSignal: AbortSignal | null | undefined;
  projectRead = (_url, signal) => {
    oldSignal = signal;
    return held.promise;
  };
  render();
  await flush();
  // A failed authenticated request uses the same clear path as expiry/logout.
  const notify = elements(tree).find((e) => typeof e.props.onFailure === 'function');
  const { ApiError } = await import('./api');
  (notify!.props.onFailure as (e: InstanceType<typeof ApiError>) => void)(
    new ApiError('session', 401, undefined, {}, 'UNAUTHENTICATED'),
  );
  await flush();
  expect(oldSignal?.aborted).toBe(true);
  const login = elements(tree).find((e) => typeof e.props.onDone === 'function');
  self = selfFixture();
  self.user.id = 2;
  self.csrf = 'different-fixture-session-00000000000';
  self.user.permission_keys = ['P-04'];
  projectRead = () => page([]);
  (login!.props.onDone as (s: Self) => void)(self);
  await flush();
  held.resolve(page([project()]));
  await flush();
  expect(trashLink()).toBe(false);
  expect(has(Trash)).toBe(false);
});

test.each([403, 404])(
  'Trash HTTP %s invalidates a positive snapshot even when /me is unchanged; recovery requires explicit retry',
  async (status) => {
    render();
    await flush();
    expect(has(Trash)).toBe(true);
    const child = elements(tree).find((e) => e.type === Trash)!;
    const { ApiError } = await import('./api');
    (child.props.onFailure as (e: InstanceType<typeof ApiError>) => void)(
      new ApiError(
        status === 403 ? 'forbidden' : 'not-found',
        status,
        undefined,
        {},
        status === 403 ? 'FORBIDDEN' : 'NOT_FOUND',
      ),
    );
    await flush();
    expect(trashLink()).toBe(false);
    expect(has(Trash)).toBe(false);
    expect(has(ErrorNotice)).toBe(true);
    const before = scopedCalls().length;
    await refreshSelf();
    expect(scopedCalls()).toHaveLength(before);
    retryScope();
    await flush();
    expect(has(Trash)).toBe(true);
  },
);

test('clearing a password gate cannot briefly remount Trash from the previous positive snapshot', async () => {
  render();
  await flush();
  expect(has(Trash)).toBe(true);
  self.must_change_password = true;
  await refreshSelf();
  expect(has(Trash)).toBe(false);
  const held = deferred<unknown>();
  projectRead = () => held.promise;
  renderedTrash = [];
  self.must_change_password = false;
  await refreshSelf();
  expect(renderedTrash.some(Boolean)).toBe(false);
  held.resolve(page([]));
  await flush();
  expect(has(Trash)).toBe(false);
});

test('permission version changes reject the positive snapshot in the first render before effects commit', async () => {
  render();
  await flush();
  expect(has(Trash)).toBe(true);
  const held = deferred<unknown>();
  projectRead = () => held.promise;
  renderedTrash = [];
  self.user.permissions_version++;
  await refreshSelf();
  expect(renderedTrash.some(Boolean)).toBe(false);
  held.resolve(page([]));
  await flush();
  expect(has(Trash)).toBe(false);
});

test('reconnect remains pending through the bounded read-failure retry, then denies without accepting the old page', async () => {
  vi.useFakeTimers();
  try {
    const oldPage = deferred<unknown>();
    projectRead = () => oldPage.promise;
    render();
    await flush();
    Object.assign(navigator, { onLine: false });
    window.dispatchEvent(new Event('offline'));
    await flush();
    projectRead = () => page([]);
    const firstMe = deferred<Response>();
    const normally = h.fetch.getMockImplementation()!;
    let holdMe = true;
    h.fetch.mockImplementation((input, init) => {
      if (String(input) === '/api/me' && holdMe) {
        holdMe = false;
        return firstMe.promise;
      }
      if (String(input) === '/api/transient')
        return Promise.resolve(new Response('', { status: 503 }));
      return normally(input, init);
    });
    Object.assign(navigator, { onLine: true });
    window.dispatchEvent(new Event('online'));
    await flush();
    expect(holdMe).toBe(false);
    const { apiClient } = await import('./api');
    await expect(
      apiClient().request('/api/transient', { parse: (value) => value }),
    ).rejects.toMatchObject({ status: 503 });
    firstMe.resolve(Response.json(self));
    await flush();
    await vi.advanceTimersByTimeAsync(0);
    await flush();
    const checking = () =>
      elements(tree).some(
        (e) => e.props.children === 'Checking for updates before enabling changes',
      );
    expect(checking()).toBe(true);
    expect(has(EmptyState)).toBe(false);
    expect(has(Trash)).toBe(false);
    await vi.advanceTimersByTimeAsync(4999);
    await flush();
    expect(checking()).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    await flush();
    // The reconnect reader yields one event-loop turn before refreshing resources.
    await vi.advanceTimersByTimeAsync(1);
    await flush();
    expect(checking()).toBe(false);
    expect(has(EmptyState)).toBe(true);
    oldPage.resolve(page([project()]));
    await flush();
    expect(trashLink()).toBe(false);
    expect(has(Trash)).toBe(false);
  } finally {
    vi.useRealTimers();
  }
});
