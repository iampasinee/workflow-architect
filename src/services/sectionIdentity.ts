import type { Course, ExamSession, Section } from '../types';

export const sectionIdOf = (courseId: string, section: Section): string =>
  section.id || `section-${courseId}-${section.academicYear > 0 && section.academicYear < 2500 ? section.academicYear + 543 : section.academicYear}-${section.semester}-${section.sectionNo}`;

export type ExamSectionReference = { courseId: string; sectionId?: string; sectionNo: string; sectionResolution?: 'missing' | 'ambiguous' };
export type SectionResolution =
  | { status: 'resolved'; course: Course; section: Section }
  | { status: 'missing' | 'ambiguous' };

export function resolveExamSection(reference: ExamSectionReference | undefined, courses: Course[]): SectionResolution {
  if (reference?.sectionResolution && !reference.sectionId) return { status: reference.sectionResolution };
  const course = courses.find((item) => item.id === reference?.courseId);
  if (!course || !reference) return { status: 'missing' };
  const candidates = course.sections.filter((section) => reference.sectionId
    ? sectionIdOf(course.id, section) === reference.sectionId
    : section.sectionNo === reference.sectionNo);
  if (!candidates.length) return { status: 'missing' };
  if (candidates.length !== 1) return { status: 'ambiguous' };
  return { status: 'resolved', course, section: candidates[0] };
}

export function examSection(reference: ExamSectionReference | undefined, courses: Course[]): Section | undefined {
  const result = resolveExamSection(reference, courses);
  return result.status === 'resolved' ? result.section : undefined;
}

export function formatSectionAcademicPeriod(section?: Section): string | undefined {
  if (!section || !Number.isSafeInteger(section.academicYear) || section.academicYear < 2500) return undefined;
  const semester = section.semester === 'summer'
    ? 'ภาคฤดูร้อน'
    : section.semester === 1 || section.semester === 2
      ? `ภาคการศึกษา ${section.semester}`
      : undefined;
  return semester ? `${semester} / ปีการศึกษา ${section.academicYear}` : undefined;
}

export function formatSectionOption(section: Section): string {
  return `ตอนเรียน ${section.sectionNo} | ${formatSectionAcademicPeriod(section) || 'ไม่พบข้อมูลภาคการศึกษาและปีการศึกษา'}`;
}

export function migrateExamSections(exams: ExamSession[], courses: Course[]): ExamSession[] {
  return exams.map((exam) => {
    if (exam.sectionId) return exam;
    const result = resolveExamSection(exam, courses);
    return result.status === 'resolved'
      ? { ...exam, sectionResolution: undefined, sectionId: sectionIdOf(result.course.id, result.section) }
      : { ...exam, sectionResolution: result.status };
  });
}

/** Conservative history guard keeps ambiguous legacy references protected. */
export function examReferencesSection(exam: ExamSectionReference, course: Course, section: Section): boolean {
  if (exam.courseId !== course.id) return false;
  const result = resolveExamSection(exam, [course]);
  if (result.status === 'resolved') return sectionIdOf(course.id, result.section) === sectionIdOf(course.id, section);
  return exam.sectionId ? exam.sectionId === sectionIdOf(course.id, section) : exam.sectionNo === section.sectionNo;
}
