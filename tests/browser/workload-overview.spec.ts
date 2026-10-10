import { test, expect } from '@playwright/test';
import { mutate, projectFixture, tasks } from './task-workspace-fixtures.js';
// T-088 / AT-37 local Chromium evidence: project Workload/Overview tabs and team workload.
const bangkok = (offsetDays: number) =>
  new Date(Date.now() + 7 * 3600000 + offsetDays * 86400000).toISOString().slice(0, 10);
test('Workload highlights above threshold, lists cell tasks; Overview matches data; team workload', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    for (const [title, due] of [
      ['เลยกำหนด A', bangkok(-1)],
      ['Today B', bangkok(0)],
      ['No date C', null],
    ] as const)
      expect(
        (
          await mutate(page, '/api/tasks', {
            project_id: f.project.id,
            title,
            assignee_ids: [1],
            ...(due ? { due_date: due } : {}),
          })
        ).status,
      ).toBe(201);
    const org = await page.evaluate(
      async () => (await (await fetch('/api/organization')).json()).item,
    );
    expect(
      (
        await mutate(
          page,
          '/api/organization',
          { workload_threshold: 1, version: org.version },
          'PATCH',
        )
      ).status,
    ).toBe(200);
    const region = await tasks(page);
    await region.getByRole('button', { name: 'Workload', exact: true }).click();
    const w = page.getByRole('region', { name: 'Workload table' });
    await expect(w.getByRole('rowheader', { name: 'Workspace Admin' })).toBeVisible();
    // Threshold 1: this week holds yesterday's and today's task (2 > 1, highlighted) unless
    // today is Monday, when yesterday falls in the previous week (1, not highlighted).
    const monday = new Date(`${bangkok(0)}T00:00:00Z`).getUTCDay() === 1;
    const thisWeek = w.locator('tbody tr').first().locator('td').first();
    await expect(thisWeek).toHaveText(monday ? '1' : '2');
    await expect(thisWeek).toHaveClass(monday ? /^$/ : /workload-over/);
    const noDate = w.getByRole('button', { name: 'Workspace Admin: 1 tasks with no date' });
    await noDate.click();
    const dialog = page.getByRole('dialog', { name: 'Workspace Admin · no date' });
    await expect(dialog.getByRole('link', { name: 'No date C' })).toBeVisible();
    await page.keyboard.press('Escape');
    await region.getByRole('button', { name: 'Overview', exact: true }).click();
    const o = page.getByRole('region', { name: 'Project overview' });
    await expect(o.getByText('0 of 3 tasks done')).toBeVisible();
    await expect(
      o.getByRole('region', { name: 'Overdue tasks' }).getByRole('link', { name: 'เลยกำหนด A' }),
    ).toBeVisible();
    await expect(
      o.getByRole('region', { name: 'Recent activity' }).getByRole('listitem'),
    ).toHaveCount(3);
    // Team workload from the Teams page (Admin).
    await page.getByRole('link', { name: /^(Your|All) teams$/ }).click();
    await page.locator('.team-card-title').first().click();
    await page.getByRole('tab', { name: 'Workload', exact: true }).click();
    const teamDialog = page.getByRole('tabpanel', { name: 'Workload', exact: true });
    await expect(
      teamDialog.getByRole('region', { name: 'Workload table' }).getByRole('rowheader', {
        name: 'Workspace Admin',
      }),
    ).toBeVisible();
    await teamDialog.getByRole('button', { name: 'Next week', exact: true }).click();
    // Next week: dated tasks drop out of every shown week; the undated task stays in No date.
    const teamTable = teamDialog.getByRole('region', { name: 'Workload table' });
    await expect(teamTable.locator('tbody tr').first().locator('td').first()).toHaveText('·');
    await expect(
      teamTable.getByRole('button', { name: 'Workspace Admin: 1 tasks with no date' }),
    ).toBeVisible();
    // Admin edits the threshold in Profile & settings; the value round-trips from the server.
    await page.keyboard.press('Escape');
    await page.goto(f.env.APP_ORIGIN + '/settings?section=organization');
    const settings = page.getByRole('region', { name: 'Organization settings' });
    const field = settings.getByLabel('Workload threshold', { exact: true });
    await expect(field).toHaveValue('1');
    await field.fill('0');
    await expect(
      settings.getByRole('button', { name: 'Save organization settings' }),
    ).toBeDisabled();
    await field.fill('12');
    await settings.getByRole('button', { name: 'Save organization settings' }).click();
    await expect(page.getByText('Organization settings saved')).toBeVisible();
    await page.reload();
    await expect(
      page
        .getByRole('region', { name: 'Organization settings' })
        .getByLabel('Workload threshold', { exact: true }),
    ).toHaveValue('12');
  } finally {
    await f.close();
  }
});
