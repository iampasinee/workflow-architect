import { AcademicState } from '../types/academic';
import { Course, ExamSession, SectionCohort, Student, Teacher } from '../types';
import { CourseInput, LocatedSection, SectionInput } from '../types/course';
import { academicSettings } from '../utils/academicYear';
import { isAcademicPathActive, legacyGroupToCohort } from './academicState';
import { resolveAcademicGroupId } from '../data/academicStructure';

const stamp = '2026-09-17T00:00:00.000Z';
export const courseOfferingSettings = { currentSemester: 1 as const };
const normalizeYear = (year: number) => year > 0 && year < 2500 ? year + 543 : year;
export const sectionIdOf = (courseId: string, section: Course['sections'][number]) =>
  section.id || `section-${courseId}-${normalizeYear(section.academicYear)}-${section.semester}-${section.sectionNo}`;

export const cohortKey = (cohort: SectionCohort) => `${cohort.majorId}:${cohort.admissionYear}`;
const normalizeGroupIds = (ids?: string[]) => [...new Set(ids || [])].sort();
const uniqueCohorts = (cohorts: SectionCohort[]) => {
  const merged = new Map<string, SectionCohort>();
  cohorts.forEach((cohort) => {
    const key = cohortKey(cohort);
    const existing = merged.get(key);
    const groupIds = normalizeGroupIds(cohort.classGroupIds);
    if (!existing || (!existing.classGroupIds?.length && groupIds.length)) {
      if (!existing) merged.set(key, { ...cohort, ...(groupIds.length ? { classGroupIds: groupIds } : {}) });
      return;
    }
    if (!groupIds.length) {
      merged.set(key, { majorId: cohort.majorId, admissionYear: cohort.admissionYear });
      return;
    }
    merged.set(key, { ...existing, classGroupIds: normalizeGroupIds([...(existing.classGroupIds || []), ...groupIds]) });
  });
  return [...merged.values()];
};

export const cohortsOverlap = (left: SectionCohort, right: SectionCohort) => {
  if (cohortKey(left) !== cohortKey(right)) return false;
  const leftGroups = normalizeGroupIds(left.classGroupIds);
  const rightGroups = normalizeGroupIds(right.classGroupIds);
  return !leftGroups.length || !rightGroups.length || leftGroups.some((id) => rightGroups.includes(id));
};

/** Migrates legacy groupIds before discarding legacy academic group records. */
export const migrateCourses = (courses: Course[], academic: AcademicState, legacyAcademic?: unknown): Course[] => {
  const defaultFaculty = academic.faculties[0];
  const defaultDepartment = academic.departments.find((department) => department.facultyId === defaultFaculty?.id);
  return courses.map((course) => {
    const linkedDepartment = academic.departments.find((department) => department.id === course.departmentId) ||
      academic.departments.find((department) => department.name === course.department);
    const faculty = academic.faculties.find((item) => item.id === linkedDepartment?.facultyId) ||
      academic.faculties.find((item) => item.id === course.facultyId || item.name === course.faculty) || defaultFaculty;
    const department = linkedDepartment || academic.departments.find((item) => item.facultyId === faculty?.id && item.name === course.department) || defaultDepartment;
    const createdAt = course.createdAt || stamp;
    return {
      ...course,
      code: course.courseCode,
      name: course.courseName,
      facultyId: faculty?.id,
      faculty: faculty?.name || course.faculty,
      departmentId: department?.id,
      department: department?.name || course.department,
      createdAt,
      updatedAt: course.updatedAt || createdAt,
      sections: course.sections.map((section) => {
        const academicYear = normalizeYear(section.academicYear);
        const primaryTeacherId = section.primaryTeacherId || section.teacherId;
        const migratedCohorts = section.cohorts?.length
          ? section.cohorts
          : (section.groupIds || []).map((groupId) => {
            const cohort = legacyGroupToCohort(groupId, academic, legacyAcademic);
            if (!cohort) return undefined;
            const canonicalGroupId = resolveAcademicGroupId(groupId);
            const group = academic.classGroups.find((item) => item.id === canonicalGroupId && item.majorId === cohort.majorId && item.admissionYear === cohort.admissionYear);
            return { ...cohort, ...(group ? { classGroupIds: [group.id] } : {}) };
          }).filter((item): item is SectionCohort => Boolean(item));
        return {
          ...section,
          id: sectionIdOf(course.id, { ...section, academicYear }),
          courseId: course.id,
          sectionNo: String(section.sectionNumber || section.sectionNo),
          sectionNumber: Number(section.sectionNumber || section.sectionNo),
          academicYear,
          primaryTeacherId,
          teacherId: primaryTeacherId,
          coTeacherIds: section.coTeacherIds || [],
          cohorts: uniqueCohorts(migratedCohorts),
          groupIds: undefined,
          status: section.status || 'active',
          createdAt: section.createdAt || createdAt,
          updatedAt: section.updatedAt || course.updatedAt || createdAt,
        };
      }),
    };
  });
};

export const findSection = (courses: Course[], sectionId: string): LocatedSection | undefined => {
  for (const course of courses) {
    const section = course.sections.find((item) => sectionIdOf(course.id, item) === sectionId);
    if (section) return { course, section };
  }
};

export const validateCourseInput = (courses: Course[], academic: AcademicState, raw: CourseInput, id?: string): string | undefined => {
  const code = raw.code.trim().toUpperCase();
  const name = raw.name.trim();
  if (!/^[A-Z0-9-]{1,20}$/.test(code)) return 'รหัสวิชาต้องเป็นอักษรอังกฤษ ตัวเลข หรือขีดกลาง ไม่เกิน 20 ตัวอักษร';
  if (!name || name.length > 200) return 'กรุณากรอกชื่อวิชาไม่เกิน 200 ตัวอักษร';
  if (raw.status !== 'active' && raw.status !== 'inactive') return 'สถานะรายวิชาไม่ถูกต้อง';
  if (courses.some((course) => course.id !== id && course.courseCode.trim().toUpperCase() === code)) return 'มีรหัสวิชานี้อยู่แล้ว';
  const department = academic.departments.find((item) => item.id === raw.departmentId && item.facultyId === raw.facultyId);
  if (!department || !academic.faculties.some((item) => item.id === raw.facultyId)) return 'กรุณาเลือกคณะและภาควิชาที่สัมพันธ์กัน';
  if ((!id || courses.find((course) => course.id === id)?.departmentId !== raw.departmentId) && !isAcademicPathActive(academic, 'departments', department.id)) {
    return 'กรุณาเลือกคณะและภาควิชาที่เปิดใช้งาน';
  }
};

export const validateSectionInput = (
  courses: Course[],
  academic: AcademicState,
  teachers: Teacher[],
  raw: SectionInput,
  id?: string,
): string | undefined => {
  const course = courses.find((item) => item.id === raw.courseId);
  if (!course) return 'กรุณาเลือกรายวิชา';
  if ((!id || findSection(courses, id)?.course.id !== course.id) && course.status !== 'active') return 'รายวิชาที่ปิดใช้งานไม่สามารถเปิดตอนเรียนใหม่ได้';
  if (![1, 2, 'summer'].includes(raw.semester)) return 'กรุณาเลือกภาคการศึกษา';
  if (!Number.isSafeInteger(raw.academicYear) || raw.academicYear < 2500 || raw.academicYear > academicSettings.currentAcademicYear) return 'ปีการศึกษาไม่ถูกต้อง';
  if (!Number.isSafeInteger(raw.sectionNumber) || raw.sectionNumber < 1) return 'หมายเลขตอนเรียนต้องเป็นจำนวนเต็มบวก';
  if (raw.status !== 'active' && raw.status !== 'inactive') return 'สถานะตอนเรียนไม่ถูกต้อง';
  if (courses.flatMap((item) => item.sections.map((section) => ({ course: item, section }))).some(({ course: candidateCourse, section }) =>
    sectionIdOf(candidateCourse.id, section) !== id && candidateCourse.id === course.id && normalizeYear(section.academicYear) === raw.academicYear &&
    String(section.semester) === String(raw.semester) && Number(section.sectionNumber || section.sectionNo) === raw.sectionNumber)) {
    return 'รายวิชานี้มีตอนเรียนดังกล่าวในภาคการศึกษาและปีการศึกษาที่เลือกแล้ว';
  }
  const teacher = teachers.find((item) => item.id === raw.primaryTeacherId && item.accountStatus === 'active');
  if (!teacher) return 'กรุณาเลือกอาจารย์ผู้สอนหลักที่มีสถานะปกติ';
  if (new Set(raw.coTeacherIds).size !== raw.coTeacherIds.length || raw.coTeacherIds.includes(raw.primaryTeacherId) ||
    raw.coTeacherIds.some((teacherId) => !teachers.some((item) => item.id === teacherId && item.accountStatus === 'active'))) {
    return 'อาจารย์ผู้สอนหลักและอาจารย์ผู้สอนร่วมต้องเป็นคนละบัญชีที่มีสถานะปกติ';
  }
  if (!raw.cohorts.length) return 'กรุณาเลือกสาขาวิชาและรหัสอย่างน้อย 1 รายการ';
  if (uniqueCohorts(raw.cohorts).length !== raw.cohorts.length) return 'มีข้อมูลสาขาวิชาและรหัสซ้ำกัน';
  if (raw.cohorts.some((cohort) => !Number.isSafeInteger(cohort.admissionYear) || cohort.admissionYear < 2500 || cohort.admissionYear > academicSettings.currentAcademicYear)) {
    return 'รหัสปีการศึกษาไม่ถูกต้อง';
  }
  if (raw.cohorts.some((cohort) => {
    const major = academic.majors.find((item) => item.id === cohort.majorId);
    return !major || major.departmentId !== course.departmentId || !isAcademicPathActive(academic, 'majors', major.id);
  })) return 'สาขาวิชาที่เลือกต้องเปิดใช้งานและอยู่ภายใต้ภาควิชาของรายวิชา';
  const existingSection = id ? findSection(courses, id)?.section : undefined;
  const retainedGroupIds = new Set(existingSection?.cohorts?.flatMap((cohort) => cohort.classGroupIds || []) || []);
  if (raw.cohorts.some((cohort) => (cohort.classGroupIds || []).some((groupId) => {
    const group = academic.classGroups.find((item) => item.id === groupId);
    return !group || group.majorId !== cohort.majorId || group.admissionYear !== cohort.admissionYear ||
      (!retainedGroupIds.has(groupId) && !isAcademicPathActive(academic, 'classGroups', groupId));
  }))) return 'กลุ่มเรียนต้องเปิดใช้งานและตรงกับสาขาวิชาและปีเข้า';
  for (const cohort of raw.cohorts) {
    const collision = courses.flatMap((item) => item.sections.map((section) => ({ course: item, section }))).find(({ course: candidateCourse, section }) =>
      sectionIdOf(candidateCourse.id, section) !== id && candidateCourse.id === raw.courseId && normalizeYear(section.academicYear) === raw.academicYear &&
      String(section.semester) === String(raw.semester) && (section.cohorts || []).some((existing) => cohortsOverlap(existing, cohort)));
    if (collision) {
      const major = academic.majors.find((item) => item.id === cohort.majorId);
      return `${major?.code || 'สาขาวิชา'} รหัส ${String(cohort.admissionYear).slice(-2)} ถูกกำหนดไว้ในตอนเรียนที่ ${collision.section.sectionNo} ของรายวิชานี้แล้ว`;
    }
  }
};

export const saveCourse = (courses: Course[], academic: AcademicState, raw: CourseInput, id?: string): Course[] => {
  const faculty = academic.faculties.find((item) => item.id === raw.facultyId)!;
  const department = academic.departments.find((item) => item.id === raw.departmentId)!;
  const existing = courses.find((item) => item.id === id);
  const now = new Date().toISOString();
  const record: Course = {
    id: id || crypto.randomUUID(),
    courseCode: raw.code.trim().toUpperCase(),
    courseName: raw.name.trim(),
    code: raw.code.trim().toUpperCase(),
    name: raw.name.trim(),
    facultyId: raw.facultyId,
    faculty: faculty.name,
    departmentId: raw.departmentId,
    department: department.name,
    status: raw.status,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    sections: existing?.sections || [],
  };
  return id ? courses.map((item) => item.id === id ? record : item) : [record, ...courses];
};

export const saveSection = (courses: Course[], raw: SectionInput, id?: string): Course[] => {
  const now = new Date().toISOString();
  const existing = id ? findSection(courses, id)?.section : undefined;
  const record: Course['sections'][number] = {
    id: id || crypto.randomUUID(),
    courseId: raw.courseId,
    sectionNo: String(raw.sectionNumber),
    sectionNumber: raw.sectionNumber,
    semester: raw.semester,
    academicYear: raw.academicYear,
    primaryTeacherId: raw.primaryTeacherId,
    teacherId: raw.primaryTeacherId,
    coTeacherIds: [...raw.coTeacherIds],
    cohorts: uniqueCohorts(raw.cohorts),
    status: raw.status,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  return courses.map((course) => {
    const without = course.sections.filter((section) => sectionIdOf(course.id, section) !== id);
    if (course.id !== raw.courseId) return id ? { ...course, sections: without } : course;
    return { ...course, updatedAt: now, sections: [...without, record] };
  });
};

export const studentMatchesCohort = (student: Student, cohort: SectionCohort) =>
  student.majorId === cohort.majorId && student.admissionYear === cohort.admissionYear &&
  (!cohort.classGroupIds?.length || Boolean(student.classGroupId && cohort.classGroupIds.includes(student.classGroupId)));

export const studentMatchesSection = (student: Student, section?: Course['sections'][number]) =>
  Boolean(section?.cohorts?.some((cohort) => studentMatchesCohort(student, cohort)));

export const courseStudentCount = (students: Student[], cohorts: SectionCohort[]) =>
  students.filter((student) => student.accountStatus === 'active' && cohorts.some((cohort) => studentMatchesCohort(student, cohort))).length;

export const courseDeleteError = (course: Course, exams: ExamSession[]) =>
  course.sections.length || exams.some((exam) => exam.courseId === course.id)
    ? 'ไม่สามารถลบรายวิชานี้ได้ เนื่องจากมีตอนเรียนหรือข้อมูลการสอบอ้างอิงอยู่ กรุณาปิดใช้งานแทน' : undefined;

export const sectionDeleteError = (course: Course, section: Course['sections'][number], exams: ExamSession[]) =>
  exams.some((exam) => exam.courseId === course.id && exam.sectionNo === section.sectionNo)
    ? 'ไม่สามารถลบตอนเรียนนี้ได้ เนื่องจากมีข้อมูลการสอบอ้างอิงอยู่ กรุณาปิดใช้งานแทน' : undefined;

export const coursesForTeacher = (courses: Course[], teacherId?: string) => !teacherId ? [] : courses
  .map((course) => ({ ...course, sections: course.sections.filter((section) => (section.primaryTeacherId || section.teacherId) === teacherId || section.coTeacherIds?.includes(teacherId)) }))
  .filter((course) => course.sections.length);

export const coursesForStudent = (courses: Course[], student?: Pick<Student, 'majorId' | 'admissionYear' | 'classGroupId'> | null) =>
  !student?.majorId || !student.admissionYear ? [] : courses
    .map((course) => ({ ...course, sections: course.sections.filter((section) => studentMatchesSection(student as Student, section)) }))
    .filter((course) => course.sections.length);
