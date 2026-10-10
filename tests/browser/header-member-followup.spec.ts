import { test, expect } from '@playwright/test';
import { projectFixture } from './task-workspace-fixtures.js';

test('Plain headers across nine menus; Add member repeated search, empty results, review Cancel/Save and mobile', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    for (const [path, title, root] of [
      ['/', 'Home', '.content > .page-header'],
      ['/reports', 'Reports', '.content > .page-header'],
      ['/my-tasks', 'My work', '.task-workspace[aria-label="My work"] .project-heading'],
      ['/trash', 'Trash', '.content > .page-header'],
      ['/users', 'Admin', '.content > .page-header'],
      ['/settings', 'Profile & settings', '.content > .page-header'],
      ['/projects', 'Projects', '.content > .page-header'],
      [
        '/calendar',
        'Work calendar',
        '.task-workspace[aria-label="Work calendar"] .project-heading',
      ],
      ['/teams', 'Teams', '.content > .page-header'],
    ] as const) {
      await page.goto(f.env.APP_ORIGIN + path);
      const header = page.locator(root!);
      await expect(header.getByRole('heading', { name: title, exact: true })).toBeVisible();
      const style = await header.evaluate((el) => ({
        background: getComputedStyle(el).backgroundImage,
        radius: getComputedStyle(el).borderRadius,
        line: getComputedStyle(el).borderBottomStyle,
      }));
      expect(style).toEqual({ background: 'none', radius: '0px', line: 'solid' });
      await expect(header.locator('p')).toBeVisible();
      expect(await header.locator('h1').evaluate((el) => getComputedStyle(el).fontSize)).toBe(
        '20px',
      );
      await expect(
        header.getByRole('navigation', { name: 'Breadcrumb', exact: true }),
      ).toBeVisible();
    }
    await expect(page.getByRole('button', { name: 'Task team', exact: true })).toBeVisible();
    await page.screenshot({
      path: 'reports/UI-plain-header-teams-desktop.png',
      fullPage: true,
      animations: 'disabled',
    });
    await page.getByRole('button', { name: 'Task team', exact: true }).click();
    await page.getByRole('tab', { name: /^Members/ }).click();
    await page.getByRole('button', { name: 'Add member', exact: true }).click();
    const editor = page.getByRole('dialog', { name: 'Add member', exact: true });
    const users = editor.getByLabel('Users', { exact: true });
    await expect(users).toBeEnabled();
    await expect(editor.getByRole('button', { name: 'Review & Save', exact: true })).toBeDisabled();
    await expect.poll(() => editor.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    await page.screenshot({
      path: 'reports/UI-add-member-colorful-desktop.png',
      animations: 'disabled',
    });
    const search = async (query: string) => {
      await editor.getByLabel('Search active users', { exact: true }).fill(query);
      const response = page.waitForResponse(
        (r) => new URL(r.url()).pathname === '/api/directory' && r.request().method() === 'GET',
      );
      await editor.getByRole('button', { name: 'Search', exact: true }).click();
      expect((await response).status()).toBe(200);
    };
    for (const query of ['', '', 'Workspace', 'Workspace']) {
      await search(query);
      await expect(users).toBeEnabled();
      await expect(users.locator('option').filter({ hasText: 'Workspace Admin' })).toHaveCount(1);
    }
    await search('zz-no-member-found');
    await expect(users).toBeDisabled();
    await expect(users).toContainText('No active users found');
    await search('');
    await expect(users).toBeEnabled();
    await users.selectOption('1');
    await editor.getByLabel('Team Position').selectOption('pm');
    await editor.getByLabel('Team access', { exact: true }).selectOption('member');
    await editor.getByRole('button', { name: 'Review & Save', exact: true }).click();
    const review = page.getByRole('dialog', { name: 'Review member changes', exact: true });
    await review.getByRole('button', { name: 'Cancel', exact: true }).click();
    const grid = page.getByRole('table', { name: 'Members', exact: true });
    await expect(grid.getByRole('cell', { name: 'Workspace Admin', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Add member', exact: true }).click();
    await expect(users).toBeEnabled();
    await users.selectOption('1');
    await editor.getByLabel('Team Position').selectOption('pm');
    await editor.getByRole('button', { name: 'Review & Save', exact: true }).click();
    await review.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(review).toHaveCount(0);
    await expect(grid.getByRole('cell', { name: 'PM', exact: true })).toBeVisible();
    await expect(grid.getByRole('cell', { name: 'Member', exact: true })).toBeVisible();
    await page.setViewportSize({ width: 360, height: 900 });
    await page.getByRole('button', { name: 'Add member', exact: true }).click();
    await expect(users).toBeEnabled();
    expect(
      await editor.evaluate(
        (el) => el.scrollWidth <= el.clientWidth && el.getBoundingClientRect().right <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: 'reports/UI-add-member-colorful-mobile.png',
      animations: 'disabled',
    });
    await editor.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('button', { name: /Back to teams/ }).click();
    await expect(page.getByRole('button', { name: 'Task team', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: 'reports/UI-plain-header-teams-mobile.png',
      fullPage: true,
      animations: 'disabled',
    });
  } finally {
    await f.close();
  }
});
