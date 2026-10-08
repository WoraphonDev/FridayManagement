import { test, expect, type Page } from '@playwright/test';
import { rmSync } from 'node:fs';
import { startupFixture } from '../setup/fixtures.js';
import { startApplication } from '../../src/api/start.js';
import { SqliteDatabase } from '../../src/repository/sqlite/database.js';
import { sql } from '../../src/repository/access-scope.js';
const password = 'Browser-session-fixture';
async function prepare(page: Page) {
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
        organization_name: 'Browser session fixture',
        username: 'BrowserAdmin',
        display_name: 'Browser Admin',
        password,
      },
    });
    expect(setup.status()).toBe(201);
    await page.goto(f.env.APP_ORIGIN);
    await expect(page.getByRole('alert')).toContainText('เข้าสู่ระบบ');
    const result = await page.evaluate(
      async (data) => {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const body = await response.json();
        return { status: response.status, csrf: body.csrf };
      },
      { username: 'browseradmin', password },
    );
    expect(result.status).toBe(200);
    await page.reload();
    await expect(page.getByRole('link', { name: 'จัดการผู้ใช้', exact: true })).toBeVisible();
    return { ...f, app, csrf: result.csrf as string };
  } catch (e) {
    await app.stop();
    rmSync(f.root, { recursive: true, force: true });
    throw e;
  }
}
test('actual browser uses HttpOnly Strict cookie, validates Self on reload and clears session/menu after logout', async ({
  page,
  context,
}) => {
  const f = await prepare(page),
    errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    const cookies = await context.cookies();
    expect(cookies.length).toBe(1);
    expect(cookies[0]!.name).toBe('friday_session');
    expect(cookies[0]!.httpOnly).toBe(true);
    expect(cookies[0]!.sameSite).toBe('Strict');
    expect(cookies[0]!.secure).toBe(false);
    expect(cookies[0]!.path).toBe('/');
    expect(await page.evaluate(() => document.cookie)).toBe('');
    expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
    const invalid = await page.evaluate(
      async () => (await fetch('/api/session/activity', { method: 'POST' })).status,
    );
    expect(invalid).toBe(403);
    const statuses = await page.evaluate(async (csrf) => {
      const activity = await fetch('/api/session/activity', {
        method: 'POST',
        headers: { 'X-CSRF-Token': csrf },
      });
      const logout = await fetch('/api/logout', {
        method: 'POST',
        headers: { 'X-CSRF-Token': csrf },
      });
      const me = await fetch('/api/me');
      return [activity.status, logout.status, me.status];
    }, f.csrf);
    expect(statuses).toEqual([204, 204, 401]);
    expect(await context.cookies()).toEqual([]);
    await page.reload();
    await expect(page.getByRole('alert')).toContainText('เข้าสู่ระบบ');
    await expect(page.getByRole('link', { name: 'จัดการผู้ใช้', exact: true })).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {
    await f.app.stop();
    rmSync(f.root, { recursive: true, force: true });
  }
});
test('actual browser session survives process restart; current auth-version revocation clears cookie and privileged navigation', async ({
  page,
  context,
}) => {
  const f = await prepare(page);
  let app = f.app;
  try {
    await app.stop();
    let announced = false;
    app = await startApplication(f.env, {
      announceSetupToken: () => {
        announced = true;
      },
    });
    expect(announced).toBe(false);
    await page.reload();
    await expect(page.getByRole('link', { name: 'จัดการผู้ใช้', exact: true })).toBeVisible();
    const db = new SqliteDatabase(f.path);
    try {
      await db.transaction((tx) =>
        tx.execute(
          sql("UPDATE dbo.users SET auth_version=auth_version+1,org_role='member' WHERE id=1"),
        ),
      );
    } finally {
      await db.close();
    }
    await page.reload();
    await expect(page.getByRole('alert')).toContainText('เข้าสู่ระบบ');
    await expect(page.getByRole('link', { name: 'จัดการผู้ใช้', exact: true })).toHaveCount(0);
    expect(await context.cookies()).toEqual([]);
  } finally {
    await app.stop();
    rmSync(f.root, { recursive: true, force: true });
  }
});
