import { test, expect } from '@playwright/test';
import { projectFixture, mutate } from './task-workspace-fixtures.js';
import { dateAdd, bangkokWeekEnd } from '../../frontend/src/task-dates.js';
// T-083 / T-086 visual follow-up: real isolated SQLite, no live writes.
test('My Work colorful groups: scope, mobile pinned title, dropdowns, stable tabs and reduced motion', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    const self = await page.evaluate(async () => await (await fetch('/api/me')).json());
    const today = self.bangkok_today as string;
    const end = bangkokWeekEnd(today);
    for (const [group, due] of [
      ['overdue', dateAdd(today, -1)],
      ['today', today],
      ['this_week', end],
      ['next_week', dateAdd(end, 1)],
      ['later', dateAdd(end, 10)],
      ['none', null],
      ['done', today],
    ] as const) {
      const task = await mutate(page, '/api/tasks', {
        project_id: f.project.id,
        title: `งาน ${group} colorful My Work`,
        assignee_ids: [1],
        ...(due ? { due_date: due } : {}),
      });
      expect(task.status).toBe(201);
      if (group === 'done')
        expect(
          (
            await mutate(
              page,
              `/api/tasks/${task.body.item.id}`,
              { version: 1, status: 'done' },
              'PATCH',
            )
          ).status,
        ).toBe(200);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(f.env.APP_ORIGIN + '/my-tasks');
    const work = page.getByRole('region', { name: 'My work', exact: true });
    await expect(work.getByText('7 Tasks', { exact: true })).toBeVisible();
    const groups = work.locator('.task-group');
    await expect(groups).toHaveCount(today === end ? 6 : 7);
    expect(
      await work
        .locator('#my-group-overdue')
        .evaluate((el) => getComputedStyle(el).getPropertyValue('--work-color').trim()),
    ).toBe('#c13e58');
    expect(
      await work
        .locator('#my-group-done')
        .evaluate((el) => getComputedStyle(el).getPropertyValue('--work-color').trim()),
    ).toBe('#168467');
    expect(await groups.first().evaluate((el) => getComputedStyle(el).animationName)).toBe(
      'report-reveal',
    );
    await page.screenshot({
      path: 'reports/UI-my-work-colorful-desktop.png',
      fullPage: true,
      animations: 'disabled',
    });
    const tabs = work.getByRole('region', { name: 'Task views', exact: true });
    const before = await tabs.boundingBox();
    await tabs.getByRole('button', { name: 'Calendar', exact: true }).click();
    await expect(work.getByRole('region', { name: 'Calendar', exact: true })).toBeVisible();
    expect((await tabs.boundingBox())?.y).toBe(before?.y);
    await tabs.getByRole('button', { name: 'Gantt', exact: true }).click();
    await expect(work.getByRole('region', { name: 'Gantt', exact: true })).toBeVisible();
    expect((await tabs.boundingBox())?.y).toBe(before?.y);
    await tabs.getByRole('button', { name: 'Main table', exact: true }).click();
    await expect(work.getByRole('button', { name: 'Open task #2', exact: true })).toBeVisible();
    await page.setViewportSize({ width: 360, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const title = work.getByRole('button', { name: 'Open task #2', exact: true });
    await expect(title).toBeVisible();
    expect((await title.boundingBox())!.width).toBeGreaterThan(100);
    const table = work.getByRole('region', { name: 'Today · Tasks', exact: true });
    const cell = table.locator('tbody td').first();
    const left = (await cell.boundingBox())!.x;
    expect(await cell.evaluate((el) => getComputedStyle(el).position)).toBe('sticky');
    expect(
      await table
        .locator('tbody td')
        .nth(1)
        .evaluate((el) => getComputedStyle(el).position),
    ).toBe('static');
    await table.evaluate((el) => {
      el.scrollLeft = 220;
    });
    expect(await table.evaluate((el) => el.scrollLeft)).toBeGreaterThan(100);
    expect((await cell.boundingBox())!.x).toBeCloseTo(left, 0);
    await table.evaluate((el) => {
      el.scrollLeft = 0;
    });
    await page.screenshot({
      path: 'reports/UI-my-work-colorful-mobile.png',
      fullPage: true,
      animations: 'disabled',
    });
    const filters = work.locator('.popover-menu > summary').filter({ hasText: 'Filters' });
    await filters.click();
    await expect(work.getByLabel('Not started', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await filters.click();
    const collapse = work.locator('#my-group-today .group-heading button').first();
    await collapse.focus();
    await collapse.press('Enter');
    await expect(table).not.toBeVisible();
    await collapse.press('Enter');
    await expect(title).toBeVisible();
    await title.click();
    await expect(page.getByRole('dialog', { name: /^Task details #/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    await expect(work.getByText('7 Tasks', { exact: true })).toBeVisible();
    expect(
      await groups.first().evaluate((el) => parseFloat(getComputedStyle(el).animationDuration)),
    ).toBeLessThan(0.001);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    expect(
      (await mutate(page, '/api/me/preferences', { reduce_motion: true }, 'PATCH')).status,
    ).toBe(200);
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/reduce-motion/);
    expect(
      await groups.first().evaluate((el) => parseFloat(getComputedStyle(el).animationDuration)),
    ).toBeLessThan(0.001);
  } finally {
    await f.close();
  }
});
