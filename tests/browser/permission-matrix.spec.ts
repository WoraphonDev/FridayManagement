import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { SqliteDatabase } from '../../src/repository/sqlite/database.js';
import { sql } from '../../src/repository/access-scope.js';
import { fixture, mutate } from './task-workspace-fixtures.js';

test('T082 vertical permissions: frozen labels/member headers, horizontal members, save and conflict', async ({
  page,
}) => {
  const f = await fixture(page);
  try {
    const db = new SqliteDatabase(f.path);
    try {
      await db.transaction(async (tx) => {
        for (let id = 2; id <= 19; id++) {
          await tx.execute(
            sql(
              'INSERT INTO dbo.users(id,username,display_name,password_hash,must_change_password) SELECT @id,@username,@name,password_hash,0 FROM dbo.users WHERE id=1',
              { id, username: `matrix${id}`, name: `Member ${id}` },
            ),
          );
          await tx.execute(
            sql('INSERT INTO dbo.user_view_revisions(user_id,revision) VALUES(@id,@revision)', {
              id,
              revision: randomUUID(),
            }),
          );
        }
      });
    } finally {
      await db.close();
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByRole('link', { name: 'Admin', exact: true }).click();
    await page.getByRole('tab', { name: 'Permissions', exact: true }).click();
    const region = page.getByRole('region', { name: 'Permission matrix', exact: true });
    await expect(region.locator('tbody tr')).toHaveCount(10);
    await expect(region.locator('thead th')).toHaveCount(20);
    await expect(region.getByRole('rowheader').first()).toContainText('P-01');
    await expect(
      region.getByRole('columnheader', { name: 'Select Member 2 Member 2', exact: true }),
    ).toBeVisible();
    await expect(
      region.getByRole('checkbox', { name: 'Select Workspace Admin', exact: true }),
    ).toBeDisabled();
    const before = await region.evaluate((node) => {
      const permission = node.querySelector('tbody th')!.getBoundingClientRect();
      const member = node.querySelector('thead th:nth-child(2)')!.getBoundingClientRect();
      return {
        x: permission.x,
        y: member.y,
        memberX: member.x,
        overflow: node.scrollWidth > node.clientWidth,
      };
    });
    expect(before.overflow).toBe(true);
    await region.evaluate((node) => {
      node.scrollLeft = 640;
      node.scrollTop = 150;
    });
    const after = await region.evaluate((node) => {
      const permission = node.querySelector('tbody th')!.getBoundingClientRect();
      const member = node.querySelector('thead th:nth-child(2)')!.getBoundingClientRect();
      return {
        x: permission.x,
        y: member.y,
        memberX: member.x,
        scrollLeft: node.scrollLeft,
        scrollTop: node.scrollTop,
        top: node.getBoundingClientRect().top,
      };
    });
    expect(after.scrollLeft).toBeGreaterThan(0);
    expect(after.scrollTop).toBeGreaterThan(0);
    expect(Math.abs(after.x - before.x)).toBeLessThan(2);
    expect(after.memberX).toBeLessThan(before.memberX - 500);
    expect(Math.abs(after.y - after.top)).toBeLessThan(3);
    await page.screenshot({
      path: 'reports/UI-permissions-vertical-desktop.png',
      animations: 'disabled',
    });
    await region.evaluate((node) => {
      node.scrollLeft = 0;
      node.scrollTop = 0;
    });
    await region.getByRole('checkbox', { name: 'Select all visible users', exact: true }).check();
    await expect(
      region.getByRole('checkbox', { name: 'Select all visible users', exact: true }),
    ).toBeChecked();
    await page
      .getByRole('button', { name: 'Apply PM/SM preset to selected (18)', exact: true })
      .click();
    await expect(
      region.getByRole('checkbox', {
        name: 'P-01 Edit project name/description for Member 2',
        exact: true,
      }),
    ).toBeChecked();
    await page.getByRole('button', { name: 'Cancel changes', exact: true }).click();
    await expect(
      region.getByRole('checkbox', {
        name: 'P-01 Edit project name/description for Member 2',
        exact: true,
      }),
    ).not.toBeChecked();
    await region
      .getByRole('checkbox', { name: 'P-08 Create projects for Member 2', exact: true })
      .check();
    await page.screenshot({
      path: 'reports/UI-permissions-colored-actions.png',
      animations: 'disabled',
    });
    await page.getByRole('button', { name: 'Review & Save 1 change(s)', exact: true }).click();
    let dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Member 2 · add P-08');
    await page.screenshot({
      path: 'reports/UI-permissions-save-cancel.png',
      animations: 'disabled',
    });
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(
      region.getByRole('checkbox', { name: 'P-08 Create projects for Member 2', exact: true }),
    ).toBeChecked();
    const unchanged = await page.request.get(`${f.env.APP_ORIGIN}/api/users/2/permissions`);
    expect(unchanged.status()).toBe(200);
    expect((await unchanged.json()).keys).toEqual([]);
    await page.getByRole('button', { name: 'Review & Save 1 change(s)', exact: true }).click();
    await dialog.getByRole('button', { name: 'Save 1 change(s)', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await page.reload();
    await page.getByRole('tab', { name: 'Permissions', exact: true }).click();
    await expect(
      region.getByRole('checkbox', { name: 'P-08 Create projects for Member 2', exact: true }),
    ).toBeChecked();
    await expect(
      region.getByRole('checkbox', { name: 'P-08 Create projects for Member 3', exact: true }),
    ).not.toBeChecked();
    await region
      .getByRole('checkbox', { name: 'P-09 Team workload for Member 2', exact: true })
      .check();
    const changed = await mutate(
      page,
      '/api/users/2/permissions',
      { keys: ['P-10'], permissions_version: 2 },
      'PUT',
    );
    expect(changed.status).toBe(200);
    await page.getByRole('button', { name: 'Review & Save 1 change(s)', exact: true }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Save 1 change(s)', exact: true }).click();
    await expect(
      page.getByText('No changes were saved. Some users changed meanwhile; reload them first.'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Reload matrix', exact: true }).click();
    await expect(
      region.getByRole('checkbox', { name: 'P-10 Team reports for Member 2', exact: true }),
    ).toBeChecked();
    await page.setViewportSize({ width: 360, height: 900 });
    await region.evaluate((node) => {
      node.scrollLeft = 468;
      node.scrollTop = 150;
    });
    const mobile = await region.evaluate((node) => ({
      left: node.querySelector('tbody th')!.getBoundingClientRect().left,
      containerLeft: node.getBoundingClientRect().left,
      scroll: node.scrollLeft,
      pageOverflow: document.documentElement.scrollWidth > window.innerWidth,
    }));
    expect(mobile.scroll).toBeGreaterThan(0);
    expect(Math.abs(mobile.left - mobile.containerLeft)).toBeLessThan(3);
    expect(mobile.pageOverflow).toBe(false);
    await page.screenshot({
      path: 'reports/UI-permissions-vertical-mobile.png',
      animations: 'disabled',
    });
  } finally {
    await f.close();
  }
});
