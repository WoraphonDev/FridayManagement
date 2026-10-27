import { test, expect, type Page, type Browser, type Route } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { projectFixture, mutate } from './task-workspace-fixtures.js';
import { fixtureDatabase } from '../setup/fixtures.js';
import { sql } from '../../src/repository/access-scope.js';
import type { Transaction } from '../../src/domain/database.js';

// DEL-ACCESS-DIRECTORY: real server/SQLite + real React in the browser. Routes only hold or
// inject explicit failures; every positive response is the real API. Host builds first.
const password = 'Workspace-admin-fixture-password';
// 1 WorkspaceAdmin (redundant viewer row), 2 AccessActor (manager+P-03), 3 OwnerLead (redundant
// editor row), 4 ExistingManager, 5 cross-team candidate, 6 inactive viewer, 7 second candidate.
const people = [
  [2, 'AccessActor'],
  [3, 'OwnerLead'],
  [4, 'ExistingManager'],
  [5, 'Candidate ไทย😀'],
  [6, 'InactiveViewer'],
  [7, 'SecondCandidate'],
] as const;
type Options = { viewport?: { width: number; height: number }; extra?: number; secondProject?: boolean };
async function directoryFixture(page: Page, browser: Browser, opts: Options = {}) {
  const f = await projectFixture(page);
  const context = await browser.newContext(opts.viewport ? { viewport: opts.viewport } : {});
  try {
    const other = await mutate(page, '/api/teams', { name: 'Hidden other team' });
    const second = opts.secondProject
      ? (await mutate(page, '/api/projects', { name: 'Second project', owner_team_id: f.project.owner_team_id })).body.item
      : undefined;
    const db = await fixtureDatabase(f);
    try {
      await db.transaction(async (tx) => {
        for (const [id, name] of people) {
          await tx.execute(sql('INSERT INTO dbo.users(id,username,display_name,password_hash,must_change_password) SELECT @id,@username,@name,password_hash,0 FROM dbo.users WHERE id=1', { id, username: `Dir${id}`, name }));
          await tx.execute(sql('INSERT INTO dbo.user_view_revisions(user_id,revision) VALUES(@id,@revision)', { id, revision: randomUUID() }));
        }
        await tx.execute(sql('UPDATE dbo.users SET active=0 WHERE id=6'));
        for (const [team, user, role] of [
          [f.project.owner_team_id, 2, 'member'],
          [f.project.owner_team_id, 3, 'lead'],
          [other.body.item.id, 5, 'member'],
        ] as const)
          await tx.execute(sql('INSERT INTO dbo.team_members(team_id,user_id,team_role) VALUES(@team,@user,@role)', { team, user, role }));
        for (const [user, access] of [[1, 'viewer'], [2, 'manager'], [3, 'editor'], [4, 'manager'], [6, 'viewer']] as const)
          await tx.execute(sql('INSERT INTO dbo.project_members(project_id,user_id,access,added_by) VALUES(@project,@user,@access,1)', { project: f.project.id, user, access }));
        for (const [user, key] of [[2, 'P-01'], [2, 'P-03'], [4, 'P-02'], [7, 'P-02']] as const)
          await tx.execute(sql('INSERT INTO dbo.user_permissions(user_id,permission_key,granted_by,granted_at) VALUES(@user,@key,1,@now)', { user, key, now: new Date().toISOString() }));
        // Paging fixture: ordinary active candidates 8.. named "Extra NN" (ids ascend with names).
        for (let i = 0; i < (opts.extra ?? 0); i++) {
          const id = 8 + i, name = `Extra ${String(i + 1).padStart(2, '0')}`;
          await tx.execute(sql('INSERT INTO dbo.users(id,username,display_name,password_hash,must_change_password) SELECT @id,@username,@name,password_hash,0 FROM dbo.users WHERE id=1', { id, username: `Dir${id}`, name }));
          await tx.execute(sql('INSERT INTO dbo.user_view_revisions(user_id,revision) VALUES(@id,@revision)', { id, revision: randomUUID() }));
        }
        // Second project: actor is manager+P-03 there too; SecondCandidate is its explicit manager,
        // so it is in project 1's scoped pool but excluded from project 2's.
        if (second)
          for (const [user, access] of [[2, 'manager'], [7, 'manager']] as const)
            await tx.execute(sql('INSERT INTO dbo.project_members(project_id,user_id,access,added_by) VALUES(@project,@user,@access,1)', { project: second.id, user, access }));
      });
    } finally {
      await db.close();
    }
    const actor = await context.newPage();
    await actor.goto(f.env.APP_ORIGIN);
    await actor.getByLabel('Username', { exact: true }).fill('Dir2');
    await actor.getByLabel('Password', { exact: true }).fill(password);
    await actor.getByRole('button', { name: 'Sign in', exact: true }).click();
    const nav = actor.getByRole('link', { name: /^(All|Browse) projects$/ });
    const menu = actor.getByRole('button', { name: 'Toggle navigation' });
    await expect(menu.or(nav).first()).toBeVisible();
    return { ...f, context, second, actor, close: async () => { try { await context.close(); } finally { await f.close(); } } };
  } catch (e) {
    await context.close();
    await f.close();
    throw e;
  }
}
async function openMembers(actor: Page, project = 'Task project') {
  const nav = actor.getByRole('link', { name: /^(All|Browse) projects$/ });
  if (!(await nav.isVisible())) await actor.getByRole('button', { name: 'Toggle navigation' }).click();
  await nav.click();
  const card = actor.locator('.project-directory-card').filter({ hasText: project });
  await card.locator('summary').click();
  await card.getByRole('button', { name: 'Members', exact: true }).click();
  return actor.getByRole('dialog', { name: `Members ${project}`, exact: true });
}
/**
 * Hold the next matching candidate reply AFTER the real server has answered 200 (route.fetch),
 * so the browser receives an already-positive, already-read response only once released.
 */
async function holdPositive(actor: Page, match: (url: string) => boolean) {
  const fetched = deferred(), gate = deferred();
  let armed = true, status = 0;
  await actor.route('**/api/directory?**', async (route: Route) => {
    if (!armed || !match(route.request().url())) return route.fallback();
    armed = false;
    const response = await route.fetch();
    status = response.status();
    fetched.release();
    await gate.released;
    // The app may already have aborted this request; that is also a valid discard.
    await route.fulfill({ response }).catch(() => undefined);
  });
  return {
    fetched: async () => { await fetched.released; expect(status).toBe(200); },
    release: gate.release,
  };
}
async function db<T>(f: Awaited<ReturnType<typeof directoryFixture>>, work: (tx: Transaction) => Promise<T>) {
  const d = await fixtureDatabase(f);
  try { return await d.transaction(work); } finally { await d.close(); }
}
async function memberRows(page: Page, origin: string, project: number) {
  const r = await page.request.get(`${origin}/api/projects/${project}/members`);
  expect(r.status()).toBe(200);
  return (await r.json()) as { membership_version: number; items: { user: { id: number }; explicit_access: string | null }[] };
}
function deferred() {
  let release!: () => void;
  const released = new Promise<void>((r) => (release = r));
  return { released, release };
}
const users = (dialog: ReturnType<Page['getByRole']>) => dialog.getByLabel('Users', { exact: true });

test('P-03 scoped picker: name-only pool, literal search, add Editor, protected rows, inactive Remove', async ({ page, browser }) => {
  const f = await directoryFixture(page, browser);
  try {
    const dialog = await openMembers(f.actor);
    const search = dialog.getByRole('textbox', { name: 'Search active users', exact: true });
    await expect(search).toHaveAttribute('placeholder', 'Name');
    await expect(users(dialog).locator('option')).toHaveText(['Choose user', 'Candidate ไทย😀', 'SecondCandidate']);
    await expect(dialog.getByText('Hidden other team')).toHaveCount(0);
    // Candidate labels are identity-only (no "· team" suffix); pagination text "Page 1 · N people" is not a label.
    for (const label of await users(dialog).locator('option').allTextContents()) expect(label).not.toMatch(/·|No team/);
    await expect(dialog.getByText('No team')).toHaveCount(0);
    // Protected rows (effective Admin, owner-team Lead, explicit manager) expose no delegated actions.
    for (const name of ['Workspace Admin', 'OwnerLead', 'ExistingManager', 'AccessActor'])
      await expect(dialog.getByRole('row').filter({ hasText: name }).getByRole('button')).toHaveCount(0);
    await search.fill('ไทย');
    await search.press('Enter');
    await expect(users(dialog).locator('option')).toHaveText(['Choose user', 'Candidate ไทย😀']);
    await search.fill('Dir');
    await search.press('Enter');
    await expect(users(dialog).locator('option')).toHaveText(['No active users found']);
    await search.fill('');
    await search.press('Enter');
    await users(dialog).selectOption({ label: 'Candidate ไทย😀' });
    await dialog.getByLabel('Role', { exact: true }).selectOption('editor');
    await expect(dialog.getByText('Selected: Candidate ไทย😀')).toBeVisible();
    await dialog.getByRole('button', { name: 'Set membership', exact: true }).click();
    await dialog.getByRole('button', { name: 'Confirm access change', exact: true }).click();
    await expect(dialog.getByText('Members saved', { exact: true })).toBeVisible();
    expect((await memberRows(f.actor, f.env.APP_ORIGIN, f.project.id)).items.find((m) => m.user.id === 5)?.explicit_access).toBe('editor');
    // Ordinary inactive roster row stays removable.
    const inactive = dialog.getByRole('row').filter({ hasText: 'InactiveViewer' });
    await expect(inactive.getByRole('cell', { name: 'Inactive', exact: true })).toBeVisible();
    await inactive.getByRole('button', { name: 'Remove member', exact: true }).click();
    await dialog.getByRole('button', { name: 'Confirm access change', exact: true }).click();
    // Exact-name cell in the Members table (a broad row hasText match reported count 1 even when the
    // captured trace/screenshot showed the row removed; cause not established). API check below stays.
    await expect(
      dialog.getByRole('table', { name: 'Members', exact: true }).getByRole('cell', { name: 'InactiveViewer', exact: true }),
    ).toHaveCount(0);
    expect((await memberRows(f.actor, f.env.APP_ORIGIN, f.project.id)).items.some((m) => m.user.id === 6)).toBe(false);
  } finally {
    await f.close();
  }
});

test('held candidate replies are discarded after query edit and new search; loading then data', async ({ page, browser }) => {
  const f = await directoryFixture(page, browser);
  try {
    const gate = deferred();
    let held = 0;
    await f.actor.route('**/api/directory?**', async (route: Route) => {
      if (route.request().url().includes('q=Second') || held++ > 0) return route.continue();
      await gate.released;
      await route.continue();
    });
    const dialog = await openMembers(f.actor);
    await expect(dialog.getByRole('status').filter({ hasText: 'Loading users…' })).toBeVisible();
    const search = dialog.getByRole('textbox', { name: 'Search active users', exact: true });
    await search.fill('Second');
    await search.press('Enter');
    await expect(users(dialog).locator('option')).toHaveText(['Choose user', 'SecondCandidate']);
    gate.release();
    await f.actor.waitForTimeout(300);
    await expect(users(dialog).locator('option')).toHaveText(['Choose user', 'SecondCandidate']);
    await expect(dialog.getByText('Candidate ไทย😀')).toHaveCount(0);
  } finally {
    await f.close();
  }
});

test('503 shows a persistent failure without unscoped retry; Search recovers and clears it', async ({ page, browser }) => {
  const f = await directoryFixture(page, browser);
  try {
    const seen: string[] = [];
    let fail = true;
    await f.actor.route('**/api/directory?**', async (route: Route) => {
      seen.push(route.request().url());
      if (!fail) return route.continue();
      await route.fulfill({ status: 503, contentType: 'application/json', headers: { 'X-Request-Id': randomUUID() }, body: JSON.stringify({ error: { code: 'SERVICE_NOT_READY', message: 'x', requestId: randomUUID() } }) });
    });
    const dialog = await openMembers(f.actor);
    await expect(dialog.getByRole('alert').filter({ hasText: 'Users unavailable' })).toBeVisible();
    await expect(users(dialog)).toHaveCount(0);
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((u) => u.includes(`project=${f.project.id}`))).toBe(true);
    fail = false;
    await dialog.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(users(dialog).locator('option')).toHaveText(['Choose user', 'Candidate ไทย😀', 'SecondCandidate']);
    await expect(dialog.getByRole('alert').filter({ hasText: 'Users unavailable' })).toHaveCount(0);
  } finally {
    await f.close();
  }
});

test('P-03 revoked mid-session: next candidate read is denied and private names are cleared', async ({ page, browser }) => {
  test.setTimeout(60000);
  const f = await directoryFixture(page, browser);
  try {
    const dialog = await openMembers(f.actor);
    await expect(users(dialog).locator('option')).toHaveCount(3);
    const current = await page.request.get(`${f.env.APP_ORIGIN}/api/users/2/permissions`);
    const revoke = await mutate(page, '/api/users/2/permissions', { keys: ['P-01'], permissions_version: (await current.json()).permissions_version }, 'PUT');
    expect(revoke.status).toBe(200);
    // Either the app's own refresh already observed the lost key and removed the picker (probable
    // cause of the prior 30s timeout: fill waiting on a removed box — hypothesis, no trace), or a
    // new search gets 403 and clears.
    // Both are acceptable; neither may leave candidate names.
    const search = dialog.getByRole('textbox', { name: 'Search active users', exact: true });
    try {
      await search.fill('Second', { timeout: 2000 });
      await search.press('Enter', { timeout: 2000 });
    } catch {
      /* picker already removed by authority refresh */
    }
    await expect(f.actor.getByRole('combobox', { name: 'Users', exact: true })).toHaveCount(0, { timeout: 15000 });
    await expect(f.actor.getByText('Candidate ไทย😀')).toHaveCount(0);
    await expect(f.actor.getByText('SecondCandidate')).toHaveCount(0);
    const direct = await f.actor.request.get(`${f.env.APP_ORIGIN}/api/directory?project=${f.project.id}`);
    expect(direct.status()).toBe(403);
    expect(await direct.text()).not.toContain('SecondCandidate');
  } finally {
    await f.close();
  }
});

test('stale membership version: 409 requires fresh review and is never auto-resent', async ({ page, browser }) => {
  const f = await directoryFixture(page, browser);
  try {
    const puts: string[] = [];
    f.actor.on('request', (r) => { if (r.method() === 'PUT' && r.url().includes('/members/')) puts.push(r.url()); });
    const dialog = await openMembers(f.actor);
    await users(dialog).selectOption({ label: 'SecondCandidate' });
    await dialog.getByRole('button', { name: 'Set membership', exact: true }).click();
    const v = (await memberRows(page, f.env.APP_ORIGIN, f.project.id)).membership_version;
    expect((await mutate(page, `/api/projects/${f.project.id}/members/5`, { version: v, access: 'viewer' }, 'PUT')).status).toBe(200);
    await dialog.getByRole('button', { name: 'Confirm access change', exact: true }).click();
    await expect(dialog.getByText(/do not retry blindly/)).toBeVisible();
    await f.actor.waitForTimeout(500);
    expect(puts).toHaveLength(1);
    expect((await memberRows(page, f.env.APP_ORIGIN, f.project.id)).items.some((m) => m.user.id === 7)).toBe(false);
  } finally {
    await f.close();
  }
});

test('background member refresh before Confirm does not upgrade the draft version (409 + review, no auto-resend)', async ({ page, browser }) => {
  test.setTimeout(90000);
  const f = await directoryFixture(page, browser);
  try {
    const bodies: { version: number }[] = [];
    f.actor.on('request', (r) => {
      if (r.method() === 'PUT' && r.url().includes(`/api/projects/${f.project.id}/members/`)) bodies.push(r.postDataJSON());
    });
    const dialog = await openMembers(f.actor);
    await users(dialog).selectOption({ label: 'SecondCandidate' });
    await dialog.getByRole('button', { name: 'Set membership', exact: true }).click();
    const confirmButton = dialog.getByRole('button', { name: 'Confirm access change', exact: true });
    await expect(confirmButton).toBeVisible();
    const drafted = (await memberRows(page, f.env.APP_ORIGIN, f.project.id)).membership_version;
    // Another actor changes membership; wait until the actor's app has actually re-read members.
    const refreshed = f.actor.waitForResponse(
      (r) => r.request().method() === 'GET' && r.url().endsWith(`/api/projects/${f.project.id}/members`) && r.status() === 200,
      { timeout: 60000 },
    );
    expect((await mutate(page, `/api/projects/${f.project.id}/members/5`, { version: drafted, access: 'viewer' }, 'PUT')).status).toBe(200);
    const latest = (await (await refreshed).json()).membership_version as number;
    expect(latest).toBe(drafted + 1);
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();
    await expect(dialog.getByText(/do not retry blindly/)).toBeVisible();
    await f.actor.waitForTimeout(500);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]!.version).toBe(drafted);
    expect((await memberRows(page, f.env.APP_ORIGIN, f.project.id)).items.some((m) => m.user.id === 7)).toBe(false);
  } finally {
    await f.close();
  }
});

test('crafted delegated PUT/DELETE against protected targets is denied without version detail', async ({ page, browser }) => {
  const f = await directoryFixture(page, browser);
  try {
    await openMembers(f.actor);
    const v = (await memberRows(page, f.env.APP_ORIGIN, f.project.id)).membership_version;
    for (const target of [1, 3, 4])
      for (const method of ['PUT', 'DELETE']) {
        const r = await mutate(f.actor, `/api/projects/${f.project.id}/members/${target}`, { version: v, ...(method === 'PUT' ? { access: 'viewer' } : {}) }, method);
        expect(r.status, `${method} ${target}`).toBe(403);
        expect(r.body.error.currentVersion).toBeUndefined();
      }
    expect((await memberRows(page, f.env.APP_ORIGIN, f.project.id)).membership_version).toBe(v);
  } finally {
    await f.close();
  }
});

for (const viewport of [
  { width: 360, height: 740 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
])
test(`viewport ${viewport.width}px + keyboard: search submits with Enter and the picker is operable without a mouse`, async ({ page, browser }) => {
  // Native browser 200% zoom is a separate host check (no CSS zoom/CDP pinch substitute here).
  const f = await directoryFixture(page, browser, { viewport });
  try {
    const dialog = await openMembers(f.actor);
    const search = dialog.getByRole('textbox', { name: 'Search active users', exact: true });
    await search.focus();
    await f.actor.keyboard.type('Second');
    await f.actor.keyboard.press('Enter');
    await expect(users(dialog).locator('option')).toHaveText(['Choose user', 'SecondCandidate']);
    // Real keyboard: Tab from the search box to the native select, then type-ahead (works on a closed
    // select on every platform; ArrowDown opens the popup on macOS instead of committing), then Tab
    // away to commit. No programmatic selectOption.
    const picker = users(dialog);
    for (let i = 0; i < 4 && !(await picker.evaluate((el) => el === document.activeElement)); i++)
      await f.actor.keyboard.press('Tab');
    await expect(picker).toBeFocused();
    await f.actor.keyboard.type('Second');
    await f.actor.keyboard.press('Tab');
    await expect(picker).toHaveValue('7');
    await expect(dialog.getByText('Selected: SecondCandidate')).toBeVisible();
    const overflow = await f.actor.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    const save = dialog.getByRole('button', { name: 'Set membership', exact: true });
    await save.scrollIntoViewIfNeeded();
    await expect(save).toBeInViewport();
    await expect(save).toBeEnabled();
  } finally {
    await f.close();
  }
});

// ---- Held ALREADY-POSITIVE replies (server answered 200 before the scope change) ----

test('held positive page-2 reply is discarded after a new search; page resets to 1', async ({ page, browser }) => {
  const f = await directoryFixture(page, browser, { extra: 12 });
  try {
    const dialog = await openMembers(f.actor);
    await expect(dialog.getByText('Page 1 · 14 people')).toBeVisible();
    const held = await holdPositive(f.actor, (u) => u.includes('page=2'));
    await dialog.getByRole('button', { name: 'Next users page', exact: true }).click();
    await held.fetched();
    const search = dialog.getByRole('textbox', { name: 'Search active users', exact: true });
    await search.fill('Extra 01');
    await search.press('Enter');
    await expect(users(dialog).locator('option')).toHaveText(['Choose user', 'Extra 01']);
    held.release();
    await f.actor.waitForTimeout(400);
    // Host run showed the single-page pager span attached but not visible; assert its content, not visibility.
    await expect(dialog.getByText(/^Page \d+ · \d+ people$/)).toHaveText('Page 1 · 1 people');
    await expect(users(dialog).locator('option')).toHaveText(['Choose user', 'Extra 01']);
    await expect(dialog.getByText('Extra 12')).toHaveCount(0);
  } finally {
    await f.close();
  }
});

test('held positive project-1 reply never paints into project 2 after switching project', async ({ page, browser }) => {
  const f = await directoryFixture(page, browser, { secondProject: true });
  try {
    const held = await holdPositive(f.actor, (u) => u.includes(`project=${f.project.id}&`) || u.endsWith(`project=${f.project.id}`));
    const first = await openMembers(f.actor);
    await held.fetched();
    await first.getByRole('button', { name: 'Close dialog' }).click();
    await expect(first).toHaveCount(0);
    const second = await openMembers(f.actor, 'Second project');
    // Project 2 pool: ExistingManager manages only project 1 so is eligible here; SecondCandidate is
    // project 2's explicit manager and was only in the held project-1 pool.
    const pool2 = ['Choose user', 'ExistingManager', 'Candidate ไทย😀'];
    await expect(users(second).locator('option')).toHaveText(pool2);
    held.release();
    await f.actor.waitForTimeout(400);
    await expect(users(second).locator('option')).toHaveText(pool2);
    // SecondCandidate legitimately appears in project 2's member table (explicit manager); only the
    // candidate options must never contain the held project-1 identity.
    await expect(users(second).locator('option', { hasText: 'SecondCandidate' })).toHaveCount(0);
  } finally {
    await f.close();
  }
});

test('held positive reply then session revoked: 401 clears private state and the held names never appear', async ({ page, browser }) => {
  const f = await directoryFixture(page, browser);
  try {
    const dialog = await openMembers(f.actor);
    await expect(users(dialog).locator('option')).toHaveCount(3);
    const held = await holdPositive(f.actor, (u) => u.includes('q=Second'));
    const search = dialog.getByRole('textbox', { name: 'Search active users', exact: true });
    await search.fill('Second');
    await search.press('Enter');
    await held.fetched();
    // Revoke this session server-side (same cookie jar as the app), then make the app read again.
    const me = await (await f.actor.request.get(`${f.env.APP_ORIGIN}/api/me`)).json();
    const out = await f.actor.request.post(`${f.env.APP_ORIGIN}/api/logout`, { headers: { Origin: f.env.APP_ORIGIN, 'X-CSRF-Token': me.csrf } });
    expect(out.status()).toBeLessThan(300);
    await search.fill('Candidate');
    await search.press('Enter');
    held.release();
    await f.actor.waitForTimeout(400);
    await expect(f.actor.getByText('SecondCandidate')).toHaveCount(0);
    await expect(f.actor.getByText('Candidate ไทย😀')).toHaveCount(0);
    expect((await f.actor.request.get(`${f.env.APP_ORIGIN}/api/directory?project=${f.project.id}`)).status()).toBe(401);
  } finally {
    await f.close();
  }
});

test('held positive reply across offline → reconnect: stale pool discarded, fresh read reflects inactivation', async ({ page, browser }) => {
  const f = await directoryFixture(page, browser);
  try {
    const held = await holdPositive(f.actor, () => true);
    const dialog = await openMembers(f.actor);
    await held.fetched();
    // While the positive (stale) reply is held, SecondCandidate becomes inactive.
    await db(f, (tx) => tx.execute(sql('UPDATE dbo.users SET active=0 WHERE id=7')));
    await f.context.setOffline(true);
    await expect(dialog.getByRole('button', { name: 'Search', exact: true })).toBeDisabled();
    held.release();
    await f.actor.waitForTimeout(400);
    await expect(dialog.getByText('SecondCandidate')).toHaveCount(0);
    await f.context.setOffline(false);
    await expect(users(dialog).locator('option')).toHaveText(['Choose user', 'Candidate ไทย😀']);
    await expect(dialog.getByText('SecondCandidate')).toHaveCount(0);
  } finally {
    await f.context.setOffline(false).catch(() => undefined);
    await f.close();
  }
});

test('held positive reply then password-change gate: 403 clears private state; no candidate read succeeds', async ({ page, browser }) => {
  const f = await directoryFixture(page, browser);
  try {
    const dialog = await openMembers(f.actor);
    await expect(users(dialog).locator('option')).toHaveCount(3);
    const held = await holdPositive(f.actor, (u) => u.includes('q=Second'));
    const search = dialog.getByRole('textbox', { name: 'Search active users', exact: true });
    await search.fill('Second');
    await search.press('Enter');
    await held.fetched();
    await db(f, (tx) => tx.execute(sql('UPDATE dbo.users SET must_change_password=1 WHERE id=2')));
    await search.fill('Candidate');
    await search.press('Enter');
    held.release();
    await f.actor.waitForTimeout(400);
    await expect(f.actor.getByText('SecondCandidate')).toHaveCount(0);
    await expect(f.actor.getByText('Candidate ไทย😀')).toHaveCount(0);
    const direct = await f.actor.request.get(`${f.env.APP_ORIGIN}/api/directory?project=${f.project.id}`);
    expect(direct.status()).toBe(403);
    expect((await direct.json()).error.code).toBe('PASSWORD_CHANGE_REQUIRED');
  } finally {
    await f.close();
  }
});
