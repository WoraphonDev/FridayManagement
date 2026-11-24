import { test, expect, type Locator, type Page } from '@playwright/test';
import { projectFixture, tasks, mutate } from './task-workspace-fixtures.js';

// DEL-VALIDATION / D11: client counting equals the server (UTF-16 units after the
// server's own trim). Inserted text is limited at grapheme boundaries, IME composition
// is never limited or validated mid-way, and stored content is never truncated.
const thai = 'ที่'; // 3 units, one grapheme
async function compose(field: Locator, value: string) {
  await field.evaluate((el, v) => {
    const input = el as HTMLInputElement | HTMLTextAreaElement;
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }));
    const proto = Object.getPrototypeOf(input) as object;
    Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(input, v);
    input.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        isComposing: true,
        data: v,
        inputType: 'insertCompositionText',
      }),
    );
  }, value);
}
const endComposition = (field: Locator) =>
  field.evaluate((el) =>
    el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '' })),
  );
async function docs(page: Page) {
  const region = await tasks(page);
  await region.getByRole('button', { name: 'Docs', exact: true }).click();
  return page.locator('.project-docs');
}

test('DEL-VALIDATION project name: Thai marks and emoji never split, at-limit count matches server', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    await page.getByRole('link', { name: 'All projects', exact: true }).click();
    await page.getByRole('button', { name: 'Create project', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Create project', exact: true });
    const name = modal.getByLabel('Project Name', { exact: true });
    const hint = modal.locator('#entity-name-detail');
    const atLimit = thai.repeat(33) + 'a'; // 100 UTF-16 units, 34 graphemes
    await name.fill(atLimit + thai);
    await expect(name).toHaveValue(atLimit);
    await expect(hint).toHaveText(
      '100/100 · Thai vowel/tone marks count separately; emoji count 2 or more',
    );
    await name.fill('a'.repeat(99) + '😀');
    await expect(name).toHaveValue('a'.repeat(99));
    await expect(hint).toHaveText('99/100');
    await name.fill('a'.repeat(98) + '😀👨‍👩‍👧');
    await expect(name).toHaveValue('a'.repeat(98) + '😀');
    await name.fill(`  ${atLimit}  `); // the server trims names; padding is not counted
    await expect(name).toHaveValue(`  ${atLimit}  `);
    await expect(hint).toContainText('100/100');
    await name.fill(atLimit);
    // The wrapping label's name absorbs the value once filled; use the stable id.
    const detail = modal.locator('#entity-description');
    await detail.fill('😀'.repeat(1000) + '😀');
    await expect(detail).toHaveValue('😀'.repeat(1000));
    await expect(modal.locator('#entity-description-detail')).toContainText('2000/2000');
    await modal.getByLabel('Owner team', { exact: true }).selectOption('1');
    await modal.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(modal).not.toBeVisible();
    const list = await (await page.request.get(f.env.APP_ORIGIN + '/api/projects')).json();
    expect(list.items.find((p: { name: string }) => p.name === atLimit)?.description).toBe(
      '😀'.repeat(1000),
    );
  } finally {
    await f.close();
  }
});

test('DEL-VALIDATION task title: IME is not limited mid-composition; summary links the field and keeps the draft', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    expect(
      (await mutate(page, '/api/tasks', { project_id: f.project.id, title: 'IME' })).status,
    ).toBe(201);
    const region = await tasks(page);
    await region.getByRole('button', { name: 'Open task #1', exact: true }).click();
    const d = page.getByRole('dialog', { name: /^Task details$/ });
    const title = d.getByLabel('Task title', { exact: true });
    const save = d.getByRole('button', { name: 'Save task', exact: true });
    const summary = d.locator('.field-error-summary');
    await title.fill('a'.repeat(198));
    await compose(title, 'a'.repeat(198) + 'にほんご');
    await expect(title).toHaveValue('a'.repeat(198) + 'にほんご');
    await expect(summary).toHaveCount(0);
    await expect(d.getByText(/remove \d+ to save/)).toHaveCount(0);
    await endComposition(title);
    const link = summary.getByRole('link', { name: 'Task title is 202/200 — remove 2 to save' });
    await expect(link).toBeVisible();
    await expect(title).toHaveAttribute('aria-invalid', 'true');
    await expect(save).toBeDisabled();
    await d.getByLabel('Details', { exact: true }).focus();
    await link.click();
    await expect(title).toBeFocused();
    await expect(title).toHaveValue('a'.repeat(198) + 'にほんご'); // draft retained
    await title.press('End');
    await title.press('Backspace');
    await title.press('Backspace');
    await expect(summary).toHaveCount(0);
    await expect(d.locator('#task-title-detail')).toHaveText('200/200');
    await save.click();
    await expect(d.getByText('Task saved', { exact: true })).toBeVisible();
    const stored = await (await page.request.get(f.env.APP_ORIGIN + '/api/tasks/1')).json();
    expect(stored.item.title).toBe('a'.repeat(198) + 'にほ');
  } finally {
    await f.close();
  }
});

test('DEL-VALIDATION doc title: stored at-limit Thai content is never truncated; typing cannot grow it', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    // DB CHECKs and response schemas already bound stored text, so the realistic legacy
    // case is stored content at the limit; the input must keep it intact and unsplit.
    const stored = thai.repeat(66) + 'ab'; // 200 units, 68 graphemes
    const made = await mutate(page, `/api/projects/${f.project.id}/docs`, {
      title: stored,
      body_html: '<p></p>',
    });
    expect(made.status).toBe(201);
    const view = await docs(page);
    await view.locator('aside li button').first().click();
    await view.getByRole('button', { name: 'Edit', exact: true }).click();
    const title = view.getByLabel('Doc title', { exact: true });
    await expect(title).toHaveValue(stored);
    await expect(view.locator('#doc-title-detail')).toHaveText(
      '200/200 · Thai vowel/tone marks count separately; emoji count 2 or more',
    );
    await title.press('End');
    await title.pressSequentially('x');
    await expect(title).toHaveValue(stored);
    await title.fill(`  ${stored}`); // padding is trimmed by the server, so it is allowed
    await expect(title).toHaveValue(`  ${stored}`);
    await view.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Doc saved', { exact: true })).toBeVisible();
    const latest = await (
      await page.request.get(f.env.APP_ORIGIN + `/api/docs/${made.body.item.id}`)
    ).json();
    expect(latest.item.title).toBe(stored);
    await page.getByRole('button', { name: '+ New doc', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'New doc', exact: true });
    const fresh = dialog.getByLabel('Doc title', { exact: true });
    await fresh.fill('a'.repeat(199) + '📝');
    await expect(fresh).toHaveValue('a'.repeat(199));
    await expect(dialog.locator('#new-doc-title-detail')).toHaveText('199/200');
  } finally {
    await f.close();
  }
});
