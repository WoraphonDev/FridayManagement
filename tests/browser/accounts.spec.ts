import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { rmSync } from 'node:fs';
import { startupFixture } from '../setup/fixtures.js';
import { startApplication } from '../../src/api/start.js';
import { SqliteDatabase } from '../../src/repository/sqlite/database.js';
import { sql } from '../../src/repository/access-scope.js';
const password = 'Batch-admin-fixture-password',
  temp = 'Batch-temp-fixture-password',
  next = 'Batch-new-fixture-password';
async function login(page: Page, origin: string, user = 'BatchAdmin', secret = password) {
  await page.goto(origin);
  await page.getByLabel('Username', { exact: true }).fill(user);
  await page.getByLabel('Password', { exact: true }).fill(secret);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}
async function fixture(page: Page) {
  const f = await startupFixture();
  let token = '';
  const app = await startApplication(f.env, {
    announceSetupToken: (t) => {
      token = t;
    },
  });
  try {
    const response = await page.request.post(f.env.APP_ORIGIN + '/api/setup', {
      headers: { Origin: f.env.APP_ORIGIN },
      data: {
        token,
        organization_name: 'Batch fixture',
        username: 'BatchAdmin',
        display_name: 'Batch Admin',
        password,
      },
    });
    expect(response.status()).toBe(201);
    await login(page, f.env.APP_ORIGIN);
    await expect(page.getByRole('link', { name: 'Admin', exact: true })).toBeVisible();
    return {
      ...f,
      app,
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
async function mutation(page: Page, path: string, body: unknown, method = 'POST') {
  return page.evaluate(
    async ({ path, body, method }) => {
      const self = await (await fetch('/api/me')).json();
      const response = await fetch(path, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': self.csrf },
        body: JSON.stringify(body),
      });
      return { status: response.status, body: await response.json() };
    },
    { path, body, method },
  );
}
async function create(page: Page, user = 'BatchMember') {
  await page.getByRole('link', { name: 'Admin', exact: true }).click();
  await page.getByRole('button', { name: 'Add user', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('New username').fill(user);
  await dialog.getByLabel('Display name').fill('Batch Member');
  expect(await dialog.getByLabel('Temporary password').inputValue()).toBe('');
  await dialog.getByLabel('Temporary password').fill(temp);
  await dialog.getByRole('button', { name: 'Create user', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('cell', { name: user, exact: true })).toBeVisible();
}
test('T017/018 actual create → login → forced password → profile → logout; rotates/revokes other browser session', async ({
  page,
  browser,
}) => {
  const f = await fixture(page);
  const contexts: BrowserContext[] = [];
  try {
    await create(page);
    const ctx = await browser.newContext();
    contexts.push(ctx);
    const member = await ctx.newPage();
    await login(member, f.env.APP_ORIGIN, 'BatchMember', temp);
    await expect(
      member.getByRole('heading', { name: 'Change password', exact: true }),
    ).toBeVisible();
    await expect(member.getByRole('link', { name: 'My work', exact: true })).toHaveCount(0);
    const old = await browser.newContext();
    contexts.push(old);
    const before = await old.newPage();
    await login(before, f.env.APP_ORIGIN, 'BatchMember', temp);
    await expect(before.getByLabel('Current password')).toBeVisible();
    const cookie = (await ctx.cookies())[0]!.value;
    await member.getByLabel('Current password').fill('wrong');
    await member.getByLabel('New password', { exact: true }).fill(next);
    await member.getByLabel('Confirm new password').fill(next);
    await member.getByRole('button', { name: 'Change password', exact: true }).click();
    await expect(member.getByRole('alert').first()).toContainText(/incorrect|invalid/i);
    expect(await member.getByLabel('Current password').inputValue()).toBe('');
    await member.getByLabel('Current password').fill(temp);
    await member.getByLabel('New password', { exact: true }).fill('short');
    await member.getByLabel('Confirm new password').fill('short');
    await member.getByRole('button', { name: 'Change password', exact: true }).click();
    await expect(member.getByText('Password must contain 6–128 characters').first()).toBeVisible();
    await member.getByLabel('New password', { exact: true }).fill(next);
    await member.getByLabel('Confirm new password').fill(next);
    await member.getByRole('button', { name: 'Change password', exact: true }).click();
    await expect(member.getByRole('link', { name: 'My work', exact: true })).toBeVisible();
    expect((await ctx.cookies())[0]!.value).not.toBe(cookie);
    await before.reload();
    await expect(before.getByRole('heading', { name: 'Welcome back', exact: true })).toBeVisible();
    await member.getByRole('link', { name: 'Settings' }).click();
    await expect(member.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible();
    await expect(member.getByText('BatchMember', { exact: true })).toBeVisible();
    await member.getByRole('link', { name: 'My work', exact: true }).click();
    await expect(member.getByRole('heading', { name: 'My work', exact: true })).toBeVisible();
    expect(
      await member.evaluate(() => [localStorage.length, sessionStorage.length, document.cookie]),
    ).toEqual([0, 0, '']);
    await member.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(member.getByRole('heading', { name: 'Welcome back', exact: true })).toBeVisible();
  } finally {
    for (const c of contexts) await c.close();
    await f.close();
  }
});
test('T018 actual edit/last-admin/deactivate/reactivate/reset confirmations and stale-version recovery', async ({
  page,
}) => {
  const f = await fixture(page);
  try {
    await create(page);
    await page.getByRole('button', { name: 'Deactivate BatchAdmin', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('At least one active administrator');
    await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
    await page.getByRole('button', { name: 'Edit BatchMember', exact: true }).click();
    await page.getByRole('dialog').getByLabel('Display name').fill('Draft name');
    const users = await page.evaluate(
      async () =>
        (await (await fetch('/api/users')).json()).items as Array<{
          id: number;
          username: string;
          version: number;
        }>,
    );
    const u = users.find((u) => u.username === 'BatchMember')!;
    expect(
      (
        await mutation(
          page,
          `/api/users/${u.id}`,
          { version: u.version, display_name: 'External name' },
          'PATCH',
        )
      ).status,
    ).toBe(200);
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText(/changed/i);
    await page.getByRole('button', { name: 'Load latest data' }).click();
    await expect(page.getByRole('dialog').getByLabel('Display name')).toHaveValue('External name');
    await page.getByRole('dialog').getByLabel('Display name').fill('Saved name');
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(page.getByRole('cell', { name: 'Saved name', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Deactivate BatchMember', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Activate BatchMember', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Activate BatchMember', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Deactivate BatchMember', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Reset password BatchMember', exact: true }).click();
    await page.getByRole('dialog').getByLabel('Temporary password').fill(next);
    await page.getByRole('dialog').getByLabel('Your administrator password').fill('wrong');
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText(/incorrect|invalid/i);
    expect(await page.getByLabel('Temporary password').inputValue()).toBe('');
    await page.getByLabel('Temporary password').fill(next);
    await page.getByLabel('Your administrator password').fill(password);
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('status').filter({ hasText: 'Password reset.' })).toBeVisible();
  } finally {
    await f.close();
  }
});
test('T017 passive polling never renews idle; trusted interaction does; logout clears other tab drafts', async ({
  page,
  context,
}) => {
  const f = await fixture(page);
  const db = new SqliteDatabase(f.path);
  try {
    const second = await context.newPage();
    await second.goto(f.env.APP_ORIGIN + '/settings');
    await expect(second.getByLabel('Current password')).toBeVisible();
    await second.getByLabel('New password', { exact: true }).fill('Unsaved-secret-fixture');
    const seen = async () =>
      String(
        (await db.transaction((tx) => tx.query(sql('SELECT last_seen_at FROM dbo.sessions'))))[0]!
          .last_seen_at,
      );
    const initial = await seen();
    let reads = 0;
    page.on('request', (r) => {
      if (r.url().endsWith('/api/me')) reads++;
    });
    await expect.poll(() => reads, { timeout: 8000 }).toBeGreaterThan(0);
    expect(await seen()).toBe(initial);
    await page.keyboard.press('Tab');
    await expect.poll(seen).not.toBe(initial);
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(second.getByRole('heading', { name: 'Welcome back', exact: true })).toBeVisible();
    await expect(second.getByLabel('New password', { exact: true })).toHaveCount(0);
    await second.close();
  } finally {
    await db.close();
    await f.close();
  }
});
test('T018 literal search/filter/paging and dialog keyboard/mobile 200% reflow', async ({
  page,
}) => {
  const f = await fixture(page);
  try {
    for (let i = 0; i < 11; i++) {
      const made = await mutation(page, '/api/users', {
        username: 'Page' + i,
        display_name: 'Page ' + i,
        temp_password: temp,
      });
      expect(made.status).toBe(201);
    }
    await page.getByRole('link', { name: 'Admin', exact: true }).click();
    await expect(page.getByText('Page 1 · Total 12 people', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Next page', exact: true }).click();
    await expect(page.getByText('Page 2 · Total 12 people', { exact: true })).toBeVisible();
    await page.getByLabel('Search users').fill('%');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page.getByText('Page 1 · Total 0 people', { exact: true })).toBeVisible();
    await page.getByLabel('Search users').fill('Page10');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page.getByRole('cell', { name: 'Page10', exact: true })).toBeVisible();
    const trigger = page.getByRole('button', { name: 'Add user', exact: true });
    await trigger.click();
    const close = page.getByRole('button', { name: 'Close dialog', exact: true });
    await expect(close).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('New username')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(close).toBeFocused();
    await page.setViewportSize({ width: 360, height: 740 });
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(trigger).toBeFocused();
  } finally {
    await f.close();
  }
});
test('T017 login show-password/429/offline and duplicate submission guard', async ({
  page,
  context,
}) => {
  const f = await startupFixture();
  let token = '';
  const app = await startApplication(f.env, {
    announceSetupToken: (t) => {
      token = t;
    },
  });
  try {
    expect(
      (
        await page.request.post(f.env.APP_ORIGIN + '/api/setup', {
          headers: { Origin: f.env.APP_ORIGIN },
          data: {
            token,
            organization_name: 'Login fixture',
            username: 'BatchAdmin',
            display_name: 'Batch Admin',
            password,
          },
        })
      ).status(),
    ).toBe(201);
    await page.goto(f.env.APP_ORIGIN);
    await page.getByLabel('Username', { exact: true }).fill('BatchAdmin');
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Show password', exact: true }).click();
    await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
    let sends = 0;
    await page.route('**/api/login', async (route) => {
      sends++;
      await new Promise((r) => setTimeout(r, 200));
      await route.fulfill({
        status: 429,
        headers: { 'Retry-After': '60' },
        json: {
          error: {
            code: 'RATE_LIMITED',
            message: 'limit',
            fieldErrors: {},
            requestId: 'b7e03f82-0541-4801-a8b1-7458c6d09302',
          },
        },
      });
    });
    await context.setOffline(true);
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeDisabled();
    expect(sends).toBe(0);
    await context.setOffline(false);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page
      .locator('form')
      .evaluate((form) =>
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
      );
    await expect(page.getByRole('alert').filter({ hasText: 'Too many requests' })).toBeVisible();
    expect(sends).toBe(1);
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeDisabled();
    expect(await page.getByLabel('Password', { exact: true }).inputValue()).toBe('');
  } finally {
    await app.stop();
    rmSync(f.root, { recursive: true, force: true });
  }
});
