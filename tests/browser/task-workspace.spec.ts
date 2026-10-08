import { test, expect, type Page } from '@playwright/test';
import { projectFixture, tasks, mutate } from './task-workspace-fixtures.js';
import { SqliteDatabase } from '../../src/repository/sqlite/database.js';
import { insert } from '../schema/fixtures.js';
import { sql } from '../../src/repository/access-scope.js';
import { dateAdd } from '../../frontend/src/task-dates.js';
const detail = (page: Page) => page.getByRole('dialog', { name: /^Task details #/ });
async function today(page: Page) {
  return page.evaluate(async () => {
    const s = await (await fetch('/api/me')).json();
    return s.bangkok_today as string;
  });
}
async function create(page: Page, title: string, fields: Record<string, unknown> = {}) {
  const r = await mutate(page, '/api/tasks', { project_id: 1, title, ...fields });
  expect(r.status).toBe(201);
  return r.body.item as { id: number; version: number };
}
const closeDetail = (page: Page) =>
  detail(page).getByRole('button', { name: 'Close dialog', exact: true }).click();
test('T045 actual My tasks default assignee, created view, Bangkok groups, AND/OR filters and debounce', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    const d = await today(page);
    const user = await mutate(page, '/api/users', {
      username: 'TaskMember',
      display_name: 'Task Member',
      temp_password: 'Workspace-member-fixture-password',
      org_role: 'member',
    });
    expect(user.status).toBe(201);
    const member = await mutate(
      page,
      '/api/projects/1/members/2',
      {
        version: 1,
        access: 'editor',
      },
      'PUT',
    );
    expect(member.status).toBe(200);
    await create(page, 'Today assigned', { assignee_id: 1, due_date: d, priority: 'high' });
    await create(page, 'Overdue assigned', { assignee_id: 1, due_date: dateAdd(d, -1) });
    await create(page, 'No due assigned', { assignee_id: 1 });
    const done = await create(page, 'Done assigned', { assignee_id: 1, due_date: dateAdd(d, -2) });
    expect(
      (await mutate(page, `/api/tasks/${done.id}`, { version: 1, status: 'done' }, 'PATCH')).status,
    ).toBe(200);
    await create(page, 'Created for another person', { assignee_id: 2, due_date: d });
    await create(page, 'Future assigned', { assignee_id: 1, due_date: dateAdd(d, 2) });
    await page.getByRole('link', { name: 'My work', exact: true }).click();
    const workspace = page.getByRole('region', { name: 'My work', exact: true });
    await expect(workspace.getByText('5 Tasks', { exact: true })).toBeVisible();
    await expect(workspace.getByRole('button', { name: 'Open task #5', exact: true })).toHaveCount(
      0,
    );
    await workspace.getByLabel('Show tasks', { exact: true }).selectOption('created');
    await expect(
      workspace.getByRole('button', { name: 'Open task #5', exact: true }),
    ).toBeVisible();
    await workspace.getByLabel('Show tasks', { exact: true }).selectOption('assigned');
    for (const [group, id] of [
      ['future', 6],
      ['overdue', 2],
      ['none', 3],
      ['done', 4],
    ] as const) {
      await workspace.getByLabel('Due range', { exact: true }).selectOption(group);
      await expect(
        workspace.getByRole('button', { name: `Open task #${id}`, exact: true }),
      ).toBeVisible();
      await expect(workspace.getByRole('button', { name: /^Open task #/ })).toHaveCount(1);
    }
    await workspace.getByLabel('Due range', { exact: true }).selectOption('today');
    await expect(
      workspace.getByRole('button', { name: 'Open task #1', exact: true }),
    ).toBeVisible();
    await expect(workspace.getByRole('button', { name: 'Open task #2', exact: true })).toHaveCount(
      0,
    );
    await workspace.locator('summary').filter({ hasText: 'Filters' }).click();
    await workspace.getByLabel('Working on it', { exact: true }).check();
    await expect(workspace.getByText('No tasks match these filters')).toBeVisible();
    await workspace.getByLabel('Not started', { exact: true }).check();
    await expect(
      workspace.getByRole('button', { name: 'Open task #1', exact: true }),
    ).toBeVisible();
    await workspace.getByLabel('High', { exact: true }).check();
    await workspace.getByLabel('Search tasks', { exact: true }).fill('No match');
    await expect(workspace.getByText('No tasks match these filters')).toBeVisible();
    await workspace.getByLabel('Search tasks', { exact: true }).fill('Today');
    await expect(
      workspace.getByRole('button', { name: 'Open task #1', exact: true }),
    ).toBeVisible();
  } finally {
    await f.close();
  }
});
test('T046 actual Gantt inclusive overlap/one-day/due-only/no dates and Calendar month/filter/detail keyboard', async ({
  page,
}, testInfo) => {
  const f = await projectFixture(page);
  try {
    const d = await today(page);
    await create(page, 'Overlap', { start_date: dateAdd(d, -3), due_date: dateAdd(d, 2) });
    await create(page, 'Single day', { start_date: d, due_date: d });
    await create(page, 'Only due', { due_date: d });
    await create(page, 'Only start', { start_date: d });
    await create(page, 'No dates');
    const jobs = await tasks(page);
    for (const name of ['Main table', 'Gantt', 'Calendar', 'Kanban'])
      await expect(jobs.getByRole('button', { name, exact: true })).toBeVisible();
    await jobs.getByRole('button', { name: 'Gantt', exact: true }).click();
    const gantt = jobs.getByRole('region', { name: 'Gantt', exact: true });
    await expect(gantt.locator('.gantt-bar')).toHaveCount(3);
    const widths = await gantt
      .locator('.gantt-bar')
      .evaluateAll((nodes) => nodes.map((n) => (n as HTMLElement).style.width));
    expect(widths.sort()).toEqual(['336px', '56px', '56px']);
    await expect(gantt.getByRole('button', { name: /Open task #3.*No Start Plan/ })).toBeVisible();
    await expect(
      gantt
        .getByRole('region', { name: 'Tasks with incomplete dates', exact: true })
        .getByRole('button'),
    ).toHaveCount(3);
    const bar = gantt
      .locator('.gantt-bar')
      .and(gantt.getByRole('button', { name: /Open task #2 / }));
    await bar.focus();
    await page.keyboard.press('Enter');
    await expect(detail(page).getByLabel('End Plan', { exact: true })).toHaveValue(d);
    await detail(page).getByLabel('Start Plan', { exact: true }).fill(dateAdd(d, 1));
    await detail(page).getByLabel('End Plan', { exact: true }).fill(dateAdd(d, 1));
    const patchRequest = page.waitForRequest(
      (r) => r.method() === 'PATCH' && new URL(r.url()).pathname === '/api/tasks/2',
    );
    await detail(page).getByRole('button', { name: 'Save task', exact: true }).click();
    expect((await patchRequest).postDataJSON()).toMatchObject({
      version: 1,
      start_date: dateAdd(d, 1),
      due_date: dateAdd(d, 1),
    });
    await expect(detail(page).getByText('Task saved', { exact: true })).toBeVisible();
    await closeDetail(page);
    for (const scale of ['week', 'month', 'day']) {
      await gantt.getByLabel('Range', { exact: true }).selectOption(scale);
      await expect(gantt.locator('.gantt-bar')).toHaveCount(3);
    }
    await gantt.getByRole('button', { name: 'Next period', exact: true }).click();
    await expect(gantt.locator('.gantt-bar')).toHaveCount(0);
    await gantt.getByRole('button', { name: 'Today', exact: true }).click();
    await expect(gantt.locator('.gantt-bar')).toHaveCount(3);
    await jobs.evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.screenshot({ path: testInfo.outputPath('T049-gantt-desktop.png'), fullPage: true });
    await jobs.getByRole('button', { name: 'Calendar', exact: true }).click();
    const calendar = jobs.getByRole('region', { name: 'Calendar', exact: true });
    await expect(calendar.locator('.calendar-event')).toHaveCount(3);
    await expect(
      calendar
        .getByRole('region', { name: 'Tasks without End Plan', exact: true })
        .getByRole('button'),
    ).toHaveCount(2);
    await calendar.getByRole('button', { name: 'Next month', exact: true }).click();
    await expect(calendar.locator('.calendar-event')).toHaveCount(0);
    await calendar.getByRole('button', { name: 'Today', exact: true }).click();
    await expect(calendar.locator('.calendar-event')).toHaveCount(3);
    await calendar.locator('.calendar-event').filter({ hasText: 'Only due' }).click();
    await expect(detail(page).getByLabel('Start Plan', { exact: true })).toHaveValue('');
    await closeDetail(page);
    await jobs.locator('summary').filter({ hasText: 'Filters' }).click();
    await jobs.getByLabel('Due date', { exact: true }).selectOption('false');
    await expect(calendar.locator('.calendar-event')).toHaveCount(0);
    await expect(
      calendar
        .getByRole('region', { name: 'Tasks without End Plan', exact: true })
        .getByRole('button'),
    ).toHaveCount(2);
  } finally {
    await f.close();
  }
});
test('T046 loads all 205 API rows, bounded Gantt pages and accessible Calendar overflow list at 390px', async ({
  page,
}, testInfo) => {
  const f = await projectFixture(page);
  let db: SqliteDatabase | undefined;
  try {
    const d = await today(page);
    db = new SqliteDatabase(f.path);
    await db.transaction(async (tx) => {
      for (let i = 1; i <= 205; i++) {
        await tx.execute(
          insert('tasks', {
            project_id: 1,
            title: `Timeline ${i}`,
            creator_id: 1,
            start_date: d,
            due_date: d,
          }),
        );
        await tx.execute(
          insert('board_positions', { project_id: 1, task_id: i, status: 'todo', rank: i }),
        );
      }
    });
    await db.close();
    db = undefined;
    const jobs = await tasks(page);
    await expect(jobs.getByRole('button', { name: /^Open task #/ })).toHaveCount(20);
    await jobs.getByRole('button', { name: 'Gantt', exact: true }).click();
    const g = jobs.getByRole('region', { name: 'Gantt', exact: true });
    await expect(g.getByText(/of 205 tasks in range/)).toBeVisible();
    await expect(g.locator('.gantt-bar')).toHaveCount(50);
    for (let i = 0; i < 4; i++)
      await g.getByRole('button', { name: 'Next Gantt page', exact: true }).click();
    await expect(g.locator('.gantt-bar')).toHaveCount(5);
    await g
      .locator('.gantt-bar')
      .and(g.getByRole('button', { name: /Open task #205 / }))
      .click();
    await expect(detail(page).getByLabel('Task title', { exact: true })).toHaveValue(
      'Timeline 205',
    );
    await closeDetail(page);
    await jobs.getByRole('button', { name: 'Calendar', exact: true }).click();
    const c = jobs.getByRole('region', { name: 'Calendar', exact: true });
    await expect(c.locator('.calendar-event')).toHaveCount(3);
    await expect(c.getByText('+202 more', { exact: true })).toBeVisible();
    await c.locator('summary').filter({ hasText: 'All tasks in this calendar range' }).click();
    const list = c.getByRole('region', {
      name: 'Tasks with End Plan in this calendar range',
      exact: true,
    });
    for (let i = 0; i < 4; i++)
      await list.getByRole('button', { name: 'Next items', exact: true }).click();
    await expect(
      list.getByRole('button', { name: 'Open task #205 Timeline 205', exact: true }),
    ).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await jobs.evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.screenshot({
      path: testInfo.outputPath('T049-calendar-mobile.png'),
      fullPage: true,
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  } finally {
    await db?.close();
    await f.close();
  }
});
test('T047 actual second-tab edit refreshes clean detail; dirty draft badge, version conflict, comments draft retained', async ({
  page,
  context,
}) => {
  const f = await projectFixture(page);
  try {
    test.setTimeout(60000);
    await create(page, 'Original');
    const jobs = await tasks(page);
    await jobs.getByRole('button', { name: 'Open task #1', exact: true }).click();
    const d = detail(page);
    await expect(d.getByLabel('Task title', { exact: true })).toHaveValue('Original');
    const other = await context.newPage();
    await other.goto(f.env.APP_ORIGIN);
    expect(
      (await mutate(other, '/api/tasks/1', { version: 1, title: 'Remote clean' }, 'PATCH')).status,
    ).toBe(200);
    await expect(d.getByLabel('Task title', { exact: true })).toHaveValue('Remote clean', {
      timeout: 10000,
    });
    const tab = (name: string) => d.getByRole('tab', { name, exact: true }).click();
    await d.getByLabel('Task title', { exact: true }).fill('My draft');
    await tab('Updates');
    await d.getByLabel('Write a comment', { exact: true }).fill('My comment draft');
    expect(
      (await mutate(other, '/api/tasks/1', { version: 2, title: 'Remote changed' }, 'PATCH'))
        .status,
    ).toBe(200);
    await expect(page.getByText(/^Data changed\. Your draft is preserved/)).toBeVisible({
      timeout: 10000,
    });
    await expect(d.getByLabel('Write a comment', { exact: true })).toHaveValue('My comment draft');
    await tab('Details');
    await expect(d.getByLabel('Task title', { exact: true })).toHaveValue('My draft');
    await d.getByRole('button', { name: 'Save task', exact: true }).click();
    await expect(
      d.getByRole('button', { name: 'Load latest and compare', exact: true }),
    ).toBeVisible();
    await expect(d.getByLabel('Task title', { exact: true })).toHaveValue('My draft');
    await d.getByRole('button', { name: 'Load latest and compare', exact: true }).click();
    await expect(d.getByText('Latest data: Remote changed', { exact: false })).toBeVisible();
    expect((await mutate(other, '/api/tasks/1/comments', { body: 'Remote comment' })).status).toBe(
      201,
    );
    await tab('Updates');
    await expect(d.getByText('Remote comment', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Collaboration data changed/)).toBeVisible({ timeout: 10000 });
    await expect(d.getByLabel('Write a comment', { exact: true })).toHaveValue('My comment draft');
    await other.close();
  } finally {
    await f.close();
  }
});
test('T047 focus immediate refresh, hidden/offline pause, GET polling leaves idle unchanged, logout clears private view', async ({
  page,
}) => {
  test.setTimeout(60000);
  const f = await projectFixture(page);
  let db: SqliteDatabase | undefined;
  try {
    await create(page, 'Session task', { assignee_id: 1 });
    await page.getByRole('link', { name: 'My work', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Open task #1', exact: true })).toBeVisible();
    await page.waitForTimeout(300);
    db = new SqliteDatabase(f.path);
    const seen = await db.transaction((tx) =>
      tx.query(sql('SELECT last_seen_at FROM dbo.sessions')),
    );
    await page.waitForTimeout(6000);
    expect(
      await db.transaction((tx) => tx.query(sql('SELECT last_seen_at FROM dbo.sessions'))),
    ).toEqual(seen);
    let calls = 0;
    page.on('request', (r) => {
      if (r.url().includes('/api/tasks?')) calls++;
    });
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    calls = 0;
    await page.waitForTimeout(5500);
    expect(calls).toBe(0);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect.poll(() => calls, { timeout: 1500 }).toBeGreaterThan(0);
    await page.context().setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await page.waitForTimeout(300);
    calls = 0;
    await page.waitForTimeout(5500);
    expect(calls).toBe(0);
    await page.context().setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect.poll(() => calls, { timeout: 1500 }).toBeGreaterThan(0);
    await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeEnabled({
      timeout: 15000,
    });
    calls = 0;
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect.poll(() => calls, { timeout: 1500 }).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page.getByLabel('Username', { exact: true })).toBeVisible();
    calls = 0;
    await page.waitForTimeout(5500);
    expect(calls).toBe(0);
    await expect(page.getByText('Session task', { exact: false })).toHaveCount(0);
  } finally {
    await db?.close();
    await f.close();
  }
});

test('T071 four views retain authoritative dates/null dates after edit and actual application restart', async ({
  page,
}, testInfo) => {
  const f = await projectFixture(page);
  try {
    const d = await today(page);
    const dated = await create(page, 'Across views dated', { start_date: d, due_date: d });
    const noDates = await create(page, 'Across views no dates');
    let jobs = await tasks(page);
    await expect(
      jobs
        .getByRole('button', { name: `Open task #${dated.id}`, exact: true })
        .filter({ hasText: 'Across views dated' }),
    ).toBeVisible();
    await jobs.getByRole('button', { name: 'Gantt', exact: true }).click();
    await expect(jobs.locator('.gantt-bar')).toHaveCount(1);
    await jobs.getByRole('button', { name: 'Calendar', exact: true }).click();
    await expect(jobs.locator('.calendar-event')).toHaveCount(1);
    await expect(
      jobs
        .getByRole('region', { name: 'Tasks without End Plan', exact: true })
        .getByRole('button', {
          name: `Open task #${noDates.id} Across views no dates`,
          exact: true,
        }),
    ).toBeVisible();
    await jobs.getByRole('button', { name: 'Kanban', exact: true }).click();
    await expect(jobs.locator('.kanban-card')).toHaveCount(2);
    await jobs.getByRole('button', { name: `Open task #${noDates.id}`, exact: true }).click();
    await expect(detail(page).getByLabel('Start Plan', { exact: true })).toHaveValue('');
    await expect(detail(page).getByLabel('End Plan', { exact: true })).toHaveValue('');
    await detail(page).getByLabel('Task title', { exact: true }).fill('Across views revised');
    await detail(page).getByRole('button', { name: 'Save task', exact: true }).click();
    await expect(detail(page).getByText('Task saved', { exact: true })).toBeVisible();
    await closeDetail(page);
    await f.restart();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeEnabled();
    jobs = await tasks(page);
    await expect(
      jobs
        .getByRole('button', { name: `Open task #${noDates.id}`, exact: true })
        .filter({ hasText: 'Across views revised' }),
    ).toBeVisible();
    await jobs.getByRole('button', { name: 'Calendar', exact: true }).click();
    await expect(jobs.locator('.calendar-event')).toHaveCount(1);
    await expect(
      jobs
        .getByRole('region', { name: 'Tasks without End Plan', exact: true })
        .getByRole('button', {
          name: `Open task #${noDates.id} Across views revised`,
          exact: true,
        }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('T071-four-view-restart.png'),
      fullPage: true,
    });
  } finally {
    await f.close();
  }
});
