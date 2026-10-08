import { test, expect } from '@playwright/test';
import { mutate, projectFixture } from './task-workspace-fixtures.js';
// T-083 / AT-34 local Chromium evidence: Home widgets open My work with the matching filter.
const bangkok = (offsetDays: number) =>
  new Date(Date.now() + 7 * 3600000 + offsetDays * 86400000).toISOString().slice(0, 10);
test('Home widgets match My work rows and open it with the same filter; 375px no h-scroll', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    for (const [title, due] of [
      ['เลยกำหนด overdue', bangkok(-1)],
      ['Due today task', bangkok(0)],
      ['Undated task', null],
    ] as const)
      expect(
        (
          await mutate(page, '/api/tasks', {
            project_id: f.project.id,
            title,
            assignee_ids: [1],
            ...(due ? { due_date: due } : {}),
          })
        ).status,
      ).toBe(201);
    await page.goto(f.env.APP_ORIGIN + '/');
    const tile = (name: RegExp) => page.locator('.overview-tile').filter({ hasText: name });
    await expect(tile(/^Overdue/)).toContainText('1');
    await expect(tile(/^Due today/)).toContainText('1');
    await expect(tile(/^No date/)).toContainText('1');
    await tile(/^Overdue/).click();
    await expect(page).toHaveURL(/\/my-tasks\?range=overdue#my-group-overdue$/);
    await expect(page.getByLabel('Due range', { exact: true })).toHaveValue('overdue');
    await expect(page.getByText('เลยกำหนด overdue')).toBeVisible();
    await expect(page.getByText('Due today task')).toHaveCount(0);
    await expect(page.getByText('Undated task')).toHaveCount(0);
    await page.goto(f.env.APP_ORIGIN + '/');
    await tile(/^No date/).click();
    await expect(page.getByLabel('Due range', { exact: true })).toHaveValue('none');
    await expect(page.getByText('Undated task')).toBeVisible();
    await expect(page.getByText('เลยกำหนด overdue')).toHaveCount(0);
    await page.goto(f.env.APP_ORIGIN + '/');
    await page.getByRole('link', { name: 'Task project', exact: true }).click();
    await expect(page).toHaveURL(/\/my-tasks\?project=\d+$/);
    await expect(page.getByText('Due today task')).toBeVisible();
    // Inline status change in My work moves the task into the Done group (FR-45).
    const status = page.getByRole('combobox', { name: 'Status for Due today task', exact: true });
    await status.press('Enter');
    await page
      .getByRole('listbox', { name: 'Options for Status for Due today task', exact: true })
      .getByRole('option', { name: 'Done', exact: true })
      .click();
    await expect(
      page.getByRole('region', { name: 'Done · Tasks', exact: true }).getByText('Due today task'),
    ).toBeVisible();
    await page.goto(f.env.APP_ORIGIN + '/');
    await expect(tile(/^Due today/)).toContainText('0');
    await expect(tile(/^Done in 7 days/)).toContainText('1');
    await tile(/^Done in 7 days/).click();
    await expect(page).toHaveURL(/completed_from=\d{4}-\d{2}-\d{2}#my-group-done$/);
    await expect(page.getByText('Due today task')).toBeVisible();
    await expect(page.getByText('Undated task')).toHaveCount(0);
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(f.env.APP_ORIGIN + '/');
    await expect(tile(/^Overdue/)).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  } finally {
    await f.close();
  }
});
