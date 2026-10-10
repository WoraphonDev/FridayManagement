import { test, expect } from '@playwright/test';
import { projectFixture, mutate, tasks } from './task-workspace-fixtures.js';

test('Project detail style: stable sections, task save/cancel, docs cancel, metadata and mobile', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    for (const [i, status] of ['todo', 'doing', 'review', 'done'].entries()) {
      const created = await mutate(page, '/api/tasks', {
        project_id: f.project.id,
        title: [
          'Plan the release',
          'Build the dashboard',
          'Review user flows',
          'Set up the project',
        ][i],
        due_date: status === 'todo' ? '2026-10-01' : null,
      });
      expect(created.status).toBe(201);
      if (status !== 'todo')
        expect(
          (
            await mutate(
              page,
              `/api/tasks/${created.body.item.id}`,
              {
                version: created.body.item.version,
                status,
              },
              'PATCH',
            )
          ).status,
        ).toBe(200);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    const board = await tasks(page);
    // A project without a description must not borrow the Calendar/My work subtitle.
    await expect(page.getByText('All due dates across projects you can access')).toHaveCount(0);
    const tabs = board.getByRole('region', { name: 'Task views', exact: true });
    // Document-relative: a shorter view may clamp scroll, which is not a layout shift.
    const docY = () => tabs.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    await tabs.getByRole('button', { name: 'Overview', exact: true }).click();
    await expect(board.getByRole('region', { name: 'Project overview' })).toBeVisible();
    await expect(board.locator('.overview-tiles')).toContainText('1 of 4 tasks done');
    await expect(board.locator('.overview-tile').first().locator('strong')).toHaveText('25%');
    await expect
      .poll(() => board.locator('.project-overview').evaluate((el) => getComputedStyle(el).opacity))
      .toBe('1');
    await page.screenshot({
      path: 'reports/UI-project-board-colorful-desktop.png',
      fullPage: true,
      animations: 'disabled',
    });
    // Baseline after the full-page capture, which temporarily relayouts the page.
    const before = await docY();
    for (const name of [
      'Members',
      'Docs',
      'Files',
      'Workload',
      'Main table',
      'Kanban',
      'Calendar',
      'Gantt',
    ]) {
      await tabs.getByRole('button', { name, exact: true }).click();
      await expect(tabs.getByRole('button', { name, exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await expect.poll(async () => Math.abs((await docY()) - before)).toBeLessThan(2);
    }
    await tabs.getByRole('button', { name: 'Main table', exact: true }).click();
    await board.getByRole('button', { name: 'New task', exact: true }).click();
    let editor = page.getByRole('dialog', { name: 'Create task', exact: true });
    await editor.getByLabel('Task title', { exact: true }).fill('งานที่บันทึกจริง');
    await expect.poll(() => editor.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    await page.screenshot({
      path: 'reports/UI-project-task-editor-desktop.png',
      animations: 'disabled',
    });
    await editor.getByRole('button', { name: 'New task', exact: true }).click();
    await expect(editor).toHaveCount(0);
    await page.reload();
    await tasks(page);
    await expect(board.getByRole('button', { name: 'Open task #5', exact: true })).toContainText(
      'งานที่บันทึกจริง',
    );
    await board.getByRole('button', { name: 'New task', exact: true }).click();
    editor = page.getByRole('dialog', { name: 'Create task', exact: true });
    await editor.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(editor).toHaveCount(0);

    await tabs.getByRole('button', { name: 'Docs', exact: true }).click();
    const docs = board.locator('.project-docs');
    await docs.getByRole('button', { name: '+ New doc', exact: true }).click();
    await docs.getByLabel('Doc title').fill('Development notes');
    await docs.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(docs.getByRole('heading', { name: 'Development notes' })).toBeVisible();
    await docs.getByRole('button', { name: 'Edit', exact: true }).click();
    await docs.getByLabel('Doc title').fill('Discarded title');
    await docs.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(docs.getByRole('heading', { name: 'Development notes' })).toBeVisible();
    await page.screenshot({
      path: 'reports/UI-project-docs-colorful-desktop.png',
      fullPage: true,
      animations: 'disabled',
    });

    await page.goto(f.env.APP_ORIGIN + '/projects');
    await page.locator('summary[aria-label^="Project actions"]').first().click();
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    const metadata = page.getByRole('dialog');
    await metadata.getByLabel('Project Name').fill('Discarded project name');
    await metadata.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(metadata).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Task project', exact: true })).toBeVisible();
    await page.setViewportSize({ width: 360, height: 900 });
    await page.getByRole('button', { name: 'Task project', exact: true }).click();
    await tabs.getByRole('button', { name: 'Overview', exact: true }).click();
    await expect(board.getByRole('region', { name: 'Project overview' })).toBeVisible();
    await expect(board.locator('.overview-tile').first().locator('strong')).toHaveText('20%');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: 'reports/UI-project-board-colorful-mobile.png',
      fullPage: true,
      animations: 'disabled',
    });
    await tabs.getByRole('button', { name: 'Main table', exact: true }).click();
    await board.getByRole('button', { name: 'New task', exact: true }).click();
    editor = page.getByRole('dialog', { name: 'Create task', exact: true });
    await expect
      .poll(() =>
        editor.evaluate(
          (el) =>
            el.scrollWidth <= el.clientWidth && el.getBoundingClientRect().right <= innerWidth,
        ),
      )
      .toBe(true);
    await page.screenshot({
      path: 'reports/UI-project-task-editor-mobile.png',
      animations: 'disabled',
    });
    await editor.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await tabs.getByRole('button', { name: 'Overview', exact: true }).click();
    await expect(board.getByRole('region', { name: 'Project overview' })).toBeVisible();
    expect(
      await tabs
        .getByRole('button', { name: 'Overview', exact: true })
        .evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration)),
    ).toBeLessThan(0.001);
  } finally {
    await f.close();
  }
});
