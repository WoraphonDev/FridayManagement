import { test, expect } from '@playwright/test';
import { projectFixture, tasks } from './task-workspace-fixtures.js';
test('T061 actual maintenance notice disables task writes and preserves an unsaved draft', async ({
  page,
}) => {
  const f = await projectFixture(page);
  let thaw: (() => Promise<void>) | undefined;
  try {
    const workspace = await tasks(page);
    await workspace.getByRole('button', { name: 'สร้างงาน', exact: true }).first().click();
    const form = page.getByRole('dialog', { name: 'สร้างงาน', exact: true });
    await form.getByLabel('ชื่องาน', { exact: true }).fill('ร่างระหว่างสำรอง');
    thaw = await f.freeze();
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(
      page.getByText('ระบบอยู่ระหว่างบำรุงรักษา กรุณารอก่อนทำรายการ', { exact: true }),
    ).toBeVisible({ timeout: 15000 });
    await expect(form.getByLabel('ชื่องาน', { exact: true })).toHaveValue('ร่างระหว่างสำรอง');
    await expect(form.getByRole('button', { name: 'บันทึกงาน', exact: true })).toBeDisabled();
    const rejected = await page.evaluate(async () => {
      const response = await fetch('/api/session/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      return { status: response.status, body: await response.json() };
    });
    expect(rejected.status).toBe(503);
    expect(rejected.body.error.code).toBe('MAINTENANCE');
    await thaw();
    thaw = undefined;
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(form.getByRole('button', { name: 'บันทึกงาน', exact: true })).toBeEnabled({
      timeout: 15000,
    });
    await expect(form.getByLabel('ชื่องาน', { exact: true })).toHaveValue('ร่างระหว่างสำรอง');
  } finally {
    await thaw?.();
    await f.close();
  }
});
