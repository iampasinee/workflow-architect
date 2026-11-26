import assert from 'node:assert/strict';
import test from 'node:test';
import { reviewRoster } from './rosterImport';
import { availableExamSeats, validLayout } from './examLayout';
import { findExamRoomConflict } from './examWizard';
import { studentMatchesExamSection } from './courseState';
import { migrateMockAuthUsers, studentAuthSeeds } from './authState';
import type { Student, Room, ExamSession, Section } from '../types';

const student = { id: 'student-one', studentCode: '6706022510018', accountStatus: 'active' } as Student;
const header = ['ลำดับ', 'เลขประจำตัวนักศึกษา', '', 'ชื่อ - สกุล'];
const row = ['1', '67-060225-1001-8', 's6706022510018@email.kmutnb.ac.th', 'ตัวอย่าง ทดสอบ'];
test('registrar columns accept hyphenated IDs and reject duplicates, mismatched emails and nonmembers', () => {
  assert.equal(reviewRoster([header, row], [student])[0].student?.id, student.id);
  assert.equal(reviewRoster([header, row], [student])[0].error, '');
  assert.ok(reviewRoster([header, row, row], [student])[1].error);
  assert.ok(reviewRoster([header, [...row.slice(0, 2), 'different@example.com', row[3]]], [student])[0].error);
  assert.ok(reviewRoster([header, row], [])[0].error);
});
test('an imported list restricts a matching Section even before the exam starts', () => {
  const section = { includedStudentIds: [student.id] } as Section;
  const exam = { examDate: '2035-01-01', startTime: '09:00', endTime: '11:00', status: 'upcoming', importedStudentIds: ['another'] } as ExamSession;
  assert.equal(studentMatchesExamSection(student, exam, section), false);
  assert.equal(studentMatchesExamSection(student, { ...exam, importedStudentIds: [student.id] }, section), true);
});
test('separate row ranges can share the room while overlapping or legacy full-room reservations conflict', () => {
  const exam = { id: 'a', examDate: '2035-01-01', roomId: 'r', startTime: '09:00', endTime: '11:00', layout: { firstRow: 1, rows: 2, columns: 3 } } as ExamSession;
  assert.equal(findExamRoomConflict([exam], { ...exam, layout: { firstRow: 3, rows: 1, columns: 3 } }), undefined);
  assert.equal(findExamRoomConflict([exam], { ...exam, layout: { firstRow: 2, rows: 1, columns: 1 } })?.id, exam.id);
  assert.equal(findExamRoomConflict([exam], { ...exam, layout: undefined })?.id, exam.id);
  const room = { rows: 3, columns: 2, seats: ['A01', 'B01', 'B02', 'C01'].map((seatNo) => ({ seatNo, status: seatNo === 'B02' ? 'offline' : 'online', machineNo: seatNo })) } as Room;
  assert.deepEqual(availableExamSeats(room, { firstRow: 2, rows: 1, columns: 2 }).map((seat) => seat.seatNo), ['B01']);
  assert.equal(validLayout({ firstRow: 2, rows: 3, columns: 2 }, room), false);
});
test('persisted credentials cannot invent a new student or staff role', () => {
  const seeds = studentAuthSeeds([student]);
  const account = seeds.find((user) => user.subjectId === student.id)!;
  const stored = [{ ...account, role: 'admin', registered: true, faceEnrollmentStatus: 'verified_mock', mockPassword: 'Example123' }];
  const restored = migrateMockAuthUsers(stored, seeds).find((user) => user.subjectId === student.id)!;
  assert.equal(restored.role, 'student');
  assert.equal(restored.mockPassword, 'Example123');
  assert.ok(!migrateMockAuthUsers(stored, studentAuthSeeds([])).some((user) => user.subjectId === student.id));
});

