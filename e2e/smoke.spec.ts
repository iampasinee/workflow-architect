import { expect, test } from '@playwright/test';

test('isolated Chromium renders SecureLab, interacts and retains controlled storage after reload', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: /ระบบสแกนใบหน้าและติดตาม/ })).toBeVisible();
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await expect(page.getByRole('heading', { name: 'เข้าสู่ระบบ SecureLab' })).toBeVisible();
  await page.evaluate(() => localStorage.setItem('securelab_e2e_smoke', 'isolated'));
  await page.reload();
  await expect(page.getByRole('heading', { name: /ระบบสแกนใบหน้าและติดตาม/ })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('securelab_e2e_smoke'))).toBe('isolated');
  expect(consoleErrors).toEqual([]);
});
