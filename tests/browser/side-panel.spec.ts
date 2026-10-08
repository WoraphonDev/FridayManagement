import { test, expect } from '@playwright/test';
import { mutate, projectFixture, tasks } from './task-workspace-fixtures.js';
// T-087 / AT-38 side panel local Chromium evidence (real server, SQLite).
const password = 'Workspace-admin-fixture-password';
test('Side panel: Updates/Files/Activity/Details, @mention only project members, Esc layering, focus trap, deep link, mobile', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    expect(
      (await mutate(page, '/api/tasks', { project_id: f.project.id, title: 'Panel task' })).status,
    ).toBe(201);
    const member = await mutate(page, '/api/users', {
      username: 'PanelMember',
      display_name: 'สมหญิง Panel',
      temp_password: password,
    });
    const outsider = await mutate(page, '/api/users', {
      username: 'PanelOutsider',
      display_name: 'สมหญิง Outsider',
      temp_password: password,
    });
    expect([member.status, outsider.status]).toEqual([201, 201]);
    expect(
      (
        await mutate(
          page,
          `/api/projects/${f.project.id}/members/${member.body.item.id}`,
          { version: 1, access: 'editor' },
          'PUT',
        )
      ).status,
    ).toBe(200);
    const region = await tasks(page);
    const opener = region.getByRole('button', { name: 'Open task #1', exact: true });
    await opener.click();
    const panel = page
      .getByRole('dialog')
      .filter({ has: page.getByRole('tablist', { name: 'Task sections' }) });
    await expect(panel).toBeVisible();
    const tabs = panel.getByRole('tablist', { name: 'Task sections' }).getByRole('tab');
    await expect(tabs).toHaveText(['Details', 'Checklist', 'Updates', 'Files', 'Activity']);
    // Right-hand panel (AN-02 slide-in from the right).
    await expect
      .poll(async () => {
        const box = await panel.boundingBox();
        return Math.round(box!.x + box!.width);
      })
      .toBe(page.viewportSize()!.width);
    await panel.getByRole('tab', { name: 'Updates', exact: true }).click();
    const composer = panel.getByLabel('Write a comment', { exact: true });
    await composer.fill('Please check @สมห');
    const list = panel.getByRole('listbox', { name: 'Mention suggestions' });
    await expect(list.getByRole('option')).toHaveText(['สมหญิง Panel']);
    // Esc closes the suggestions only; the panel stays open.
    await composer.press('Escape');
    await expect(list).toHaveCount(0);
    await expect(panel).toBeVisible();
    await composer.press('End');
    await composer.press('Backspace');
    await composer.type('ห');
    await composer.press('Enter');
    await expect(composer).toHaveValue(
      `Please check @[สมหญิง Panel](#user-${member.body.item.id}) `,
    );
    await panel.getByRole('button', { name: 'Post comment', exact: true }).click();
    await expect(panel.locator('.mention')).toHaveText('@สมหญิง Panel');
    // Focus stays inside the panel while tabbing.
    for (let i = 0; i < 25; i++) await page.keyboard.press('Tab');
    expect(await panel.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    // Esc closes the panel and focus returns to the opener.
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    await expect(opener).toBeFocused();
    // Deep link opens the panel after the server checks access; unknown task shows no panel.
    await page.goto(`${f.env.APP_ORIGIN}/projects/${f.project.id}/tasks/1`);
    await expect(page.getByRole('tablist', { name: 'Task sections' })).toBeVisible();
    await page.goto(`${f.env.APP_ORIGIN}/projects/${f.project.id}/tasks/999`);
    await expect(page.getByRole('tablist', { name: 'Task sections' })).toHaveCount(0);
    // Mobile: the panel is full screen.
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(`${f.env.APP_ORIGIN}/projects/${f.project.id}/tasks/1`);
    const mobile = page
      .getByRole('dialog')
      .filter({ has: page.getByRole('tablist', { name: 'Task sections' }) });
    await expect(mobile).toBeVisible();
    await expect
      .poll(async () => {
        const m = await mobile.boundingBox();
        return [Math.round(m!.x), Math.round(m!.width)];
      })
      .toEqual([0, 375]);
  } finally {
    await f.close();
  }
});
