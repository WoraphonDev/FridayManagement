import { test, expect } from '@playwright/test';
import { projectFixture, mutate } from './task-workspace-fixtures.js';
import { dateAdd, monthAdd } from '../../frontend/src/task-dates.js';

test('Work Calendar colorful: month navigation, undated separation, filters, task keyboard, stable tabs, mobile and reduced motion', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    const self = await page.evaluate(async () => await (await fetch('/api/me')).json());
    const today = self.bangkok_today as string;
    for (const [i, status] of ['todo', 'doing', 'review', 'done'].entries()) {
      const task = await mutate(page, '/api/tasks', {
        project_id: f.project.id,
        title: `งาน ${status} · Work Calendar`,
        due_date: dateAdd(today, i),
      });
      expect(task.status).toBe(201);
      if (status !== 'todo')
        expect(
          (await mutate(page, `/api/tasks/${task.body.item.id}`, { version: 1, status }, 'PATCH'))
            .status,
        ).toBe(200);
    }
    expect(
      (await mutate(page, '/api/tasks', { project_id: f.project.id, title: 'ยังไม่กำหนดวันส่ง' }))
        .status,
    ).toBe(201);
    expect(
      (
        await mutate(page, '/api/tasks', {
          project_id: f.project.id,
          title: 'Next month fixture',
          due_date: dateAdd(monthAdd(today.slice(0, 7) + '-01', 1), 10),
        })
      ).status,
    ).toBe(201);
    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.goto(f.env.APP_ORIGIN + '/calendar');
    const work = page.getByRole('region', { name: 'Work calendar', exact: true });
    const calendar = work.getByRole('region', { name: 'Calendar', exact: true });
    await expect(calendar.locator('.calendar-event')).toHaveCount(4);
    await expect(calendar.locator('time[aria-current="date"]')).toHaveAttribute('datetime', today);
    const undated = calendar.getByRole('region', { name: 'Tasks without End Plan', exact: true });
    await expect(
      undated.getByRole('button', { name: 'Open task #5 ยังไม่กำหนดวันส่ง', exact: true }),
    ).toBeVisible();
    await expect(
      calendar.locator('.calendar-event').filter({ hasText: 'ยังไม่กำหนดวันส่ง' }),
    ).toHaveCount(0);
    await expect
      .poll(() =>
        page
          .locator('.content > section')
          .evaluate((el) => el.getAnimations().filter((a) => a.playState === 'running').length),
      )
      .toBe(0);
    const tabs = work.getByRole('region', { name: 'Task views', exact: true });
    const tabsY = (await tabs.boundingBox())!.y;
    const gridY = (await calendar.locator('.calendar-scroll').boundingBox())!.y;
    await page.screenshot({
      path: 'reports/UI-work-calendar-colorful-desktop.png',
      fullPage: true,
      animations: 'disabled',
    });
    await calendar.getByRole('button', { name: 'Next month', exact: true }).click();
    await expect(calendar.locator('.calendar-event')).toHaveCount(1);
    expect((await calendar.locator('.calendar-scroll').boundingBox())!.y).toBe(gridY);
    await calendar.getByRole('button', { name: 'Today', exact: true }).click();
    await expect(calendar.locator('.calendar-event')).toHaveCount(4);
    const task = calendar.getByRole('button', {
      name: 'Open task #1 งาน todo · Work Calendar',
      exact: true,
    });
    await task.focus();
    await page.keyboard.press('Enter');
    const detail = page.getByRole('dialog', { name: 'Task details #1', exact: true });
    await expect(detail.getByLabel('End Plan', { exact: true })).toHaveValue(today);
    await detail.getByRole('button', { name: 'Close dialog', exact: true }).click();
    await work.locator('summary').filter({ hasText: 'Filters' }).click();
    await work.getByLabel('Due date', { exact: true }).selectOption('false');
    await expect(calendar.locator('.calendar-event')).toHaveCount(0);
    await expect(undated.getByRole('button')).toHaveCount(1);
    await work.getByLabel('Due date', { exact: true }).selectOption('');
    await expect(calendar.locator('.calendar-event')).toHaveCount(4);
    await work.locator('summary').filter({ hasText: 'Filters' }).click();
    await tabs.getByRole('button', { name: 'Gantt', exact: true }).click();
    await expect(work.getByRole('region', { name: 'Gantt', exact: true })).toBeVisible();
    expect((await tabs.boundingBox())!.y).toBe(tabsY);
    await tabs.getByRole('button', { name: 'Calendar', exact: true }).click();
    await expect(calendar.locator('.calendar-event')).toHaveCount(4);
    expect((await tabs.boundingBox())!.y).toBe(tabsY);
    await page.setViewportSize({ width: 360, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const scroll = calendar.locator('.calendar-scroll');
    expect(await scroll.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    await scroll.focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => scroll.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
    await scroll.evaluate((el) => {
      el.scrollLeft = 0;
    });
    await calendar.getByRole('button', { name: 'Today', exact: true }).click();
    await page.screenshot({
      path: 'reports/UI-work-calendar-colorful-mobile.png',
      fullPage: true,
      animations: 'disabled',
    });
    await work.locator('summary').filter({ hasText: 'Filters' }).click();
    const filter = work.locator('.filter-grid');
    expect(
      (await filter.boundingBox())!.x + (await filter.boundingBox())!.width,
    ).toBeLessThanOrEqual(360);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    await expect(calendar.locator('.calendar-event')).toHaveCount(4);
    expect(
      await calendar.evaluate((el) => parseFloat(getComputedStyle(el).animationDuration)),
    ).toBeLessThan(0.001);
  } finally {
    await f.close();
  }
});
