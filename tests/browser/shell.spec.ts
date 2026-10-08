import { test, expect } from '@playwright/test';
import { selfFixture } from '../../frontend/src/test-fixtures.js';
test.beforeEach(async ({ page }) => {
  await page.route('**/api/meta', (route) =>
    route.fulfill({ json: { setupRequired: false, version: '0.1.0' } }),
  );
});
test('Member navigation and direct admin URL fail closed; shell survives deep-link reload', async ({
  page,
}) => {
  await page.route('**/api/me', (route) => route.fulfill({ json: selfFixture() }));
  await page.goto('/users');
  await expect(page.getByRole('link', { name: 'Admin', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'You do not have access to this page' })).toBeVisible();
  await page.getByRole('link', { name: 'My work', exact: true }).click();
  await expect(page).toHaveURL(/my-tasks$/);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'My work', exact: true })).toBeVisible();
});
test('Admin and Lead privileged navigation comes only from validated Self; forced password restricts menus', async ({
  page,
}) => {
  await page.route('**/api/me', (route) => route.fulfill({ json: selfFixture('admin') }));
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Admin', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Trash', exact: true })).toBeVisible();
  await page.unroute('**/api/me');
  await page.route('**/api/me', (route) => route.fulfill({ json: selfFixture('member', true) }));
  await page.reload();
  await expect(page.getByRole('link', { name: 'Trash', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Admin', exact: true })).toHaveCount(0);
  await page.unroute('**/api/me');
  await page.route('**/api/me', (route) =>
    route.fulfill({ json: selfFixture('admin', false, true) }),
  );
  await page.reload();
  await expect(page.getByRole('link', { name: 'My work', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Settings', exact: true })).toBeVisible();
});
test('Native help dialog traps focus, closes with Escape, returns focus; 200% text reflows at mobile width', async ({
  page,
}) => {
  await page.goto('/');
  const help = page.getByRole('button', { name: 'วิธีใช้งาน', exact: true });
  await help.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const close = page.getByRole('button', { name: 'Close dialog' });
  await expect(close).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(help).toBeFocused();
  await page.setViewportSize({ width: 360, height: 740 });
  await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await expect(page.getByRole('heading', { name: 'Team workspace' })).toBeVisible();
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg');
});
test('Invalid Self and offline state never expose privileged navigation', async ({
  page,
  context,
}) => {
  await page.route('**/api/me', (route) =>
    route.fulfill({ json: { ...selfFixture('admin'), extra: 'invalid' } }),
  );
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('ข้อมูลที่ไม่ถูกต้อง');
  await expect(page.getByRole('link', { name: 'Admin', exact: true })).toHaveCount(0);
  await context.setOffline(true);
  await expect(page.getByRole('status')).toContainText('ต้องเชื่อมต่อ');
});
