import { test, expect } from '@playwright/test';
test('Built shell renders with no credentials/write controls and no browser errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  // English-base Vibe shell without a database: safe retry notice, no credential or write controls.
  await expect(page.getByRole('region', { name: 'Page content' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
  await expect(page.locator('input, form')).toHaveCount(0);
  await page.setViewportSize({ width: 360, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(errors).toEqual([]);
});
