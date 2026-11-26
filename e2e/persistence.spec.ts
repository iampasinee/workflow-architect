import { expect, test } from '@playwright/test';
import type { ExamSession, SeatAssignment, Submission } from '../src/types';
import { installFixture, readStored } from './fixtures';

test('legacy references migrate and unresolved markers survive real browser reload', async ({ page }) => {
  const fixture = await installFixture(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /ระบบสแกนใบหน้าและติดตาม/ })).toBeVisible();
  await expect.poll(async () => (await readStored<ExamSession[]>(page, 'securelab_exams'))?.length).toBe(fixture.exams.length);
  const first = await readStored<ExamSession[]>(page, 'securelab_exams');
  const byId = (id: string) => first.find((exam) => exam.id === id)!;
  expect(byId('exam_0001').sectionId).toBe(fixture.exams[0].sectionId);
  expect(byId('fixture-exam-legacy-unique').sectionId).toBe('fixture-unique-section');
  expect(byId('fixture-exam-legacy-ambiguous').sectionResolution).toBe('ambiguous');
  expect(byId('fixture-exam-legacy-missing').sectionResolution).toBe('missing');
  expect(byId('fixture-exam-legacy-ambiguous').sectionId).toBeUndefined();
  expect(byId('fixture-exam-legacy-missing').sectionId).toBeUndefined();
  const seats = await readStored<SeatAssignment[]>(page, 'securelab_seat_assignments');
  const submissions = await readStored<Submission[]>(page, 'securelab_submissions');
  await page.reload();
  await expect(page.getByRole('heading', { name: /ระบบสแกนใบหน้าและติดตาม/ })).toBeVisible();
  await expect.poll(async () => (await readStored<ExamSession[]>(page, 'securelab_exams'))?.length).toBe(first.length);
  expect(await readStored<ExamSession[]>(page, 'securelab_exams')).toEqual(first);
  expect(await readStored<SeatAssignment[]>(page, 'securelab_seat_assignments')).toEqual(seats);
  expect(await readStored<Submission[]>(page, 'securelab_submissions')).toEqual(submissions);
  await page.reload();
  expect(await readStored<ExamSession[]>(page, 'securelab_exams')).toEqual(first);
});

test('controlled staged IndexedDB upload remains available after reload', async ({ page }) => {
  await page.goto('/');
  const upload = {
    uploadId: 'e2e-controlled-upload', uploadSequence: 1, sessionKey: 'e2e:student:exam',
    originalName: 'answer.py', submissionName: 'answer.py', sizeBytes: 8,
    extension: '.py', lastUpdated: '2026-11-26T00:00:00.000Z', progress: 100, status: 'ready',
  };
  await page.evaluate(async (record) => {
    const storage = await import('/src/services/stagedUploadStorage.ts' as string);
    await storage.saveStagedUpload({ ...record, blob: new Blob(['print(1)'], { type: 'text/plain' }) });
  }, upload);
  await page.reload();
  const stored = await page.evaluate(async () => {
    const storage = await import('/src/services/stagedUploadStorage.ts' as string);
    const records = await storage.getStagedUploads('e2e:student:exam');
    return records.map(({ blob, ...record }) => ({ ...record, content: blob ? blob.size : 0 }));
  });
  expect(stored).toEqual([{ ...upload, content: 8 }]);
});
