import React, { useMemo, useState } from 'react';
import { BookOpen, Search, UserCheck, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { studentMatchesSection } from '../../services/courseState';
import { calculateYearLevelFromAdmissionYear, getAdmissionCode } from '../../utils/academicYear';
import { AccountStatusBadge, ExamSubmissionStatusBadge } from '../common/Badge';
import type { Student } from '../../types';

const sectionKey = (courseId: string, section: { id?: string; sectionNo: string; academicYear: number; semester: string | number }) =>
  section.id || `${courseId}-${section.academicYear}-${section.semester}-${section.sectionNo}`;

export const StudentGroupManager: React.FC = () => {
  const {
    academicState,
    courses,
    currentTeacher,
    examSessions,
    students,
    submissions,
    teachers,
  } = useApp();
  const [selectedSectionKey, setSelectedSectionKey] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const assignments = useMemo(() => courses.flatMap((course) =>
    course.sections.map((section) => ({
      key: sectionKey(course.id, section),
      course,
      section,
    }))), [courses]);

  const selectedAssignment = assignments.find((assignment) => assignment.key === selectedSectionKey) || assignments[0];
  const selectedSection = selectedAssignment?.section;
  const selectedCourse = selectedAssignment?.course;
  const sectionExams = examSessions.filter((exam) =>
    exam.courseId === selectedCourse?.id && exam.sectionNo === selectedSection?.sectionNo);
  const selectedExam = sectionExams.find((exam) => exam.status === 'in_progress') ||
    sectionExams.find((exam) => exam.status === 'upcoming') ||
    sectionExams[0];

  const rosterStudents = useMemo(() => selectedSection
    ? students.filter((student) => studentMatchesSection(student, selectedSection))
    : [], [selectedSection, students]);

  const filteredStudents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return rosterStudents.filter((student) => (
      !term ||
      student.studentCode.toLowerCase().includes(term) ||
      student.fullName.toLowerCase().includes(term) ||
      student.email.toLowerCase().includes(term)
    ));
  }, [rosterStudents, searchTerm]);

  const primaryTeacherId = selectedSection?.primaryTeacherId || selectedSection?.teacherId;
  const primaryTeacher = teachers.find((teacher) => teacher.id === primaryTeacherId);
  const coTeachers = teachers.filter((teacher) => selectedSection?.coTeacherIds?.includes(teacher.id));

  const renderExamStatus = (student: Student) => {
    if (student.accountStatus !== 'active') return <AccountStatusBadge status={student.accountStatus} />;
    const submission = submissions.find((item) => item.examId === selectedExam?.id && item.studentId === student.id);
    if (submission?.status === 'submitted' || submission?.status === 'late') {
      return <ExamSubmissionStatusBadge status={submission.status} />;
    }
    return <ExamSubmissionStatusBadge status={selectedExam?.status === 'in_progress' ? 'in_progress' : 'not_started'} />;
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col justify-between gap-3 border-b border-gray-200 pb-4 sm:flex-row sm:items-center">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">รายวิชาและตอนเรียนที่ได้รับมอบหมาย</span>
          <h1 className="mt-0.5 text-2xl font-bold text-gray-900">จัดการรายวิชา & กลุ่มเรียน</h1>
          <p className="mt-1 text-xs text-gray-500">ดู Section กลุ่มเรียน และรายชื่อนักศึกษาจากข้อมูลหลักที่ผู้ดูแลระบบจัดการ</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
          <UserCheck className="h-4 w-4" />
          {currentTeacher?.fullName || 'อาจารย์ผู้สอน'}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard icon={BookOpen} label="รายวิชาที่รับผิดชอบ" value={courses.length} suffix="วิชา" />
        <SummaryCard icon={Users} label="Section ที่ได้รับมอบหมาย" value={assignments.length} suffix="ตอนเรียน" />
        <SummaryCard icon={UserCheck} label="นักศึกษาใน Section ที่เลือก" value={rosterStudents.length} suffix="คน" />
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
          <label htmlFor="teacher-section" className="text-xs font-semibold text-gray-700">
            รายวิชา / Section
            <select
              id="teacher-section"
              value={selectedAssignment?.key || ''}
              onChange={(event) => { setSelectedSectionKey(event.target.value); setSearchTerm(''); }}
              disabled={!assignments.length}
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
            >
              {!assignments.length && <option value="">ไม่พบรายวิชาหรือ Section ที่ได้รับมอบหมาย</option>}
              {assignments.map((assignment) => (
                <option key={assignment.key} value={assignment.key}>
                  {assignment.course.courseCode} — {assignment.course.courseName} • ตอนเรียน {assignment.section.sectionNo}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3 text-xs">
            <div><p className="text-gray-500">อาจารย์ผู้สอนหลัก</p><p className="mt-1 font-semibold text-gray-900">{primaryTeacher?.fullName || '—'}</p></div>
            <div><p className="text-gray-500">อาจารย์ผู้สอนร่วม</p><p className="mt-1 font-semibold text-gray-900">{coTeachers.length ? coTeachers.map((teacher) => teacher.fullName).join(', ') : 'ไม่มี'}</p></div>
          </div>
        </div>

        {selectedSection && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-700">กลุ่มเรียนที่ Section นี้ครอบคลุม</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(selectedSection.cohorts || []).map((cohort) => {
                const major = academicState.majors.find((item) => item.id === cohort.majorId);
                const groupCodes = cohort.classGroupIds?.map((groupId) =>
                  academicState.classGroups.find((group) => group.id === groupId)?.code).filter(Boolean);
                return (
                  <span key={`${cohort.majorId}-${cohort.admissionYear}-${cohort.classGroupIds?.join('-') || 'all'}`} className="rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700">
                    {major?.code || 'ไม่พบสาขาวิชา'} • ปีเข้า {getAdmissionCode(cohort.admissionYear)} • {groupCodes?.length ? groupCodes.join(', ') : 'ทุกกลุ่มเรียน'}
                  </span>
                );
              })}
              {!selectedSection.cohorts?.length && <span className="text-xs text-amber-700">ยังไม่ได้กำหนดกลุ่มนักศึกษาสำหรับ Section นี้</span>}
            </div>
          </div>
        )}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">รายชื่อนักศึกษาใน Section</h2>
          <p className="text-xs text-gray-500">รายชื่อคำนวณจากสาขาวิชา ปีเข้า และกลุ่มเรียนของ Section โดยไม่สร้าง Student master data ใหม่</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="search"
            placeholder="ค้นหารหัสนักศึกษา / ชื่อ-นามสกุล..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-xs text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="border-b border-gray-200 bg-gray-50 font-semibold text-gray-600">
              <tr>
                <th className="px-6 py-3.5">ชื่อ-นามสกุล</th>
                <th className="px-4 py-3.5">รหัสนักศึกษา</th>
                <th className="px-4 py-3.5">สาขาวิชา / กลุ่มเรียน</th>
                <th className="px-4 py-3.5">ปีเข้า / ชั้นปี</th>
                <th className="px-4 py-3.5">สถานะบัญชี</th>
                <th className="px-6 py-3.5">สถานะการสอบล่าสุด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.map((student) => {
                const major = academicState.majors.find((item) => item.id === student.majorId);
                const group = academicState.classGroups.find((item) => item.id === student.classGroupId);
                const yearLevel = student.admissionYear
                  ? calculateYearLevelFromAdmissionYear(student.admissionYear)
                  : null;
                return (
                  <tr key={student.id} className="hover:bg-gray-50/70">
                    <td className="px-6 py-3.5"><p className="font-semibold text-gray-900">{student.fullName}</p><p className="mt-0.5 text-[11px] text-gray-500">{student.email}</p></td>
                    <td className="px-4 py-3.5 font-mono font-medium text-gray-800">{student.studentCode}</td>
                    <td className="px-4 py-3.5"><p className="font-medium text-gray-800">{major ? `[${major.code}] ${major.name}` : '—'}</p><p className="mt-0.5 text-[11px] text-gray-500">{group?.code || 'ยังไม่กำหนดกลุ่มเรียน'}</p></td>
                    <td className="px-4 py-3.5 text-gray-700">{student.admissionYear ? `ปีเข้า ${getAdmissionCode(student.admissionYear)}` : '—'}<p className="mt-0.5 text-[11px] text-gray-500">{yearLevel?.formattedYearLevel || '—'}</p></td>
                    <td className="px-4 py-3.5"><AccountStatusBadge status={student.accountStatus} /></td>
                    <td className="px-6 py-3.5">{renderExamStatus(student)}</td>
                  </tr>
                );
              })}
              {!filteredStudents.length && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">ไม่พบนักศึกษาใน Section ที่เลือก</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

interface SummaryCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  suffix: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ icon: Icon, label, value, suffix }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
    <div className="flex items-center justify-between"><p className="text-xs font-medium text-gray-500">{label}</p><Icon className="h-4 w-4 text-blue-600" /></div>
    <p className="mt-2 text-2xl font-bold text-gray-900">{value} <span className="text-xs font-medium text-gray-500">{suffix}</span></p>
  </div>
);
