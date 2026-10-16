import { expect, type Locator, type Page } from '@playwright/test';
/**
 * The task editor asks "Save changes?" / "Create task?" before writing. Confirm it so specs
 * exercise the real save; pass any locator from the page that owns the editor.
 */
export async function confirmTaskSave(scope: Locator | Page) {
  const page = 'page' in scope && typeof scope.page === 'function' ? scope.page() : (scope as Page);
  const ask = page.getByRole('dialog', { name: /^(Save changes|Create task)\?$/ });
  await expect(ask).toBeVisible();
  await ask.getByRole('button', { name: /^(Save changes|Create task)$/ }).click();
}
/** Sign out lives in the profile menu (owner role-nav UI). */
export async function signOut(page: Page) {
  await page.getByRole('button', { name: /^Profile of / }).click();
  await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click();
}
/** Settings is a profile-menu item (owner role-nav UI), not a sidebar link. */
export async function openSettings(page: Page) {
  await page.getByRole('button', { name: /^Profile of / }).click();
  await page.getByRole('menuitem', { name: 'Settings', exact: true }).click();
}
