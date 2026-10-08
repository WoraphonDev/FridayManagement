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
    await page.getByLabel('ชื่อผู้ใช้', { exact: true }).fill('WorkspaceAdmin');
    await page.getByLabel('รหัสผ่าน', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
    await expect(page.getByRole('link', { name: 'ทีม', exact: true })).toBeVisible();
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
          ...(['POST', 'PATCH'].includes(method) ? { 'Idempotency-Key': crypto.randomUUID() } : {}),
        },
        body: JSON.stringify(body),
      });
      return { status: response.status, body: await response.json() };
    },
    { path, body, method },
  );
}
async function projectFixture(page: Page) {
  const f = await fixture(page);
  const team = await mutate(page, '/api/teams', { name: 'Task team' }),
    project = await mutate(page, '/api/projects', {
      name: 'Task project',
      owner_team_id: team.body.item.id,
    });
  expect(project.status).toBe(201);
  return { ...f, project: project.body.item };
}
async function tasks(page: Page) {
  await page.getByRole('link', { name: 'โปรเจกต์', exact: true }).click();
  await page.getByRole('button', { name: 'งาน', exact: true }).click();
  return page.getByRole('dialog', { name: 'งานในโปรเจกต์ · Task project', exact: true });
}
const detail = (page: Page) => page.getByRole('dialog', { name: /^รายละเอียดงาน #/ });
async function board(page: Page) {
  const jobs = await tasks(page);
  await jobs.getByRole('button', { name: 'Kanban', exact: true }).click();
  const b = jobs.getByRole('region', { name: 'Kanban โปรเจกต์' });
  await expect(b.getByRole('button', { name: 'ลากงาน #1', exact: true })).toBeVisible();
  return b;
}
async function setupCards(page: Page) {
  const f = await projectFixture(page);
  for (const title of ['Alpha', 'Beta', 'Gamma']) {
    const made = await mutate(page, '/api/tasks', { project_id: 1, title });
    expect(made.status).toBe(201);
  }
  return f;
}
async function drag(page: Page, task: number, target: ReturnType<Page['locator']>) {
  const handle = page.getByRole('button', { name: `ลากงาน #${task}`, exact: true }),
    a = await handle.boundingBox(),
    b = await target.boundingBox();
  expect(a && b).toBeTruthy();
  await page.mouse.move(a!.x + a!.width / 2, a!.y + a!.height / 2);
  await page.mouse.down();
  await page.mouse.move(a!.x + a!.width / 2 + 12, a!.y + a!.height / 2, { steps: 3 });
  await page.mouse.move(b!.x + b!.width / 2, b!.y + 30, { steps: 18 });
  await page.mouse.up();
}
test('T036 actual mouse cross-column/in-column drag, pending ack, refresh and second tab persistence', async ({
  page,
}) => {
  const f = await setupCards(page);
  try {
    await page.setViewportSize({ width: 1280, height: 1500 });
    let b = await board(page);
    let acknowledge: (() => void) | undefined;
    await page.route('**/api/projects/1/board/move', async (route) => {
      const response = await route.fetch();
      await new Promise<void>((resolve) => {
        acknowledge = resolve;
      });
      await route.fulfill({ response });
    });
    await drag(page, 3, b.locator('[data-task-id="1"]'));
    await expect(b.getByText('กำลังบันทึกตำแหน่ง…', { exact: true })).toBeVisible();
    await expect(b.getByText('บันทึกตำแหน่งแล้ว', { exact: true })).toHaveCount(0);
    await expect.poll(() => !!acknowledge).toBe(true);
    acknowledge!();

    await expect(b.getByText('บันทึกตำแหน่งแล้ว', { exact: true })).toBeVisible();
    expect(
      await b
        .getByRole('region', { name: 'คอลัมน์ รอทำ' })
        .locator('[data-task-id]')
        .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-task-id'))),
    ).toEqual(['3', '1', '2']);
    await page.unroute('**/api/projects/1/board/move');
    await drag(page, 1, b.getByRole('region', { name: 'คอลัมน์ กำลังทำ' }));
    await expect(
      b
        .getByRole('region', { name: 'คอลัมน์ กำลังทำ' })
        .getByRole('button', { name: 'เปิดงาน #1', exact: true }),
    ).toBeVisible();
    await expect(b.getByText('บันทึกตำแหน่งแล้ว', { exact: true })).toBeVisible();
    await page.reload();
    b = await board(page);
    await expect(
      b
        .getByRole('region', { name: 'คอลัมน์ กำลังทำ' })
        .getByRole('button', { name: 'เปิดงาน #1', exact: true }),
    ).toBeVisible();
    const other = await page.context().newPage();
    await other.goto(f.env.APP_ORIGIN);
    const second = await board(other);
    await expect(
      second.getByRole('region', { name: 'คอลัมน์ รอทำ' }).locator('[data-task-id]').first(),
    ).toHaveAttribute('data-task-id', '3');
    await other.close();
  } finally {
    await f.close();
  }
});
test('T037 keyboard status/up/down and every filter disables reorder, clear restores controls', async ({
  page,
}) => {
  const f = await setupCards(page);
  try {
    const b = await board(page);
    await b.getByText('จัดการงาน #3', { exact: true }).focus();
    await page.keyboard.press('Enter');
    await b.getByRole('button', { name: 'เลื่อนขึ้น #3', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(b.getByText('บันทึกตำแหน่งแล้ว', { exact: true })).toBeVisible();
    expect(
      await b
        .getByRole('region', { name: 'คอลัมน์ รอทำ' })
        .locator('[data-task-id]')
        .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-task-id'))),
    ).toEqual(['1', '3', '2']);
    await b.getByLabel('สถานะงาน #3', { exact: true }).selectOption('review');
    await expect(
      b
        .getByRole('region', { name: 'คอลัมน์ รอตรวจ' })
        .getByRole('button', { name: 'เปิดงาน #3', exact: true }),
    ).toBeVisible();
    await b.getByText('ตัวกรองบอร์ด', { exact: true }).click();
    for (const [label, value] of [
      ['ค้นหาบอร์ด', 'Alpha'],
      ['หมวดหมู่บอร์ด', 'Other'],
      ['วันส่งบอร์ดจาก', '2026-10-01'],
      ['วันส่งบอร์ดถึง', '2026-12-31'],
    ]) {
      await b.getByLabel(label!, { exact: true }).fill(value!);
      await expect(b.getByText(/กำลังกรองรายการ ปิดการลาก/)).toBeVisible();
      await expect(b.locator('button.drag-handle:not(:disabled)')).toHaveCount(0);
      await b.getByRole('button', { name: 'ล้างตัวกรอง', exact: true }).click();
      await expect(b.getByRole('button', { name: 'ลากงาน #1', exact: true })).toBeEnabled();
    }
    for (const [label, value] of [
      ['ผู้รับบอร์ด', 'null'],
      ['ความสำคัญบอร์ด', 'medium'],
      ['กรองสถานะบอร์ด', 'todo'],
    ]) {
      await b.getByLabel(label!, { exact: true }).selectOption(value!);
      await expect(b.locator('button.drag-handle:not(:disabled)')).toHaveCount(0);
      await b.getByRole('button', { name: 'ล้างตัวกรอง', exact: true }).click();
      await expect(b.getByRole('button', { name: 'ลากงาน #1', exact: true })).toBeEnabled();
    }
  } finally {
    await f.close();
  }
});
test('T038 validation rollback, two-tab conflict, lost response authoritative GET then same-key replay', async ({
  page,
}) => {
  const f = await setupCards(page);
  try {
    const b = await board(page);
    await mutate(page, '/api/tasks/1/subtasks', { task_version: 1, title: 'Incomplete' });
    await b.getByRole('button', { name: 'โหลดบอร์ดล่าสุด', exact: true }).click();
    await b.getByText('จัดการงาน #1', { exact: true }).click();
    await b.getByLabel('สถานะงาน #1', { exact: true }).selectOption('done');
    await expect(b.getByRole('alert')).toBeVisible();
    await expect(
      b
        .getByRole('region', { name: 'คอลัมน์ รอทำ' })
        .getByRole('button', { name: 'เปิดงาน #1', exact: true }),
    ).toBeVisible();
    await mutate(page, '/api/tasks/1', { version: 2, status: 'doing' }, 'PATCH');
    await b.getByText('จัดการงาน #2', { exact: true }).click();
    await b.getByLabel('สถานะงาน #2', { exact: true }).selectOption('review');
    await expect(
      b.getByText('ตำแหน่งเปลี่ยนแล้ว โหลดข้อมูลล่าสุด กรุณาเลือกการย้ายใหม่', { exact: true }),
    ).toBeVisible();
    await expect(
      b
        .getByRole('region', { name: 'คอลัมน์ กำลังทำ' })
        .getByRole('button', { name: 'เปิดงาน #1', exact: true }),
    ).toBeVisible();
    const keys: string[] = [],
      calls: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('/board')) calls.push(r.method());
    });
    await page.route('**/api/projects/1/board/move', async (route) => {
      keys.push(route.request().headers()['idempotency-key']!);
      await route.fetch();
      await route.abort('failed');
    });
    await b.getByText('จัดการงาน #3', { exact: true }).click();
    await b.getByLabel('สถานะงาน #3', { exact: true }).selectOption('doing');
    await expect(b.getByText(/ยังยืนยันผลไม่ได้/)).toBeVisible();
    await expect(
      b
        .getByRole('region', { name: 'คอลัมน์ กำลังทำ' })
        .getByRole('button', { name: 'เปิดงาน #3', exact: true }),
    ).toBeVisible();
    expect(calls.indexOf('GET')).toBeGreaterThan(calls.indexOf('POST'));
    await page.unroute('**/api/projects/1/board/move');
    await page.route('**/api/projects/1/board/move', async (route) => {
      keys.push(route.request().headers()['idempotency-key']!);
      await route.continue();
    });
    await b.getByRole('button', { name: 'ตรวจข้อมูลแล้วลองคำสั่งเดิม', exact: true }).click();
    await expect(b.getByText('บันทึกตำแหน่งแล้ว', { exact: true })).toBeVisible();
    expect(keys.length).toBe(2);
    expect(keys[0]).toBe(keys[1]);
    const t = await (await page.request.get(f.env.APP_ORIGIN + '/api/tasks/3')).json();
    expect(t.item.version).toBe(2);
    await b.getByRole('button', { name: 'เปิดงาน #3', exact: true }).click();
    const d = detail(page);
    await d.getByLabel('ชื่องาน', { exact: true }).fill('My draft');
    await mutate(page, '/api/tasks/3', { version: 2, status: 'review' }, 'PATCH');
    await d.getByRole('button', { name: 'บันทึกงาน', exact: true }).click();
    await expect(d.getByLabel('ชื่องาน', { exact: true })).toHaveValue('My draft');
    await expect(
      d.getByText('เก็บร่างของคุณไว้แล้ว กรุณาตรวจข้อมูลล่าสุดก่อนบันทึก', { exact: true }),
    ).toBeVisible();
    page.once('dialog', (d) => void d.accept());
    await d.locator(':scope > button').filter({ hasText: 'ปิดหน้าต่าง' }).click();
    await b.getByRole('button', { name: 'โหลดบอร์ดล่าสุด', exact: true }).click();
    await expect(
      b
        .getByRole('region', { name: 'คอลัมน์ รอตรวจ' })
        .getByRole('button', { name: 'เปิดงาน #3', exact: true }),
    ).toBeVisible();
    await page.route('**/api/projects/1/board', (route) => route.abort('failed'));
    await b.getByText('จัดการงาน #2', { exact: true }).click();
    await b.getByLabel('สถานะงาน #2', { exact: true }).selectOption('doing');
    await expect(
      b.getByText('บันทึกตำแหน่งแล้ว แต่โหลดข้อมูลล่าสุดไม่สำเร็จ กรุณาโหลดบอร์ดใหม่', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      b
        .getByRole('region', { name: 'คอลัมน์ กำลังทำ' })
        .getByRole('button', { name: 'เปิดงาน #2', exact: true }),
    ).toBeVisible();
    await expect(
      b.getByRole('button', { name: 'ตรวจข้อมูลแล้วลองคำสั่งเดิม', exact: true }),
    ).toHaveCount(0);
    await page.unroute('**/api/projects/1/board');
    await b.getByRole('button', { name: 'ใช้ข้อมูลล่าสุด', exact: true }).click();
    await expect(b.getByText('ใช้ข้อมูลล่าสุดแล้ว', { exact: true })).toBeVisible();
  } finally {
    await f.close();
  }
});
test('T037 touch scroll and long-press drag with keyboard/menu alternative on emulated touch surface', async ({
  page,
  browser,
}, testInfo) => {
  const f = await setupCards(page);
  let context;
  try {
    context = await browser.newContext({
      hasTouch: true,
      isMobile: true,
      viewport: { width: 1280, height: 1000 },
      storageState: await page.context().storageState(),
    });
    const touch = await context.newPage();
    await touch.goto(f.env.APP_ORIGIN);
    const b = await board(touch);
    const cdp = await context.newCDPSession(touch);
    const scrollBefore = await touch
      .getByRole('dialog', { name: 'งานในโปรเจกต์ · Task project', exact: true })
      .evaluate((n) => n.scrollTop);
    const card = await b.locator('[data-task-id="1"]').boundingBox();
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: card!.x + 30, y: card!.y + 130 }],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: card!.x + 30, y: card!.y + 30 }],
    });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(b.getByRole('button', { name: 'ลากงาน #1', exact: true })).toBeEnabled();
    await expect
      .poll(() =>
        touch
          .getByRole('dialog', { name: 'งานในโปรเจกต์ · Task project', exact: true })
          .evaluate((n) => n.scrollTop),
      )
      .toBeGreaterThan(scrollBefore);
    await touch.waitForTimeout(600);
    await b.getByRole('button', { name: 'ลากงาน #1', exact: true }).scrollIntoViewIfNeeded();
    const handle = await b.getByRole('button', { name: 'ลากงาน #1', exact: true }).boundingBox(),
      target = await b.getByRole('region', { name: 'คอลัมน์ กำลังทำ' }).boundingBox();
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: handle!.x + handle!.width / 2, y: handle!.y + handle!.height / 2 }],
    });
    await touch.waitForTimeout(450);
    for (let step = 1; step <= 10; step++)
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          {
            x:
              handle!.x +
              handle!.width / 2 +
              ((target!.x + target!.width / 2 - handle!.x - handle!.width / 2) * step) / 10,
            y: target!.y + 80,
          },
        ],
      });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(
      b
        .getByRole('region', { name: 'คอลัมน์ กำลังทำ' })
        .getByRole('button', { name: 'เปิดงาน #1', exact: true }),
    ).toBeVisible();
    await touch.setViewportSize({ width: 390, height: 844 });
    await touch.screenshot({ path: testInfo.outputPath('T037-touch-kanban.png'), fullPage: true });
  } finally {
    await context?.close();
    await f.close();
  }
});
test('T037/038 actual Member demotion rolls stale move back; Viewer controls and revocation clear private board', async ({
  page,
  browser,
}) => {
  const f = await setupCards(page),
    ctx = await browser.newContext();
  try {
    const user = await mutate(page, '/api/users', {
      username: 'BoardMember',
      display_name: 'Board Member',
      temp_password: password,
    });
    expect(user.status).toBe(201);
    await mutate(
      page,
      `/api/projects/1/members/${user.body.item.id}`,
      { version: 1, access: 'editor' },
      'PUT',
    );
    const member = await ctx.newPage();
    await member.goto(f.env.APP_ORIGIN);
    await member.getByLabel('ชื่อผู้ใช้', { exact: true }).fill('BoardMember');
    await member.getByLabel('รหัสผ่าน', { exact: true }).fill(password);
    await member.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
    await member.getByLabel('รหัสผ่านปัจจุบัน').fill(password);
    await member.getByLabel('รหัสผ่านใหม่', { exact: true }).fill('Board-member-new-password');
    await member.getByLabel('ยืนยันรหัสผ่านใหม่').fill('Board-member-new-password');
    await member.getByRole('button', { name: 'เปลี่ยนรหัสผ่าน', exact: true }).click();
    const b = await board(member);
    await ctx.setOffline(true);
    await member.evaluate(() => window.dispatchEvent(new Event('offline')));
    await expect(b.locator('button.drag-handle:not(:disabled)')).toHaveCount(0);
    await ctx.setOffline(false);
    await member.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(b.getByRole('button', { name: 'ลากงาน #1', exact: true })).toBeEnabled();
    await mutate(
      page,
      `/api/projects/1/members/${user.body.item.id}`,
      { version: 2, access: 'viewer' },
      'PUT',
    );
    await b.getByText('จัดการงาน #1', { exact: true }).click();
    await b.getByLabel('สถานะงาน #1', { exact: true }).selectOption('doing');
    await expect(b.getByRole('alert')).toBeVisible();
    await expect(b.getByRole('button', { name: /ลากงาน/ })).toHaveCount(0);
    await expect(
      b
        .getByRole('region', { name: 'คอลัมน์ รอทำ' })
        .getByRole('button', { name: 'เปิดงาน #1', exact: true }),
    ).toBeVisible();
    await mutate(page, `/api/projects/1/members/${user.body.item.id}`, { version: 3 }, 'DELETE');
    await b.getByRole('button', { name: 'โหลดบอร์ดล่าสุด', exact: true }).click();
    await expect(b.getByRole('button', { name: 'เปิดงาน #1', exact: true })).toHaveCount(0);
    await expect(b.getByLabel('ผู้รับบอร์ด', { exact: true }).locator('option')).toHaveCount(2);
  } finally {
    await ctx.close();
    await f.close();
  }
});
test('T036 >500 controlled boundary fixture renders paginated list and task-detail status menu', async ({
  page,
}) => {
  const f = await setupCards(page);
  const { SqliteDatabase } = await import('../../src/repository/sqlite/database.js'),
    { insert } = await import('../schema/fixtures.js');
  const db = new SqliteDatabase(f.env.SQLITE_DB_PATH!);
  try {
    await db.transaction(async (tx) => {
      for (let id = 4; id <= 501; id++) {
        await tx.execute(
          insert('tasks', { id, project_id: 1, title: 'Boundary ' + id, creator_id: 1 }),
        );
        await tx.execute(
          insert('board_positions', { task_id: id, project_id: 1, status: 'todo', rank: id }),
        );
      }
    });
    const jobs = await tasks(page);
    await jobs.getByRole('button', { name: 'Kanban', exact: true }).click();
    const b = jobs.getByRole('region', { name: 'Kanban โปรเจกต์' });
    await expect(b.getByText(/เกิน 500 งาน ใช้รายการแบ่งหน้า/)).toBeVisible();
    await expect(b.getByRole('button', { name: /ลากงาน/ })).toHaveCount(0);
    await expect(b.getByRole('button', { name: /เปิดงาน/ })).toHaveCount(20);
    await b.getByRole('button', { name: 'บอร์ดหน้าถัดไป', exact: true }).click();
    await expect(b.getByText('หน้า 2 · รวม 501 งาน', { exact: true })).toBeVisible();
    const open = b.getByRole('button', { name: /เปิดงาน/ }).first();
    await open.click();
    const d = detail(page);
    await d.getByLabel('สถานะ', { exact: true }).selectOption('doing');
    await d.getByRole('button', { name: 'บันทึกงาน', exact: true }).click();
    await expect(d.getByText('บันทึกงานแล้ว', { exact: true })).toBeVisible();
  } finally {
    await db.close();
    await f.close();
  }
});
