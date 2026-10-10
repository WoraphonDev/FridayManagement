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

test('T083 Home colors, chart motion, empty state, mobile keyboard and reduced-motion preferences', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    await page.goto(f.env.APP_ORIGIN + '/');
    await expect(page.getByText('Nothing assigned — enjoy the calm')).toBeVisible();
    await expect(page.getByText('No assigned work yet')).toBeVisible();
    const task = await mutate(page, '/api/tasks', {
      project_id: f.project.id,
      title: 'งานถัดไป Home colorful fixture',
      assignee_ids: [1],
      due_date: bangkok(0),
    });
    expect(task.status).toBe(201);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.reload();
    await expect(page.locator('.tile-today strong')).toHaveText('1');
    await expect(page.locator('.overview-open strong')).toHaveText('1');
    const cards = page.locator('.my-overview .overview-tile');
    await expect(cards).toHaveCount(5);
    expect(
      await cards.evaluateAll(
        (items) =>
          new Set(
            items.map((item) => getComputedStyle(item).getPropertyValue('--tile-color').trim()),
          ).size,
      ),
    ).toBe(5);
    const bar = page.locator('.my-overview .bar').first();
    expect(await bar.evaluate((el) => getComputedStyle(el).animationName)).toBe('report-bar-fill');
    expect(await bar.evaluate((el) => getComputedStyle(el).animationDuration)).toBe('0.65s');
    await expect(page.locator('.overview-next')).toContainText('งานถัดไป Home colorful fixture');
    await page.screenshot({
      path: 'reports/UI-home-colorful-desktop.png',
      animations: 'disabled',
      fullPage: true,
    });
    await page.getByRole('link', { name: 'Not started', exact: true }).click();
    await expect(page).toHaveURL(/\/my-tasks\?status=todo$/);
    await expect(page.getByText('งานถัดไป Home colorful fixture')).toBeVisible();
    await page.goto(f.env.APP_ORIGIN + '/');
    const next = page.getByRole('link', { name: 'งานถัดไป Home colorful fixture', exact: true });
    await next.click();
    await expect(page).toHaveURL(/\/projects\/\d+\/tasks\/\d+$/);
    await expect(page.getByRole('dialog', { name: /^Task details #/ })).toBeVisible();
    await page.goto(f.env.APP_ORIGIN + '/');
    await page.setViewportSize({ width: 360, height: 900 });
    await expect(cards.first()).toBeVisible();
    await expect(page.locator('.tile-today strong')).toHaveText('1');
    await expect(page.locator('.overview-open strong')).toHaveText('1');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: 'reports/UI-home-colorful-mobile.png',
      animations: 'disabled',
      fullPage: true,
    });
    const today = page.locator('.tile-today');
    await today.focus();
    await today.press('Enter');
    await expect(page).toHaveURL(/\/my-tasks\?range=today#my-group-today$/);
    await expect(page.getByLabel('Due range', { exact: true })).toHaveValue('today');
    // Destination My work is a wide grid; validate its filter/row without requiring
    // the task cell to be inside the horizontally scrolled mobile viewport.
    await expect(page.getByRole('region', { name: 'Today · Tasks', exact: true })).toContainText(
      'งานถัดไป Home colorful fixture',
    );
    await page.goto(f.env.APP_ORIGIN + '/');
    await page.evaluate(() =>
      document.styleSheets[0]!.insertRule('html {font-size:200% !important}', 0),
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    await expect(page.locator('.tile-today strong [aria-label="1"]')).toBeVisible();
    expect(
      await bar.evaluate((el) => parseFloat(getComputedStyle(el).animationDuration)),
    ).toBeLessThan(0.001);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    expect(
      (await mutate(page, '/api/me/preferences', { reduce_motion: true }, 'PATCH')).status,
    ).toBe(200);
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/reduce-motion/);
    await expect(page.locator('.tile-today strong')).toHaveText('1');
    expect(
      await bar.evaluate((el) => parseFloat(getComputedStyle(el).animationDuration)),
    ).toBeLessThan(0.001);
  } finally {
    await f.close();
  }
});
