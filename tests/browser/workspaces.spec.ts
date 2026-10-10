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
/** Project actions use the card menu; team actions live in the Team info tab. */
async function openCardMenu(page: Page) {
  if (new URL(page.url()).pathname === '/teams') {
    await page.locator('.team-card-title').first().click();
    await expect(page.getByRole('tab', { name: 'Team info', exact: true })).toBeVisible();
  } else await page.locator('summary[aria-label^="Project actions"]').first().click();
}
async function createTeam(page: Page, name = 'ทีมตัวอย่าง') {
  await page.getByRole('link', { name: 'Teams & members', exact: true }).click();
  await page.getByRole('button', { name: 'Create team', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Team Name', { exact: true }).fill(name);
  await dialog.getByLabel('Team Description', { exact: true }).fill('Design team');
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
    await dialog.getByLabel('Project Name', { exact: true }).fill('Website Launch');
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
    await page.getByRole('button', { name: 'Back to teams', exact: false }).click();
    await page.getByLabel('Include archived').check();
    await openCardMenu(page);
    await expect(page.getByRole('button', { name: 'Unarchive', exact: true })).toBeVisible();
  } finally {
    await f.close();
  }
});
test('owner project detail form: defaults, Unicode, persisted edits and 360px layout', async ({
  page,
}) => {
  const f = await fixture(page);
  try {
    await createTeam(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole('link', { name: 'All projects', exact: true }).click();
    await page.getByRole('button', { name: 'Create project', exact: true }).click();
    let dialog = page.getByRole('dialog', { name: 'Create project', exact: true });
    await expect(dialog.getByLabel('Project Name')).toBeFocused();
    await expect(dialog.getByLabel('Project Type')).toHaveValue('internal');
    await expect(dialog.getByLabel('Project Category')).toHaveValue('development');
    await dialog.getByLabel('Project Name').fill('ระบบ Development 🚀');
    await dialog.getByLabel('Project Detail').fill('รายละเอียดโครงการ\nพัฒนาระบบสำหรับทีม');
    await dialog.getByLabel('Owner team', { exact: true }).selectOption({ label: 'ทีมตัวอย่าง' });
    await page.screenshot({
      path: 'reports/UI-project-details-desktop.png',
      animations: 'disabled',
    });
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await page.reload();
    await openCardMenu(page);
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel('Project Name')).toHaveValue('ระบบ Development 🚀');
    await expect(dialog.getByLabel('Project Type')).toHaveValue('internal');
    await expect(dialog.getByLabel('Project Category')).toHaveValue('development');
    await expect(dialog.getByLabel('Project Detail')).toHaveValue(
      'รายละเอียดโครงการ\nพัฒนาระบบสำหรับทีม',
    );
    await expect(dialog.getByText('Owner team:', { exact: false })).toContainText('ทีมตัวอย่าง');
    await expect(dialog.getByLabel('Owner team', { exact: true })).toHaveCount(0);
    await dialog.getByLabel('Project Type').selectOption('client');
    await dialog.getByLabel('Project Category').selectOption('it');
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await page.reload();
    await openCardMenu(page);
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel('Project Type')).toHaveValue('client');
    await expect(dialog.getByLabel('Project Category')).toHaveValue('it');
    await dialog.getByRole('button', { name: 'Close dialog' }).click();
    await page.setViewportSize({ width: 360, height: 800 });
    await page.getByRole('button', { name: 'Create project', exact: true }).click();
    dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel('Project Category')).toHaveValue('development');
    const fits = await dialog.evaluate(
      (node) =>
        node.scrollWidth <= node.clientWidth && node.getBoundingClientRect().right <= innerWidth,
    );
    expect(fits).toBe(true);
    await expect(dialog.getByRole('button', { name: 'Save', exact: true })).toBeInViewport();
    await page.screenshot({
      path: 'reports/UI-project-details-mobile.png',
      animations: 'disabled',
    });
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Create project', exact: true })).toBeFocused();
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
    await page.getByRole('tab', { name: /^Members/ }).click();
    await page.getByRole('button', { name: 'Add member', exact: true }).click();
    let dialog = page.getByRole('dialog');
    await dialog
      .getByLabel('Users', { exact: true })
      .selectOption({ label: 'สมาชิกต่างทีม · No team' });
    await dialog.getByLabel('Team access', { exact: true }).selectOption('lead');
    await dialog.getByRole('button', { name: 'Review & Save', exact: true }).click();
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const grid = page.getByRole('tabpanel', { name: /^Members/ });
    const row = grid.getByRole('row').filter({ hasText: 'สมาชิกต่างทีม' });
    await expect(row.getByRole('cell', { name: 'Lead', exact: true })).toBeVisible();
    await row.getByRole('button', { name: 'Edit member', exact: true }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByLabel('Team access', { exact: true }).selectOption('member');
    await dialog.getByRole('button', { name: 'Review & Save', exact: true }).click();
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(row.getByRole('cell', { name: 'Member', exact: true })).toBeVisible();
    await row.locator('summary').click();
    await row.getByRole('button', { name: 'Remove member', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(row).toBeVisible();
    await page.getByRole('tab', { name: 'Team info', exact: true }).click();
    await page.getByRole('button', { name: 'Edit team info', exact: true }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByLabel('Team Name', { exact: true }).fill('Your draft');
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
    await expect(dialog.getByLabel('Team Name', { exact: true })).toHaveValue('Your draft');
    await dialog.getByRole('button', { name: 'Load latest and review' }).click();
    await expect(dialog.getByText(/Latest data: แก้จากอีกหน้าต่าง/)).toBeVisible();
    await dialog.getByLabel('I have reviewed the latest data and my draft').check();
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Your draft', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Your draft', exact: true })).toBeVisible();
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
        .getByText(
          'Only an administrator, owner team lead or permitted project manager can change access.',
          { exact: false },
        ),
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

test('owner team details: card body, tabs, member grid, cancel, keyboard, deep link and 360px', async ({
  page,
}) => {
  const f = await fixture(page);
  try {
    await createTeam(page, 'Development ทีม 🚀');
    const teams = await page.evaluate(async () => (await fetch('/api/teams')).json());
    const self = await page.evaluate(async () => (await fetch('/api/me')).json());
    expect(
      (
        await mutate(
          page,
          `/api/teams/${teams.items[0].id}/members/${self.user.id}`,
          { version: teams.items[0].version, team_role: 'member', team_position: 'pm' },
          'PUT',
        )
      ).status,
    ).toBe(200);
    await page.getByRole('button', { name: 'Refresh list', exact: true }).click();
    await page.locator('.team-card p').first().click();
    await expect(
      page.getByRole('heading', { name: 'Development ทีม 🚀', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const info = page.getByRole('tab', { name: 'Team info', exact: true });
    await expect(info).toHaveAttribute('aria-selected', 'true');
    await page.screenshot({
      path: 'reports/UI-team-tabs-info-desktop.png',
      animations: 'disabled',
    });
    await info.focus();
    await page.keyboard.press('ArrowRight');
    const members = page.getByRole('tab', { name: /^Members/ });
    await expect(members).toBeFocused();
    await expect(members).toHaveAttribute('aria-selected', 'true');
    const grid = page.getByRole('tabpanel', { name: /^Members/ });
    await expect(grid.getByRole('cell', { name: 'Workspace Admin', exact: true })).toBeVisible();
    await expect(grid.getByRole('cell', { name: 'PM', exact: true })).toBeVisible();
    await expect(grid.getByRole('cell', { name: 'Member', exact: true })).toBeVisible();
    await expect(page.getByLabel('Search active users')).toHaveCount(0);
    await page.screenshot({
      path: 'reports/UI-team-tabs-members-desktop.png',
      animations: 'disabled',
    });
    await grid.getByRole('button', { name: 'Edit member', exact: true }).click();
    let dialog = page.getByRole('dialog');
    await dialog.getByLabel('Team Position').selectOption('lead');
    await dialog.getByRole('button', { name: 'Review & Save', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(grid.getByRole('cell', { name: 'PM', exact: true })).toBeVisible();
    const unchanged = await page.evaluate(async () => (await fetch('/api/teams')).json());
    expect(unchanged.items[0].members[0].team_position).toBe('pm');
    await page.reload();
    await expect(members).toHaveAttribute('aria-selected', 'true');
    await expect(grid.getByRole('cell', { name: 'PM', exact: true })).toBeVisible();
    await members.focus();
    await page.keyboard.press('End');
    await expect(page.getByRole('tab', { name: 'Workload', exact: true })).toBeFocused();
    await expect(
      page.getByRole('heading', { name: 'No open work in these weeks', exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: 'reports/UI-team-tabs-workload-desktop.png',
      animations: 'disabled',
    });
    await page.setViewportSize({ width: 360, height: 900 });
    await members.click();
    await expect(members).toHaveAttribute('aria-selected', 'true');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: 'reports/UI-team-tabs-members-mobile.png',
      animations: 'disabled',
    });
    await grid.getByRole('button', { name: 'Add member', exact: true }).click();
    dialog = page.getByRole('dialog');
    expect(await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await info.click();
    await expect(info).toHaveAttribute('aria-selected', 'true');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: 'reports/UI-team-tabs-info-mobile.png', animations: 'disabled' });
    await page.getByRole('button', { name: 'Back to teams', exact: false }).click();
    await expect(page.locator('.team-card')).toHaveCount(1);
    await page.locator('.team-card-title').focus();
    await page.keyboard.press('Enter');
    await expect(info).toHaveAttribute('aria-selected', 'true');
  } finally {
    await f.close();
  }
});

test('team details: Dev/Lead position does not grant access; member privacy and revoked team hidden', async ({
  page,
  browser,
}) => {
  const f = await fixture(page),
    ctx = await browser.newContext();
  try {
    const user = await mutate(page, '/api/users', {
      username: 'TeamReader',
      display_name: 'Team Reader',
      temp_password: password,
    });
    expect(user.status).toBe(201);
    const made = await mutate(page, '/api/teams', {
      name: 'Read only Development',
      description: 'Visible team info',
      members: [{ user_id: user.body.item.id, team_position: 'lead' }],
    });
    expect(made.status).toBe(201);
    const member = await ctx.newPage();
    await member.goto(f.env.APP_ORIGIN);
    await member.getByLabel('Username', { exact: true }).fill('TeamReader');
    await member.getByLabel('Password', { exact: true }).fill(password);
    await member.getByRole('button', { name: 'Sign in', exact: true }).click();
    await member.getByLabel('Current password').fill(password);
    await member.getByLabel('New password', { exact: true }).fill('Team-reader-new-password');
    await member.getByLabel('Confirm new password').fill('Team-reader-new-password');
    await member.getByRole('button', { name: 'Change password', exact: true }).click();
    await expect(member.getByRole('link', { name: 'Teams & members', exact: true })).toBeVisible();
    await member.goto(`${f.env.APP_ORIGIN}/teams?team=${made.body.item.id}&tab=workload`);
    await expect(
      member.getByRole('heading', { name: 'Read only Development', exact: true }),
    ).toBeVisible();
    await expect(member.getByRole('tab', { name: 'Workload', exact: true })).toBeDisabled();
    await expect(member.getByRole('tab', { name: 'Team info', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(member.getByRole('button', { name: 'Edit team info', exact: true })).toHaveCount(
      0,
    );
    await member.getByRole('tab', { name: /^Members/ }).click();
    await expect(
      member.getByText('Team member details are available to administrators only.', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(member.getByRole('cell', { name: 'Team Reader', exact: true })).toHaveCount(0);
    await expect(member.getByRole('button', { name: 'Add member', exact: true })).toHaveCount(0);
    await expect(member.getByRole('button', { name: 'Edit member', exact: true })).toHaveCount(0);
    expect(
      (
        await member.request.get(`${f.env.APP_ORIGIN}/api/teams/${made.body.item.id}/workload`)
      ).status(),
    ).toBe(403);
    expect(
      (
        await mutate(
          page,
          `/api/teams/${made.body.item.id}/members/${user.body.item.id}`,
          { version: made.body.item.version },
          'DELETE',
        )
      ).status,
    ).toBe(200);
    await member.getByRole('button', { name: 'Refresh team', exact: true }).click();
    await expect(
      member.getByRole('heading', { name: 'Read only Development', exact: true }),
    ).toHaveCount(0);
    await expect(member.getByRole('cell', { name: 'Team Reader', exact: true })).toHaveCount(0);
    await expect(member.getByRole('alert')).toBeVisible();
  } finally {
    await ctx.close();
    await f.close();
  }
});

for (const width of [1280, 360]) {
  test(`team tabs stay stationary without page entrance animation at ${width}px`, async ({
    page,
  }) => {
    const f = await fixture(page);
    try {
      await createTeam(page, 'Stable tab fixture');
      await page.setViewportSize({ width, height: 900 });
      await page.locator('.team-card-title').first().click();
      const info = page.getByRole('tab', { name: 'Team info', exact: true });
      await expect(info).toHaveAttribute('aria-selected', 'true');
      // Observe actual browser animations: tab changes must not replay the whole-page effect.
      await page.locator('.content > section').evaluate(async (el) => {
        await Promise.all(
          el.getAnimations().map((animation) => animation.finished.catch(() => {})),
        );
      });
      await page.evaluate(() => {
        const observed = window as unknown as { pageEntrances: number };
        observed.pageEntrances = 0;
        const animate = Element.prototype.animate;
        Element.prototype.animate = function (this: Element, frames, options) {
          if (this.matches('.content > section')) observed.pageEntrances++;
          return animate.call(this, frames, options);
        };
      });
      const tabs = page.getByRole('tablist', { name: 'Team sections' });
      // Bring tabs into view first so Playwright's own click auto-scroll cannot move the page.
      await tabs.scrollIntoViewIfNeeded();
      const startScroll = await page.evaluate(() => scrollY);
      const before = await tabs.boundingBox();
      const members = page.getByRole('tab', { name: /^Members/ });
      for (const target of [
        members,
        page.getByRole('tab', { name: 'Workload', exact: true }),
        info,
        members,
      ]) {
        await target.click();
        await expect(target).toHaveAttribute('aria-selected', 'true');
        await expect(target).toBeFocused();
        const after = await tabs.boundingBox();
        expect(Math.abs(after!.y - before!.y)).toBeLessThan(0.5);
        expect(Math.abs(after!.x - before!.x)).toBeLessThan(0.5);
      }
      await members.press('Home');
      await expect(info).toBeFocused();
      await expect(info).toHaveAttribute('aria-selected', 'true');
      const entrances = () =>
        page.evaluate(() => (window as unknown as { pageEntrances: number }).pageEntrances);
      expect(await entrances()).toBe(0);
      expect(await page.evaluate(() => scrollY)).toBe(startScroll);
      if (width === 1280) {
        await page.getByRole('link', { name: 'All projects', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible();
        await expect.poll(entrances).toBe(1);
      }
    } finally {
      await f.close();
    }
  });
}
