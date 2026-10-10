import { test, expect } from '@playwright/test';
import { projectFixture, mutate } from './task-workspace-fixtures.js';
// Owner management style follow-up. Synthetic SQLite data only.
test('Management style: Trash cancel/restore, Admin tabs/job title, Settings stable tabs/mobile and reduced motion', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    const task = await mutate(page, '/api/tasks', {
      project_id: f.project.id,
      title: 'งานกู้คืน colorful fixture',
      assignee_ids: [1],
    });
    expect(task.status).toBe(201);
    expect(
      (await mutate(page, `/api/tasks/${task.body.item.id}`, { version: 1 }, 'DELETE')).status,
    ).toBe(200);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(f.env.APP_ORIGIN + '/trash');
    const restore = page.getByRole('button', { name: 'Restore task #1', exact: true });
    await expect(restore).toBeVisible();
    expect(await restore.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
      'rgb(22, 132, 103)',
    );
    await page.screenshot({
      path: 'reports/UI-trash-colorful-desktop.png',
      fullPage: true,
      animations: 'disabled',
    });
    await restore.click();
    const confirm = page.getByRole('dialog', { name: 'Confirm task restore', exact: true });
    await confirm.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(confirm).toHaveCount(0);
    await expect(restore).toBeVisible();
    const stillDeleted = await page.evaluate(
      async () => (await (await fetch('/api/trash')).json()).items,
    );
    expect(stillDeleted).toHaveLength(1);
    await page.setViewportSize({ width: 360, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: 'reports/UI-trash-colorful-mobile.png',
      fullPage: true,
      animations: 'disabled',
    });
    await restore.click();
    await confirm.getByRole('button', { name: 'Restore this task', exact: true }).click();
    await expect(page.getByText('Restore task #1 complete', { exact: true })).toBeVisible();
    await expect(page.getByText('Trash is empty', { exact: true })).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(f.env.APP_ORIGIN + '/users');
    const admin = page.getByRole('tablist', { name: 'Admin sections', exact: true });
    await expect(page.getByRole('table', { name: 'User directory', exact: true })).toBeVisible();
    await expect
      .poll(() =>
        page
          .locator('.content > section')
          .evaluate((el) => el.getAnimations().filter((a) => a.playState === 'running').length),
      )
      .toBe(0);
    const adminY = (await admin.boundingBox())!.y;
    await page.screenshot({
      path: 'reports/UI-admin-colorful-desktop.png',
      fullPage: true,
      animations: 'disabled',
    });
    for (const tab of ['Teams', 'Job titles', 'Permissions', 'Members']) {
      await admin.getByRole('tab', { name: tab, exact: true }).click();
      await expect(page.getByRole('tabpanel', { name: tab, exact: true })).toBeVisible();
      expect((await admin.boundingBox())!.y).toBe(adminY);
    }
    await admin.getByRole('tab', { name: 'Job titles', exact: true }).click();
    await page.getByRole('button', { name: 'Add job title', exact: true }).click();
    const title = page.getByRole('dialog', { name: 'Add job title', exact: true });
    await title.getByLabel('Title name', { exact: true }).fill('Visual fixture role');
    await title.getByRole('button', { name: 'Create job title', exact: true }).click();
    await expect(title).toHaveCount(0);
    await expect(page.getByRole('table', { name: 'Job titles', exact: true })).toContainText(
      'Visual fixture role',
    );
    await page.setViewportSize({ width: 360, height: 900 });
    await admin.getByRole('tab', { name: 'Members', exact: true }).click();
    await expect(page.getByRole('table', { name: 'User directory', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: 'reports/UI-admin-colorful-mobile.png',
      fullPage: true,
      animations: 'disabled',
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(f.env.APP_ORIGIN + '/settings');
    const nav = page.getByRole('navigation', { name: 'Settings sections', exact: true });
    await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible();
    await expect(page.locator('.my-permissions input')).toHaveCount(10);
    expect(
      await page
        .locator('.my-permissions input')
        .evaluateAll((items) => items.every((item) => (item as HTMLInputElement).disabled)),
    ).toBe(true);
    await page.screenshot({
      path: 'reports/UI-settings-colorful-desktop.png',
      fullPage: true,
      animations: 'disabled',
    });
    await expect
      .poll(() =>
        page
          .locator('.content > section')
          .evaluate((el) => el.getAnimations().filter((a) => a.playState === 'running').length),
      )
      .toBe(0);
    const navY = (await nav.boundingBox())!.y;
    for (const name of ['Change password', 'Appearance', 'Organization', 'Profile']) {
      await nav.getByRole('button', { name, exact: true }).click();
      expect((await nav.boundingBox())!.y).toBe(navY);
    }
    await page.setViewportSize({ width: 360, height: 900 });
    await page.screenshot({
      path: 'reports/UI-settings-colorful-mobile.png',
      fullPage: true,
      animations: 'disabled',
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await nav.getByRole('button', { name: 'Appearance', exact: true }).click();
    await page.getByLabel('Reduce animations', { exact: true }).check();
    await expect(page.getByText('Animation preference saved', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/reduce-motion/);
    await expect(page.getByLabel('Reduce animations', { exact: true })).toBeChecked();
    expect(
      await page
        .locator('.settings-panel')
        .evaluate((el) => parseFloat(getComputedStyle(el).animationDuration)),
    ).toBeLessThan(0.001);
    await page.getByLabel('Reduce animations', { exact: true }).uncheck();
    await expect(page.getByText('Animation preference saved', { exact: true })).toBeVisible();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    await expect(page.locator('.settings-panel')).toBeVisible();
    expect(
      await page
        .locator('.settings-panel')
        .evaluate((el) => parseFloat(getComputedStyle(el).animationDuration)),
    ).toBeLessThan(0.001);
  } finally {
    await f.close();
  }
});
