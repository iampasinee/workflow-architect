import test from 'node:test';
import assert from 'node:assert/strict';
import { initialTeachers, initialStudents } from '../data/initialData';
import { fixtureCourses, fixtureExams } from '../../e2e/fixtures';
import { migrateAcademicStudents, createInitialAcademicState } from './academicState';
import { examTimeCommandError, type ExamCommandEnvironment } from './examCommand';

test('time commands validate canonical assignment, active actor, target, values and state', () => {
  const courses = fixtureCourses();
  const exam = { ...fixtureExams(courses)[0], examDate: '2030-01-01', startTime: '09:00', endTime: '12:00' };
  const now = new Date('2030-01-01T10:00:00');
  const environment: ExamCommandEnvironment = { role: 'teacher', teacher: initialTeachers[0], courses, students: migrateAcademicStudents(initialStudents, createInitialAcademicState()) };
  const run = (env = environment, minutes = 5, scope: 'room' | 'student' = 'room', target?: string) => examTimeCommandError(env, exam, 'adjust', minutes, scope, target, 'ชดเชยเวลา', now);
  assert.equal(run(), undefined);
  assert.equal(run(environment, 5, 'student', 'std_0001'), undefined);
  assert.ok(run({ ...environment, role: 'student' }));
  assert.ok(run({ ...environment, teacher: { ...initialTeachers[0], id: 'unassigned' } }));
  assert.ok(run(environment, NaN));
  assert.ok(run(environment, 1.5));
  assert.ok(run(environment, 5, 'student', 'missing'));
  assert.ok(run(environment, 5, 'room', 'std_0001'));
  assert.ok(examTimeCommandError(environment, { ...exam, status: 'completed' }, 'adjust', 5, 'room', undefined, 'เหตุผล', now));
  assert.ok(examTimeCommandError(environment, exam, 'reopen', 61, 'room', undefined, 'เหตุผล', now));
});
