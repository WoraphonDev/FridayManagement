import { test, expect } from '@playwright/test';
import { projectFixture, tasks } from './task-workspace-fixtures.js';

// D01/D02/D04/D10/D12: UI-only coverage, not delivery API acceptance.
test('Project delivery preview: conditional dates, draft guard, mobile and existing-only save', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    await page.goto(f.env.APP_ORIGIN + '/projects');
    await page.getByRole('button', { name: 'Create project', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Create project', exact: true });
    await modal.getByLabel('Project Name', { exact: true }).fill('Preview project');
    await modal.getByLabel('Owner team', { exact: true }).selectOption({ label: 'Task team' });
    await expect(modal.getByText(/UI preview · Not saved yet/)).toBeVisible();
    await modal.getByLabel('Delivery mode', { exact: true }).selectOption('finite');
    await modal.getByLabel('Project objective', { exact: true }).fill('ส่งมอบระบบ 🌼');
    await modal.getByLabel('Project lead', { exact: true }).fill('ผู้รับผิดชอบ');
    await modal.getByLabel('Delivery acceptor', { exact: true }).fill('ผู้ตรวจรับ');
    await modal.getByLabel('Planned project start', { exact: true }).fill('2026-11-10');
    await modal.getByLabel('Target delivery date', { exact: true }).fill('2026-11-09');
    await expect(modal.getByRole('alert')).toContainText('Project start');
    await modal.getByLabel('Target delivery date', { exact: true }).fill('2026-11-20');
    await modal.getByText('Scope & acceptance', { exact: true }).click();
    await modal.getByLabel('Acceptance criteria', { exact: true }).fill('ตรวจรับครบทุกข้อ');
    await modal.getByLabel('In scope', { exact: true }).fill('ระบบภายใน');
    await modal.getByLabel('Out of scope', { exact: true }).fill('ระบบภายนอก');
    await modal.getByLabel('Delivery mode', { exact: true }).selectOption('ongoing');
    await expect(modal.getByLabel('Target delivery date', { exact: true })).toHaveCount(0);
    await modal.getByLabel('Next review date', { exact: true }).fill('2026-12-01');
    await modal.getByLabel('Delivery mode', { exact: true }).selectOption('finite');
    await expect(modal.getByLabel('Target delivery date', { exact: true })).toHaveValue(
      '2026-11-20',
    );
    for (const width of [1440, 360]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect(modal).toBeVisible();
      expect(await modal.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      await page.screenshot({
        path: `/private/tmp/friday-delivery-project-${width}.png`,
        animations: 'disabled',
      });
    }
    await modal.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Discard changes?', exact: true })
      .getByRole('button', { name: 'Stay', exact: true })
      .click();
    await expect(modal.getByLabel('Project objective', { exact: true })).toHaveValue(
      'ส่งมอบระบบ 🌼',
    );
    const payloads: Record<string, unknown>[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/projects')
        payloads.push(request.postDataJSON());
    });
    await modal.getByRole('button', { name: 'Save', exact: true }).click();
    const confirm = page.getByRole('dialog', { name: 'Save existing fields only?', exact: true });
    await confirm.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect(payloads).toHaveLength(0);
    await expect(modal.getByLabel('Project objective', { exact: true })).toHaveValue(
      'ส่งมอบระบบ 🌼',
    );
    await modal.getByRole('button', { name: 'Save', exact: true }).click();
    await confirm.getByRole('button', { name: 'Discard preview and save', exact: true }).click();
    await expect(modal).toHaveCount(0);
    expect(payloads).toHaveLength(1);
    expect(Object.keys(payloads[0]!).sort()).toEqual([
      'description',
      'name',
      'owner_team_id',
      'project_category',
      'project_type',
    ]);
    // Existing records expose the same preview without fabricating saved delivery data.
    await page.locator('summary[aria-label^="Project actions"]').first().click();
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(page.getByLabel('Project objective', { exact: true })).toHaveValue('');
  } finally {
    await f.close();
  }
});

test('Task primary owner preview is explicit, guarded and excluded from create payload', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    const board = await tasks(page);
    await board.getByRole('button', { name: 'New task', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Create task', exact: true });
    const owner = modal.getByLabel('Primary task owner', { exact: true });
    await expect(owner).toHaveValue('');
    await modal.getByLabel('Task title', { exact: true }).fill('ตรวจแบบฟอร์ม 🌼');
    await owner.selectOption({ label: 'Workspace Admin' });
    await expect(modal.getByRole('button', { name: 'Assignees', exact: true })).not.toContainText(
      'Workspace Admin',
    );
    await modal.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Discard changes?', exact: true })
      .getByRole('button', { name: 'Cancel', exact: true })
      .click();
    await expect(owner).toHaveValue('1');
    for (const width of [1440, 960, 360]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await modal.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      await owner.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `/private/tmp/friday-delivery-task-${width}.png`,
        animations: 'disabled',
      });
    }
    const payloads: Record<string, unknown>[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/tasks')
        payloads.push(request.postDataJSON());
    });
    await modal.getByRole('button', { name: 'New task', exact: true }).click();
    const confirm = page.getByRole('dialog', { name: 'Save existing fields only?', exact: true });
    await confirm.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect(payloads).toHaveLength(0);
    await expect(owner).toHaveValue('1');
    await modal.getByRole('button', { name: 'New task', exact: true }).click();
    await confirm.getByRole('button', { name: 'Discard preview and save', exact: true }).click();
    await expect(modal).toHaveCount(0);
    expect(payloads).toHaveLength(1);
    expect(payloads[0]).not.toHaveProperty('primary_owner');
    expect(payloads[0]).not.toHaveProperty('primaryOwnerDraft');
    expect(payloads[0]!.assignee_ids).toEqual([]);
  } finally {
    await f.close();
  }
});
