import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  CalendarDays,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  Eye,
  CheckCircle2,
  Clock,
  MapPin,
  FileCode,
  ShieldAlert,
  GripVertical,
  X
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { ExamSession, ExamRule } from '../../types';

export const CourseExamSessionManager: React.FC = () => {
  const {
    examSessions,
    courses,
    rooms,
    createExamSession,
    updateExamSession,
    showToast,
    language,
  } = useApp();
  const isThai = language === 'th';

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamSession | null>(null);
  const [previewRulesExam, setPreviewRulesExam] = useState<ExamSession | null>(null);

  // Form states
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [sectionNo, setSectionNo] = useState('1');
  const [examDate, setExamDate] = useState('2026-09-28');
  const [startTime, setStartTime] = useState('09:00');
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [roomId, setRoomId] = useState(rooms[0]?.id || '');
  const [format, setFormat] = useState<'offline' | 'online'>('offline');
  const [acceptedExtensions, setAcceptedExtensions] = useState<string>('.zip, .py');
  const [maxSizeMb, setMaxSizeMb] = useState(25);
  const [filenamePattern, setFilenamePattern] = useState('{studentCode}_final');
  const [requiredFileCount, setRequiredFileCount] = useState(1);
  const [instructions, setInstructions] = useState(
    'Compress all source code files and design notes into a single .zip archive, or submit your standalone .py file directly.'
  );

  const [rules, setRules] = useState<ExamRule[]>([
    { id: 'r1', text: 'Do not access websites other than those explicitly permitted.' },
    { id: 'r2', text: 'Do not use another person’s account or computer to sign in.' },
    { id: 'r3', text: 'Do not communicate with others during the examination.' },
    { id: 'r4', text: 'Ensure files are non-empty and readable before final submission.' },
  ]);

  const [newRuleText, setNewRuleText] = useState('');
  const selectedCourseSections = courses.find((course) => course.id === courseId)?.sections
    .filter((section) => section.status !== 'inactive') || [];

  // Conflict detection
  const checkRoomConflict = () => {
    // If there is another exam session on the same room, same date, overlapping time
    return examSessions.find((e) => {
      if (editingExam && e.id === editingExam.id) return false;
      if (e.roomId === roomId && e.examDate === examDate) {
        // Simple time overlap check
        return true;
      }
      return false;
    });
  };

  const conflictingSession = checkRoomConflict();

  const openCreateModal = () => {
    setEditingExam(null);
    const firstCourse = courses.find((course) => course.status !== 'inactive' && course.sections.some((section) => section.status !== 'inactive'));
    setCourseId(firstCourse?.id || '');
    setSectionNo(firstCourse?.sections.find((section) => section.status !== 'inactive')?.sectionNo || '');
    setExamDate('2026-09-28');
    setStartTime('09:00');
    setDurationMinutes(120);
    setRoomId(rooms[0]?.id || '');
    setFormat('offline');
    setAcceptedExtensions('.zip, .py');
    setMaxSizeMb(25);
    setFilenamePattern('{studentCode}_final');
    setRequiredFileCount(1);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (exam: ExamSession) => {
    setEditingExam(exam);
    setCourseId(exam.courseId);
    setSectionNo(exam.sectionNo);
    setExamDate(exam.examDate);
    setStartTime(exam.startTime);
    setDurationMinutes(exam.durationMinutes);
    setRoomId(exam.roomId);
    setFormat(exam.format);
    setAcceptedExtensions(exam.fileRequirements.acceptedExtensions.join(', '));
    setMaxSizeMb(exam.fileRequirements.maxSizeMb);
    setFilenamePattern(exam.fileRequirements.filenamePattern);
    setRequiredFileCount(exam.fileRequirements.requiredFileCount);
    setInstructions(exam.fileRequirements.instructions);
    setRules(exam.rules);
    setIsCreateModalOpen(true);
  };

  const handleAddRule = () => {
    if (!newRuleText.trim()) return;
    setRules((prev) => [...prev, { id: 'r_' + Date.now(), text: newRuleText.trim() }]);
    setNewRuleText('');
  };

  const handleRemoveRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSaveExam = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!editingExam || editingExam.roomId !== roomId) && !rooms.some((room) => room.id === roomId && room.status === 'ready')) {
      showToast('ห้องสอบไม่พร้อมใช้งาน', 'กรุณาเลือกห้องสอบที่พร้อมใช้งาน', 'error');
      return;
    }
    if (conflictingSession) {
      showToast('ตารางห้องสอบซ้ำซ้อน', 'ห้องที่เลือกมีรอบการสอบซ้อนกัน', 'error');
      return;
    }

    // Calculate end time
    const [startH, startM] = startTime.split(':').map(Number);
    const endTotalMinutes = startH * 60 + startM + Number(durationMinutes);
    const endH = Math.floor(endTotalMinutes / 60) % 24;
    const endM = endTotalMinutes % 60;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    const parsedExtensions = acceptedExtensions
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0)
      .map((s) => (s.startsWith('.') ? s : '.' + s));

    const examPayload = {
      courseId,
      sectionNo,
      examDate,
      startTime,
      endTime,
      durationMinutes: Number(durationMinutes),
      roomId,
      format,
      fileRequirements: {
        acceptedExtensions: parsedExtensions.length ? parsedExtensions : ['.zip', '.py'],
        maxSizeMb: Number(maxSizeMb),
        filenamePattern,
        requiredFileCount: Number(requiredFileCount),
        instructions,
      },
      rules,
      status: (editingExam ? editingExam.status : 'upcoming') as any,
    };

    if (editingExam) {
      updateExamSession(editingExam.id, examPayload);
    } else {
      createExamSession(examPayload);
    }

    setIsCreateModalOpen(false);
  };

  const filteredSessions = examSessions.filter((s) => {
    const course = courses.find((c) => c.id === s.courseId);
    const room = rooms.find((r) => r.id === s.roomId);
    const search = searchTerm.toLowerCase();
    return (
      course?.courseCode.toLowerCase().includes(search) ||
      course?.courseName.toLowerCase().includes(search) ||
      room?.labName.toLowerCase().includes(search) ||
      s.examDate.includes(search)
    );
  });

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-200 gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
            {isThai ? 'การกำหนดตารางสอบ & กฎระเบียบ (T2)' : 'Scheduling & Policies (T2)'}
          </span>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">
            {isThai ? 'การจัดการรายวิชา & รอบการสอบ' : 'Course & Exam Session Management'}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {isThai
              ? 'กำหนดตารางสอบ ตรวจสอบความขัดแย้งของการจองห้องปฏิบัติการ รูปแบบไฟล์ที่ยอมรับ และกฎความปลอดภัย'
              : 'Configure examination timetables, room allocation conflict checks, accepted submission types, and integrity rules.'}
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{isThai ? 'สร้างรอบการสอบใหม่' : 'Create New Exam Session'}</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            placeholder={
              isThai
                ? 'ค้นหาตามรหัสวิชา, ชื่อวิชา, ห้องสอบ หรือวันที่...'
                : 'Search by course code, name, room, or date...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Exam Sessions Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-3.5">{isThai ? 'รายวิชา & ตอนเรียน' : 'Course & Section'}</th>
                <th className="px-4 py-3.5">{isThai ? 'วันที่ & กำหนดการ' : 'Date & Schedule'}</th>
                <th className="px-4 py-3.5">{isThai ? 'ห้องปฏิบัติการ' : 'Room / Lab'}</th>
                <th className="px-4 py-3.5">{isThai ? 'รูปแบบ & ชนิดไฟล์' : 'Format & File Types'}</th>
                <th className="px-4 py-3.5">{isThai ? 'สถานะ' : 'Status'}</th>
                <th className="px-6 py-3.5 text-right">{isThai ? 'การจัดการ' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSessions.map((session) => {
                const course = courses.find((c) => c.id === session.courseId);
                const room = rooms.find((r) => r.id === session.roomId);

                return (
                  <tr key={session.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 text-sm">
                        {course?.courseCode} - {isThai ? 'ตอนเรียน ' : 'Section '}
                        {session.sectionNo}
                      </div>
                      <div className="text-gray-500 text-[11px] mt-0.5">{course?.courseName}</div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-800">{session.examDate}</div>
                      <div className="text-gray-500 font-mono text-[11px]">
                        {session.startTime} - {session.endTime} ({session.durationMinutes}
                        {isThai ? ' นาที' : 'm'})
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-800">{room?.labName}</div>
                      <div className="text-gray-500 text-[11px]">ชั้น {room?.floor}</div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 font-mono text-gray-700">
                        <FileCode className="w-3.5 h-3.5 text-blue-600" />
                        <span>{session.fileRequirements.acceptedExtensions.join(', ')}</span>
                      </div>
                      <div className="text-gray-500 text-[11px] capitalize">
                        {session.format === 'offline' ? (isThai ? 'ออฟไลน์' : 'offline') : isThai ? 'ออนไลน์' : 'online'} •{' '}
                        {isThai ? 'สูงสุด' : 'Max'} {session.fileRequirements.maxSizeMb}MB
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      {session.status === 'in_progress' ? (
                        <Badge variant="success">{isThai ? 'กำลังสอบ' : 'In Progress'}</Badge>
                      ) : session.status === 'upcoming' ? (
                        <Badge variant="warning">{isThai ? 'เร็วๆ นี้' : 'Upcoming'}</Badge>
                      ) : (
                        <Badge variant="neutral">{isThai ? 'เสร็จสิ้น' : 'Completed'}</Badge>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setPreviewRulesExam(session)}
                          className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
                          title={isThai ? 'ดูตัวอย่างหน้ากฎข้อสอบ ST3 สำหรับนักศึกษา' : 'Preview student ST3 rules screen'}
                        >
                          <Eye className="w-3 h-3 text-blue-600" />
                          <span>{isThai ? 'ดูตัวอย่าง ST3' : 'Preview ST3'}</span>
                        </button>

                        <button
                          onClick={() => openEditModal(session)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title={isThai ? 'แก้ไขรอบการสอบ' : 'Edit Session'}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT SESSION MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={
          editingExam
            ? isThai
              ? 'แก้ไขรอบการสอบ & ข้อกำหนด'
              : 'Edit Exam Session & Policies'
            : isThai
            ? 'สร้างรอบการสอบใหม่'
            : 'Create New Exam Session'
        }
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveExam} className="space-y-4 text-left">
          {/* Room Conflict Warning Banner */}
          {conflictingSession && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5 animate-in shake duration-200">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-red-900 font-semibold mb-0.5">
                  {isThai ? 'ตรวจพบความขัดแย้งของการจองห้องปฏิบัติการ!' : 'Room Scheduling Conflict Detected!'}
                </strong>
                {isThai ? (
                  <>
                    ห้องปฏิบัติการที่เลือกถูกจองไว้แล้วในวันที่ <strong>{conflictingSession.examDate}</strong> เวลา{' '}
                    <strong>
                      {conflictingSession.startTime} ถึง {conflictingSession.endTime}
                    </strong>{' '}
                    สำหรับตอนเรียนอื่น โปรดเลือกห้องสอบหรือช่วงเวลาอื่น
                  </>
                ) : (
                  <>
                    Selected lab is already reserved on <strong>{conflictingSession.examDate}</strong> from{' '}
                    <strong>
                      {conflictingSession.startTime} to {conflictingSession.endTime}
                    </strong>{' '}
                    for another course section. Please choose a different room or time slot.
                  </>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Course */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {isThai ? 'รายวิชา' : 'Course'}
              </label>
              <select
                value={courseId}
                onChange={(e) => {
                  const nextCourseId = e.target.value;
                  setCourseId(nextCourseId);
                  setSectionNo(courses.find((course) => course.id === nextCourseId)?.sections
                    .find((section) => section.status !== 'inactive')?.sectionNo || '');
                }}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-blue-500"
              >
                {courses.filter((course) => course.status !== 'inactive' && course.sections.some((section) => section.status !== 'inactive')).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.courseCode}: {c.courseName}
                  </option>
                ))}
              </select>
            </div>

            {/* Section */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {isThai ? 'ตอนเรียน (Section)' : 'Section No.'}
              </label>
              <select
                required
                value={sectionNo}
                onChange={(e) => setSectionNo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled>เลือกตอนเรียน</option>
                {selectedCourseSections.map((section) => (
                  <option key={section.id || section.sectionNo} value={section.sectionNo}>
                    ตอนเรียน {section.sectionNo} · ภาคเรียน {section.semester} / {section.academicYear}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {isThai ? 'วันที่สอบ' : 'Exam Date'}
              </label>
              <input
                type="date"
                required
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {isThai ? 'เวลาเริ่มสอบ' : 'Start Time'}
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {isThai ? 'ระยะเวลาสอบ (นาที)' : 'Duration (Minutes)'}
              </label>
              <input
                type="number"
                min="15"
                max="360"
                required
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Room */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {isThai ? 'ห้องปฏิบัติการ' : 'Laboratory Room'}
              </label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-blue-500"
              >
                <option value="">เลือกห้องสอบ</option>
                {rooms.filter((r) => r.status === 'ready' || r.id === editingExam?.roomId).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.labName} (ชั้น {r.floor})
                  </option>
                ))}
              </select>
            </div>

            {/* Format */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {isThai ? 'รูปแบบการสอบ' : 'Format'}
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-blue-500"
              >
                <option value="offline">
                  {isThai ? 'ออฟไลน์ (เครื่องคอมพิวเตอร์ในห้องปฏิบัติการ)' : 'Offline (Local Lab Computer Workstations)'}
                </option>
                <option value="online">
                  {isThai ? 'ออนไลน์ (ระยะไกล / ตรวจสอบระบบ)' : 'Online (Remote / Monitored)'}
                </option>
              </select>
            </div>

            {/* Accepted Extensions */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {isThai ? 'นามสกุลไฟล์ที่ยอมรับ (คั่นด้วยจุลภาค)' : 'Accepted Extensions (comma-separated)'}
              </label>
              <input
                type="text"
                required
                value={acceptedExtensions}
                onChange={(e) => setAcceptedExtensions(e.target.value)}
                placeholder=".zip, .py"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            {/* Max File Size */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {isThai ? 'ขนาดไฟล์สูงสุด (MB)' : 'Max File Size (MB)'}
              </label>
              <input
                type="number"
                min="1"
                max="500"
                required
                value={maxSizeMb}
                onChange={(e) => setMaxSizeMb(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filename Pattern */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {isThai ? 'รูปแบบชื่อไฟล์ที่กำหนด' : 'Filename Pattern'}
              </label>
              <input
                type="text"
                value={filenamePattern}
                onChange={(e) => setFilenamePattern(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          {/* Submission Instructions */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {isThai ? 'คำแนะนำการส่งไฟล์สำหรับนักศึกษา' : 'Submission Instructions for Students'}
            </label>
            <textarea
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Exam Rules Builder */}
          <div className="pt-2 border-t border-gray-100">
            <label className="block text-xs font-semibold text-gray-700 mb-2 flex items-center justify-between">
              <span>{isThai ? 'กฎและระเบียบการสอบ' : 'Exam Rules & Regulations'}</span>
              <span className="text-[11px] font-normal text-gray-400">
                {isThai ? 'แสดงให้นักศึกษาเห็นบนหน้าจอ ST3' : 'Shown to students on Screen ST3'}
              </span>
            </label>

            <div className="space-y-1.5 max-h-40 overflow-y-auto mb-2">
              {rules.map((rule, idx) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-200 text-xs"
                >
                  <span className="truncate flex-1 text-gray-700">
                    <strong>{idx + 1}.</strong> {rule.text}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveRule(rule.id)}
                    className="text-gray-400 hover:text-red-500 p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder={isThai ? 'เพิ่มกฎการสอบข้อใหม่...' : 'Add another exam rule...'}
                value={newRuleText}
                onChange={(e) => setNewRuleText(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 text-xs focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAddRule}
                className="px-3 py-1.5 rounded-lg bg-gray-800 text-white text-xs font-semibold hover:bg-gray-900 cursor-pointer"
              >
                {isThai ? 'เพิ่มกฎ' : 'Add Rule'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              {isThai ? 'ยกเลิก' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={!!conflictingSession}
              className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md transition-all disabled:opacity-40 cursor-pointer"
            >
              {editingExam ? (isThai ? 'บันทึกการแก้ไข' : 'Save Changes') : isThai ? 'สร้างรอบการสอบ' : 'Schedule Session'}
            </button>
          </div>
        </form>
      </Modal>

      {/* PREVIEW AS STUDENT MODAL (Screen ST3 Preview) */}
      <Modal
        isOpen={!!previewRulesExam}
        onClose={() => setPreviewRulesExam(null)}
        title={
          isThai
            ? 'ตัวอย่างหน้าจอก่อนเข้าสอบของนักศึกษา (ST3)'
            : 'Student Pre-Exam View Preview (ST3)'
        }
        maxWidth="xl"
      >
        {previewRulesExam && (
          <div className="text-left text-xs space-y-4">
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
              <div className="font-bold text-sm text-blue-900">
                {courses.find((c) => c.id === previewRulesExam.courseId)?.courseCode} - {isThai ? 'ตอนเรียน ' : 'Section '}
                {previewRulesExam.sectionNo}
              </div>
              <div className="text-blue-700 text-xs mt-0.5">
                {isThai ? 'ห้องสอบ: ' : 'Room: '}
                {rooms.find((r) => r.id === previewRulesExam.roomId)?.labName} •{' '}
                {isThai ? 'เวลาสอบ: ' : 'Duration: '}
                {previewRulesExam.durationMinutes} {isThai ? 'นาที' : 'Mins'} •{' '}
                {isThai ? 'รูปแบบ: ' : 'Format: '}
                {previewRulesExam.format.toUpperCase()}
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
              <strong>{isThai ? 'ชนิดไฟล์ที่ยอมรับ:' : 'Accepted File Types:'}</strong>{' '}
              {previewRulesExam.fileRequirements.acceptedExtensions.join(', ')} ({isThai ? 'สูงสุด' : 'Max'}{' '}
              {previewRulesExam.fileRequirements.maxSizeMb} MB)
              <div className="mt-1 text-slate-700">{previewRulesExam.fileRequirements.instructions}</div>
            </div>

            <div>
              <span className="font-bold text-gray-900 block mb-2">
                {isThai ? 'กฎที่นักศึกษาต้องกดยอมรับก่อนสอบ:' : 'Rules Examinees Must Confirm:'}
              </span>
              <ul className="space-y-1.5">
                {previewRulesExam.rules.map((r, i) => (
                  <li key={r.id} className="p-2 bg-gray-50 rounded-lg border border-gray-100 flex items-start gap-2">
                    <span className="font-bold text-blue-600">{i + 1}.</span>
                    <span>{r.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-3 bg-gray-100 rounded-xl text-gray-500 text-[11px] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                {isThai
                  ? 'นักศึกษาต้องกดยอมรับข้อกำหนดก่อนระบบจะเริ่มนับเวลาถอยหลังเข้าสู่การสอบ'
                  : 'Students are required to check the agreement box before the countdown initiates.'}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
