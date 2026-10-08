import { test, expect, type Page } from '@playwright/test';
import { rmSync } from 'node:fs';
import { startupFixture } from '../setup/fixtures.js';
import { startApplication } from '../../src/api/start.js';
import { SqliteDatabase } from '../../src/repository/sqlite/database.js';
import { sql } from '../../src/repository/access-scope.js';
import { verifyPassword } from '../../src/security/passwords.js';
const fixturePassword = '  Browser-fixture-password  ';
async function fill(page: Page, token: string) {
  await page.getByLabel('Setup token', { exact: true }).fill(token);
  await page.getByLabel('Organization name', { exact: true }).fill('Browser fixture organization');
  await page.getByLabel('Admin username', { exact: true }).fill('BrowserAdmin');
  await page.getByLabel('Display name', { exact: true }).fill('Browser Admin');
  await page.getByLabel('New password', { exact: true }).fill(fixturePassword);
}
async function checkDatabase(path: string) {
  const db = new SqliteDatabase(path);
  try {
    await db.transaction(async (tx) => {
      const users = await tx.query<{ password_hash: string; org_role: string }>(
        sql('SELECT password_hash,org_role FROM dbo.users'),
      );
      expect(users.length).toBe(1);
      expect(users[0]!.org_role).toBe('admin');
      expect(await verifyPassword(fixturePassword, users[0]!.password_hash)).toBe(true);
      for (const table of ['organizations', 'admin_events', 'user_view_revisions']) {
        expect(
          (await tx.query<{ n: number }>(sql(`SELECT COUNT(*) AS n FROM dbo.${table}`)))[0]!.n,
        ).toBe(1);
      }
      expect(
        (await tx.query<{ n: number }>(sql('SELECT COUNT(*) AS n FROM dbo.sessions')))[0]!.n,
      ).toBe(0);
    });
  } finally {
    await db.close();
  }
}
test('real setup form validates, rejects wrong token, clears secrets, completes once and reflows', async ({
  page,
  context,
}) => {
  const f = await startupFixture();
  let token = '';
  const app = await startApplication(f.env, {
    announceSetupToken: (value) => {
      token = value;
    },
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.goto(f.env.APP_ORIGIN);
    await expect(page.getByRole('form', { name: 'First-time setup', exact: true })).toBeVisible();
    await fill(page, 'x'.repeat(64));
    await page.getByLabel('New password', { exact: true }).fill('😀'.repeat(5));
    const submit = page.getByRole('button', {
      name: 'Create administrator and finish setup',
      exact: true,
    });
    await submit.click();
    await expect(
      page.getByText('Password must contain 6–128 characters', { exact: true }),
    ).toBeVisible();
    await page.getByLabel('New password', { exact: true }).fill(fixturePassword);
    await submit.click();
    await expect(page.getByRole('alert')).toContainText('Invalid token');
    await expect(page.getByLabel('Setup token', { exact: true })).toHaveValue('');
    await expect(page.getByLabel('New password', { exact: true })).toHaveValue('');
    await context.setOffline(true);
    await expect(submit).toBeDisabled();
    await context.setOffline(false);
    await page.setViewportSize({ width: 360, height: 740 });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await fill(page, token);
    await page.getByLabel('Setup token', { exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Organization name', { exact: true })).toBeFocused();
    await submit.click();
    await expect(
      page.getByText('Administrator created. Setup complete.', { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('form', { name: 'First-time setup' })).toHaveCount(0);
    expect(
      await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length })),
    ).toEqual({ local: 0, session: 0 });
    expect(await context.cookies()).toEqual([]);
    await checkDatabase(f.path);
    expect(errors).toEqual([]);
  } finally {
    await app.stop();
    rmSync(f.root, { recursive: true, force: true });
  }
});
test('pending setup blocks double submit; lost success response checks meta without resending credentials', async ({
  page,
}) => {
  const f = await startupFixture();
  let token = '';
  const app = await startApplication(f.env, {
    announceSetupToken: (value) => {
      token = value;
    },
  });
  let posts = 0;
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let received: () => void = () => {};
  const seen = new Promise<void>((resolve) => {
    received = resolve;
  });
  await page.route('**/api/setup', async (route) => {
    posts++;
    received();
    await gate;
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    await route.abort('failed');
  });
  try {
    await page.goto(f.env.APP_ORIGIN);
    await fill(page, token);
    await page
      .getByRole('button', { name: 'Create administrator and finish setup', exact: true })
      .click();
    await seen;
    await expect(page.getByRole('button', { name: 'Setting up…', exact: true })).toBeDisabled();
    await page.getByRole('form', { name: 'First-time setup' }).evaluate((form) => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(posts).toBe(1);
    release();
    // Lost response: meta check reports the configured state without resending credentials.
    await expect(page.getByText('Already configured', { exact: true })).toBeVisible();
    expect(posts).toBe(1);
    await checkDatabase(f.path);
  } finally {
    release();
    await app.stop();
    rmSync(f.root, { recursive: true, force: true });
  }
});
