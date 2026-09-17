import { academicSettings, calculateStudentYearLevel, withCalculatedStudentYear, withoutStudentYear } from '../utils/academicYear';
import { deriveAcademicState, migrateAcademicCohorts, studentGroupError } from './academicState';
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
import { buildWizardTransaction, createWizardDraft } from './sequentialAcademicWizard';

const input = (values: Partial<AcademicInput> = {}): AcademicInput => ({
  name: 'ตัวอย่าง', code: '', facultyId: 'faculty-001', departmentId: 'department_it',
  programId: 'program_inet', yearLevelId: 'cohort_program_inet_2567', level: 3, status: 'active', ...values,
});
const mutate = (state: AcademicState, tier: AcademicTier, values: Partial<AcademicInput>, id?: string) =>
  saveAcademicState(state, tier, normalizeAcademicInput(input(values)), id);

test('wizard builds an entire chain atomically and preserves requested statuses', () => {
  const source = createInitialAcademicState();
  const snapshot = JSON.stringify(source);
  const draft = { ...createWizardDraft(source), facultyMode: 'new' as const, newFacultyName: 'คณะตัวอย่าง', facultyStatus: 'inactive' as const,
    departmentMode: 'new' as const, newDepartmentName: 'ภาควิชาตัวอย่าง', programMode: 'new' as const,
    newProgramName: 'สาขาตัวอย่าง', newProgramCode: ' demo ', admissionYear: 2567,
    groups: [{ tempId: 'one', code: ' demo-ra ', status: 'active' as const }, { tempId: 'two', code: 'DEMO-RB', status: 'inactive' as const }],
  };
  for (let step = 1; step < 5; step++) assert.equal(buildWizardTransaction(source, draft, step).state, undefined);
  const result = buildWizardTransaction(source, draft).state!;
  assert.equal(JSON.stringify(source), snapshot);
  assert.equal(result.faculties.length, source.faculties.length + 1);
  assert.equal(result.classGroups.length, source.classGroups.length + 2);
  const faculty = result.faculties.at(-1)!;
  const department = result.departments.at(-1)!;
  const program = result.programs.at(-1)!;
  assert.equal(faculty.status, 'inactive');
  assert.equal(department.facultyId, faculty.id);
  assert.equal(program.departmentId, department.id);
  assert.equal(program.code, 'DEMO');
  assert.equal(result.classGroups.at(-2)!.code, 'DEMO-RA');
  assert.ok(result.classGroups.slice(-2).every((g) => g.programId === program.id && g.admissionYear === 2567));
  assert.equal(new Set(result.classGroups.map((g) => g.id)).size, result.classGroups.length);
});

test('wizard rejects invalid or duplicated batches without partial records', () => {
  const state = createInitialAcademicState();
  const snapshot = JSON.stringify(state);
  const draft = { ...createWizardDraft(state), selectedDepartmentId: 'department_it', selectedProgramId: 'program_inet', admissionYear: 2567,
    groups: [{ tempId: 'a', code: 'NEW', status: 'active' as const }, { tempId: 'b', code: ' new ', status: 'active' as const }],
  };
  assert.equal(buildWizardTransaction(state, draft).step, 5);
  assert.equal(buildWizardTransaction(state, { ...draft, groups: [] }).step, 5);
  assert.equal(buildWizardTransaction(state, { ...draft, admissionYear: 2570 }).step, 4);
  assert.equal(buildWizardTransaction(state, { ...draft, selectedDepartmentId: 'dep_003' }).step, 3);
  assert.equal(JSON.stringify(state), snapshot);
});

test('group codes are unique within a program and admission year for wizard and standalone CRUD', () => {
  const state = createInitialAcademicState();
  const draft = { ...createWizardDraft(state), selectedDepartmentId: 'department_it', selectedProgramId: 'program_inet', admissionYear: 2568,
    groups: [{ tempId: 'a', code: 'INET-DE-RA', status: 'active' as const }],
  };
  assert.ok(buildWizardTransaction(state, draft).state);
  assert.equal(buildWizardTransaction(state, { ...draft, admissionYear: 2567 }).step, 5);
  assert.equal(validateAcademicInput(state, 'classGroups', input({ code: 'INET-DE-RA', admissionYear: 2568 })), undefined);
  assert.equal(validateAcademicInput(state, 'classGroups', input({ code: 'INET-DE-RA', programId: 'program_ine', admissionYear: 2567 })), undefined);
  assert.ok(validateAcademicInput(state, 'programs', input({ code: 'UNIQUE', name: state.programs[0].name })));
});

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
  assert.equal(migrated[0].year, 6);
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
  assert.ok(academicDeleteError(state, [], 'programs', 'program_ine'), 'groups prevent deletion');
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
  const unassigned = migrateAcademicStudents(initialStudents.slice(0, 2).map((s, index) => ({ ...s, studentCode: `671012345${index}`, classGroupId: '', classGroup: '' })), state);
  const ids = unassigned.map((s) => s.id);
  assert.equal(bulkAssignmentError(state, unassigned, ids, 'group_inet_de_ra'), undefined);
  assert.ok(bulkAssignmentError(state, unassigned, ids, 'group_ine_de_ra'));
  assert.ok(bulkAssignmentError(state, unassigned, [...ids, 'nonexistent'], 'group_inet_de_ra'));
  const assigned = migrateAcademicStudents(initialStudents.slice(0, 2), state);
  assert.ok(bulkAssignmentError(state, assigned, ids, 'group_inet_de_ra'));
  const mixedYears = [...unassigned, { ...unassigned[0], id: 'wrong-year', studentCode: '6910123456', yearLevel: 1, year: 1 }];
  assert.ok(bulkAssignmentError(state, mixedYears, mixedYears.map((s) => s.id), 'group_inet_de_ra'));
});

test('academic hash route survives serialization and unknown hashes return to dashboard', () => {
  assert.equal(getAdminRouteFromHash(getAdminHashForRoute('ACADEMIC')), 'ACADEMIC');
  assert.equal(getAdminRouteFromHash('#/admin/roles-permissions'), 'A1');
  assert.equal(getAdminHashForRoute('A3'), '#/admin/dashboard');
  assert.equal(getAdminRouteFromHash('#/admin/does-not-exist'), 'A1');
});
test('calculation handles dashed IDs, whitespace, extended cohorts and invalid values', () => {
  for (const [prefix, expected] of [['69', 1], ['68', 2], ['67', 3], ['66', 4], ['65', 5]] as const) {
    const result = calculateStudentYearLevel(`${prefix}10123456`, 2569)!;
    assert.equal(result.yearLevel, expected);
    assert.equal(result.isExtended, expected > 4);
  }
  assert.equal(calculateStudentYearLevel(' 67-060225-1011-1 ', 2569)?.admissionYear, 2567);
  assert.equal(calculateStudentYearLevel('6710123456', 2570)?.yearLevel, 4);
  for (const code of ['ABC', 'กข', '7', '7010123456']) {
    const result = calculateStudentYearLevel(code, 2569)!;
    assert.equal(result.isValid, false);
    assert.equal(result.yearLevel, 0);
  }
  assert.equal(calculateStudentYearLevel('   '), null);
  for (const invalid of [NaN, Infinity, -1, 2569.5]) assert.equal(calculateStudentYearLevel('67', invalid)?.isValid, false);
});

test('academic year rollover derives student and group years without changing cohort or status', () => {
  const state = createInitialAcademicState();
  const student = { ...initialStudents[0], studentCode: '6710123456', year: 99, yearLevel: 99 };
  const before = JSON.stringify(state.classGroups);
  try {
    academicSettings.currentAcademicYear = 2570;
    const next = deriveAcademicState(state, [student]);
    assert.equal(withCalculatedStudentYear(student).year, 4);
    assert.equal(next.yearLevels.find((y) => y.id === 'cohort_program_inet_2567')?.level, 4);
    assert.equal(next.classGroups[0].admissionYear, 2567);
    assert.equal(JSON.stringify(state.classGroups), before);
    assert.equal(withCalculatedStudentYear(student).accountStatus, student.accountStatus);
  } finally { academicSettings.currentAcademicYear = 2569; }
});

test('storage excludes derived student years and group migration is idempotent', () => {
  const stored = withoutStudentYear({ ...initialStudents[0], year: 99, yearLevel: 99, yearLevelId: 'legacy' });
  assert.equal('year' in stored, false);
  assert.equal('yearLevel' in stored, false);
  assert.equal('yearLevelId' in stored, false);
  const legacy = createInitialAcademicState();
  const migrated = migrateAcademicCohorts(legacy);
  assert.deepEqual(migrateAcademicCohorts(migrated), migrated);
});

test('student identity overrides stale years and incompatible group assignments are rejected', () => {
  const state = createInitialAcademicState();
  const student = { ...initialStudents[0], studentCode: '6910123456', year: 3, yearLevel: 3, classGroupId: 'group_inet_de_ra' };
  assert.equal(studentAcademicFields(state, student).year, 1);
  assert.ok(studentGroupError(state, student));
  assert.equal(studentGroupError(state, { ...student, studentCode: '6710123456' }), undefined);
  assert.ok(studentGroupError(state, { ...student, studentCode: 'bad', classGroupId: '' }));
});

test('computed year rows are immutable; group admission supports extended cohorts', () => {
  const state = createInitialAcademicState();
  assert.ok(validateAcademicInput(state, 'yearLevels', input({ level: 8 })));
  assert.equal(saveAcademicState(state, 'yearLevels', input({ level: 8 })), state);
  const values = input({ code: 'EXTENDED', admissionYear: 2565 });
  assert.equal(validateAcademicInput(state, 'classGroups', values), undefined);
  const next = saveAcademicState(state, 'classGroups', values);
  const group = next.classGroups.find((g) => g.code === 'EXTENDED')!;
  assert.equal(group.admissionYear, 2565);
  assert.equal(next.yearLevels.find((y) => y.id === group.yearLevelId)?.level, 5);
});
