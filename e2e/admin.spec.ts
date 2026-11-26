import { expect, test } from '@playwright/test';
import type { Course, ExamSession, SeatAssignment, Submission } from '../src/types';
import { installFixture, readStored } from './fixtures';

async function openAdminCourses(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /ผู้ดูแลระบบส่วนกลาง/ }).click();
  await page.getByRole('navigation', { name: 'เมนูผู้ดูแลระบบ' }).getByRole('button', { name: 'จัดการรายวิชาและตอนเรียน' }).click();
  await page.getByRole('tab', { name: /ตอนเรียน/ }).click();
}

for (const status of ['upcoming', 'in_progress', 'completed'] as const) {
  test(`Admin rejects ${status} Exam Section reassignment without partial persistence`, async ({ page }) => {
    const { exams } = await installFixture(page, status);
    await openAdminCourses(page);
    await expect.poll(async () => (await readStored<ExamSession[]>(page, 'securelab_exams'))?.length).toBe(exams.length);
    await page.getByPlaceholder('ค้นหาด้วยรหัสวิชา หรือชื่อวิชา...').fill('CS301');
    const row = page.getByRole('row').filter({ hasText: 'CS301' }).filter({ hasText: 'ภาคที่ 1 / 2569' }).filter({ hasText: 'ตอนเรียนที่ 1' });
    await expect(row).toHaveCount(1);
    await row.getByRole('button', { name: 'แก้ไข' }).click();
    const dialog = page.getByRole('dialog', { name: 'แก้ไขตอนเรียน' });
    const before = {
      courses: await readStored<Course[]>(page, 'securelab_courses'),
      exams: await readStored<ExamSession[]>(page, 'securelab_exams'),
      seats: await readStored<SeatAssignment[]>(page, 'securelab_seat_assignments'),
      submissions: await readStored<Submission[]>(page, 'securelab_submissions'),
    };
    await dialog.getByLabel(/รายวิชา \(Course\)/).selectOption('fixture-course-target');
    await dialog.getByRole('button', { name: 'เปิดตอนเรียน' }).click();
    await expect(dialog.getByRole('alert')).toContainText('ไม่สามารถย้ายตอนเรียนไปยังรายวิชาอื่นได้');
    expect(await readStored<Course[]>(page, 'securelab_courses')).toEqual(before.courses);
    expect(await readStored<ExamSession[]>(page, 'securelab_exams')).toEqual(before.exams);
    expect(await readStored<SeatAssignment[]>(page, 'securelab_seat_assignments')).toEqual(before.seats);
    expect(await readStored<Submission[]>(page, 'securelab_submissions')).toEqual(before.submissions);
    await page.reload();
    expect(await readStored<Course[]>(page, 'securelab_courses')).toEqual(before.courses);
    expect(await readStored<ExamSession[]>(page, 'securelab_exams')).toEqual(before.exams);
  });
}

test('Admin can move unreferenced Section and edit within its Course', async ({ page }) => {
  await installFixture(page);
  await openAdminCourses(page);
  await page.getByPlaceholder('ค้นหาด้วยรหัสวิชา หรือชื่อวิชา...').fill('CS301');
  const row = page.getByRole('row').filter({ hasText: 'CS301' }).filter({ hasText: 'ตอนเรียนที่ 9' });
  await expect(row).toHaveCount(1);
  await row.getByRole('button', { name: 'แก้ไข' }).click();
  const dialog = page.getByRole('dialog', { name: 'แก้ไขตอนเรียน' });
  await dialog.getByLabel(/หมายเลขตอนเรียน/).fill('10');
  await dialog.getByRole('button', { name: 'เปิดตอนเรียน' }).click();
  await expect(dialog).toBeHidden();
  let courses = await readStored<Course[]>(page, 'securelab_courses');
  expect(courses[0].sections.find((section) => section.id === 'fixture-section-unreferenced')?.sectionNo).toBe('10');
  await page.getByPlaceholder('ค้นหาด้วยรหัสวิชา หรือชื่อวิชา...').fill('CS301');
  const updated = page.getByRole('row').filter({ hasText: 'CS301' }).filter({ hasText: 'ตอนเรียนที่ 10' });
  await updated.getByRole('button', { name: 'แก้ไข' }).click();
  await dialog.getByLabel(/รายวิชา \(Course\)/).selectOption('fixture-course-target');
  await dialog.getByLabel('ทั้งหมดในปีที่เข้าศึกษา').first().check();
  await dialog.getByRole('button', { name: 'เปิดตอนเรียน' }).click();
  await expect(dialog).toBeHidden();
  courses = await readStored<Course[]>(page, 'securelab_courses');
  expect(courses.find((course) => course.id === 'fixture-course-target')?.sections.some((section) => section.id === 'fixture-section-unreferenced')).toBe(true);
});
