import { test, expect, type Page, type Browser } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { projectFixture, mutate } from './task-workspace-fixtures.js';
import { fixtureDatabase } from '../setup/fixtures.js';
import { sql } from '../../src/repository/access-scope.js';

async function setup(page: Page, browser: Browser, role: 'manager' | 'lead' | 'admin' = 'manager') {
  const f = await projectFixture(page);
  const context = await browser.newContext();
  const db = await fixtureDatabase(f);
  try {
    await db.transaction(async (tx) => {
      await tx.execute(
        sql(
          "INSERT INTO dbo.users(id,username,display_name,password_hash,must_change_password,org_role) SELECT 2,'ParentActor','ParentActor',password_hash,0,@role FROM dbo.users WHERE id=1",
          { role: role === 'admin' ? 'admin' : 'member' },
        ),
      );
      await tx.execute(
        sql('INSERT INTO dbo.user_view_revisions(user_id,revision) VALUES(2,@revision)', {
          revision: randomUUID(),
        }),
      );
      if (role === 'lead')
        await tx.execute(
          sql("INSERT INTO dbo.team_members(team_id,user_id,team_role) VALUES(@team,2,'lead')", {
            team: f.project.owner_team_id,
          }),
        );
      if (role === 'manager') {
        await tx.execute(
          sql(
            "INSERT INTO dbo.project_members(project_id,user_id,access,added_by) VALUES(@project,2,'manager',1)",
            { project: f.project.id },
          ),
        );
        for (const key of ['P-01', 'P-04'])
          await tx.execute(
            sql(
              'INSERT INTO dbo.user_permissions(user_id,permission_key,granted_by,granted_at) VALUES(2,@key,1,@now)',
              { key, now: new Date().toISOString() },
            ),
          );
      }
    });
  } finally {
    await db.close();
  }
  const made = await mutate(page, '/api/tasks', {
    project_id: f.project.id,
    title: 'Parent trash ไทย😀',
  });
  expect(made.status).toBe(201);
  expect(
    (
      await mutate(
        page,
        `/api/tasks/${made.body.item.id}`,
        { version: made.body.item.version },
        'DELETE',
      )
    ).status,
  ).toBe(200);
  const actor = await context.newPage();
  await actor.goto(f.env.APP_ORIGIN);
  await actor.getByLabel('Username', { exact: true }).fill('ParentActor');
  await actor.getByLabel('Password', { exact: true }).fill('Workspace-admin-fixture-password');
  await actor.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(actor.getByRole('link', { name: 'Trash', exact: true })).toBeVisible();
  return {
    ...f,
    actor,
    taskId: made.body.item.id,
    close: async () => {
      await context.close();
      await f.close();
    },
  };
}
async function projects(page: Page) {
  await page.getByRole('link', { name: /^(All|Browse) projects$/ }).click();
  await page.getByLabel('Include archived', { exact: true }).check();
  await page.locator('summary[aria-label^="Project actions"]').first().click();
}
for (const role of ['manager', 'lead', 'admin'] as const)
  for (const state of ['active', 'team', 'project', 'both'] as const)
    test(`${role}: capability-only ${state} parents through real shell`, async ({
      page,
      browser,
    }) => {
      const f = await setup(page, browser, role);
      try {
        const db = await fixtureDatabase(f);
        try {
          await db.transaction(async (tx) => {
            if (state === 'project' || state === 'both')
              await tx.execute(
                sql('UPDATE dbo.projects SET archived_at=@at WHERE id=@id', {
                  id: f.project.id,
                  at: new Date().toISOString(),
                }),
              );
            if (state === 'team' || state === 'both')
              await tx.execute(
                sql('UPDATE dbo.teams SET archived_at=@at WHERE id=@id', {
                  id: f.project.owner_team_id,
                  at: new Date().toISOString(),
                }),
              );
          });
        } finally {
          await db.close();
        }
        if (role === 'manager')
          expect(
            (
              await (
                await f.actor.request.get(f.env.APP_ORIGIN + '/api/teams?includeArchived=true')
              ).json()
            ).total,
          ).toBe(0);
        const extraReads: string[] = [];
        f.actor.on('request', (r) => {
          // The removed Trash inference swept archived teams/projects; the shell sidebar's
          // active-only project read is unrelated and may refresh at any time.
          if (/\/api\/(teams|projects)\?.*includeArchived=true/.test(r.url()))
            extraReads.push(r.url());
        });
        await f.actor.getByRole('link', { name: 'Trash', exact: true }).click();
        const restore = f.actor.getByRole('button', {
          name: `Restore task #${f.taskId}`,
          exact: true,
        });
        if (role === 'manager' && state !== 'active') {
          await expect(restore).toBeDisabled();
          await expect(restore).toHaveAttribute('title', 'Unavailable');
        } else {
          await expect(restore).toBeEnabled();
          await restore.focus();
          await f.actor.keyboard.press('Enter');
          await expect(f.actor.getByRole('dialog', { name: 'Confirm task restore' })).toBeVisible();
          await f.actor.getByRole('button', { name: 'Cancel', exact: true }).click();
        }
        expect(extraReads).toEqual([]);
        if (state === 'project' || state === 'both') {
          await projects(f.actor);
          const unarchive = f.actor.getByRole('button', { name: 'Unarchive', exact: true });
          if (role === 'manager') await expect(unarchive).toHaveCount(0);
          else if (state === 'both') {
            await expect(unarchive).toBeDisabled();
            await expect(unarchive).toHaveAttribute('title', 'Unavailable');
          } else await expect(unarchive).toBeEnabled();
        }
      } finally {
        await f.close();
      }
    });
for (const field of ['missing', 'null', 'error'] as const)
  test(`unknown ${field} Trash capability clears confirmation and disables action`, async ({
    page,
    browser,
  }) => {
    const f = await setup(page, browser);
    try {
      await f.actor.getByRole('link', { name: 'Trash', exact: true }).click();
      await f.actor.getByRole('button', { name: `Restore task #${f.taskId}`, exact: true }).click();
      await f.actor.route('**/api/trash?**', async (route) => {
        if (field === 'error')
          return route.fulfill({
            status: 503,
            json: { error: { code: 'SERVICE_NOT_READY', message: 'Unavailable' } },
          });
        // A superseded read may be aborted by the page while held here.
        const response = await route.fetch().catch(() => undefined);
        const body = await response?.json().catch(() => undefined);
        if (!response || !body) return route.abort().catch(() => {});
        for (const row of body.items) {
          if (field === 'missing') delete row.can_restore;
          else row.can_restore = null;
        }
        await route.fulfill({ response, json: body });
      });
      // Trash's shared reader (not the shell's focus scope revalidation, which remounts Trash).
      await f.actor.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
      await expect(f.actor.getByRole('dialog', { name: 'Confirm task restore' })).toHaveCount(0);
      await expect(
        f.actor.getByRole('button', { name: `Restore task #${f.taskId}`, exact: true }),
      ).toHaveCount(0);
    } finally {
      await f.close();
    }
  });
test('stale unarchive true rechecks latest capability, cancels confirmation without a write', async ({
  page,
  browser,
}) => {
  const f = await setup(page, browser, 'admin');
  try {
    expect(
      (await mutate(page, `/api/projects/${f.project.id}`, { archived: true, version: 1 }, 'PATCH'))
        .status,
    ).toBe(200);
    await projects(f.actor);
    await f.actor.getByRole('button', { name: 'Unarchive', exact: true }).click();
    expect(
      (
        await mutate(
          page,
          `/api/teams/${f.project.owner_team_id}`,
          { archived: true, version: 1 },
          'PATCH',
        )
      ).status,
    ).toBe(200);
    let writes = 0;
    f.actor.on('request', (r) => {
      if (r.method() === 'PATCH') writes++;
    });
    await f.actor.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(f.actor.getByRole('dialog', { name: 'Unarchive', exact: true })).toHaveCount(0);
    expect(writes).toBe(0);
  } finally {
    await f.close();
  }
});
for (const status of [401, 403, 404])
  test(`Trash ${status} clears private data; held pre-denial read cannot resurrect it`, async ({
    page,
    browser,
  }) => {
    const f = await setup(page, browser);
    let release!: () => void;
    const held = new Promise<void>((r) => (release = r));
    try {
      await f.actor.getByRole('link', { name: 'Trash', exact: true }).click();
      await f.actor.getByRole('button', { name: `Restore task #${f.taskId}`, exact: true }).click();
      let arrived!: () => void;
      const ready = new Promise<void>((r) => (arrived = r));
      await f.actor.route('**/api/trash?**', async (route) => {
        const response = await route.fetch();
        arrived();
        await held;
        await route.fulfill({ response });
      });
      // Trash's shared reader (not the shell's focus scope revalidation, which remounts Trash).
      await f.actor.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
      await ready;
      await f.actor.route(`**/api/tasks/${f.taskId}/restore`, (route) =>
        route.fulfill({
          status,
          json: {
            error: {
              code: status === 401 ? 'UNAUTHENTICATED' : status === 403 ? 'FORBIDDEN' : 'NOT_FOUND',
              message: 'Unavailable',
            },
          },
        }),
      );
      await f.actor.getByRole('button', { name: 'Restore this task', exact: true }).click();
      await expect(f.actor.getByRole('dialog', { name: 'Confirm task restore' })).toHaveCount(0);
      release();
      await expect(f.actor.getByText('Parent trash ไทย😀', { exact: true })).toHaveCount(0);
      await expect(f.actor.getByText(/Page 1 · Total/)).toHaveCount(0);
    } finally {
      release();
      await f.close();
    }
  });
test('mobile 200% layout, keyboard confirmation, offline and maintenance gates', async ({
  page,
  browser,
}) => {
  const f = await setup(page, browser);
  try {
    await f.actor.getByRole('link', { name: 'Trash', exact: true }).click();
    await f.actor.setViewportSize({ width: 390, height: 844 });
    await f.actor.evaluate(() => {
      document.documentElement.style.zoom = '2';
    });
    const button = f.actor.getByRole('button', { name: `Restore task #${f.taskId}`, exact: true });
    await button.focus();
    await f.actor.keyboard.press('Enter');
    await expect(f.actor.getByRole('dialog', { name: 'Confirm task restore' })).toBeVisible();
    await f.actor.context().setOffline(true);
    // Offline, the shell withdraws the private Trash scope (DEL-ACCESS-NAV): no enabled
    // restore control (row or confirmation) may remain.
    await expect(f.actor.locator('button.restore-action:enabled')).toHaveCount(0);
    await f.actor.context().setOffline(false);
    // Reconnect revalidates /me and scope; the old confirmation is not resurrected.
    await expect(button).toBeEnabled({ timeout: 20000 });
    await expect(f.actor.getByRole('dialog', { name: 'Confirm task restore' })).toHaveCount(0);
    await f.freeze();
    await f.actor.evaluate(() => window.dispatchEvent(new Event('focus')));
    // Maintenance: scope/trash reads are unavailable, so no enabled restore control remains.
    await expect(
      f.actor.getByText('Maintenance in progress. Please try again later.'),
    ).toBeVisible();
    await expect(f.actor.locator('button.restore-action:enabled')).toHaveCount(0);
  } finally {
    await f.close();
  }
});
