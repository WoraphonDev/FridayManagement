import { test, expect } from '@playwright/test';
import { projectFixture, mutate } from './task-workspace-fixtures.js';

test('All Projects colorful: card navigation, menu isolation, archive filter, mobile and reduced motion', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    const names = ['Website Relaunch', 'Team Operations', 'Brand Library'];
    for (const name of names) {
      const created = await mutate(page, '/api/projects', {
        name,
        description: 'รายละเอียดงาน Development สำหรับทีม · Plan and track the team’s work.',
        owner_team_id: f.project.owner_team_id,
      });
      expect(created.status).toBe(201);
      if (name === 'Brand Library')
        expect(
          (
            await mutate(
              page,
              `/api/projects/${created.body.item.id}`,
              { version: 1, archived: true },
              'PATCH',
            )
          ).status,
        ).toBe(200);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(f.env.APP_ORIGIN + '/projects');
    const cards = page.locator('.project-directory-card');
    await expect(cards).toHaveCount(3);
    await page.getByLabel('Include archived', { exact: true }).check();
    await expect(cards).toHaveCount(4);
    await expect(
      page.getByRole('heading', { name: 'Archived projects', exact: true }),
    ).toBeVisible();
    await expect(page.locator('.archived .project-state')).toHaveText('Archived');
    await expect
      .poll(() =>
        cards.evaluateAll((items) => items.every((el) => getComputedStyle(el).opacity === '1')),
      )
      .toBe(true);
    await page.screenshot({
      path: 'reports/UI-all-projects-colorful-desktop.png',
      fullPage: true,
      animations: 'disabled',
    });
    await page.getByLabel('Include archived', { exact: true }).uncheck();
    await expect(cards).toHaveCount(3);
    const title = page.getByRole('button', { name: 'Website Relaunch', exact: true });
    const card = page.locator('article').filter({ has: title });
    await card.locator('summary').click();
    await expect(page).toHaveURL(/\/projects$/);
    await card.getByRole('button', { name: 'Edit', exact: true }).click();
    const edit = page.getByRole('dialog');
    await expect(edit.getByLabel('Project Name')).toHaveValue('Website Relaunch');
    await edit.getByRole('button', { name: 'Close dialog', exact: true }).click();
    await card.locator('p').click();
    await expect(
      page.getByRole('region', { name: 'Project tasks · Website Relaunch', exact: true }),
    ).toBeVisible();
    await expect(page.locator('.project-directory')).toHaveCount(0);
    await page.goto(f.env.APP_ORIGIN + '/projects');
    await expect(title).toBeVisible();
    await title.focus();
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('region', { name: 'Project tasks · Website Relaunch', exact: true }),
    ).toBeVisible();
    await page.goto(f.env.APP_ORIGIN + '/projects');
    await page.setViewportSize({ width: 360, height: 900 });
    await expect(cards).toHaveCount(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: 'reports/UI-all-projects-colorful-mobile.png',
      fullPage: true,
      animations: 'disabled',
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    await expect(cards).toHaveCount(3);
    expect(
      await cards.first().evaluate((el) => parseFloat(getComputedStyle(el).animationDuration)),
    ).toBeLessThan(0.001);
  } finally {
    await f.close();
  }
});
