import { test, expect } from '@playwright/test';
import { projectFixture, tasks, mutate } from './task-workspace-fixtures.js';
import { dateAdd } from '../../frontend/src/task-dates.js';
test('T046/047 actual Gantt/Calendar Viewer and archive read-only; demotion preserves draft, revocation closes private dialogs', async ({
  page,
  browser,
}) => {
  test.setTimeout(60000);
  const f = await projectFixture(page),
    ctx = await browser.newContext();
  try {
    const today = await page.evaluate(async () => {
      const s = await (await fetch('/api/me')).json();
      return s.bangkok_today as string;
    });
    expect(
      (
        await mutate(page, '/api/tasks', {
          project_id: 1,
          title: 'Scoped timeline',
          start_date: today,
          due_date: dateAdd(today, 2),
        })
      ).status,
    ).toBe(201);
    const user = await mutate(page, '/api/users', {
      username: 'TimelineMember',
      display_name: 'Timeline Member',
      temp_password: 'Workspace-member-fixture-password',
    });
    expect(user.status).toBe(201);
    expect(
      (await mutate(page, '/api/projects/1/members/2', { version: 1, access: 'editor' }, 'PUT'))
        .status,
    ).toBe(200);
    const member = await ctx.newPage();
    await member.goto(f.env.APP_ORIGIN);
    await member.getByLabel('ชื่อผู้ใช้', { exact: true }).fill('TimelineMember');
    await member.getByLabel('รหัสผ่าน', { exact: true }).fill('Workspace-member-fixture-password');
    await member.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
    await member.getByLabel('รหัสผ่านปัจจุบัน').fill('Workspace-member-fixture-password');
    await member.getByLabel('รหัสผ่านใหม่', { exact: true }).fill('Timeline-new-fixture-password');
    await member.getByLabel('ยืนยันรหัสผ่านใหม่').fill('Timeline-new-fixture-password');
    await member.getByRole('button', { name: 'เปลี่ยนรหัสผ่าน', exact: true }).click();
    const jobs = await tasks(member);
    await jobs.getByRole('button', { name: 'Gantt', exact: true }).click();
    await jobs.getByRole('button', { name: /เปิดงาน #1 Scoped timeline/ }).click();
    const detail = member.getByRole('dialog', { name: 'รายละเอียดงาน #1', exact: true });
    await detail.getByLabel('ชื่องาน', { exact: true }).fill('Retained draft');
    expect(
      (await mutate(page, '/api/projects/1/members/2', { version: 2, access: 'viewer' }, 'PUT'))
        .status,
    ).toBe(200);
    await expect(detail.getByRole('button', { name: 'บันทึกงาน', exact: true })).toBeDisabled({
      timeout: 10000,
    });
    await expect(detail.getByLabel('ชื่องาน', { exact: true })).toHaveValue('Retained draft');
    member.once('dialog', (d) => d.accept());
    await detail.locator(':scope > button').filter({ hasText: 'ปิดหน้าต่าง' }).click();
    await expect(jobs.getByRole('button', { name: 'สร้างงาน', exact: true })).toHaveCount(0);
    await jobs.getByRole('button', { name: 'Calendar', exact: true }).click();
    await jobs.locator('.calendar-event').click();
    await expect(detail.getByLabel('วันส่ง', { exact: true })).toBeDisabled();
    await detail.locator(':scope > button').filter({ hasText: 'ปิดหน้าต่าง' }).click();
    expect(
      (await mutate(page, '/api/projects/1', { version: 3, archived: true }, 'PATCH')).status,
    ).toBe(200);
    await expect(jobs.getByText('เก็บแล้ว · อ่านอย่างเดียว', { exact: true })).toBeVisible({
      timeout: 10000,
    });
    await jobs.locator('.calendar-event').click();
    await expect(detail.getByRole('button', { name: 'บันทึกงาน', exact: true })).toBeDisabled();
    expect((await mutate(page, '/api/projects/1/members/2', { version: 4 }, 'DELETE')).status).toBe(
      200,
    );
    await expect(jobs).toHaveCount(0, { timeout: 10000 });
    await expect(detail).toHaveCount(0);
    await expect(member.getByText('Scoped timeline', { exact: false })).toHaveCount(0);
    await page.getByRole('link', { name: 'โปรเจกต์', exact: true }).click();
    await page.getByLabel('รวมที่เก็บแล้ว', { exact: true }).check();
    await page.getByRole('button', { name: 'งาน', exact: true }).click();
    const adminJobs = page.getByRole('dialog', {
      name: 'งานในโปรเจกต์ · Task project',
      exact: true,
    });
    await adminJobs.getByRole('button', { name: 'Gantt', exact: true }).click();
    await adminJobs.getByRole('button', { name: /เปิดงาน #1 Scoped timeline/ }).click();
    await expect(
      page
        .getByRole('dialog', { name: 'รายละเอียดงาน #1', exact: true })
        .getByLabel('วันส่ง', { exact: true }),
    ).toBeDisabled();
  } finally {
    await ctx.close();
    await f.close();
  }
});
