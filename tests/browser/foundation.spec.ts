import { test, expect } from '@playwright/test';
test('Built shell renders with no credentials/write controls and no browser errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'พื้นที่ทำงานของทีม' })).toBeVisible();
  await expect(
    page.getByText('ฟังก์ชันงานส่วนอื่นยังอยู่ระหว่างพัฒนา', { exact: false }),
  ).toBeVisible();
  await expect(page.locator('input, form')).toHaveCount(0);
  await page.setViewportSize({ width: 360, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(errors).toEqual([]);
});
