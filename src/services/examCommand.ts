import type { Course, ExamSession, Role, Student, Teacher } from '../types';
import { teacherCanManageSection, studentMatchesExamSection } from './courseState';
import { examSection } from './sectionIdentity';
import { canAdjustExamTime, canReopenExamSubmissions } from './examStatus';

export interface ExamCommandEnvironment {
  role: Role;
  teacher?: Teacher | null;
  courses: Course[];
  students: Student[];
}

export function examTimeCommandError(
  environment: ExamCommandEnvironment,
  exam: ExamSession | undefined,
  command: 'adjust' | 'reopen',
  minutes: number,
  scope: 'room' | 'student',
  targetStudentId: string | undefined,
  reason: string,
  now: Date,
): string | undefined {
  const { role, teacher, courses, students } = environment;
  const section = examSection(exam, courses);
  if (role !== 'teacher' || teacher?.accountStatus !== 'active' || !section ||
    !teacherCanManageSection(section, teacher.id)) return 'คุณไม่มีสิทธิ์จัดการการสอบนี้';
  if (!exam || (command === 'adjust' ? !canAdjustExamTime(exam, now) : !canReopenExamSubmissions(exam, now))) {
    return 'สถานะการสอบไม่อนุญาตให้ดำเนินการนี้';
  }
  if (!Number.isSafeInteger(minutes) || minutes === 0 ||
    (command === 'reopen' && (minutes < 5 || minutes > 60)) || !reason.trim()) {
    return 'กรุณาระบุจำนวนนาทีและเหตุผลที่ถูกต้อง';
  }
  if (scope !== 'room' && scope !== 'student') return 'ขอบเขตคำสั่งไม่ถูกต้อง';
  if (scope === 'student') {
    const student = students.find((item) => item.id === targetStudentId);
    if (!student || student.accountStatus !== 'active' || !studentMatchesExamSection(student, exam, section, now)) {
      return 'นักศึกษาไม่มีสิทธิ์ในการสอบนี้';
    }
  } else if (targetStudentId) return 'คำสั่งทั้งห้องต้องไม่มีเป้าหมายนักศึกษารายบุคคล';
  return undefined;
}
