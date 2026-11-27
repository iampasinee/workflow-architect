import { expect, test } from '@playwright/test';
import type { Course, ExamSession } from '../src/types';
import { installFixture, readStored } from './fixtures';

async function openStudentRules(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /นักศึกษา \(เคยลงทะเบียนแล้ว\)/ }).click();
  await page.getByRole('button', { name: 'ไปยังข้อมูลการสอบและระเบียบห้องสอบ' }).click();
  await expect(page.getByText('ขั้นตอนที่ 3 จาก 4', { exact: false })).toBeVisible();
}

for (const period of [
  { sectionId: 'fixture-section-period-2', sectionNo: '1', expected: 'ภาคการศึกษา 2 / ปีการศึกษา 2568' },
  { sectionId: 'fixture-section-unreferenced', sectionNo: '9', expected: 'ภาคฤดูร้อน / ปีการศึกษา 2569' },
]) {
  test(`Student Rules shows canonical ${period.sectionId} academic period`, async ({ page }) => {
    const fixture = await installFixture(page);
    const exams = fixture.exams.map((exam) => exam.id === 'exam_0001'
      ? { ...exam, sectionId: period.sectionId, sectionNo: period.sectionNo } : exam);
    await page.addInitScript((records) => localStorage.setItem('securelab_exams', JSON.stringify(records)), exams);
    await openStudentRules(page);
    await expect(page.getByText(new RegExp(period.expected))).toBeVisible();
    const stored = await readStored<ExamSession[]>(page, 'securelab_exams');
    expect(stored.find((exam) => exam.id === 'exam_0001')?.sectionId).toBe(period.sectionId);
    const courses = await readStored<Course[]>(page, 'securelab_courses');
    expect(courses.flatMap((course) => course.sections).find((section) => section.id === period.sectionId)).toBeTruthy();
  });
}

test('Student stages untrusted source as text, renames, replaces and submits through the real UI', async ({ page }) => {
  test.setTimeout(90_000);
  const fixture = await installFixture(page);
  const localNow = new Date();
  const date = `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, '0')}-${String(localNow.getDate()).padStart(2, '0')}`;
  const exams = fixture.exams.map((exam) => exam.id === 'exam_0001'
    ? { ...exam, examDate: date, startTime: '00:00', endTime: '23:59', status: 'in_progress' as const } : exam);
  await page.addInitScript((records) => localStorage.setItem('securelab_exams', JSON.stringify(records)), exams);
  await openStudentRules(page);
  const examSelect = page.getByRole('combobox', { name: 'รอบสอบที่มีสิทธิ์' });
  await expect(examSelect.locator('option[value="fixture-exam-legacy-ambiguous"]')).toHaveCount(0);
  await expect(examSelect.locator('option[value="fixture-exam-legacy-missing"]')).toHaveCount(0);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'ยืนยันและเริ่มทำข้อสอบ' }).click();
  await expect(page.getByText('เลือกข้อสอบสำหรับไฟล์คำตอบ')).toBeVisible();
  await page.locator('label').filter({ has: page.locator('input[name="answer-question"][value="1"]') }).click();
  await expect(page.getByRole('radio', { name: 'ข้อ 1' })).toBeChecked();
  await page.locator('input[type="file"]').setInputFiles({ name: 'answer.py', mimeType: 'text/x-python', buffer: Buffer.from('window.securelabInjected = true') });
  await expect(page.getByRole('button', { name: 'ดูตัวอย่าง' })).toBeVisible();
  await page.getByRole('button', { name: 'ดูตัวอย่าง' }).click();
  const preview = page.getByRole('dialog', { name: 'ตัวอย่างไฟล์' });
  await expect(preview.getByLabel('เนื้อหาไฟล์แบบอ่านอย่างเดียว')).toContainText('window.securelabInjected = true');
  expect(await page.evaluate(() => (window as Window & { securelabInjected?: boolean }).securelabInjected)).toBeUndefined();
  await preview.getByRole('button', { name: 'ปิด', exact: true }).click();
  await page.getByRole('button', { name: 'เปลี่ยนชื่อ' }).click();
  const rename = page.getByRole('dialog', { name: 'เปลี่ยนชื่อไฟล์' });
  await rename.getByLabel('ชื่อไฟล์สำหรับส่ง').fill('answer_safe');
  await rename.getByRole('button', { name: 'บันทึกชื่อไฟล์' }).click();
  await expect(page.getByText('answer_safe.py')).toBeVisible();
  await expect(page.getByText('พร้อมส่ง', { exact: true })).toBeVisible();
  const uploadBefore = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open('securelab-staged-uploads');
      request.onsuccess = () => resolve(request.result);
    });
    const records = await new Promise<Array<{ uploadId: string; sessionKey: string; questionNumber: number }>>((resolve) => {
      const request = db.transaction('uploadsByUploadId').objectStore('uploadsByUploadId').getAll();
      request.onsuccess = () => resolve(request.result);
    });
    db.close();
    return records.find((record) => record.questionNumber === 1)!;
  });
  expect(uploadBefore.uploadId).toBeTruthy();
  expect(uploadBefore.sessionKey).toContain('exam_0001');
  expect(uploadBefore.sessionKey).toContain(':attempt:');
  await page.locator('input[type="file"]').setInputFiles({ name: 'replacement.py', mimeType: 'text/x-python', buffer: Buffer.from('print(2)') });
  const replacement = page.getByRole('dialog', { name: 'ยืนยันการแทนที่ไฟล์' });
  await expect(replacement).toBeVisible();
  await replacement.getByRole('button', { name: 'แทนที่ไฟล์' }).click();
  await expect(page.getByText('replacement.py')).toBeVisible();
  await page.getByRole('button', { name: 'เสร็จสิ้นการสอบและส่งไฟล์' }).click();
  const confirmation = page.getByRole('dialog', { name: 'ยืนยันการเสร็จสิ้นการสอบ' });
  await confirmation.getByRole('button', { name: 'เสร็จสิ้นและส่งไฟล์' }).click();
  await expect(page.getByText('ยืนยันการส่งไฟล์สำเร็จ (ST7)')).toBeVisible();
  const attempts = await readStored<Array<{ examId: string; studentId: string; files: Array<{ uploadId?: string; questionNumber?: number }> }>>(page, 'securelab_demo_submission_attempts_v1');
  const attempt = attempts.at(-1)!;
  expect(attempt.examId).toBe('exam_0001');
  expect(uploadBefore.sessionKey).toContain(`:${attempt.studentId}:attempt:`);
  expect(attempt.files[0].uploadId).toBe(uploadBefore.uploadId);
  expect(attempt.files[0].questionNumber).toBe(1);
  const submissions = await readStored<Array<{ examId: string; studentId: string; files: Array<{ uploadId?: string; questionNumber?: number }> }>>(page, 'securelab_submissions');
  // Demo attempts may retain the original canonical submission; inspect the staged attempt separately.
  expect(submissions.some((submission) => submission.examId === 'exam_0001' && submission.studentId)).toBe(true);
  await page.reload();
  expect(await readStored(page, 'securelab_submissions')).toEqual(submissions);
  expect(await readStored(page, 'securelab_demo_submission_attempts_v1')).toEqual(attempts);
});
