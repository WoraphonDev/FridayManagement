import { test, expect, type Page } from '@playwright/test';
import { rmSync } from 'node:fs';
import { startupFixture } from '../setup/fixtures.js';
import { startApplication } from '../../src/api/start.js';
const password = 'Workspace-admin-fixture-password';
async function fixture(page: Page) {
  const f = await startupFixture();
  let token = '';
  let app = await startApplication(f.env, {
    announceSetupToken: (t) => {
      token = t;
    },
  });
  try {
    const setup = await page.request.post(f.env.APP_ORIGIN + '/api/setup', {
      headers: { Origin: f.env.APP_ORIGIN },
      data: {
        token,
        organization_name: 'Workspace fixture',
        username: 'WorkspaceAdmin',
        display_name: 'Workspace Admin',
        password,
      },
    });
    expect(setup.status()).toBe(201);
    await page.goto(f.env.APP_ORIGIN);
    await page.getByLabel('Username', { exact: true }).fill('WorkspaceAdmin');
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Teams & members', exact: true })).toBeVisible();
    return {
      ...f,
      restart: async () => {
        await app.stop();
        app = await startApplication(f.env);
      },
      close: async () => {
        await app.stop();
        rmSync(f.root, { recursive: true, force: true });
      },
    };
  } catch (e) {
    await app.stop();
    rmSync(f.root, { recursive: true, force: true });
    throw e;
  }
}
async function mutate(page: Page, path: string, body: unknown, method = 'POST') {
  return page.evaluate(
    async ({ path, body, method }) => {
      const self = await (await fetch('/api/me')).json();
      const response = await fetch(path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': self.csrf,
          ...(['POST', 'PATCH'].includes(method) ? { 'Idempotency-Key': crypto.randomUUID() } : {}),
        },
        body: JSON.stringify(body),
      });
      return { status: response.status, body: await response.json() };
    },
    { path, body, method },
  );
}
async function projectFixture(page: Page) {
  const f = await fixture(page);
  const team = await mutate(page, '/api/teams', { name: 'Task team' }),
    project = await mutate(page, '/api/projects', {
      name: 'Task project',
      owner_team_id: team.body.item.id,
    });
  expect(project.status).toBe(201);
  return { ...f, project: project.body.item };
}
async function tasks(page: Page) {
  await page.getByRole('link', { name: 'All projects', exact: true }).click();
  await page.locator('summary[aria-label^="Project actions"]').first().click();
  await page.getByRole('button', { name: 'Tasks', exact: true }).click();
  return page.getByRole('region', { name: 'Project tasks · Task project', exact: true });
}
async function make(page: Page, title: string) {
  const jobs = await tasks(page);
  await jobs.getByRole('button', { name: 'New task', exact: true }).first().click();
  const d = page.getByRole('dialog', { name: 'Create task', exact: true });
  await d.getByLabel('Task title', { exact: true }).fill(title);
  await d.getByRole('button', { name: 'New task', exact: true }).click();
  await expect(d).toHaveCount(0);
  return jobs;
}
async function pickAssignee(page: Page, scope: ReturnType<Page['getByRole']>, name: string) {
  await scope.getByRole('button', { name: 'Assignees', exact: true }).click();
  await page
    .getByRole('listbox', { name: 'Options for Assignees', exact: true })
    .getByRole('option', { name, exact: true })
    .click();
  await page.keyboard.press('Escape');
}
const detail = (page: Page) => page.getByRole('dialog', { name: /^Task details #/ });
const closeDetail = (page: Page) =>
  detail(page).getByRole('button', { name: 'Close dialog', exact: true }).click();
test('T032/033 actual all task fields/checklist/closed guard/monthly successor/delete/restore via UI', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    const jobs = await tasks(page);
    await jobs.getByRole('button', { name: 'New task', exact: true }).first().click();
    const create = page.getByRole('dialog', { name: 'Create task', exact: true });
    await create.getByLabel('Task title', { exact: true }).fill('Monthly plan');
    await create.getByLabel('Details', { exact: true }).fill('<script>literal</script>');
    // Category is a dropdown of the project's categories with "+ New category…".
    await create.getByLabel('Category', { exact: true }).selectOption('__new');
    await create.getByLabel('Category', { exact: true }).fill('Finance');
    await pickAssignee(page, create, 'Workspace Admin');
    await create.getByLabel('Priority', { exact: true }).selectOption('urgent');
    await create.getByLabel('Start Plan', { exact: true }).fill('2027-01-29');
    await create.getByLabel('Repeat', { exact: true }).selectOption('monthly');
    await expect(create.getByRole('button', { name: 'New task', exact: true })).toBeDisabled();
    await create.getByLabel('End Plan', { exact: true }).fill('2027-01-31');
    await create.getByRole('button', { name: 'New task', exact: true }).click();
    await expect(create).toHaveCount(0);
    await jobs.getByRole('button', { name: 'Open task #1', exact: true }).click();
    let d = detail(page);
    await expect(d.getByLabel('Details', { exact: true })).toHaveValue('<script>literal</script>');
    await expect(d.getByText('Workspace Admin', { exact: true }).first()).toBeVisible();
    await d.getByRole('tab', { name: 'Checklist', exact: true }).click();
    await d.getByLabel('Add checklist item', { exact: true }).fill('Review');
    await d.getByRole('button', { name: 'Add checklist item', exact: true }).click();
    await expect(d.getByRole('heading', { name: 'Checklist 0/1', exact: true })).toBeVisible();
    await d.getByRole('button', { name: 'Edit checklist item Review', exact: true }).click();
    await d.getByLabel('New checklist item', { exact: true }).fill('Review final');
    await d.getByRole('button', { name: 'Save checklist title', exact: true }).click();
    await expect(d.getByLabel('Review final', { exact: true })).toBeVisible();
    await d.getByRole('tab', { name: 'Details', exact: true }).click();
    await d.getByLabel('Status', { exact: true }).selectOption('done');
    await d.getByRole('button', { name: 'Save task', exact: true }).click();
    await expect(
      d.getByText('Complete every checklist item before marking Done', { exact: true }),
    ).toBeVisible();
    await d.getByRole('tab', { name: 'Checklist', exact: true }).click();
    await d.getByLabel('Review final', { exact: true }).click();
    await expect(d.getByRole('heading', { name: 'Checklist 1/1', exact: true })).toBeVisible();
    await d.getByRole('tab', { name: 'Details', exact: true }).click();
    await expect(d.getByLabel('Status', { exact: true })).toHaveValue('todo');
    await d.getByLabel('Status', { exact: true }).selectOption('done');
    await d.getByRole('button', { name: 'Save task', exact: true }).click();
    await expect(d.getByText('Saved · Next occurrence created #2', { exact: true })).toBeVisible();
    await d.getByRole('tab', { name: 'Checklist', exact: true }).click();
    await expect(d.getByLabel('Review final', { exact: true })).toBeDisabled();
    await expect(d.getByLabel('Add checklist item', { exact: true })).toHaveCount(0);
    await d.getByRole('tab', { name: 'Details', exact: true }).click();
    await d.getByLabel('Status', { exact: true }).selectOption('doing');
    await d.getByRole('button', { name: 'Save task', exact: true }).click();
    await expect(d.getByText('Task saved', { exact: true })).toBeVisible();
    await d.getByRole('tab', { name: 'Checklist', exact: true }).click();
    await d.getByLabel('Review final', { exact: true }).click();
    await expect(d.getByRole('heading', { name: 'Checklist 0/1', exact: true })).toBeVisible();
    await d
      .getByRole('button', { name: 'Delete checklist item Review final', exact: true })
      .click();
    await page
      .getByRole('dialog', { name: 'Confirm checklist deletion', exact: true })
      .getByRole('button', { name: 'Delete this checklist item', exact: true })
      .click();
    await expect(d.getByRole('heading', { name: 'Checklist 0/0', exact: true })).toBeVisible();
    await d.getByRole('button', { name: 'Delete task', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Confirm task deletion', exact: true })
      .getByRole('button', { name: 'Delete this task', exact: true })
      .click();
    await expect(d).toHaveCount(0);
    await expect(jobs.getByRole('button', { name: 'Open task #1', exact: true })).toHaveCount(0);
    await page.getByRole('link', { name: 'Trash', exact: true }).click();
    await expect(
      page.getByRole('columnheader', { name: 'Restore before', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Restore task #1', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Confirm task restore', exact: true })
      .getByRole('button', { name: 'Restore this task', exact: true })
      .click();
    await expect(page.getByText('Restore task #1 complete', { exact: true })).toBeVisible();
    const again = await tasks(page);
    await again.getByRole('button', { name: 'Open task #2', exact: true }).click();
    d = detail(page);
    await expect(d.getByLabel('End Plan', { exact: true })).toHaveValue('2027-02-28');
    await d.getByRole('tab', { name: 'Checklist', exact: true }).click();
    await expect(d.getByRole('heading', { name: 'Checklist 0/1', exact: true })).toBeVisible();
    await closeDetail(page);
    await expect(again.getByRole('button', { name: 'Open task #1', exact: true })).toBeVisible();
  } finally {
    await f.close();
  }
});
test('T032 actual 409 draft review, unsaved close/route cancellation, offline and mobile keyboard', async ({
  page,
}, testInfo) => {
  const f = await projectFixture(page);
  try {
    const jobs = await make(page, 'Original');
    await jobs.getByRole('button', { name: 'Open task #1', exact: true }).click();
    const d = detail(page);
    await d.getByLabel('Task title', { exact: true }).fill('My draft');
    const other = await mutate(
      page,
      '/api/tasks/1',
      { version: 1, title: 'Remote update' },
      'PATCH',
    );
    expect(other.status).toBe(200);
    await d.getByRole('button', { name: 'Save task', exact: true }).click();
    await expect(d.getByLabel('Task title', { exact: true })).toHaveValue('My draft');
    await d.getByRole('button', { name: 'Load latest and compare', exact: true }).click();
    await expect(d.getByText(/Latest data: Remote update/)).toBeVisible();
    await expect(d.getByRole('button', { name: 'Save task', exact: true })).toBeDisabled();
    await d.getByLabel('I have reviewed the latest data and my draft').check();
    await d.getByRole('button', { name: 'Save task', exact: true }).click();
    await expect(d.getByText('Task saved', { exact: true })).toBeVisible();
    await d.getByLabel('Task title', { exact: true }).fill('Unsaved');
    await closeDetail(page);
    await page
      .getByRole('dialog', { name: 'Discard changes?', exact: true })
      .getByRole('button', { name: 'Cancel', exact: true })
      .click();
    await expect(d.getByLabel('Task title', { exact: true })).toHaveValue('Unsaved');
    await page.evaluate(() => history.back());
    await page
      .getByRole('dialog', { name: 'Discard changes?', exact: true })
      .getByRole('button', { name: 'Cancel', exact: true })
      .click();
    await expect(d.getByLabel('Task title', { exact: true })).toHaveValue('Unsaved');
    await expect(page).toHaveURL(/\/projects\?project=1$/);
    await page.context().setOffline(true);
    // Vibe editor hides the submit control while offline.
    await expect(d.getByRole('button', { name: 'Save task', exact: true })).toHaveCount(0);
    await page.context().setOffline(false);
    await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeEnabled({
      timeout: 15000,
    });
    await expect(d.getByLabel('Task title', { exact: true })).toBeEnabled();
    await page.setViewportSize({ width: 360, height: 800 });
    await d.getByLabel('Task title', { exact: true }).focus();
    await page.keyboard.press('Tab');
    expect(
      await d.getByLabel('Details', { exact: true }).evaluate((e) => e === document.activeElement),
    ).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath('T032-task-detail.png'), fullPage: true });
    await page.evaluate(() => history.back());
    await page
      .getByRole('dialog', { name: 'Discard changes?', exact: true })
      .getByRole('button', { name: 'Discard draft', exact: true })
      .click();
    await expect(page).not.toHaveURL(/\/projects\?project=1$/);
    await expect(d).toHaveCount(0);
  } finally {
    await f.close();
  }
});
test('T032 Viewer detail and archived Admin are read-only; managed archived delete/restore through UI', async ({
  page,
  browser,
}) => {
  const f = await projectFixture(page),
    ctx = await browser.newContext();
  try {
    const made = await mutate(page, '/api/tasks', { project_id: 1, title: 'Archived task' });
    expect(made.status).toBe(201);
    const user = await mutate(page, '/api/users', {
      username: 'TaskViewer',
      display_name: 'Task Viewer',
      temp_password: password,
    });
    expect(user.status).toBe(201);
    await mutate(
      page,
      `/api/projects/1/members/${user.body.item.id}`,
      { version: 1, access: 'viewer' },
      'PUT',
    );
    const member = await ctx.newPage();
    await member.goto(f.env.APP_ORIGIN);
    await member.getByLabel('Username', { exact: true }).fill('TaskViewer');
    await member.getByLabel('Password', { exact: true }).fill(password);
    await member.getByRole('button', { name: 'Sign in', exact: true }).click();
    await member.getByLabel('Current password').fill(password);
    await member.getByLabel('New password', { exact: true }).fill('Task-viewer-new-password');
    await member.getByLabel('Confirm new password').fill('Task-viewer-new-password');
    await member.getByRole('button', { name: 'Change password', exact: true }).click();
    const jobs = await tasks(member);
    await expect(jobs.getByRole('button', { name: 'New task', exact: true })).toHaveCount(0);
    await jobs.getByRole('button', { name: 'Open task #1', exact: true }).click();
    const read = detail(member);
    await expect(read.getByLabel('Task title', { exact: true })).toHaveValue('Archived task');
    await expect(read.getByLabel('Task title', { exact: true })).toBeDisabled();
    await expect(read.getByRole('button', { name: 'Delete task', exact: true })).toHaveCount(0);
    await mutate(page, `/api/projects/1/members/${user.body.item.id}`, { version: 2 }, 'DELETE');
    await read.getByRole('button', { name: 'Review latest data', exact: true }).click();
    await expect(read).toHaveCount(0);
    const archived = await mutate(page, '/api/projects/1', { version: 3, archived: true }, 'PATCH');
    expect(archived.status).toBe(200);
    await page.getByRole('link', { name: 'All projects', exact: true }).click();
    await page.getByLabel('Include archived').check();
    await page.locator('summary[aria-label^="Project actions"]').first().click();
    await page.getByRole('button', { name: 'Tasks', exact: true }).click();
    const adminJobs = page.getByRole('region', {
      name: 'Project tasks · Task project',
      exact: true,
    });
    await expect(adminJobs.getByRole('button', { name: 'New task', exact: true })).toHaveCount(0);
    await adminJobs.getByRole('button', { name: 'Open task #1', exact: true }).click();
    const admin = detail(page);
    await expect(admin.getByLabel('Task title', { exact: true })).toBeDisabled();
    await admin.getByRole('button', { name: 'Delete task', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Confirm task deletion', exact: true })
      .getByRole('button', { name: 'Delete this task', exact: true })
      .click();
    await expect(admin).toHaveCount(0);
    await page.getByRole('link', { name: 'Trash', exact: true }).click();
    await page.getByRole('button', { name: 'Restore task #1', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Confirm task restore', exact: true })
      .getByRole('button', { name: 'Restore this task', exact: true })
      .click();
    await expect(page.getByText('Restore task #1 complete', { exact: true })).toBeVisible();
  } finally {
    await ctx.close();
    await f.close();
  }
});
