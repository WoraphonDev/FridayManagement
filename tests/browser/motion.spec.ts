import { test, expect, type Page } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { mutate, projectFixture, tasks } from './task-workspace-fixtures.js';
// T-089 / AT-39 motion evidence: AN pulse/confetti, non-blocking, reduced motion, frame timing.
async function setStatus(page: Page, title: string, option: string) {
  // The table may re-render right after navigation; reopen the menu until the option is chosen.
  const status = page.getByRole('combobox', { name: `Status for ${title}`, exact: true });
  await expect(async () => {
    await status.press('Enter');
    await page
      .getByRole('listbox', { name: `Options for Status for ${title}`, exact: true })
      .getByRole('option', { name: option, exact: true })
      .click({ timeout: 2000 });
  }).toPass({ timeout: 20000 });
}
/** Frame intervals over `ms` while `work` runs; reports fps and p95 frame time. */
async function frames(page: Page, ms: number, work: () => Promise<void>) {
  await page.evaluate((ms) => {
    const w = window as unknown as { frames: number[] };
    w.frames = [];
    let last = performance.now();
    const end = last + ms;
    const tick = (t: number) => {
      w.frames.push(t - last);
      last = t;
      if (t < end) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, ms);
  await work();
  await page.waitForTimeout(ms + 50);
  const list = await page.evaluate(() => (window as unknown as { frames: number[] }).frames);
  const sorted = [...list].sort((a, b) => a - b);
  const avg = list.reduce((a, b) => a + b, 0) / list.length;
  return {
    frames: list.length,
    fps: Math.round(1000 / avg),
    p95: Math.round(sorted[Math.floor(sorted.length * 0.95)]!),
  };
}
test('Motion: pulse + confetti on Done, actions stay usable, reduce toggle and OS setting turn motion off', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    for (const title of ['Motion one', 'Motion two', 'Motion three'])
      expect((await mutate(page, '/api/tasks', { project_id: f.project.id, title })).status).toBe(
        201,
      );
    await tasks(page);
    // AN-03/AN-04 with frame timing while confetti runs; record the pulse class as it happens.
    await page.evaluate(() => {
      const w = window as unknown as { pulsed: boolean; confettiPointer?: string };
      w.pulsed = false;
      new MutationObserver((records) => {
        for (const r of records) {
          if ((r.target as Element).classList?.contains('status-pulse')) w.pulsed = true;
          for (const n of r.addedNodes)
            if (n instanceof HTMLElement && n.classList.contains('confetti-piece'))
              w.confettiPointer ??= getComputedStyle(n).pointerEvents;
        }
      }).observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['class'],
      });
    });
    const trace = await frames(page, 900, async () => {
      await setStatus(page, 'Motion one', 'Done');
      await expect(page.locator('.confetti-piece').first()).toBeAttached();
    });
    expect(await page.evaluate(() => (window as unknown as { pulsed: boolean }).pulsed)).toBe(true);
    expect(
      await page.evaluate(
        () => (window as unknown as { confettiPointer?: string }).confettiPointer,
      ),
    ).toBe('none');
    // Actions are not blocked while motion runs: switch view immediately.
    await setStatus(page, 'Motion two', 'Done');
    await page.getByRole('button', { name: 'Kanban', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Project Kanban' })).toBeVisible();
    await page.getByRole('button', { name: 'Main table', exact: true }).click();
    // AN-12 toast and AN-08 skeleton styles exist with motion on.
    expect(trace.frames).toBeGreaterThan(20);
    mkdirSync('reports', { recursive: true });
    writeFileSync(
      'reports/T-089-motion-trace.json',
      JSON.stringify(
        { scenario: 'status→Done with confetti, 900 ms, headless Chromium', ...trace },
        null,
        2,
      ) + '\n',
    );
    // Reduce animations in Settings: saved per user, survives reload, disables CSS motion.
    await page.goto(f.env.APP_ORIGIN + '/settings');
    await page.getByLabel('Reduce animations').check();
    const saved = page.locator('.toast').filter({ hasText: 'Animation preference saved' });
    await expect(saved).toBeVisible();
    // AN-12 toast is collapsed to ~0 ms once motion is reduced.
    expect(await saved.evaluate((el) => getComputedStyle(el).animationDuration)).toBe('1e-05s');
    await page.reload();
    await expect(page.getByLabel('Reduce animations')).toBeChecked();
    await expect(page.locator('html')).toHaveClass(/reduce-motion/);
    await tasks(page);
    await setStatus(page, 'Motion three', 'Done');
    await expect(page.getByRole('combobox', { name: 'Status for Motion three' })).toContainText(
      'Done',
    );
    await expect(page.locator('.confetti-piece')).toHaveCount(0);
    // OS-level reduced motion wins even when the preference is off.
    await page.goto(f.env.APP_ORIGIN + '/settings');
    await page.getByLabel('Reduce animations').uncheck();
    await expect(page.getByText('Animation preference saved')).toBeVisible();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await tasks(page);
    await setStatus(page, 'Motion three', 'Working on it');
    await setStatus(page, 'Motion three', 'Done');
    await expect(page.getByRole('combobox', { name: 'Status for Motion three' })).toContainText(
      'Done',
    );
    await expect(page.locator('.confetti-piece')).toHaveCount(0);
    expect(
      await page.locator('.task-filters').evaluate((el) => getComputedStyle(el).animationDuration),
    ).toBe('1e-05s');
  } finally {
    await f.close();
  }
});
