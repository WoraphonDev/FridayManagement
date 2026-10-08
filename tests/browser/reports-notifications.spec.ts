import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { projectFixture, mutate } from './task-workspace-fixtures.js';
import { SqliteDatabase } from '../../src/repository/sqlite/database.js';
import { insert } from '../schema/fixtures.js';
import { sql } from '../../src/repository/access-scope.js';
const notify = async (path: string, recipient_id = 1, count = 1) => {
  const db = new SqliteDatabase(path);
  try {
    await db.transaction(async (tx) => {
      for (let i = 0; i < count; i++)
        await tx.execute(
          insert('notifications', {
            recipient_id,
            task_id: 1,
            type: 'comment',
            message: 'Browser synthetic notification',
            dedupe_key: randomUUID(),
          }),
        );
    });
  } finally {
    await db.close();
  }
};
async function create(
  page: Page,
  title = 'Report synthetic task',
  fields: Record<string, unknown> = {},
) {
  const r = await mutate(page, '/api/tasks', { project_id: 1, title, ...fields });
  expect(r.status).toBe(201);
  return r.body.item;
}
const reports = async (page: Page) => {
  await page.getByRole('link', { name: 'Reports overview', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Reports', exact: true })).toBeVisible();
  await expect(page.locator('.report-metrics')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export CSV', exact: true })).toBeEnabled();
};
const center = async (page: Page) => {
  await page.getByRole('link', { name: /^การแจ้งเตือน/ }).click();
  await expect(page.locator('.notification-list')).toBeVisible();
};
test('T051 notification page50/read-one/read-all/current badge persists across reload and own scope', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    await create(page);
    await notify(f.path, 1, 55);
    await center(page);
    await expect(page.locator('.notification-list li')).toHaveCount(50);
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.locator('.notification-list li')).toHaveCount(5);
    await page
      .locator('.notification-list li')
      .first()
      .getByRole('button', { name: /อ่านรายการ/ })
      .click();
    await expect(page.getByLabel('unread 54 items', { exact: true })).toBeVisible({
      timeout: 10000,
    });
    await page.reload();
    await expect(page.getByLabel('unread 54 items', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Mark all read', exact: true }).click();
    await expect(page.getByLabel('unread 0 items', { exact: true })).toBeVisible({
      timeout: 10000,
    });
    await page.getByLabel('Unread only', { exact: true }).check();
    await expect(page.getByText('No notifications', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('unread 0 items', { exact: true })).toBeVisible();
  } finally {
    await f.close();
  }
});
test('T051 stale notification opens current detail and deleted-task 404 clears safely', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    await create(page);
    await notify(f.path);
    await center(page);
    await page.getByRole('button', { name: 'Open task #1', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Task details #1', exact: true });
    await expect(modal.getByLabel('Task title', { exact: true })).toHaveValue(
      'Report synthetic task',
    );
    await modal.getByRole('button', { name: 'Close dialog', exact: true }).click();
    await page.route('**/api/notifications?**', async (route) => {
      const r = await route.fetch();
      await route.fulfill({ response: r });
    });
    await mutate(page, '/api/tasks/1', { version: 1 }, 'DELETE');
    await page.getByRole('button', { name: 'Open task #1', exact: true }).click();
    await expect(
      page.getByText('งานนี้ไม่พร้อมเปิด หรือสิทธิ์เข้าถึงเปลี่ยนแล้ว', { exact: true }),
    ).toBeVisible();
    await expect(modal).toHaveCount(0);
    await expect(page.getByText('No notifications', { exact: true })).toBeVisible();
  } finally {
    await f.close();
  }
});
test('T051 actual shared refresh/focus/read-only poll, offline stops requests and resumes without duplicate notifications', async ({
  page,
  context,
}) => {
  const f = await projectFixture(page);
  try {
    await create(page);
    await notify(f.path);
    await center(page);
    await expect(page.getByLabel('unread 1 items', { exact: true })).toBeVisible({
      timeout: 10000,
    });
    await context.setOffline(true);
    await expect(
      page.getByText('ต้องเชื่อมต่อเพื่อใช้งาน ไม่มีการบันทึกงานระหว่างออฟไลน์', { exact: true }),
    ).toBeVisible();
    await notify(f.path);
    let requests = 0;
    page.on('request', (r) => {
      if (r.url().includes('/api/notifications?')) requests++;
    });
    await page.waitForTimeout(5500);
    expect(requests).toBe(0);
    await context.setOffline(false);
    await expect(page.getByLabel('unread 2 items', { exact: true })).toBeVisible({
      timeout: 10000,
    });
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.waitForTimeout(600);
    const db = new SqliteDatabase(f.path);
    try {
      const rows = await db.transaction((tx) =>
        tx.query(sql('SELECT COUNT(*) AS total FROM dbo.notifications')),
      );
      expect(rows[0]!.total).toBe(2);
    } finally {
      await db.close();
    }
  } finally {
    try {
      await context.setOffline(false);
    } finally {
      await f.close();
    }
  }
});
test('T051 notification editor retains dirty draft on polling and revocation hides list/detail/badge for actual member', async ({
  page,
  browser,
}) => {
  test.setTimeout(60000);
  const f = await projectFixture(page),
    ctx = await browser.newContext();
  try {
    await create(page);
    expect(
      (
        await mutate(page, '/api/users', {
          username: 'NotifyMember',
          display_name: 'Notify Member',
          temp_password: 'Notify-member-fixture-password',
        })
      ).status,
    ).toBe(201);
    expect(
      (await mutate(page, '/api/projects/1/members/2', { version: 1, access: 'editor' }, 'PUT'))
        .status,
    ).toBe(200);
    expect(
      (await mutate(page, '/api/tasks/1', { version: 1, assignee_id: 2 }, 'PATCH')).status,
    ).toBe(200);
    const m = await ctx.newPage();
    await m.goto(f.env.APP_ORIGIN);
    await m.getByLabel('Username', { exact: true }).fill('NotifyMember');
    await m.getByLabel('Password', { exact: true }).fill('Notify-member-fixture-password');
    await m.getByRole('button', { name: 'Sign in', exact: true }).click();
    await m.getByLabel('Current password').fill('Notify-member-fixture-password');
    await m.getByLabel('New password', { exact: true }).fill('Notify-new-fixture-password');
    await m.getByLabel('Confirm new password').fill('Notify-new-fixture-password');
    await m.getByRole('button', { name: 'Change password', exact: true }).click();
    await center(m);
    await m.getByRole('button', { name: 'Open task #1', exact: true }).click();
    const modal = m.getByRole('dialog', { name: 'Task details #1', exact: true });
    await modal.getByLabel('Task title', { exact: true }).fill('Retained notification draft');
    expect(
      (await mutate(page, '/api/tasks/1', { version: 2, title: 'Remote title' }, 'PATCH')).status,
    ).toBe(200);
    await expect(modal.getByLabel('Task title', { exact: true })).toHaveValue(
      'Retained notification draft',
    );
    await m.waitForTimeout(5500);
    await expect(modal.getByLabel('Task title', { exact: true })).toHaveValue(
      'Retained notification draft',
    );
    expect((await mutate(page, '/api/projects/1/members/2', { version: 2 }, 'DELETE')).status).toBe(
      200,
    );
    await expect(modal).toHaveCount(0, { timeout: 10000 });
    await expect(m.locator('.notification-list li')).toHaveCount(0);
    await expect(m.getByLabel('unread 0 items', { exact: true })).toBeVisible();
    await reports(m);
    await expect(m.getByText('No tasks match these filters', { exact: true })).toBeVisible();
    await expect(m.getByLabel('Projects', { exact: true }).locator('option')).toHaveCount(1);
  } finally {
    try {
      await ctx.close();
    } finally {
      await f.close();
    }
  }
});
test('T054 actual dashboard metrics/status/workload and date/team/project/person filters, zero and archive exclusion', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    const today = await page.evaluate(
      async () => (await (await fetch('/api/me')).json()).bangkok_today as string,
    );
    for (let i = 0; i < 6; i++) {
      const t = await create(page, 'Metric task ' + i, {
        assignee_id: i === 0 ? null : 1,
        due_date: today,
      });
      if (i >= 2) {
        const status = ['doing', 'review', 'done', 'done'][i - 2];
        expect(
          (await mutate(page, `/api/tasks/${t.id}`, { version: 1, status }, 'PATCH')).status,
        ).toBe(200);
      }
    }
    await reports(page);
    await expect(
      page.locator('.report-metrics').getByText('33.33%', { exact: true }),
    ).toBeVisible();
    await expect(page.locator('.report-statuses .todo strong')).toHaveText('2');
    await expect(page.locator('.report-statuses .done strong')).toHaveText('2');
    await page.getByLabel('Assignee', { exact: true }).selectOption('null');
    await expect(page.locator('.report-metrics>div').first().locator('dd')).toHaveText('1');
    await page.getByLabel('Assignee', { exact: true }).selectOption('1');
    await expect(page.locator('.report-metrics>div').first().locator('dd')).toHaveText('5');
    await page.getByLabel('Owner team', { exact: true }).selectOption('1');
    await page.getByLabel('Projects', { exact: true }).selectOption('1');
    await expect(page.locator('.report-metrics>div').first().locator('dd')).toHaveText('6');
    await page.getByLabel('Date basis', { exact: true }).selectOption('completed');
    await expect(page.locator('.report-metrics>div').first().locator('dd')).toHaveText('2');
    await page.getByLabel('Date basis', { exact: true }).selectOption('due');
    await expect(page.locator('.report-metrics>div').first().locator('dd')).toHaveText('6');
    expect(
      (await mutate(page, '/api/projects/1', { version: 1, archived: true }, 'PATCH')).status,
    ).toBe(200);
    await expect(page.getByText('No tasks match these filters', { exact: true })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('.report-metrics').getByText('0.00%', { exact: true })).toBeVisible();
  } finally {
    await f.close();
  }
});
test('T053/054 actual download120+ full rows BOM and CSV text safeguards share displayed filters', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    await create(page);
    const db = new SqliteDatabase(f.path);
    try {
      await db.transaction(async (tx) => {
        for (let i = 0; i < 122; i++)
          await tx.execute(
            insert('tasks', {
              project_id: 1,
              title: i === 0 ? 'ไทย, "quote"' : i === 1 ? '  =SUM(1,2)' : 'CSV fixture ' + i,
              creator_id: 1,
              assignee_id: i % 2 ? 1 : null,
            }),
          );
      });
    } finally {
      await db.close();
    }
    await reports(page);
    await expect(page.locator('.report-metrics>div').first().locator('dd')).toHaveText('123');
    await page.getByLabel('Projects', { exact: true }).selectOption('1');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
    const d = await download,
      path = await d.path();
    expect(d.suggestedFilename()).toMatch(
      /^friday-tasks-created-\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}\.csv$/,
    );
    const bytes = readFileSync(path!);
    expect([...bytes.subarray(0, 3)]).toEqual([239, 187, 191]);
    const csv = bytes.toString();
    expect((csv.match(/\r\n"\d+",/g) ?? []).length).toBe(123);
    expect(csv).toContain('"ไทย, ""quote"""');
    expect(csv).toContain('"\'  =SUM(1,2)"');
    await d.delete();
  } finally {
    await f.close();
  }
});
test('T054 explicit cap/error recovery, offline disabled CSV and current filter response after rapid changes', async ({
  page,
  context,
}) => {
  const f = await projectFixture(page);
  try {
    await create(page, 'Assigned', { assignee_id: 1 });
    await create(page, 'Unassigned');
    await reports(page);
    await page.route('**/api/export/tasks.csv?**', (route) =>
      route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'EXPORT_LIMIT_EXCEEDED', message: 'safe' } }),
      }),
    );
    await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
    await expect(
      page.getByText('เกิน 50,000 งาน กรุณาลดช่วงวันที่หรือเพิ่มตัวกรองก่อนส่งออก', {
        exact: true,
      }),
    ).toBeVisible();
    await page.unroute('**/api/export/tasks.csv?**');
    await page.getByLabel('Assignee', { exact: true }).selectOption('1');
    await page.getByLabel('Assignee', { exact: true }).selectOption('null');
    await expect(page.locator('.report-metrics>div').first().locator('dd')).toHaveText('1');
    await expect(page.locator('tbody')).toContainText('Unassigned');
    await context.setOffline(true);
    await expect(page.getByRole('button', { name: 'Export CSV', exact: true })).toBeDisabled();
    await context.setOffline(false);
    await expect(page.getByRole('button', { name: 'Export CSV', exact: true })).toBeEnabled();
  } finally {
    try {
      await context.setOffline(false);
    } finally {
      await f.close();
    }
  }
});
test('T054 Monday-style report mobile360, keyboard controls, 200% text zoom and desktop visual', async ({
  page,
}, testInfo) => {
  const f = await projectFixture(page);
  try {
    const today = await page.evaluate(
      async () => (await (await fetch('/api/me')).json()).bangkok_today as string,
    );
    await create(page, 'Report synthetic task', { due_date: today });
    await reports(page);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({
      path: testInfo.outputPath('T054-reports-desktop.png'),
      fullPage: true,
    });
    await page.getByLabel('Date basis', { exact: true }).focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('เริ่มวันที่', { exact: true })).toBeFocused();
    await page.setViewportSize({ width: 360, height: 900 });
    await expect(page.getByLabel('Date basis', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export CSV', exact: true })).toBeEnabled();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('T054-reports-mobile.png'), fullPage: true });
    await page.evaluate(() =>
      document.styleSheets[0]!.insertRule('html {font-size:200% !important}', 0),
    );
    await expect(page.getByRole('button', { name: 'Export CSV', exact: true })).toBeVisible();
  } finally {
    await f.close();
  }
});
