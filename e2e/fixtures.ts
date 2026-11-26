import type { Page } from '@playwright/test';
import { initialCourses, initialExamSessions, initialSeatAssignments, initialSubmissions } from '../src/data/initialData';
import { createInitialAcademicState } from '../src/services/academicState';
import { migrateCourses } from '../src/services/courseState';
import { migrateExamSections, sectionIdOf } from '../src/services/sectionIdentity';
import type { Course, ExamSession } from '../src/types';

export const fixtureCourses = () => {
  const courses = migrateCourses(initialCourses, createInitialAcademicState());
  const source = courses[0];
  const duplicate = {
    ...source.sections[0], id: 'fixture-section-period-2', sectionNo: '1', sectionNumber: 1,
    academicYear: 2568, semester: 2 as const, primaryTeacherId: 'tch_0002', teacherId: 'tch_0002', coTeacherIds: ['tch_0001'],
  };
  const unreferenced = {
    ...source.sections[0], id: 'fixture-section-unreferenced', sectionNo: '9', sectionNumber: 9,
    academicYear: 2569, semester: 'summer' as const,
  };
  const target: Course = { ...source, id: 'fixture-course-target', courseCode: 'QA999', code: 'QA999', courseName: 'รายวิชาทดสอบปลายทาง', name: 'รายวิชาทดสอบปลายทาง', sections: [] };
  const unique: Course = { ...source, id: 'fixture-course-unique', courseCode: 'QA998', code: 'QA998', sections: [{ ...duplicate, id: 'fixture-unique-section', sectionNo: '7', sectionNumber: 7, coTeacherIds: [], cohorts: [{ majorId: source.sections[0].cohorts![0].majorId, admissionYear: 2568 }] }] };
  return [{ ...source, sections: [...source.sections, duplicate, unreferenced] }, ...courses.slice(1), target, unique];
};

export const fixtureExams = (courses: Course[], status: ExamSession['status'] = 'upcoming') => {
  const exams = migrateExamSections(initialExamSessions, courses);
  const source = courses[0];
  const canonical = { ...exams[0], sectionId: sectionIdOf(source.id, source.sections[0]), sectionResolution: undefined, status };
  const legacyUnique = { ...canonical, id: 'fixture-exam-legacy-unique', examName: 'E2E_UNAUTHORIZED_UNIQUE', courseId: 'fixture-course-unique', sectionId: undefined, sectionNo: '7' };
  const legacyAmbiguous = { ...canonical, id: 'fixture-exam-legacy-ambiguous', examName: 'E2E_UNRESOLVED_AMBIGUOUS', courseId: source.id, sectionId: undefined, sectionNo: '1' };
  const legacyMissing = { ...canonical, id: 'fixture-exam-legacy-missing', examName: 'E2E_UNRESOLVED_MISSING', courseId: 'fixture-course-absent', sectionId: undefined, sectionNo: '1' };
  return [canonical, ...exams.slice(1), legacyUnique, legacyAmbiguous, legacyMissing];
};

export async function installFixture(page: Page, status: ExamSession['status'] = 'upcoming') {
  const courses = fixtureCourses();
  const exams = fixtureExams(courses, status);
  const records = {
    securelab_courses: courses,
    securelab_exams: exams,
    securelab_seat_assignments: initialSeatAssignments,
    securelab_submissions: initialSubmissions,
  };
  await page.addInitScript((values) => {
    for (const [key, value] of Object.entries(values)) {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(value));
    }
  }, records);
  return { courses, exams };
}

export async function readStored<T>(page: Page, key: string): Promise<T> {
  return page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey) || 'null') as T, key);
}
