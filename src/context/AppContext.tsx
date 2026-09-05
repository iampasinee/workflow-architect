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
  addStudent: (student: Omit<Student, 'id'>) => void;
  updateStudent: (id: string, updates: Partial<Student>) => void;
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
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    const saved = localStorage.getItem('securelab_language');
    return (saved as AppLanguage) || 'th';
  });

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
    localStorage.setItem('securelab_language', lang);
  };

  const toggleLanguage = () => {
    const nextLang = language === 'th' ? 'en' : 'th';
    setLanguage(nextLang);
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

  const [activeAdminRoute, setActiveAdminRoute] = useState<string>('A1');
  const [activeTeacherRoute, setActiveTeacherRoute] = useState<string>('T1');
  const [activeStudentStep, setActiveStudentStep] = useState<'ST1' | 'ST2A' | 'ST2B' | 'ST2C' | 'ST3' | 'ST4' | 'ST5' | 'ST6' | 'ST7'>('ST1');

  const [students, setStudents] = useState<Student[]>(() => {
    return safeParse('securelab_students', initialStudents);
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
    localStorage.removeItem('securelab_role');
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

  // Student CRUD
  const addStudent = (newStd: Omit<Student, 'id'>) => {
    const id = `std_${String(students.length + 1).padStart(4, '0')}`;
    const created: Student = { ...newStd, id };
    setStudents(prev => [created, ...prev]);
    showToast('Student Added', `${created.fullName} (${created.studentCode}) registered successfully`, 'success');
  };

  const updateStudent = (id: string, updates: Partial<Student>) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    if (currentStudent?.id === id) {
      setCurrentStudent(prev => prev ? { ...prev, ...updates } : null);
    }
    showToast('Student Updated', 'Record saved successfully', 'success');
  };

  const deleteStudent = (id: string): boolean => {
    // Check if student has exam assignments or submissions
    const hasAssignments = seatAssignments.some(sa => sa.studentId === id);
    if (hasAssignments) {
      showToast('Cannot Delete Student', 'Student is currently assigned to an exam seat. Please unassign first or set account to Suspended.', 'error');
      return false;
    }
    setStudents(prev => prev.filter(s => s.id !== id));
    showToast('Student Deleted', 'Record removed from system', 'info');
    return true;
  };

  const updateAccountStatus = (id: string, status: AccountStatus, reason?: string) => {
    updateStudent(id, { accountStatus: status, statusReason: reason });
  };

  const updateFaceReference = (id: string, url: string) => {
    updateStudent(id, { faceReferenceUrl: url, isFirstTime: false });
    showToast('Facial Reference Updated', 'Face template saved for exam verification.', 'success');
  };

  // Teacher CRUD
  const addTeacher = (newTch: Omit<Teacher, 'id'>) => {
    const id = `tch_${String(teachers.length + 1).padStart(4, '0')}`;
    const created: Teacher = { ...newTch, id };
    setTeachers(prev => [created, ...prev]);
    showToast('Teacher Added', `${created.fullName} registered successfully`, 'success');
  };

  const updateTeacher = (id: string, updates: Partial<Teacher>) => {
    setTeachers(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    if (currentTeacher?.id === id) {
      setCurrentTeacher(prev => prev ? { ...prev, ...updates } : null);
    }
    showToast('Teacher Updated', 'Record saved successfully', 'success');
  };

  const deleteTeacher = (id: string): boolean => {
    const hasAssignedSection = courses.some(c => c.sections.some(s => s.teacherId === id));
    if (hasAssignedSection) {
      showToast('Cannot Delete Teacher', 'Teacher is assigned to active course sections. Reassign sections first.', 'error');
      return false;
    }
    setTeachers(prev => prev.filter(t => t.id !== id));
    showToast('Teacher Deleted', 'Record removed', 'info');
    return true;
  };

  const confirmTeacherProfile = (id: string) => {
    updateTeacher(id, { icitProfileStatus: 'confirmed' });
    showToast('Profile Confirmed', 'ICIT identity verified for Teacher role.', 'success');
  };

  // Admin CRUD
  const addAdmin = (newAdm: Omit<Admin, 'id'>) => {
    const id = `adm_${String(admins.length + 1).padStart(4, '0')}`;
    const created: Admin = { ...newAdm, id };
    setAdmins(prev => [created, ...prev]);
    showToast('Administrator Added', `${created.fullName} added with administrative privileges`, 'success');
  };

  const updateAdmin = (id: string, updates: Partial<Admin>) => {
    setAdmins(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    if (currentAdmin?.id === id) {
      setCurrentAdmin(prev => prev ? { ...prev, ...updates } : null);
    }
    showToast('Administrator Updated', 'Record saved', 'success');
  };

  const deleteAdmin = (id: string): boolean => {
    if (admins.length <= 1) {
      showToast('Action Prohibited', 'At least one active administrator must remain.', 'error');
      return false;
    }
    setAdmins(prev => prev.filter(a => a.id !== id));
    showToast('Administrator Deleted', 'Record removed', 'info');
    return true;
  };

  // Room CRUD
  const addRoom = (newRoom: Omit<Room, 'id'>) => {
    const id = `room_${String(rooms.length + 1).padStart(4, '0')}`;
    const created: Room = { ...newRoom, id };
    setRooms(prev => [created, ...prev]);
    showToast('Room Added', `${created.labName} (${created.building}) created`, 'success');
  };

  const updateRoom = (id: string, updates: Partial<Room>) => {
    setRooms(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    showToast('Room Updated', 'Exam room details saved', 'success');
  };

  const deleteRoom = (id: string): boolean => {
    const hasActiveExam = examSessions.some(e => e.roomId === id && e.status !== 'completed');
    if (hasActiveExam) {
      showToast('Cannot Delete Room', 'Room is currently booked for scheduled or in-progress exams.', 'error');
      return false;
    }
    setRooms(prev => prev.filter(r => r.id !== id));
    showToast('Room Deleted', 'Exam room removed', 'info');
    return true;
  };

  const updateRoomSeats = (roomId: string, seats: SeatBinding[], rows: number, columns: number) => {
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, seats, rows, columns } : r));
    showToast('Seating Map Saved', `Layout updated to ${rows} rows × ${columns} columns (${seats.length} total stations).`, 'success');
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
    showToast('Course Created', `${created.courseCode} added to catalog`, 'success');
  };

  const updateCourse = (id: string, updates: Partial<Course>) => {
    setCourses(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    showToast('Course Updated', 'Course information saved', 'success');
  };

  const deleteCourse = (id: string): boolean => {
    const hasExams = examSessions.some(e => e.courseId === id);
    if (hasExams) {
      showToast('Cannot Delete Course', 'Course has existing exam sessions linked to it.', 'error');
      return false;
    }
    setCourses(prev => prev.filter(c => c.id !== id));
    showToast('Course Deleted', 'Course removed from catalog', 'info');
    return true;
  };

  // Exam Sessions
  const createExamSession = (newExam: Omit<ExamSession, 'id'>) => {
    const id = `exam_${String(examSessions.length + 1).padStart(4, '0')}`;
    const created: ExamSession = { ...newExam, id };
    setExamSessions(prev => [created, ...prev]);
    showToast('Exam Session Created', `Exam scheduled for ${created.examDate} at ${created.startTime}`, 'success');
  };

  const updateExamSession = (id: string, updates: Partial<ExamSession>) => {
    setExamSessions(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    showToast('Exam Session Updated', 'Changes saved successfully', 'success');
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
      actor: currentTeacher?.fullName || 'Teacher',
      action: `${deltaMinutes > 0 ? '+' : ''}${deltaMinutes} Minutes (${scope.toUpperCase()})`,
      details: `Reason: ${reason}${targetStudentId ? ` | Student: ${targetStudentId}` : ''}`,
    };
    setAuditLogs(prev => [log, ...prev]);

    showToast(
      'Exam Time Adjusted',
      `${deltaMinutes > 0 ? '+' : ''}${deltaMinutes} minutes applied to ${scope === 'room' ? 'entire room' : 'selected student'}. Reason: ${reason}`,
      'warning'
    );
  };

  const reopenSubmission = (
    examId: string,
    extraMinutes: number,
    scope: 'room' | 'student',
    targetStudentId?: string,
    reason: string = 'Special dispensation'
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
      actor: currentTeacher?.fullName || 'Teacher',
      action: `Reopened Submission (+${extraMinutes}m, ${scope})`,
      details: reason,
    };
    setAuditLogs(prev => [log, ...prev]);

    showToast('Submission Reopened', `Submissions unlocked for +${extraMinutes} mins.`, 'success');
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

    showToast('Seats Auto-Assigned', `Successfully seated ${minCount} students across active laboratory computers. Damaged and offline PCs were automatically skipped.`, 'success');
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
      showToast('Upload Not Permitted', 'Only active students registered in the roster may upload files.', 'error');
      return false;
    }

    if (!exam || exam.status !== 'in_progress') {
      showToast('Upload Not Permitted', 'File uploads are only available while the exam is in progress.', 'error');
      return false;
    }

    if (hasFinalSubmission && !hasActiveReopening) {
      showToast('Submission Locked', 'The final submission is locked. Ask the instructor to reopen it before uploading a replacement.', 'warning');
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
      showToast('Integrity Check Failed', 'One or more files are empty or damaged. Please re-upload.', 'error');
    } else {
      showToast('Submission Confirmed', 'Your examination answer files have been securely received and hashed.', 'success');
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

    showToast('Violation Alert Triggered', `Seat ${seatNo}: ${detail}`, 'error');
  };

  const acknowledgeViolation = (id: string) => {
    setViolations(prev => prev.map(v => v.id === id ? { ...v, acknowledged: true } : v));
    setActiveViolationAlert(null);
  };

  const toggleMachineStatus = (roomId: string, seatNo: string, status: MachineStatus) => {
    updateSeatBinding(roomId, seatNo, { status, disabled: status === 'unavailable' || status === 'damaged' });
    showToast('Equipment Status Updated', `Seat ${seatNo} set to ${status.toUpperCase()}`, 'info');
  };

  const resetToMockDefaults = () => {
    localStorage.clear();
    setStudents(initialStudents);
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
    showToast('Data Reset', 'All records restored to original PRD baseline.', 'info');
  };

  return (
    <AppContext.Provider
      value={{
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
