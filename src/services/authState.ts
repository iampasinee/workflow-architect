import type {
  FaceEnrollmentStatus,
  MockAuthResolution,
  MockAuthUser,
  MockGoogleAccountOption,
  ParsedStudentUniversityEmail,
  UniversityAccountResolution,
} from '../types/auth';
import { inferAdmissionYearFromStudentId } from '../utils/academicYear';

export const mockAuthStorageKey = 'securelab_mock_auth_users_v1';

const faceStatuses: FaceEnrollmentStatus[] = [
  'not_started',
  'capturing',
  'captured',
  'verified_mock',
];

export const initialMockAuthUsers: MockAuthUser[] = [
  {
    id: 'auth_student_new',
    email: 's6701011500167@email.kmutnb.ac.th',
    role: 'student',
    subjectId: 'std_0001',
    registered: false,
    faceEnrollmentStatus: 'not_started',
  },
  {
    id: 'auth_student_registered',
    email: 's6410123457@email.kmutnb.ac.th',
    role: 'student',
    subjectId: 'std_0002',
    registered: true,
    faceEnrollmentStatus: 'verified_mock',
  },
  {
    id: 'auth_teacher_new',
    email: 'teacher@itm.kmutnb.ac.th',
    role: 'teacher',
    subjectId: 'tch_0002',
    registered: false,
    faceEnrollmentStatus: 'not_started',
  },
  {
    id: 'auth_teacher_registered',
    email: 'anucha@itm.kmutnb.ac.th',
    role: 'teacher',
    subjectId: 'tch_0001',
    registered: true,
    faceEnrollmentStatus: 'verified_mock',
  },
  {
    id: 'auth_admin_provisioned',
    email: 'admin@itm.kmutnb.ac.th',
    role: 'admin',
    subjectId: 'adm_0001',
    registered: false,
    faceEnrollmentStatus: 'not_started',
    adminProvisioned: true,
  },
];

export const mockGoogleAccountOptions: MockGoogleAccountOption[] = [
  { email: 's6701011500167@email.kmutnb.ac.th', label: 'นักศึกษา — ยังไม่ลงทะเบียน' },
  { email: 's6410123457@email.kmutnb.ac.th', label: 'นักศึกษา — ลงทะเบียนแล้ว' },
  { email: 'teacher@itm.kmutnb.ac.th', label: 'อาจารย์ — ยังไม่ลงทะเบียน' },
  { email: 'anucha@itm.kmutnb.ac.th', label: 'อาจารย์ — ลงทะเบียนแล้ว' },
  { email: 'admin@itm.kmutnb.ac.th', label: 'ผู้ดูแลระบบ — บัญชีที่ระบบกำหนดไว้' },
  { email: 'student@email.kmutnb.ac.th', label: 'รูปแบบบัญชีนักศึกษาไม่ถูกต้อง — สำหรับทดสอบ' },
  { email: 'user@gmail.com', label: 'บัญชีไม่รองรับ — สำหรับทดสอบ' },
];

const legacyMockAuthEmailsById: Record<string, string[]> = {
  auth_student_new: ['6410123456@email.kmutnb.ac.th'],
  auth_student_registered: ['6410123457@email.kmutnb.ac.th'],
};

export const normalizeAuthEmail = (email: string): string => email.trim().toLowerCase();

export const parseStudentUniversityEmail = (email: string): ParsedStudentUniversityEmail | null => {
  const normalizedEmail = normalizeAuthEmail(email);
  const match = normalizedEmail.match(/^s(\d{10,15})@email\.kmutnb\.ac\.th$/);
  if (!match) return null;
  const admissionYear = inferAdmissionYearFromStudentId(match[1]);
  if (!admissionYear) return null;
  return { studentId: match[1], admissionYear };
};

export const resolveUniversityAccount = (email: string): UniversityAccountResolution => {
  const normalizedEmail = normalizeAuthEmail(email);
  if (/^[^@\s]+@email\.kmutnb\.ac\.th$/.test(normalizedEmail)) {
    return { domain: 'student', normalizedEmail };
  }
  if (/^[^@\s]+@itm\.kmutnb\.ac\.th$/.test(normalizedEmail)) {
    return { domain: 'staff', normalizedEmail };
  }
  return { domain: 'unsupported', normalizedEmail };
};

export const resolveMockAuthAccount = (
  email: string,
  users: MockAuthUser[],
): MockAuthResolution => {
  const resolution = resolveUniversityAccount(email);
  if (resolution.domain === 'unsupported') {
    return { ...resolution, error: 'อีเมลนี้ไม่ใช่บัญชีที่รองรับ' };
  }
  if (resolution.domain === 'student' && !parseStudentUniversityEmail(resolution.normalizedEmail)) {
    return { ...resolution, error: 'กรุณาใช้บัญชีนักศึกษาของมหาวิทยาลัยในรูปแบบที่กำหนด' };
  }
  const user = users.find((item) => normalizeAuthEmail(item.email) === resolution.normalizedEmail);
  if (!user) {
    return { ...resolution, error: 'ยังไม่พบข้อมูลบัญชีนี้ในชุดข้อมูลจำลอง' };
  }
  if (resolution.domain === 'student' && user.role !== 'student') {
    return { ...resolution, error: 'ประเภทบัญชีไม่ตรงกับโดเมนนักศึกษา' };
  }
  if (resolution.domain === 'staff' && user.role === 'student') {
    return { ...resolution, error: 'ประเภทบัญชีไม่ตรงกับโดเมนบุคลากร' };
  }
  if (user.role === 'admin' && !user.adminProvisioned) {
    return { ...resolution, error: 'บัญชีผู้ดูแลระบบต้องได้รับการกำหนดสิทธิ์จากระบบ' };
  }
  return { ...resolution, user };
};

export const migrateMockAuthUsers = (raw: unknown): MockAuthUser[] => {
  if (!Array.isArray(raw)) return initialMockAuthUsers.map((user) => ({ ...user }));
  return initialMockAuthUsers.map((seed) => {
    const stored = raw.find((item) => item && typeof item === 'object' && 'id' in item && item.id === seed.id) as Partial<MockAuthUser> | undefined;
    const storedEmail = normalizeAuthEmail(stored?.email || '');
    const acceptedEmails = [seed.email, ...(legacyMockAuthEmailsById[seed.id] || [])];
    if (!stored || !acceptedEmails.includes(storedEmail)) return { ...seed };
    const faceEnrollmentStatus = faceStatuses.includes(stored.faceEnrollmentStatus as FaceEnrollmentStatus)
      ? stored.faceEnrollmentStatus as FaceEnrollmentStatus
      : seed.faceEnrollmentStatus;
    return {
      ...seed,
      registered: stored.registered === true && faceEnrollmentStatus === 'verified_mock',
      faceEnrollmentStatus,
    };
  });
};

export const completeMockRegistration = (
  users: MockAuthUser[],
  userId: string,
  faceEnrollmentStatus: FaceEnrollmentStatus,
): { success: boolean; users: MockAuthUser[]; error?: string } => {
  const target = users.find((user) => user.id === userId);
  if (!target) return { success: false, users, error: 'ไม่พบบัญชีที่ต้องการลงทะเบียน' };
  if (target.registered) return { success: false, users, error: 'บัญชีนี้ลงทะเบียนในระบบแล้ว' };
  if (faceEnrollmentStatus !== 'verified_mock') {
    return { success: false, users, error: 'กรุณาลงทะเบียนใบหน้าก่อนดำเนินการต่อ' };
  }
  return {
    success: true,
    users: users.map((user) => user.id === userId
      ? { ...user, registered: true, faceEnrollmentStatus: 'verified_mock' }
      : user),
  };
};
