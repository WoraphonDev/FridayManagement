import { test, expect } from '@playwright/test';
import { projectFixture, tasks, mutate } from './task-workspace-fixtures.js';
test('Owner Vibe: real groups, multiple assignees, independent checklist, centered status, CSP and Kanban', async ({
  page,
}) => {
  test.setTimeout(60000);
  const f = await projectFixture(page);
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  try {
    const user = await mutate(page, '/api/users', {
      username: 'VibeMember',
      display_name: 'Ton',
      temp_password: 'Synthetic-member-password',
      org_role: 'member',
    });
    expect(user.status, JSON.stringify(user.body)).toBe(201);
    await mutate(page, '/api/projects/1/members/2', { version: 1, access: 'editor' }, 'PUT');
    const made = await mutate(page, '/api/tasks', {
      project_id: 1,
      title: 'Launch checklist',
      assignee_ids: [1],
    });
    expect(made.status, JSON.stringify(made.body)).toBe(201);
    const board = await tasks(page);
    await board.getByRole('button', { name: 'New Group', exact: true }).click();
    await board.getByLabel('New group name').fill('Phase 1');
    await board.getByRole('button', { name: '+ New group', exact: true }).click();
    await expect(board.getByRole('button', { name: '⌄ Phase 1', exact: true })).toBeVisible();
    const remoteGroup = await mutate(page, '/api/projects/1/groups', { name: 'Phase 2' });
    expect(remoteGroup.status).toBe(201);
    await expect(board.getByRole('button', { name: '⌄ Phase 2', exact: true })).toBeVisible({
      timeout: 10000,
    });
    await board.getByRole('button', { name: 'Open task #1', exact: true }).click();
    const drawer = page.getByRole('dialog', { name: 'Task details #1', exact: true });
    await drawer
      .getByRole('combobox', { name: 'Group', exact: true })
      .selectOption({ label: 'Phase 1' });
    await drawer.getByRole('button', { name: 'Assignees', exact: true }).click();
    await page
      .getByRole('listbox', { name: 'Options for Assignees', exact: true })
      .getByRole('option', { name: 'Ton', exact: true })
      .click();
    await drawer.getByRole('button', { name: 'Save task', exact: true }).click();
    await expect(drawer.getByText('Version 2 · Checklist 0/0')).toBeVisible();
    await drawer.getByRole('tab', { name: 'Checklist', exact: true }).click();
    await drawer.getByLabel('Add checklist item', { exact: true }).fill('Check accessibility');
    await drawer.getByRole('button', { name: 'Add checklist item', exact: true }).click();
    await drawer
      .getByRole('combobox', { name: 'Assign checklist: Check accessibility', exact: true })
      .click();
    await page
      .getByRole('listbox', {
        name: 'Options for Assign checklist: Check accessibility',
        exact: true,
      })
      .getByRole('option', { name: 'Ton', exact: true })
      .click();
    await expect(drawer.getByText('Version 4 · Checklist 0/1')).toBeVisible();
    await drawer.getByRole('button', { name: 'Close dialog', exact: true }).click();
    await expect(board.getByRole('row').filter({ hasText: 'Launch checklist' })).toContainText(
      'Ton',
    );
    expect(
      await board
        .locator('.person-initials')
        .first()
        .evaluate((el) => getComputedStyle(el).color),
    ).toBe('rgb(103, 67, 165)');
    const status = board.getByRole('combobox', {
      name: 'Status for Launch checklist',
      exact: true,
    });
    await status.press('Enter');
    await page
      .getByRole('listbox', { name: 'Options for Status for Launch checklist', exact: true })
      .getByRole('option', { name: 'Working on it', exact: true })
      .click();
    await expect(status).toContainText('Working on it');
    const geometry = await status.evaluate((el) => {
      const outer = el.getBoundingClientRect(),
        label = el.querySelector('[class*="typography"]')!.getBoundingClientRect();
      return {
        height: outer.height,
        dy: Math.abs(outer.y + outer.height / 2 - label.y - label.height / 2),
        dx: Math.abs(outer.x + outer.width / 2 - label.x - label.width / 2),
      };
    });
    expect(geometry.height).toBe(26);
    expect(geometry.dy).toBeLessThan(1);
    expect(geometry.dx).toBeLessThan(1);
    await board.getByRole('button', { name: 'Kanban', exact: true }).click();
    const card = board.locator('[data-task-id="1"]');
    await expect(card).toContainText('Ton');
    // Compact card shows End Plan; both plan dates stay available in the date tooltip.
    await expect(card.locator('.card-due')).toHaveAttribute('title', /^Start Plan .+ · End Plan /);
    const motion = page.evaluate(
      () =>
        new Promise<number[]>((resolve) => {
          const started = performance.now();
          const sample = () => {
            const durations = document
              .getAnimations()
              .filter(
                (a) =>
                  a.effect instanceof KeyframeEffect &&
                  (a.effect.target as Element)?.classList.contains('card-content-motion'),
              )
              .map((a) => Number(a.effect!.getTiming().duration));
            if (durations.length || performance.now() - started > 4000) resolve(durations);
            else requestAnimationFrame(sample);
          };
          sample();
        }),
    );
    // Status moved into the card's ••• menu in the compact Kanban card.
    await card.getByLabel('Manage task #1', { exact: true }).click();
    await card
      .getByRole('combobox', { name: 'Status for Launch checklist', exact: true })
      .press('Enter');
    await page
      .getByRole('listbox', { name: 'Options for Status for Launch checklist', exact: true })
      .getByRole('option', { name: 'In review', exact: true })
      .click();
    await expect(
      board.getByRole('region', { name: 'Column In review' }).locator('[data-task-id="1"]'),
    ).toBeVisible();
    expect(await motion).toContain(320);
    const handle = board.getByRole('button', { name: 'Drag task #1', exact: true });
    const from = await handle.boundingBox();
    const target = await board.getByRole('region', { name: 'Column Not started' }).boundingBox();
    expect(from).not.toBeNull();
    expect(target).not.toBeNull();
    await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
    await page.mouse.down();
    await page.mouse.move(from!.x + 20, from!.y + 20, { steps: 4 });
    await page.mouse.move(target!.x + target!.width / 2, target!.y + 90, { steps: 20 });
    await page.mouse.up();
    await expect(
      board.getByRole('region', { name: 'Column Not started' }).locator('[data-task-id="1"]'),
    ).toBeVisible();
    expect(errors).toEqual([]);
    const read = await page.request.get(f.env.APP_ORIGIN + '/api/tasks/1');
    const saved = await read.json();
    expect(saved.item.assignee_ids).toEqual([1, 2]);
    expect(saved.item.subtasks[0].assignee_id).toBe(2);
    expect(saved.item.group_id).toBe(1);
  } finally {
    await f.close();
  }
});
test('Owner Vibe: compact mobile menu and reduced-motion drawer', async ({ page }) => {
  const f = await projectFixture(page);
  try {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const menu = page.getByRole('button', { name: 'Toggle navigation' });
    await expect(menu).toBeVisible();
    await menu.click();
    await expect(page.getByRole('link', { name: 'All projects', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'All projects', exact: true }).click();
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await page.locator('summary[aria-label^="Project actions"]').first().click();
    await page.getByRole('button', { name: 'Tasks', exact: true }).click();
    await page.getByRole('button', { name: 'New task', exact: true }).click();
    const drawer = page.getByRole('dialog', { name: 'Create task' });
    await expect(drawer.getByLabel('Start Plan')).toBeVisible();
    await expect(drawer.getByLabel('End Plan')).toBeVisible();
    const state = await drawer.evaluate((el) => ({
      width: el.getBoundingClientRect().width,
      animation: getComputedStyle(el).animationName,
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    expect(state.width).toBe(360);
    expect(state.animation).toBe('none');
    expect(state.overflow).toBe(false);
  } finally {
    await f.close();
  }
});

test('Approved design geometry, sidebar deep links, group editing and fixed create footer', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mutate(page, '/api/tasks', { project_id: 1, title: 'Parity task' });
    const board = await tasks(page);
    await expect(board.getByRole('heading', { name: 'Task project', exact: true })).toBeVisible();
    await expect(page.locator('.board-page > header')).toBeHidden();
    await expect(board.getByRole('table').first().getByRole('columnheader')).toHaveCount(7);
    const dimensions = await page.evaluate(() => ({
      sidebar: document.querySelector('.sidebar')!.getBoundingClientRect().width,
      row: document.querySelector('.project-task-group tbody tr')!.getBoundingClientRect().height,
    }));
    expect(dimensions).toEqual({ sidebar: 216, row: 38 });
    await expect(page.locator('.project-heading h1')).toHaveCSS('line-height', '28px');
    await expect(page.locator('.task-name button').first()).toHaveCSS('font-weight', '500');
    await expect(page.locator('.task-name button').first()).toHaveCSS('line-height', '16.2px');
    await expect(page.locator('.sidebar .nav-heading').first()).toHaveCSS(
      'letter-spacing',
      'normal',
    );
    await expect(page.locator('.sidebar nav a[aria-current="page"]')).toHaveCount(1);
    await page.screenshot({ path: 'reports/UI-workspace-details-table.png', fullPage: true });

    await board.getByRole('button', { name: 'New Group', exact: true }).click();
    await board.getByLabel('New group name').fill('Planning');
    await board.getByRole('button', { name: '+ New group', exact: true }).click();
    await board.getByRole('button', { name: 'Edit group Planning', exact: true }).click();
    await board.getByLabel('New group name').fill('Delivery');
    await board.getByRole('button', { name: 'Save group', exact: true }).click();
    await expect(board.getByRole('button', { name: '⌄ Delivery', exact: true })).toBeVisible();
    const group = await (
      await page.request.get(f.env.APP_ORIGIN + '/api/projects/1/groups')
    ).json();
    expect(group.items[0].name).toBe('Delivery');
    await board.getByRole('combobox', { name: 'Group by', exact: true }).selectOption('status');
    await expect(board.getByRole('button', { name: '⌄ Not started', exact: true })).toBeVisible();
    await board.getByRole('button', { name: 'New task', exact: true }).click();
    const drawer = page.getByRole('dialog', { name: 'Create task', exact: true });
    await expect(drawer).toBeVisible();
    const geometry = await drawer.evaluate((el) => ({
      width: el.getBoundingClientRect().width,
      footer: el.querySelector('.dialog-footer')!.getBoundingClientRect().bottom,
      viewport: window.innerHeight,
    }));
    expect(geometry.width).toBe(590);
    await expect(drawer.locator('.dialog-head h2')).toHaveCSS('font-size', '17px');
    await expect(drawer.getByLabel('Task title', { exact: true })).toHaveCSS('font-size', '13px');
    await expect(drawer.locator('.field > label').first()).toHaveCSS('font-size', '12px');
    await expect(drawer).toHaveCSS('opacity', '1');
    await expect(drawer.getByLabel('Details', { exact: true })).toHaveCSS('min-height', '92px');
    await page.screenshot({ path: 'reports/UI-workspace-details-drawer.png', fullPage: false });

    expect(Math.abs(geometry.footer - geometry.viewport)).toBeLessThanOrEqual(1);
    await drawer.getByLabel('Task title', { exact: true }).fill('Created from footer');
    await drawer.getByRole('button', { name: 'New task', exact: true }).click();
    await expect(drawer).toBeHidden();
    await expect(board.getByRole('button', { name: 'Open task #2', exact: true })).toBeVisible();
    const created = await (await page.request.get(f.env.APP_ORIGIN + '/api/tasks/2')).json();
    expect(created.item.title).toBe('Created from footer');
    expect(created.item.version).toBe(1);
    await page.getByRole('link', { name: 'All projects', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Projects', level: 1, exact: true }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Task project Task team', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Task project', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Task project', exact: true })).toBeVisible();
  } finally {
    await f.close();
  }
});

test('Approved Login: larger logo, eye inside password, install panel, motion and real authentication', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Welcome back', exact: true })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Clear work Move forward together' }),
    ).toBeVisible();
    const style = await page.evaluate(() => ({
      left: document.querySelector('.auth-content')!.getBoundingClientRect().width,
      right: document.querySelector('.auth-artwork')!.getBoundingClientRect().width,
      form: document.querySelector('.login-form')!.getBoundingClientRect().width,
      logo: getComputedStyle(document.querySelector('.auth-content > .friday-brand')!).fontSize,
      motion: getComputedStyle(document.querySelector('.auth-board')!).animationName,
    }));
    expect(style).toEqual({
      left: 720,
      right: 720,
      form: 340,
      logo: '40px',
      motion: 'login-board-arrive',
    });
    await expect(page.locator('.auth-copy')).toHaveCSS('opacity', '1');
    await expect(page.locator('.auth-board')).toHaveCSS('opacity', '1');
    await page.screenshot({
      path: 'reports/UI-vibe-login-final.png',
      fullPage: true,
      animations: 'allow',
    });
    const password = page.getByLabel('Password', { exact: true });
    await password.fill('Display-only fixture text');
    const eye = page.getByRole('button', { name: 'Show password', exact: true });
    const contained = await eye.evaluate((el) => {
      const box = el.getBoundingClientRect(),
        input = el.parentElement!.querySelector('input')!.getBoundingClientRect();
      return (
        box.left >= input.left &&
        box.right <= input.right &&
        box.top >= input.top &&
        box.bottom <= input.bottom
      );
    });
    expect(contained).toBe(true);
    await eye.click();
    await expect(password).toHaveAttribute('type', 'text');
    await expect(page.getByRole('button', { name: 'Hide password', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.getByRole('button', { name: 'Hide password', exact: true }).press('Enter');
    await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Need help signing in?', exact: true }).click();
    const help = page.getByRole('dialog', { name: 'Sign-in help', exact: true });
    await expect(help).toContainText('organization’s Admin');
    await help.press('Escape');
    await expect(help).toBeHidden();
    await password.fill('');
    await page.getByText('Install app', { exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Your workspace, one click away', exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: 'reports/UI-vibe-install-panel.png',
      fullPage: true,
      animations: 'allow',
    });
    await page.getByText('Install app', { exact: true }).click();
    await page.getByLabel('Username', { exact: true }).fill('WorkspaceAdmin');
    await password.fill('Incorrect-fixture-password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(password).toHaveValue('');
    await password.fill('Workspace-admin-fixture-password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await page.setViewportSize({ width: 360, height: 800 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.getByRole('heading', { name: 'Welcome back', exact: true })).toBeVisible();
    const mobile = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      art: getComputedStyle(document.querySelector('.auth-artwork')!).display,
      motion: getComputedStyle(document.querySelector('.login-form')!).animationName,
    }));
    expect(mobile).toEqual({ overflow: false, art: 'none', motion: 'none' });
    await page.screenshot({ path: 'reports/UI-vibe-login-mobile.png', fullPage: true });
  } finally {
    await f.close();
  }
});
