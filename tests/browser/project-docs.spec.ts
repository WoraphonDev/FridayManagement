import { test, expect, type Page } from '@playwright/test';
import { mutate, projectFixture, tasks } from './task-workspace-fixtures.js';
// T-084 / AT-35 local Chromium evidence: editor tools, stored-XSS inertness, image, 409 UI.
const png =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
async function uploadImage(page: Page, project: number) {
  return page.evaluate(
    async ({ project, png }) => {
      const self = await (await fetch('/api/me')).json();
      const form = new FormData();
      const bytes = Uint8Array.from(atob(png), (c) => c.charCodeAt(0));
      form.append('file', new Blob([bytes], { type: 'image/png' }), 'diagram.png');
      const r = await fetch(`/api/projects/${project}/files`, {
        method: 'POST',
        headers: { 'X-CSRF-Token': self.csrf, 'Idempotency-Key': crypto.randomUUID() },
        body: form,
      });
      return r.status;
    },
    { project, png },
  );
}
async function docs(page: Page) {
  const region = await tasks(page);
  await region.getByRole('button', { name: 'Docs', exact: true }).click();
  return page.locator('.project-docs');
}
test('Docs editor tools, image from Files, stored XSS stays inert, conflict keeps text', async ({
  page,
  context,
}) => {
  const f = await projectFixture(page);
  try {
    expect(await uploadImage(page, f.project.id)).toBe(201);
    const xss = await mutate(page, `/api/projects/${f.project.id}/docs`, {
      title: 'Hostile',
      body_html:
        '<img src=x onerror="window.__xss=1"><p>Safe text</p><a href="javascript:window.__xss=2">link</a><svg onload="window.__xss=3"></svg>',
    });
    expect(xss.status).toBe(201);
    const d = await docs(page);
    await d.getByRole('button', { name: /^Hostile/ }).click();
    await expect(d.getByText('Safe text')).toBeVisible();
    await d.getByText('link', { exact: true }).click();
    expect(await page.evaluate(() => (window as { __xss?: number }).__xss)).toBeUndefined();
    expect(await d.locator('.doc-body').innerHTML()).toBe('<p>Safe text</p><a>link</a>');
    // New doc with every FR-48 tool.
    await d.getByRole('button', { name: '+ New doc', exact: true }).click();
    await d.getByLabel('Doc title', { exact: true }).fill('ข้อกำหนดโครงการ');
    const body = d.getByRole('textbox', { name: 'Doc content', exact: true });
    await body.click();
    await page.keyboard.type('Intro');
    await d.getByRole('button', { name: 'H3', exact: true }).click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await d.getByRole('button', { name: '☐ Checklist', exact: true }).click();
    await d.getByRole('button', { name: 'Table', exact: true }).click();
    await d.getByRole('button', { name: 'Image', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Insert image from project files' })
      .getByRole('button', { name: 'diagram.png', exact: true })
      .click();
    await d.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Doc saved')).toBeVisible();
    const view = d.locator('.doc-body');
    await expect(view.locator('h3')).toHaveText('Intro');
    await expect(view.locator('ul[data-type="checklist"] > li')).toHaveAttribute(
      'data-checked',
      'false',
    );
    await expect(view.locator('table th')).toHaveCount(2);
    const img = view.locator('img');
    await expect(img).toHaveAttribute('src', /^\/api\/project-files\/\d+\/download$/);
    await expect
      .poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth))
      .toBe(1);
    // Toggle the checklist box while editing; the server keeps data-checked.
    await d.getByRole('button', { name: 'Edit', exact: true }).click();
    const item = d.locator('.doc-body ul[data-type="checklist"] > li');
    await item.click({ position: { x: 6, y: 8 } });
    await d.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(d.locator('.doc-body ul[data-type="checklist"] > li')).toHaveAttribute(
      'data-checked',
      'true',
    );
    // Conflict: a second tab saves first; this tab gets 409 and keeps the unsaved text.
    const other = await context.newPage();
    await other.goto(f.env.APP_ORIGIN + '/');
    const d2 = await docs(other);
    await d2.getByRole('button', { name: /^ข้อกำหนดโครงการ/ }).click();
    await d.getByRole('button', { name: 'Edit', exact: true }).click();
    await d2.getByRole('button', { name: 'Edit', exact: true }).click();
    await d2.getByLabel('Doc title', { exact: true }).fill('Saved elsewhere');
    await d2.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(d2.getByRole('heading', { name: 'Saved elsewhere' })).toBeVisible();
    await d.getByRole('textbox', { name: 'Doc content', exact: true }).click();
    await page.keyboard.type(' unsaved words');
    await d.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(
      d.getByRole('alert').filter({ hasText: 'Someone saved a newer version' }),
    ).toBeVisible();
    await expect(d.getByRole('textbox', { name: 'Doc content', exact: true })).toContainText(
      'unsaved words',
    );
    await other.close();
    await d.getByRole('button', { name: 'load the latest version' }).click();
    await expect(d.getByRole('heading', { name: 'Saved elsewhere' })).toBeVisible();
    await page.setViewportSize({ width: 375, height: 800 });
    await expect(d.locator('.doc-body img')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  } finally {
    await f.close();
  }
});
