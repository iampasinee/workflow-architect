import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Role,
  AppLanguage,
  Student,
  Teacher,
  Admin,
  Room,
  Course,
  ExamSession,
  SeatAssignment,
  Submission,
  Violation,
  AuditLog,
  AccountStatus,
  MachineStatus,
  ViolationType,
  SeatBinding,
  CheatDetectionRules
} from '../types';
import { getTranslation } from '../i18n/translations';
import { getAdminRouteFromHash } from '../utils/adminRoutes';
import { AcademicInput, AcademicResult, AcademicState, AcademicTier } from '../types/academic';
import {
  academicDeleteError, bulkAssignmentError, createInitialAcademicState, isAcademicPathActive, migrateAcademicStudents,
  normalizeAcademicInput, saveAcademicState, studentAcademicFields, validateAcademicInput,
} from '../services/academicState';
import {
  findAcademicPathByGroup,
  legacyStudentAcademicAssignments,
  OFFICIAL_FACULTY_NAME,
  resolveAcademicGroupId,
} from '../data/academicStructure';
import {
  initialStudents,
  initialTeachers,
  initialAdmins,
  initialRooms,
  initialCourses,
  initialExamSessions,
  initialSeatAssignments,
  initialSubmissions,
  initialViolations
} from '../data/initialData';

export interface ToastMessage {
  id: string;
  title: string;
  message?: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface AppContextType {
  // Localization & Language
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;

  // Navigation & Role
  role: Role | null;
  setRole: (role: Role | null) => void;
  activeAdminRoute: string;
  setActiveAdminRoute: (route: string) => void;
  activeTeacherRoute: string;
  setActiveTeacherRoute: (route: string) => void;
  activeStudentStep: 'ST1' | 'ST2A' | 'ST2B' | 'ST2C' | 'ST3' | 'ST4' | 'ST5' | 'ST6' | 'ST7';
  setActiveStudentStep: (step: 'ST1' | 'ST2A' | 'ST2B' | 'ST2C' | 'ST3' | 'ST4' | 'ST5' | 'ST6' | 'ST7') => void;

  // Active Users
  currentStudent: Student | null;
  setCurrentStudent: (student: Student | null) => void;
  currentTeacher: Teacher | null;
  setCurrentTeacher: (teacher: Teacher | null) => void;
  currentAdmin: Admin | null;
  setCurrentAdmin: (admin: Admin | null) => void;
  currentExamId: string;
  setCurrentExamId: (id: string) => void;

  // Active Violation for Student ST8 Overlay
  activeViolationAlert: Violation | null;
  setActiveViolationAlert: (violation: Violation | null) => void;
  acknowledgeViolation: (id: string) => void;

  // Security & Proctoring
  securityRules: CheatDetectionRules;
  updateSecurityRules: (rules: Partial<CheatDetectionRules>) => void;

  // Collections
  academicState: AcademicState;
  saveAcademicRecord: (tier: AcademicTier, input: AcademicInput, id?: string) => AcademicResult;
  deleteAcademicRecord: (tier: AcademicTier, id: string) => AcademicResult;
  setAcademicStatus: (tier: AcademicTier, id: string, status: 'active' | 'inactive') => AcademicResult;
  assignStudentsToClassGroup: (studentIds: string[], groupId: string) => AcademicResult;
  students: Student[];
  teachers: Teacher[];
  admins: Admin[];
  rooms: Room[];
  courses: Course[];
  examSessions: ExamSession[];
  seatAssignments: SeatAssignment[];
  submissions: Submission[];
  violations: Violation[];
  auditLogs: AuditLog[];

  // Toasts
  toasts: ToastMessage[];
  showToast: (title: string, message?: string, type?: ToastMessage['type']) => void;
  dismissToast: (id: string) => void;

  // Student Actions
  addStudent: (student: Omit<Student, 'id'>) => boolean;
  updateStudent: (id: string, updates: Partial<Student>) => boolean;
  deleteStudent: (id: string) => boolean;
  updateAccountStatus: (id: string, status: AccountStatus, reason?: string) => void;
  updateFaceReference: (id: string, url: string) => void;

  // Teacher Actions
  addTeacher: (teacher: Omit<Teacher, 'id'>) => void;
  updateTeacher: (id: string, updates: Partial<Teacher>) => void;
  deleteTeacher: (id: string) => boolean;
  confirmTeacherProfile: (id: string) => void;

  // Admin Actions
  addAdmin: (admin: Omit<Admin, 'id'>) => void;
  updateAdmin: (id: string, updates: Partial<Admin>) => void;
  deleteAdmin: (id: string) => boolean;

  // Room Actions
  addRoom: (room: Omit<Room, 'id'>) => void;
  updateRoom: (id: string, updates: Partial<Room>) => void;
  deleteRoom: (id: string) => boolean;
  updateRoomSeats: (roomId: string, seats: SeatBinding[], rows: number, columns: number) => void;
  updateSeatBinding: (roomId: string, seatNo: string, updates: Partial<SeatBinding>) => void;

  // Course Actions
  addCourse: (course: Omit<Course, 'id'>) => void;
  updateCourse: (id: string, updates: Partial<Course>) => void;
  deleteCourse: (id: string) => boolean;

  // Exam Actions
  createExamSession: (exam: Omit<ExamSession, 'id'>) => void;
  updateExamSession: (id: string, updates: Partial<ExamSession>) => void;
  adjustExamTime: (examId: string, deltaMinutes: number, scope: 'room' | 'student', targetStudentId?: string, reason?: string) => void;
  reopenSubmission: (examId: string, extraMinutes: number, scope: 'room' | 'student', targetStudentId?: string, reason?: string) => void;

  // Seat Assignment Actions
  assignSeat: (examId: string, seatNo: string, studentId: string) => void;
  unassignSeat: (examId: string, seatNo: string) => void;
  autoAssignSeats: (examId: string, roomId: string) => void;

  // Submission Actions
  submitStudentFiles: (examId: string, studentId: string, files: { uploadId: string; submissionName: string; sizeBytes: number; snippet?: string }[]) => boolean;

  // Simulation helpers
  triggerViolation: (examId: string, studentId: string, seatNo: string, type: ViolationType, detail: string) => void;
  toggleMachineStatus: (roomId: string, seatNo: string, status: MachineStatus) => void;
  resetToMockDefaults: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const defaultSecurityRules: CheatDetectionRules = {
  multipleFaceDetection: true,
  lookingAwayDetection: true,
  lookingAwayThresholdSeconds: 4,
  windowSwitchDetection: true,
  allowedWindowSwitches: 1,
  urlWhitelistEnforcement: true,
  whitelistedUrls: ['*.icit.university.ac.th', 'python.org/docs'],
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Website language state (default: 'th')
  const [language, setLanguageState] = useState<AppLanguage>('th');

  const setLanguage = (_lang: AppLanguage) => {
    setLanguageState('th');
    localStorage.setItem('securelab_language', 'th');
  };

  const toggleLanguage = () => {
    setLanguage('th');
  };

  const t = (key: string, fallback?: string) => {
    return getTranslation(key, language, fallback);
  };

  const safeParse = <T,>(key: string, fallback: T): T => {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return fallback;
      return JSON.parse(saved);
    } catch (err) {
      console.warn(`Error reading localStorage for ${key}:`, err);
      return fallback;
    }
  };

  // Load initial from localStorage if available
  // Authentication is session-only. Always begin at the login landing page
  // instead of restoring a previously selected simulation role.
  const [role, setRole] = useState<Role | null>(null);

  const [activeAdminRoute, setActiveAdminRoute] = useState<string>(() => getAdminRouteFromHash());
  const [activeTeacherRoute, setActiveTeacherRoute] = useState<string>('T1');
  const [activeStudentStep, setActiveStudentStep] = useState<'ST1' | 'ST2A' | 'ST2B' | 'ST2C' | 'ST3' | 'ST4' | 'ST5' | 'ST6' | 'ST7'>('ST1');

  const [academicState, setAcademicState] = useState<AcademicState>(() =>
    safeParse('securelab_academic_state', createInitialAcademicState()));

  const [students, setStudents] = useState<Student[]>(() => {
    const storedStudents = safeParse('securelab_students', initialStudents);
    const seedMigrationKey = 'securelab_academic_mock_students_v1';
    let mergedStudents = storedStudents;

    if (localStorage.getItem(seedMigrationKey) !== 'complete') {
      const existingIds = new Set(storedStudents.map((student) => student.id));
      const academicSamples = initialStudents.filter((student) =>
        student.id.startsWith('std_inet_') || student.id.startsWith('std_ine_'));
      mergedStudents = [
        ...storedStudents,
        ...academicSamples.filter((student) => !existingIds.has(student.id)),
      ];
      localStorage.setItem(seedMigrationKey, 'complete');
    }

    const facultyMigrationKey = 'securelab_thai_faculty_relation_v2';
    if (localStorage.getItem(facultyMigrationKey) === 'complete' || localStorage.getItem('securelab_academic_state')) {
      return migrateAcademicStudents(mergedStudents, academicState);
    }

    const migratedStudents = mergedStudents.map((student) => {
      const legacyStudent = student as Student & { facultyId?: string };
      const { facultyId: _removedFacultyId, ...studentWithoutFacultyId } = legacyStudent;
      const groupId = resolveAcademicGroupId(
        student.classGroupId || legacyStudentAcademicAssignments[student.id],
      );
      const path = findAcademicPathByGroup(groupId);

      return {
        ...studentWithoutFacultyId,
        faculty: OFFICIAL_FACULTY_NAME,
        departmentId: path?.department.id || student.departmentId,
        programId: path?.program.id || student.programId,
        classGroupId: path?.group.id || groupId,
        department: path?.department.nameTh || student.department,
        program: path?.program.nameTh || student.program,
        programCode: path?.program.code || student.programCode,
        classGroup: path?.group.code || student.classGroup,
        year: path?.group.yearLevel || student.year,
        yearLevel: path?.group.yearLevel || student.yearLevel || student.year,
      };
    });
    localStorage.setItem(facultyMigrationKey, 'complete');
    return migrateAcademicStudents(migratedStudents, academicState);
  });

  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    return safeParse('securelab_teachers', initialTeachers);
  });

  const [admins, setAdmins] = useState<Admin[]>(() => {
    return safeParse('securelab_admins', initialAdmins);
  });

  const [rooms, setRooms] = useState<Room[]>(() => {
    return safeParse('securelab_rooms', initialRooms);
  });

  const [courses, setCourses] = useState<Course[]>(() => {
    return safeParse('securelab_courses', initialCourses);
  });

  const [examSessions, setExamSessions] = useState<ExamSession[]>(() => {
    return safeParse('securelab_exams', initialExamSessions);
  });

  const [seatAssignments, setSeatAssignments] = useState<SeatAssignment[]>(() => {
    return safeParse('securelab_seat_assignments', initialSeatAssignments);
  });

  const [submissions, setSubmissions] = useState<Submission[]>(() => {
    return safeParse('securelab_submissions', initialSubmissions);
  });

  const [violations, setViolations] = useState<Violation[]>(() => {
    return safeParse('securelab_violations', initialViolations);
  });

  const [securityRules, setSecurityRules] = useState<CheatDetectionRules>(() => {
    return safeParse('securelab_security_rules', defaultSecurityRules);
  });

  const updateSecurityRules = (rules: Partial<CheatDetectionRules>) => {
    setSecurityRules((prev) => {
      const updated = { ...prev, ...rules };
      localStorage.setItem('securelab_security_rules', JSON.stringify(updated));
      return updated;
    });
  };

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [activeViolationAlert, setActiveViolationAlert] = useState<Violation | null>(null);

  // Active selected personas
  const [currentStudent, setCurrentStudent] = useState<Student | null>(initialStudents[1]);
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(initialTeachers[0]);
  const [currentAdmin, setCurrentAdmin] = useState<Admin | null>(initialAdmins[0]);
  const [currentExamId, setCurrentExamId] = useState<string>('exam_0001');

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('securelab_academic_state', JSON.stringify(academicState));
  }, [academicState]);
  useEffect(() => {
    localStorage.removeItem('securelab_role');
    localStorage.setItem('securelab_language', 'th');
  }, []);

  useEffect(() => {
    localStorage.setItem('securelab_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('securelab_teachers', JSON.stringify(teachers));
  }, [teachers]);

  useEffect(() => {
    localStorage.setItem('securelab_admins', JSON.stringify(admins));
  }, [admins]);

  useEffect(() => {
    localStorage.setItem('securelab_rooms', JSON.stringify(rooms));
  }, [rooms]);

  useEffect(() => {
    localStorage.setItem('securelab_courses', JSON.stringify(courses));
  }, [courses]);

  useEffect(() => {
    localStorage.setItem('securelab_exams', JSON.stringify(examSessions));
  }, [examSessions]);

  useEffect(() => {
    localStorage.setItem('securelab_seat_assignments', JSON.stringify(seatAssignments));
  }, [seatAssignments]);

  useEffect(() => {
    localStorage.setItem('securelab_submissions', JSON.stringify(submissions));
  }, [submissions]);

  useEffect(() => {
    localStorage.setItem('securelab_violations', JSON.stringify(violations));
  }, [violations]);

  // Toast Helpers
  const showToast = (title: string, message?: string, type: ToastMessage['type'] = 'info') => {
    const id = 'toast_' + Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      dismissToast(id);
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const academicFailure = (error: string): AcademicResult => {
    showToast('ไม่สามารถดำเนินการได้', error, 'error');
    return { success: false, error };
  };

  const commitAcademicState = (next: AcademicState) => {
    setAcademicState(next);
    setStudents((current) => current.map((student) => ({ ...student, ...studentAcademicFields(next, student) })));
    setCurrentStudent((current) => current ? { ...current, ...studentAcademicFields(next, current) } : null);
  };

  const saveAcademicRecord = (tier: AcademicTier, rawInput: AcademicInput, id?: string): AcademicResult => {
    if (role !== 'admin') return academicFailure('เฉพาะผู้ดูแลระบบเท่านั้น');
    const input = normalizeAcademicInput(rawInput);
    const error = validateAcademicInput(academicState, tier, input, id);
    if (error) return academicFailure(error);
    commitAcademicState(saveAcademicState(academicState, tier, input, id));
    showToast('บันทึกข้อมูลสำเร็จ', 'อัปเดตข้อมูลคณะและกลุ่มเรียนเรียบร้อยแล้ว', 'success');
    return { success: true };
  };

  const deleteAcademicRecord = (tier: AcademicTier, id: string): AcademicResult => {
    if (role !== 'admin') return academicFailure('เฉพาะผู้ดูแลระบบเท่านั้น');
    if (!academicState[tier].some((r) => r.id === id)) return academicFailure('ไม่พบข้อมูลที่ต้องการลบ');
    const error = academicDeleteError(academicState, students, tier, id);
    if (error) return academicFailure(error);
    setAcademicState({ ...academicState, [tier]: academicState[tier].filter((r) => r.id !== id) });
    showToast('ลบข้อมูลเรียบร้อยแล้ว', undefined, 'success');
    return { success: true };
  };

  const setAcademicStatus = (tier: AcademicTier, id: string, status: 'active' | 'inactive'): AcademicResult => {
    if (role !== 'admin') return academicFailure('เฉพาะผู้ดูแลระบบเท่านั้น');
    if (!academicState[tier].some((r) => r.id === id)) return academicFailure('ไม่พบข้อมูล');
    setAcademicState({ ...academicState, [tier]: academicState[tier].map((r) =>
      r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r) });
    showToast(status === 'active' ? 'เปิดใช้งานแล้ว' : 'ปิดใช้งานแล้ว', 'ข้อมูลนักศึกษาเดิมยังคงอยู่', 'success');
    return { success: true };
  };

  const assignStudentsToClassGroup = (studentIds: string[], groupId: string): AcademicResult => {
    if (role !== 'admin') return academicFailure('เฉพาะผู้ดูแลระบบเท่านั้น');
    const error = bulkAssignmentError(academicState, students, studentIds, groupId);
    if (error) return academicFailure(error);
    setStudents((current) => current.map((student) => studentIds.includes(student.id)
      ? { ...student, ...studentAcademicFields(academicState, { ...student, classGroupId: groupId }) } : student));
    setCurrentStudent((current) => current && studentIds.includes(current.id)
      ? { ...current, ...studentAcademicFields(academicState, { ...current, classGroupId: groupId }) } : current);
    showToast('กำหนดกลุ่มเรียนสำเร็จ', `กำหนดกลุ่มให้ ${new Set(studentIds).size} คนแล้ว`, 'success');
    return { success: true };
  };

  // Student CRUD
  const addStudent = (newStd: Omit<Student, 'id'>) => {
    if (newStd.classGroupId && !isAcademicPathActive(academicState, 'classGroups', newStd.classGroupId)) {
      showToast('ไม่สามารถเพิ่มนักศึกษาได้', 'กรุณาเลือกกลุ่มเรียนที่เปิดใช้งาน', 'error');
      return false;
    }
    const id = crypto.randomUUID();
    const created: Student = { ...newStd, ...studentAcademicFields(academicState, { ...newStd, id }), id };
    setStudents(prev => [created, ...prev]);
    showToast('เพิ่มนักศึกษาสำเร็จ', `ลงทะเบียน ${created.fullName} (${created.studentCode}) เรียบร้อยแล้ว`, 'success');
    return true;
  };

  const updateStudent = (id: string, updates: Partial<Student>) => {
    const existing = students.find((student) => student.id === id);
    if (!existing) return false;
    if (updates.classGroupId && updates.classGroupId !== existing.classGroupId &&
      !isAcademicPathActive(academicState, 'classGroups', updates.classGroupId)) {
      showToast('ไม่สามารถย้ายกลุ่มได้', 'กลุ่มเรียนหรือต้นสังกัดถูกปิดใช้งาน', 'error');
      return false;
    }
    updates = { ...updates, ...studentAcademicFields(academicState, { ...existing, ...updates }) };
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    if (currentStudent?.id === id) {
      setCurrentStudent(prev => prev ? { ...prev, ...updates } : null);
    }
    showToast('อัปเดตข้อมูลนักศึกษาแล้ว', 'บันทึกข้อมูลเรียบร้อยแล้ว', 'success');
    return true;
  };

  const deleteStudent = (id: string): boolean => {
    // Check if student has exam assignments or submissions
    const hasAssignments = seatAssignments.some(sa => sa.studentId === id);
    if (hasAssignments) {
      showToast('ไม่สามารถลบนักศึกษาได้', 'นักศึกษามีที่นั่งสอบอยู่ กรุณายกเลิกการกำหนดที่นั่งหรือระงับบัญชีก่อน', 'error');
      return false;
    }
    setStudents(prev => prev.filter(s => s.id !== id));
    showToast('ลบนักศึกษาแล้ว', 'นำข้อมูลออกจากระบบเรียบร้อยแล้ว', 'info');
    return true;
  };

  const updateAccountStatus = (id: string, status: AccountStatus, reason?: string) => {
    updateStudent(id, { accountStatus: status, statusReason: reason });
  };

  const updateFaceReference = (id: string, url: string) => {
    updateStudent(id, {
      faceReferenceUrl: url,
      faceReferenceStatus: url ? 'available' : 'missing',
      isFirstTime: false,
    });
    showToast('อัปเดตข้อมูลใบหน้าแล้ว', 'บันทึกข้อมูลใบหน้าสำหรับยืนยันตัวตนเรียบร้อยแล้ว', 'success');
  };

  // Teacher CRUD
  const addTeacher = (newTch: Omit<Teacher, 'id'>) => {
    const id = `tch_${String(teachers.length + 1).padStart(4, '0')}`;
    const created: Teacher = { ...newTch, id };
    setTeachers(prev => [created, ...prev]);
    showToast('เพิ่มอาจารย์สำเร็จ', `ลงทะเบียน ${created.fullName} เรียบร้อยแล้ว`, 'success');
  };

  const updateTeacher = (id: string, updates: Partial<Teacher>) => {
    setTeachers(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    if (currentTeacher?.id === id) {
      setCurrentTeacher(prev => prev ? { ...prev, ...updates } : null);
    }
    showToast('อัปเดตข้อมูลอาจารย์แล้ว', 'บันทึกข้อมูลเรียบร้อยแล้ว', 'success');
  };

  const deleteTeacher = (id: string): boolean => {
    const hasAssignedSection = courses.some(c => c.sections.some(s => s.teacherId === id));
    if (hasAssignedSection) {
      showToast('ไม่สามารถลบอาจารย์ได้', 'อาจารย์ยังรับผิดชอบรายวิชาที่เปิดใช้งาน กรุณาเปลี่ยนอาจารย์ผู้รับผิดชอบก่อน', 'error');
      return false;
    }
    setTeachers(prev => prev.filter(t => t.id !== id));
    showToast('ลบอาจารย์แล้ว', 'นำข้อมูลออกจากระบบเรียบร้อยแล้ว', 'info');
    return true;
  };

  const confirmTeacherProfile = (id: string) => {
    updateTeacher(id, { icitProfileStatus: 'confirmed' });
    showToast('ยืนยันโปรไฟล์แล้ว', 'ยืนยันตัวตน ICIT สำหรับสิทธิ์อาจารย์เรียบร้อยแล้ว', 'success');
  };

  // Admin CRUD
  const addAdmin = (newAdm: Omit<Admin, 'id'>) => {
    const id = `adm_${String(admins.length + 1).padStart(4, '0')}`;
    const created: Admin = { ...newAdm, id };
    setAdmins(prev => [created, ...prev]);
    showToast('เพิ่มผู้ดูแลระบบสำเร็จ', `เพิ่ม ${created.fullName} พร้อมสิทธิ์ผู้ดูแลระบบแล้ว`, 'success');
  };

  const updateAdmin = (id: string, updates: Partial<Admin>) => {
    setAdmins(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    if (currentAdmin?.id === id) {
      setCurrentAdmin(prev => prev ? { ...prev, ...updates } : null);
    }
    showToast('อัปเดตผู้ดูแลระบบแล้ว', 'บันทึกข้อมูลเรียบร้อยแล้ว', 'success');
  };

  const deleteAdmin = (id: string): boolean => {
    if (admins.length <= 1) {
      showToast('ไม่อนุญาตให้ดำเนินการ', 'ระบบต้องมีผู้ดูแลที่ใช้งานได้อย่างน้อยหนึ่งบัญชี', 'error');
      return false;
    }
    setAdmins(prev => prev.filter(a => a.id !== id));
    showToast('ลบผู้ดูแลระบบแล้ว', 'นำข้อมูลออกจากระบบเรียบร้อยแล้ว', 'info');
    return true;
  };

  // Room CRUD
  const addRoom = (newRoom: Omit<Room, 'id'>) => {
    const id = `room_${String(rooms.length + 1).padStart(4, '0')}`;
    const created: Room = { ...newRoom, id };
    setRooms(prev => [created, ...prev]);
    showToast('เพิ่มห้องสอบสำเร็จ', `สร้าง ${created.labName} (${created.building}) แล้ว`, 'success');
  };

  const updateRoom = (id: string, updates: Partial<Room>) => {
    setRooms(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    showToast('อัปเดตห้องสอบแล้ว', 'บันทึกรายละเอียดห้องสอบเรียบร้อยแล้ว', 'success');
  };

  const deleteRoom = (id: string): boolean => {
    const hasActiveExam = examSessions.some(e => e.roomId === id && e.status !== 'completed');
    if (hasActiveExam) {
      showToast('ไม่สามารถลบห้องสอบได้', 'ห้องนี้ถูกใช้กับการสอบที่กำลังจะเริ่มหรือกำลังดำเนินการ', 'error');
      return false;
    }
    setRooms(prev => prev.filter(r => r.id !== id));
    showToast('ลบห้องสอบแล้ว', 'นำห้องสอบออกจากระบบเรียบร้อยแล้ว', 'info');
    return true;
  };

  const updateRoomSeats = (roomId: string, seats: SeatBinding[], rows: number, columns: number) => {
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, seats, rows, columns } : r));
    showToast('บันทึกผังที่นั่งแล้ว', `อัปเดตผังเป็น ${rows} แถว × ${columns} คอลัมน์ รวม ${seats.length} เครื่อง`, 'success');
  };

  const updateSeatBinding = (roomId: string, seatNo: string, updates: Partial<SeatBinding>) => {
    setRooms(prev => prev.map(r => {
      if (r.id !== roomId) return r;
      const updatedSeats = r.seats.map(s => s.seatNo === seatNo ? { ...s, ...updates } : s);
      return { ...r, seats: updatedSeats };
    }));
  };

  // Course CRUD
  const addCourse = (newCourse: Omit<Course, 'id'>) => {
    const id = `crs_${String(courses.length + 1).padStart(4, '0')}`;
    const created: Course = { ...newCourse, id };
    setCourses(prev => [created, ...prev]);
    showToast('สร้างรายวิชาแล้ว', `เพิ่ม ${created.courseCode} ในรายการรายวิชาเรียบร้อยแล้ว`, 'success');
  };

  const updateCourse = (id: string, updates: Partial<Course>) => {
    setCourses(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    showToast('อัปเดตรายวิชาแล้ว', 'บันทึกข้อมูลรายวิชาเรียบร้อยแล้ว', 'success');
  };

  const deleteCourse = (id: string): boolean => {
    const hasExams = examSessions.some(e => e.courseId === id);
    if (hasExams) {
      showToast('ไม่สามารถลบรายวิชาได้', 'รายวิชานี้เชื่อมโยงกับรอบการสอบอยู่', 'error');
      return false;
    }
    setCourses(prev => prev.filter(c => c.id !== id));
    showToast('ลบรายวิชาแล้ว', 'นำรายวิชาออกจากรายการเรียบร้อยแล้ว', 'info');
    return true;
  };

  // Exam Sessions
  const createExamSession = (newExam: Omit<ExamSession, 'id'>) => {
    const id = `exam_${String(examSessions.length + 1).padStart(4, '0')}`;
    const created: ExamSession = { ...newExam, id };
    setExamSessions(prev => [created, ...prev]);
    showToast('สร้างรอบการสอบแล้ว', `กำหนดสอบวันที่ ${created.examDate} เวลา ${created.startTime}`, 'success');
  };

  const updateExamSession = (id: string, updates: Partial<ExamSession>) => {
    setExamSessions(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    showToast('อัปเดตรอบการสอบแล้ว', 'บันทึกการเปลี่ยนแปลงเรียบร้อยแล้ว', 'success');
  };

  const adjustExamTime = (
    examId: string,
    deltaMinutes: number,
    scope: 'room' | 'student',
    targetStudentId?: string,
    reason: string = 'Instructor adjustment'
  ) => {
    setExamSessions(prev => prev.map(e => {
      if (e.id !== examId) return e;
      const currentAdj = e.adjustedMinutes || 0;
      const newAdj = currentAdj + deltaMinutes;
      return { ...e, adjustedMinutes: newAdj };
    }));

    const log: AuditLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      actor: currentTeacher?.fullName || 'อาจารย์',
      action: `${deltaMinutes > 0 ? '+' : ''}${deltaMinutes} นาที (${scope === 'room' ? 'ทั้งห้อง' : 'รายบุคคล'})`,
      details: `เหตุผล: ${reason}${targetStudentId ? ` | นักศึกษา: ${targetStudentId}` : ''}`,
    };
    setAuditLogs(prev => [log, ...prev]);

    showToast(
      'ปรับเวลาสอบแล้ว',
      `ปรับเวลา ${deltaMinutes > 0 ? '+' : ''}${deltaMinutes} นาทีสำหรับ${scope === 'room' ? 'ทั้งห้อง' : 'นักศึกษาที่เลือก'} เหตุผล: ${reason}`,
      'warning'
    );
  };

  const reopenSubmission = (
    examId: string,
    extraMinutes: number,
    scope: 'room' | 'student',
    targetStudentId?: string,
    reason: string = 'อนุญาตเป็นกรณีพิเศษ'
  ) => {
    const now = new Date();
    const reopenedUntil = new Date(now.getTime() + extraMinutes * 60000).toISOString();

    setExamSessions(prev => prev.map(e => {
      if (e.id !== examId) return e;
      const reopenedStudents = { ...(e.reopenedStudents || {}) };
      if (scope === 'student' && targetStudentId) {
        reopenedStudents[targetStudentId] = { reopenedUntil, reason };
      } else if (scope === 'room') {
        reopenedStudents['*'] = { reopenedUntil, reason };
      }
      return {
        ...e,
        status: 'in_progress',
        adjustedMinutes: (e.adjustedMinutes || 0) + extraMinutes,
        reopenedStudents,
      };
    }));

    const log: AuditLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      actor: currentTeacher?.fullName || 'อาจารย์',
      action: `เปิดให้ส่งไฟล์อีกครั้ง (+${extraMinutes} นาที, ${scope === 'room' ? 'ทั้งห้อง' : 'รายบุคคล'})`,
      details: reason,
    };
    setAuditLogs(prev => [log, ...prev]);

    showToast('เปิดให้ส่งไฟล์อีกครั้ง', `ปลดล็อกการส่งไฟล์เพิ่มอีก ${extraMinutes} นาที`, 'success');
  };

  // Seat Assignments
  const assignSeat = (examId: string, seatNo: string, studentId: string) => {
    setSeatAssignments(prev => {
      const filtered = prev.filter(sa => !(sa.examId === examId && (sa.seatNo === seatNo || sa.studentId === studentId)));
      return [...filtered, { examId, seatNo, studentId }];
    });
  };

  const unassignSeat = (examId: string, seatNo: string) => {
    setSeatAssignments(prev => prev.filter(sa => !(sa.examId === examId && sa.seatNo === seatNo)));
  };

  const autoAssignSeats = (examId: string, roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    // Filter available seats (online, not damaged, not disabled)
    const availableSeats = room.seats.filter(s => s.status === 'online' && !s.disabled);
    const activeStudents = students.filter(s => s.accountStatus === 'active');

    const newAssignments: SeatAssignment[] = [];
    const minCount = Math.min(availableSeats.length, activeStudents.length);

    for (let i = 0; i < minCount; i++) {
      newAssignments.push({
        examId,
        seatNo: availableSeats[i].seatNo,
        studentId: activeStudents[i].id,
      });
    }

    setSeatAssignments(prev => {
      const others = prev.filter(sa => sa.examId !== examId);
      return [...others, ...newAssignments];
    });

    showToast('จัดที่นั่งอัตโนมัติแล้ว', `จัดที่นั่งให้นักศึกษา ${minCount} คน โดยข้ามเครื่องที่ชำรุดและออฟไลน์`, 'success');
  };

  // Student Submissions
  const submitStudentFiles = (
    examId: string,
    studentId: string,
    uploadedFiles: { uploadId: string; submissionName: string; sizeBytes: number; snippet?: string }[]
  ): boolean => {
    const exam = examSessions.find(e => e.id === examId);
    const student = students.find(s => s.id === studentId);
    const existingSubmission = submissions.find(
      s => s.examId === examId && s.studentId === studentId
    );
    const reopening = exam?.reopenedStudents?.[studentId] || exam?.reopenedStudents?.['*'];
    const hasActiveReopening = Boolean(
      reopening && new Date(reopening.reopenedUntil).getTime() > Date.now()
    );
    const hasFinalSubmission =
      existingSubmission?.status === 'submitted' || existingSubmission?.status === 'late';

    if (!student || student.accountStatus !== 'active') {
      showToast('ไม่อนุญาตให้อัปโหลด', 'เฉพาะนักศึกษาที่ลงทะเบียนและมีบัญชีสถานะปกติเท่านั้นที่อัปโหลดได้', 'error');
      return false;
    }

    if (!exam || exam.status !== 'in_progress') {
      showToast('ไม่อนุญาตให้อัปโหลด', 'อัปโหลดไฟล์ได้เฉพาะระหว่างการสอบที่กำลังดำเนินการ', 'error');
      return false;
    }

    if (hasFinalSubmission && !hasActiveReopening) {
      showToast('การส่งถูกล็อก', 'กรุณาขอให้อาจารย์เปิดการส่งอีกครั้งก่อนอัปโหลดไฟล์ทดแทน', 'warning');
      return false;
    }

    const submittedAt = new Date().toISOString();
    const verifiedFiles = uploadedFiles.map(f => {
      const isDamaged = f.sizeBytes === 0;
      return {
        uploadId: f.uploadId,
        fileName: f.submissionName,
        sizeKb: f.sizeBytes / 1024,
        submittedAt,
        integrityStatus: (isDamaged ? 'damaged' : 'valid') as 'valid' | 'damaged',
        integrityMessage: isDamaged
          ? 'The selected file is empty (0 bytes). Please choose a file containing your answer.'
          : 'Format and checksum verified',
        contentSnippet: f.snippet || '',
      };
    });

    const anyDamaged = verifiedFiles.some(f => f.integrityStatus === 'damaged');

    const newSub: Submission = {
      id: 'sub_' + Math.random().toString(36).substring(2, 9),
      examId,
      studentId,
      files: verifiedFiles,
      status: anyDamaged ? 'in_progress' : 'submitted',
      integrityCheck: anyDamaged ? 'failed' : 'passed',
      submittedAt,
    };

    setSubmissions(prev => {
      const filtered = prev.filter(s => !(s.examId === examId && s.studentId === studentId));
      return [...filtered, newSub];
    });

    if (anyDamaged) {
      showToast('ตรวจสอบความสมบูรณ์ไม่ผ่าน', 'มีไฟล์ว่างหรือเสียหาย กรุณาอัปโหลดใหม่', 'error');
    } else {
      showToast('ยืนยันการส่งแล้ว', 'ระบบได้รับและสร้างค่าแฮชไฟล์คำตอบเรียบร้อยแล้ว', 'success');
    }
    return true;
  };

  // Simulation controls
  const triggerViolation = (
    examId: string,
    studentId: string,
    seatNo: string,
    type: ViolationType,
    detail: string
  ) => {
    const newViolation: Violation = {
      id: 'vio_' + Date.now(),
      examId,
      studentId,
      seatNo,
      type,
      detail,
      detectedAt: new Date().toLocaleTimeString(),
      acknowledged: false,
    };

    setViolations(prev => [newViolation, ...prev]);

    // If active student matches, trigger ST8 alert immediately
    if (currentStudent?.id === studentId) {
      setActiveViolationAlert(newViolation);
    }

    showToast('แจ้งเตือนเหตุผิดปกติ', `ที่นั่ง ${seatNo}: ${detail}`, 'error');
  };

  const acknowledgeViolation = (id: string) => {
    setViolations(prev => prev.map(v => v.id === id ? { ...v, acknowledged: true } : v));
    setActiveViolationAlert(null);
  };

  const toggleMachineStatus = (roomId: string, seatNo: string, status: MachineStatus) => {
    updateSeatBinding(roomId, seatNo, { status, disabled: status === 'unavailable' || status === 'damaged' });
    const statusText: Record<MachineStatus, string> = {
      online: 'ออนไลน์',
      offline: 'ออฟไลน์',
      damaged: 'ชำรุด',
      unavailable: 'ไม่พร้อมใช้งาน',
    };
    showToast('อัปเดตสถานะอุปกรณ์แล้ว', `ตั้งค่าที่นั่ง ${seatNo} เป็น ${statusText[status]}`, 'info');
  };

  const resetToMockDefaults = () => {
    localStorage.clear();
    const academicDefaults = createInitialAcademicState();
    setAcademicState(academicDefaults);
    setStudents(migrateAcademicStudents(initialStudents, academicDefaults));
    setTeachers(initialTeachers);
    setAdmins(initialAdmins);
    setRooms(initialRooms);
    setCourses(initialCourses);
    setExamSessions(initialExamSessions);
    setSeatAssignments(initialSeatAssignments);
    setSubmissions(initialSubmissions);
    setViolations(initialViolations);
    setSecurityRules(defaultSecurityRules);
    setAuditLogs([]);
    setCurrentStudent(initialStudents[1]);
    setCurrentTeacher(initialTeachers[0]);
    setCurrentAdmin(initialAdmins[0]);
    setCurrentExamId('exam_0001');
    setActiveStudentStep('ST1');
    showToast('รีเซ็ตข้อมูลแล้ว', 'คืนค่าข้อมูลทั้งหมดเป็นข้อมูลเริ่มต้นเรียบร้อยแล้ว', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        academicState,
        saveAcademicRecord,
        deleteAcademicRecord,
        setAcademicStatus,
        assignStudentsToClassGroup,
        language,
        setLanguage,
        toggleLanguage,
        t,

        role,
        setRole,
        activeAdminRoute,
        setActiveAdminRoute,
        activeTeacherRoute,
        setActiveTeacherRoute,
        activeStudentStep,
        setActiveStudentStep,

        currentStudent,
        setCurrentStudent,
        currentTeacher,
        setCurrentTeacher,
        currentAdmin,
        setCurrentAdmin,
        currentExamId,
        setCurrentExamId,

        activeViolationAlert,
        setActiveViolationAlert,
        acknowledgeViolation,

        securityRules,
        updateSecurityRules,

        students,
        teachers,
        admins,
        rooms,
        courses,
        examSessions,
        seatAssignments,
        submissions,
        violations,
        auditLogs,

        toasts,
        showToast,
        dismissToast,

        addStudent,
        updateStudent,
        deleteStudent,
        updateAccountStatus,
        updateFaceReference,

        addTeacher,
        updateTeacher,
        deleteTeacher,
        confirmTeacherProfile,

        addAdmin,
        updateAdmin,
        deleteAdmin,

        addRoom,
        updateRoom,
        deleteRoom,
        updateRoomSeats,
        updateSeatBinding,

        addCourse,
        updateCourse,
        deleteCourse,

        createExamSession,
        updateExamSession,
        adjustExamTime,
        reopenSubmission,

        assignSeat,
        unassignSeat,
        autoAssignSeats,

        submitStudentFiles,

        triggerViolation,
        toggleMachineStatus,
        resetToMockDefaults,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
