import { test, expect, type Page } from '@playwright/test';
import { projectFixture, tasks, mutate } from './task-workspace-fixtures.js';
import { fixtureDatabase } from '../setup/fixtures.js';
import { sql } from '../../src/repository/access-scope.js';
import { randomUUID } from 'node:crypto';

async function addMember(f: Awaited<ReturnType<typeof projectFixture>>) {
  const db = await fixtureDatabase(f);
  try {
    await db.transaction(async (tx) => {
      await tx.execute(
        sql(
          "INSERT INTO dbo.users(id,username,display_name,password_hash,must_change_password) SELECT 2,'draftmember','Draft Member',password_hash,0 FROM dbo.users WHERE id=1",
        ),
      );
      await tx.execute(
        sql('INSERT INTO dbo.user_view_revisions(user_id,revision) VALUES(2,@revision)', {
          revision: randomUUID(),
        }),
      );
    });
  } finally {
    await db.close();
  }
}

test('DEL-UX2 job title 409 compares latest without overwriting draft', async ({ page }) => {
  const f = await projectFixture(page);
  try {
    const created = await mutate(page, '/api/job-titles', {
      name: 'Original title',
      color: '#579bfc',
      sort_order: 0,
    });
    expect(created.status).toBe(201);
    const id = created.body.item.id;
    await page.getByRole('link', { name: 'Admin', exact: true }).click();
    await page.getByRole('tab', { name: 'Job titles', exact: true }).click();
    await page.getByRole('button', { name: 'Edit Original title', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Edit Original title', exact: true });
    await modal.getByLabel('Title name', { exact: true }).fill('Draft title');
    expect(
      (await mutate(page, `/api/job-titles/${id}`, { name: 'Latest title', version: 1 }, 'PATCH'))
        .status,
    ).toBe(200);
    await modal.getByRole('button', { name: 'Save job title', exact: true }).click();
    await modal.getByRole('button', { name: 'Load latest title', exact: true }).click();
    await expect(modal).toContainText('Latest title: Latest title');
    await expect(modal.getByLabel('Title name', { exact: true })).toHaveValue('Draft title');
    await expect(modal.getByRole('button', { name: 'Save job title', exact: true })).toBeDisabled();
    await modal
      .getByRole('checkbox', { name: 'I reviewed the latest title and my draft', exact: true })
      .check();
    expect(
      (
        await mutate(
          page,
          `/api/job-titles/${id}`,
          { name: 'Even newer title', version: 2 },
          'PATCH',
        )
      ).status,
    ).toBe(200);
    await modal.getByRole('button', { name: 'Save job title', exact: true }).click();
    await expect(
      modal.getByRole('checkbox', {
        name: 'I reviewed the latest title and my draft',
        exact: true,
      }),
    ).not.toBeChecked();
    await expect(modal).toContainText('Latest title: Even newer title');
  } finally {
    await f.close();
  }
});

test('DEL-UX2 job title dirty close and lost ack protect the same create intent', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    await page.getByRole('link', { name: 'Admin', exact: true }).click();
    await page.getByRole('tab', { name: 'Job titles', exact: true }).click();
    await page.getByRole('button', { name: 'Add job title', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Add job title', exact: true });
    await modal.getByLabel('Title name', { exact: true }).fill('Draft job title');
    await page.keyboard.press('Escape');
    await page
      .getByRole('dialog', { name: 'Discard changes?', exact: true })
      .getByRole('button', { name: 'Stay', exact: true })
      .click();
    const requests: string[] = [];
    await page.route('**/api/job-titles', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      requests.push(
        JSON.stringify({
          key: route.request().headers()['idempotency-key'],
          body: route.request().postData(),
        }),
      );
      if (requests.length === 1) {
        expect((await route.fetch()).status()).toBe(201);
        await route.abort('failed');
      } else await route.continue();
    });
    await modal.getByRole('button', { name: 'Create job title', exact: true }).click();
    await expect(modal.getByRole('alert')).toContainText('unconfirmed');
    await expect(modal.getByLabel('Title name', { exact: true })).toBeDisabled();
    await modal.getByRole('button', { name: 'Reconcile same request', exact: true }).click();
    await expect(modal).not.toBeVisible();
    expect(requests).toHaveLength(2);
    expect(requests[1]).toBe(requests[0]);
  } finally {
    await f.close();
  }
});

test('DEL-UX2 permission lost ack is unconfirmed, reconciles by read, and denial clears private data', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    await addMember(f);
    await page.getByRole('link', { name: 'Admin', exact: true }).click();
    await page.getByRole('tab', { name: 'Permissions', exact: true }).click();
    await page.getByRole('checkbox', { name: /^P-01 .* for Draft Member$/ }).check();
    let writes = 0;
    await page.route('**/api/permissions/matrix', async (route) => {
      writes++;
      expect((await route.fetch()).status()).toBe(200);
      await route.abort('failed');
    });
    await page.getByRole('button', { name: 'Review & Save 1 change(s)', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Confirm permission changes', exact: true })
      .getByRole('button', { name: 'Save 1 change(s)', exact: true })
      .click();
    await expect(page.getByRole('alert').first()).toContainText('unconfirmed');
    await expect(
      page.getByRole('checkbox', {
        name: 'I reviewed the latest permissions and my draft',
        exact: true,
      }),
    ).toBeDisabled();
    await page.getByRole('button', { name: 'Reload matrix', exact: true }).click();
    await expect(
      page.getByText('Latest permissions match the requested draft.', { exact: false }),
    ).toBeVisible();
    expect(writes).toBe(1);
    await expect(page.getByText(/^Saved permissions for/)).toHaveCount(0);
    await page.route('**/api/users?**', (route) =>
      route.fulfill({
        status: 403,
        json: { error: { code: 'FORBIDDEN', requestId: '22222222-2222-4222-8222-222222222222' } },
      }),
    );
    await page.getByRole('button', { name: 'Reload matrix', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Permission matrix', exact: true })).toHaveCount(
      0,
    );
    await expect(page.locator('.admin-center')).not.toContainText('Draft Member');
    await expect(page.getByRole('alert').first()).toContainText(
      '22222222-2222-4222-8222-222222222222',
    );
  } finally {
    await f.close();
  }
});

test('DEL-UX2 permission conflict reload retains draft and requires latest review', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    await addMember(f);
    await page.getByRole('link', { name: 'Admin', exact: true }).click();
    await page.getByRole('tab', { name: 'Permissions', exact: true }).click();
    const key = page.getByRole('checkbox', { name: /^P-01 .* for Draft Member$/ });
    await key.check();
    expect(
      (
        await mutate(
          page,
          '/api/users/2/permissions',
          { keys: ['P-10'], permissions_version: 1 },
          'PUT',
        )
      ).status,
    ).toBe(200);
    await page.getByRole('button', { name: 'Review & Save 1 change(s)', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Confirm permission changes', exact: true })
      .getByRole('button', { name: 'Save 1 change(s)', exact: true })
      .click();
    await page.getByRole('button', { name: 'Reload matrix', exact: true }).click();
    await expect(key).toBeChecked();
    await expect(page.getByText('Latest keys: P-10', { exact: false })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Review & Save 1 change(s)', exact: true }),
    ).toBeDisabled();
    await page
      .getByRole('checkbox', {
        name: 'I reviewed the latest permissions and my draft',
        exact: true,
      })
      .check();
    expect(
      (
        await mutate(
          page,
          '/api/users/2/permissions',
          { keys: ['P-09'], permissions_version: 2 },
          'PUT',
        )
      ).status,
    ).toBe(200);
    await page.getByRole('button', { name: 'Review & Save 1 change(s)', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Confirm permission changes', exact: true })
      .getByRole('button', { name: 'Save 1 change(s)', exact: true })
      .click();
    await expect(
      page.getByRole('checkbox', {
        name: 'I reviewed the latest permissions and my draft',
        exact: true,
      }),
    ).not.toBeChecked();
    await expect(key).toBeChecked();
    const latest = await page.request.get(f.env.APP_ORIGIN + '/api/users/2/permissions');
    expect((await latest.json()).keys).toEqual(['P-09']);
  } finally {
    await f.close();
  }
});

test('DEL-UX2 permission draft survives tab Stay and explicit discard leaves', async ({ page }) => {
  const f = await projectFixture(page);
  try {
    await addMember(f);
    await page.getByRole('link', { name: 'Admin', exact: true }).click();
    await page.getByRole('tab', { name: 'Permissions', exact: true }).click();
    const key = page.getByRole('checkbox', { name: /^P-01 .* for Draft Member$/ });
    await key.check();
    await page.getByRole('tab', { name: 'Teams', exact: true }).click();
    const confirmation = page.getByRole('dialog', { name: 'Discard changes?', exact: true });
    await expect(confirmation.getByRole('button', { name: 'Stay', exact: true })).toBeFocused();
    await confirmation.getByRole('button', { name: 'Stay', exact: true }).click();
    await expect(key).toBeChecked();
    await page.getByRole('tab', { name: 'Teams', exact: true }).click();
    await confirmation.getByRole('button', { name: 'Discard draft', exact: true }).click();
    await expect(page.getByRole('tabpanel', { name: 'Teams', exact: true })).toBeVisible();
  } finally {
    await f.close();
  }
});

async function editProject(page: Page) {
  await page.getByRole('link', { name: 'All projects', exact: true }).click();
  await page.locator('summary[aria-label^="Project actions"]').first().click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  return page.getByRole('dialog', { name: 'Edit Task project', exact: true });
}

test('DEL-UX2 nested team member review Cancel retains editor draft and conflict recovery stays inside modal', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    await addMember(f);
    await page.getByRole('link', { name: 'All teams', exact: true }).click();
    await page.getByRole('button', { name: 'Task team', exact: true }).click();
    await page.getByRole('tab', { name: /^Members/ }).click();
    await page.getByRole('button', { name: 'Add member', exact: true }).click();
    const editor = page.getByRole('dialog', { name: 'Add member', exact: true });
    await editor.getByLabel('Users', { exact: true }).selectOption('2');
    await editor.getByLabel('Team access', { exact: true }).selectOption('lead');
    await editor.getByRole('combobox', { name: /^Team Position/ }).selectOption('pm');
    await editor.getByRole('button', { name: 'Review & Save', exact: true }).click();
    const review = page.getByRole('dialog', { name: 'Review member changes', exact: true });
    await review.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(editor.getByLabel('Team access', { exact: true })).toHaveValue('lead');
    await expect(editor.getByRole('combobox', { name: /^Team Position/ })).toHaveValue('pm');
    await editor.getByRole('button', { name: 'Review & Save', exact: true }).click();
    expect(
      (await mutate(page, '/api/teams/1', { version: 1, description: 'Concurrent team' }, 'PATCH'))
        .status,
    ).toBe(200);
    await review.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(review.getByRole('alert')).toContainText('Data changed');
    await review.getByRole('button', { name: 'Refresh members', exact: true }).click();
    await expect(review).toContainText('Latest membership: None');
    await review
      .getByRole('checkbox', { name: 'I reviewed the latest membership and my draft', exact: true })
      .check();
    await review.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(review).not.toBeVisible();
    const team = await page.request.get(f.env.APP_ORIGIN + '/api/teams');
    const member = (await team.json()).items[0].members.find(
      (m: { user: { id: number } }) => m.user.id === 2,
    );
    expect(member.team_role).toBe('lead');
    expect(member.team_position).toBe('pm');
  } finally {
    await f.close();
  }
});

test('DEL-UX2 member lost ack and failed reconciliation preserve intent without pretending success', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    await addMember(f);
    await page.getByRole('link', { name: 'All projects', exact: true }).click();
    await page.locator('summary[aria-label^="Project actions"]').first().click();
    await page.getByRole('button', { name: 'Members', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Members Task project', exact: true });
    await modal.getByLabel('Users', { exact: true }).selectOption('2');
    await modal.getByLabel('Role', { exact: true }).selectOption('editor');
    let writes = 0;
    await page.route('**/api/projects/1/members/2', async (route) => {
      writes++;
      expect((await route.fetch()).status()).toBe(200);
      await route.abort('failed');
    });
    await modal.getByRole('button', { name: 'Set membership', exact: true }).click();
    await modal.getByRole('button', { name: 'Confirm access change', exact: true }).click();
    await expect(modal).toContainText('result is unconfirmed');
    await expect(modal.getByText('Members saved', { exact: true })).toHaveCount(0);
    await page.route('**/api/projects/1/members', (route) => route.abort('failed'));
    await modal.getByRole('button', { name: 'Refresh members', exact: true }).click();
    await expect(modal.getByRole('alert')).toContainText('Connect to continue');
    await expect(modal).toContainText('Confirm Set editor for Draft Member');
    await page.unroute('**/api/projects/1/members');
    await modal.getByRole('button', { name: 'Refresh members', exact: true }).click();
    await expect(modal).toContainText('Latest membership matches the requested draft');
    expect(writes).toBe(1);
  } finally {
    await f.close();
  }
});

test('DEL-UX2 membership dirty close stays but denied mutation clears private draft immediately', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    await addMember(f);
    await page.getByRole('link', { name: 'All projects', exact: true }).click();
    await page.locator('summary[aria-label^="Project actions"]').first().click();
    await page.getByRole('button', { name: 'Members', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Members Task project', exact: true });
    await modal.getByLabel('Users', { exact: true }).selectOption('2');
    await modal.getByLabel('Role', { exact: true }).selectOption('editor');
    await modal.getByRole('button', { name: 'Close dialog', exact: true }).click();
    const confirmation = page.getByRole('dialog', { name: 'Discard changes?', exact: true });
    await expect(confirmation.getByRole('button', { name: 'Stay', exact: true })).toBeFocused();
    await confirmation.getByRole('button', { name: 'Stay', exact: true }).click();
    await expect(modal.getByLabel('Role', { exact: true })).toHaveValue('editor');
    await page.route('**/api/projects/1/members/2', (route) =>
      route.fulfill({
        status: 403,
        json: { error: { code: 'FORBIDDEN', requestId: '11111111-1111-4111-8111-111111111111' } },
      }),
    );
    await modal.getByRole('button', { name: 'Set membership', exact: true }).click();
    await modal.getByRole('button', { name: 'Confirm access change', exact: true }).click();
    await expect(
      page.getByRole('dialog', { name: 'Member data not found', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('dialog')).not.toContainText('Draft Member');
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
      'Reference ID: 11111111-1111-4111-8111-111111111111',
    );
    expect(
      await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage })),
    ).not.toContain('Draft Member');
  } finally {
    await f.close();
  }
});

test('DEL-UX2 membership 409 keeps intended person and role until latest review', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    await addMember(f);
    await page.getByRole('link', { name: 'All projects', exact: true }).click();
    await page.locator('summary[aria-label^="Project actions"]').first().click();
    await page.getByRole('button', { name: 'Members', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Members Task project', exact: true });
    await modal.getByLabel('Users', { exact: true }).selectOption('2');
    await modal.getByLabel('Role', { exact: true }).selectOption('editor');
    expect(
      (await mutate(page, '/api/projects/1/members/2', { version: 1, access: 'viewer' }, 'PUT'))
        .status,
    ).toBe(200);
    await modal.getByRole('button', { name: 'Set membership', exact: true }).click();
    await modal.getByRole('button', { name: 'Confirm access change', exact: true }).click();
    await expect(modal.getByRole('alert')).toContainText('Data changed');
    await expect(modal).toContainText('Confirm Set editor for Draft Member');
    await modal.getByRole('button', { name: 'Refresh members', exact: true }).click();
    await expect(modal).toContainText('Latest membership: viewer');
    await expect(
      modal.getByRole('button', { name: 'Confirm access change', exact: true }),
    ).toBeDisabled();
    await modal
      .getByRole('checkbox', { name: 'I reviewed the latest membership and my draft', exact: true })
      .check();
    const refresh = page.waitForResponse(
      (r) => r.url().endsWith('/api/projects/1/members') && r.request().method() === 'GET',
    );
    expect((await mutate(page, '/api/projects/1/members/2', { version: 2 }, 'DELETE')).status).toBe(
      200,
    );
    await refresh;
    await expect(
      modal.getByRole('checkbox', {
        name: 'I reviewed the latest membership and my draft',
        exact: true,
      }),
    ).not.toBeChecked();
    await expect(modal).toContainText('Latest membership: None');
    await modal
      .getByRole('checkbox', { name: 'I reviewed the latest membership and my draft', exact: true })
      .check();
    await modal.getByRole('button', { name: 'Confirm access change', exact: true }).click();
    await expect(modal).toContainText('Members saved');
    const latest = await page.request.get(f.env.APP_ORIGIN + '/api/projects/1/members');
    expect(
      (await latest.json()).items.find((m: { user: { id: number } }) => m.user.id === 2)
        .explicit_access,
    ).toBe('editor');
  } finally {
    await f.close();
  }
});

test('DEL-UX2 entity create lost ack disables changes and replays the identical intent', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    await page.getByRole('link', { name: 'All projects', exact: true }).click();
    await page.getByRole('button', { name: 'Create project', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Create project', exact: true });
    await modal.getByLabel('Project Name', { exact: true }).fill('Lost ack project');
    await modal.getByLabel('Owner team', { exact: true }).selectOption('1');
    const requests: { key: string | undefined; body: string | null }[] = [];
    await page.route('**/api/projects', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      requests.push({
        key: route.request().headers()['idempotency-key'],
        body: route.request().postData(),
      });
      if (requests.length === 1) {
        expect((await route.fetch()).status()).toBe(201);
        await route.abort('failed');
      } else await route.continue();
    });
    await modal.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(modal).toContainText('Result is unconfirmed');
    await expect(modal.getByLabel('Project Name', { exact: true })).toBeDisabled();
    await modal.getByRole('button', { name: 'Reconcile same request', exact: true }).click();
    await expect(modal).not.toBeVisible();
    expect(requests).toHaveLength(2);
    expect(requests[1]).toEqual(requests[0]);
    const latest = await page.request.get(f.env.APP_ORIGIN + '/api/projects');
    expect(
      (await latest.json()).items.filter((p: { name: string }) => p.name === 'Lost ack project'),
    ).toHaveLength(1);
  } finally {
    await f.close();
  }
});

test('DEL-UX2 entity 409 preserves draft and newer latest invalidates reviewed version', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    await editProject(page);
    const modal = page.locator('dialog.project-details-dialog');
    await modal.getByLabel('Project Name', { exact: true }).fill('My private draft');
    expect(
      (
        await mutate(
          page,
          '/api/projects/1',
          { version: 1, description: 'Concurrent latest one' },
          'PATCH',
        )
      ).status,
    ).toBe(200);
    await modal.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(modal.getByRole('alert')).toContainText('Data changed');
    await expect(modal.getByLabel('Project Name', { exact: true })).toHaveValue('My private draft');
    await modal.getByRole('button', { name: 'Load latest and review', exact: true }).click();
    await expect(modal).toContainText('Concurrent latest one');
    const reviewed = modal.getByRole('checkbox', {
      name: 'I have reviewed the latest data and my draft',
      exact: true,
    });
    await reviewed.check();
    expect(
      (
        await mutate(
          page,
          '/api/projects/1',
          { version: 2, description: 'Concurrent latest two' },
          'PATCH',
        )
      ).status,
    ).toBe(200);
    await modal.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(reviewed).not.toBeChecked();
    await expect(modal).toContainText('Concurrent latest two');
    await expect(modal.getByLabel('Project Name', { exact: true })).toHaveValue('My private draft');
    const current = await page.request.get(f.env.APP_ORIGIN + '/api/projects');
    expect((await current.json()).items[0].name).toBe('Task project');
  } finally {
    await f.close();
  }
});

for (const deniedStatus of [403, 404]) {
  test(`DEL-UX2 group latest read ${deniedStatus} clears private draft immediately`, async ({ page }) => {
    const f = await projectFixture(page);
    try {
      const group = await mutate(page, '/api/projects/1/groups', { name: 'Private original group', color: '#579bfc' });
      expect(group.status).toBe(201);
      const id = group.body.item.id;
      await mutate(page, '/api/tasks', { project_id: 1, title: 'Grouped task', group_id: id });
      await tasks(page);
      await page.getByRole('button', { name: 'Edit group Private original group', exact: true }).click();
      const modal = page.getByRole('dialog', { name: 'Edit group', exact: true });
      await modal.getByLabel('New group name').fill('Sensitive revoked draft');
      expect((await mutate(page, `/api/groups/${id}`, { version: 1, name: 'Concurrent group' }, 'PATCH')).status).toBe(200);
      await modal.getByRole('button', { name: 'Save group', exact: true }).click();
      await expect(modal.getByRole('button', { name: 'Load latest group', exact: true })).toBeVisible();
      const requestId = '33333333-3333-4333-8333-333333333333';
      await page.route('**/api/projects/1/groups', async (route) => {
        if (route.request().method() === 'GET')
          await route.fulfill({ status: deniedStatus, json: { error: { code: deniedStatus === 403 ? 'FORBIDDEN' : 'NOT_FOUND', requestId } } });
        else await route.continue();
      });
      await modal.getByRole('button', { name: 'Load latest group', exact: true }).click();
      await expect(modal).toHaveCount(0);
      await expect(page.getByLabel('New group name', { exact: true })).toHaveCount(0);
      await expect(page.getByText('Sensitive revoked draft', { exact: false })).toHaveCount(0);
      await expect(page.getByText('Latest group:', { exact: false })).toHaveCount(0);
      const alert = page.getByRole('alert').filter({ hasText: requestId });
      await expect(alert).toBeVisible();
      await expect(alert).toContainText(deniedStatus === 403 ? 'You do not have permission for this action' : 'not found');
      if (deniedStatus === 403) {
        await page.getByRole('button', { name: 'Dismiss access notice', exact: true }).click();
        await expect(alert).toHaveCount(0);
      }
    } finally {
      await f.close();
    }
  });
}

test('DEL-UX2 group conflict compares latest and invalidates approval on newer version', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    const group = await mutate(page, '/api/projects/1/groups', {
      name: 'Original group',
      color: '#579bfc',
    });
    expect(group.status).toBe(201);
    const id = group.body.item.id;
    await mutate(page, '/api/tasks', { project_id: 1, title: 'Grouped task', group_id: id });
    await tasks(page);
    await page.getByRole('button', { name: 'Edit group Original group', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Edit group', exact: true });
    await modal.getByLabel('New group name').fill('My group draft');
    expect(
      (await mutate(page, `/api/groups/${id}`, { version: 1, name: 'Other group one' }, 'PATCH'))
        .status,
    ).toBe(200);
    await modal.getByRole('button', { name: 'Save group', exact: true }).click();
    await modal.getByRole('button', { name: 'Load latest group', exact: true }).click();
    await expect(modal).toContainText('Latest group: Other group one');
    await expect(modal.getByLabel('New group name')).toHaveValue('My group draft');
    const review = modal.getByRole('checkbox', {
      name: 'I reviewed the latest group and my draft',
      exact: true,
    });
    await review.check();
    expect(
      (await mutate(page, `/api/groups/${id}`, { version: 2, name: 'Other group two' }, 'PATCH'))
        .status,
    ).toBe(200);
    await modal.getByRole('button', { name: 'Save group', exact: true }).click();
    await expect(review).not.toBeChecked();
    await expect(modal).toContainText('Latest group: Other group two');
    const latest = await page.request.get(f.env.APP_ORIGIN + '/api/projects/1/groups');
    expect((await latest.json()).items[0].name).toBe('Other group two');
    // A reviewed edit also keeps its original version/key after the server commits but drops ack.
    await review.check();
    const requests: string[] = [];
    await page.route(`**/api/groups/${id}`, async (route) => {
      requests.push(
        JSON.stringify({
          key: route.request().headers()['idempotency-key'],
          body: route.request().postData(),
        }),
      );
      if (requests.length === 1) {
        expect((await route.fetch()).status()).toBe(200);
        await route.abort('failed');
      } else await route.continue();
    });
    await modal.getByRole('button', { name: 'Save group', exact: true }).click();
    await expect(modal.getByRole('alert')).toContainText('unconfirmed');
    await modal.getByRole('button', { name: 'Reconcile same request', exact: true }).click();
    await expect(modal).not.toBeVisible();
    expect(requests).toHaveLength(2);
    expect(requests[1]).toBe(requests[0]);
  } finally {
    await f.close();
  }
});

test('DEL-UX2 group lost acknowledgement locks intent, persists error through refresh and reconciles once', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    await tasks(page);
    await page.getByRole('button', { name: 'Add new group', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'New Group', exact: true });
    await modal.getByLabel('New group name').fill('Lost ack group');
    const requests: { key: string | undefined; body: string | null }[] = [];
    await page.route('**/api/projects/1/groups', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      requests.push({
        key: route.request().headers()['idempotency-key'],
        body: route.request().postData(),
      });
      if (requests.length === 1) {
        const response = await route.fetch();
        expect(response.status()).toBe(201);
        await route.abort('failed');
      } else await route.continue();
    });
    await modal.getByRole('button', { name: '+ New group', exact: true }).click();
    await expect(modal.getByRole('alert')).toContainText('unconfirmed');
    await expect(modal.getByLabel('New group name')).toBeDisabled();
    await page.waitForResponse(
      (r) => r.url().includes('/api/tasks?') && r.request().method() === 'GET',
    );
    await expect(modal.getByRole('alert')).toContainText('unconfirmed');
    await modal.getByRole('button', { name: 'Reconcile same request', exact: true }).click();
    await expect(modal).not.toBeVisible();
    expect(requests).toHaveLength(2);
    expect(requests[1]).toEqual(requests[0]);
    expect(requests[0]!.key).toBeTruthy();
    const groups = await page.request.get(f.env.APP_ORIGIN + '/api/projects/1/groups');
    expect(
      (await groups.json()).items.filter((g: { name: string }) => g.name === 'Lost ack group'),
    ).toHaveLength(1);
  } finally {
    await f.close();
  }
});

test('DEL-UX2 group dirty Escape and close default to Stay before explicit discard', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    await tasks(page);
    await page.getByRole('button', { name: 'Add new group', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'New Group', exact: true });
    await modal.getByLabel('New group name').fill('กลุ่มร่าง');
    await modal.click({ position: { x: 1, y: 1 } });
    await page.keyboard.press('Escape');
    const confirmation = page.getByRole('dialog', { name: 'Discard changes?', exact: true });
    await expect(confirmation.getByRole('button', { name: 'Stay', exact: true })).toBeFocused();
    await confirmation.getByRole('button', { name: 'Stay', exact: true }).click();
    await expect(modal.getByLabel('New group name')).toHaveValue('กลุ่มร่าง');
    await modal.getByRole('button', { name: 'Close dialog', exact: true }).click();
    await confirmation.getByRole('button', { name: 'Discard draft', exact: true }).click();
    await expect(modal).not.toBeVisible();
  } finally {
    await f.close();
  }
});

for (const width of [360, 390, 768, 1440]) {
  test(`DEL-UX2 ${width}px entity backdrop, route and reload keep Stay safe`, async ({ page }) => {
    const f = await projectFixture(page);
    try {
      await page.setViewportSize({ width, height: 900 });
      // Open via desktop fixture navigation before reducing the mobile shell.
      if (width < 768)
        await page.getByRole('button', { name: 'Toggle navigation', exact: true }).click();
      const modal = await editProject(page);
      const name = modal.getByLabel('Project Name', { exact: true });
      await name.fill('ร่างภาษาไทย🙂 ไม่บันทึก');
      const rect = await modal.boundingBox();
      expect(rect).toBeTruthy();
      await page.mouse.click(rect!.x > 4 ? rect!.x - 2 : 1, 1);
      const confirm = page.getByRole('dialog', { name: 'Discard changes?', exact: true });
      await expect(confirm.getByRole('button', { name: 'Stay', exact: true })).toBeFocused();
      if (process.env.DEL_UX2_EVIDENCE) {
        await confirm.evaluate(async (el) => { await Promise.all(el.getAnimations().map((a) => a.finished)); });
        await page.screenshot({ path: `${process.env.DEL_UX2_EVIDENCE}/discard-${width}.png` });
      }
      await confirm.getByRole('button', { name: 'Stay', exact: true }).click();
      await expect(name).toHaveValue('ร่างภาษาไทย🙂 ไม่บันทึก');
      const url = page.url();
      await page.evaluate(() => history.back());
      await expect(confirm.getByRole('button', { name: 'Stay', exact: true })).toBeFocused();
      await confirm.getByRole('button', { name: 'Stay', exact: true }).click();
      expect(page.url()).toBe(url);
      expect(
        await page.evaluate(() => {
          const event = new Event('beforeunload', { cancelable: true });
          window.dispatchEvent(event);
          return event.defaultPrevented;
        }),
      ).toBe(true);
      expect(
        await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage })),
      ).not.toContain('ร่างภาษาไทย');
      if (process.env.DEL_UX2_EVIDENCE)
        await page.screenshot({ path: `${process.env.DEL_UX2_EVIDENCE}/draft-${width}.png` });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
      ).toBeLessThanOrEqual(1);
      await page.evaluate(() => history.back());
      await confirm.getByRole('button', { name: 'Discard draft', exact: true }).click();
      await expect(modal).not.toBeVisible();
    } finally {
      await f.close();
    }
  });
}

test('DEL-UX2 denied entity and group mutations clear private draft rather than retaining it', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    const entity = await editProject(page);
    await entity.getByLabel('Project Name', { exact: true }).fill('Sensitive revoked entity draft');
    await page.route('**/api/projects/1', (route) =>
      route.fulfill({ status: 403, json: { error: { code: 'FORBIDDEN' } } }),
    );
    await entity.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(entity).not.toBeVisible();
    await expect(page.locator('body')).not.toContainText('Sensitive revoked entity draft');
    const denied = page.getByRole('dialog', { name: 'Access no longer available', exact: true });
    await expect(denied.getByRole('alert')).toContainText('Private draft cleared');
    await denied.getByRole('button', { name: 'Close dialog', exact: true }).click();
    await page.unroute('**/api/projects/1');
    await tasks(page);
    await page.getByRole('button', { name: 'Add new group', exact: true }).click();
    const group = page.getByRole('dialog', { name: 'New Group', exact: true });
    await group.getByLabel('New group name').fill('Sensitive revoked group draft');
    await page.route('**/api/projects/1/groups', (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({ status: 403, json: { error: { code: 'FORBIDDEN' } } })
        : route.continue(),
    );
    await group.getByRole('button', { name: '+ New group', exact: true }).click();
    await expect(group).not.toBeVisible();
    await expect(page.locator('body')).not.toContainText('Sensitive revoked group draft');
    expect(
      await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage })),
    ).not.toContain('Sensitive revoked');
  } finally {
    await f.close();
  }
});

test('DEL-UX2 offline and maintenance disable writes without losing entity draft', async ({
  page,
  context,
}) => {
  const f = await projectFixture(page);
  try {
    const modal = await editProject(page);
    await modal.getByLabel('Project Name', { exact: true }).fill('Unavailable draft');
    await context.setOffline(true);
    await expect(modal.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
    await expect(modal.getByLabel('Project Name', { exact: true })).toHaveValue(
      'Unavailable draft',
    );
    await context.setOffline(false);
    // Reconnect deliberately revalidates /me and all readers (10 s deadline + retry).
    await expect(modal.getByRole('button', { name: 'Save', exact: true })).toBeEnabled({
      timeout: 20000,
    });
    await f.freeze();
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(modal.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
    await expect(modal.getByLabel('Project Name', { exact: true })).toHaveValue(
      'Unavailable draft',
    );
  } finally {
    await f.close();
  }
});

test('DEL-UX2 dirty entity Escape defaults to Stay and requires explicit Discard', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    const modal = await editProject(page);
    await modal.getByLabel('Project Name', { exact: true }).fill('ร่างที่ยังไม่บันทึก');
    await page.keyboard.press('Escape');
    const confirmation = page.getByRole('dialog', { name: 'Discard changes?', exact: true });
    await expect(confirmation.getByRole('button', { name: 'Stay', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(modal.getByLabel('Project Name', { exact: true })).toHaveValue(
      'ร่างที่ยังไม่บันทึก',
    );
    await modal.getByRole('button', { name: 'Cancel', exact: true }).click();
    await confirmation.getByRole('button', { name: 'Discard draft', exact: true }).click();
    await expect(modal).not.toBeVisible();
  } finally {
    await f.close();
  }
});
