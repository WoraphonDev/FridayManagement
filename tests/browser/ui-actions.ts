import type { Page } from '@playwright/test';
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
