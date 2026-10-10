import { test, expect } from '@playwright/test';
import { projectFixture, mutate, tasks } from './task-workspace-fixtures.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
for (const [name, width] of [
  ['mobile', 360],
  ['tablet', 768],
  ['desktop', 1440],
  // 200% browser zoom on a 1440px desktop lays out as a 720 CSS px viewport.
  ['desktop zoom 200%', 720],
] as const) {
  test(`T055 main authenticated screens and four views reflow ${name}`, async ({
    page,
  }, testInfo) => {
    const f = await projectFixture(page);
    await page.setViewportSize({ width, height: 900 });
    try {
      expect(
        (
          await mutate(page, '/api/tasks', {
            project_id: 1,
            title: 'งานทดสอบข้อความไทยยาวสำหรับตรวจหน้าจอ',
            assignee_id: 1,
          })
        ).status,
      ).toBe(201);
      for (const label of [
        'Home',
        'My work',
        'Work calendar',
        'Organization reports',
        'Notifications',
        'All teams',
        'All projects',
        'Trash',
        'Admin',
        'Settings',
      ]) {
        if (label === 'Notifications') {
          await page.getByRole('button', { name: /^Notify/ }).click();
          await page.getByRole('button', { name: 'View all notifications →', exact: true }).click();
        } else if (label === 'Settings') {
          // Settings lives in the profile menu, not the sidebar.
          await page.getByRole('button', { name: /^Profile of / }).click();
          await page.getByRole('menuitem', { name: 'Settings', exact: true }).click();
        } else {
          // Narrow layouts keep the sidebar behind the menu button.
          const menu = page.getByRole('button', { name: 'Toggle navigation' });
          if (await menu.isVisible()) await menu.click();
          await page.getByRole('link', { name: label, exact: true }).click();
        }
        await expect(page.locator('h1:visible').first()).toBeVisible();
        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
          .toBe(true);
      }
      const jobs = await tasks(page);
      for (const view of ['Main table', 'Gantt', 'Calendar', 'Kanban']) {
        await jobs.getByRole('button', { name: view, exact: true }).click();
        await expect(jobs.getByRole('button', { name: view, exact: true })).toHaveAttribute(
          'aria-pressed',
          'true',
        );
        expect(
          await jobs.evaluate((node) => node.getBoundingClientRect().right <= innerWidth),
        ).toBe(true);
      }
      await expect(
        jobs
          .getByRole('region', { name: 'Project Kanban', exact: true })
          .getByRole('button', { name: 'Open task #1', exact: true }),
      ).toBeVisible();
      await expect(jobs.getByRole('button', { name: 'Main table', exact: true })).toHaveCSS(
        'white-space',
        'nowrap',
      );
      await jobs.evaluate((node) => {
        node.scrollTop = 0;
      });
      await page.screenshot({ path: testInfo.outputPath(`T055-${name}.png`), fullPage: true });
    } finally {
      await f.close();
    }
  });
}
test('T055 dialog keyboard Escape restores opener; 200 percent text stays reachable', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    const opener = page.getByRole('button', { name: 'Help', exact: true });
    await opener.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
  } finally {
    await f.close();
  }
});
test('T056/T057 native worker cache and logout/offline', async ({ page, context, browserName }) => {
  const f = await projectFixture(page);
  try {
    const manifest = await page.request.get(f.env.APP_ORIGIN + '/manifest.webmanifest');
    expect(await manifest.json()).toMatchObject({
      start_url: '/',
      scope: '/',
      display: 'standalone',
    });
    const script = await page.request.get(f.env.APP_ORIGIN + '/service-worker.js');
    expect(script.status()).toBe(200);
    expect(script.headers()['content-type']).toMatch(/javascript/);
    const registration = await page.evaluate(async () => {
      const pending = navigator.serviceWorker.register('/service-worker.js').then((r) => ({
        scope: r.scope,
        state: r.installing?.state ?? r.active?.state ?? 'missing',
      }));
      return await Promise.race([
        pending,
        new Promise<{ scope: string; state: string }>((resolve) =>
          setTimeout(() => resolve({ scope: '', state: 'registration-timeout' }), 5000),
        ),
      ]);
    });
    expect(registration.scope, registration.state).toBe(f.env.APP_ORIGIN + '/');
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const r = await navigator.serviceWorker.getRegistration();
          return r?.active?.state ?? r?.installing?.state ?? 'missing';
        }),
      )
      .toBe('activated');
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
      .toBe(true);
    await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page.getByLabel('Username', { exact: true })).toBeVisible();
    const cached = await page.evaluate(async () => {
      const output: { url: string; text: string }[] = [];
      for (const key of await caches.keys()) {
        const cache = await caches.open(key);
        for (const request of await cache.keys())
          output.push({ url: request.url, text: await (await cache.match(request))!.text() });
      }
      return output;
    });
    expect(cached.length).toBeGreaterThan(5);
    for (const item of cached) {
      expect(new URL(item.url).pathname).toMatch(
        /^\/(assets\/[^/]+\.(js|css)|offline\.html|manifest\.webmanifest|favicon\.svg|icon-(192|512)\.png)$/,
      );
      expect(item.text).not.toMatch(/WorkspaceAdmin|Workspace fixture|Task team|Task project/);
    }
    // Also verify a real failed connection to the stopped fixture origin.
    await f.close();
    // Playwright's WebKit raises an internal error for offline navigations; covered on Chromium/Firefox.
    if (browserName === 'webkit') return;
    await context.setOffline(true);
    await page.goto(f.env.APP_ORIGIN + '/projects');
    await expect(
      page.getByRole('heading', { name: 'Connect to continue', exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Task project', { exact: true })).toHaveCount(0);
  } finally {
    await context.setOffline(false);
    await f.close();
  }
});
test('T057 reconnect blocks writes until authoritative reads finish and retains dirty draft', async ({
  page,
  context,
}) => {
  const f = await projectFixture(page);
  let release: (() => void) | undefined;
  try {
    await mutate(page, '/api/tasks', { project_id: 1, title: 'Server original', assignee_id: 1 });
    const jobs = await tasks(page);
    await jobs.getByRole('button', { name: /Open task #1/ }).click();
    const detail = page.getByRole('dialog', { name: 'Task details #1', exact: true });
    const title = detail.getByLabel('Task title', { exact: true });
    await title.fill('My unsaved draft');
    await context.setOffline(true);
    await expect(detail.getByRole('button', { name: 'Save task', exact: true })).toHaveCount(0);
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    let intercepted = false;
    await page.route('**/api/me', async (route) => {
      intercepted = true;
      await barrier;
      await route.continue();
    });
    await page.evaluate(() =>
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }),
    );
    await context.setOffline(false);
    await expect(
      page.getByText('Checking for updates before enabling changes', { exact: true }),
    ).toBeVisible();
    expect(intercepted).toBe(false);
    await expect(detail.getByRole('button', { name: 'Save task', exact: true })).toHaveCount(0);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect.poll(() => intercepted).toBe(true);
    await expect(
      page.getByText('Checking for updates before enabling changes', { exact: true }),
    ).toBeVisible();
    await expect(detail.getByRole('button', { name: 'Save task', exact: true })).toHaveCount(0);
    release!();
    await expect(
      page.getByText('Checking for updates before enabling changes', { exact: true }),
    ).toHaveCount(0);
    await expect(title).toHaveValue('My unsaved draft');
    await expect(detail.getByRole('button', { name: 'Save task', exact: true })).toBeEnabled();
  } finally {
    release?.();
    await context.setOffline(false);
    await f.close();
  }
});
test('T059 configured local readiness and operational request IDs match Admin audit without bodies', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    const ready = await page.request.get(f.env.APP_ORIGIN + '/health/ready');
    expect(ready.status()).toBe(200);
    expect(await ready.json()).toEqual({ status: 'ok' });
    const audit = await (await page.request.get(f.env.APP_ORIGIN + '/api/audit')).json();
    expect(audit.items.length).toBeGreaterThan(1);
    const invalid = await page.request.post(f.env.APP_ORIGIN + '/api/login', {
      headers: { Origin: f.env.APP_ORIGIN },
      data: { username: 'NoSuchFixtureUser', password: 'DoNotLogSyntheticPassword' },
    });
    expect(invalid.status()).toBe(401);
    const text = readFileSync(join(f.root, 'logs', 'application.jsonl'), 'utf8');
    expect(text).not.toMatch(
      /DoNotLogSyntheticPassword|Workspace-admin-fixture-password|NoSuchFixtureUser|Task project|Task team/,
    );
    const records = text
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    for (const event of audit.items)
      expect(records.some((row) => row.requestId === event.request_id && row.status === 201)).toBe(
        true,
      );
    expect(
      records.some(
        (row) => row.requestId === invalid.headers()['x-request-id'] && row.status === 401,
      ),
    ).toBe(true);
  } finally {
    await f.close();
  }
});
