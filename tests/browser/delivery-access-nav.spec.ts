import {
  test,
  expect,
  type Browser,
  type Page,
  type Route,
  type APIResponse,
} from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { projectFixture, mutate } from './task-workspace-fixtures.js';
import { fixtureDatabase } from '../setup/fixtures.js';
import { sql } from '../../src/repository/access-scope.js';

// TC-087/088/089 → AT-32; supplemental TC-034 → AT-13. Host builds and
// supplies the disposable fixture/ports. Every role and negative uses the real API.
test.use({ serviceWorkers: 'block' });
const password = 'Workspace-admin-fixture-password';
async function navFixture(
  admin: Page,
  browser: Browser,
  options: {
    role?: 'manager' | 'editor' | 'viewer' | 'unrelated';
    keys?: string[];
    paginated?: boolean;
  } = {},
) {
  const f = await projectFixture(admin);
  const context = await browser.newContext({ serviceWorkers: 'block' });
  try {
    const hiddenTeam = await mutate(admin, '/api/teams', { name: 'Hidden team' });
    expect(hiddenTeam.status).toBe(201);
    const hiddenProject = await mutate(admin, '/api/projects', {
      name: 'Hidden NAV project',
      owner_team_id: hiddenTeam.body.item.id,
    });
    expect(hiddenProject.status).toBe(201);
    const role = options.role ?? 'manager',
      keys = options.keys ?? ['P-04'];
    const project = options.paginated
      ? { ...f.project, id: 200, name: 'Managed archived ภาษาไทย 🧭' }
      : f.project;
    const db = await fixtureDatabase(f);
    try {
      await db.transaction(async (tx) => {
        await tx.execute(
          sql(
            "INSERT INTO dbo.users(id,username,display_name,password_hash,must_change_password) SELECT 2,'NavActor','NavActor',password_hash,0 FROM dbo.users WHERE id=1",
          ),
        );
        await tx.execute(
          sql('INSERT INTO dbo.user_view_revisions(user_id,revision) VALUES(2,@revision)', {
            revision: randomUUID(),
          }),
        );
        // A job title and team_position named Lead are never access Lead grants.
        await tx.execute(sql("INSERT INTO dbo.job_titles(id,name) VALUES(99,'Lead')"));
        await tx.execute(sql('UPDATE dbo.users SET job_title_id=99 WHERE id=2'));
        await tx.execute(
          sql(
            "INSERT INTO dbo.team_members(team_id,user_id,team_role,team_position) VALUES(@team,2,'member','lead')",
            { team: f.project.owner_team_id },
          ),
        );
        for (const key of keys)
          await tx.execute(
            sql(
              'INSERT INTO dbo.user_permissions(user_id,permission_key,granted_by,granted_at) VALUES(2,@key,1,@now)',
              { key, now: new Date().toISOString() },
            ),
          );
        if (options.paginated) {
          // Exactly 100 readable Viewer projects precede the sole managed project.
          for (const id of [...Array.from({ length: 99 }, (_, i) => i + 10), 200]) {
            await tx.execute(
              sql(
                'INSERT INTO dbo.projects(id,owner_team_id,name,created_by) VALUES(@id,@team,@name,1)',
                {
                  id,
                  team: f.project.owner_team_id,
                  name: id === 200 ? project.name : `Readable ${id}`,
                },
              ),
            );
            await tx.execute(
              sql(
                'INSERT INTO dbo.project_members(project_id,user_id,access,added_by) VALUES(@id,2,@access,1)',
                { id, access: id === 200 ? 'manager' : 'viewer' },
              ),
            );
            for (const status of ['todo', 'doing', 'review', 'done'])
              await tx.execute(
                sql('INSERT INTO dbo.board_columns(project_id,status) VALUES(@id,@status)', {
                  id,
                  status,
                }),
              );
          }
        }
        if (role !== 'unrelated')
          await tx.execute(
            sql(
              'INSERT INTO dbo.project_members(project_id,user_id,access,added_by) VALUES(@id,2,@access,1)',
              { id: f.project.id, access: options.paginated ? 'viewer' : role },
            ),
          );
        await tx.execute(
          sql(
            "INSERT INTO dbo.users(id,username,display_name,password_hash,must_change_password) SELECT 3,'NavViewer','NavViewer',password_hash,0 FROM dbo.users WHERE id=1",
          ),
        );
        await tx.execute(
          sql('INSERT INTO dbo.user_view_revisions(user_id,revision) VALUES(3,@revision)', {
            revision: randomUUID(),
          }),
        );
        await tx.execute(
          sql(
            "INSERT INTO dbo.user_permissions(user_id,permission_key,granted_by,granted_at) VALUES(3,'P-04',1,@now)",
            { now: new Date().toISOString() },
          ),
        );
        await tx.execute(
          sql(
            "INSERT INTO dbo.project_members(project_id,user_id,access,added_by) VALUES(@id,3,'viewer',1)",
            { id: f.project.id },
          ),
        );
      });
    } finally {
      await db.close();
    }
    const actor = await context.newPage();
    const login = async (path = '/') => {
      await actor.goto(`${f.env.APP_ORIGIN}${path}`);
      await actor.getByLabel('Username', { exact: true }).fill('NavActor');
      await actor.getByLabel('Password', { exact: true }).fill(password);
      await actor.getByRole('button', { name: 'Sign in', exact: true }).click();
      await expect(actor.getByRole('button', { name: /^Profile of / })).toBeVisible();
    };
    return {
      ...f,
      project,
      hiddenProject: hiddenProject.body.item,
      actor,
      context,
      login,
      close: async () => {
        try {
          await context.close();
        } finally {
          await f.close();
        }
      },
    };
  } catch (e) {
    await context.close();
    await f.close();
    throw e;
  }
}
async function deleted(admin: Page, project: number, title: string) {
  const task = await mutate(admin, '/api/tasks', { project_id: project, title });
  expect(task.status).toBe(201);
  const removed = await mutate(
    admin,
    `/api/tasks/${task.body.item.id}`,
    { version: task.body.item.version },
    'DELETE',
  );
  expect(removed.status).toBe(200);
  return removed.body.item as { id: number; version: number };
}
async function revoke(admin: Page, origin: string, keys: string[] = []) {
  const response = await admin.request.get(`${origin}/api/users/2/permissions`);
  expect(response.status()).toBe(200);
  const saved = await mutate(
    admin,
    '/api/users/2/permissions',
    { keys, permissions_version: (await response.json()).permissions_version },
    'PUT',
  );
  expect(saved.status).toBe(200);
}
async function openTrash(actor: Page) {
  const link = actor.getByRole('link', { name: 'Trash', exact: true });
  const toggle = actor.getByRole('button', { name: 'Toggle navigation', exact: true });
  if (await toggle.isVisible()) await toggle.click();
  await expect(link).toBeVisible();
  await link.click();
  await expect(actor.getByRole('button', { name: 'Refresh trash', exact: true })).toBeVisible();
}
const scopeRequest = (url: string) => {
  const u = new URL(url);
  return u.pathname === '/api/projects' && u.searchParams.get('includeArchived') === 'true';
};

test('plain manager menu and cold direct route show only scoped rows/count; restore is rejected after real revoke', async ({
  page,
  browser,
}) => {
  const f = await navFixture(page, browser);
  try {
    const task = await deleted(page, f.project.id, 'Scoped deleted ภาษาไทย 🧭');
    const hidden = await deleted(page, f.hiddenProject.id, 'Hidden NAV task');
    await f.login();
    await openTrash(f.actor);
    await expect(f.actor.getByText('Scoped deleted ภาษาไทย 🧭', { exact: true })).toBeVisible();
    // The shared single-page pager is deliberately hidden by vibe.css. Verify
    // the visible table and its complete row set; the real API total stays below.
    const table = f.actor.getByRole('table', { name: 'Trashed tasks', exact: true });
    await expect(table).toBeVisible();
    await expect(table.locator('tbody tr')).toHaveCount(1);
    await expect(
      table.getByRole('cell', { name: 'Scoped deleted ภาษาไทย 🧭', exact: true }),
    ).toBeVisible();
    await expect(f.actor.getByText('Hidden NAV task', { exact: true })).toHaveCount(0);
    await expect(f.actor.getByText('Hidden NAV project', { exact: true })).toHaveCount(0);
    const list = await f.actor.request.get(`${f.env.APP_ORIGIN}/api/trash`);
    expect(list.status()).toBe(200);
    const body = await list.json();
    expect(body.total).toBe(1);
    expect(body.items.map((t: { id: number }) => t.id)).toEqual([task.id]);
    expect(
      (await mutate(f.actor, `/api/tasks/${hidden.id}/restore`, { version: hidden.version }))
        .status,
    ).toBe(404);
    await f.actor.goto(`${f.env.APP_ORIGIN}/trash`);
    await f.actor.getByRole('button', { name: `Restore task #${task.id}`, exact: true }).click();
    await revoke(page, f.env.APP_ORIGIN);
    // Direct real request proves the mutation boundary even if /me refresh has already hidden the UI.
    expect(
      (await mutate(f.actor, `/api/tasks/${task.id}/restore`, { version: task.version })).status,
    ).toBe(404);
    expect((await f.actor.request.get(`${f.env.APP_ORIGIN}/api/trash`)).status()).toBe(403);
    await f.actor.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(
      f.actor.getByRole('dialog', { name: 'Confirm task restore', exact: true }),
    ).toHaveCount(0);
    await expect(f.actor.getByText('Scoped deleted ภาษาไทย 🧭', { exact: true })).toHaveCount(0);
    await expect(f.actor.getByText(/Total \d+ Tasks/)).toHaveCount(0);
    await expect(f.actor.getByRole('link', { name: 'Trash', exact: true })).toHaveCount(0);
  } finally {
    await f.close();
  }
});

for (const row of [
  { role: 'editor', keys: ['P-04'] },
  { role: 'viewer', keys: ['P-04'] },
  { role: 'unrelated', keys: ['P-04'] },
  { role: 'manager', keys: ['P-01'] },
] as const) {
  test(`P-04 boundaries: ${row.role} with ${row.keys.join(',')} is denied despite Lead job title/position`, async ({
    page,
    browser,
  }) => {
    const f = await navFixture(page, browser, { role: row.role, keys: [...row.keys] });
    try {
      const task = await deleted(page, f.project.id, 'Denied private task');
      await f.login('/trash');
      await expect(
        f.actor.getByRole('heading', { name: 'You do not have access to this page', exact: true }),
      ).toBeVisible();
      await expect(f.actor.getByRole('link', { name: 'Trash', exact: true })).toHaveCount(0);
      await expect(f.actor.getByText('Denied private task', { exact: true })).toHaveCount(0);
      const self = await (await f.actor.request.get(`${f.env.APP_ORIGIN}/api/me`)).json();
      expect(self.effective_summary.lead_team_ids).toEqual([]);
      expect(self.user.job_title).toBe('Lead');
      expect(self.user.teams[0].team_position).toBe('lead');
      expect((await f.actor.request.get(`${f.env.APP_ORIGIN}/api/trash`)).status()).toBe(403);
      expect(
        (await mutate(f.actor, `/api/tasks/${task.id}/restore`, { version: task.version })).status,
      ).toBe(404);
    } finally {
      await f.close();
    }
  });
}

test('page two archived-only manager is reachable but archived boards and restore authority stay unchanged', async ({
  page,
  browser,
}) => {
  const f = await navFixture(page, browser, { paginated: true });
  const pages = new Set<string | null>();
  f.actor.on('request', (r) => {
    if (scopeRequest(r.url())) pages.add(new URL(r.url()).searchParams.get('page'));
  });
  try {
    const task = await deleted(page, f.project.id, 'Archived managed task');
    expect(
      (await mutate(page, `/api/projects/${f.project.id}`, { version: 1, archived: true }, 'PATCH'))
        .status,
    ).toBe(200);
    await f.login('/trash');
    await expect(f.actor.getByText('Archived managed task', { exact: true })).toBeVisible();
    expect(pages.has('2')).toBe(true);
    const p1 = await f.actor.request.get(
      `${f.env.APP_ORIGIN}/api/projects?includeArchived=true&pageSize=100&page=1`,
    );
    const p2 = await f.actor.request.get(
      `${f.env.APP_ORIGIN}/api/projects?includeArchived=true&pageSize=100&page=2`,
    );
    expect(
      (await p1.json()).items.every(
        (p: { effective_access: string }) => p.effective_access === 'viewer',
      ),
    ).toBe(true);
    expect(
      (await p2.json()).items.some(
        (p: { id: number; effective_access: string }) =>
          p.id === 200 && p.effective_access === 'manager',
      ),
    ).toBe(true);
    await expect(
      f.actor.locator('#workspace-navigation').getByText(f.project.name, { exact: true }),
    ).toHaveCount(0);
    await expect(
      f.actor.getByRole('button', { name: `Restore task #${task.id}`, exact: true }),
    ).toBeDisabled();
    const denied = await mutate(f.actor, `/api/tasks/${task.id}/restore`, {
      version: task.version,
    });
    expect(denied.status).toBe(422);
    expect(denied.body.error.code).toBe('PROJECT_ARCHIVED');
    expect(
      (await mutate(page, `/api/tasks/${task.id}/restore`, { version: task.version })).status,
    ).toBe(200);
  } finally {
    await f.close();
  }
});

test('cold pending scope has no denial or private content; transient failure offers safe retry and empty Trash opens', async ({
  page,
  browser,
}) => {
  const f = await navFixture(page, browser);
  let held: Route | undefined;
  try {
    await f.actor.route('**/api/projects?*', (route) => {
      if (!scopeRequest(route.request().url())) return route.continue();
      held = route;
    });
    await f.login('/trash');
    await expect.poll(() => !!held).toBe(true);
    await expect(
      f.actor.getByRole('heading', { name: 'You do not have access to this page', exact: true }),
    ).toHaveCount(0);
    await expect(f.actor.getByRole('status').filter({ hasText: 'Loading…' })).toBeVisible();
    await expect(f.actor.locator('.trash-workspace')).toHaveCount(0);
    await held!.fulfill({
      status: 503,
      json: {
        error: {
          code: 'DATABASE_BUSY',
          requestId: randomUUID(),
          message: 'SECRET project count 101',
        },
      },
    });
    held = undefined;
    await expect(f.actor.getByRole('alert')).toBeVisible();
    await expect(f.actor.getByText(/SECRET project count/)).toHaveCount(0);
    await f.actor.unroute('**/api/projects?*');
    await f.actor.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(f.actor.getByText('Trash is empty', { exact: true })).toBeVisible();
    expect((await f.actor.request.get(`${f.env.APP_ORIGIN}/api/trash`)).status()).toBe(200);
  } finally {
    if (held) await held.abort().catch(() => {});
    await f.close();
  }
});

for (const change of ['revision', 'reconnect', 'revoke'] as const) {
  test(`held old page two cannot restore navigation after ${change}`, async ({ page, browser }) => {
    const f = await navFixture(page, browser, { paginated: true });
    let held: { route: Route; response: APIResponse } | undefined;
    try {
      await f.actor.route('**/api/projects?*', async (route) => {
        const u = new URL(route.request().url());
        if (!scopeRequest(u.href) || u.searchParams.get('page') !== '2') return route.continue();
        const response = await route.fetch();
        held = { route, response };
      });
      await f.login('/trash');
      await expect.poll(() => !!held).toBe(true);
      // Change authority through the real API, giving /me a new opaque revision.
      const members = await page.request.get(`${f.env.APP_ORIGIN}/api/projects/200/members`);
      expect(
        (
          await mutate(
            page,
            '/api/projects/200/members/2',
            { version: (await members.json()).membership_version },
            'DELETE',
          )
        ).status,
      ).toBe(200);
      if (change === 'revoke') await revoke(page, f.env.APP_ORIGIN);
      await f.actor.unroute('**/api/projects?*');
      if (change === 'reconnect') {
        await f.context.setOffline(true);
        // Observe the committed offline state before restoring transport. Do not
        // send a duplicate synthetic online event while reconnect is in flight.
        await expect(
          f.actor.getByRole('status').filter({ hasText: 'Connect to save changes.' }),
        ).toBeVisible();
        await expect(f.actor.locator('.trash-workspace')).toHaveCount(0);
      }
      const refreshed = f.actor.waitForResponse(
        (r) => new URL(r.url()).pathname === '/api/me' && r.status() === 200,
      );
      if (change === 'reconnect') await f.context.setOffline(false);
      else {
        await f.actor.evaluate(() => window.dispatchEvent(new Event('focus')));
      }
      await refreshed;
      if (change === 'reconnect') {
        // /me success precedes the resource refresh barrier. A read failure in
        // that window schedules the existing 5s retry; await recovery explicitly.
        await expect(
          f.actor
            .getByRole('status')
            .filter({ hasText: 'Checking for updates before enabling changes' }),
        ).toHaveCount(0, { timeout: 15000 });
      }
      await expect(
        f.actor.getByRole('heading', { name: 'You do not have access to this page', exact: true }),
      ).toBeVisible();
      // The client has aborted this request; delivering its old successful body must be harmless.
      await held!.route.fulfill({ response: held!.response }).catch(() => {});
      held = undefined;
      await expect(f.actor.getByRole('link', { name: 'Trash', exact: true })).toHaveCount(0);
      await expect(f.actor.locator('.trash-workspace')).toHaveCount(0);
    } finally {
      if (held) await held.route.abort().catch(() => {});
      await f.close();
    }
  });
}

test('real stale restore 409 requires a new explicit confirmation and never upgrades the submitted version', async ({
  page,
  browser,
}) => {
  const f = await navFixture(page, browser);
  const submitted: number[] = [];
  f.actor.on('request', (r) => {
    if (r.method() === 'POST' && /\/restore$/.test(new URL(r.url()).pathname))
      submitted.push(r.postDataJSON().version);
  });
  try {
    const task = await deleted(page, f.project.id, 'Versioned deleted task');
    await f.login('/trash');
    await f.actor.getByRole('button', { name: `Restore task #${task.id}`, exact: true }).click();
    const restored = await mutate(page, `/api/tasks/${task.id}/restore`, { version: task.version });
    expect(restored.status).toBe(200);
    const again = await mutate(
      page,
      `/api/tasks/${task.id}`,
      { version: restored.body.item.version },
      'DELETE',
    );
    expect(again.status).toBe(200);
    const conflict = f.actor.waitForResponse(
      (r) => /\/restore$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST',
    );
    await f.actor.getByRole('button', { name: 'Restore this task', exact: true }).click();
    expect((await conflict).status()).toBe(409);
    await expect(
      f.actor.getByRole('dialog', { name: 'Confirm task restore', exact: true }),
    ).toHaveCount(0);
    await expect(
      f.actor.getByRole('button', { name: `Restore task #${task.id}`, exact: true }),
    ).toBeEnabled();
    expect(submitted).toEqual([task.version]);
    await f.actor.getByRole('button', { name: `Restore task #${task.id}`, exact: true }).click();
    const success = f.actor.waitForResponse(
      (r) => /\/restore$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST',
    );
    await f.actor.getByRole('button', { name: 'Restore this task', exact: true }).click();
    expect((await success).status()).toBe(200);
    expect(submitted).toEqual([task.version, again.body.item.version]);
  } finally {
    await f.close();
  }
});

for (const status of [401, 403, 404]) {
  test(`Trash HTTP ${status} purges rows, count and an open restore dialog despite a late list`, async ({
    page,
    browser,
  }) => {
    const f = await navFixture(page, browser);
    let held: { route: Route; response: APIResponse } | undefined;
    try {
      const task = await deleted(page, f.project.id, 'Private purge task');
      await f.login('/trash');
      await expect(f.actor.getByText('Private purge task', { exact: true })).toBeVisible();
      await f.actor.getByRole('button', { name: `Restore task #${task.id}`, exact: true }).click();
      // Hold a real background list without firing focus (which intentionally revalidates scope).
      await f.actor.route('**/api/trash?*', async (route) => {
        const response = await route.fetch();
        held = { route, response };
      });
      await expect.poll(() => !!held, { timeout: 10000 }).toBe(true);
      await f.actor.route(`**/api/tasks/${task.id}/restore`, (route) =>
        route.fulfill({
          status,
          json: {
            error: {
              code: status === 401 ? 'UNAUTHENTICATED' : status === 403 ? 'FORBIDDEN' : 'NOT_FOUND',
              requestId: randomUUID(),
            },
          },
        }),
      );
      await f.actor.getByRole('button', { name: 'Restore this task', exact: true }).click();
      await expect(
        f.actor.getByRole('dialog', { name: 'Confirm task restore', exact: true }),
      ).toHaveCount(0);
      await held!.route.fulfill({ response: held!.response }).catch(() => {});
      held = undefined;
      await expect(f.actor.getByText('Private purge task', { exact: true })).toHaveCount(0);
      await expect(f.actor.getByText(/Total \d+ Tasks/)).toHaveCount(0);
      await expect(f.actor.getByText(/Restore task #\d+ complete/)).toHaveCount(0);
    } finally {
      if (held) await held.route.abort().catch(() => {});
      await f.close();
    }
  });
}

for (const width of [360, 390, 768, 1440]) {
  test(`${width}px plain manager keyboard Trash navigation and 200% reflow`, async ({
    page,
    browser,
  }) => {
    const f = await navFixture(page, browser);
    try {
      await f.login();
      await f.actor.setViewportSize({ width, height: 900 });
      const link = f.actor.getByRole('link', { name: 'Trash', exact: true });
      const toggle = f.actor.getByRole('button', { name: 'Toggle navigation', exact: true });
      if (await toggle.isVisible()) {
        await toggle.focus();
        await f.actor.keyboard.press('Enter');
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      }
      await link.focus();
      await expect(link).toBeFocused();
      await f.actor.keyboard.press('Enter');
      await expect(f.actor.getByText('Trash is empty', { exact: true })).toBeVisible();
      await expect(f.actor.getByRole('heading', { name: 'Trash', exact: true })).toBeFocused();
      for (const zoom of ['1', '2']) {
        // CSS zoom 2 exercises 200% layout scaling. Native browser zoom remains a host/manual gate.
        await f.actor.evaluate((value) => {
          document.documentElement.style.zoom = value;
        }, zoom);
        await expect(
          f.actor.getByRole('button', { name: 'Refresh trash', exact: true }),
        ).toBeVisible();
        const geometry = await f.actor.evaluate(() => {
          const measure = (el: Element) => {
            const rect = el.getBoundingClientRect(),
              css = getComputedStyle(el);
            return {
              tag: el.tagName,
              id: el.id,
              class: el.getAttribute('class'),
              left: rect.left,
              right: rect.right,
              width: rect.width,
              client: el.clientWidth,
              scroll: el.scrollWidth,
              display: css.display,
              minWidth: css.minWidth,
              flexShrink: css.flexShrink,
              flexWrap: css.flexWrap,
              whiteSpace: css.whiteSpace,
              overflowX: css.overflowX,
            };
          };
          return {
            url: location.pathname,
            zoom: getComputedStyle(document.documentElement).zoom,
            viewport: innerWidth,
            document: document.documentElement.scrollWidth,
            surfaces: [
              ...document.querySelectorAll(
                '.app-layout, .topbar, .topbar > *, .topbar-actions > *, .sidebar, .content, .trash-workspace, .trash-intro, .app-footer',
              ),
            ].map(measure),
            overflowing: [...document.querySelectorAll('body *')]
              .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
              .map(measure)
              .sort((a, b) => b.right - a.right)
              .slice(0, 12),
          };
        });
        await test.info().attach(`nav-${width}-css-zoom-${zoom}-actor-geometry`, {
          body: JSON.stringify(geometry, null, 2),
          contentType: 'application/json',
        });
        if (geometry.document - geometry.viewport > 1)
          await test.info().attach(`nav-${width}-css-zoom-${zoom}-actor`, {
            body: await f.actor.screenshot(),
            contentType: 'image/png',
          });
        expect(geometry.document - geometry.viewport).toBeLessThanOrEqual(1);
        // Keep every control on screen when the header needs multiple rows.
        const controls = [
          f.actor.getByRole('button', { name: 'Help', exact: true }),
          f.actor.getByRole('button', { name: /^Notify/ }),
          f.actor.getByRole('button', { name: 'Profile of NavActor', exact: true }),
        ];
        if (await toggle.isVisible()) controls.unshift(toggle);
        for (const control of controls) {
          await expect(control).toBeInViewport({ ratio: 1 });
          await control.focus();
          await expect(control).toBeFocused();
        }
        if (await toggle.isVisible()) {
          await toggle.focus();
          await f.actor.keyboard.press('Enter');
          await expect(toggle).toHaveAttribute('aria-expanded', 'true');
          const drawer = f.actor.locator('#workspace-navigation');
          const drawerLink = drawer.getByRole('link', { name: 'Trash', exact: true });
          // Focus scrolls within a tall drawer instead of requiring all links to
          // fit simultaneously at 200%; the control must be fully reachable.
          await drawerLink.focus();
          await expect(drawerLink).toBeFocused();
          await expect(drawerLink).toBeInViewport({ ratio: 1 });
          const opened = await f.actor.evaluate(() => {
            const header = document.querySelector('.topbar')!.getBoundingClientRect();
            const sidebar = document
              .querySelector('#workspace-navigation')!
              .getBoundingClientRect();
            return {
              headerBottom: header.bottom,
              top: sidebar.top,
              left: sidebar.left,
              right: sidebar.right,
              viewport: innerWidth,
              overflow: document.documentElement.scrollWidth - innerWidth,
            };
          });
          expect(opened.top).toBeGreaterThanOrEqual(opened.headerBottom - 1);
          expect(opened.left).toBeGreaterThanOrEqual(0);
          expect(opened.right).toBeLessThanOrEqual(opened.viewport + 1);
          expect(opened.overflow).toBeLessThanOrEqual(1);
          await drawerLink.focus();
          await f.actor.keyboard.press('Enter');
          await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        }
      }
      await f.actor.getByRole('button', { name: 'Refresh trash', exact: true }).focus();
      await f.actor.keyboard.press('Enter');
      await expect(f.actor.getByText('Trash is empty', { exact: true })).toBeVisible();
    } finally {
      await f.close();
    }
  });
}

for (const change of ['account', 'password-reset'] as const) {
  test(`held page from the old session cannot grant Trash after ${change}`, async ({
    page,
    browser,
  }) => {
    const f = await navFixture(page, browser, { paginated: true });
    let held: { route: Route; response: APIResponse } | undefined;
    try {
      await f.actor.route('**/api/projects?*', async (route) => {
        const u = new URL(route.request().url());
        if (!scopeRequest(u.href) || u.searchParams.get('page') !== '2') return route.continue();
        const response = await route.fetch();
        held = { route, response };
      });
      await f.login('/trash');
      await expect.poll(() => !!held).toBe(true);
      let loginPassword = password;
      if (change === 'account') {
        const current = await (await f.actor.request.get(`${f.env.APP_ORIGIN}/api/me`)).json();
        const logout = await f.actor.request.post(`${f.env.APP_ORIGIN}/api/logout`, {
          headers: { Origin: f.env.APP_ORIGIN, 'X-CSRF-Token': current.csrf },
        });
        expect(logout.status()).toBe(204);
      } else {
        const users = await page.request.get(`${f.env.APP_ORIGIN}/api/users?pageSize=100`);
        expect(users.status()).toBe(200);
        const actor = (await users.json()).items.find((u: { id: number }) => u.id === 2);
        loginPassword = 'NAV-reset-fixture-password';
        expect(
          (
            await mutate(page, '/api/users/2/reset-password', {
              version: actor.version,
              admin_password: password,
              temp_password: loginPassword,
            })
          ).status,
        ).toBe(200);
      }
      await f.actor.evaluate(() => window.dispatchEvent(new Event('focus')));
      await expect(f.actor.getByLabel('Username', { exact: true })).toBeVisible();
      await f.actor.unroute('**/api/projects?*');
      await f.actor
        .getByLabel('Username', { exact: true })
        .fill(change === 'account' ? 'NavViewer' : 'NavActor');
      await f.actor.getByLabel('Password', { exact: true }).fill(loginPassword);
      await f.actor.getByRole('button', { name: 'Sign in', exact: true }).click();
      if (change === 'account') {
        await expect(
          f.actor.getByRole('heading', {
            name: 'You do not have access to this page',
            exact: true,
          }),
        ).toBeVisible();
        expect((await f.actor.request.get(`${f.env.APP_ORIGIN}/api/trash`)).status()).toBe(403);
      } else {
        await expect(f.actor.getByLabel('Current password', { exact: true })).toBeVisible();
        expect((await f.actor.request.get(`${f.env.APP_ORIGIN}/api/trash`)).status()).toBe(403);
      }
      await held!.route.fulfill({ response: held!.response }).catch(() => {});
      held = undefined;
      await expect(f.actor.getByRole('link', { name: 'Trash', exact: true })).toHaveCount(0);
      await expect(f.actor.locator('.trash-workspace')).toHaveCount(0);
    } finally {
      if (held) await held.route.abort().catch(() => {});
      await f.close();
    }
  });
}
