import { expect, test } from '@playwright/test';
import type { Admin, Course, Teacher } from '../src/types';
import { readStored } from './fixtures';

test('Admin creates unique Course and account IDs after deleting a middle Teacher', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/');
  await page.getByRole('button', { name: /ผู้ดูแลระบบส่วนกลาง/ }).click();
  const navigation = page.getByRole('navigation', { name: 'เมนูผู้ดูแลระบบ' });
  await navigation.getByRole('button', { name: 'จัดการรายวิชาและตอนเรียน' }).click();
  for (const code of ['QA771', 'QA772']) {
    await page.getByRole('button', { name: 'เพิ่มรายวิชา' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'เพิ่มรายวิชาใหม่' });
    await dialog.getByLabel(/รหัสวิชา \(Course Code\)/).fill(code);
    await dialog.getByLabel(/ชื่อวิชา \(Course Title\)/).fill(`ทดสอบ ${code}`);
    await dialog.getByRole('button', { name: 'บันทึกรายวิชา' }).click();
    await expect(dialog).toBeHidden();
  }
  const courses = await readStored<Course[]>(page, 'securelab_courses');
  const createdCourses = courses.filter((course) => ['QA771', 'QA772'].includes(course.courseCode));
  expect(createdCourses).toHaveLength(2);
  expect(new Set(createdCourses.map((course) => course.id)).size).toBe(2);

  await navigation.getByRole('button', { name: 'จัดการผู้ใช้งาน', exact: true }).click();
  await navigation.getByRole('button', { name: 'อาจารย์', exact: true }).click();
  const createTeacher = async (code: string) => {
    // Close visible notifications through their existing UI before using the header action.
    const closeNotifications = page.locator('div.pointer-events-auto > button');
    while (await closeNotifications.count()) await closeNotifications.first().click();
    await page.getByRole('button', { name: 'เพิ่มอาจารย์' }).click();
    const dialog = page.getByRole('dialog', { name: 'เพิ่มผู้ใช้งาน' });
    await dialog.getByLabel('รหัสประจำตัว').fill(code);
    await dialog.getByLabel('ชื่อ-นามสกุล').fill(`อาจารย์ทดสอบ ${code}`);
    await dialog.getByLabel('อีเมลมหาวิทยาลัย').fill(`${code.toLowerCase()}@itm.kmutnb.ac.th`);
    await dialog.getByLabel(/คณะ/).selectOption('faculty-001');
    await dialog.getByLabel(/ภาควิชา/).selectOption('department_it');
    await dialog.getByRole('button', { name: 'สร้างบัญชีผู้ใช้' }).click();
    await expect(dialog).toBeHidden();
    const teachers = await readStored<Teacher[]>(page, 'securelab_teachers');
    return teachers.find((teacher) => teacher.teacherCode === code)!.id;
  };
  const first = await createTeacher('QA-T101');
  const second = await createTeacher('QA-T102');
  await page.getByPlaceholder('ค้นหาด้วยรหัสประจำตัว, ชื่อ-นามสกุล, อีเมล หรือภาควิชา...').fill('QA-T101');
  await page.getByRole('row').filter({ hasText: 'QA-T101' }).getByRole('button', { name: 'ลบ' }).click();
  const deleteDialog = page.getByRole('dialog', { name: 'ยืนยันการลบผู้ใช้งาน' });
  await deleteDialog.getByRole('button', { name: 'ลบผู้ใช้งาน' }).click();
  await expect(deleteDialog).toBeHidden();
  await page.getByPlaceholder('ค้นหาด้วยรหัสประจำตัว, ชื่อ-นามสกุล, อีเมล หรือภาควิชา...').fill('');
  const third = await createTeacher('QA-T103');
  expect(new Set([first, second, third]).size).toBe(3);
  const teachers = await readStored<Teacher[]>(page, 'securelab_teachers');
  expect(teachers.some((teacher) => teacher.id === first)).toBe(false);
  expect(teachers.some((teacher) => teacher.id === second)).toBe(true);
  expect(teachers.some((teacher) => teacher.id === third)).toBe(true);

  await navigation.getByRole('button', { name: 'ผู้ดูแลระบบ', exact: true }).click();
  await page.getByRole('button', { name: 'เพิ่มผู้ดูแลระบบ' }).click();
  const adminDialog = page.getByRole('dialog', { name: 'เพิ่มผู้ใช้งาน' });
  await adminDialog.getByLabel('รหัสประจำตัว').fill('QA-A101');
  await adminDialog.getByLabel('ชื่อ-นามสกุล').fill('ผู้ดูแลทดสอบ');
  await adminDialog.getByLabel('อีเมลมหาวิทยาลัย').fill('qa-a101@itm.kmutnb.ac.th');
  await adminDialog.getByRole('button', { name: 'สร้างบัญชีผู้ใช้' }).click();
  await expect(adminDialog).toBeHidden();
  const admins = await readStored<Admin[]>(page, 'securelab_admins');
  expect(admins.find((admin) => admin.adminCode === 'QA-A101')?.id).toBeTruthy();
  expect(new Set(admins.map((admin) => admin.id)).size).toBe(admins.length);
});
