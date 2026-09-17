import assert from 'node:assert/strict';
import test from 'node:test';
import { initialCourses, initialExamSessions, initialStudents, initialTeachers } from '../data/initialData';
import { Course } from '../types';
import { SectionInput } from '../types/course';
import { createInitialAcademicState, migrateAcademicStudents } from './academicState';
import {
  courseDeleteError,
  courseStudentCount,
  cohortsOverlap,
  coursesForStudent,
  coursesForTeacher,
  findSection,
  migrateCourses,
  saveCourse,
  saveSection,
  sectionDeleteError,
  sectionIdOf,
  studentMatchesSection,
  validateCourseInput,
  validateSectionInput,
} from './courseState';

const academic = createInitialAcademicState();
const students = migrateAcademicStudents(initialStudents, academic);
const courses = migrateCourses(initialCourses, academic);
const primaryTeacher = initialTeachers.find((teacher) => teacher.accountStatus === 'active')!;
const baseCourse = courses.find((course) => course.status === 'active')!;
const baseMajor = academic.majors.find((major) => major.departmentId === baseCourse.departmentId)!;
const sectionInput = (values: Partial<SectionInput> = {}): SectionInput => ({
  courseId: baseCourse.id,
  sectionNumber: 99,
  semester: 1,
  academicYear: 2569,
  primaryTeacherId: primaryTeacher.id,
  coTeacherIds: [],
  cohorts: [{ majorId: baseMajor.id, admissionYear: 2567 }],
  status: 'active',
  ...values,
});

test('legacy course migration converts groupIds into stable Major/admission cohorts', () => {
  const legacyCourses: Course[] = [{
    ...initialCourses[0],
    sections: [{ ...initialCourses[0].sections[0], cohorts: undefined, groupIds: ['group_003'] }],
  }];
  const migrated = migrateCourses(legacyCourses, academic);
  const migratedSections = migrated.flatMap((course) => course.sections);
  assert.ok(migratedSections.length > 0);
  assert.ok(migratedSections.every((section) => Array.isArray(section.cohorts)));
  assert.ok(migratedSections.some((section) => section.cohorts?.some((cohort) => cohort.majorId === 'program_inet' && cohort.admissionYear === 2567)));
  assert.ok(migratedSections.some((section) => section.cohorts?.some((cohort) => cohort.classGroupIds?.includes('group_inet_de_ra'))));
  assert.ok(migratedSections.every((section) => section.groupIds === undefined));
});

test('course validation and CRUD preserve Faculty/Department stable relationships', () => {
  const input = { code: 'NEW101', name: 'รายวิชาทดสอบ', facultyId: baseCourse.facultyId!, departmentId: baseCourse.departmentId!, status: 'active' as const };
  assert.equal(validateCourseInput(courses, academic, input), undefined);
  const next = saveCourse(courses, academic, input);
  assert.equal(next[0].courseCode, 'NEW101');
  assert.equal(next[0].departmentId, baseCourse.departmentId);
  assert.ok(validateCourseInput(next, academic, input));
});

test('section validation preserves composite uniqueness', () => {
  const existing = baseCourse.sections[0];
  const duplicate = sectionInput({
    sectionNumber: Number(existing.sectionNumber || existing.sectionNo),
    semester: existing.semester as SectionInput['semester'],
    academicYear: existing.academicYear,
  });
  assert.ok(validateSectionInput(courses, academic, initialTeachers, duplicate));
});

test('primary and co-teacher validation remains enforced', () => {
  assert.ok(validateSectionInput(courses, academic, initialTeachers, sectionInput({ primaryTeacherId: 'missing' })));
  assert.ok(validateSectionInput(courses, academic, initialTeachers, sectionInput({ coTeacherIds: [primaryTeacher.id] })));
});

test('cohort validation enforces active Major, admission year and course Department', () => {
  assert.ok(validateSectionInput(courses, academic, initialTeachers, sectionInput({ cohorts: [] })));
  assert.ok(validateSectionInput(courses, academic, initialTeachers, sectionInput({ cohorts: [{ majorId: 'missing', admissionYear: 2567 }] })));
  assert.ok(validateSectionInput(courses, academic, initialTeachers, sectionInput({ cohorts: [{ majorId: baseMajor.id, admissionYear: 2570 }] })));
  const mismatchedGroup = academic.classGroups.find((group) => group.majorId !== baseMajor.id);
  if (mismatchedGroup) assert.ok(validateSectionInput(courses, academic, initialTeachers, sectionInput({ cohorts: [{ majorId: baseMajor.id, admissionYear: 2567, classGroupIds: [mismatchedGroup.id] }] })));
});

test('same Major/admission cohort cannot join two sections of the same course and term', () => {
  const firstInput = sectionInput({ sectionNumber: 97 });
  const once = saveSection(courses, firstInput);
  const collision = validateSectionInput(once, academic, initialTeachers, sectionInput({ sectionNumber: 98 }));
  assert.match(collision || '', /รหัส/);
});

test('Section cohorts distinguish RA, RB and whole-cohort overlap', () => {
  const ra = academic.classGroups.find((group) => group.majorId === 'program_inet' && group.admissionYear === 2567 && group.code.endsWith('-RA'))!;
  const rb = academic.classGroups.find((group) => group.majorId === 'program_inet' && group.admissionYear === 2567 && group.code.endsWith('-RB'))!;
  const base = { majorId: 'program_inet', admissionYear: 2567 };
  assert.equal(cohortsOverlap({ ...base, classGroupIds: [ra.id] }, { ...base, classGroupIds: [rb.id] }), false);
  assert.equal(cohortsOverlap({ ...base, classGroupIds: [ra.id] }, { ...base, classGroupIds: [ra.id] }), true);
  assert.equal(cohortsOverlap(base, { ...base, classGroupIds: [ra.id] }), true);
});

test('separate Sections may target RA and RB while duplicate RA is rejected', () => {
  const ra = academic.classGroups.find((group) => group.majorId === baseMajor.id && group.admissionYear === 2567 && group.code.endsWith('-RA'));
  const rb = academic.classGroups.find((group) => group.majorId === baseMajor.id && group.admissionYear === 2567 && group.code.endsWith('-RB'));
  if (!ra || !rb) return;
  const isolated = courses.map((course) => course.id === baseCourse.id ? { ...course, sections: [] } : course);
  const raInput = sectionInput({ sectionNumber: 71, cohorts: [{ majorId: baseMajor.id, admissionYear: 2567, classGroupIds: [ra.id] }] });
  const withRa = saveSection(isolated, raInput);
  const rbInput = sectionInput({ sectionNumber: 72, cohorts: [{ majorId: baseMajor.id, admissionYear: 2567, classGroupIds: [rb.id] }] });
  assert.equal(validateSectionInput(withRa, academic, initialTeachers, rbInput), undefined);
  const withRaAndRb = saveSection(withRa, rbInput);
  assert.equal(withRaAndRb.find((course) => course.id === baseCourse.id)?.sections.length, 2);
  const duplicateRa = sectionInput({ sectionNumber: 73, cohorts: [{ majorId: baseMajor.id, admissionYear: 2567, classGroupIds: [ra.id] }] });
  assert.match(validateSectionInput(withRaAndRb, academic, initialTeachers, duplicateRa) || '', /รหัส/);
});

test('one Section may combine RA + RB and eligibility follows the student primary group', () => {
  const ra = academic.classGroups.find((group) => group.majorId === 'program_inet' && group.admissionYear === 2567 && group.code.endsWith('-RA'))!;
  const rb = academic.classGroups.find((group) => group.majorId === 'program_inet' && group.admissionYear === 2567 && group.code.endsWith('-RB'))!;
  const cohort = { majorId: 'program_inet', admissionYear: 2567, classGroupIds: [ra.id, rb.id] };
  const isolated = courses.map((course) => course.id === baseCourse.id ? { ...course, sections: [] } : course);
  assert.equal(validateSectionInput(isolated, academic, initialTeachers, sectionInput({ sectionNumber: 74, cohorts: [cohort] })), undefined);
  const expected = students.filter((student) => student.accountStatus === 'active' && student.majorId === cohort.majorId && student.admissionYear === cohort.admissionYear && Boolean(student.classGroupId && cohort.classGroupIds.includes(student.classGroupId))).length;
  assert.equal(courseStudentCount(students, [cohort]), expected);
  const section = { ...baseCourse.sections[0], cohorts: [cohort] };
  assert.ok(students.filter((student) => student.classGroupId === ra.id || student.classGroupId === rb.id).every((student) => studentMatchesSection(student, section)));
  const unassigned = { ...students.find((student) => student.majorId === cohort.majorId && student.admissionYear === cohort.admissionYear)!, classGroupId: undefined };
  assert.equal(studentMatchesSection(unassigned, section), false);
});

test('section edits retain identity and can move between courses', () => {
  const created = saveSection(courses, sectionInput({ sectionNumber: 96 }));
  const locatedCourse = created.find((course) => course.id === baseCourse.id)!;
  const createdSection = locatedCourse.sections.at(-1)!;
  const sectionId = sectionIdOf(locatedCourse.id, createdSection);
  const alternate = created.find((course) => course.id !== baseCourse.id && course.status === 'active' && course.departmentId === baseCourse.departmentId);
  if (!alternate) {
    assert.ok(findSection(created, sectionId));
    return;
  }
  const moved = saveSection(created, sectionInput({ courseId: alternate.id, sectionNumber: 95 }), sectionId);
  assert.equal(findSection(moved, sectionId)?.course.id, alternate.id);
});

test('teacher and student portal projections follow section assignments', () => {
  const teacherCourses = coursesForTeacher(courses, primaryTeacher.id);
  assert.ok(teacherCourses.every((course) => course.sections.every((section) =>
    section.primaryTeacherId === primaryTeacher.id || section.coTeacherIds?.includes(primaryTeacher.id))));
  const eligible = students.find((student) => courses.some((course) => course.sections.some((section) => studentMatchesSection(student, section))));
  assert.ok(eligible);
  assert.ok(coursesForStudent(courses, eligible).length > 0);
});

test('student count resolves dynamically from majorId + admissionYear', () => {
  const cohort = { majorId: 'program_inet', admissionYear: 2567 };
  const expected = students.filter((student) => student.accountStatus === 'active' && student.majorId === cohort.majorId && student.admissionYear === cohort.admissionYear).length;
  assert.equal(courseStudentCount(students, [cohort]), expected);
});

test('course and section deletion guards preserve exam references', () => {
  const referenced = courses.find((course) => initialExamSessions.some((exam) => exam.courseId === course.id));
  assert.ok(referenced);
  assert.ok(courseDeleteError(referenced!, initialExamSessions));
  const section = referenced!.sections.find((item) => initialExamSessions.some((exam) => exam.courseId === referenced!.id && exam.sectionNo === item.sectionNo));
  if (section) assert.ok(sectionDeleteError(referenced!, section, initialExamSessions));
});

test('section ID remains stable for migrated records', () => {
  const course: Course = courses[0];
  const section = course.sections[0];
  assert.equal(findSection(courses, sectionIdOf(course.id, section))?.section.id, section.id);
});
