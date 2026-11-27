import { expect, test } from '@playwright/test';
import { installFixture, readStored } from './fixtures';
import type { ExamSession } from '../src/types';

test('latest reopening wins in Student countdown and survives reload without changing schedule', async ({ page }) => {
  const fixture = await installFixture(page);
  await page.clock.install({ time: new Date('2030-01-01T12:10:00') });
  const exams = fixture.exams.map((exam, index) => index ? exam : {
    ...exam, examDate: '2030-01-01', startTime: '09:00', endTime: '12:00',
    reopenedStudents: { std_0001: { reopenedUntil: '2030-01-01T12:05:00', reason: 'รายบุคคล' }, '*': { reopenedUntil: '2030-01-01T12:15:00', reason: 'ทั้งห้อง' } },
  });
  await page.addInitScript((records) => { if (!sessionStorage.getItem('timing-seed')) { localStorage.setItem('securelab_exams', JSON.stringify(records)); sessionStorage.setItem('timing-seed', '1'); } }, exams);
  await page.goto('/');
  await page.getByRole('button', { name: /นักศึกษา \(เคยลงทะเบียนแล้ว\)/ }).click();
  await page.clock.runFor(3000);
  await page.getByRole('button', { name: 'ไปยังข้อมูลการสอบและระเบียบห้องสอบ' }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'ยืนยันและเริ่มทำข้อสอบ' }).click();
  await expect(page.getByText(/00:04:5[0-9]/)).toBeVisible();
  const before = await readStored<ExamSession[]>(page, 'securelab_exams');
  expect(before[0].endTime).toBe('12:00');
  expect(before[0].adjustedMinutes).toBe(exams[0].adjustedMinutes);
  await page.reload();
  expect(await readStored(page, 'securelab_exams')).toEqual(before);
});

test('Teacher individual extension changes only A and records scope and target after reload', async ({ page }) => {
  const fixture = await installFixture(page);
  await page.clock.install({ time: new Date('2030-01-01T10:00:00') });
  await page.addInitScript((records) => { if (!sessionStorage.getItem('extension-seed')) {
    localStorage.setItem('securelab_exams', JSON.stringify(records)); sessionStorage.setItem('extension-seed', '1');
  } }, fixture.exams.map((exam, index) => index ? exam : { ...exam, examName: 'E2E_TIME_COMMAND', examDate: '2030-01-01', startTime: '09:00', endTime: '12:00' }));
  await page.goto('/');
  await page.getByRole('button', { name: /อาจารย์คุมสอบ/ }).click();
  await page.getByRole('navigation', { name: 'เมนูอาจารย์ผู้สอน' }).getByRole('button', { name: 'ติดตามการสอบ', exact: true }).click();
  await page.locator('article').filter({ hasText: 'E2E_TIME_COMMAND' }).getByRole('button', { name: 'ดูรายละเอียด' }).click();
  await page.getByRole('button', { name: '+5 นาที (ทั้งห้อง)', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'ปรับระยะเวลาการทำและส่งข้อสอบ' });
  await dialog.getByRole('button', { name: 'เฉพาะรายบุคคล' }).click();
  await dialog.getByRole('combobox').selectOption('std_0001');
  await dialog.getByRole('button', { name: 'บันทึกการปรับเวลา' }).click();
  await expect(dialog).toBeHidden();
  const exam = (await readStored<ExamSession[]>(page, 'securelab_exams')).find((record) => record.id === 'exam_0001')!;
  expect(exam.individualAdjustedMinutes?.std_0001).toBe(5);
  expect(exam.individualAdjustedMinutes?.std_0002).toBeUndefined();
  expect(exam.adjustedMinutes).toBe(fixture.exams[0].adjustedMinutes);
  const events = await readStored<Array<{ studentId?: string; scope?: string }>>(page, 'securelab_audit_log');
  expect(events[0].studentId).toBe('std_0001');
  expect(events[0].scope).toBe('student');
  await page.reload();
  expect((await readStored<ExamSession[]>(page, 'securelab_exams')).find((record) => record.id === exam.id)).toEqual(exam);
});
