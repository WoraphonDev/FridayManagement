import { test, expect } from '@playwright/test';
import { projectFixture, mutate } from './task-workspace-fixtures.js';

test('Teams colorful: archive filter, card keyboard, team Save, stationary tabs, workload drilldown, mobile and reduced motion', async ({
  page,
}) => {
  const f = await projectFixture(page);
  try {
    expect(
      (
        await mutate(
          page,
          '/api/teams/1',
          {
            version: 1,
            name: 'Digital Experience',
            description: 'Design and development · ทีม Development',
          },
          'PATCH',
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await mutate(
          page,
          '/api/teams/1/members/1',
          { version: 2, team_role: 'member', team_position: 'pm' },
          'PUT',
        )
      ).status,
    ).toBe(200);
    for (const name of ['Operations', 'Archived team']) {
      const team = await mutate(page, '/api/teams', {
        name,
        description: 'Team description · รายละเอียดทีม',
      });
      expect(team.status).toBe(201);
      if (name === 'Archived team')
        expect(
          (
            await mutate(
              page,
              `/api/teams/${team.body.item.id}`,
              { version: 1, archived: true },
              'PATCH',
            )
          ).status,
        ).toBe(200);
    }
    const today = await page.evaluate(
      async () => (await (await fetch('/api/me')).json()).bangkok_today,
    );
    expect(
      (
        await mutate(page, '/api/tasks', {
          project_id: f.project.id,
          title: 'Team workload fixture',
          due_date: today,
          assignee_ids: [1],
        })
      ).status,
    ).toBe(201);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(f.env.APP_ORIGIN + '/teams');
    const cards = page.locator('.team-card');
    await expect(cards).toHaveCount(2);
    await page.getByLabel('Include archived', { exact: true }).check();
    await expect(cards).toHaveCount(3);
    await expect(page.locator('.team-card.archived')).toContainText('Archived · Read only');
    await expect
      .poll(() =>
        cards.evaluateAll((items) => items.every((el) => getComputedStyle(el).opacity === '1')),
      )
      .toBe(true);
    await page.screenshot({
      path: 'reports/UI-teams-colorful-desktop.png',
      fullPage: true,
      animations: 'disabled',
    });
    await page.setViewportSize({ width: 360, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: 'reports/UI-teams-colorful-mobile.png',
      fullPage: true,
      animations: 'disabled',
    });
    await page.getByLabel('Include archived', { exact: true }).uncheck();
    await expect(cards).toHaveCount(2);
    await page.setViewportSize({ width: 1440, height: 1000 });
    const title = page.getByRole('button', { name: 'Digital Experience', exact: true });
    await title.focus();
    await page.keyboard.press('Enter');
    const details = page.getByRole('region', { name: 'Team details', exact: true });
    const tabs = details.getByRole('tablist', { name: 'Team sections', exact: true });
    await expect(
      details.getByRole('heading', { name: 'Digital Experience', exact: true }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page
          .locator('.content > section')
          .evaluate((el) => el.getAnimations().filter((a) => a.playState === 'running').length),
      )
      .toBe(0);
    const y = (await tabs.boundingBox())!.y;
    await page.screenshot({
      path: 'reports/UI-team-info-colorful-desktop.png',
      fullPage: true,
      animations: 'disabled',
    });
    await details.getByRole('button', { name: 'Edit team info', exact: true }).click();
    const edit = page.getByRole('dialog');
    await edit
      .getByRole('textbox', { name: 'Team Description', exact: true })
      .fill('ทีม Development · Updated description');
    await edit.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(edit).toHaveCount(0);
    await expect(details.locator('.team-description')).toHaveText(
      'ทีม Development · Updated description',
    );
    await tabs.getByRole('tab', { name: /^Members/ }).click();
    const members = details.getByRole('tabpanel', { name: /^Members/ });
    await expect(members.getByRole('cell', { name: 'PM', exact: true })).toBeVisible();
    await expect(members.getByRole('cell', { name: 'Member', exact: true })).toBeVisible();
    expect((await tabs.boundingBox())!.y).toBe(y);
    await page.screenshot({
      path: 'reports/UI-team-members-colorful-desktop.png',
      fullPage: true,
      animations: 'disabled',
    });
    await tabs.getByRole('tab', { name: 'Workload', exact: true }).click();
    const workload = details.getByRole('region', { name: 'Team workload', exact: true });
    const count = workload.getByRole('button', { name: /Workspace Admin: 1 tasks in week of/ });
    await expect(count).toBeVisible();
    expect((await tabs.boundingBox())!.y).toBe(y);
    await page.screenshot({
      path: 'reports/UI-team-workload-colorful-desktop.png',
      fullPage: true,
      animations: 'disabled',
    });
    await count.click();
    await expect(
      page.getByRole('dialog').getByRole('link', { name: 'Team workload fixture', exact: true }),
    ).toBeVisible();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Close dialog', exact: true })
      .click();
    await page.setViewportSize({ width: 360, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const mobileY = (await tabs.boundingBox())!.y;
    await tabs.getByRole('tab', { name: /^Members/ }).click();
    await expect(members.getByRole('cell', { name: 'PM', exact: true })).toBeVisible();
    expect((await tabs.boundingBox())!.y).toBe(mobileY);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: 'reports/UI-team-members-colorful-mobile.png',
      fullPage: true,
      animations: 'disabled',
    });
    await members.getByRole('button', { name: 'Add member', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
    await tabs.getByRole('tab', { name: 'Team info', exact: true }).click();
    await expect(tabs.getByRole('tab', { name: 'Team info', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(details.locator('.team-description')).toBeVisible();
    await page.screenshot({
      path: 'reports/UI-team-info-colorful-mobile.png',
      fullPage: true,
      animations: 'disabled',
    });
    await page.reload();
    await expect(details.locator('.team-description')).toHaveText(
      'ทีม Development · Updated description',
    );
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await details.getByRole('button', { name: /Back to teams/ }).click();
    await expect(cards).toHaveCount(2);
    expect(
      await cards.first().evaluate((el) => parseFloat(getComputedStyle(el).animationDuration)),
    ).toBeLessThan(0.001);
  } finally {
    await f.close();
  }
});
