import { test, expect } from '@playwright/test';
import { projectFixture, mutate, tasks } from './task-workspace-fixtures.js';

test('TC-027 actual Subitem cells: searchable owner popup, status persistence, compact edit and mobile top layer', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    const made = await mutate(page, '/api/tasks', {
      project_id: f.project.id,
      title: 'Subitem cells',
    });
    expect(made.status).toBe(201);
    const id = made.body.item.id;
    const read = async () =>
      (await (await page.request.get(`${f.env.APP_ORIGIN}/api/tasks/${id}`)).json()).item;
    await (
      await tasks(page)
    )
      .getByRole('button', { name: `Open task #${id}`, exact: true })
      .click();
    const d = page.getByRole('dialog', { name: `Task details #${id}`, exact: true });
    await expect(d.locator('select[aria-label="Status"]')).toHaveCount(0);
    await d.getByRole('tab', { name: 'Checklist', exact: true }).click();
    const table = d.getByRole('table', { name: 'Checklist items', exact: true });
    await table.getByRole('button', { name: 'Add checklist item', exact: true }).click();
    await table.getByLabel('Add checklist item', { exact: true }).fill('ตรวจสอบ popup');
    const assign = table.getByRole('combobox', { name: 'Assign new checklist item', exact: true });
    await assign.click();
    const options = d.getByRole('listbox', {
      name: 'Options for Assign new checklist item',
      exact: true,
    });
    await d.getByLabel('Search Assign new checklist item', { exact: true }).fill('missing-person');
    await expect(options.getByRole('status')).toHaveText('No matching people');
    await d.getByLabel('Search Assign new checklist item', { exact: true }).fill('admin');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    expect((await read()).subtasks).toHaveLength(0);
    await expect(assign).toContainText('Workspace Admin');
    await table.getByLabel('New checklist remark', { exact: true }).fill('หมายเหตุ 🌼');
    await d.getByRole('heading', { name: 'Checklist 0/0', exact: true }).click();
    await expect(d.getByRole('heading', { name: 'Checklist 0/1', exact: true })).toBeVisible();
    const saved = await read();
    expect(saved.subtasks[0]).toMatchObject({ assignee_id: 1, remark: 'หมายเหตุ 🌼', done: false });
    expect(
      await table
        .locator('td')
        .first()
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    const status = table.getByRole('combobox', {
      name: 'Status for checklist: ตรวจสอบ popup',
      exact: true,
    });
    await status.click();
    await d
      .getByRole('listbox', {
        name: 'Options for Status for checklist: ตรวจสอบ popup',
        exact: true,
      })
      .getByRole('option', { name: 'Done', exact: true })
      .click();
    await expect(d.getByRole('heading', { name: 'Checklist 1/1', exact: true })).toBeVisible();
    expect((await read()).subtasks[0].done).toBe(true);
    await table.getByRole('button', { name: 'Edit remark for ตรวจสอบ popup', exact: true }).click();
    const titleBox = await table.getByLabel('New checklist item', { exact: true }).boundingBox();
    const remarkBox = await table
      .getByLabel('Edit checklist remark', { exact: true })
      .boundingBox();
    expect(titleBox).not.toBeNull();
    expect(remarkBox).not.toBeNull();
    expect(Math.abs(titleBox!.y - remarkBox!.y)).toBeLessThan(2);
    expect(remarkBox!.height).toBeLessThanOrEqual(36);
    await table.getByLabel('Edit checklist remark', { exact: true }).fill('discard');
    await table.getByRole('button', { name: 'Cancel checklist edit', exact: true }).click();
    expect((await read()).subtasks[0].remark).toBe('หมายเหตุ 🌼');
    await page.screenshot({ path: 'reports/UI-subitem-cells-desktop.png', animations: 'disabled' });
    await page.setViewportSize({ width: 360, height: 900 });
    const owner = table.getByRole('combobox', {
      name: 'Assign checklist: ตรวจสอบ popup',
      exact: true,
    });
    await owner.click();
    const panel = d.locator('.cell-popover:popover-open');
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(360);
    expect(await panel.evaluate((el) => el.matches(':popover-open'))).toBe(true);
    await page.screenshot({ path: 'reports/UI-subitem-owner-mobile.png', animations: 'disabled' });
    await page.keyboard.press('Escape');
    await expect(d).toBeVisible();
    await expect(panel).toHaveCount(0);
    await owner.click();
    await d
      .getByRole('listbox', { name: 'Options for Assign checklist: ตรวจสอบ popup', exact: true })
      .getByRole('option', { name: 'Unassigned', exact: true })
      .click();
    await expect(owner).toContainText('Unassigned');
    expect((await read()).subtasks[0].assignee_id).toBeNull();
    await page.reload();
    await (
      await tasks(page)
    )
      .getByRole('button', { name: `Open task #${id}`, exact: true })
      .click();
    await d.getByRole('tab', { name: 'Checklist', exact: true }).click();
    await expect(status).toHaveText('Done');
    await expect(owner).toContainText('Unassigned');
  } finally {
    await f.close();
  }
});
