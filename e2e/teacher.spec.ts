import { expect, test } from '@playwright/test';
import { installFixture, readStored } from './fixtures';

test('Teacher wizard distinguishes same-number Sections and stores the chosen stable ID in a draft', async ({ page }) => {
  await installFixture(page);
  await page.goto('/');
  await page.getByRole('button', { name: /อาจารย์คุมสอบ/ }).click();
  await page.getByRole('navigation', { name: 'เมนูอาจารย์ผู้สอน' }).getByRole('button', { name: 'จัดการสอบ' }).click();
  for (const hiddenName of ['E2E_UNAUTHORIZED_UNIQUE', 'E2E_UNRESOLVED_AMBIGUOUS', 'E2E_UNRESOLVED_MISSING']) {
    await expect(page.getByRole('row').filter({ hasText: hiddenName })).toHaveCount(0);
  }
  await page.getByRole('button', { name: 'สร้างการสอบ' }).first().click();
  await expect(page.getByRole('heading', { name: 'สร้างการสอบ' })).toBeVisible();
  await page.getByLabel('รายวิชา *').selectOption('crs_0001');
  await expect(page.getByLabel('รายวิชา *').locator('option', { hasText: 'QA998' })).toHaveCount(0);
  const sectionSelect = page.getByLabel('Section *');
  const options = await sectionSelect.locator('option').allTextContents();
  expect(options).toContain('ตอนเรียน 1 | ภาคการศึกษา 1 / ปีการศึกษา 2569');
  expect(options).toContain('ตอนเรียน 1 | ภาคการศึกษา 2 / ปีการศึกษา 2568');
  expect(options.every((option) => !option.includes(' ? '))).toBe(true);
  await sectionSelect.selectOption('fixture-section-period-2');
  await page.getByRole('button', { name: 'บันทึกร่าง' }).click();
  await expect.poll(async () => {
    const drafts = await readStored<Array<{ state: { sectionId?: string } }>>(page, 'securelab_teacher_exam_drafts_v1');
    return drafts?.some((draft) => draft.state.sectionId === 'fixture-section-period-2');
  }).toBe(true);
});

test('Teacher creates a canonical Exam through the six-step Wizard', async ({ page }) => {
  test.setTimeout(60_000);
  await installFixture(page);
  await page.goto('/');
  await page.getByRole('button', { name: /อาจารย์คุมสอบ/ }).click();
  await page.getByRole('navigation', { name: 'เมนูอาจารย์ผู้สอน' }).getByRole('button', { name: 'จัดการสอบ' }).click();
  await page.getByRole('button', { name: 'สร้างการสอบ' }).first().click();
  await page.getByLabel('รายวิชา *').selectOption('crs_0001');
  await page.getByLabel('Section *').selectOption('fixture-section-period-2');
  await page.getByRole('button', { name: 'ถัดไป' }).click();
  await expect(page.getByRole('heading', { name: 'ผู้เข้าสอบ' })).toBeVisible();
  await page.getByRole('button', { name: 'ถัดไป' }).click();
  await expect(page.getByRole('heading', { name: 'วันเวลาและห้องสอบ' })).toBeVisible();
  await page.getByLabel('วันที่สอบ *').fill('2030-01-15');
  await page.getByRole('button', { name: /B4-01B ชั้น 4/ }).click();
  await page.getByRole('button', { name: 'ถัดไป' }).click();
  await expect(page.getByRole('heading', { name: 'รูปแบบการสอบ' })).toBeVisible();
  await page.getByRole('button', { name: 'ถัดไป' }).click();
  for (let index = 0; index < 4; index += 1) {
    await page.getByRole('button', { name: index === 3 ? 'ไปตรวจสอบและบันทึก' : 'ถัดไป' }).click();
  }
  await expect(page.getByRole('heading', { name: 'ตรวจสอบและบันทึก' })).toBeVisible();
  const before = await readStored<Array<{ id: string }>>(page, 'securelab_exams');
  await page.getByRole('button', { name: 'สร้างการสอบ' }).last().click();
  await expect.poll(async () => (await readStored<Array<{ id: string }>>(page, 'securelab_exams')).length).toBe(before.length + 1);
  const after = await readStored<Array<{ id: string; sectionId?: string; courseId: string }>>(page, 'securelab_exams');
  const created = after.find((exam) => !before.some((old) => old.id === exam.id));
  expect(created?.courseId).toBe('crs_0001');
  expect(created?.sectionId).toBe('fixture-section-period-2');
  const row = page.getByRole('row').filter({ hasText: '2030-01-15' });
  await row.getByRole('button', { name: /แก้ไข/ }).click();
  await expect(page.getByRole('heading', { name: 'แก้ไขการสอบ' })).toBeVisible();
  await expect(page.getByLabel('Section *')).toHaveValue('fixture-section-period-2');
  await page.getByRole('button', { name: 'ถัดไป' }).click();
  await page.getByRole('button', { name: 'ถัดไป' }).click();
  await page.getByRole('button', { name: 'ถัดไป' }).click();
  await page.getByRole('button', { name: 'ถัดไป' }).click();
  for (let index = 0; index < 4; index += 1) {
    await page.getByRole('button', { name: index === 3 ? 'ไปตรวจสอบและบันทึก' : 'ถัดไป' }).click();
  }
  await page.getByRole('button', { name: 'บันทึกการแก้ไข' }).click();
  const afterEdit = await readStored<Array<{ id: string; sectionId?: string }>>(page, 'securelab_exams');
  expect(afterEdit).toHaveLength(after.length);
  expect(afterEdit.find((exam) => exam.id === created?.id)?.sectionId).toBe('fixture-section-period-2');
});
