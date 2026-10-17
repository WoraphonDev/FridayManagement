import { test, expect } from '@playwright/test';
import { projectFixture, mutate } from './task-workspace-fixtures.js';
import { signOut } from './ui-actions';
// Steps from TeamFlow_Test_Cases that no earlier spec exercised; titles carry the TC ID so the
// TC/AT evidence map (scripts/tcat-map.mjs) links them explicitly.

test('TC-006 UI logout: Back cannot reopen the task and the old cookie is refused', async ({
  page,
  context,
}) => {
  const f = await projectFixture(page);
  try {
    const made = await mutate(page, '/api/tasks', { project_id: 1, title: 'Logout private task' });
    expect(made.status).toBe(201);
    await page.goto(`${f.env.APP_ORIGIN}/projects/1/tasks/${made.body.item.id}`);
    await expect(page.getByRole('dialog', { name: 'Task details', exact: true })).toBeVisible();
    const oldCookies = await context.cookies();
    expect(oldCookies.some((c) => c.name === 'friday_session')).toBe(true);
    // The task dialog is modal; close it, then sign out from the profile menu.
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Task details', exact: true })).toHaveCount(0);
    await signOut(page);
    await expect(page.getByRole('heading', { name: 'Welcome back', exact: true })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('heading', { name: 'Welcome back', exact: true })).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Task details', exact: true })).toHaveCount(0);
    await expect(page.getByText('Logout private task')).toHaveCount(0);
    // Replay the pre-logout cookie outside the browser jar: the session is revoked server-side.
    const session = oldCookies.find((c) => c.name === 'friday_session')!;
    const replay = await page.request.get(`${f.env.APP_ORIGIN}/api/me`, {
      headers: { Cookie: `friday_session=${session.value}` },
    });
    expect(replay.status()).toBe(401);
    const task = await page.request.get(`${f.env.APP_ORIGIN}/api/tasks/${made.body.item.id}`, {
      headers: { Cookie: `friday_session=${session.value}` },
    });
    expect(task.status()).toBe(401);
  } finally {
    await f.close();
  }
});

for (const timezoneId of ['America/Los_Angeles', 'Pacific/Kiritimati']) {
  test.describe(`TC-047 browser timezone ${timezoneId}`, () => {
    test.use({ timezoneId });
    test(`TC-047 date-only End Plan stays on its calendar day in ${timezoneId}`, async ({
      page,
    }) => {
      const f = await projectFixture(page);
      try {
        const self = await (await page.request.get(`${f.env.APP_ORIGIN}/api/me`)).json();
        const today = self.bangkok_today as string;
        const due = `${today.slice(0, 8)}05`;
        const made = await mutate(page, '/api/tasks', {
          project_id: 1,
          title: 'TC-047 date-only',
          due_date: due,
        });
        expect(made.status).toBe(201);
        await page.goto(`${f.env.APP_ORIGIN}/calendar`);
        const calendar = page
          .getByRole('region', { name: 'Work calendar', exact: true })
          .getByRole('region', { name: 'Calendar', exact: true });
        // The Bangkok "today" marker and the date-only event use server dates, not the browser zone.
        await expect(calendar.locator('time[aria-current="date"]')).toHaveAttribute(
          'datetime',
          today,
        );
        const day = calendar
          .locator('.calendar-day')
          .filter({ has: page.locator(`time[datetime="${due}"]`) });
        await expect(day.getByRole('button', { name: /TC-047 date-only/ })).toBeVisible();
        await expect(calendar.getByRole('button', { name: /TC-047 date-only/ })).toHaveCount(1);
      } finally {
        await f.close();
      }
    });
  });
}
