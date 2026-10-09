import { test, expect } from '@playwright/test';
import { mutate, projectFixture, tasks } from './task-workspace-fixtures.js';
// T-085 / AT-36 local Chromium evidence: Files tab upload/search/filter/preview/delete/restore.
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const pdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
test('Files tab: upload, merged list with task source, search/type filter, safe previews, delete/restore', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    expect(
      (await mutate(page, '/api/tasks', { project_id: f.project.id, title: 'Source task' })).status,
    ).toBe(201);
    const region = await tasks(page);
    await region.getByRole('button', { name: 'Files', exact: true }).click();
    const files = page.getByRole('region', { name: 'Project files', exact: true });
    await expect(files.getByText('No files yet')).toBeVisible();
    const chooser = files.getByLabel('Choose a file to upload', { exact: true });
    for (const [name, buffer, mimeType] of [
      ['ผังระบบ.png', png, 'image/png'],
      ['spec.pdf', pdf, 'application/pdf'],
      ['notes.txt', Buffer.from('plain notes'), 'text/plain'],
    ] as const) {
      await chooser.setInputFiles({ name, mimeType, buffer });
      await expect(page.getByText(`Uploaded ${name}`)).toBeVisible();
    }
    // Rejected type is reported, not stored.
    await chooser.setInputFiles({
      name: 'tool.exe',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from('MZ'),
    });
    await expect(files.getByRole('row')).toHaveCount(4);
    // A task attachment appears with its source task.
    const taskFile = await page.evaluate(async () => {
      const self = await (await fetch('/api/me')).json();
      const form = new FormData();
      form.append('file', new Blob(['from the task']), 'task-note.txt');
      const r = await fetch('/api/tasks/1/attachments', {
        method: 'POST',
        headers: { 'X-CSRF-Token': self.csrf, 'Idempotency-Key': crypto.randomUUID() },
        body: form,
      });
      return r.status;
    });
    expect(taskFile).toBe(201);
    await files.getByLabel('File type', { exact: true }).selectOption('document');
    await files.getByLabel('File type', { exact: true }).selectOption('');
    await expect(files.getByRole('cell', { name: 'Task: Source task', exact: true })).toBeVisible();
    await files.getByLabel('Search files', { exact: true }).fill('ผัง');
    await expect(files.getByRole('row')).toHaveCount(2);
    await files.getByLabel('Search files', { exact: true }).fill('');
    await files.getByLabel('File type', { exact: true }).selectOption('pdf');
    await expect(files.getByRole('row')).toHaveCount(2);
    await files.getByLabel('File type', { exact: true }).selectOption('');
    await expect(files.getByRole('row')).toHaveCount(5);
    // Image preview renders inside the dialog from a typed blob URL.
    await files.getByRole('button', { name: 'Preview ผังระบบ.png', exact: true }).click();
    const preview = page.getByRole('dialog', { name: 'ผังระบบ.png' }).locator('img.file-preview');
    await expect(preview).toHaveAttribute('src', /^blob:/);
    await expect
      .poll(() => preview.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth))
      .toBe(1);
    await page.keyboard.press('Escape');
    // PDF opens in a separate noopener tab from a typed blob URL (never the raw download
    // URL). Headless Chromium downloads PDFs instead of rendering, so record the call.
    await page.evaluate(() => {
      const w = window as unknown as { opened: unknown[] };
      w.opened = [];
      window.open = (...args: unknown[]) => {
        w.opened.push(args);
        return null;
      };
    });
    await files.getByRole('button', { name: 'Preview spec.pdf', exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { opened: string[][] }).opened))
      .toEqual([[expect.stringMatching(/^blob:/), '_blank', 'noopener']]);
    // Plain text has download only; no preview button.
    await expect(files.getByRole('button', { name: 'Preview notes.txt' })).toHaveCount(0);
    await files.getByRole('button', { name: 'Delete notes.txt', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Delete file?', exact: true })
      .getByRole('button', { name: 'Delete file', exact: true })
      .click();
    await expect(page.getByText('File deleted')).toBeVisible();
    await expect(files.getByRole('row')).toHaveCount(4);
    await files.getByLabel('Include deleted').check();
    await files.getByRole('button', { name: 'Restore notes.txt', exact: true }).click();
    await expect(page.getByText('File restored')).toBeVisible();
    await files.getByLabel('Include deleted').uncheck();
    await expect(files.getByRole('row')).toHaveCount(5);
    await page.setViewportSize({ width: 375, height: 800 });
    await expect(files.getByRole('region', { name: 'Files' })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  } finally {
    await f.close();
  }
});
