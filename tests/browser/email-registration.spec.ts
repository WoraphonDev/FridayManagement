import { test, expect } from '@playwright/test';
import { rmSync } from 'node:fs';
import { startupFixture } from '../setup/fixtures.js';
import { startApplication } from '../../src/api/start.js';

test('email registration → pending → Admin approval/cancel/rejection → scoped login, desktop/mobile', async ({
  browser,
}) => {
  test.setTimeout(90000);
  const f = await startupFixture();
  let token = '';
  const app = await startApplication(f.env, {
    announceSetupToken: (v) => {
      token = v;
    },
  });
  const memberContext = await browser.newContext(),
    adminContext = await browser.newContext();
  const page = await memberContext.newPage(),
    admin = await adminContext.newPage();
  const password = 'Registration-browser-fixture-password';
  try {
    const setup = await admin.request.post(f.env.APP_ORIGIN + '/api/setup', {
      headers: { Origin: f.env.APP_ORIGIN },
      data: {
        token,
        organization_name: 'Registration fixture',
        username: 'RegistrationAdmin',
        display_name: 'Admin',
        password,
      },
    });
    expect(setup.status()).toBe(201);
    await page.goto(f.env.APP_ORIGIN);
    await page.getByRole('button', { name: 'Create an account', exact: true }).click();
    await page.setViewportSize({ width: 360, height: 900 });
    await page.getByLabel('Member name', { exact: true }).fill('สมาชิก ไทย 😀');
    await page.getByLabel('Email', { exact: true }).fill('New.Member@Example.invalid');
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Confirm password', { exact: true }).fill('Wrong-confirmation');
    await page.getByRole('button', { name: 'Register', exact: true }).click();
    await expect(page.getByText('Passwords do not match', { exact: true })).toBeVisible();
    await page.getByLabel('Confirm password', { exact: true }).fill(password);
    await page.screenshot({ path: 'reports/email-registration/signup-mobile.png', fullPage: true });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.getByRole('button', { name: 'Register', exact: true }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Registration received' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Back to sign in', exact: true }).click();
    await page.getByLabel('Username', { exact: true }).fill('new.member@example.invalid');
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Incorrect' })).toBeVisible();
    await admin.goto(f.env.APP_ORIGIN);
    await admin.getByLabel('Username', { exact: true }).fill('RegistrationAdmin');
    await admin.getByLabel('Password', { exact: true }).fill(password);
    await admin.getByRole('button', { name: 'Sign in', exact: true }).click();
    await admin.getByRole('link', { name: 'Admin', exact: true }).click();
    // Pending self-registrations route the Admin to Registrations instead of Activate.
    await admin.getByRole('button', { name: /^Review .* in Registrations$/ }).click();
    await expect(
      admin.getByRole('tab', { name: 'Registrations', exact: true }),
    ).toHaveAttribute('aria-selected', 'true');
    await expect(
      admin.getByRole('cell', { name: 'new.member@example.invalid', exact: true }),
    ).toBeVisible();
    await admin.getByRole('button', { name: 'Approve สมาชิก ไทย 😀', exact: true }).click();
    await admin.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(
      admin.getByRole('button', { name: 'Approve สมาชิก ไทย 😀', exact: true }),
    ).toBeVisible();
    await admin.setViewportSize({ width: 1440, height: 1000 });
    await admin.screenshot({
      path: 'reports/email-registration/admin-desktop.png',
      fullPage: true,
    });
    await admin.getByRole('button', { name: 'Approve สมาชิก ไทย 😀', exact: true }).click();
    await admin
      .getByRole('dialog')
      .getByRole('button', { name: 'Confirm approve', exact: true })
      .click();
    await expect(admin.getByText('Registration approved', { exact: true })).toBeVisible();
    await page.getByLabel('Username', { exact: true }).fill('NEW.MEMBER@EXAMPLE.INVALID');
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Profile of สมาชิก ไทย 😀', exact: true }),
    ).toBeVisible();
    const self = await page.request.get(f.env.APP_ORIGIN + '/api/me');
    const data = await self.json();
    expect(data.user.teams).toEqual([]);
    expect(data.effective_summary.project_ids).toEqual([]);
    expect(data.user.permission_keys).toEqual([]);
    expect((await page.request.get(f.env.APP_ORIGIN + '/api/registrations')).status()).toBe(403);
    await page.getByRole('button', { name: 'Profile of สมาชิก ไทย 😀', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click();
    await page.getByRole('button', { name: 'Create an account', exact: true }).click();
    await page.getByLabel('Member name', { exact: true }).fill('Rejected member');
    await page.getByLabel('Email', { exact: true }).fill('rejected@example.invalid');
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Confirm password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Register', exact: true }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Registration received' }),
    ).toBeVisible();
    await admin.getByRole('button', { name: 'Refresh registrations', exact: true }).click();
    await admin.setViewportSize({ width: 360, height: 900 });
    await expect(
      admin.getByRole('button', { name: 'Reject Rejected member', exact: true }),
    ).toBeVisible();
    expect(
      await admin.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await admin.screenshot({ path: 'reports/email-registration/admin-mobile.png', fullPage: true });
    await admin.getByRole('button', { name: 'Reject Rejected member', exact: true }).click();
    await admin
      .getByRole('dialog')
      .getByRole('button', { name: 'Confirm reject', exact: true })
      .click();
    await expect(admin.getByText('Registration rejected', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Back to sign in', exact: true }).click();
    await page.getByLabel('Username', { exact: true }).fill('rejected@example.invalid');
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Incorrect' })).toBeVisible();
  } finally {
    await memberContext.close();
    await adminContext.close();
    await app.stop();
    rmSync(f.root, { recursive: true, force: true });
  }
});
