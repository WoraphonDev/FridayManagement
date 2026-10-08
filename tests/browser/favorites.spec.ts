import { test, expect } from '@playwright/test';
import { projectFixture, tasks } from './task-workspace-fixtures.js';
// T-090 / AT-40 local Chromium evidence: star in project header, Favorites at top of sidebar.
test('Star a project: Favorites appears first in the sidebar, survives reload, unstar removes it', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    await tasks(page);
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.getByText('Favorites', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Add to favorites', exact: true }).click();
    const star = page.getByRole('button', { name: 'Remove from favorites', exact: true });
    await expect(star).toHaveAttribute('aria-pressed', 'true');
    const section = nav.locator('.nav-section').first();
    await expect(section.locator('.nav-heading')).toHaveText('Favorites');
    await expect(section.getByRole('link', { name: /Task project/ })).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole('navigation', { name: 'Main navigation' }).locator('.nav-section').first(),
    ).toContainText('Task project');
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .locator('.nav-section')
      .first()
      .getByRole('link', { name: /Task project/ })
      .click();
    await expect(
      page.getByRole('button', { name: 'Remove from favorites', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Remove from favorites', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Add to favorites', exact: true })).toBeVisible();
    await expect(
      page
        .getByRole('navigation', { name: 'Main navigation' })
        .getByText('Favorites', { exact: true }),
    ).toHaveCount(0);
  } finally {
    await f.close();
  }
});
