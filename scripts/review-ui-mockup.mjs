// Review-only checks for the standalone HTML prototype. No production/API fixtures.
import { chromium, expect } from '@playwright/test';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const htmlPath = join(root, 'TeamFlow_UI_Redesign_Mockup.html');
const reports = join(root, 'reports');
const base = process.env.FRIDAY_MOCKUP_URL ?? new URL('../TeamFlow_UI_Redesign_Mockup.html', import.meta.url).href;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const pageErrors = [];
const requests = [];
const startAt = process.env.FRIDAY_MOCKUP_START;
const onlyCases = process.env.FRIDAY_MOCKUP_CASES?.split(',');
const cases = startAt || onlyCases
  ? JSON.parse(await readFile(join(reports, 'UI-redesign-preview-results.json'), 'utf8')).cases.filter(c => c.result === 'PASS' && (onlyCases ? !onlyCases.includes(c.id) : c.id < startAt))
  : [];
page.on('pageerror', error => pageErrors.push(error.message));
page.on('request', request => requests.push(request.url()));
await mkdir(reports, { recursive: true });
const dialog = page.locator('#task-dialog');
const small = page.locator('#small-dialog');
const selectState = value => page.locator('#preview-state').selectOption(value);
const selectRole = value => page.locator('#preview-role').selectOption(value);
const clickAction = async value => {
  const selector = `button[data-action="${value}"]:visible`;
  for (const modal of [small, dialog]) {
    if (await modal.isVisible() && await modal.locator(selector).count()) {
      await modal.locator(selector).first().click();
      return;
    }
  }
  await page.locator(selector).first().click();
};
const nav = async value => {
  if (value === 'notifications') {
    await clickAction('notify-toggle');
    await clickAction('notify-all');
  } else await page.locator(`.sidebar [data-page="${value}"]`).click();
};
const shot = name => page.screenshot({ path: join(reports, `UI-redesign-${name}.png`), fullPage: true, animations: 'disabled' });
const reset = async (role = 'editor') => {
  await page.goto(base);
  await clickAction('enter-demo');
  await selectRole(role);
};
const check = async (id, description, fn) => {
  if (startAt && id < startAt) return;
  if (onlyCases && !onlyCases.includes(id)) return;
  try {
    await fn();
    cases.push({ id, description, result: 'PASS' });
  } catch (error) {
    cases.push({ id, description, result: 'FAIL', error: error.message.split('\n').slice(0, 7).join('\n') });
    await shot(`failure-${id}`).catch(() => {});
    throw error;
  }
};

try {
  await check('M01', 'Login: show password, help and session/rate-limit notices', async () => {
    await page.goto(base);
    await shot('login-desktop');
    await page.locator('input[name=password]').fill('synthetic-preview-only');
    await clickAction('show-password');
    await expect(page.locator('input[name=password]')).toHaveAttribute('type', 'text');
    await clickAction('login-help');
    await expect(small).toContainText('ติดต่อ Admin');
    await small.getByRole('button', { name: 'เข้าใจแล้ว' }).click();
    await selectState('rate');
    await expect(page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: false })).toBeDisabled();
    await selectState('session');
    await expect(page.locator('.auth-form')).toContainText('Session หมดอายุ');
  });
  await check('M02', 'Setup and forced password change are inspectable; password mismatch remains visible', async () => {
    await clickAction('setup');
    await shot('setup-desktop');
    await expect(page.locator('#setup-form')).toBeVisible();
    await clickAction('guide');
    await clickAction('preview-password');
    const f = page.locator('#forced-password-form');
    await f.locator('[name=current]').fill('synthetic-current');
    await f.locator('[name=new]').fill('synthetic-next-123');
    await f.locator('[name=confirm]').fill('synthetic-other-123');
    await f.getByRole('button', { name: 'บันทึกและเริ่มใช้งาน' }).click();
    await expect(page.locator('#password-error')).toContainText('ไม่ตรงกัน');
    await shot('forced-password-desktop');
    await expect(page.locator('#app-root')).toBeHidden();
  });
  await check('M03', 'Board: four views open the same task; Calendar/Gantt expose incomplete dates', async () => {
    await reset();
    await shot('board-desktop');
    for (const v of ['table', 'kanban', 'calendar', 'gantt']) {
      await page.locator(`[data-view="${v}"]`).click();
      await expect(page.locator('#board-content')).toContainText('ออกแบบหน้าเว็บไซต์ใหม่');
      await page.locator('#view-body [data-task="101"]').first().click();
      await expect(dialog.locator('[name=title]')).toHaveValue('ออกแบบหน้าเว็บไซต์ใหม่');
      await clickAction('close-task');
      if (v !== 'table') await shot(`${v}-desktop`);
    }
    await expect(page.locator('.missing-dates')).toContainText('ไม่มีวันส่ง');
    await expect(page.locator('.gantt-marker')).toHaveCount(1);
  });
  await check('M04', 'Search and combined person/status/priority filters update visible tasks and result count', async () => {
    await reset();
    await page.locator('#task-search').fill('ออกแบบหน้าเว็บไซต์ใหม่');
    await expect(page.locator('#result-count')).toHaveText('1 งาน');
    await page.locator('#task-search').fill('');
    await clickAction('filters');
    await page.locator('#filter-person').selectOption('1');
    await page.locator('#filter-status').selectOption('doing');
    await page.locator('#filter-priority').selectOption('high');
    await expect(page.locator('#result-count')).toHaveText('1 งาน');
    await expect(page.locator('#view-body')).toContainText('ออกแบบหน้าเว็บไซต์ใหม่');
    await clickAction('clear-filters');
    await expect(page.locator('#result-count')).toHaveText('10 งาน');
  });
  await check('M05', 'Create: required title, date order and recurrence due date; new task starts todo', async () => {
    await reset();
    await clickAction('new-task');
    await clickAction('save-task');
    await expect(page.locator('#task-error')).toContainText('กรอกชื่องาน');
    await dialog.locator('[name=title]').fill('งานทดสอบจาก mockup');
    await dialog.locator('[name=start]').fill('2026-10-12');
    await dialog.locator('[name=due]').fill('2026-10-10');
    await clickAction('save-task');
    await expect(page.locator('#task-error')).toContainText('Start Plan');
    await dialog.locator('[name=due]').fill('');
    await dialog.locator('[name=recurrence]').selectOption('weekly');
    await clickAction('save-task');
    await expect(page.locator('#task-error')).toContainText('วันส่ง');
    await dialog.locator('[name=due]').fill('2026-10-16');
    await expect(dialog.locator('[name=status]')).toBeDisabled();
    await shot('create-task-desktop');
    await clickAction('save-task');
    await expect(dialog).not.toBeVisible();
    await expect(page.locator('#result-count')).toHaveText('11 งาน');
    await expect(page.locator('tr').filter({ hasText: 'งานทดสอบจาก mockup' })).toContainText('งานทดสอบจาก mockup');
  });
  await check('M06', 'Dirty draft: cancel preserves input; Escape requires discard confirmation; focus returns', async () => {
    await reset();
    const opener = page.locator('#view-body [data-task="101"]');
    await opener.click();
    await dialog.locator('[name=title]').fill('ร่างที่ต้องเก็บ');
    await page.keyboard.press('Escape');
    await expect(small).toContainText('ทิ้งการเปลี่ยนแปลง');
    await small.getByRole('button', { name: 'ยกเลิก' }).click();
    await expect(dialog.locator('[name=title]')).toHaveValue('ร่างที่ต้องเก็บ');
    await clickAction('close-task');
    await small.getByRole('button', { name: 'ทิ้งร่าง', exact: true }).click();
    await expect(opener).toBeFocused();
  });
  await check('M07', 'Checklist: done guard, no auto-done, weekly successor once after reopen', async () => {
    await reset();
    await page.locator('#view-body [data-task="106"]').click();
    await dialog.locator('[name=status]').selectOption('done');
    await clickAction('save-task');
    await expect(page.locator('#task-error')).toContainText('Checklist ไม่ครบ');
    await dialog.locator('[data-task-tab=checklist]').click();
    for (const c of await dialog.locator('[data-check]').all()) await c.check();
    await dialog.locator('[data-task-tab=details]').click();
    // Previously selected status is still a draft. Reset before checking the no-auto-done path.
    await dialog.locator('[name=status]').selectOption('todo');
    await clickAction('save-task');
    await expect(page.locator('#result-count')).toHaveText('10 งาน');
    await page.locator('#view-body [data-task="106"]').click();
    await expect(dialog.locator('[name=status]')).toHaveValue('todo');
    await dialog.locator('[name=status]').selectOption('done');
    await clickAction('save-task');
    await expect(page.locator('#result-count')).toHaveText('11 งาน');
    for (const s of ['doing', 'done']) {
      await page.locator('#view-body [data-task="106"]').click();
      await dialog.locator('[name=status]').selectOption(s);
      await clickAction('save-task');
    }
    await expect(page.locator('#result-count')).toHaveText('11 งาน');
  });
  await check('M08', 'Comment draft survives tabs and offline; reconnect retains task draft', async () => {
    await reset();
    await page.locator('#view-body [data-task="101"]').click();
    await dialog.locator('[name=title]').fill('ร่างระหว่าง offline');
    await dialog.locator('[data-task-tab=comments]').click();
    await page.locator('#comment-input').fill('ความคิดเห็นที่ยังไม่ส่ง');
    await dialog.locator('[data-task-tab=details]').click();
    await dialog.locator('[data-task-tab=comments]').click();
    await expect(page.locator('#comment-input')).toHaveValue('ความคิดเห็นที่ยังไม่ส่ง');
    await clickAction('simulate-offline');
    await expect(dialog).toContainText('ต้องเชื่อมต่อ');
    await expect(dialog.locator('#save-task')).toHaveCount(0);
    await clickAction('reconnect');
    await expect(page.locator('#comment-input')).toHaveValue('ความคิดเห็นที่ยังไม่ส่ง');
    await clickAction('post-comment');
    await expect(dialog.locator('.comment')).toHaveCount(2);
    await dialog.locator('[data-task-tab=details]').click();
    await expect(dialog.locator('[name=title]')).toHaveValue('ร่างระหว่าง offline');
    await clickAction('save-task');
    await expect(page.locator('#view-body')).toContainText('ร่างระหว่าง offline');
  });
  await check('M09', 'Conflict: draft is not overwritten; save waits for explicit review choice', async () => {
    await reset();
    await page.locator('#view-body [data-task="101"]').click();
    await dialog.locator('[name=title]').fill('ร่างระหว่าง conflict');
    await clickAction('simulate-conflict');
    await expect(dialog.locator('[name=title]')).toHaveValue('ร่างระหว่าง conflict');
    await clickAction('save-task');
    await expect(page.locator('#task-error')).toContainText('เก็บร่าง');
    await shot('conflict-desktop');
    await clickAction('keep-draft');
    await clickAction('save-task');
    await expect(page.locator('#view-body')).toContainText('ร่างระหว่าง conflict');
  });
  await check('M10', 'Viewer/archived UI closes writes; Admin can unarchive', async () => {
    await reset('viewer');
    await expect(page.locator('.toolbar [data-action=new-task]')).toBeDisabled();
    await page.locator('#view-body [data-task="101"]').click();
    await expect(dialog.locator('[name=title]')).toBeDisabled();
    await expect(dialog.locator('#save-task')).toHaveCount(0);
    await clickAction('close-task');
    await expect(page.locator('.sidebar [data-page=users]')).toHaveCount(0);
    await expect(page.locator('.sidebar [data-page=trash]')).toHaveCount(0);
    await selectRole('admin');
    await selectState('archived');
    await expect(page.locator('.toolbar [data-action=new-task]')).toBeDisabled();
    await clickAction('unarchive');
    await expect(page.locator('.toolbar [data-action=new-task]')).toBeEnabled();
  });
  await check('M11', 'Kanban: filtered drag disabled, dropdown alternative and cross-column drag', async () => {
    await reset();
    await page.locator('[data-view=kanban]').click();
    await page.locator('[data-card="109"] [data-card-status]').selectOption('review');
    await expect(page.locator('[data-column=review]')).toContainText('ส่งคู่มือให้ผู้ใช้งาน');
    await page.locator('[data-card="109"] [data-drag-handle]').dragTo(page.locator('[data-column=doing]'), { targetPosition: { x: 100, y: 320 } });
    await expect(page.locator('[data-column=doing]')).toContainText('ส่งคู่มือให้ผู้ใช้งาน');
    await page.locator('#task-search').fill('คู่มือ');
    await expect(page.locator('[data-card="109"]')).toHaveAttribute('draggable', 'false');
    await expect(page.locator('#view-body')).toContainText('ปิดการลาก');
  });
  await check('M12', 'File selection only, allowlist/size guard, file trash and restore', async () => {
    await reset();
    await page.locator('#view-body [data-task="101"]').click();
    await dialog.locator('[data-task-tab=files]').click();
    await page.locator('#attachment-input').setInputFiles({ name: 'unsafe.html', mimeType: 'text/html', buffer: Buffer.from('synthetic') });
    await expect(page.locator('#task-error')).toContainText('allowlist');
    await page.locator('#attachment-input').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('synthetic preview') });
    await expect(dialog).toContainText('notes.txt');
    await dialog.locator('[data-remove-file="1"]').click();
    await small.getByRole('button', { name: 'ลบไฟล์', exact: true }).click();
    await expect(dialog).toContainText('ถังขยะไฟล์ของงาน');
    await dialog.locator('[data-restore-file="0"]').click();
    await clickAction('save-task');
  });
  await check('M13', 'Notifications: read one/all and open linked task', async () => {
    await reset();
    await nav('notifications');
    await page.locator('[data-read="1"]').click();
    await expect(page.locator('.notification.unread')).toHaveCount(2);
    await page.locator('[data-notification="2"]').click();
    await expect(dialog.locator('[name=title]')).toHaveValue('ออกแบบหน้าเว็บไซต์ใหม่');
    await clickAction('close-task');
    await clickAction('read-all');
    await expect(page.locator('.notification.unread')).toHaveCount(0);
  });
  await check('M14', 'Trash: creator delete and authorized restore, no permanent delete control', async () => {
    await reset('admin');
    await page.locator('#view-body [data-task="103"]').click();
    await clickAction('delete-task');
    await small.getByRole('button', { name: 'ย้ายไปถังขยะ' }).click();
    await expect(page.locator('#result-count')).toHaveText('9 งาน');
    await nav('trash');
    await page.locator('[data-restore="103"]').click();
    await small.getByRole('button', { name: 'คืนงาน', exact: true }).click();
    await expect(page.locator('[data-restore="103"]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'ลบถาวร', exact: true })).toHaveCount(0);
  });
  await check('M15', 'User admin: last active Admin guard and reset form', async () => {
    await reset('admin');
    await nav('users');
    await page.locator('[data-user="2"]').click();
    await page.locator('[data-toggle-user="2"]').click();
    await expect(small).toContainText('Admin active อย่างน้อยหนึ่งคน');
    await clickAction('close-small');
    await page.locator('[data-user="1"]').click();
    await page.locator('[data-reset-user="1"]').click();
    await expect(small.locator('[name=adminPassword]')).toHaveAttribute('type', 'password');
    await clickAction('close-small');
  });
  await check('M16', 'CSV: explicit demo download contains all active tasks', async () => {
    await reset();
    await nav('reports');
    const download = page.waitForEvent('download');
    await clickAction('export-csv');
    const file = await download;
    expect(file.suggestedFilename()).toBe('Friday-DEMO-tasks.csv');
    const bytes = await readFile(await file.path());
    expect(bytes.subarray(0, 3).toString('hex')).toBe('efbbbf');
    expect(bytes.toString('utf8').split('\r\n')).toHaveLength(11);
  });
  await check('M17', 'Loading, empty, error, offline and forbidden are visible and recoverable', async () => {
    await reset();
    for (const state of ['loading', 'empty', 'error', 'offline', 'forbidden']) {
      await selectState(state);
      await expect(page.locator('#board-content')).toBeVisible();
      if (state === 'loading') await expect(page.locator('.skeleton')).toHaveCount(6);
      if (state === 'error' || state === 'forbidden') await expect(page.locator('#main-content [role=alert]')).toBeVisible();
      if (state === 'offline') await expect(page.locator('.toolbar [data-action=new-task]')).toBeDisabled();
    }
    await clickAction('retry');
    await expect(page.locator('#result-count')).toHaveText('10 งาน');
  });
  await check('M18', 'Desktop: inspect every main screen and management dialogs', async () => {
    await reset('admin');
    for (const screen of ['home','my','projects','calendar','reports','notifications','teams','users','trash','settings']) {
      await nav(screen);
      await expect(page.locator('#main-content h1')).toBeVisible();
      await shot(`${screen}-desktop`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await nav('projects');
    await clickAction('new-project');
    await shot('new-project-desktop');
    await clickAction('close-small');
    await nav('users');
    await clickAction('new-user');
    await shot('new-user-desktop');
    await clickAction('close-small');
    await clickAction('guide');
    await shot('process-guide-desktop');
  });
  await check('M19', 'Mobile/tablet: all main screens fit 360/768px; scroll is contained', async () => {
    for (const width of [360,768]) {
      await page.setViewportSize({ width, height: 900 });
      await reset('admin');
      const mobileNav = async screen => {
        if (width === 360 && screen !== 'notifications') await clickAction('menu');
        await nav(screen);
      };
      for (const screen of ['home','my','projects','calendar','reports','notifications','teams','users','trash','settings']) {
        await mobileNav(screen);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${screen} ${width}px overflow`).toBe(true);
      }
      await mobileNav('board');
      await shot(`board-${width}px`);
      for (const view of ['kanban', 'gantt']) {
        await page.locator(`[data-view=${view}]`).click();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await shot(`${view}-${width}px`);
      }
      await clickAction('new-task');
      await expect(dialog.locator('[name=title]')).toBeVisible();
      expect(Math.round((await dialog.boundingBox()).width)).toBe(Math.min(640, width));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await shot(`create-task-${width}px`);
      await clickAction('close-task');
      await page.goto(base);
      await shot(`login-${width}px`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  });
  await check('M20', 'Keyboard: tab switching, modal focus trap and Escape return', async () => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await reset();
    await page.locator('[data-view=table]').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-view=kanban]')).toHaveAttribute('aria-selected', 'true');
    await clickAction('new-task');
    for (let i=0;i<24;i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !!document.activeElement.closest('#task-dialog'))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(page.locator('.toolbar [data-action=new-task]')).toBeFocused();
  });
  await check('M21', 'Reduced motion and no API/storage/remote-resource usage', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await reset();
    expect(await page.locator('#board-content').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
    expect(pageErrors).toEqual([]);
    expect(requests.filter(url => /\/api\/|https?:\/\/(?!127\.0\.0\.1:43190)/.test(url))).toEqual([]);
    const html = await readFile(htmlPath, 'utf8');
    expect(/\b(fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage)\s*[.(]/.test(html)).toBe(false);
  });
} catch (error) {
  console.error(error.message.split('\n').slice(0, 5).join('\n'));
  process.exitCode = 1;
} finally {
  const html = await readFile(htmlPath);
  const result = {
    date: '2026-10-07', scope: 'Standalone design prototype only',
    browser: await browser.version(), runtime: process.version,
    source: 'TeamFlow_UI_Redesign_Mockup.html', sha256: createHash('sha256').update(html).digest('hex'),
    summary: { pass: cases.filter(c=>c.result==='PASS').length, fail: cases.filter(c=>c.result==='FAIL').length, planned: 21 },
    cases: cases.sort((a,b)=>a.id.localeCompare(b.id)), pageErrors, privateApiRequests: requests.filter(url=>url.includes('/api/')),
    productionAcceptance: 'NOT_RUN', sqlServer: 'NOT_RUN', windows: 'NOT_RUN', uat: 'NOT_RUN',
  };
  await writeFile(join(reports, 'UI-redesign-preview-results.json'), JSON.stringify(result, null, 2)+'\n');
  console.log(JSON.stringify(result.summary));
  await browser.close();
}
