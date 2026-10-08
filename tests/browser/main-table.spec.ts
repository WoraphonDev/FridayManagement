import { test, expect } from '@playwright/test';
import { mutate, projectFixture, tasks } from './task-workspace-fixtures.js';
// T-086 / AT-38 Main table local Chromium evidence (real server, SQLite).
test('Main table: quick add, inline rename, batch with per-item 409, move by menu and drag, sticky, resize saved per user', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    const group = async (name: string, color: string) =>
      (await mutate(page, `/api/projects/${f.project.id}/groups`, { name, color })).body.item.id;
    const a = await group('Phase A', '#579bfc'),
      b = await group('Phase B', '#00c875');
    for (const title of ['Alpha', 'Beta', 'Gamma'])
      expect(
        (await mutate(page, '/api/tasks', { project_id: f.project.id, title, group_id: a })).status,
      ).toBe(201);
    await tasks(page);
    const phaseA = page.getByRole('region', { name: 'Phase A · Tasks', exact: true }),
      phaseB = page.getByRole('region', { name: 'Phase B · Tasks', exact: true });
    await expect(phaseA.getByRole('row')).toHaveCount(4);
    // Quick add at the end of a group.
    await page.getByLabel('Add task to Phase B', { exact: true }).fill('Delta');
    await page.getByLabel('Add task to Phase B', { exact: true }).press('Enter');
    await expect(
      phaseB.getByRole('button', { name: /^Open task #\d+$/ }).filter({ hasText: 'Delta' }),
    ).toBeVisible();
    // Inline rename from the row menu, and F2 from the keyboard; saved with the task version.
    await phaseA.getByLabel('Task menu Alpha', { exact: true }).click();
    await phaseA.getByRole('button', { name: 'Rename task', exact: true }).click();
    await page.getByLabel('Task title Alpha', { exact: true }).fill('Alpha renamed');
    await page.getByLabel('Task title Alpha', { exact: true }).press('Enter');
    await expect(phaseA.getByText('Alpha renamed')).toBeVisible();
    await phaseA.getByRole('button', { name: 'Open task #2', exact: true }).focus();
    await page.keyboard.press('F2');
    await expect(page.getByLabel('Task title Beta', { exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    // Batch: Gamma changes elsewhere first → that item is reported 409, Beta still updates.
    await phaseA.getByLabel('Select Beta', { exact: true }).check();
    await phaseA.getByLabel('Select Gamma', { exact: true }).check();
    const gamma = await page.evaluate(
      async () => (await (await fetch('/api/tasks/3')).json()).item,
    );
    expect(
      (
        await mutate(
          page,
          '/api/tasks/3',
          { title: 'Gamma', priority: 'high', version: gamma.version },
          'PATCH',
        )
      ).status,
    ).toBe(200);
    const bar = page.getByRole('region', { name: 'Batch actions', exact: true });
    await bar.getByLabel('Batch status', { exact: true }).selectOption('done');
    await bar.getByRole('button', { name: 'Apply status', exact: true }).click();
    await expect(page.getByText(/Task #3: changed by someone else/)).toBeVisible();
    await expect(
      page.getByRole('combobox', { name: 'Status for Beta', exact: true }),
    ).toContainText('Done');
    await expect(
      page.getByRole('combobox', { name: 'Status for Gamma', exact: true }),
    ).not.toContainText('Done');
    await expect(phaseA.getByLabel('Select Gamma', { exact: true })).toBeChecked();
    await expect(phaseA.getByLabel('Select Beta', { exact: true })).not.toBeChecked();
    // Keyboard/touch alternative to drag: row menu "Move to group".
    await phaseA.getByLabel('Task menu Beta', { exact: true }).click();
    await phaseA.getByLabel('Move Beta to group', { exact: true }).selectOption(String(b));
    await expect(phaseB.getByRole('row').filter({ hasText: 'Beta' })).toHaveCount(1);
    await expect(phaseA.getByRole('row').filter({ hasText: 'Beta' })).toHaveCount(0);
    // Drag a row into another group.
    const row = phaseA.getByRole('row').filter({ hasText: 'Alpha renamed' });
    await row.dragTo(phaseB);
    await expect(phaseB.getByRole('row').filter({ hasText: 'Alpha renamed' })).toHaveCount(1);
    // Sticky header and sticky Task column.
    const header = phaseB.locator('thead th').nth(1);
    expect(await header.evaluate((el) => getComputedStyle(el).position)).toBe('sticky');
    expect(
      await phaseB
        .locator('tbody tr')
        .first()
        .locator('> :nth-child(2)')
        .evaluate((el) => getComputedStyle(el).position),
    ).toBe('sticky');
    // Resize Task column with the keyboard; the width is saved to the user's preferences.
    const handle = phaseB.getByRole('separator', { name: 'Resize Task column' });
    const before = await phaseB
      .locator('thead th')
      .nth(1)
      .evaluate((el) => el.getBoundingClientRect().width);
    await handle.focus();
    await handle.press('ArrowRight');
    await handle.press('ArrowRight');
    await expect
      .poll(
        async () =>
          (await page.evaluate(
            async () => (await (await fetch('/api/me/preferences')).json()).item.column_widths.task,
          )) ?? 0,
      )
      .toBe(Math.round(before) + 32);
    await page.reload();
    await expect
      .poll(() =>
        page
          .getByRole('region', { name: 'Phase B · Tasks', exact: true })
          .locator('col')
          .nth(1)
          .evaluate((el) => (el as HTMLElement).style.width),
      )
      .toBe(`${Math.round(before) + 32}px`);
  } finally {
    await f.close();
  }
});
