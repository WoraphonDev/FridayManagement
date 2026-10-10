import { test, expect } from '@playwright/test';
import { projectFixture, mutate, tasks } from './task-workspace-fixtures.js';

test('Task sub-tabs: empty/populated panels, compact checkboxes, drafts, cancel and mobile', async ({
  page,
}) => {
  const fileName = 'Development release plan and acceptance notes v4.0.txt';
  const f = await projectFixture(page);
  try {
    const task = await mutate(page, '/api/tasks', {
      project_id: f.project.id,
      title: 'Development release',
      description: 'รายละเอียดสำหรับทีม Development',
    });
    expect(task.status).toBe(201);
    await page.setViewportSize({ width: 1440, height: 1000 });
    const board = await tasks(page);
    await board
      .getByRole('button', { name: `Open task #${task.body.item.id}`, exact: true })
      .click();
    const d = page.getByRole('dialog', { name: `Task details #${task.body.item.id}`, exact: true });
    const tabs = d.getByRole('tablist', { name: 'Task sections' });
    await expect.poll(() => d.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    await d.getByRole('tab', { name: 'Checklist', exact: true }).click();
    await expect(d.getByRole('heading', { name: 'No checklist items yet' })).toBeVisible();
    await d.getByRole('tab', { name: 'Updates', exact: true }).click();
    await expect(d.getByRole('heading', { name: 'No updates yet' })).toBeVisible();
    await d.getByRole('tab', { name: 'Files', exact: true }).click();
    await expect(d.getByRole('heading', { name: 'No attachments yet' })).toBeVisible();
    const toggle = d.getByLabel('Show deleted files available to restore', { exact: true });
    const checkBounds = await toggle.boundingBox();
    expect(checkBounds!.width).toBe(16);
    expect(checkBounds!.height).toBe(16);
    expect(await toggle.locator('..').evaluate((el) => getComputedStyle(el).flexDirection)).toBe(
      'row',
    );
    await toggle.check();
    await expect(d.getByRole('heading', { name: 'No deleted files to restore' })).toBeVisible();
    await toggle.uncheck();
    await page.screenshot({
      path: 'reports/UI-task-tab-files-empty-desktop.png',
      animations: 'disabled',
    });
    await d.getByRole('tab', { name: 'Checklist', exact: true }).click();
    await d.getByRole('button', { name: 'Add checklist item', exact: true }).click();
    await d.getByLabel('Add checklist item', { exact: true }).fill('ตรวจหน้าจอและสิทธิ์ของทีม');
    await d.getByRole('heading', { name: /Checklist [0-9]+\/[0-9]+/, exact: true }).click();
    await expect(d.getByRole('heading', { name: 'Checklist 0/1', exact: true })).toBeVisible();
    await d
      .getByRole('button', { name: 'Edit checklist item ตรวจหน้าจอและสิทธิ์ของทีม', exact: true })
      .click();
    await d.getByLabel('New checklist item', { exact: true }).fill('Discarded checklist title');
    await d.getByRole('button', { name: 'Cancel checklist edit', exact: true }).click();
    await expect(d.getByLabel('ตรวจหน้าจอและสิทธิ์ของทีม', { exact: true })).not.toBeChecked();
    await d.getByLabel('ตรวจหน้าจอและสิทธิ์ของทีม', { exact: true }).click();
    await expect(d.getByRole('heading', { name: 'Checklist 1/1', exact: true })).toBeVisible();
    await d.getByRole('tab', { name: 'Updates', exact: true }).click();
    await d.getByLabel('Write a comment', { exact: true }).fill('Development update · อัปเดตงาน');
    await d.getByRole('button', { name: 'Post comment', exact: true }).click();
    await expect(d.getByText('Comment added', { exact: true })).toBeVisible();
    await d.getByLabel('Write a comment', { exact: true }).fill('ร่างที่ยังไม่ส่ง');
    await d.getByRole('tab', { name: 'Files', exact: true }).click();
    await d.getByLabel('Choose attachment').setInputFiles({
      name: fileName,
      mimeType: 'text/plain',
      buffer: Buffer.alloc(105360, 'x'),
    });
    await d.getByRole('button', { name: 'Discard selected file', exact: true }).click();
    await expect(d.getByRole('button', { name: 'Upload file', exact: true })).toBeDisabled();
    await d.getByLabel('Choose attachment').setInputFiles({
      name: fileName,
      mimeType: 'text/plain',
      buffer: Buffer.alloc(105360, 'x'),
    });
    await d.getByRole('button', { name: 'Upload file', exact: true }).click();
    await expect(
      d.getByRole('button', { name: `Download ${fileName}`, exact: true }),
    ).toBeVisible();
    await expect(d.getByText('105.4 KB', { exact: true })).toBeVisible();
    await expect(d.getByRole('button', { name: `Download ${fileName}`, exact: true })).toHaveText(
      'Download',
    );
    await d.getByRole('tab', { name: 'Updates', exact: true }).click();
    await expect(d.getByLabel('Write a comment', { exact: true })).toHaveValue('ร่างที่ยังไม่ส่ง');
    // Clear this test draft so closing the drawer does not need discard confirmation.
    await d.getByLabel('Write a comment', { exact: true }).fill('');
    const initialTabs = await tabs.boundingBox();
    for (const name of ['Details', 'Checklist', 'Updates', 'Files', 'Activity']) {
      await d.getByRole('tab', { name, exact: true }).click();
      await expect(d.getByRole('tab', { name, exact: true })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      const currentTabs = await tabs.boundingBox();
      expect(Math.abs(currentTabs!.y - initialTabs!.y)).toBeLessThan(2);
      await page.screenshot({
        path: `reports/UI-task-tab-${name.toLowerCase()}-desktop.png`,
        animations: 'disabled',
      });
    }
    await page.setViewportSize({ width: 360, height: 900 });
    for (const name of ['Details', 'Checklist', 'Updates', 'Files', 'Activity']) {
      await d.getByRole('tab', { name, exact: true }).click();
      expect(
        await d.evaluate(
          (el) =>
            el.scrollWidth <= el.clientWidth && el.getBoundingClientRect().right <= innerWidth,
        ),
      ).toBe(true);
      await expect(d.getByRole('button', { name: 'Cancel', exact: true })).toBeInViewport();
      await page.screenshot({
        path: `reports/UI-task-tab-${name.toLowerCase()}-mobile.png`,
        animations: 'disabled',
      });
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await d.getByRole('tab', { name: 'Files', exact: true }).click();
    await expect(toggle).toBeVisible();
    expect((await toggle.boundingBox())!.height).toBe(16);
    await d.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(d).toHaveCount(0);
  } finally {
    await f.close();
  }
});
