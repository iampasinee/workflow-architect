import assert from 'node:assert/strict';
import test from 'node:test';
import {
  completeMockRegistration,
  initialMockAuthUsers,
  migrateMockAuthUsers,
  resolveMockAuthAccount,
  resolveUniversityAccount,
} from './authState';

test('university domains resolve student and staff without granting Admin from domain alone', () => {
  assert.equal(resolveUniversityAccount('6410123456@email.kmutnb.ac.th').domain, 'student');
  assert.equal(resolveUniversityAccount('teacher@itm.kmutnb.ac.th').domain, 'staff');
  assert.equal(resolveUniversityAccount('admin@itm.kmutnb.ac.th').domain, 'staff');
  assert.equal(resolveUniversityAccount('user@gmail.com').domain, 'unsupported');
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
