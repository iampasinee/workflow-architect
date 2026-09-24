import assert from 'node:assert/strict';
import test from 'node:test';
import {
  completeMockRegistration,
  initialMockAuthUsers,
  migrateMockAuthUsers,
  parseStudentUniversityEmail,
  resolveMockAuthAccount,
  resolveUniversityAccount,
} from './authState';
import { classGroupsForCohort, createInitialAcademicState } from './academicState';
import { calculateYearLevelFromAdmissionYear } from '../utils/academicYear';

test('university domains resolve student and staff without granting Admin from domain alone', () => {
  assert.equal(resolveUniversityAccount('s6701011500167@email.kmutnb.ac.th').domain, 'student');
  assert.equal(resolveUniversityAccount('teacher@itm.kmutnb.ac.th').domain, 'staff');
  assert.equal(resolveUniversityAccount('admin@itm.kmutnb.ac.th').domain, 'staff');
  assert.equal(resolveUniversityAccount('user@gmail.com').domain, 'unsupported');
});

test('student university email derives Student ID and canonical admission year', () => {
  assert.deepEqual(parseStudentUniversityEmail('s6701011500167@email.kmutnb.ac.th'), {
    studentId: '6701011500167',
    admissionYear: 2567,
  });
});

test('student university email parsing rejects missing prefix and non-digit local parts', () => {
  assert.equal(parseStudentUniversityEmail('6701011500167@email.kmutnb.ac.th'), null);
  assert.equal(parseStudentUniversityEmail('student@email.kmutnb.ac.th'), null);
  assert.equal(parseStudentUniversityEmail('sABC123@email.kmutnb.ac.th'), null);
  assert.match(resolveMockAuthAccount('student@email.kmutnb.ac.th', initialMockAuthUsers).error || '', /รูปแบบที่กำหนด/);
});

test('derived student year level continues to use central academic-year calculation', () => {
  const result = calculateYearLevelFromAdmissionYear(2567, 2569);
  assert.equal(result.yearLevel, 3);
  assert.equal(result.formattedYearLevel, 'ชั้นปีที่ 3');
});

test('Student registration cohort options use Major + admissionYear and active status', () => {
  const state = createInitialAcademicState();
  const groups = classGroupsForCohort(state, 'program_inet', 2567, true);
  assert.ok(groups.length > 0);
  assert.ok(groups.every((group) => group.majorId === 'program_inet' && group.admissionYear === 2567 && group.status === 'active'));
  const selectedGroupId = groups[0].id;
  assert.equal(classGroupsForCohort(state, 'program_ine', 2567, true).some((group) => group.id === selectedGroupId), false);
});

test('staff role comes from the predefined mock account record', () => {
  assert.equal(resolveMockAuthAccount('teacher@itm.kmutnb.ac.th', initialMockAuthUsers).user?.role, 'teacher');
  assert.equal(resolveMockAuthAccount('admin@itm.kmutnb.ac.th', initialMockAuthUsers).user?.role, 'admin');
});

test('unknown supported accounts do not acquire a role', () => {
  const result = resolveMockAuthAccount('unknown@itm.kmutnb.ac.th', initialMockAuthUsers);
  assert.equal(result.user, undefined);
  assert.match(result.error || '', /ไม่พบข้อมูลบัญชี/);
});

test('registration requires verified mock face enrollment', () => {
  const target = initialMockAuthUsers.find((user) => user.id === 'auth_student_new')!;
  const blocked = completeMockRegistration(initialMockAuthUsers, target.id, 'captured');
  assert.equal(blocked.success, false);
  assert.match(blocked.error || '', /ลงทะเบียนใบหน้า/);
  const completed = completeMockRegistration(initialMockAuthUsers, target.id, 'verified_mock');
  assert.equal(completed.success, true);
  assert.equal(completed.users.find((user) => user.id === target.id)?.registered, true);
});

test('duplicate registration is rejected', () => {
  const result = completeMockRegistration(initialMockAuthUsers, 'auth_student_registered', 'verified_mock');
  assert.equal(result.success, false);
  assert.match(result.error || '', /ลงทะเบียนในระบบแล้ว/);
});

test('persisted state may update registration only, not email, role or subject identity', () => {
  const migrated = migrateMockAuthUsers([{
    ...initialMockAuthUsers[0],
    role: 'admin',
    subjectId: 'adm_0001',
    registered: true,
    faceEnrollmentStatus: 'verified_mock',
  }]);
  assert.equal(migrated[0].role, 'student');
  assert.equal(migrated[0].subjectId, 'std_0001');
  assert.equal(migrated[0].registered, true);
});

test('persisted registration cannot be complete without verified mock face enrollment', () => {
  const migrated = migrateMockAuthUsers([{
    ...initialMockAuthUsers[0],
    registered: true,
    faceEnrollmentStatus: 'captured',
  }]);
  assert.equal(migrated[0].registered, false);
  assert.equal(migrated[0].faceEnrollmentStatus, 'captured');
});

test('legacy student mock email migrates to the new prefixed format without losing registration', () => {
  const migrated = migrateMockAuthUsers([{
    ...initialMockAuthUsers[0],
    email: '6410123456@email.kmutnb.ac.th',
    registered: true,
    faceEnrollmentStatus: 'verified_mock',
  }]);
  assert.equal(migrated[0].email, 's6701011500167@email.kmutnb.ac.th');
  assert.equal(migrated[0].registered, true);
});
