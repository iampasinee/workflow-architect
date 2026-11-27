import { expect, test } from '@playwright/test';
import { installFixture, readStored } from './fixtures';
import type { Course } from '../src/types';
import { createEmptyExamWizardState } from '../src/services/examWizard';
import { initialStudents } from '../src/data/initialData';
import { createInitialAcademicState } from '../src/services/academicState';

test('Admin renders existing Students and guards referenced Course and Section deletion across reload', async ({ page }) => {
  await installFixture(page);
  await page.goto('/');
  await page.getByRole('button', { name: /ผู้ดูแลระบบส่วนกลาง/ }).click();
  const nav = page.getByRole('navigation', { name: 'เมนูผู้ดูแลระบบ' });
  await nav.getByRole('button', { name: 'จัดการผู้ใช้งาน', exact: true }).click();
  await nav.getByRole('button', { name: 'นักศึกษา', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: '6410123456' })).toBeVisible();
  await nav.getByRole('button', { name: 'จัดการรายวิชาและตอนเรียน' }).click();
  await page.getByPlaceholder('ค้นหาด้วยรหัสวิชา หรือชื่อวิชา...').fill('CS301');
  const before = await readStored<Course[]>(page, 'securelab_courses');
  await page.getByRole('row').filter({ hasText: 'CS301' }).getByRole('button', { name: 'ลบ', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'ยืนยันการลบ' });
  await expect(dialog.getByRole('alert')).toContainText('ไม่สามารถลบ');
  await expect(dialog.getByRole('button', { name: 'ยืนยัน', exact: true })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'ปิด', exact: true }).click();
  await page.getByRole('tab', { name: /ตอนเรียน/ }).click();
  const row = page.getByRole('row').filter({ hasText: 'CS301' }).filter({ hasText: 'ภาคที่ 1 / 2569' }).filter({ hasText: 'ตอนเรียนที่ 1' });
  await row.getByRole('button', { name: 'ลบ', exact: true }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'ยืนยัน', exact: true })).toHaveCount(0);
  expect(await readStored<Course[]>(page, 'securelab_courses')).toEqual(before);
  await page.reload();
  expect(await readStored<Course[]>(page, 'securelab_courses')).toEqual(before);
});

for (const restriction of ['major', 'admissionYear', 'classGroup', 'otherPeriod', 'eligibleGroup'] as const) {
  test(`Student canonical eligibility checks ${restriction} without number-only fallback`, async ({ page }) => {
    const fixture = await installFixture(page);
    const courses = fixture.courses.map((course, index) => index ? course : {
      ...course, sections: course.sections.map((section, sectionIndex) => (restriction === 'otherPeriod' ? section.id !== 'fixture-section-period-2' : sectionIndex !== 0) ? section : {
        ...section, cohorts: (section.cohorts || []).map((cohort) => ({
          ...cohort,
          ...(restriction === 'major' ? { majorId: createInitialAcademicState().majors.find((major) => major.id !== cohort.majorId)!.id } : {}),
          ...(restriction === 'admissionYear' || restriction === 'otherPeriod' ? { admissionYear: 2568 } : {}),
          ...(restriction === 'eligibleGroup' ? { classGroupIds: ['group_inet_de_ra'] } : {}),
          ...(restriction === 'classGroup' ? { classGroupIds: ['group_inet_de_rb'] } : {}),
        })),
      }),
    });
    await page.addInitScript((records) => localStorage.setItem('securelab_courses', JSON.stringify(records)), courses);
    if (restriction === 'otherPeriod') await page.addInitScript((records) => localStorage.setItem('securelab_exams', JSON.stringify(records)), fixture.exams.map((exam) => exam.id === 'exam_0001' ? { ...exam, sectionId: 'fixture-section-period-2' } : exam));
    await page.goto('/');
    await page.getByRole('button', { name: /นักศึกษา \(เคยลงทะเบียนแล้ว\)/ }).click();
    await page.getByRole('button', { name: 'ไปยังข้อมูลการสอบและระเบียบห้องสอบ' }).click();

    await expect(page.getByRole('heading', { name: /ยังไม่มีรอบสอบที่คุณมีสิทธิ์เข้า/ }).or(page.getByRole('combobox', { name: 'รอบสอบที่มีสิทธิ์' }))).toBeVisible();
    await expect(page.locator('option[value="exam_0001"]')).toHaveCount(restriction === 'eligibleGroup' ? 1 : 0);
    await expect(page.locator('option[value="fixture-exam-legacy-ambiguous"]')).toHaveCount(0);
    await expect(page.locator('option[value="fixture-exam-legacy-missing"]')).toHaveCount(0);
  });
}

test('Admin rejects duplicate period Section and overlapping cohort without persistence', async ({ page }) => {
  await installFixture(page);
  await page.goto('/');
  await page.getByRole('button', { name: /ผู้ดูแลระบบส่วนกลาง/ }).click();
  await page.getByRole('navigation', { name: 'เมนูผู้ดูแลระบบ' }).getByRole('button', { name: 'จัดการรายวิชาและตอนเรียน' }).click();
  await page.getByRole('tab', { name: /ตอนเรียน/ }).click();
  await page.getByPlaceholder('ค้นหาด้วยรหัสวิชา หรือชื่อวิชา...').fill('CS301');
  await page.getByRole('row').filter({ hasText: 'ตอนเรียนที่ 9' }).getByRole('button', { name: 'แก้ไข' }).click();
  const dialog = page.getByRole('dialog', { name: 'แก้ไขตอนเรียน' });
  const before = await readStored(page, 'securelab_courses');
  await dialog.getByLabel(/ภาคการศึกษา/).selectOption('1');
  await dialog.getByLabel(/หมายเลขตอนเรียน/).fill('1');
  await dialog.getByRole('button', { name: 'เปิดตอนเรียน' }).click();
  await expect(dialog.getByRole('alert')).toContainText('รายวิชานี้มีตอนเรียนดังกล่าว');
  expect(await readStored(page, 'securelab_courses')).toEqual(before);
  await dialog.getByLabel(/หมายเลขตอนเรียน/).fill('99');
  await dialog.getByRole('button', { name: 'เปิดตอนเรียน' }).click();
  await expect(dialog.getByRole('alert')).toContainText('ถูกกำหนดไว้ในตอนเรียน');
  expect(await readStored(page, 'securelab_courses')).toEqual(before);
  await page.reload();
  expect(await readStored(page, 'securelab_courses')).toEqual(before);
});

test('Teacher ambiguous legacy draft stays persisted until an explicit canonical Section is selected', async ({ page }) => {
  await installFixture(page);
  const draft = { id: 'closure-legacy-draft', teacherId: 'tch_0001', updatedAt: '2026-11-27T00:00:00Z', state: {
    ...createEmptyExamWizardState(), courseId: 'crs_0001', sectionNo: '1', examName: 'ทดสอบร่างคลุมเครือ',
  } };
  await page.addInitScript((record) => {
    if (!localStorage.getItem('securelab_teacher_exam_drafts_v1')) localStorage.setItem('securelab_teacher_exam_drafts_v1', JSON.stringify([record]));
  }, draft);
  await page.goto('/');
  await page.getByRole('button', { name: /อาจารย์คุมสอบ/ }).click();
  await page.getByRole('navigation', { name: 'เมนูอาจารย์ผู้สอน' }).getByRole('button', { name: 'จัดการสอบ' }).click();
  await page.getByRole('tab', { name: /ร่างการสอบ/ }).click();
  await page.getByRole('button', { name: 'แก้ไขต่อ' }).click();
  const before = await readStored(page, 'securelab_exams');
  await expect(page.getByLabel('Section *')).toHaveValue('');
  await page.getByRole('button', { name: 'ถัดไป' }).click();
  await expect(page.getByRole('heading', { name: 'ข้อมูลการสอบ', exact: true })).toBeVisible();
  expect(await readStored(page, 'securelab_exams')).toEqual(before);
  expect(await readStored(page, 'securelab_teacher_exam_drafts_v1')).toEqual([draft]);
  await page.getByLabel('Section *').selectOption('fixture-section-period-2');
  await page.getByRole('button', { name: 'ถัดไป' }).click();
  await page.getByRole('button', { name: 'ถัดไป' }).click();
  await page.getByLabel('วันที่สอบ *').fill('2030-02-15');
  await page.getByRole('button', { name: /B4-01B ชั้น 4/ }).click();
  await page.getByRole('button', { name: 'ถัดไป' }).click();
  await page.getByRole('button', { name: 'ถัดไป' }).click();
  for (let index = 0; index < 4; index += 1) await page.getByRole('button', { name: index === 3 ? 'ไปตรวจสอบและบันทึก' : 'ถัดไป' }).click();
  await page.getByRole('button', { name: 'สร้างการสอบ' }).last().click();
  await expect.poll(async () => (await readStored<Array<{ sectionId?: string }>>(page, 'securelab_exams')).some((exam) => exam.sectionId === 'fixture-section-period-2')).toBe(true);
  const created = (await readStored<Array<{ courseId: string; sectionId?: string }>>(page, 'securelab_exams')).find((exam) => exam.sectionId === 'fixture-section-period-2')!;
  expect(created.courseId).toBe('crs_0001');
});

test('Teacher monitoring opens canonical Section with preserved historical roster, seats and submissions', async ({ page }) => {
  const fixture = await installFixture(page);
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const roster = [initialStudents[1].id, initialStudents[0].id];
  const exams = fixture.exams.map((exam, index) => index ? exam : {
    ...exam, examName: 'E2E_CANONICAL_MONITOR', sectionId: 'fixture-section-period-2',
    examDate: date, startTime: '00:00', endTime: '23:59', eligibleStudentIds: roster, importedStudentIds: roster,
  });
  await page.addInitScript((records) => { if (!sessionStorage.getItem('closure-seeded')) {
    localStorage.setItem('securelab_exams', JSON.stringify(records));
    const seats = JSON.parse(localStorage.getItem('securelab_seat_assignments') || '[]');
    localStorage.setItem('securelab_seat_assignments', JSON.stringify(seats.filter((seat: { examId: string; seatNo: string }) => seat.examId !== 'exam_0001' || ['A1', 'A2'].includes(seat.seatNo))));
    sessionStorage.setItem('closure-seeded', '1');
  } }, exams);
  await page.goto('/');
  await page.getByRole('button', { name: /อาจารย์คุมสอบ/ }).click();
  await page.getByRole('navigation', { name: 'เมนูอาจารย์ผู้สอน' }).getByRole('button', { name: 'ติดตามการสอบ', exact: true }).click();
  const card = page.locator('article').filter({ hasText: 'E2E_CANONICAL_MONITOR' });
  await card.getByRole('button', { name: 'ดูรายละเอียด' }).click();
  await expect(page.getByRole('heading', { name: 'E2E_CANONICAL_MONITOR' })).toBeVisible();
  await expect(page.getByText('ผู้มีสิทธิ์สอบทั้งหมด', { exact: true }).locator('..')).toContainText('2');
  const assignedRows = page.getByRole('table').getByRole('row').filter({ has: page.getByRole('cell') });
  await expect(assignedRows).toHaveCount(2);
  for (const [index, seat] of ['A1', 'A2'].entries()) {
    await expect(assignedRows.nth(index)).toContainText(initialStudents[index].studentCode);
    await expect(assignedRows.nth(index)).toContainText(seat);
  }
  const storedExam = (await readStored<Array<{ id: string; importedStudentIds?: string[]; eligibleStudentIds?: string[] }>>(page, 'securelab_exams')).find((exam) => exam.id === 'exam_0001');
  expect(storedExam?.eligibleStudentIds).toEqual(roster);
  expect(storedExam?.importedStudentIds).toEqual(roster);
  const before = { exams: await readStored(page, 'securelab_exams'), seats: await readStored(page, 'securelab_seat_assignments'), submissions: await readStored(page, 'securelab_submissions') };
  await page.reload();
  expect(await readStored(page, 'securelab_exams')).toEqual(before.exams);
  expect(await readStored(page, 'securelab_seat_assignments')).toEqual(before.seats);
  expect(await readStored(page, 'securelab_submissions')).toEqual(before.submissions);
});

test('Admin New Section form rejects the existing composite key without writing', async ({ page }) => {
  await installFixture(page);
  await page.goto('/');
  await page.getByRole('button', { name: /ผู้ดูแลระบบส่วนกลาง/ }).click();
  await page.getByRole('navigation', { name: 'เมนูผู้ดูแลระบบ' }).getByRole('button', { name: 'จัดการรายวิชาและตอนเรียน' }).click();
  await page.getByPlaceholder('ค้นหาด้วยรหัสวิชา หรือชื่อวิชา...').fill('CS301');
  await page.getByRole('row').filter({ hasText: 'CS301' }).getByRole('button', { name: 'เปิดตอนเรียน', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'เปิดตอนเรียนใหม่ (New Section)' });
  const before = await readStored(page, 'securelab_courses');
  await dialog.getByLabel(/หมายเลขตอนเรียน/).fill('1');
  await dialog.getByRole('button', { name: 'เปิดตอนเรียน', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('รายวิชานี้มีตอนเรียนดังกล่าว');
  expect(await readStored(page, 'securelab_courses')).toEqual(before);
});
