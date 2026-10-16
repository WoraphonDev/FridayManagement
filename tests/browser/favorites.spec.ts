import { test, expect } from '@playwright/test';
import { projectFixture, tasks } from './task-workspace-fixtures.js';
// T-090 / AT-40 local Chromium evidence: star in project header, Favorites at top of sidebar.
test('Star a project: Favorites appears first in the sidebar, survives reload, unstar removes it', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    await tasks(page);
    // Role-nav UI: favorites lead the Projects section with a ★ instead of a separate heading.
    const projects = () =>
      page
        .getByRole('navigation', { name: 'Main navigation' })
        .getByLabel('Projects', { exact: true });
    const firstProject = () => projects().getByRole('link').first();
    await expect(projects().locator('.nav-star')).toHaveCount(0);
    await page.getByRole('button', { name: 'Add to favorites', exact: true }).click();
    const star = page.getByRole('button', { name: 'Remove from favorites', exact: true });
    await expect(star).toHaveAttribute('aria-pressed', 'true');
    await expect(firstProject()).toContainText('Task project');
    await expect(firstProject().locator('.nav-star')).toHaveCount(1);
    await page.reload();
    await expect(firstProject().locator('.nav-star')).toHaveCount(1);
    await firstProject().click();
    await expect(
      page.getByRole('button', { name: 'Remove from favorites', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Remove from favorites', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Add to favorites', exact: true })).toBeVisible();
    await expect(projects().locator('.nav-star')).toHaveCount(0);
  } finally {
    await f.close();
  }
});
