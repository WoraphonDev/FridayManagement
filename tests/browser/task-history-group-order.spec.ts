import { test, expect } from '@playwright/test';
import { projectFixture, mutate, tasks } from './task-workspace-fixtures.js';

test('TC-052 group reorder history loads and task details can still save', async ({ page }) => {
  const f = await projectFixture(page);
  try {
    const create = async (title: string) => {
      const reply = await mutate(page, '/api/tasks', { project_id: f.project.id, title });
      expect(reply.status).toBe(201);
      return reply.body.item;
    };
    const anchor = await create('Anchor task');
    let task = await create('Reordered task');
    for (const before of [anchor.id, null]) {
      const reply = await mutate(
        page,
        `/api/tasks/${task.id}`,
        {
          version: task.version,
          group_before_task_id: before,
        },
        'PATCH',
      );
      expect(reply.status).toBe(200);
      task = reply.body.item;
    }
    const history = await page.request.get(`${f.env.APP_ORIGIN}/api/tasks/${task.id}/events`);
    expect(history.status()).toBe(200);
    const events = (await history.json()).items;
    expect(
      events
        .filter((event: { action: string }) => event.action === 'reordered')
        .map((event: { field_changes: unknown[] }) => event.field_changes),
    ).toEqual([
      [{ field: 'group_before_task_id', before: null, after: anchor.id }],
      [{ field: 'group_before_task_id', before: null, after: null }],
    ]);
    const board = await tasks(page);
    await board.getByRole('button', { name: `Open task #${task.id}`, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: `Task details #${task.id}`, exact: true });
    await dialog.getByRole('tab', { name: 'Activity', exact: true }).click();
    await expect(dialog.getByText(/^Before task in group:/)).toHaveCount(2);
    await expect(dialog.getByRole('alert')).toHaveCount(0);
    await dialog.getByRole('tab', { name: 'Details', exact: true }).click();
    await dialog.getByLabel('Task title', { exact: true }).fill('Saved after reorder · ทดสอบ');
    await dialog.getByRole('button', { name: 'Save task', exact: true }).click();
    await expect(dialog.getByText('Task saved', { exact: true })).toBeVisible();
    const saved = await (await page.request.get(`${f.env.APP_ORIGIN}/api/tasks/${task.id}`)).json();
    expect(saved.item.title).toBe('Saved after reorder · ทดสอบ');
    expect(saved.item.version).toBe(task.version + 1);
    await dialog.getByRole('tab', { name: 'Activity', exact: true }).click();
    await expect(dialog.getByText(/^Name:.*Saved after reorder · ทดสอบ/)).toBeVisible();
    await expect(dialog.getByRole('alert')).toHaveCount(0);
    await page.screenshot({
      path: 'reports/UI-task-history-group-order.png',
      animations: 'disabled',
    });
  } finally {
    await f.close();
  }
});
