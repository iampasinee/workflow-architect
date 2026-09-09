export type Role = 'admin' | 'teacher' | 'student';

export type AppLanguage = 'th' | 'en';

export type AccountStatus = 'active' | 'suspended' | 'graduated_inactive';

export type RoomReadiness = 'ready' | 'maintenance' | 'unavailable';

export type MachineStatus = 'online' | 'offline' | 'damaged' | 'unavailable';

export type ExamFormat = 'offline' | 'online';

export type ExamSessionStatus = 'upcoming' | 'in_progress' | 'completed';

export type StudentExamStatus = 'not_started' | 'working' | 'submitted' | 'late' | 'violation' | 'offline' | 'reopened';

export type FileIntegrityStatus = 'valid' | 'invalid' | 'damaged' | 'pending';

export type ViolationType = 'unauthorized_website' | 'duplicate_login' | 'unauthorized_device' | 'tab_switch' | 'peripheral_connected';

export interface Student {
  id: string;
  studentCode: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  firstNameTh?: string;
  lastNameTh?: string;
  firstNameEn?: string;
  lastNameEn?: string;
  email: string;
  faculty: string;
  facultyId?: string;
  department: string;
  year: number;
  departmentId?: string;
  programId?: string;
  program?: string;
  programCode?: string;
  classGroupId?: string;
  classGroup?: string;
  yearLevel?: number;
  yearLevelId?: string;
  faceReferenceStatus?: 'available' | 'missing';
  faceReferenceUrl: string;
  accountStatus: AccountStatus;
  statusReason?: string;
  isFirstTime?: boolean;
}

export interface Teacher {
  id: string;
  teacherCode: string;
  fullName: string;
  email: string;
  faculty: string;
  department: string;
  role: 'teacher';
  icitProfileStatus: 'confirmed' | 'pending';
  accountStatus: AccountStatus;
}

export interface Admin {
  id: string;
  adminCode: string;
  fullName: string;
  email: string;
  role: 'admin';
  accountStatus: AccountStatus;
}

export interface SeatBinding {
  seatNo: string;
  machineNo: string;
  ip: string;
  mac: string;
  status: MachineStatus;
  disabled?: boolean;
}

export interface Room {
  id: string;
  building: string;
  floor: number;
  labName: string;
  status: RoomReadiness;
  rows: number;
  columns: number;
  deskOrientation: 'front' | 'angled' | 'pod';
  seats: SeatBinding[];
}

export interface Section {
  sectionNo: string;
  semester: number;
  academicYear: number;
  teacherId: string;
  studentCount?: number;
}

export interface Course {
  id: string;
  courseCode: string;
  courseName: string;
  faculty: string;
  department: string;
  status: 'active' | 'inactive';
  sections: Section[];
}

export interface ExamRule {
  id: string;
  text: string;
  isCustom?: boolean;
}

export interface ExamSession {
  id: string;
  courseId: string;
  sectionNo: string;
  examDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  adjustedMinutes?: number;
  roomId: string;
  format: ExamFormat;
  fileRequirements: {
    acceptedExtensions: string[]; // e.g. ['.zip', '.py']
    maxSizeMb: number;
    filenamePattern: string; // e.g. "{studentCode}_final"
    automaticFilenamePattern?: string;
    requiredFileCount: number;
    instructions: string;
  };
  rules: ExamRule[];
  status: ExamSessionStatus;
  reopenedStudents?: { [studentId: string]: { reopenedUntil: string; reason: string } };
}

export interface SeatAssignment {
  examId: string;
  seatNo: string;
  studentId: string;
}

export interface SubmittedFile {
  uploadId?: string;
  fileName: string;
  sizeKb: number;
  submittedAt: string;
  integrityStatus: FileIntegrityStatus;
  integrityMessage?: string;
  contentSnippet?: string;
}

export interface Submission {
  id: string;
  examId: string;
  studentId: string;
  files: SubmittedFile[];
  status: 'not_submitted' | 'in_progress' | 'submitted' | 'late';
  integrityCheck: 'pending' | 'passed' | 'failed';
  submittedAt?: string;
}

export interface Violation {
  id: string;
  examId: string;
  studentId: string;
  seatNo: string;
  type: ViolationType;
  detail: string;
  detectedAt: string;
  acknowledged?: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
}

export type UserRole = Role;
export type ExamRoom = Room;
export type SeatStation = SeatBinding;

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  performedBy: string;
  role: string;
  target: string;
  ip: string;
  status: 'success' | 'warning' | 'failure';
}

export interface CheatDetectionRules {
  multipleFaceDetection: boolean;
  lookingAwayDetection: boolean;
  lookingAwayThresholdSeconds: number;
  windowSwitchDetection: boolean;
  allowedWindowSwitches: number;
  urlWhitelistEnforcement: boolean;
  whitelistedUrls?: string[];
}
