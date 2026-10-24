import { test, expect, type Page } from '@playwright/test';
import { projectFixture, tasks, mutate } from './task-workspace-fixtures.js';

async function docs(page: Page) {
  const region = await tasks(page);
  await region.getByRole('button', { name: 'Docs', exact: true }).click();
  return page.locator('.project-docs');
}
async function create(page: Page, title: string) {
  await page.getByRole('button', { name: '+ New doc', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'New doc', exact: true });
  await dialog.getByLabel('Doc title', { exact: true }).fill(title);
  await dialog.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Doc content' })).toBeVisible();
}

test('title first: blank/cancel/IME and lost acknowledgement replay one immutable intent', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    await docs(page);
    const requests: { key: string | undefined; body: string | null }[] = [];
    let lose = true;
    await page.route('**/api/projects/*/docs', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      requests.push({
        key: route.request().headers()['idempotency-key'],
        body: route.request().postData(),
      });
      const response = await route.fetch();
      if (lose) {
        lose = false;
        await route.abort('failed');
      } else await route.fulfill({ response });
    });
    await page.getByRole('button', { name: '+ New doc', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'New doc', exact: true });
    const title = dialog.getByLabel('Doc title', { exact: true });
    await expect(title).toBeFocused();
    await title.fill('   ');
    await expect(dialog.getByRole('button', { name: 'Create', exact: true })).toBeDisabled();
    await title.fill('');
    await page.keyboard.press('Escape');
    expect(requests).toHaveLength(0);
    await page.getByRole('button', { name: '+ New doc', exact: true }).click();
    await title.fill('x'.repeat(201));
    await expect(title).toHaveValue('x'.repeat(200));
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('button', { name: 'Discard draft', exact: true }).click();
    expect(requests).toHaveLength(0);
    await page.getByRole('button', { name: '+ New doc', exact: true }).click();
    await title.fill('ข้อกำหนด 📝');
    await title.dispatchEvent('compositionstart');
    await title.press('Enter');
    expect(requests).toHaveLength(0);
    await title.dispatchEvent('compositionend');
    await dialog.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(dialog.getByRole('alert')).toBeVisible();
    await expect(title).toHaveValue('ข้อกำหนด 📝');
    await expect(title).toBeDisabled();
    await dialog.getByRole('button', { name: 'Retry create', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    expect(requests).toHaveLength(2);
    expect(requests[0]).toEqual(requests[1]);
    const result = await page.request.get(f.env.APP_ORIGIN + `/api/projects/${f.project.id}/docs`);
    const { items } = await result.json();
    expect(items.map((d: { title: string }) => d.title)).toEqual(['ข้อกำหนด 📝']);
  } finally {
    await f.close();
  }
});

test('create 422 keeps title editable; correction uses a new key and creates exactly one doc', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    await docs(page);
    const requests: { key: string | undefined; title: string }[] = [];
    await page.route('**/api/projects/*/docs', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      requests.push({
        key: route.request().headers()['idempotency-key'],
        title: route.request().postDataJSON().title,
      });
      if (requests.length === 1) {
        await route.fulfill({
          status: 422,
          json: {
            error: { code: 'VALIDATION_ERROR', fieldErrors: { title: ['Choose another title'] } },
          },
        });
      } else await route.continue();
    });
    await page.getByRole('button', { name: '+ New doc', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'New doc', exact: true });
    const title = dialog.getByLabel('Doc title', { exact: true });
    await title.fill('Rejected title');
    await dialog.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(dialog.getByRole('alert')).toBeVisible();
    // Regression: before the fix unknownCreate disables this field after a definitive 422.
    await expect(title).toBeEditable();
    await expect(title).toHaveValue('Rejected title');
    const before = await page.request.get(f.env.APP_ORIGIN + `/api/projects/${f.project.id}/docs`);
    expect((await before.json()).items).toHaveLength(0);
    await title.fill('Corrected title');
    await expect(dialog.getByRole('alert')).toBeVisible();
    await dialog.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    expect(requests).toHaveLength(2);
    expect(requests[0]?.key).toBeTruthy();
    expect(requests[1]?.key).toBeTruthy();
    expect(requests[1]?.key).not.toBe(requests[0]?.key);
    expect(requests.map((request) => request.title)).toEqual(['Rejected title', 'Corrected title']);
    const after = await page.request.get(f.env.APP_ORIGIN + `/api/projects/${f.project.id}/docs`);
    expect((await after.json()).items.map((doc: { title: string }) => doc.title)).toEqual([
      'Corrected title',
    ]);
  } finally {
    await f.close();
  }
});

test('dirty switch, cancel, tab and route default to Stay; mobile caret and server ack', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    await mutate(page, `/api/projects/${f.project.id}/docs`, {
      title: 'Other',
      body_html: '<p>Other body</p>',
    });
    const d = await docs(page);
    await create(page, 'Draft');
    await page.setViewportSize({ width: 390, height: 844 });
    const body = d.getByRole('textbox', { name: 'Doc content' });
    await body.fill('private draft');
    await body.press('End');
    expect(
      await page.evaluate(() => {
        const event = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(event);
        return event.defaultPrevented;
      }),
    ).toBe(true);
    for (const action of [
      () => d.getByRole('button', { name: /^Other/ }).click(),
      () => d.getByRole('button', { name: 'Cancel', exact: true }).click(),
      () => page.getByRole('button', { name: 'Files', exact: true }).click(),
    ]) {
      await action();
      const confirm = page.getByRole('dialog', { name: 'Discard changes?' });
      await expect(confirm.getByRole('button', { name: 'Stay', exact: true })).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(body).toHaveText('private draft');
    }
    await body.press('End');
    await d.getByRole('button', { name: /^Other/ }).click();
    await page.getByRole('button', { name: 'Stay', exact: true }).click();
    await expect(body).toBeFocused();
    await page.keyboard.type('!');
    await expect(body).toHaveText('private draft!');
    const menu = page.getByRole('button', { name: 'Toggle navigation' });
    await menu.click();
    await page.getByRole('link', { name: 'Home', exact: true }).click();
    await page.getByRole('button', { name: 'Stay', exact: true }).click();
    await expect(body).toHaveText('private draft!');
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/docs/*', async (route) => {
      if (route.request().method() !== 'PATCH') return route.continue();
      const response = await route.fetch();
      await gate;
      await route.fulfill({ response });
    });
    await d.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(d.getByText('Doc saved', { exact: true })).toHaveCount(0);
    await expect(body).toHaveAttribute('contenteditable', 'false');
    await expect(d.getByLabel('Doc title', { exact: true })).toBeDisabled();
    release();
    await expect(d.getByText('Doc saved', { exact: true })).toBeVisible();
    await d.getByRole('button', { name: 'Edit', exact: true }).click();
    await body.fill('discard me');
    await d.getByRole('button', { name: /^Other/ }).click();
    await page.getByRole('button', { name: 'Discard draft', exact: true }).click();
    await expect(d.getByRole('heading', { name: 'Other', exact: true })).toBeVisible();
  } finally {
    await f.close();
  }
});

for (const status of [409, 503, 422, 401, 403, 404]) {
  test(`save ${status}: persistent recovery or private draft cleared`, async ({ page }) => {
    const f = await projectFixture(page);
    try {
      const d = await docs(page);
      await create(page, 'Private title');
      const body = d.getByRole('textbox', { name: 'Doc content' });
      await body.fill('secret draft');
      let releaseHistory!: () => void;
      const historyGate = new Promise<void>((resolve) => {
        releaseHistory = resolve;
      });
      let historyStarted!: () => void;
      const started = new Promise<void>((resolve) => {
        historyStarted = resolve;
      });
      await page.route('**/api/docs/*/versions', async (route) => {
        const response = await route.fetch();
        historyStarted();
        await historyGate;
        await route.fulfill({ response });
      });
      await d.getByRole('button', { name: 'History', exact: true }).click();
      await started;
      await page.route('**/api/docs/*', async (route) => {
        if (route.request().method() !== 'PATCH') return route.continue();
        await route.fulfill({
          status,
          json: { error: { code: status === 409 ? 'VERSION_CONFLICT' : 'REQUEST_DENIED' } },
        });
      });
      await d.getByRole('button', { name: 'Save', exact: true }).click();
      if ([401, 403, 404].includes(status)) {
        await expect(page.getByText('secret draft', { exact: true })).toHaveCount(0);
        const historyResponse = page.waitForResponse('**/api/docs/*/versions');
        releaseHistory();
        await historyResponse;
        await page.evaluate(
          () =>
            new Promise<void>((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
            ),
        );
        await expect(page.getByRole('dialog', { name: 'Doc history' })).toHaveCount(0);
        await expect(page.locator('input[value="Private title"]')).toHaveCount(0);
      } else {
        releaseHistory();
        const history = page.getByRole('dialog', { name: 'Doc history' });
        await expect(history).toBeVisible();
        await history.getByRole('button', { name: /Close/ }).click();
        await expect(body).toHaveText('secret draft');
        await expect(d.getByRole('alert').first()).toBeVisible();
        await body.press('End');
        await page.keyboard.type('!');
        await expect(d.getByRole('alert').first()).toBeVisible();
        await expect(d.getByText('Doc saved', { exact: true })).toHaveCount(0);
      }
    } finally {
      await f.close();
    }
  });
}
