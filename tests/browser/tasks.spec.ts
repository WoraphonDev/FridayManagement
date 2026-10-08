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
async function make(page: Page, title: string) {
  const jobs = await tasks(page);
  await jobs.getByRole('button', { name: 'สร้างงาน', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'สร้างงาน', exact: true });
  await d.getByLabel('ชื่องาน', { exact: true }).fill(title);
  await d.getByRole('button', { name: 'บันทึกงาน', exact: true }).click();
  await expect(d).toHaveCount(0);
  return jobs;
}
const detail = (page: Page) => page.getByRole('dialog', { name: /^รายละเอียดงาน #/ });
const closeDetail = (page: Page) =>
  detail(page).locator(':scope > button').filter({ hasText: 'ปิดหน้าต่าง' }).click();
test('T032/033 actual all task fields/checklist/closed guard/monthly successor/delete/restore via UI', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    const jobs = await tasks(page);
    await jobs.getByRole('button', { name: 'สร้างงาน', exact: true }).click();
    const create = page.getByRole('dialog', { name: 'สร้างงาน', exact: true });
    await create.getByLabel('ชื่องาน', { exact: true }).fill('Monthly plan');
    await create.getByLabel('รายละเอียด', { exact: true }).fill('<script>literal</script>');
    await create.getByLabel('หมวดหมู่', { exact: true }).fill('Finance');
    await create.getByLabel('ผู้รับ', { exact: true }).selectOption('1');
    await create.getByLabel('ความสำคัญ', { exact: true }).selectOption('urgent');
    await create.getByLabel('วันเริ่ม', { exact: true }).fill('2027-01-29');
    await create.getByLabel('งานซ้ำ', { exact: true }).selectOption('monthly');
    await expect(create.getByRole('button', { name: 'บันทึกงาน', exact: true })).toBeDisabled();
    await create.getByLabel('วันส่ง', { exact: true }).fill('2027-01-31');
    await create.getByRole('button', { name: 'บันทึกงาน', exact: true }).click();
    await expect(create).toHaveCount(0);
    await jobs.getByRole('button', { name: 'เปิดงาน #1', exact: true }).click();
    let d = detail(page);
    await expect(d.getByLabel('รายละเอียด', { exact: true })).toHaveValue(
      '<script>literal</script>',
    );
    await expect(d.getByLabel('ผู้รับ', { exact: true })).toHaveValue('1');
    await d.getByLabel('เพิ่ม Checklist', { exact: true }).fill('Review');
    await d.getByRole('button', { name: 'เพิ่ม Checklist', exact: true }).click();
    await expect(d.getByRole('heading', { name: 'Checklist 0/1', exact: true })).toBeVisible();
    await d.getByRole('button', { name: 'แก้ Checklist Review', exact: true }).click();
    await d.getByLabel('ชื่อ Checklist ใหม่', { exact: true }).fill('Review final');
    await d.getByRole('button', { name: 'บันทึกชื่อ Checklist', exact: true }).click();
    await expect(d.getByLabel('Review final', { exact: true })).toBeVisible();
    await d.getByLabel('สถานะ', { exact: true }).selectOption('done');
    await d.getByRole('button', { name: 'บันทึกงาน', exact: true }).click();
    await expect(d.getByText('ต้องทำ Checklist ให้ครบก่อนปิดงาน', { exact: true })).toBeVisible();
    await d.getByLabel('Review final', { exact: true }).click();
    await expect(d.getByRole('heading', { name: 'Checklist 1/1', exact: true })).toBeVisible();
    await expect(d.getByLabel('สถานะ', { exact: true })).toHaveValue('todo');
    await d.getByLabel('สถานะ', { exact: true }).selectOption('done');
    await d.getByRole('button', { name: 'บันทึกงาน', exact: true }).click();
    await expect(d.getByText('บันทึกแล้ว · สร้างงานรอบถัดไป #2', { exact: true })).toBeVisible();
    await expect(d.getByLabel('Review final', { exact: true })).toBeDisabled();
    await expect(d.getByLabel('เพิ่ม Checklist', { exact: true })).toHaveCount(0);
    await d.getByLabel('สถานะ', { exact: true }).selectOption('doing');
    await d.getByRole('button', { name: 'บันทึกงาน', exact: true }).click();
    await expect(d.getByText('บันทึกงานแล้ว', { exact: true })).toBeVisible();
    await d.getByLabel('Review final', { exact: true }).click();
    await expect(d.getByRole('heading', { name: 'Checklist 0/1', exact: true })).toBeVisible();
    await d.getByRole('button', { name: 'ลบ Checklist Review final', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'ยืนยันลบ Checklist', exact: true })
      .getByRole('button', { name: 'ยืนยันลบ Checklist นี้', exact: true })
      .click();
    await expect(d.getByRole('heading', { name: 'Checklist 0/0', exact: true })).toBeVisible();
    await d.getByRole('button', { name: 'ลบงาน', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'ยืนยันลบงาน', exact: true })
      .getByRole('button', { name: 'ยืนยันลบงานนี้', exact: true })
      .click();
    await expect(d).toHaveCount(0);
    await expect(jobs.getByRole('button', { name: 'เปิดงาน #1', exact: true })).toHaveCount(0);
    await jobs.locator(':scope > button').filter({ hasText: 'ปิดหน้าต่าง' }).click();
    await page.getByRole('link', { name: 'ถังขยะ', exact: true }).click();
    await expect(page.getByRole('columnheader', { name: 'กู้คืนก่อน', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'คืนงาน #1', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'ยืนยันคืนงาน', exact: true })
      .getByRole('button', { name: 'ยืนยันคืนงานนี้', exact: true })
      .click();
    await expect(page.getByText('คืนงาน #1 แล้ว', { exact: true })).toBeVisible();
    const again = await tasks(page);
    await again.getByRole('button', { name: 'เปิดงาน #2', exact: true }).click();
    d = detail(page);
    await expect(d.getByLabel('วันส่ง', { exact: true })).toHaveValue('2027-02-28');
    await expect(d.getByRole('heading', { name: 'Checklist 0/1', exact: true })).toBeVisible();
    await closeDetail(page);
    await expect(again.getByRole('button', { name: 'เปิดงาน #1', exact: true })).toBeVisible();
  } finally {
    await f.close();
  }
});
test('T032 actual 409 draft review, unsaved close/route cancellation, offline and mobile keyboard', async ({
  page,
}, testInfo) => {
  const f = await projectFixture(page);
  try {
    const jobs = await make(page, 'Original');
    await jobs.getByRole('button', { name: 'เปิดงาน #1', exact: true }).click();
    const d = detail(page);
    await d.getByLabel('ชื่องาน', { exact: true }).fill('My draft');
    const other = await mutate(
      page,
      '/api/tasks/1',
      { version: 1, title: 'Remote update' },
      'PATCH',
    );
    expect(other.status).toBe(200);
    await d.getByRole('button', { name: 'บันทึกงาน', exact: true }).click();
    await expect(d.getByLabel('ชื่องาน', { exact: true })).toHaveValue('My draft');
    await d.getByRole('button', { name: 'โหลดล่าสุดและเทียบร่าง', exact: true }).click();
    await expect(d.getByText(/ข้อมูลล่าสุด: Remote update/)).toBeVisible();
    await expect(d.getByRole('button', { name: 'บันทึกงาน', exact: true })).toBeDisabled();
    await d.getByLabel('ยืนยันตรวจข้อมูลล่าสุดและร่างแล้ว').check();
    await d.getByRole('button', { name: 'บันทึกงาน', exact: true }).click();
    await expect(d.getByText('บันทึกงานแล้ว', { exact: true })).toBeVisible();
    await d.getByLabel('ชื่องาน', { exact: true }).fill('Unsaved');
    page.once('dialog', (dialog) => dialog.dismiss());
    await closeDetail(page);
    await expect(d.getByLabel('ชื่องาน', { exact: true })).toHaveValue('Unsaved');
    page.once('dialog', (dialog) => dialog.dismiss());
    await page.evaluate(() => history.back());
    await expect(d.getByLabel('ชื่องาน', { exact: true })).toHaveValue('Unsaved');
    await expect(page).toHaveURL(/\/projects$/);
    await page.context().setOffline(true);
    await expect(d.getByRole('button', { name: 'บันทึกงาน', exact: true })).toBeDisabled();
    await page.context().setOffline(false);
    await expect(page.getByRole('button', { name: 'ออกจากระบบ', exact: true })).toBeEnabled({
      timeout: 15000,
    });
    await expect(d.getByLabel('ชื่องาน', { exact: true })).toBeEnabled();
    await page.setViewportSize({ width: 360, height: 800 });
    await d.getByLabel('ชื่องาน', { exact: true }).focus();
    await page.keyboard.press('Tab');
    expect(
      await d
        .getByLabel('รายละเอียด', { exact: true })
        .evaluate((e) => e === document.activeElement),
    ).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath('T032-task-detail.png'), fullPage: true });
    page.once('dialog', (dialog) => dialog.accept());
    await page.evaluate(() => history.back());
    await expect(page).not.toHaveURL(/\/projects$/);
    await expect(d).toHaveCount(0);
  } finally {
    await f.close();
  }
});
test('T032 Viewer detail and archived Admin are read-only; managed archived delete/restore through UI', async ({
  page,
  browser,
}) => {
  const f = await projectFixture(page),
    ctx = await browser.newContext();
  try {
    const made = await mutate(page, '/api/tasks', { project_id: 1, title: 'Archived task' });
    expect(made.status).toBe(201);
    const user = await mutate(page, '/api/users', {
      username: 'TaskViewer',
      display_name: 'Task Viewer',
      temp_password: password,
    });
    expect(user.status).toBe(201);
    await mutate(
      page,
      `/api/projects/1/members/${user.body.item.id}`,
      { version: 1, access: 'viewer' },
      'PUT',
    );
    const member = await ctx.newPage();
    await member.goto(f.env.APP_ORIGIN);
    await member.getByLabel('ชื่อผู้ใช้', { exact: true }).fill('TaskViewer');
    await member.getByLabel('รหัสผ่าน', { exact: true }).fill(password);
    await member.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
    await member.getByLabel('รหัสผ่านปัจจุบัน').fill(password);
    await member.getByLabel('รหัสผ่านใหม่', { exact: true }).fill('Task-viewer-new-password');
    await member.getByLabel('ยืนยันรหัสผ่านใหม่').fill('Task-viewer-new-password');
    await member.getByRole('button', { name: 'เปลี่ยนรหัสผ่าน', exact: true }).click();
    const jobs = await tasks(member);
    await expect(jobs.getByRole('button', { name: 'สร้างงาน', exact: true })).toHaveCount(0);
    await jobs.getByRole('button', { name: 'เปิดงาน #1', exact: true }).click();
    const read = detail(member);
    await expect(read.getByLabel('ชื่องาน', { exact: true })).toHaveValue('Archived task');
    await expect(read.getByLabel('ชื่องาน', { exact: true })).toBeDisabled();
    await expect(read.getByRole('button', { name: 'ลบงาน', exact: true })).toHaveCount(0);
    await mutate(page, `/api/projects/1/members/${user.body.item.id}`, { version: 2 }, 'DELETE');
    await read.getByRole('button', { name: 'ตรวจข้อมูลล่าสุด', exact: true }).click();
    await expect(read).toHaveCount(0);
    const archived = await mutate(page, '/api/projects/1', { version: 3, archived: true }, 'PATCH');
    expect(archived.status).toBe(200);
    await page.getByRole('link', { name: 'โปรเจกต์', exact: true }).click();
    await page.getByLabel('รวมที่เก็บแล้ว').check();
    await page.getByRole('button', { name: 'งาน', exact: true }).click();
    const adminJobs = page.getByRole('dialog', {
      name: 'งานในโปรเจกต์ · Task project',
      exact: true,
    });
    await expect(adminJobs.getByRole('button', { name: 'สร้างงาน', exact: true })).toHaveCount(0);
    await adminJobs.getByRole('button', { name: 'เปิดงาน #1', exact: true }).click();
    const admin = detail(page);
    await expect(admin.getByLabel('ชื่องาน', { exact: true })).toBeDisabled();
    await admin.getByRole('button', { name: 'ลบงาน', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'ยืนยันลบงาน', exact: true })
      .getByRole('button', { name: 'ยืนยันลบงานนี้', exact: true })
      .click();
    await expect(admin).toHaveCount(0);
    await adminJobs.locator(':scope > button').filter({ hasText: 'ปิดหน้าต่าง' }).click();
    await page.getByRole('link', { name: 'ถังขยะ', exact: true }).click();
    await page.getByRole('button', { name: 'คืนงาน #1', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'ยืนยันคืนงาน', exact: true })
      .getByRole('button', { name: 'ยืนยันคืนงานนี้', exact: true })
      .click();
    await expect(page.getByText('คืนงาน #1 แล้ว', { exact: true })).toBeVisible();
  } finally {
    await ctx.close();
    await f.close();
  }
});
