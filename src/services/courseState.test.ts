import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initialCourses, initialExamSessions, initialStudents, initialTeachers } from '../data/initialData';
import { Course } from '../types';
import { CourseInput, SectionInput } from '../types/course';
import { createInitialAcademicState, migrateAcademicStudents } from './academicState';
import {
  courseDeleteError,
  coursesForStudent,
  coursesForTeacher,
  courseStudentCount,
  findSection,
  migrateCourses,
  saveCourse,
  saveSection,
  sectionDeleteError,
  validateCourseInput,
  validateSectionInput,
} from './courseState';
import { getAdminHashForRoute, getAdminRouteFromHash } from '../utils/adminRoutes';

const academic = createInitialAcademicState();
const teachers = initialTeachers;
const facultyId = academic.faculties[0].id;
const departmentId = academic.departments.find((department) => department.facultyId === facultyId)!.id;
const groups = academic.classGroups.filter((group) => group.status === 'active');

const courseInput = (values: Partial<CourseInput> = {}): CourseInput => ({
  code: 'TEST-101',
  name: 'รายวิชาทดสอบ',
  facultyId,
  departmentId,
  status: 'active',
  ...values,
});

const sectionInput = (courseId: string, values: Partial<SectionInput> = {}): SectionInput => ({
  courseId,
  sectionNumber: 1,
  semester: 1,
  academicYear: 2569,
  primaryTeacherId: teachers[0].id,
  coTeacherIds: [],
  groupIds: [groups[0].id],
  status: 'active',
  ...values,
});

test('legacy course migration adds stable section relations and Buddhist academic years', () => {
  const snapshot = JSON.stringify(initialCourses);
  const migrated = migrateCourses(initialCourses, academic);
  assert.equal(JSON.stringify(initialCourses), snapshot);
  assert.ok(migrated.every((course) => course.facultyId && course.departmentId && course.createdAt && course.updatedAt));
  assert.ok(migrated.flatMap((course) => course.sections).every((section) =>
    section.id && section.courseId && section.primaryTeacherId && section.academicYear >= 2500 && section.groupIds && section.coTeacherIds));
  assert.ok(migrated.every((course) => course.code === course.courseCode && course.name === course.courseName));
  assert.deepEqual(migrateCourses(migrated, academic), migrated);
});

test('course validation normalizes codes and enforces unique code and academic path', () => {
  const courses: Course[] = [];
  assert.equal(validateCourseInput(courses, academic, courseInput({ code: ' test-101 ' })), undefined);
  const saved = saveCourse(courses, academic, courseInput({ code: ' test-101 ', name: '  วิชาทดสอบ  ' }));
  assert.equal(saved[0].courseCode, 'TEST-101');
  assert.equal(saved[0].courseName, 'วิชาทดสอบ');
  assert.ok(validateCourseInput(saved, academic, courseInput({ code: 'test-101' })));
  assert.ok(validateCourseInput(saved, academic, courseInput({ code: 'BAD CODE' })));
  assert.ok(validateCourseInput(saved, academic, courseInput({ departmentId: 'missing' })));
});

test('section validation enforces composite uniqueness, teachers and inactive-course guard', () => {
  const course = saveCourse([], academic, courseInput())[0];
  const valid = sectionInput(course.id, { coTeacherIds: [teachers[1].id] });
  assert.equal(validateSectionInput([course], academic, teachers, valid), undefined);
  const withSection = saveSection([course], valid);
  assert.ok(validateSectionInput(withSection, academic, teachers, valid));
  assert.ok(validateSectionInput([course], academic, teachers, { ...valid, primaryTeacherId: 'missing' }));
  assert.ok(validateSectionInput([course], academic, teachers, { ...valid, coTeacherIds: [valid.primaryTeacherId] }));
  assert.ok(validateSectionInput([{ ...course, status: 'inactive' }], academic, teachers, valid));
});

test('one cohort cannot join two sections of the same course and term', () => {
  const course = saveCourse([], academic, courseInput())[0];
  const first = sectionInput(course.id);
  const withFirst = saveSection([course], first);
  assert.ok(validateSectionInput(withFirst, academic, teachers, { ...first, sectionNumber: 2 }));
  assert.equal(validateSectionInput(withFirst, academic, teachers, { ...first, sectionNumber: 2, semester: 2 }), undefined);
  assert.equal(validateSectionInput(withFirst, academic, teachers, { ...first, sectionNumber: 2, academicYear: 2568 }), undefined);
});

test('section edits retain identity and can move between courses', () => {
  let courses = saveCourse([], academic, courseInput());
  courses = saveCourse(courses, academic, courseInput({ code: 'TEST-102' }));
  const sourceId = courses.find((course) => course.courseCode === 'TEST-101')!.id;
  const targetId = courses.find((course) => course.courseCode === 'TEST-102')!.id;
  courses = saveSection(courses, sectionInput(sourceId));
  const sectionId = courses.find((course) => course.id === sourceId)!.sections[0].id!;
  courses = saveSection(courses, sectionInput(targetId, { sectionNumber: 2 }), sectionId);
  assert.equal(courses.find((course) => course.id === sourceId)!.sections.length, 0);
  assert.equal(findSection(courses, sectionId)?.course.id, targetId);
  assert.equal(findSection(courses, sectionId)?.section.sectionNo, '2');
});

test('teacher and student portal projections follow section assignments dynamically', () => {
  const course = saveCourse([], academic, courseInput())[0];
  const assigned = saveSection([course], sectionInput(course.id, {
    primaryTeacherId: teachers[0].id,
    coTeacherIds: [teachers[1].id],
    groupIds: [groups[0].id],
  }));
  assert.equal(coursesForTeacher(assigned, teachers[0].id).length, 1);
  assert.equal(coursesForTeacher(assigned, teachers[1].id).length, 1);
  assert.equal(coursesForStudent(assigned, groups[0].id).length, 1);
  assert.equal(coursesForStudent(assigned, groups[1].id).length, 0);
  const moved = saveSection(assigned, sectionInput(course.id, { groupIds: [groups[1].id] }), assigned[0].sections[0].id);
  assert.equal(coursesForStudent(moved, groups[0].id).length, 0);
  assert.equal(coursesForStudent(moved, groups[1].id).length, 1);
});

test('student counts and deletion guards use live references', () => {
  const students = migrateAcademicStudents(initialStudents, academic);
  const groupId = students.find((student) => student.accountStatus === 'active' && student.classGroupId)?.classGroupId!;
  const expected = students.filter((student) => student.accountStatus === 'active' && student.classGroupId === groupId).length;
  assert.equal(courseStudentCount(students, [groupId]), expected);
  const courses = migrateCourses(initialCourses, academic);
  assert.ok(courseDeleteError(courses[0], initialExamSessions));
  assert.ok(sectionDeleteError(courses[0], courses[0].sections[0], initialExamSessions));
  assert.equal(courseDeleteError({ ...courses[0], id: 'unused', sections: [] }, initialExamSessions), undefined);
});

test('course management hash route survives refresh mapping', () => {
  assert.equal(getAdminHashForRoute('COURSES'), '#/admin/courses');
  assert.equal(getAdminRouteFromHash('#/admin/courses'), 'COURSES');
});
