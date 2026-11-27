import { expect, test } from '@playwright/test';

test('Admin reads legacy audit evidence without fabricated cryptographic verification', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('securelab_audit_log', JSON.stringify([
    { id: 'legacy-example', performedBy: 'Legacy Admin', role: 'Admin', action: 'ทดสอบประวัติ', timestamp: '10:00', target: 'student-old' },
  ])));
  await page.goto('/');
  await page.getByRole('button', { name: /ผู้ดูแลระบบส่วนกลาง/ }).click();
  await page.getByRole('navigation', { name: 'เมนูผู้ดูแลระบบ' }).getByRole('button', { name: 'บันทึกประวัติระบบ' }).click();
  const row = page.getByRole('row').filter({ hasText: 'ทดสอบประวัติ' });
  await expect(row).toContainText('Legacy Admin');
  await expect(row).toContainText('ไม่ทราบผล');
  await expect(page.getByText(/ลงลายมือชื่อดิจิทัลเข้ารหัสด้วย/)).toHaveCount(0);
});
