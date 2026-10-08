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
const detail = (page: Page) => page.getByRole('dialog', { name: /^Task details #/ });
/** The side panel shows one pane at a time: Updates (comments), Files, Activity (history). */
const pane = (page: Page, name: string) =>
  detail(page).getByRole('tab', { name, exact: true }).click();
async function openTask(page: Page) {
  const f = await projectFixture(page);
  expect(
    (await mutate(page, '/api/tasks', { project_id: 1, title: 'Collaboration task' })).status,
  ).toBe(201);
  const jobs = await tasks(page);
  await jobs.getByRole('button', { name: 'Open task #1', exact: true }).click();
  await pane(page, 'Updates');
  await expect(detail(page).getByRole('heading', { name: 'Comments', exact: true })).toBeVisible();
  return f;
}
test('T044 actual comments plaintext/pagination/dirty refresh and file upload/download/delete/restore/history with mobile layout', async ({
  page,
}, testInfo) => {
  const f = await openTask(page);
  try {
    const d = detail(page);
    await d
      .getByLabel('Write a comment', { exact: true })
      .fill('<script>window.fixtureXSS=1</script> ไทย');
    await d.getByRole('button', { name: 'Post comment', exact: true }).click();
    await expect(d.getByText('Comment added', { exact: true })).toBeVisible();
    await expect(
      d.getByText('<script>window.fixtureXSS=1</script> ไทย', { exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => 'fixtureXSS' in window)).toBe(false);
    await d.getByLabel('Write a comment', { exact: true }).fill('ร่างที่ต้องอยู่');
    await d
      .getByRole('button', { name: 'Refresh comments, files and history', exact: true })
      .click();
    await expect(d.getByLabel('Write a comment', { exact: true })).toHaveValue('ร่างที่ต้องอยู่');
    page.once('dialog', (dialog) => dialog.dismiss());
    await d.getByRole('button', { name: 'Close dialog', exact: true }).click();
    await expect(d).toBeVisible();
    for (let i = 0; i < 10; i++)
      expect(
        (await mutate(page, '/api/tasks/1/comments', { body: `Page comment ${i}` })).status,
      ).toBe(201);
    await d
      .getByRole('button', { name: 'Refresh comments, files and history', exact: true })
      .click();
    await expect(d.getByRole('button', { name: 'Next comments', exact: true })).toBeEnabled();
    await d.getByRole('button', { name: 'Next comments', exact: true }).click();
    await expect(d.getByText('Page comment 9', { exact: true })).toBeVisible();
    await expect(d.getByLabel('Write a comment', { exact: true })).toHaveValue('ร่างที่ต้องอยู่');
    await pane(page, 'Files');
    await d.getByLabel('Choose attachment', { exact: true }).setInputFiles({
      name: 'งาน.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('ไทย file bytes'),
    });
    await d.getByRole('button', { name: 'Upload file', exact: true }).click();
    await expect(d.getByText('Uploaded', { exact: true })).toBeVisible();
    const downloaded = page.waitForEvent('download');
    await d.getByRole('button', { name: 'Download งาน.txt', exact: true }).click();
    const download = await downloaded;
    expect(download.suggestedFilename()).toBe('งาน.txt');
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const b of stream!) chunks.push(b as Buffer);
    expect(Buffer.concat(chunks).toString()).toBe('ไทย file bytes');
    await d.getByRole('button', { name: 'Delete file งาน.txt', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Confirm file deletion', exact: true })
      .getByRole('button', { name: 'Delete file', exact: true })
      .click();
    await expect(d.getByRole('button', { name: 'Download งาน.txt', exact: true })).toHaveCount(0);
    await d.getByRole('checkbox', { name: 'Show deleted files available to restore' }).check();
    await d.getByRole('button', { name: 'Restore file งาน.txt', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Confirm file restore', exact: true })
      .getByRole('button', { name: 'Restore file', exact: true })
      .click();
    await expect(d.getByRole('button', { name: 'Download งาน.txt', exact: true })).toBeVisible();
    await pane(page, 'Activity');
    await d.getByRole('button', { name: 'Next history', exact: true }).click();
    await expect(
      d
        .getByRole('region', { name: 'Task history', exact: true })
        .getByText('Attachment updated', { exact: true })
        .first(),
    ).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await d
      .getByRole('button', { name: 'Refresh comments, files and history', exact: true })
      .scrollIntoViewIfNeeded();
    expect(await d.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('T044-panels-mobile.png') });
    await pane(page, 'Updates');
    await d.getByLabel('Write a comment', { exact: true }).fill('');
  } finally {
    await f.close();
  }
});
test('T044 actual upload progress/pending acknowledgment, uncertain response same-key retry and durable single file/comment', async ({
  page,
}) => {
  const f = await openTask(page);
  try {
    const d = detail(page);
    let ack: (() => void) | undefined;
    await page.route('**/api/tasks/1/attachments', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await route.fetch();
      await new Promise<void>((r) => (ack = r));
      await route.abort('failed');
    });
    await pane(page, 'Files');
    await d.getByLabel('Choose attachment', { exact: true }).setInputFiles({
      name: 'retry.txt',
      mimeType: 'text/plain',
      buffer: Buffer.alloc(1024 * 256, 97),
    });
    await d.getByRole('button', { name: 'Upload file', exact: true }).click();
    await expect(d.getByRole('progressbar', { name: 'Upload progress' })).toBeVisible();
    await expect(d.getByText('Uploaded', { exact: true })).toHaveCount(0);
    await expect.poll(() => !!ack).toBe(true);
    ack!();
    await expect(d.getByRole('alert').first()).toBeVisible();
    await page.unroute('**/api/tasks/1/attachments');
    await d.getByRole('button', { name: 'Upload file', exact: true }).click();
    await expect(d.getByText('Uploaded', { exact: true })).toBeVisible();
    expect(
      await page.evaluate(async () => {
        const f = await (await fetch('/api/tasks/1/attachments')).json();
        return f.total;
      }),
    ).toBe(1);
    let lost = true;
    await page.route('**/api/tasks/1/comments', async (route) => {
      if (route.request().method() === 'POST' && lost) {
        lost = false;
        await route.fetch();
        await route.abort('failed');
      } else await route.continue();
    });
    await pane(page, 'Updates');
    await d.getByLabel('Write a comment', { exact: true }).fill('retry comment');
    await d.getByRole('button', { name: 'Post comment', exact: true }).click();
    await expect(d.getByRole('alert').first()).toBeVisible();
    await expect(d.getByLabel('Write a comment', { exact: true })).toHaveValue('retry comment');
    await d.getByRole('button', { name: 'Post comment', exact: true }).click();
    await expect(d.getByText('Comment added', { exact: true })).toBeVisible();
    expect(
      await page.evaluate(async () => {
        const c = await (await fetch('/api/tasks/1/comments')).json();
        return c.total;
      }),
    ).toBe(1);
    await f.restart();
    await d
      .getByRole('button', { name: 'Refresh comments, files and history', exact: true })
      .click();
    await pane(page, 'Files');
    await expect(d.getByRole('button', { name: 'Download retry.txt', exact: true })).toBeVisible();
  } finally {
    await f.close();
  }
});
test('T044 invalid type/size/quota errors retain drafts; current permission failure clears private panels and closes detail', async ({
  page,
}) => {
  const f = await openTask(page);
  try {
    const d = detail(page);
    await d.getByLabel('Write a comment', { exact: true }).fill('draft');
    await pane(page, 'Files');
    await d.getByLabel('Choose attachment', { exact: true }).setInputFiles({
      name: 'fake.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('plain'),
    });
    await d.getByRole('button', { name: 'Upload file', exact: true }).click();
    await expect(
      d.getByText('File type or contents are not supported', { exact: true }),
    ).toBeVisible();
    await expect(d.getByLabel('Write a comment', { exact: true })).toHaveValue('draft');
    await d.getByLabel('Choose attachment', { exact: true }).setInputFiles({
      name: 'large.txt',
      mimeType: 'text/plain',
      buffer: Buffer.alloc(10485761, 97),
    });
    await expect(d.getByText('File exceeds 10 MiB', { exact: true })).toBeVisible();
    await expect(d.getByRole('button', { name: 'Upload file', exact: true })).toBeDisabled();
    await page.route('**/api/tasks/1/attachments', async (route) => {
      if (route.request().method() === 'POST')
        await route.fulfill({
          status: 422,
          json: {
            error: {
              code: 'QUOTA_EXCEEDED',
              message: 'fixture',
              requestId: '22222222-2222-4222-8222-222222222222',
              fieldErrors: {},
            },
          },
        });
      else await route.continue();
    });
    await d
      .getByLabel('Choose attachment', { exact: true })
      .setInputFiles({ name: 'valid.txt', mimeType: 'text/plain', buffer: Buffer.from('valid') });
    await d.getByRole('button', { name: 'Upload file', exact: true }).click();
    await expect(
      d.getByText('Storage is full. Contact your administrator.', { exact: true }),
    ).toBeVisible();
    await expect(d.getByRole('button', { name: 'Upload file', exact: true })).toBeEnabled();
    await page.unroute('**/api/tasks/1/attachments');
    await page.route('**/api/tasks/1/comments*', (route) =>
      route.fulfill({
        status: 404,
        json: {
          error: {
            code: 'NOT_FOUND',
            message: 'fixture',
            requestId: '22222222-2222-4222-8222-222222222222',
            fieldErrors: {},
          },
        },
      }),
    );
    await d
      .getByRole('button', { name: 'Refresh comments, files and history', exact: true })
      .click();
    await expect(d).toHaveCount(0);
    await expect(page.getByLabel('Write a comment', { exact: true })).toHaveCount(0);
  } finally {
    await f.close();
  }
});
