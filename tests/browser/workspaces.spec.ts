import { test, expect, type Page } from '@playwright/test';
import { rmSync } from 'node:fs';
import { startupFixture } from '../setup/fixtures.js';
import { startApplication } from '../../src/api/start.js';
const password = 'Workspace-admin-fixture-password';
async function fixture(page: Page) {
  const f = await startupFixture();
  let token = '';
  const app = await startApplication(f.env, {
    announceSetupToken: (t) => {
      token = t;
    },
  });
  try {
    const setup = await page.request.post(f.env.APP_ORIGIN + '/api/setup', {
      headers: { Origin: f.env.APP_ORIGIN },
      data: {
        token,
        organization_name: 'Workspace fixture',
        username: 'WorkspaceAdmin',
        display_name: 'Workspace Admin',
        password,
      },
    });
    expect(setup.status()).toBe(201);
    await page.goto(f.env.APP_ORIGIN);
    await page.getByLabel('Username', { exact: true }).fill('WorkspaceAdmin');
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Teams & members', exact: true })).toBeVisible();
    return {
      ...f,
      close: async () => {
        await app.stop();
        rmSync(f.root, { recursive: true, force: true });
      },
    };
  } catch (e) {
    await app.stop();
    rmSync(f.root, { recursive: true, force: true });
    throw e;
  }
}
async function mutate(page: Page, path: string, body: unknown, method = 'POST') {
  return page.evaluate(
    async ({ path, body, method }) => {
      const self = await (await fetch('/api/me')).json();
      const response = await fetch(path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': self.csrf,
          ...(method === 'POST' ? { 'Idempotency-Key': crypto.randomUUID() } : {}),
        },
        body: JSON.stringify(body),
      });
      return { status: response.status, body: await response.json() };
    },
    { path, body, method },
  );
}
/** Card actions (Edit/Archive/Members/Workload) live behind the ••• menu on Projects and Teams. */
async function openCardMenu(page: Page) {
  await page
    .locator('summary[aria-label^="Project actions"], summary[aria-label^="Team actions"]')
    .first()
    .click();
}
async function createTeam(page: Page, name = 'ทีมตัวอย่าง') {
  await page.getByRole('link', { name: 'Teams & members', exact: true }).click();
  await page.getByRole('button', { name: 'Create team', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name', { exact: true }).fill(name);
  await dialog.getByLabel('Details', { exact: true }).fill('Design team');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.team-card').filter({ hasText: name }).first()).toBeVisible();
}
test('T023/024 actual create/edit/archive/project membership UI and active-project guard', async ({
  page,
}) => {
  const f = await fixture(page);
  try {
    await createTeam(page);
    await page.getByRole('link', { name: 'All projects', exact: true }).click();
    await page.getByRole('button', { name: 'Create project', exact: true }).click();
    let dialog = page.getByRole('dialog');
    await dialog.getByLabel('Name', { exact: true }).fill('Website Launch');
    await dialog.getByLabel('Owner team', { exact: true }).selectOption({ label: 'ทีมตัวอย่าง' });
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await openCardMenu(page);
    await page.getByRole('button', { name: 'Members', exact: true }).click();
    dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('cell', { name: 'Workspace Admin', exact: true })).toBeVisible();
    await dialog
      .getByLabel('Users', { exact: true })
      .selectOption({ label: 'Workspace Admin · No team' });
    await dialog.getByLabel('Role', { exact: true }).selectOption('viewer');
    await dialog.getByRole('button', { name: 'Set membership', exact: true }).click();
    await dialog.getByRole('button', { name: 'Confirm access change', exact: true }).click();
    await expect(dialog.getByRole('cell', { name: 'viewer', exact: true })).toBeVisible();
    await expect(dialog.getByRole('cell', { name: 'admin', exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Close dialog' }).click();
    await page.getByRole('link', { name: 'Teams & members', exact: true }).click();
    await openCardMenu(page);
    await page.getByRole('button', { name: 'Archive', exact: true }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(dialog.getByRole('alert')).toBeVisible();
    await dialog.getByRole('button', { name: 'Close dialog' }).click();
    await page.getByRole('link', { name: 'All projects', exact: true }).click();
    await openCardMenu(page);
    await page.getByRole('button', { name: 'Archive', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByLabel('Include archived').check();
    await openCardMenu(page);
    await expect(page.getByRole('button', { name: 'Unarchive', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Teams & members', exact: true }).click();
    await openCardMenu(page);
    await page.getByRole('button', { name: 'Archive', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByLabel('Include archived').check();
    await openCardMenu(page);
    await expect(page.getByRole('button', { name: 'Unarchive', exact: true })).toBeVisible();
  } finally {
    await f.close();
  }
});
test('T023 real Lead/member flows, confirmation and version conflict preserve draft until explicit review', async ({
  page,
}) => {
  const f = await fixture(page);
  try {
    await createTeam(page);
    const made = await mutate(page, '/api/users', {
      username: 'WorkspaceMember',
      display_name: 'สมาชิกต่างทีม',
      temp_password: password,
    });
    expect(made.status).toBe(201);
    await openCardMenu(page);
    await page.getByRole('button', { name: 'Members', exact: true }).click();
    let dialog = page.getByRole('dialog');
    await dialog
      .getByLabel('Users', { exact: true })
      .selectOption({ label: 'สมาชิกต่างทีม · No team' });
    await dialog.getByLabel('Role', { exact: true }).selectOption('lead');
    await dialog.getByRole('button', { name: 'Set membership', exact: true }).click();
    await dialog.getByRole('button', { name: 'Confirm access change', exact: true }).click();
    await expect(
      dialog.getByRole('button', { name: 'Remove Lead role', exact: true }),
    ).toBeVisible();
    await dialog.getByRole('button', { name: 'Remove Lead role', exact: true }).click();
    await dialog.getByRole('button', { name: 'Confirm access change', exact: true }).click();
    await expect(dialog.getByRole('button', { name: 'Make Lead', exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Remove member', exact: true }).click();
    await dialog.getByRole('button', { name: 'Cancel action', exact: true }).click();
    await expect(dialog.getByRole('cell', { name: 'สมาชิกต่างทีม', exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Close dialog' }).click();
    await openCardMenu(page);
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByLabel('Name', { exact: true }).fill('Your draft');
    const latest = await page.evaluate(async () => await (await fetch('/api/teams')).json());
    const changed = await mutate(
      page,
      '/api/teams/' + latest.items[0].id,
      { version: latest.items[0].version, name: 'แก้จากอีกหน้าต่าง' },
      'PATCH',
    );
    expect(changed.status).toBe(200);
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog.getByRole('button', { name: 'Load latest and review' })).toBeVisible();
    await expect(dialog.getByLabel('Name', { exact: true })).toHaveValue('Your draft');
    await dialog.getByRole('button', { name: 'Load latest and review' }).click();
    await expect(dialog.getByText(/Latest data: แก้จากอีกหน้าต่าง/)).toBeVisible();
    await dialog.getByLabel('I have reviewed the latest data and my draft').check();
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('.team-card').filter({ hasText: 'Your draft' })).toBeVisible();
  } finally {
    await f.close();
  }
});
test('T024 cross-team Viewer reads only shared project, revoke hides modal and list on next refresh', async ({
  page,
  browser,
}) => {
  const f = await fixture(page),
    ctx = await browser.newContext();
  try {
    const team = await mutate(page, '/api/teams', { name: 'Owner team' });
    const project = await mutate(page, '/api/projects', {
      name: 'Shared private project',
      owner_team_id: team.body.item.id,
    });
    const hidden = await mutate(page, '/api/projects', {
      name: 'Hidden project',
      owner_team_id: team.body.item.id,
    });
    expect(hidden.status).toBe(201);
    const user = await mutate(page, '/api/users', {
      username: 'ViewerFixture',
      display_name: 'Viewer Fixture',
      temp_password: password,
    });
    expect(user.status).toBe(201);
    const share = await mutate(
      page,
      `/api/projects/${project.body.item.id}/members/${user.body.item.id}`,
      { access: 'viewer', version: 1 },
      'PUT',
    );
    expect(share.status).toBe(200);
    const member = await ctx.newPage();
    await member.goto(f.env.APP_ORIGIN);
    await member.getByLabel('Username', { exact: true }).fill('ViewerFixture');
    await member.getByLabel('Password', { exact: true }).fill(password);
    await member.getByRole('button', { name: 'Sign in', exact: true }).click();
    await member.getByLabel('Current password').fill(password);
    await member.getByLabel('New password', { exact: true }).fill('Viewer-new-fixture-password');
    await member.getByLabel('Confirm new password').fill('Viewer-new-fixture-password');
    await member.getByRole('button', { name: 'Change password', exact: true }).click();
    await member.getByRole('link', { name: 'All projects', exact: true }).click();
    await expect(
      member.locator('.project-directory-card').filter({ hasText: 'Shared private project' }),
    ).toBeVisible();
    await expect(member.getByText('Hidden project', { exact: true })).toHaveCount(0);
    await expect(member.getByRole('button', { name: 'Create project', exact: true })).toHaveCount(
      0,
    );
    await expect(member.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0);
    await openCardMenu(member);
    await member.getByRole('button', { name: 'Members', exact: true }).click();
    await expect(
      member
        .getByRole('dialog')
        .getByText('Only an administrator or owner team lead can change access', { exact: false }),
    ).toBeVisible();
    await expect(
      member.getByRole('dialog').getByRole('button', { name: 'Set membership', exact: true }),
    ).toHaveCount(0);
    const removed = await mutate(
      page,
      `/api/projects/${project.body.item.id}/members/${user.body.item.id}`,
      { version: 2 },
      'DELETE',
    );
    expect(removed.status).toBe(200);
    await member.reload();
    await expect(member.getByText('Shared private project', { exact: true })).toHaveCount(0);
    await expect(member.getByRole('dialog')).toHaveCount(0);
    await page.setViewportSize({ width: 360, height: 800 });
    await page.getByRole('button', { name: 'Toggle navigation' }).click();
    await page.getByRole('link', { name: 'Teams & members', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Teams', exact: true, level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  } finally {
    await ctx.close();
    await f.close();
  }
});
