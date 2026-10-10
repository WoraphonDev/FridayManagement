import { test, expect, type Page } from '@playwright/test';
import { rmSync } from 'node:fs';
import { startupFixture } from '../setup/fixtures.js';
import { startApplication } from '../../src/api/start.js';
const password = 'Workspace-admin-fixture-password';
async function fixture(page: Page) {
  const f = await startupFixture();
  let token = '';
  let app = await startApplication(f.env, {
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
    await expect(page.getByRole('link', { name: /^(Your|All) teams$/ })).toBeVisible();
    return {
      ...f,
      restart: async () => {
        await app.stop();
        app = await startApplication(f.env);
      },
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
test('T025 actual settings rename, sidebar, competing version preserves draft, offline and restart', async ({
  page,
}, testInfo) => {
  const f = await fixture(page);
  try {
    await page.getByRole('link', { name: 'Settings', exact: true }).click();
    await page
      .getByRole('navigation', { name: 'Settings sections' })
      .getByRole('button', { name: 'Organization', exact: true })
      .click();
    const org = page.getByRole('region', { name: 'Organization settings' });
    await org.getByLabel('Organization name', { exact: true }).fill('ฝ่ายวางแผน Friday');
    await org.getByRole('button', { name: 'Save organization settings' }).click();
    await expect(page.locator('aside .workspace-box strong')).toHaveText('ฝ่ายวางแผน Friday');
    await org.getByLabel('Organization name', { exact: true }).fill('Your draft');
    const competing = await mutate(
      page,
      '/api/organization',
      { name: 'ชื่อจากผู้ดูแลอีกคน', version: 2 },
      'PATCH',
    );
    expect(competing.status).toBe(200);
    await org.getByRole('button', { name: 'Save organization settings' }).click();
    await expect(org.getByText('Current name:', { exact: false })).toContainText(
      'ชื่อจากผู้ดูแลอีกคน',
    );
    await expect(org.getByLabel('Organization name', { exact: true })).toHaveValue('Your draft');
    await expect(org.getByRole('button', { name: 'Save organization settings' })).toBeDisabled();
    await org.getByLabel('Latest data reviewed').check();
    await org.getByRole('button', { name: 'Save organization settings' }).click();
    await expect(org.getByText('Organization settings saved', { exact: true })).toBeVisible();
    await page.context().setOffline(true);
    await expect(org.getByRole('button', { name: 'Save organization settings' })).toBeDisabled();
    await page.context().setOffline(false);
    await f.restart();
    await page.reload();
    await expect(org.getByLabel('Organization name', { exact: true })).toHaveValue('Your draft');
    await expect(page.locator('aside .workspace-box strong')).toHaveText('Your draft');
    await page.setViewportSize({ width: 360, height: 800 });
    await expect(org.getByRole('button', { name: 'Save organization settings' })).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1);
    await page.screenshot({ path: testInfo.outputPath('T025-settings.png'), fullPage: true });
  } finally {
    await f.close();
  }
});
test('T025 actual member settings read-only and public page does not disclose organization', async ({
  page,
  browser,
}) => {
  const f = await fixture(page);
  const memberContext = await browser.newContext();
  try {
    const user = await mutate(page, '/api/users', {
      username: 'OrgMember',
      display_name: 'Organization member',
      temp_password: 'Org-member-fixture-password',
      org_role: 'member',
    });
    expect(user.status).toBe(201);
    const member = await memberContext.newPage();
    await member.goto(f.env.APP_ORIGIN);
    const meta = await member.request.get(f.env.APP_ORIGIN + '/api/meta');
    expect(meta.status()).toBe(200);
    expect(Object.keys(await meta.json()).sort()).toEqual(['setupRequired', 'version']);
    await expect(member.getByText('Workspace fixture', { exact: true })).toHaveCount(0);
    await member.getByLabel('Username', { exact: true }).fill('OrgMember');
    await member.getByLabel('Password', { exact: true }).fill('Org-member-fixture-password');
    await member.getByRole('button', { name: 'Sign in', exact: true }).click();
    await member
      .getByLabel('Current password', { exact: true })
      .fill('Org-member-fixture-password');
    await member.getByLabel('New password', { exact: true }).fill('Org-member-changed-password');
    await member
      .getByLabel('Confirm new password', { exact: true })
      .fill('Org-member-changed-password');
    await member.getByRole('button', { name: 'Change password', exact: true }).click();
    await member.getByRole('link', { name: 'Settings', exact: true }).click();
    await member
      .getByRole('navigation', { name: 'Settings sections' })
      .getByRole('button', { name: 'Organization', exact: true })
      .click();
    const org = member.getByRole('region', { name: 'Organization settings' });
    await expect(org.getByText('Workspace fixture', { exact: true })).toBeVisible();
    await expect(org.getByRole('textbox')).toHaveCount(0);
    await expect(org.getByRole('button', { name: 'Save organization settings' })).toHaveCount(0);
    const forbidden = await mutate(
      member,
      '/api/organization',
      { name: 'No', version: 1 },
      'PATCH',
    );
    expect(forbidden.status).toBe(403);
  } finally {
    await memberContext.close();
    await f.close();
  }
});
