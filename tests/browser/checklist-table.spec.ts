import { test, expect } from '@playwright/test';
import { projectFixture, mutate, tasks } from './task-workspace-fixtures.js';
import { randomUUID } from 'node:crypto';

test('TC-027 Checklist table: inline add/assignment, edit/cancel, persisted completion and mobile actions', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    const created = await mutate(page, '/api/tasks', {
      project_id: f.project.id,
      title: 'Checklist table task',
    });
    expect(created.status).toBe(201);
    const id = created.body.item.id;
    const read = async () =>
      (await (await page.request.get(`${f.env.APP_ORIGIN}/api/tasks/${id}`)).json()).item;
    const board = await tasks(page);
    await board.getByRole('button', { name: `Open task #${id}`, exact: true }).click();
    const d = page.getByRole('dialog', { name: `Task details #${id}`, exact: true });
    await d.getByRole('tab', { name: 'Checklist', exact: true }).click();
    const table = d.getByRole('table', { name: 'Checklist items', exact: true });
    await expect(table.getByRole('columnheader')).toHaveText([
      'Subitem',
      'Owner',
      'Status',
      'Remark',
    ]);
    await expect(table.getByLabel('Add checklist item', { exact: true })).toHaveCount(1);
    await table.getByRole('button', { name: 'Add checklist item', exact: true }).click();
    await expect(table.getByRole('button', { name: /Save/, exact: false })).toHaveCount(0);
    await table.getByLabel('Add checklist item', { exact: true }).fill('Discard this draft');
    await table.getByRole('button', { name: 'Cancel new checklist item', exact: true }).click();
    expect((await read()).subtasks).toHaveLength(0);
    await table.getByRole('button', { name: 'Add checklist item', exact: true }).click();
    await table
      .getByLabel('Add checklist item', { exact: true })
      .fill('ตรวจสอบการบันทึกและผู้รับผิดชอบของรายการ');
    await table.getByRole('combobox', { name: 'Assign new checklist item', exact: true }).click();
    await page
      .getByRole('listbox', { name: 'Options for Assign new checklist item', exact: true })
      .getByRole('option', { name: 'Workspace Admin', exact: true })
      .click();
    await table
      .getByLabel('New checklist remark', { exact: true })
      .fill('Review notes 🚀\nSecond line');
    expect((await read()).subtasks).toHaveLength(0);
    await d.getByRole('heading', { name: 'Checklist 0/0', exact: true }).click();
    await expect(d.getByRole('heading', { name: 'Checklist 0/1', exact: true })).toBeVisible();
    const saved = await read();
    expect(saved.subtasks[0].assignee_id).toBe(1);
    expect(saved.subtasks[0].remark).toBe('Review notes 🚀\nSecond line');
    await expect(
      table.getByRole('button', { name: 'Add checklist item', exact: true }),
    ).toBeVisible();
    await table
      .getByRole('button', {
        name: 'Edit checklist item ตรวจสอบการบันทึกและผู้รับผิดชอบของรายการ',
        exact: true,
      })
      .click();
    await table.getByLabel('New checklist item', { exact: true }).fill('Do not save');
    await table.getByRole('button', { name: 'Cancel checklist edit', exact: true }).click();
    expect((await read()).version).toBe(saved.version);
    await table
      .getByRole('button', {
        name: 'Edit checklist item ตรวจสอบการบันทึกและผู้รับผิดชอบของรายการ',
        exact: true,
      })
      .click();
    await table.getByLabel('New checklist item', { exact: true }).fill('ยืนยันรายการแล้ว');
    await d.getByRole('heading', { name: 'Checklist 0/1', exact: true }).click();
    await expect(
      table.getByRole('button', { name: 'Edit checklist item ยืนยันรายการแล้ว', exact: true }),
    ).toBeVisible();
    await table
      .getByRole('button', { name: 'Edit remark for ยืนยันรายการแล้ว', exact: true })
      .click();
    await table.getByLabel('Edit checklist remark', { exact: true }).fill('Discard remark');
    await table.getByRole('button', { name: 'Cancel checklist edit', exact: true }).click();
    expect((await read()).subtasks[0].remark).toBe('Review notes 🚀\nSecond line');
    await table
      .getByRole('button', { name: 'Edit remark for ยืนยันรายการแล้ว', exact: true })
      .click();
    await table.getByLabel('Edit checklist remark', { exact: true }).fill('Approved 🚀');
    await d.getByRole('heading', { name: 'Checklist 0/1', exact: true }).click();
    await expect(
      table.getByRole('button', { name: 'Edit remark for ยืนยันรายการแล้ว', exact: true }),
    ).toHaveText('Approved 🚀');
    expect((await read()).subtasks[0].remark).toBe('Approved 🚀');
    await page.reload();
    await (
      await tasks(page)
    )
      .getByRole('button', { name: `Open task #${id}`, exact: true })
      .click();
    await d.getByRole('tab', { name: 'Checklist', exact: true }).click();
    await expect(
      table.getByRole('button', { name: 'Edit remark for ยืนยันรายการแล้ว', exact: true }),
    ).toHaveText('Approved 🚀');
    await table.getByLabel('ยืนยันรายการแล้ว', { exact: true }).click();
    await expect(d.getByRole('heading', { name: 'Checklist 1/1', exact: true })).toBeVisible();
    expect((await read()).subtasks[0].done).toBe(true);
    await page.screenshot({
      path: 'reports/UI-checklist-table-desktop.png',
      animations: 'disabled',
    });
    await page.setViewportSize({ width: 360, height: 900 });
    const scroll = d.getByRole('region', { name: 'Checklist table', exact: true });
    expect(await d.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(await scroll.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    await table
      .getByRole('button', { name: 'Edit checklist item ยืนยันรายการแล้ว', exact: true })
      .click();
    await table.getByRole('button', { name: 'Cancel checklist edit', exact: true }).click();
    await page.screenshot({
      path: 'reports/UI-checklist-table-mobile.png',
      animations: 'disabled',
    });
    await table
      .getByRole('button', { name: 'Delete checklist item ยืนยันรายการแล้ว', exact: true })
      .click();
    await page
      .getByRole('dialog', { name: 'Confirm checklist deletion', exact: true })
      .getByRole('button', { name: 'Delete this checklist item', exact: true })
      .click();
    await expect(d.getByRole('heading', { name: 'Checklist 0/0', exact: true })).toBeVisible();
    expect((await read()).subtasks).toHaveLength(0);
  } finally {
    await f.close();
  }
});

test('Checklist autosave retains failed drafts, ignores blank adds, retries once and saves on keyboard exit', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    const created = await mutate(page, '/api/tasks', {
      project_id: f.project.id,
      title: 'Autosave failures',
    });
    const id = created.body.item.id;
    const read = async () =>
      (await (await page.request.get(`${f.env.APP_ORIGIN}/api/tasks/${id}`)).json()).item;
    await (
      await tasks(page)
    )
      .getByRole('button', { name: `Open task #${id}`, exact: true })
      .click();
    const d = page.getByRole('dialog', { name: `Task details #${id}`, exact: true });
    await d.getByRole('tab', { name: 'Checklist', exact: true }).click();
    const add = d.getByRole('button', { name: 'Add checklist item', exact: true });
    await add.click();
    await d.getByRole('heading', { name: 'Checklist 0/0', exact: true }).click();
    await expect(add).toBeVisible();
    expect((await read()).subtasks).toHaveLength(0);
    await add.click();
    await d.getByLabel('Add checklist item', { exact: true }).fill('Preserved draft');
    await d.getByLabel('New checklist remark', { exact: true }).fill('Preserved notes');
    const url = `**/api/tasks/${id}/subtasks`;
    let posts = 0;
    await page.route(url, async (route) => {
      posts++;
      const requestId = randomUUID();
      await route.fulfill({
        status: 422,
        headers: { 'X-Request-Id': requestId, 'Cache-Control': 'no-store' },
        json: {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Injected failure',
            fieldErrors: {},
            requestId,
          },
        },
      });
    });
    await d.getByRole('heading', { name: 'Checklist 0/0', exact: true }).click();
    await expect(d.getByRole('alert').filter({ hasText: 'Unable to complete' })).toBeVisible();
    expect(posts).toBe(1);
    await expect(d.getByLabel('Add checklist item', { exact: true })).toHaveValue(
      'Preserved draft',
    );
    await expect(d.getByLabel('New checklist remark', { exact: true })).toHaveValue(
      'Preserved notes',
    );
    expect((await read()).subtasks).toHaveLength(0);
    await page.unroute(url);
    await d.getByRole('heading', { name: 'Checklist 0/0', exact: true }).click();
    await expect(d.getByRole('heading', { name: 'Checklist 0/1', exact: true })).toBeVisible();
    await d.getByRole('heading', { name: 'Checklist 0/1', exact: true }).click();
    expect((await read()).subtasks).toHaveLength(1);
    await d.getByRole('button', { name: 'Edit remark for Preserved draft', exact: true }).click();
    await d.getByLabel('Edit checklist remark', { exact: true }).fill('Keyboard saved');
    await page.keyboard.press('Tab');
    await expect(
      d.getByRole('button', { name: 'Edit remark for Preserved draft', exact: true }),
    ).toHaveText('Keyboard saved');
    expect((await read()).subtasks[0].remark).toBe('Keyboard saved');
    await d
      .getByRole('button', { name: 'Edit checklist item Preserved draft', exact: true })
      .click();
    await d.getByLabel('New checklist item', { exact: true }).fill('Discard with Escape');
    await page.keyboard.press('Escape');
    await expect(
      d.getByRole('button', { name: 'Edit checklist item Preserved draft', exact: true }),
    ).toBeVisible();
    expect((await read()).subtasks[0].title).toBe('Preserved draft');
  } finally {
    await f.close();
  }
});
