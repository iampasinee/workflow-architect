import { AcademicState } from '../types/academic';
import { Course, ExamSession, Student, Teacher } from '../types';
import { CourseInput, LocatedSection, SectionInput } from '../types/course';
import { academicSettings } from '../utils/academicYear';
import { isAcademicPathActive } from './academicState';

const stamp = '2026-09-09T00:00:00.000Z';
export const courseOfferingSettings = { currentSemester: 1 as const };
const normalizeYear = (year: number) => year > 0 && year < 2500 ? year + 543 : year;
export const sectionIdOf = (courseId: string, section: Course['sections'][number]) =>
  section.id || `section-${courseId}-${normalizeYear(section.academicYear)}-${section.semester}-${section.sectionNo}`;

export const migrateCourses = (courses: Course[], academic: AcademicState): Course[] => {
  const defaultFaculty = academic.faculties[0];
  const defaultDepartment = academic.departments.find((d) => d.facultyId === defaultFaculty?.id);
  const availableGroups = academic.classGroups.filter((g) => g.status === 'active');
  return courses.map((course, courseIndex) => {
    const linkedDepartment = academic.departments.find((d) => d.id === course.departmentId) ||
      academic.departments.find((d) => d.name === course.department);
    const faculty = academic.faculties.find((f) => f.id === linkedDepartment?.facultyId) ||
      academic.faculties.find((f) => f.id === course.facultyId || f.name === course.faculty) || defaultFaculty;
    const department = linkedDepartment || academic.departments.find((d) =>
      d.facultyId === faculty?.id && (d.name === course.department || d.id === defaultDepartment?.id)) || defaultDepartment;
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
      sections: course.sections.map((section, sectionIndex) => {
        const academicYear = normalizeYear(section.academicYear);
        const primaryTeacherId = section.primaryTeacherId || section.teacherId;
        const groupIds = section.groupIds || availableGroups
          .filter((group) => group.programId && group.admissionYear && (courseIndex === 0 ? sectionIndex === 0 ? group.code.startsWith('INET-') : group.code.startsWith('INE-') : true))
          .slice(0, courseIndex === 0 ? 2 : 1).map((group) => group.id);
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
          groupIds,
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
  if ((!id || courses.find((c) => c.id === id)?.departmentId !== raw.departmentId) && !isAcademicPathActive(academic, 'departments', department.id))
    return 'กรุณาเลือกคณะและภาควิชาที่เปิดใช้งาน';
};

export const validateSectionInput = (courses: Course[], academic: AcademicState, teachers: Teacher[], raw: SectionInput, id?: string): string | undefined => {
  const course = courses.find((item) => item.id === raw.courseId);
  if (!course) return 'กรุณาเลือกรายวิชา';
  if ((!id || findSection(courses, id)?.course.id !== course.id) && course.status !== 'active') return 'รายวิชาที่ปิดใช้งานไม่สามารถเปิดตอนเรียนใหม่ได้';
  if (![1, 2, 'summer'].includes(raw.semester)) return 'กรุณาเลือกภาคการศึกษา';
  if (!Number.isSafeInteger(raw.academicYear) || raw.academicYear < 2500 || raw.academicYear > academicSettings.currentAcademicYear) return 'ปีการศึกษาไม่ถูกต้อง';
  if (!Number.isSafeInteger(raw.sectionNumber) || raw.sectionNumber < 1) return 'หมายเลขตอนเรียนต้องเป็นจำนวนเต็มบวก';
  if (raw.status !== 'active' && raw.status !== 'inactive') return 'สถานะตอนเรียนไม่ถูกต้อง';
  if (courses.flatMap((item) => item.sections.map((section) => ({ course: item, section }))).some(({ course: itemCourse, section }) =>
    sectionIdOf(itemCourse.id, section) !== id && itemCourse.id === course.id && normalizeYear(section.academicYear) === raw.academicYear &&
    String(section.semester) === String(raw.semester) && Number(section.sectionNumber || section.sectionNo) === raw.sectionNumber))
    return 'รายวิชานี้มีตอนเรียนดังกล่าวในภาคการศึกษาและปีการศึกษาที่เลือกแล้ว';
  const teacher = teachers.find((item) => item.id === raw.primaryTeacherId && item.accountStatus === 'active');
  if (!teacher) return 'กรุณาเลือกอาจารย์ผู้สอนหลักที่มีสถานะปกติ';
  if (new Set(raw.coTeacherIds).size !== raw.coTeacherIds.length || raw.coTeacherIds.includes(raw.primaryTeacherId) ||
    raw.coTeacherIds.some((teacherId) => !teachers.some((item) => item.id === teacherId && item.accountStatus === 'active')))
    return 'อาจารย์ผู้สอนหลักและอาจารย์ผู้สอนร่วมต้องเป็นคนละบัญชีที่มีสถานะปกติ';
  if (!raw.groupIds.length) return 'กรุณาเลือกกลุ่มเรียนอย่างน้อย 1 กลุ่ม';
  if (new Set(raw.groupIds).size !== raw.groupIds.length || raw.groupIds.some((groupId) => !academic.classGroups.some((group) => group.id === groupId && isAcademicPathActive(academic, 'classGroups', group.id))))
    return 'กลุ่มเรียนที่เลือกไม่ถูกต้องหรือถูกปิดใช้งาน';
  if (raw.groupIds.some((groupId) => {
    const group = academic.classGroups.find((item) => item.id === groupId);
    const program = academic.programs.find((item) => item.id === group?.programId);
    return program?.departmentId !== course.departmentId;
  })) return 'กลุ่มเรียนที่เลือกต้องอยู่ภายใต้ภาควิชาของรายวิชา';
  for (const groupId of raw.groupIds) {
    const collision = courses.flatMap((item) => item.sections.map((section) => ({ course: item, section }))).find(({ course: itemCourse, section }) =>
      sectionIdOf(itemCourse.id, section) !== id && itemCourse.id === raw.courseId && normalizeYear(section.academicYear) === raw.academicYear &&
      String(section.semester) === String(raw.semester) && (section.groupIds || []).includes(groupId));
    if (collision) {
      const group = academic.classGroups.find((item) => item.id === groupId)!;
      return `กลุ่ม ${group.code} รุ่นปีเข้า ${group.admissionYear} ถูกกำหนดไว้ในตอนเรียนที่ ${collision.section.sectionNo} ของรายวิชานี้แล้ว`;
    }
  }
};

export const saveCourse = (courses: Course[], academic: AcademicState, raw: CourseInput, id?: string): Course[] => {
  const faculty = academic.faculties.find((item) => item.id === raw.facultyId)!;
  const department = academic.departments.find((item) => item.id === raw.departmentId)!;
  const existing = courses.find((item) => item.id === id);
  const now = new Date().toISOString();
  const record: Course = {
    id: id || crypto.randomUUID(), courseCode: raw.code.trim().toUpperCase(), courseName: raw.name.trim(),
    code: raw.code.trim().toUpperCase(), name: raw.name.trim(),
    facultyId: raw.facultyId, faculty: faculty.name, departmentId: raw.departmentId, department: department.name,
    status: raw.status, createdAt: existing?.createdAt || now, updatedAt: now, sections: existing?.sections || [],
  };
  return id ? courses.map((item) => item.id === id ? record : item) : [record, ...courses];
};

export const saveSection = (courses: Course[], raw: SectionInput, id?: string): Course[] => {
  const now = new Date().toISOString();
  const existing = id ? findSection(courses, id)?.section : undefined;
  const record: Course['sections'][number] = {
    id: id || crypto.randomUUID(), courseId: raw.courseId, sectionNo: String(raw.sectionNumber), sectionNumber: raw.sectionNumber,
    semester: raw.semester, academicYear: raw.academicYear, primaryTeacherId: raw.primaryTeacherId,
    teacherId: raw.primaryTeacherId, coTeacherIds: [...raw.coTeacherIds], groupIds: [...raw.groupIds], status: raw.status,
    createdAt: existing?.createdAt || now, updatedAt: now,
  };
  return courses.map((course) => {
    const without = course.sections.filter((section) => sectionIdOf(course.id, section) !== id);
    if (course.id !== raw.courseId) return id ? { ...course, sections: without } : course;
    return { ...course, updatedAt: now, sections: [...without, record] };
  });
};

export const courseStudentCount = (students: Student[], groupIds: string[]) =>
  students.filter((student) => student.accountStatus === 'active' && Boolean(student.classGroupId) && groupIds.includes(student.classGroupId!)).length;

export const courseDeleteError = (course: Course, exams: ExamSession[]) =>
  course.sections.length || exams.some((exam) => exam.courseId === course.id)
    ? 'ไม่สามารถลบรายวิชานี้ได้ เนื่องจากมีตอนเรียนหรือข้อมูลการสอบอ้างอิงอยู่ กรุณาปิดใช้งานแทน' : undefined;

export const sectionDeleteError = (course: Course, section: Course['sections'][number], exams: ExamSession[]) =>
  exams.some((exam) => exam.courseId === course.id && exam.sectionNo === section.sectionNo)
    ? 'ไม่สามารถลบตอนเรียนนี้ได้ เนื่องจากมีข้อมูลการสอบอ้างอิงอยู่ กรุณาปิดใช้งานแทน' : undefined;

export const coursesForTeacher = (courses: Course[], teacherId?: string) => !teacherId ? [] : courses
  .map((course) => ({ ...course, sections: course.sections.filter((section) => (section.primaryTeacherId || section.teacherId) === teacherId || section.coTeacherIds?.includes(teacherId)) }))
  .filter((course) => course.sections.length);

export const coursesForStudent = (courses: Course[], groupId?: string) => !groupId ? [] : courses
  .map((course) => ({ ...course, sections: course.sections.filter((section) => section.groupIds?.includes(groupId)) }))
  .filter((course) => course.sections.length);
