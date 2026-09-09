import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initialStudents } from '../data/initialData';
import { AcademicInput, AcademicState, AcademicTier } from '../types/academic';
import {
  academicDeleteError, bulkAssignmentError, createInitialAcademicState, isAcademicPathActive,
  migrateAcademicStudents, normalizeAcademicInput, saveAcademicState, studentAcademicFields,
  studentsInAcademicRecord, toAcademicHierarchy, validateAcademicInput,
} from './academicState';
import { getAdminHashForRoute, getAdminRouteFromHash } from '../utils/adminRoutes';

const input = (values: Partial<AcademicInput> = {}): AcademicInput => ({
  name: 'ตัวอย่าง', code: '', facultyId: 'faculty-001', departmentId: 'department_it',
  programId: 'program_inet', yearLevelId: 'year_program_inet_3', level: 3, status: 'active', ...values,
});
const mutate = (state: AcademicState, tier: AcademicTier, values: Partial<AcademicInput>, id?: string) =>
  saveAcademicState(state, tier, normalizeAcademicInput(input(values)), id);

test('seed preserves every original student group and adds years 1–4 to every program', () => {
  const state = createInitialAcademicState();
  const students = migrateAcademicStudents(initialStudents, state);
  assert.equal(state.faculties.length, 1);
  assert.equal(students.length, initialStudents.length);
  assert.ok(students.every((s) => state.classGroups.some((g) => g.id === s.classGroupId)));
  assert.ok(students.every((s) => s.facultyId === 'faculty-001'));
  assert.equal(studentsInAcademicRecord(state, students, 'faculties', 'faculty-001').length, students.length);
  for (const program of state.programs) {
    assert.deepEqual(state.yearLevels.filter((y) => y.programId === program.id).map((y) => y.level), [1, 2, 3, 4]);
  }
});

test('legacy migration maps old groups, preserves status and biometrics, and is idempotent', () => {
  const state = createInitialAcademicState();
  const legacy = [{ ...initialStudents[0], classGroupId: 'group_003', year: 1, yearLevel: 1, statusReason: 'preserve me' }];
  const migrated = migrateAcademicStudents(legacy, state);
  assert.equal(migrated[0].classGroupId, 'group_inet_de_ra');
  assert.equal(migrated[0].year, 3);
  assert.equal(migrated[0].faceReferenceUrl, legacy[0].faceReferenceUrl);
  assert.equal(migrated[0].accountStatus, legacy[0].accountStatus);
  assert.equal(migrated[0].statusReason, 'preserve me');
  assert.deepEqual(migrateAcademicStudents(migrated, state), migrated);
});

test('explicit unassigned students never regain a seed group after reload', () => {
  const state = createInitialAcademicState();
  const migrated = migrateAcademicStudents([{ ...initialStudents[0], classGroupId: '', classGroup: '' }], state);
  assert.equal(migrated[0].classGroupId, '');
  assert.equal(migrated[0].classGroup, '');
  assert.equal(migrated[0].programId, 'program_inet');
  assert.deepEqual(migrateAcademicStudents(migrated, state), migrated);
});

test('case insensitive and scoped uniqueness, trimming, codes and year validation', () => {
  const state = createInitialAcademicState();
  assert.ok(validateAcademicInput(state, 'faculties', normalizeAcademicInput(input({ name: `  ${state.faculties[0].name}  ` }))));
  assert.ok(validateAcademicInput(state, 'programs', normalizeAcademicInput(input({ code: ' inet ' }))));
  assert.ok(validateAcademicInput(state, 'classGroups', normalizeAcademicInput(input({ code: ' inet-de-ra ' }))));
  assert.ok(validateAcademicInput(state, 'yearLevels', input({ level: 3 })));
  for (const level of [0, -1, 1.5, NaN]) assert.ok(validateAcademicInput(state, 'yearLevels', input({ level })));
  assert.ok(validateAcademicInput(state, 'faculties', input({ name: 'x'.repeat(151) })));
  assert.ok(validateAcademicInput(state, 'programs', input({ code: 'BAD-CODE' })));
  assert.equal(validateAcademicInput(state, 'departments', input({ name: state.departments[0].name }), state.departments[0].id), undefined);
  assert.ok(validateAcademicInput(state, 'classGroups', input({ code: 'NEW', programId: 'program_ine' })));
});

test('all five tiers block deletion for children or assigned students, including inactive links', () => {
  const state = createInitialAcademicState();
  const students = migrateAcademicStudents(initialStudents, state);
  const nodes: [AcademicTier, string][] = [
    ['faculties', 'faculty-001'], ['departments', 'department_it'], ['programs', 'program_inet'],
    ['yearLevels', 'year_program_inet_3'], ['classGroups', 'group_inet_de_ra'],
  ];
  for (const [tier, id] of nodes) assert.ok(academicDeleteError(state, students, tier, id));
  assert.ok(academicDeleteError(state, [], 'programs', 'program_ine'), 'years alone prevent deletion');
  assert.equal(academicDeleteError(state, students, 'classGroups', 'group_005'), undefined);
});

test('inactive ancestors remove all descendants from assignment selectors but keep associations', () => {
  const state = createInitialAcademicState();
  const students = migrateAcademicStudents(initialStudents, state);
  const disabled = { ...state, faculties: state.faculties.map((f) => ({ ...f, status: 'inactive' as const })) };
  assert.equal(isAcademicPathActive(disabled, 'classGroups', 'group_inet_de_ra'), false);
  assert.equal(toAcademicHierarchy(disabled, true).length, 0);
  assert.equal(toAcademicHierarchy(disabled).length, 1);
  assert.deepEqual(migrateAcademicStudents(students, disabled), students);
  assert.ok(validateAcademicInput(disabled, 'departments', input()));
  assert.equal(validateAcademicInput(disabled, 'departments', input(), 'department_it'), undefined);
});

test('editing hierarchy synchronizes names and moved-parent relationships without changing student identity', () => {
  let state = createInitialAcademicState();
  const student = migrateAcademicStudents(initialStudents, state)[0];
  state = mutate(state, 'faculties', { name: 'คณะตัวอย่าง' }, 'faculty-001');
  state = mutate(state, 'programs', { name: 'สาขาใหม่', code: 'NEW' }, 'program_inet');
  state = mutate(state, 'classGroups', { code: 'NEW-RA' }, 'group_inet_de_ra');
  const changed = { ...student, ...studentAcademicFields(state, student) };
  assert.equal(changed.id, student.id);
  assert.equal(changed.faculty, 'คณะตัวอย่าง');
  assert.equal(changed.programCode, 'NEW');
  assert.equal(changed.classGroup, 'NEW-RA');
  assert.equal(changed.faceReferenceUrl, student.faceReferenceUrl);
  assert.equal(changed.accountStatus, student.accountStatus);
});

test('new program creates configured years and prevents moving occupied years to another program', () => {
  const state = mutate(createInitialAcademicState(), 'programs', { code: 'NEW', name: 'สาขาใหม่' });
  const program = state.programs.find((p) => p.code === 'NEW')!;
  assert.deepEqual(state.yearLevels.filter((y) => y.programId === program.id).map((y) => y.level), [1, 2, 3, 4]);
  assert.ok(validateAcademicInput(state, 'yearLevels', input({ programId: program.id, level: 5 }), 'year_program_inet_3'));
});

test('bulk assignment rejects a mixed invalid batch and only accepts matching unassigned students', () => {
  const state = createInitialAcademicState();
  const unassigned = migrateAcademicStudents(initialStudents.slice(0, 2).map((s) => ({ ...s, classGroupId: '', classGroup: '' })), state);
  const ids = unassigned.map((s) => s.id);
  assert.equal(bulkAssignmentError(state, unassigned, ids, 'group_inet_de_ra'), undefined);
  assert.ok(bulkAssignmentError(state, unassigned, ids, 'group_ine_de_ra'));
  assert.ok(bulkAssignmentError(state, unassigned, [...ids, 'nonexistent'], 'group_inet_de_ra'));
  const assigned = migrateAcademicStudents(initialStudents.slice(0, 2), state);
  assert.ok(bulkAssignmentError(state, assigned, ids, 'group_inet_de_ra'));
  const mixedYears = [...unassigned, { ...unassigned[0], id: 'wrong-year', yearLevelId: 'year_program_inet_1', yearLevel: 1, year: 1 }];
  assert.ok(bulkAssignmentError(state, mixedYears, mixedYears.map((s) => s.id), 'group_inet_de_ra'));
});

test('academic hash route survives serialization and unknown hashes return to dashboard', () => {
  assert.equal(getAdminRouteFromHash(getAdminHashForRoute('ACADEMIC')), 'ACADEMIC');
  assert.equal(getAdminRouteFromHash('#/admin/does-not-exist'), 'A1');
});
