import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Search, UserCheck, UserPlus, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getEffectiveExamStatus } from '../../services/examStatus';
import { useExamClock } from '../../utils/useExamClock';
import { searchStudentsByIdentity, sectionIdOf, studentMatchesExamSection, studentMatchesSection } from '../../services/courseState';
import { calculateYearLevelFromAdmissionYear, getAdmissionCode } from '../../utils/academicYear';
import { AccountStatusBadge, ExamSubmissionStatusBadge } from '../common/Badge';
import { Modal } from '../common/Modal';
import type { Course, Section, Student } from '../../types';

export const StudentGroupManager: React.FC = () => {
  const now = useExamClock();
  const { academicState, courses, currentTeacher, students, studentDirectory, teachers, examSessions, submissions, addStudentToSection, moveStudentBetweenSections, findStudentSectionInCourse } = useApp();
  const [courseId, setCourseId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [rosterSearch, setRosterSearch] = useState('');
  const [candidateSearch, setCandidateSearch] = useState('');
  const [modal, setModal] = useState<'add' | 'move' | null>(null);
  const [movingStudentId, setMovingStudentId] = useState('');
  const [moveSourceId, setMoveSourceId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [error, setError] = useState('');

  const selectedCourse = courses.find((course) => course.id === courseId);
  const assignments = selectedCourse?.sections.map((section) => ({ section, id: sectionIdOf(selectedCourse.id, section) })) || [];
  const selectedSection = assignments.find((item) => item.id === sectionId)?.section;
  const selectedExam = examSessions.find((exam) => exam.courseId === courseId && exam.sectionNo === selectedSection?.sectionNo && getEffectiveExamStatus(exam, now) === 'in_progress') ||
    examSessions.find((exam) => exam.courseId === courseId && exam.sectionNo === selectedSection?.sectionNo && getEffectiveExamStatus(exam, now) === 'upcoming') ||
    examSessions.find((exam) => exam.courseId === courseId && exam.sectionNo === selectedSection?.sectionNo);
  const roster = useMemo(() => selectedSection ? students.filter((student) => studentMatchesSection(student, selectedSection)) : [], [students, selectedSection]);
  const filteredRoster = useMemo(() => searchStudentsByIdentity(roster, rosterSearch), [roster, rosterSearch]);
  const candidates = useMemo(() => candidateSearch.trim()
    ? searchStudentsByIdentity(studentDirectory, candidateSearch).slice(0, 30) : [], [studentDirectory, candidateSearch]);
  const sameOffering = (left: Section, right: Section) => left.academicYear === right.academicYear && String(left.semester) === String(right.semester);
  const destinations = selectedSection ? assignments.filter((item) => item.id !== sectionId && sameOffering(item.section, selectedSection)) : [];
  const movingSource = assignments.find((item) => item.id === moveSourceId);
  const movingDestinations = movingSource ? assignments.filter((item) => item.id !== moveSourceId && sameOffering(item.section, movingSource.section)) : [];
  const movingRoster = movingSource ? students.filter((student) => studentMatchesSection(student, movingSource.section)) : [];
  const countCourseStudents = (course: Course) => new Set(course.sections.flatMap((section) =>
    students.filter((student) => studentMatchesSection(student, section)).map((student) => student.id))).size;
  const teacherName = (id?: string) => teachers.find((teacher) => teacher.id === id)?.fullName || '—';
  const existingSectionFor = (student: Student) => selectedCourse && findStudentSectionInCourse(student.id, selectedCourse.id, sectionId);
  const studentContext = (student: Student) => {
    const major = academicState.majors.find((item) => item.id === student.majorId);
    const group = academicState.classGroups.find((item) => item.id === student.classGroupId);
    return `${major?.code || 'ไม่พบสาขาวิชา'} • ${student.admissionYear ? `ปีที่เข้าศึกษา ${getAdmissionCode(student.admissionYear)}` : 'ไม่ทราบปีที่เข้าศึกษา'} • ${group?.code || 'ยังไม่กำหนดกลุ่มเรียน'}`;
  };
  const closeModal = () => { setModal(null); setError(''); };
  const openMove = (studentId = '', targetId = '', sourceId = sectionId) => {
    setMoveSourceId(sourceId);
    setMovingStudentId(studentId);
    setDestinationId(targetId);
    setError('');
    setModal('move');
  };
  const addStudent = (studentId: string) => {
    const result = addStudentToSection(studentId, sectionId);
    if (result.success) closeModal(); else setError(result.error || 'ไม่สามารถเพิ่มนักศึกษาได้');
  };
  const moveStudent = () => {
    if (!movingStudentId || !destinationId) { setError('กรุณาเลือกนักศึกษาและ Section ปลายทาง'); return; }
    const result = moveStudentBetweenSections(movingStudentId, moveSourceId, destinationId);
    if (result.success) closeModal(); else setError(result.error || 'ไม่สามารถย้ายนักศึกษาได้');
  };

  return <div className="space-y-5 text-left">
    <header className="flex flex-col justify-between gap-3 border-b border-gray-200 pb-4 sm:flex-row sm:items-center">
      <div><p className="text-xs font-bold text-blue-600">รายวิชาและตอนเรียนที่ได้รับมอบหมาย</p><h1 className="mt-1 text-2xl font-bold text-gray-900">จัดการรายวิชา & กลุ่มเรียน</h1><p className="mt-1 text-xs text-gray-500">เลือกรายวิชา แล้วเลือก Section เพื่อดูรายชื่อและจัดการนักศึกษาเฉพาะราย</p></div>
      <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700"><UserCheck className="h-4 w-4" />{currentTeacher?.fullName || 'อาจารย์ผู้สอน'}</div>
    </header>

    {!selectedCourse ? <>
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard icon={BookOpen} label="รายวิชาที่รับผิดชอบ" value={courses.length} suffix="วิชา" />
        <SummaryCard icon={Users} label="Section ที่ได้รับมอบหมาย" value={courses.reduce((total, course) => total + course.sections.length, 0)} suffix="ตอนเรียน" />
        <SummaryCard icon={UserCheck} label="นักศึกษารวม" value={new Set(courses.flatMap((course) => course.sections.flatMap((section) => students.filter((student) => studentMatchesSection(student, section)).map((student) => student.id)))).size} suffix="คน" />
      </div>
      <section><h2 className="mb-3 text-base font-bold text-gray-900">รายวิชาของฉัน</h2><div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => <article key={course.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
          <span className="rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 font-mono text-xs font-bold text-blue-700">{course.courseCode}</span>
          <h3 className="mt-3 min-h-10 text-sm font-bold text-gray-900">{course.courseName}</h3>
          <p className="mt-2 text-xs text-gray-500">{course.sections.length} Section • นักศึกษา {countCourseStudents(course)} คน</p>
          <p className="mt-1 text-xs text-gray-500">{[...new Set(course.sections.map((section) => `ภาคเรียน ${section.semester} / ${section.academicYear}`))].join(' • ')}</p>
          <button type="button" onClick={() => { setCourseId(course.id); setSectionId(''); }} className="mt-4 inline-flex min-h-9 items-center gap-1 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-400">ดูรายละเอียด <ArrowRight className="h-4 w-4" /></button>
        </article>)}
        {!courses.length && <p className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-500">ยังไม่มีรายวิชาที่ได้รับมอบหมาย</p>}
      </div></section>
    </> : <>
      <button type="button" onClick={() => { setCourseId(''); setSectionId(''); setRosterSearch(''); }} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"><ArrowLeft className="h-4 w-4" />กลับไปรายวิชาของฉัน</button>
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs sm:p-5">
        <p className="text-xs font-bold text-blue-600">{selectedCourse.courseCode}</p><h2 className="mt-1 text-lg font-bold text-gray-900">{selectedCourse.courseName}</h2>
        <p className="mt-1 text-xs text-gray-500">{assignments.length} Section ที่ได้รับมอบหมาย • นักศึกษา {countCourseStudents(selectedCourse)} คน</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{assignments.map((item) => <button key={item.id} type="button" onClick={() => { setSectionId(item.id); setRosterSearch(''); }} className={`rounded-xl border p-4 text-left transition-colors focus:ring-2 focus:ring-blue-400 ${sectionId === item.id ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-300'}`}>
          <span className="block text-sm font-bold">Section {item.section.sectionNo}</span><span className="mt-1 block text-xs">ภาคเรียน {item.section.semester} / {item.section.academicYear}</span><span className="mt-2 block text-xs">นักศึกษา {students.filter((student) => studentMatchesSection(student, item.section)).length} คน • {(item.section.primaryTeacherId || item.section.teacherId) === currentTeacher?.id ? 'อาจารย์ผู้สอนหลัก' : 'อาจารย์ผู้สอนร่วม'}</span>
        </button>)}</div>
      </section>

      {selectedSection && <>
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="text-base font-bold text-gray-900">Section {selectedSection.sectionNo} • รายชื่อนักศึกษา {roster.length} คน</h3><p className="mt-1 text-xs text-gray-500">อาจารย์ผู้สอนหลัก: {teacherName(selectedSection.primaryTeacherId || selectedSection.teacherId)}</p><p className="mt-1 text-xs text-gray-500">อาจารย์ผู้สอนร่วม: {selectedSection.coTeacherIds?.length ? selectedSection.coTeacherIds.map(teacherName).join(', ') : 'ไม่มี'}</p></div>
            <div className="flex flex-col gap-2 sm:flex-row"><button type="button" onClick={() => { setModal('add'); setCandidateSearch(''); setError(''); }} className="inline-flex min-h-9 items-center justify-center gap-1 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"><UserPlus className="h-4 w-4" />เพิ่มนักศึกษา</button><button type="button" onClick={() => openMove()} disabled={!roster.length || !destinations.length} className="min-h-9 rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">ย้ายนักศึกษา</button></div>
          </div>
          <p className="mt-4 text-xs font-semibold text-gray-700">กลุ่มเรียนที่ครอบคลุม</p><div className="mt-2 flex flex-wrap gap-2">{(selectedSection.cohorts || []).map((cohort) => {
            const major = academicState.majors.find((item) => item.id === cohort.majorId);
            const codes = cohort.classGroupIds?.map((id) => academicState.classGroups.find((group) => group.id === id)?.code).filter(Boolean);
            return <span key={`${cohort.majorId}-${cohort.admissionYear}`} className="rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700">{major?.code || 'ไม่พบสาขาวิชา'} • ปีที่เข้าศึกษา {getAdmissionCode(cohort.admissionYear)} • {codes?.length ? codes.join(', ') : 'ทุกกลุ่มเรียน'}</span>;
          })}{!selectedSection.cohorts?.length && <span className="text-xs text-amber-700">ยังไม่ได้กำหนดกลุ่มนักศึกษา</span>}</div>
          {!destinations.length && <p className="mt-3 text-[11px] text-gray-500">การย้ายต้องมี Section อื่นในรายวิชาและภาคการศึกษาเดียวกันที่คุณได้รับมอบหมาย</p>}
        </section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h3 className="text-base font-bold text-gray-900">รายชื่อนักศึกษาใน Section</h3><label className="relative block w-full sm:w-80"><span className="sr-only">ค้นหานักศึกษาใน Section</span><Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /><input type="search" placeholder="ค้นหารหัสนักศึกษา / ชื่อ / อีเมล..." value={rosterSearch} onChange={(event) => setRosterSearch(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label></div>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="border-b border-gray-200 bg-gray-50 font-semibold text-gray-600"><tr><th className="px-4 py-3">รหัสนักศึกษา</th><th className="px-4 py-3">ชื่อ-นามสกุล</th><th className="px-4 py-3">สาขาวิชา / กลุ่มเรียน</th><th className="px-4 py-3">ปีที่เข้าศึกษา / ชั้นปี</th><th className="px-4 py-3">สถานะบัญชี</th><th className="px-4 py-3">การดำเนินการ</th></tr></thead><tbody className="divide-y divide-gray-100">{filteredRoster.map((student) => {
          const level = student.admissionYear ? calculateYearLevelFromAdmissionYear(student.admissionYear) : null;
          const submission = submissions.find((item) => item.examId === selectedExam?.id && item.studentId === student.id);
          const eligibleForExam = selectedExam && studentMatchesExamSection(student, selectedExam, selectedSection, now);
          return <tr key={student.id} className="hover:bg-gray-50/70">
            <td className="px-4 py-3 font-mono font-medium text-gray-800">{student.studentCode}</td>
            <td className="px-4 py-3"><p className="font-semibold text-gray-900">{student.fullName}</p><p className="text-[11px] text-gray-500">{student.email}</p></td>
            <td className="px-4 py-3 text-gray-700">{studentContext(student)}</td>
            <td className="px-4 py-3 text-gray-700">{student.admissionYear ? `ปีที่เข้าศึกษา ${getAdmissionCode(student.admissionYear)}` : '—'}<p className="text-[11px] text-gray-500">{level?.formattedYearLevel || '—'}</p></td>
            <td className="px-4 py-3"><AccountStatusBadge status={student.accountStatus} /><div className="mt-1">{eligibleForExam ? <ExamSubmissionStatusBadge status={submission?.status === 'submitted' || submission?.status === 'late' ? submission.status : selectedExam && getEffectiveExamStatus(selectedExam, now) === 'in_progress' ? 'in_progress' : 'not_started'} /> : <span className="text-[11px] text-gray-400">ไม่มีการสอบล่าสุด</span>}</div></td>
            <td className="px-4 py-3"><button type="button" onClick={() => openMove(student.id)} disabled={!destinations.length} className="rounded-lg px-2 py-1 font-semibold text-blue-700 hover:bg-blue-50 disabled:text-gray-400">ย้าย</button></td>
          </tr>;
        })}{!filteredRoster.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">ไม่พบนักศึกษาใน Section ที่เลือก</td></tr>}</tbody></table></div></div>
      </>}
    </>}

    <Modal isOpen={modal === 'add'} onClose={closeModal} title="เพิ่มนักศึกษาเข้า Section" maxWidth="2xl">
      <p className="text-xs text-gray-600">{selectedCourse?.courseCode} • Section {selectedSection?.sectionNo} — เลือกจากนักศึกษาที่มีอยู่ในระบบเท่านั้น</p>
      <input type="search" value={candidateSearch} onChange={(event) => setCandidateSearch(event.target.value)} placeholder="ค้นหารหัสนักศึกษา ชื่อ หรืออีเมล..." className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none" />
      {error && <p role="alert" className="mt-3 text-xs font-semibold text-red-600">{error}</p>}
      <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">{candidates.map((student) => {
        const alreadyHere = Boolean(selectedSection && studentMatchesSection(student, selectedSection));
        const other = existingSectionFor(student);
        const level = student.admissionYear ? calculateYearLevelFromAdmissionYear(student.admissionYear) : null;
        return <div key={student.id} className="flex flex-col gap-2 rounded-xl border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold text-gray-900">{student.studentCode} • {student.fullName}</p><p className="mt-1 text-[11px] text-gray-500">{studentContext(student)} • {level?.formattedYearLevel || '—'}</p><p className="mt-1 text-[11px] text-gray-500">{alreadyHere ? 'อยู่ใน Section นี้แล้ว' : other ? `ปัจจุบันอยู่ใน Section ${other.sectionNo}` : `ยังไม่ได้อยู่ใน ${selectedCourse?.courseCode}`}</p></div>{alreadyHere ? <button type="button" disabled className="rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-500">อยู่ใน Section นี้แล้ว</button> : other ? other.manageable ? <button type="button" onClick={() => openMove(student.id, sectionId, other.sectionId)} className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-800">ย้ายมายัง Section {selectedSection?.sectionNo}</button> : <span className="text-[11px] text-amber-700">ต้องได้รับมอบหมาย Section {other.sectionNo} ก่อนจึงจะย้ายได้</span> : <button type="button" onClick={() => addStudent(student.id)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white">เพิ่มนักศึกษา</button>}</div>;
      })}{candidateSearch.trim() && !candidates.length && <p className="py-8 text-center text-sm text-gray-500">ไม่พบนักศึกษาในระบบ</p>}{!candidateSearch.trim() && <p className="py-8 text-center text-xs text-gray-500">พิมพ์รหัสนักศึกษา ชื่อ หรืออีเมลเพื่อค้นหา</p>}</div>
    </Modal>
    <Modal isOpen={modal === 'move'} onClose={closeModal} title="ย้ายนักศึกษา" maxWidth="md" footer={<><button type="button" onClick={closeModal} className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700">ยกเลิก</button><button type="button" onClick={moveStudent} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white">ยืนยันการย้าย</button></>}>
      <div className="space-y-3 text-xs"><label className="block font-semibold text-gray-700">นักศึกษา<select value={movingStudentId} onChange={(event) => setMovingStudentId(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5"><option value="">เลือกนักศึกษา</option>{movingRoster.map((student) => <option key={student.id} value={student.id}>{student.studentCode} • {student.fullName}</option>)}</select></label><p className="text-gray-600">จาก: {selectedCourse?.courseCode} • Section {movingSource?.section.sectionNo}</p><label className="block font-semibold text-gray-700">ไปยัง<select value={destinationId} onChange={(event) => setDestinationId(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5"><option value="">เลือก Section ปลายทาง</option>{movingDestinations.map((item) => <option key={item.id} value={item.id}>Section {item.section.sectionNo} • ภาคเรียน {item.section.semester} / {item.section.academicYear}</option>)}</select></label>{error && <p role="alert" className="font-semibold text-red-600">{error}</p>}</div>
    </Modal>
  </div>;
};

interface SummaryCardProps { icon: React.ComponentType<{ className?: string }>; label: string; value: number; suffix: string }
const SummaryCard: React.FC<SummaryCardProps> = ({ icon: Icon, label, value, suffix }) => <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs"><div className="flex items-center justify-between"><p className="text-xs font-medium text-gray-500">{label}</p><Icon className="h-4 w-4 text-blue-600" /></div><p className="mt-2 text-2xl font-bold text-gray-900">{value} <span className="text-xs font-medium text-gray-500">{suffix}</span></p></div>;
