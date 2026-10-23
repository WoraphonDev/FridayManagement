import { test, expect } from '@playwright/test';
import { join } from 'node:path';
import { projectFixture, tasks, mutate } from './task-workspace-fixtures.js';

const evidence = process.env.DEL_UX1_EVIDENCE;
const phase = process.env.DEL_UX1_PHASE ?? 'local';

for (const width of [360, 390, 768, 1440]) {
  test(`DEL-UX1 ${width}px shell keeps friday and Notify on one line`, async ({ page }) => {
    const f = await projectFixture(page);
    try {
      await page.setViewportSize({ width, height: 900 });
      if (evidence) await page.screenshot({ path: join(evidence, `${phase}-header-${width}.png`) });
      const metrics = await page.evaluate(() => {
        const lines = (selector: string) => {
          const el = document.querySelector(selector)!;
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          const tops: number[] = [];
          while (walker.nextNode()) {
            const range = document.createRange();
            range.selectNodeContents(walker.currentNode);
            tops.push(...[...range.getClientRects()].map((r) => Math.round(r.top)));
          }
          return tops;
        };
        return {
          brand: [...new Set(lines('.topbar .brand-name'))],
          notify: [...new Set(lines('.topbar .notify-link > span'))],
          width: innerWidth,
          scroll: document.documentElement.scrollWidth,
        };
      });
      console.log('header', width, metrics);
      expect(metrics.brand).toHaveLength(1);
      expect(metrics.notify).toHaveLength(1);
      expect(metrics.scroll).toBeLessThanOrEqual(metrics.width);
    } finally {
      await f.close();
    }
  });
}

test('DEL-UX1 picker Escape precedes modal close; Tab wraps and refresh never steals focus', async ({ page }) => {
  const f = await projectFixture(page);
  try {
    await mutate(page, '/api/tasks', { project_id: f.project.id, title: 'Keyboard fixture' });
    const board = await tasks(page);
    const opener = board.getByRole('button', { name: 'Open task #1', exact: true });
    await opener.click();
    const modal = page.getByRole('dialog', { name: 'Task details', exact: true });
    await expect(modal.getByLabel('Task title', { exact: true })).toBeVisible();
    const close = modal.getByRole('button', { name: 'Close dialog', exact: true });
    await expect(close).toBeFocused();
    await close.press('Tab');
    await expect(modal.getByRole('button', { name: 'Review latest data', exact: true })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(close).toBeFocused();
    const picker = modal.getByRole('combobox', { name: 'Status', exact: true });
    await picker.click();
    await expect(picker).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(picker).toHaveAttribute('aria-expanded', 'false');
    await expect(modal).toBeVisible();
    await expect(picker).toBeFocused();
    const title = modal.getByLabel('Task title', { exact: true });
    await title.focus();
    await expect(title).toBeFocused();
    const field = await title.elementHandle();
    await title.evaluate((el) => {
      el.setAttribute('data-blur-count', '0');
      el.addEventListener('blur', () => {
        el.setAttribute('data-blur-count', String(Number(el.getAttribute('data-blur-count')) + 1));
      });
    });
    // Observe the real five-second background poll. An `online` event instead
    // invokes the reconnect security gate, deliberately disabling every field.
    await page.waitForResponse((response) => response.url().endsWith('/api/tasks/1') && response.request().method() === 'GET');
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    expect(await field!.evaluate((el) => el.isConnected)).toBe(true);
    await expect(title).toHaveAttribute('data-blur-count', '0');
    await expect(title).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
    await expect(opener).toBeFocused();
  } finally {
    await f.close();
  }
});

for (const width of [360, 390, 720, 768, 1440]) {
  test(`DEL-UX1 ${width}px Thai long names: form fits and table scroll stays internal`, async ({ page }) => {
    const f = await projectFixture(page);
    try {
      const title = 'งานภาษาไทยชื่อยาวมาก'.repeat(6) + ' LongUnbrokenTaskName'.repeat(2);
      await mutate(page, '/api/tasks', { project_id: f.project.id, title });
      const board = await tasks(page);
      const name = 'โครงการภาษาไทยชื่อยาว'.repeat(3) + 'LongProjectName'.repeat(2);
      const renamed = await mutate(page, `/api/projects/${f.project.id}`, { version: f.project.version, name }, 'PATCH');
      expect(renamed.status).toBe(200);
      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
      await page.setViewportSize({ width, height: 900 });
      const table = page.locator('.table-scroll').first();
      const dimensions = await table.evaluate((el) => ({ client: el.clientWidth, scroll: el.scrollWidth, overflow: getComputedStyle(el).overflowX }));
      expect(dimensions.overflow).toMatch(/auto|scroll/);
      if (width < 768) {
        expect(dimensions.scroll).toBeGreaterThan(dimensions.client);
        await table.evaluate((el) => { el.scrollLeft = 100; });
        expect(await table.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      // The region label updates with its project name; use the live stable task identity.
      await page.getByRole('button', { name: 'Open task #1', exact: true }).click();
      const modal = page.getByRole('dialog', { name: 'Task details', exact: true });
      await expect(modal.getByLabel('Task title', { exact: true })).toHaveValue(title);
      await modal.evaluate(async (el) => { await Promise.all(el.getAnimations().map((animation) => animation.finished)); });
      const geometry = await modal.evaluate((el) => ({ client: el.clientWidth, scroll: el.scrollWidth, left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right }));
      expect(geometry.left).toBeGreaterThanOrEqual(0);
      expect(geometry.right).toBeLessThanOrEqual(width);
      expect(geometry.scroll - geometry.client).toBeLessThanOrEqual(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      if (evidence) await page.screenshot({ path: join(evidence, `${phase}-form-${width}.png`) });
      await expect(board).toBeVisible(); // background remains rendered; the native dialog owns focus
    } finally {
      await f.close();
    }
  });
}

test('DEL-UX1 200% CSS zoom keeps the form inside the page', async ({ page }) => {
  const f = await projectFixture(page);
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await mutate(page, '/api/tasks', { project_id: f.project.id, title: 'งานภาษาไทยชื่อยาว'.repeat(10) });
    await tasks(page);
    await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
    await page.getByRole('button', { name: 'Open task #1', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Task details', exact: true });
    await expect(modal.getByLabel('Task title', { exact: true })).toBeVisible();
    await modal.evaluate(async (el) => { await Promise.all(el.getAnimations().map((animation) => animation.finished)); });
    const geometry = await modal.evaluate((el) => ({ client: el.clientWidth, scroll: el.scrollWidth, left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right }));
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(1440);
    expect(geometry.scroll - geometry.client).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    if (evidence) await page.screenshot({ path: join(evidence, `${phase}-zoom200.png`) });
  } finally {
    await f.close();
  }
});

test('DEL-UX1 IME Enter never submits the task form', async ({ page }) => {
  const f = await projectFixture(page);
  try {
    await mutate(page, '/api/tasks', { project_id: f.project.id, title: 'IME ไทย' });
    const board = await tasks(page);
    await board.getByRole('button', { name: 'Open task #1', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Task details', exact: true });
    const field = modal.getByLabel('Task title', { exact: true });
    await field.fill('IME ภาษาไทย');
    let writes = 0;
    page.on('request', (request) => {
      if (request.method() === 'PATCH' && request.url().endsWith('/api/tasks/1')) writes++;
    });
    await field.dispatchEvent('compositionstart', { data: 'ไทย' });
    await field.press('Enter');
    await field.dispatchEvent('compositionend', { data: 'ไทย' });
    // A real reader round trip is the barrier; no arbitrary sleep/poll can mask a submit.
    await page.request.get(f.env.APP_ORIGIN + '/api/tasks/1');
    expect(writes).toBe(0);
    await expect(modal.getByText('Version 1 · Checklist 0/0')).toBeVisible();
    await modal.getByRole('button', { name: 'Save task', exact: true }).click();
    await expect(modal.getByText('Version 2 · Checklist 0/0')).toBeVisible();
    expect(writes).toBe(1);
  } finally {
    await f.close();
  }
});

test('DEL-UX1 deleting an opener returns focus to the visible section heading', async ({ page }) => {
  test.setTimeout(60000);
  const f = await projectFixture(page);
  try {
    await mutate(page, '/api/tasks', { project_id: f.project.id, title: 'Delete focus fixture' });
    const board = await tasks(page);
    await board.getByRole('button', { name: 'Open task #1', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Task details', exact: true });
    await modal.getByRole('button', { name: 'Delete task', exact: true }).click();
    await page.getByRole('dialog', { name: 'Confirm task deletion', exact: true })
      .getByRole('button', { name: 'Delete this task', exact: true }).click();
    await expect(modal).not.toBeVisible();
    await expect(board.getByRole('button', { name: 'Open task #1', exact: true })).toHaveCount(0);
    const heading = board.getByRole('heading', { name: 'Task project', exact: true });
    await expect(heading).toBeFocused();
    expect((await page.request.get(f.env.APP_ORIGIN + '/api/tasks/1')).status()).toBe(404);
    // Confirm focus survives the next real reader render, not a transient frame.
    await page.waitForResponse((response) => response.url().includes('/api/tasks?') && response.request().method() === 'GET');
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect(heading).toBeFocused();
    console.log('delete focus', await heading.evaluate((el) => ({ active: document.activeElement === el, text: el.textContent, tabindex: el.getAttribute('tabindex') })));
  } finally {
    await f.close();
  }
});

test('DEL-UX1 Save → rerender → Close restores the live task opener', async ({ page }) => {
  const f = await projectFixture(page);
  try {
    await mutate(page, '/api/tasks', { project_id: f.project.id, title: 'งานภาษาไทย focus' });
    const board = await tasks(page);
    const opener = board.getByRole('button', { name: 'Open task #1', exact: true });
    const original = await opener.elementHandle();
    await opener.click();
    const modal = page.getByRole('dialog', { name: 'Task details', exact: true });
    await modal.getByLabel('Task title', { exact: true }).fill('งานภาษาไทย saved');
    await modal.getByRole('button', { name: 'Save task', exact: true }).click();
    await expect(modal.getByText('Version 2 · Checklist 0/0')).toBeVisible();
    await expect.poll(() => original!.evaluate((el) => el.isConnected)).toBe(false);
    await modal.getByRole('button', { name: 'Close dialog', exact: true }).click();
    await expect(modal).not.toBeVisible();
    if (evidence) await page.screenshot({ path: join(evidence, `${phase}-focus.png`) });
    console.log('post-save-close activeElement', await page.evaluate(() => ({ tag: document.activeElement?.tagName, label: document.activeElement?.getAttribute('aria-label') })));
    await expect(opener).toBeFocused();
    const saved = await (await page.request.get(f.env.APP_ORIGIN + '/api/tasks/1')).json();
    expect(saved.item.title).toBe('งานภาษาไทย saved');
  } finally {
    await f.close();
  }
});
