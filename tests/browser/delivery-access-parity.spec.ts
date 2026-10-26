import { test, expect, type Page, type Browser, type Route } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { projectFixture, mutate, tasks } from './task-workspace-fixtures.js';
import { fixtureDatabase } from '../setup/fixtures.js';
import { sql } from '../../src/repository/access-scope.js';

// DEL-ACCESS / D09. Host must build first and supply a disposable fixture/free port.
// Real server/SQLite; routes below delay actual responses or inject explicit denial only.
const password = 'Workspace-admin-fixture-password';
async function accessFixture(
  page: Page,
  browser: Browser,
  role: string,
  keys: string[] = [],
) {
  const f = await projectFixture(page);
  const context = await browser.newContext();
  try {
    const hiddenTeam = await mutate(page, '/api/teams', {
      name: 'Hidden owner team',
    });
    const hiddenProject = await mutate(page, '/api/projects', {
      name: 'Hidden project name',
      owner_team_id: hiddenTeam.body.item.id,
    });
    expect(hiddenProject.status).toBe(201);
    const db = await fixtureDatabase(f);
    try {
      await db.transaction(async (tx) => {
        for (const [id, name] of [
          [2, 'AccessActor'],
          [3, 'ExistingViewer'],
          [4, 'ExistingManager'],
        ] as const) {
          await tx.execute(
            sql(
              'INSERT INTO dbo.users(id,username,display_name,password_hash,must_change_password) SELECT @id,@name,@name,password_hash,0 FROM dbo.users WHERE id=1',
              { id, name },
            ),
          );
          await tx.execute(
            sql(
              'INSERT INTO dbo.user_view_revisions(user_id,revision) VALUES(@id,@revision)',
              {
                id,
                revision: randomUUID(),
              },
            ),
          );
        }
        if (role === 'admin')
          await tx.execute(
            sql("UPDATE dbo.users SET org_role='admin' WHERE id=2"),
          );
        if (role !== 'unrelated')
          await tx.execute(
            sql(
              'INSERT INTO dbo.team_members(team_id,user_id,team_role) VALUES(@team,2,@role)',
              {
                team:
                  role === 'cross-lead'
                    ? hiddenTeam.body.item.id
                    : f.project.owner_team_id,
                role:
                  role === 'lead' || role === 'cross-lead' ? 'lead' : 'member',
              },
            ),
          );
        if (['manager', 'editor', 'viewer'].includes(role))
          await tx.execute(
            sql(
              'INSERT INTO dbo.project_members(project_id,user_id,access,added_by) VALUES(@project,2,@role,1)',
              { project: f.project.id, role },
            ),
          );
        for (const [id, access] of [
          [3, 'viewer'],
          [4, 'manager'],
        ] as const)
          await tx.execute(
            sql(
              'INSERT INTO dbo.project_members(project_id,user_id,access,added_by) VALUES(@project,@id,@access,1)',
              { project: f.project.id, id, access },
            ),
          );
        for (const key of keys)
          await tx.execute(
            sql(
              'INSERT INTO dbo.user_permissions(user_id,permission_key,granted_by,granted_at) VALUES(2,@key,1,@now)',
              { key, now: new Date().toISOString() },
            ),
          );
        await tx.execute(
          sql(
            "INSERT INTO dbo.user_permissions(user_id,permission_key,granted_by,granted_at) VALUES(4,'P-02',1,@now)",
            { now: new Date().toISOString() },
          ),
        );
      });
    } finally {
      await db.close();
    }
    const actor = await context.newPage();
    await actor.goto(f.env.APP_ORIGIN);
    await actor.getByLabel('Username', { exact: true }).fill('AccessActor');
    await actor.getByLabel('Password', { exact: true }).fill(password);
    await actor.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(
      actor.getByRole('link', { name: /^(All|Browse) projects$/ }),
    ).toBeVisible();
    return {
      ...f,
      actor,
      close: async () => {
        try { await context.close(); } finally { await f.close(); }
      },
    };
  } catch (e) {
    await context.close();
    await f.close();
    throw e;
  }
}
async function projects(page: Page) {
  await page.getByRole('link', { name: /^(All|Browse) projects$/ }).click();
  await expect(
    page.getByRole('button', { name: 'Refresh list', exact: true }),
  ).toBeVisible();
}
async function menu(page: Page) {
  const card = page
    .locator('.project-directory-card')
    .filter({ hasText: 'Task project' });
  await expect(card).toBeVisible();
  await card.locator('summary').click();
  return card;
}
async function version(page: Page, origin: string, project: number) {
  const response = await page.request.get(
    `${origin}/api/projects?includeArchived=true`,
  );
  expect(response.status()).toBe(200);
  return (await response.json()).items.find(
    (p: { id: number }) => p.id === project,
  ).version as number;
}

test('plain P-04 manager reaches Trash from the shell and a cold direct route', async ({
  page,
  browser,
}) => {
  const f = await accessFixture(page, browser, 'manager', ['P-04']);
  try {
    await expect(
      f.actor.getByRole('link', { name: 'Trash', exact: true }),
    ).toBeVisible();
    await f.actor.getByRole('link', { name: 'Trash', exact: true }).click();
    await expect(f.actor.getByText('Trash is empty', { exact: true })).toBeVisible();
    await f.actor.goto(`${f.env.APP_ORIGIN}/trash`);
    await expect(f.actor.getByText('Trash is empty', { exact: true })).toBeVisible();
    const response = await f.actor.request.get(`${f.env.APP_ORIGIN}/api/trash`);
    expect(response.status()).toBe(200);
    expect((await response.json()).total).toBe(0);
  } finally {
    await f.close();
  }
});

for (const row of [
  { role: 'admin', keys: [], edit: true, archive: true, create: true },
  { role: 'lead', keys: [], edit: true, archive: true, create: true },
  ...[
    'P-01',
    'P-02',
    'P-03',
    'P-04',
    'P-05',
    'P-06',
    'P-07',
    'P-08',
    'P-09',
    'P-10',
  ].map((key) => ({
    role: 'manager',
    keys: [key],
    edit: key === 'P-01',
    archive: false,
    create: key === 'P-08',
  })),
  {
    role: 'editor',
    keys: ['P-01', 'P-03', 'P-04', 'P-08'],
    edit: false,
    archive: false,
    create: true,
  },
  {
    role: 'viewer',
    keys: ['P-01', 'P-03', 'P-04', 'P-08'],
    edit: false,
    archive: false,
    create: true,
  },
  {
    role: 'unrelated',
    keys: ['P-01', 'P-03', 'P-04', 'P-08'],
    edit: false,
    archive: false,
    create: false,
  },
  { role: 'cross-lead', keys: [], edit: false, archive: false, create: true },
]) {
  test(`project actions follow effective ${row.role} ${row.keys.join(',') || 'no keys'}`, async ({
    page,
    browser,
  }) => {
    const f = await accessFixture(page, browser, row.role, row.keys);
    try {
      await projects(f.actor);
      await expect(
        f.actor.getByRole('button', { name: 'Create project', exact: true }),
      ).toHaveCount(row.create ? 1 : 0);
      if (['unrelated', 'cross-lead'].includes(row.role)) {
        await expect(
          f.actor
            .locator('.project-directory-card')
            .filter({ hasText: 'Task project' }),
        ).toHaveCount(0);
        const response = await f.actor.request.get(
          `${f.env.APP_ORIGIN}/api/projects/${f.project.id}/members`,
        );
        expect(response.status()).toBe(404);
        expect(await response.text()).not.toContain('ExistingViewer');
      } else {
        const card = await menu(f.actor);
        await expect(
          card.getByRole('button', { name: 'Edit', exact: true }),
        ).toHaveCount(row.edit ? 1 : 0);
        await expect(
          card.getByRole('button', { name: 'Archive', exact: true }),
        ).toHaveCount(row.archive ? 1 : 0);
        if (row.role !== 'admin')
          await expect(
            f.actor.getByText('Hidden project name', { exact: true }),
          ).toHaveCount(0);
        await card
          .getByRole('button', { name: 'Members', exact: true })
          .click();
        const members = f.actor.getByRole('dialog', {
          name: 'Members Task project',
          exact: true,
        });
        const canMembers =
          ['admin', 'lead'].includes(row.role) ||
          (row.role === 'manager' && row.keys.includes('P-03'));
        await expect(
          members.getByRole('button', {
            name: 'Change to Editor',
            exact: true,
          }),
        ).toHaveCount(canMembers ? (row.role === 'manager' ? 1 : 2) : 0);
        if (row.role === 'manager' && row.keys.includes('P-03')) {
          // DEL-ACCESS-DIRECTORY: manager+P-03 now gets the project-scoped, name-only picker.
          const search = members.getByRole('textbox', {
            name: 'Search active users',
            exact: true,
          });
          await expect(search).toBeVisible();
          await expect(search).toHaveAttribute('placeholder', 'Name');
          // Pool excludes Admin and this project's explicit managers; no team affiliations shown.
          await expect(
            members.getByLabel('Users', { exact: true }).locator('option'),
          ).toHaveText(['Choose user', 'ExistingViewer']);
          await expect(members.getByText('No team')).toHaveCount(0);
          await expect(members.getByText('Hidden owner team')).toHaveCount(0);
          await expect(
            members
              .getByRole('row')
              .filter({ hasText: 'ExistingManager' })
              .getByRole('button'),
          ).toHaveCount(0);
          await members
            .getByRole('row')
            .filter({ hasText: 'ExistingViewer' })
            .getByRole('button', { name: 'Change to Editor', exact: true })
            .click();
          await members
            .getByRole('button', { name: 'Confirm access change', exact: true })
            .click();
          await expect(
            members.getByText('Members saved', { exact: true }),
          ).toBeVisible();
          const response = await f.actor.request.get(
            `${f.env.APP_ORIGIN}/api/projects/${f.project.id}/members`,
          );
          expect(
            (await response.json()).items.find(
              (m: { user: { id: number } }) => m.user.id === 3,
            ).explicit_access,
          ).toBe('editor');
        }
      }
    } finally {
      await f.close();
    }
  });
}

test('P-08 owner picker includes own member team and excludes other teams', async ({
  page,
  browser,
}) => {
  const f = await accessFixture(page, browser, 'editor', ['P-08']);
  try {
    await projects(f.actor);
    await f.actor
      .getByRole('button', { name: 'Create project', exact: true })
      .click();
    const dialog = f.actor.getByRole('dialog', {
      name: 'Create project',
      exact: true,
    });
    await expect(
      dialog.getByLabel('Owner team', { exact: true }).locator('option'),
    ).toHaveText(['Choose team', 'Task team']);
    await dialog
      .getByLabel('Project Name', { exact: true })
      .fill('Member created 📝');
    await dialog
      .getByLabel('Owner team', { exact: true })
      .selectOption(String(f.project.owner_team_id));
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    const response = await f.actor.request.get(
      `${f.env.APP_ORIGIN}/api/projects`,
    );
    expect(
      (await response.json()).items.find(
        (p: { name: string }) => p.name === 'Member created 📝',
      ).effective_access,
    ).toBe('editor');
  } finally {
    await f.close();
  }
});

test('metadata 409 preserves draft; actual access revocation clears dialog and private names', async ({
  page,
  browser,
}) => {
  const f = await accessFixture(page, browser, 'manager', ['P-01']);
  try {
    await projects(f.actor);
    const card = await menu(f.actor);
    await card.getByRole('button', { name: 'Edit', exact: true }).click();
    const dialog = f.actor.getByRole('dialog');
    await dialog
      .getByLabel('Project Name', { exact: true })
      .fill('Private draft 📝');
    expect(
      (
        await mutate(
          page,
          `/api/projects/${f.project.id}`,
          { name: 'Current name', version: 1 },
          'PATCH',
        )
      ).status,
    ).toBe(200);
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog.getByRole('alert')).toBeVisible();
    await expect(
      dialog.getByLabel('Project Name', { exact: true }),
    ).toHaveValue('Private draft 📝');
    await expect(
      dialog.getByRole('button', { name: 'Save', exact: true }),
    ).toBeDisabled();
    expect(
      (
        await mutate(
          page,
          `/api/projects/${f.project.id}/members/2`,
          { version: 2 },
          'DELETE',
        )
      ).status,
    ).toBe(200);
    await dialog
      .getByRole('button', { name: 'Load latest and review', exact: true })
      .click();
    await expect(
      f.actor.getByLabel('Project Name', { exact: true }),
    ).toHaveCount(0);
    await expect(
      f.actor.getByText('Private draft 📝', { exact: false }),
    ).toHaveCount(0);
    await expect(
      f.actor.getByText('Task project', { exact: true }),
    ).toHaveCount(0);
    await expect(
      f.actor.getByText('Current name', { exact: true }),
    ).toHaveCount(0);
  } finally {
    await f.close();
  }
});

test('plain P-04 manager: trash denial clears rows/count/dialog and ignores late list', async ({
  page,
  browser,
}) => {
  const f = await accessFixture(page, browser, 'manager', ['P-04']);
  let release: (() => void) | undefined;
  try {
    const task = await mutate(page, '/api/tasks', {
      project_id: f.project.id,
      title: 'Private deleted task',
    });
    expect(task.status).toBe(201);
    expect(
      (
        await mutate(
          page,
          `/api/tasks/${task.body.item.id}`,
          { version: task.body.item.version },
          'DELETE',
        )
      ).status,
    ).toBe(200);
    await f.actor.getByRole('link', { name: 'Trash', exact: true }).click();
    await expect(
      f.actor.getByText('Private deleted task', { exact: true }),
    ).toBeVisible();
    const selfSnapshot = await f.actor.request.get(
      `${f.env.APP_ORIGIN}/api/me`,
    );
    const selfBody = await selfSnapshot.json();
    await f.actor.route('**/api/me', (route) =>
      route.fulfill({ json: selfBody }),
    );
    let started!: () => void;
    const ready = new Promise<void>((resolve) => {
      started = resolve;
    });
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await f.actor.route('**/api/trash?*', async (route) => {
      const response = await route.fetch();
      started();
      await held;
      await route.fulfill({ response });
    });
    await f.actor
      .getByRole('button', {
        name: `Restore task #${task.body.item.id}`,
        exact: true,
      })
      .click();
    // Observe the real shared poll while the confirmation stays open. Window focus
    // now intentionally revalidates NAV scope and unmounts the old Trash workspace.
    await ready;
    const permissions = await page.request.get(
      `${f.env.APP_ORIGIN}/api/users/2/permissions`,
    );
    expect(
      (
        await mutate(
          page,
          '/api/users/2/permissions',
          {
            keys: [],
            permissions_version: (await permissions.json()).permissions_version,
          },
          'PUT',
        )
      ).status,
    ).toBe(200);
    await f.actor
      .getByRole('button', { name: 'Restore this task', exact: true })
      .click();
    await expect(
      f.actor.getByRole('dialog', {
        name: 'Confirm task restore',
        exact: true,
      }),
    ).toHaveCount(0);
    release?.();
    await f.actor.unrouteAll({ behavior: 'wait' });
    await expect(
      f.actor.getByText('Private deleted task', { exact: true }),
    ).toHaveCount(0);
    await expect(
      f.actor.getByText('Task project', { exact: true }),
    ).toHaveCount(0);
    await expect(f.actor.getByText(/Total \d+ Tasks/)).toHaveCount(0);
    await expect(f.actor.getByText(/Restore task #\d+ complete/)).toHaveCount(
      0,
    );
  } finally {
    release?.();
    await f.close();
  }
});

test('archived project keeps conservative metadata/member controls; P-04 manager cannot restore, Admin can', async ({
  page,
  browser,
}) => {
  const f = await accessFixture(
    page,
    browser,
    'manager',
    ['P-01', 'P-03', 'P-04'],
  );
  try {
    const task = await mutate(page, '/api/tasks', {
      project_id: f.project.id,
      title: 'Archived deleted task',
    });
    expect(task.status).toBe(201);
    expect(
      (
        await mutate(
          page,
          `/api/tasks/${task.body.item.id}`,
          { version: 1 },
          'DELETE',
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await mutate(
          page,
          `/api/projects/${f.project.id}`,
          { archived: true, version: 1 },
          'PATCH',
        )
      ).status,
    ).toBe(200);
    await projects(f.actor);
    await f.actor.getByLabel('Include archived', { exact: true }).check();
    const card = await menu(f.actor);
    await expect(
      card.getByRole('button', { name: 'Edit', exact: true }),
    ).toHaveCount(0);
    await expect(
      card.getByRole('button', { name: 'Unarchive', exact: true }),
    ).toHaveCount(0);
    await card.getByRole('button', { name: 'Members', exact: true }).click();
    const members = f.actor.getByRole('dialog', {
      name: 'Members Task project',
      exact: true,
    });
    await expect(
      members
        .getByRole('row')
        .filter({ hasText: 'ExistingViewer' })
        .getByRole('button', { name: 'Change to Editor', exact: true }),
    ).toHaveCount(0);
    await members
      .getByRole('button', { name: 'Close dialog', exact: true })
      .click();
    await f.actor.getByRole('link', { name: 'Trash', exact: true }).click();
    await expect(
      f.actor.getByRole('button', {
        name: `Restore task #${task.body.item.id}`,
        exact: true,
      }),
    ).toBeDisabled();
    const current = await version(page, f.env.APP_ORIGIN, f.project.id);
    expect(current).toBe(2);
    // Current task version is independent of project version.
    const trash = await page.request.get(`${f.env.APP_ORIGIN}/api/trash`);
    const item = (await trash.json()).items.find(
      (t: { id: number }) => t.id === task.body.item.id,
    );
    expect(
      (
        await mutate(page, `/api/tasks/${item.id}/restore`, {
          version: item.version,
        })
      ).status,
    ).toBe(200);
  } finally {
    await f.close();
  }
});

test('Admin 403 removes matrix and all Admin controls', async ({
  page,
  browser,
}) => {
  const f = await accessFixture(page, browser, 'admin');
  try {
    await f.actor.getByRole('link', { name: 'Admin', exact: true }).click();
    await f.actor
      .getByRole('tab', { name: 'Permissions', exact: true })
      .click();
    await expect(
      f.actor.getByRole('region', { name: 'Permission matrix', exact: true }),
    ).toBeVisible();
    await f.actor
      .getByRole('checkbox', {
        name: 'P-08 Create projects for ExistingViewer',
        exact: true,
      })
      .check();
    const stale = await page.request.get(
      `${f.env.APP_ORIGIN}/api/users/3/permissions`,
    );
    expect(
      (
        await mutate(
          page,
          '/api/users/3/permissions',
          {
            keys: ['P-09'],
            permissions_version: (await stale.json()).permissions_version,
          },
          'PUT',
        )
      ).status,
    ).toBe(200);
    await f.actor
      .getByRole('button', { name: 'Review & Save 1 change(s)', exact: true })
      .click();
    await f.actor
      .getByRole('dialog')
      .getByRole('button', { name: 'Save 1 change(s)', exact: true })
      .click();
    await expect(
      f.actor.getByText(
        'No changes were saved. Some users changed meanwhile; reload them first.',
      ),
    ).toBeVisible();
    const deniedRequestId = '33333333-3333-4333-8333-333333333333';
    await f.actor.route('**/api/users?*', (route) =>
      route.fulfill({
        status: 403,
        json: { error: { code: 'FORBIDDEN', requestId: deniedRequestId } },
      }),
    );
    const deniedResponse = f.actor.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/users' &&
        response.request().method() === 'GET' &&
        response.status() === 403,
    );
    await f.actor
      .getByRole('button', { name: 'Reload matrix', exact: true })
      .click();
    expect((await deniedResponse).status()).toBe(403);
    await expect(
      f.actor.getByRole('region', { name: 'Permission matrix', exact: true }),
    ).toHaveCount(0);
    await expect(f.actor.locator('.admin-center')).toBeVisible();
    const deniedNotice = f.actor.getByRole('alert', {
      name: 'Admin access notice',
      exact: true,
    });
    await expect(deniedNotice).toBeVisible();
    await expect(deniedNotice).toContainText(
      'You do not have permission for this action',
    );
    await expect(deniedNotice).toContainText(
      `Reference ID: ${deniedRequestId}`,
    );
    await expect(
      f.actor.getByText('ExistingViewer', { exact: true }),
    ).toHaveCount(0);
    await expect(
      f.actor.getByRole('tablist', { name: 'Admin sections', exact: true }),
    ).toHaveCount(0);
  } finally {
    await f.close();
  }
});


test('deleted task mutation stays in a readable project and another task remains usable', async ({ page, browser }) => {
  const f = await accessFixture(page, browser, 'editor');
  let heldPatch: Route | undefined;
  try {
    const stale = await mutate(page, '/api/tasks', { project_id: f.project.id, title: 'Concurrent deleted task' });
    const live = await mutate(page, '/api/tasks', { project_id: f.project.id, title: 'Still editable task' });
    expect(stale.status).toBe(201);
    expect(live.status).toBe(201);
    const workspace = await tasks(f.actor);
    await f.actor.route(`**/api/tasks/${stale.body.item.id}`, (route) => {
      if (route.request().method() !== 'PATCH') return route.continue();
      // Return from the handler while the request is paused. The test owns release/abort,
      // so cleanup never waits on a handler that itself waits on a test-only promise.
      heldPatch = route;
    });
    await workspace.getByRole('combobox', { name: 'Status for Concurrent deleted task', exact: true }).click();
    await f.actor.getByRole('option', { name: 'Working on it', exact: true }).click();
    await expect.poll(() => heldPatch !== undefined, { message: 'Pause PATCH before the competing real DELETE' }).toBe(true);
    expect((await mutate(page, `/api/tasks/${stale.body.item.id}`, { version: stale.body.item.version }, 'DELETE')).status).toBe(200);
    const failed = f.actor.waitForResponse((response) => new URL(response.url()).pathname === `/api/tasks/${stale.body.item.id}` && response.request().method() === 'PATCH');
    const checked = f.actor.waitForResponse((response) => {
      const url = new URL(response.url());
      return response.request().method() === 'GET' && url.pathname === '/api/projects' &&
        url.searchParams.get('includeArchived') === 'true' && url.searchParams.get('pageSize') === '100';
    });
    const patch = heldPatch;
    if (!patch) throw new Error('Expected the paused task PATCH');
    await patch.continue();
    heldPatch = undefined;
    expect((await failed).status()).toBe(404);
    const access = await checked;
    expect(access.status()).toBe(200);
    expect((await access.json()).items.some((item: { id: number }) => item.id === f.project.id)).toBe(true);
    await expect(workspace).toBeVisible();
    await expect(workspace.getByText('Data not found or access denied', { exact: true })).toBeVisible();
    await expect(f.actor.getByRole('button', { name: 'Dismiss access notice', exact: true })).toHaveCount(0);
    const saved = f.actor.waitForResponse((response) => new URL(response.url()).pathname === `/api/tasks/${live.body.item.id}` && response.request().method() === 'PATCH');
    await workspace.getByRole('combobox', { name: 'Status for Still editable task', exact: true }).click();
    await f.actor.getByRole('option', { name: 'Working on it', exact: true }).click();
    expect((await saved).status()).toBe(200);
    const readback = await f.actor.request.get(`${f.env.APP_ORIGIN}/api/tasks/${live.body.item.id}`);
    expect(readback.status()).toBe(200);
    expect((await readback.json()).item.status).toBe('doing');
    await expect(workspace).toBeVisible();
  } finally {
    try {
      if (heldPatch) await heldPatch.abort().catch(() => {});
      await f.actor.unrouteAll({ behavior: 'wait' });
    } finally { await f.close(); }
  }
});

test('archived team keeps baseline metadata and member controls read only', async ({ page, browser }) => {
  const f = await accessFixture(page, browser, 'admin');
  try {
    expect((await mutate(page, `/api/projects/${f.project.id}`, { version: 1, archived: true }, 'PATCH')).status).toBe(200);
    expect((await mutate(page, `/api/teams/${f.project.owner_team_id}`, { version: 1, archived: true }, 'PATCH')).status).toBe(200);
    await page.getByRole('link', { name: /^(All|Your) teams$/ }).click();
    await page.getByLabel('Include archived', { exact: true }).check();
    await page.getByRole('button', { name: 'Task team', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Edit team info', exact: true })).toBeDisabled();
    await page.getByRole('tab', { name: /^Members/ }).click();
    await expect(page.getByText('Archived project or team · Read only', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add member', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Edit member', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Remove member', exact: true })).toHaveCount(0);
  } finally { await f.close(); }
});

test('existing unrelated-team access Lead fast path keeps Trash rows/counts and restores scoped to that team', async ({
  page,
  browser,
}) => {
  const f = await accessFixture(page, browser, 'cross-lead');
  try {
    const foreign = await mutate(page, '/api/tasks', {
      project_id: f.project.id,
      title: 'Foreign team deleted task',
    });
    expect(foreign.status).toBe(201);
    const removed = await mutate(
      page,
      `/api/tasks/${foreign.body.item.id}`,
      { version: foreign.body.item.version },
      'DELETE',
    );
    expect(removed.status).toBe(200);
    const projects = await f.actor.request.get(`${f.env.APP_ORIGIN}/api/projects`);
    expect(projects.status()).toBe(200);
    const own = (await projects.json()).items.find(
      (p: { name: string }) => p.name === 'Hidden project name',
    );
    expect(own).toBeDefined();
    const local = await mutate(page, '/api/tasks', {
      project_id: own.id,
      title: 'Own lead team deleted task',
    });
    expect(local.status).toBe(201);
    expect(
      (
        await mutate(
          page,
          `/api/tasks/${local.body.item.id}`,
          { version: local.body.item.version },
          'DELETE',
        )
      ).status,
    ).toBe(200);
    await f.actor.getByRole('link', { name: 'Trash', exact: true }).click();
    await expect(f.actor.getByText('Own lead team deleted task', { exact: true })).toBeVisible();
    await expect(f.actor.getByText('Foreign team deleted task', { exact: true })).toHaveCount(0);
    const trash = await f.actor.request.get(`${f.env.APP_ORIGIN}/api/trash`);
    expect(trash.status()).toBe(200);
    const body = await trash.json();
    expect(body.total).toBe(1);
    expect(body.items.map((t: { id: number }) => t.id)).toEqual([local.body.item.id]);
    expect(
      (
        await mutate(f.actor, `/api/tasks/${foreign.body.item.id}/restore`, {
          version: removed.body.item.version,
        })
      ).status,
    ).toBe(404);
  } finally {
    await f.close();
  }
});
