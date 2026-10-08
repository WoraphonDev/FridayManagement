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
    await page.getByLabel('ชื่อผู้ใช้', { exact: true }).fill('WorkspaceAdmin');
    await page.getByLabel('รหัสผ่าน', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
    await expect(page.getByRole('link', { name: 'ทีม', exact: true })).toBeVisible();
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
async function createTeam(page: Page, name = 'ทีมตัวอย่าง') {
  await page.getByRole('link', { name: 'ทีม', exact: true }).click();
  await page.getByRole('button', { name: 'สร้างทีม', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('ชื่อ', { exact: true }).fill(name);
  await dialog.getByLabel('รายละเอียด', { exact: true }).fill('ทีมออกแบบ');
  await dialog.getByRole('button', { name: 'บันทึก', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('cell').filter({ hasText: name }).first()).toBeVisible();
}
test('T023/024 actual create/edit/archive/project membership UI and active-project guard', async ({
  page,
}) => {
  const f = await fixture(page);
  try {
    await createTeam(page);
    await page.getByRole('link', { name: 'โปรเจกต์', exact: true }).click();
    await page.getByRole('button', { name: 'สร้างโปรเจกต์', exact: true }).click();
    let dialog = page.getByRole('dialog');
    await dialog.getByLabel('ชื่อ', { exact: true }).fill('Website Launch');
    await dialog.getByLabel('ทีมเจ้าของ', { exact: true }).selectOption({ label: 'ทีมตัวอย่าง' });
    await dialog.getByRole('button', { name: 'บันทึก', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await page.getByRole('button', { name: 'สมาชิก', exact: true }).click();
    dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('cell', { name: 'Workspace Admin', exact: true })).toBeVisible();
    await dialog
      .getByLabel('ผู้ใช้', { exact: true })
      .selectOption({ label: 'Workspace Admin · ไม่มีทีม' });
    await dialog.getByLabel('บทบาท', { exact: true }).selectOption('viewer');
    await dialog.getByRole('button', { name: 'กำหนดสมาชิก', exact: true }).click();
    await dialog.getByRole('button', { name: 'ยืนยันเปลี่ยนสิทธิ์', exact: true }).click();
    await expect(dialog.getByRole('cell', { name: 'viewer', exact: true })).toBeVisible();
    await expect(dialog.getByRole('cell', { name: 'admin', exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'ปิดหน้าต่าง' }).click();
    await page.getByRole('link', { name: 'ทีม', exact: true }).click();
    await page.getByRole('button', { name: 'เก็บ', exact: true }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'ยืนยัน', exact: true }).click();
    await expect(dialog.getByRole('alert')).toBeVisible();
    await dialog.getByRole('button', { name: 'ปิดหน้าต่าง' }).click();
    await page.getByRole('link', { name: 'โปรเจกต์', exact: true }).click();
    await page.getByRole('button', { name: 'เก็บ', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'ยืนยัน', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByLabel('รวมที่เก็บแล้ว').check();
    await expect(page.getByRole('button', { name: 'เปิดคืน', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'ทีม', exact: true }).click();
    await page.getByRole('button', { name: 'เก็บ', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'ยืนยัน', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByLabel('รวมที่เก็บแล้ว').check();
    await expect(page.getByRole('button', { name: 'เปิดคืน', exact: true })).toBeVisible();
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
    await page.getByRole('button', { name: 'สมาชิก', exact: true }).click();
    let dialog = page.getByRole('dialog');
    await dialog
      .getByLabel('ผู้ใช้', { exact: true })
      .selectOption({ label: 'สมาชิกต่างทีม · ไม่มีทีม' });
    await dialog.getByLabel('บทบาท', { exact: true }).selectOption('lead');
    await dialog.getByRole('button', { name: 'กำหนดสมาชิก', exact: true }).click();
    await dialog.getByRole('button', { name: 'ยืนยันเปลี่ยนสิทธิ์', exact: true }).click();
    await expect(dialog.getByRole('button', { name: 'ถอด Lead', exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'ถอด Lead', exact: true }).click();
    await dialog.getByRole('button', { name: 'ยืนยันเปลี่ยนสิทธิ์', exact: true }).click();
    await expect(dialog.getByRole('button', { name: 'ตั้ง Lead', exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'ถอนสมาชิก', exact: true }).click();
    await dialog.getByRole('button', { name: 'ยกเลิกคำสั่ง', exact: true }).click();
    await expect(dialog.getByRole('cell', { name: 'สมาชิกต่างทีม', exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'ปิดหน้าต่าง' }).click();
    await page.getByRole('button', { name: 'แก้ไข', exact: true }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByLabel('ชื่อ', { exact: true }).fill('ร่างของฉัน');
    const latest = await page.evaluate(async () => await (await fetch('/api/teams')).json());
    const changed = await mutate(
      page,
      '/api/teams/' + latest.items[0].id,
      { version: latest.items[0].version, name: 'แก้จากอีกหน้าต่าง' },
      'PATCH',
    );
    expect(changed.status).toBe(200);
    await dialog.getByRole('button', { name: 'บันทึก', exact: true }).click();
    await expect(dialog.getByRole('button', { name: 'โหลดล่าสุดและตรวจทาน' })).toBeVisible();
    await expect(dialog.getByLabel('ชื่อ', { exact: true })).toHaveValue('ร่างของฉัน');
    await dialog.getByRole('button', { name: 'โหลดล่าสุดและตรวจทาน' }).click();
    await expect(dialog.getByText(/ข้อมูลล่าสุด: แก้จากอีกหน้าต่าง/)).toBeVisible();
    await dialog.getByLabel('ยืนยันตรวจข้อมูลล่าสุดและร่างแล้ว').check();
    await dialog.getByRole('button', { name: 'บันทึก', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('cell').filter({ hasText: 'ร่างของฉัน' })).toBeVisible();
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
    await member.getByLabel('ชื่อผู้ใช้', { exact: true }).fill('ViewerFixture');
    await member.getByLabel('รหัสผ่าน', { exact: true }).fill(password);
    await member.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
    await member.getByLabel('รหัสผ่านปัจจุบัน').fill(password);
    await member.getByLabel('รหัสผ่านใหม่', { exact: true }).fill('Viewer-new-fixture-password');
    await member.getByLabel('ยืนยันรหัสผ่านใหม่').fill('Viewer-new-fixture-password');
    await member.getByRole('button', { name: 'เปลี่ยนรหัสผ่าน', exact: true }).click();
    await member.getByRole('link', { name: 'โปรเจกต์', exact: true }).click();
    await expect(
      member.getByRole('cell').filter({ hasText: 'Shared private project' }),
    ).toBeVisible();
    await expect(member.getByText('Hidden project', { exact: true })).toHaveCount(0);
    await expect(member.getByRole('button', { name: 'สร้างโปรเจกต์', exact: true })).toHaveCount(0);
    await expect(member.getByRole('button', { name: 'แก้ไข', exact: true })).toHaveCount(0);
    await member.getByRole('button', { name: 'สมาชิก', exact: true }).click();
    await expect(
      member.getByRole('dialog').getByText('คุณอ่านรายชื่อได้', { exact: false }),
    ).toBeVisible();
    await expect(
      member.getByRole('dialog').getByRole('button', { name: 'กำหนดสมาชิก', exact: true }),
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
    await page.getByRole('link', { name: 'ทีม', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'ทีมในองค์กร', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  } finally {
    await ctx.close();
    await f.close();
  }
});
