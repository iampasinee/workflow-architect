import type { Role } from '../types';

export type UniversityAccountDomain = 'student' | 'staff' | 'unsupported';

export type FaceEnrollmentStatus =
  | 'not_started'
  | 'capturing'
  | 'captured'
  | 'verified_mock';

export interface MockAuthUser {
  id: string;
  email: string;
  role: Role;
  subjectId: string;
  registered: boolean;
  faceEnrollmentStatus: FaceEnrollmentStatus;
  /** Admin accounts must be provisioned by the system; the public UI cannot grant this role. */
  adminProvisioned?: boolean;
}

export interface MockGoogleAccountOption {
  email: string;
  label: string;
}

export interface UniversityAccountResolution {
  domain: UniversityAccountDomain;
  normalizedEmail: string;
}

export interface ParsedStudentUniversityEmail {
  studentId: string;
  admissionYear: number;
}

export interface MockAuthResolution extends UniversityAccountResolution {
  user?: MockAuthUser;
  error?: string;
}
