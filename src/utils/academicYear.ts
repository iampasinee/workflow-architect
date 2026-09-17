import { useSyncExternalStore } from 'react';

export const initialAcademicYear = 2569;
let currentAcademicYear = initialAcademicYear;
const listeners = new Set<() => void>();

// Academic years are a system setting, never the workstation's calendar year.
export const academicSettings = {
  get currentAcademicYear() { return currentAcademicYear; },
  set currentAcademicYear(value: number) {
    if (!Number.isSafeInteger(value) || value < 2500) throw new Error('ปีการศึกษาไม่ถูกต้อง');
    if (value === currentAcademicYear) return;
    currentAcademicYear = value;
    listeners.forEach((listener) => listener());
  },
};

export const useAcademicYear = () => useSyncExternalStore(
  (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
  () => academicSettings.currentAcademicYear,
);

export interface YearLevelCalculationResult {
  admissionYear: number;
  admissionYearShort: string;
  yearLevel: number;
  formattedYearLevel: string;
  isExtended: boolean;
  isValid: boolean;
  errorMessage?: string;
}

export function calculateStudentYearLevel(studentId: string, academicYear = academicSettings.currentAcademicYear): YearLevelCalculationResult | null {
  if (!studentId?.trim()) return null;
  const prefix = studentId.trim().match(/^(\d{2})/);
  const admissionYear = prefix ? 2500 + Number(prefix[1]) : 0;
  const level = academicYear - admissionYear + 1;
  const errorMessage = !prefix ? 'รูปแบบรหัสนักศึกษาไม่ถูกต้อง (ต้องขึ้นต้นด้วยเลขปี พ.ศ. 2 หลัก)'
    : !Number.isSafeInteger(academicYear) || academicYear < 2500 ? 'ปีการศึกษาไม่ถูกต้อง'
      : level < 1 ? 'ปีที่เข้าศึกษาไม่ถูกต้อง (ปีที่เข้าศึกษามากกว่าปีการศึกษาปัจจุบัน)' : undefined;
  return {
    admissionYear, admissionYearShort: prefix?.[1] || '', yearLevel: errorMessage ? 0 : level,
    formattedYearLevel: errorMessage ? '' : `ชั้นปีที่ ${level}`,
    isExtended: !errorMessage && level > 4, isValid: !errorMessage, errorMessage,
  };
}

export const withCalculatedStudentYear = <T extends { studentCode: string }>(student: T, year = academicSettings.currentAcademicYear) => {
  const calculated = calculateStudentYearLevel(student.studentCode, year);
  return { ...student, year: calculated?.yearLevel || 0, yearLevel: calculated?.yearLevel || 0 };
};

/** Derived compatibility fields are never persisted as independent student data. */
export const withoutStudentYear = <T extends { year?: number; yearLevel?: number; yearLevelId?: string }>(student: T) => {
  const { year, yearLevel, yearLevelId, ...stored } = student;
  return stored;
};
