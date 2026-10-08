import { test, expect } from '@playwright/test';
import { projectFixture, tasks } from './task-workspace-fixtures.js';
test('T061 actual maintenance notice disables task writes and preserves an unsaved draft', async ({
  page,
}) => {
  const f = await projectFixture(page);
  let thaw: (() => Promise<void>) | undefined;
  try {
    const workspace = await tasks(page);
    await workspace.getByRole('button', { name: 'New task', exact: true }).first().click();
    const form = page.getByRole('dialog', { name: 'Create task', exact: true });
    await form.getByLabel('Task title', { exact: true }).fill('ร่างระหว่างสำรอง');
    thaw = await f.freeze();
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(
      page.getByText('Maintenance in progress. Please try again later.', { exact: true }),
    ).toBeVisible({ timeout: 15000 });
    await expect(form.getByLabel('Task title', { exact: true })).toHaveValue('ร่างระหว่างสำรอง');
    // Vibe editor hides the submit control while writes are blocked.
    await expect(form.getByRole('button', { name: 'New task', exact: true })).toHaveCount(0);
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
    await expect(form.getByRole('button', { name: 'New task', exact: true })).toBeEnabled({
      timeout: 15000,
    });
    await expect(form.getByLabel('Task title', { exact: true })).toHaveValue('ร่างระหว่างสำรอง');
  } finally {
    await thaw?.();
    await f.close();
  }
});
