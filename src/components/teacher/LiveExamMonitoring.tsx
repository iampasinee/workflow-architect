import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Activity,
  Clock,
  ShieldAlert,
  AlertOctagon,
  CheckCircle2,
  Users,
  Search,
  Plus,
  Minus,
  RotateCcw,
  Eye,
  RefreshCw,
  Bell,
  ArrowRight,
  Filter,
  Monitor,
  Check
} from 'lucide-react';
import { Badge, ExamSubmissionStatusBadge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { Student, Violation, StudentExamStatus } from '../../types';

export const LiveExamMonitoring: React.FC = () => {
  const {
    examSessions,
    courses,
    rooms,
    students,
    seatAssignments,
    submissions,
    violations,
    auditLogs,
    adjustExamTime,
    reopenSubmission,
    showToast,
    triggerViolation,
    language,
  } = useApp();

  const isThai = language === 'th';
  const activeExam = examSessions[0];
  const course = courses.find((c) => c.id === activeExam?.courseId);
  const room = rooms.find((r) => r.id === activeExam?.roomId) || rooms[0];

  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected student for detail modal
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<{
    student: Student;
    seatNo: string;
    status: StudentExamStatus;
    violationCount: number;
    submission?: any;
  } | null>(null);

  // Time Control Modal
  const [showTimeControlModal, setShowTimeControlModal] = useState(false);
  const [timeControlDelta, setTimeControlDelta] = useState<number>(5);
  const [timeControlScope, setTimeControlScope] = useState<'room' | 'student'>('room');
  const [timeControlTargetStudent, setTimeControlTargetStudent] = useState<string>('');
  const [timeControlReason, setTimeControlReason] = useState(
    isThai ? 'ชดเชยความหน่วงของเครือข่ายห้องปฏิบัติการ' : 'Laboratory network jitter compensation'
  );

  // Reopen Modal
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenMinutes, setReopenMinutes] = useState(15);
  const [reopenScope, setReopenScope] = useState<'room' | 'student'>('student');
  const [reopenTargetStudent, setReopenTargetStudent] = useState(students[0]?.id || '');
  const [reopenReason, setReopenReason] = useState(
    isThai ? 'เครื่องสอบขัดข้อง / ต้องรีสตาร์ตระบบไฟ' : 'Equipment reboot / power supply disconnect'
  );

  // Live auto-refresh simulation ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdated(new Date().toLocaleTimeString());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const hasActiveReopening = (studentId: string) => {
    const reopening =
      activeExam?.reopenedStudents?.[studentId] || activeExam?.reopenedStudents?.['*'];
    return Boolean(reopening && new Date(reopening.reopenedUntil).getTime() > Date.now());
  };

  // Compute student status for each seat
  const getSeatStatus = (seatNo: string): { status: StudentExamStatus; student?: Student; violation?: Violation } => {
    const station = room?.seats?.find((s) => s.seatNo === seatNo);
    if (station?.status === 'offline' || station?.status === 'damaged') {
      return { status: 'offline' };
    }

    const assignment = seatAssignments.find(
      (sa) => sa.examId === activeExam?.id && sa.seatNo === seatNo
    );
    if (!assignment) return { status: 'not_started' };

    const student = students.find((s) => s.id === assignment.studentId);
    const violation = violations.find(
      (v) => v.examId === activeExam?.id && v.studentId === student?.id
    );

    if (violation) return { status: 'violation', student, violation };

    const sub = submissions.find(
      (s) => s.examId === activeExam?.id && s.studentId === student?.id
    );

    if (sub?.status === 'submitted') return { status: 'submitted', student };
    if (sub?.status === 'late') return { status: 'late', student };

    // Check if reopened
    if (student && hasActiveReopening(student.id)) {
      return { status: 'reopened', student };
    }

    return { status: 'working', student };
  };

  // Aggregated totals
  let totalAssigned = 0;
  let submittedCount = 0;
  let workingCount = 0;
  let lateCount = 0;
  let violationCount = 0;
  let offlineCount = 0;

  (room?.seats || []).forEach((seat) => {
    const res = getSeatStatus(seat.seatNo);
    if (res.student) totalAssigned++;
    if (res.status === 'submitted') submittedCount++;
    else if (res.status === 'working') workingCount++;
    else if (res.status === 'late') lateCount++;
    else if (res.status === 'violation') violationCount++;
    else if (res.status === 'offline') offlineCount++;
  });

  const handleApplyTimeControl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!timeControlReason) return;
    adjustExamTime(
      activeExam.id,
      timeControlDelta,
      timeControlScope,
      timeControlScope === 'student' ? timeControlTargetStudent : undefined,
      timeControlReason
    );
    setShowTimeControlModal(false);
  };

  const handleApplyReopen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenReason) return;
    reopenSubmission(
      activeExam.id,
      reopenMinutes,
      reopenScope,
      reopenScope === 'student' ? reopenTargetStudent : undefined,
      reopenReason
    );
    setShowReopenModal(false);
  };

  const rows = [...new Set(room.seats.map((seat) => seat.seatNo.replace(/\d+$/, '')))];
  const columns = Array.from({ length: room.columns || 8 }, (_, i) => i + 1);

  // Student roster rows for T6 Table
  const examineeStatusList = seatAssignments
    .filter((sa) => sa.examId === activeExam?.id)
    .map((sa) => {
      const student = students.find((s) => s.id === sa.studentId);
      const station = room.seats.find((s) => s.seatNo === sa.seatNo);
      const sub = submissions.find((s) => s.examId === activeExam?.id && s.studentId === sa.studentId);
      const stdViolations = violations.filter((v) => v.examId === activeExam?.id && v.studentId === sa.studentId);

      let status: StudentExamStatus = 'working';
      if (stdViolations.length > 0) status = 'violation';
      else if (sub?.status === 'submitted') status = 'submitted';
      else if (sub?.status === 'late') status = 'late';
      else if (student && hasActiveReopening(student.id)) status = 'reopened';

      return {
        student: student!,
        seatNo: sa.seatNo,
        station,
        status,
        submission: sub,
        violations: stdViolations,
      };
    })
    .filter((item) => {
      if (!item.student) return false;
      if (activeFilter === 'submitted' && item.status !== 'submitted') return false;
      if (activeFilter === 'working' && item.status !== 'working') return false;
      if (activeFilter === 'late' && item.status !== 'late') return false;
      if (activeFilter === 'violation' && item.status !== 'violation') return false;

      const search = searchTerm.toLowerCase();
      return (
        item.student.fullName.toLowerCase().includes(search) ||
        item.student.studentCode.includes(search) ||
        item.seatNo.toLowerCase().includes(search)
      );
    });

  return (
    <div className="space-y-6 text-left">
      {/* Top Header & Telemetry Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-200 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              {isThai ? 'ข้อมูลการคุมสอบสด (T5 & T6)' : 'Active Proctor Feed (T5 & T6)'}
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs text-gray-500">
              {isThai ? 'อัปเดตอัตโนมัติสด: ' : 'Live Auto-Refresh: '}
              {lastUpdated}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">
            {course?.courseCode}: {isThai ? 'ติดตามการสอบสด & ควบคุมเวลาสอบ' : 'Live Exam Monitoring & Time Control'}
          </h1>
          <p className="text-xs text-gray-500">
            {isThai ? 'ห้องสอบ: ' : 'Room: '}
            {room.labName} • {isThai ? 'กำหนดเวลา: ' : 'Scheduled: '}
            {activeExam?.startTime} - {activeExam?.endTime} ({isThai ? 'ระยะเวลา: ' : 'Duration: '}
            {activeExam?.durationMinutes} {isThai ? 'นาที' : 'min'})
          </p>
        </div>

        {/* Global Time Controls Button Group */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              setTimeControlDelta(5);
              setTimeControlScope('room');
              setShowTimeControlModal(true);
            }}
            className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isThai ? '+5 นาที (ทั้งห้อง)' : '+5 Min (Room)'}</span>
          </button>

          <button
            onClick={() => {
              setTimeControlDelta(-5);
              setTimeControlScope('room');
              setShowTimeControlModal(true);
            }}
            className="px-3 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
            <span>{isThai ? '-5 นาที' : '-5 Min'}</span>
          </button>

          <button
            onClick={() => setShowReopenModal(true)}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isThai ? 'เปิดรับส่งข้อสอบใหม่' : 'Reopen Submission'}</span>
          </button>
        </div>
      </div>

      {/* Real-time Status Metric Badges / Clickable Filter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => setActiveFilter('all')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-center ${
            activeFilter === 'all'
              ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400/20'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <span className="text-[11px] text-gray-500 font-medium block">
            {isThai ? 'ที่นั่งสอบทั้งหมด' : 'Total Seated'}
          </span>
          <span className="text-2xl font-bold text-gray-900 font-mono mt-0.5 block">{totalAssigned}</span>
        </div>

        <div
          onClick={() => setActiveFilter('submitted')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-center ${
            activeFilter === 'submitted'
              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/20'
              : 'bg-white border-gray-200 hover:border-emerald-200'
          }`}
        >
          <span className="text-[11px] text-emerald-700 font-medium block">
            {isThai ? 'ส่งแล้ว (สีเขียว)' : 'Submitted (Green)'}
          </span>
          <span className="text-2xl font-bold text-emerald-800 font-mono mt-0.5 block">{submittedCount}</span>
        </div>

        <div
          onClick={() => setActiveFilter('working')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-center ${
            activeFilter === 'working'
              ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400/20'
              : 'bg-white border-gray-200 hover:border-blue-200'
          }`}
        >
          <span className="text-[11px] text-blue-700 font-medium block">
            {isThai ? 'กำลังทำข้อสอบ (สีฟ้า)' : 'Working (Blue)'}
          </span>
          <span className="text-2xl font-bold text-blue-800 font-mono mt-0.5 block">{workingCount}</span>
        </div>

        <div
          onClick={() => setActiveFilter('late')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-center ${
            activeFilter === 'late'
              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/20'
              : 'bg-white border-gray-200 hover:border-amber-200'
          }`}
        >
          <span className="text-[11px] text-amber-700 font-medium block">
            {isThai ? 'ส่งช้า (สีเหลือง)' : 'Late (Amber)'}
          </span>
          <span className="text-2xl font-bold text-amber-800 font-mono mt-0.5 block">{lateCount}</span>
        </div>

        <div
          onClick={() => setActiveFilter('violation')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-center ${
            activeFilter === 'violation'
              ? 'bg-red-50 border-red-400 ring-2 ring-red-400/20'
              : 'bg-white border-gray-200 hover:border-red-200'
          }`}
        >
          <span className="text-[11px] text-red-700 font-medium block">
            {isThai ? 'ละเมิดกฎ (สีแดง)' : 'Violation (Red)'}
          </span>
          <span className="text-2xl font-bold text-red-800 font-mono mt-0.5 block">{violationCount}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-gray-200 text-center">
          <span className="text-[11px] text-gray-500 font-medium block">
            {isThai ? 'ออฟไลน์ / ชำรุด' : 'Offline / Damaged'}
          </span>
          <span className="text-2xl font-bold text-gray-800 font-mono mt-0.5 block">{offlineCount}</span>
        </div>
      </div>

      {/* Main Grid: Interactive Real-Time Seat Map (Left 3 cols) & Violation Live Feed (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Real-time Seat Map */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
            <div className="flex items-center gap-2">
              <Monitor className="w-5 h-5 text-gray-700" />
              <h2 className="text-sm font-bold text-gray-900">
                {isThai ? `ผังที่นั่งและสถานะเครื่องสอบสด (${room.labName})` : `Live Interactive Workstation Grid (${room.labName})`}
              </h2>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> {isThai ? 'ส่งแล้ว' : 'Submitted'}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> {isThai ? 'กำลังสอบ' : 'Working'}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> {isThai ? 'ส่งช้า' : 'Late'}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" /> {isThai ? 'ละเมิดกฎ' : 'Violation'}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> {isThai ? 'ออฟไลน์' : 'Offline'}
              </span>
            </div>
          </div>

          <div className="space-y-3.5">
            {rows.map((rowLetter) => (
              <div key={rowLetter} className="flex items-center gap-2">
                <span className="w-6 font-bold text-gray-500 text-xs font-mono text-center">
                  {rowLetter}
                </span>

                <div className="grid gap-2 flex-1 min-w-0" style={{ gridTemplateColumns: `repeat(${room.columns || 1}, minmax(0, 1fr))` }}>
                  {columns.map((colNum) => {
                    const seatNo = `${rowLetter}${colNum}`;
                    const res = getSeatStatus(seatNo);

                    // Dynamic colors matching PRD specs
                    let colorClass = 'bg-gray-50 border-gray-200 text-gray-400'; // empty
                    if (res.status === 'submitted') {
                      colorClass = 'bg-emerald-50 border-emerald-400 text-emerald-900 hover:shadow-md';
                    } else if (res.status === 'working') {
                      colorClass = 'bg-blue-50 border-blue-400 text-blue-900 hover:shadow-md';
                    } else if (res.status === 'late') {
                      colorClass = 'bg-amber-50 border-amber-400 text-amber-900 hover:shadow-md';
                    } else if (res.status === 'violation') {
                      colorClass = 'bg-red-50 border-red-500 text-red-900 ring-2 ring-red-400/40 animate-pulse hover:shadow-lg';
                    } else if (res.status === 'reopened') {
                      colorClass = 'bg-purple-50 border-purple-400 text-purple-900 hover:shadow-md';
                    } else if (res.status === 'offline') {
                      colorClass = 'bg-gray-100 border-gray-300 text-gray-500 opacity-60';
                    }

                    return (
                      <div
                        key={seatNo}
                        onClick={() => {
                          if (res.student) {
                            setSelectedStudentForDetail({
                              student: res.student,
                              seatNo,
                              status: res.status,
                              violationCount: res.violation ? 1 : 0,
                            });
                          }
                        }}
                        className={`p-2 rounded-xl border transition-all cursor-pointer text-center flex flex-col justify-between min-h-[72px] ${colorClass}`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                          <span>{seatNo}</span>
                          {res.status === 'violation' ? (
                            <ShieldAlert className="w-3.5 h-3.5 text-red-600 animate-bounce" />
                          ) : res.status === 'submitted' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : null}
                        </div>

                        {res.student ? (
                          <div className="truncate text-left mt-1">
                            <div className="text-[11px] font-bold truncate">
                              {res.student.fullName.split(' ')[0]}
                            </div>
                            <div className="text-[9px] font-mono opacity-80">
                              {res.student.studentCode.slice(-4)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] opacity-60 mt-1">
                            {res.status === 'offline' ? 'Offline' : 'Open'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Violation Feed (1 col) */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <span>{isThai ? 'บันทึกการละเมิดสด' : 'Violation Feed'}</span>
            </h3>
            <span className="text-xs font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
              {violations.length}
            </span>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[480px] flex-1 pr-1">
            {violations.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400 bg-gray-50 rounded-xl">
                {isThai ? 'ไม่พบการละเมิดกฎในขณะนี้' : 'No active integrity breaches detected.'}
              </div>
            ) : (
              violations.map((vio) => {
                const std = students.find((s) => s.id === vio.studentId);
                return (
                  <div
                    key={vio.id}
                    onClick={() => {
                      if (std) {
                        setSelectedStudentForDetail({
                          student: std,
                          seatNo: vio.seatNo,
                          status: 'violation',
                          violationCount: 1,
                        });
                      }
                    }}
                    className="p-3 rounded-xl border border-red-200 bg-red-50/70 hover:bg-red-50 hover:shadow-xs transition-all text-xs cursor-pointer text-left"
                  >
                    <div className="flex items-center justify-between font-bold text-red-900 text-xs mb-1">
                      <span className="flex items-center gap-1">
                        <AlertOctagon className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span>{isThai ? 'ที่นั่ง' : 'Seat'} {vio.seatNo}</span>
                      </span>
                      <span className="font-mono text-[10px] text-red-700">{vio.detectedAt}</span>
                    </div>

                    <div className="font-semibold text-gray-900 truncate">
                      {std?.fullName || (isThai ? 'ผู้เข้าสอบ' : 'Examinee')} ({std?.studentCode})
                    </div>
                    <div className="text-[11px] text-red-800 mt-1 leading-snug">
                      {vio.detail}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          SCREEN T6: STUDENT EXAM STATUS TABLE
         ========================================================================= */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {isThai ? 'ตารางสถานะการสอบของนักศึกษา (T6)' : 'Student Examination Status Table (T6)'}
            </h2>
            <p className="text-xs text-gray-500">
              {isThai
                ? 'รายละเอียดสถานะการทำข้อสอบ บันทึกเวลา และประวัติความถูกต้องรายบุคคล'
                : 'Granular view of examinee workstation telemetry, timestamps, and integrity logs'}
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder={isThai ? 'ค้นหาตามที่นั่ง, นักศึกษา...' : 'Filter by seat, student...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-3.5">{isThai ? 'ที่นั่งสอบ' : 'Assigned Seat'}</th>
                <th className="px-4 py-3.5">{isThai ? 'ผู้เข้าสอบ' : 'Examinee'}</th>
                <th className="px-4 py-3.5">{isThai ? 'IP / MAC เครื่องสอบ' : 'Workstation IP / MAC'}</th>
                <th className="px-4 py-3.5">{isThai ? 'สถานะการส่ง' : 'Submission Status'}</th>
                <th className="px-4 py-3.5">{isThai ? 'เวลาที่ส่ง' : 'Submitted Time'}</th>
                <th className="px-4 py-3.5">{isThai ? 'ความถูกต้อง & การละเมิด' : 'Integrity & Violations'}</th>
                <th className="px-6 py-3.5 text-right">{isThai ? 'การจัดการ' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {examineeStatusList.map((row) => (
                <tr key={row.student.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-6 py-3.5">
                    <span className="font-mono font-bold text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg border border-blue-200">
                      {isThai ? 'ที่นั่ง' : 'Seat'} {row.seatNo}
                    </span>
                  </td>

                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-gray-900">{row.student.fullName}</div>
                    <div className="text-gray-500 font-mono text-[11px]">{row.student.studentCode}</div>
                  </td>

                  <td className="px-4 py-3.5 font-mono text-gray-600">
                    <div>{row.station?.ip || '192.168.10.x'}</div>
                    <div className="text-[10px] text-gray-400">{row.station?.mac || 'AC:DE:48:00:11:xx'}</div>
                  </td>

                  <td className="px-4 py-3.5">
                    <ExamSubmissionStatusBadge status={row.status} />
                  </td>

                  <td className="px-4 py-3.5 font-mono text-gray-600">
                    {row.submission?.submittedAt
                      ? new Date(row.submission.submittedAt).toLocaleTimeString()
                      : '—'}
                  </td>

                  <td className="px-4 py-3.5">
                    {row.violations.length > 0 ? (
                      <Badge variant="danger" size="sm">
                        <AlertOctagon className="w-3 h-3" />
                        <span>
                          {row.violations.length} {isThai ? 'การละเมิด' : 'Violation(s)'}
                        </span>
                      </Badge>
                    ) : (
                      <Badge variant="success" size="sm">
                        <Check className="w-3 h-3" />
                        <span>{isThai ? 'ปกติ' : 'Clean'}</span>
                      </Badge>
                    )}
                  </td>

                  <td className="px-6 py-3.5 text-right">
                    <button
                      onClick={() =>
                        setSelectedStudentForDetail({
                          student: row.student,
                          seatNo: row.seatNo,
                          status: row.status,
                          violationCount: row.violations.length,
                          submission: row.submission,
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      {isThai ? 'รายละเอียด / จัดการ' : 'Detail / Manage'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* STUDENT DETAIL & PROCTOR OVERRIDE MODAL */}
      <Modal
        isOpen={!!selectedStudentForDetail}
        onClose={() => setSelectedStudentForDetail(null)}
        title={
          isThai
            ? `รายละเอียดเครื่องสอบนักศึกษา: ที่นั่ง ${selectedStudentForDetail?.seatNo}`
            : `Examinee Station Detail: Seat ${selectedStudentForDetail?.seatNo}`
        }
        maxWidth="lg"
      >
        {selectedStudentForDetail && (
          <div className="space-y-4 text-left text-xs">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-200 shrink-0">
                {selectedStudentForDetail.student.faceReferenceUrl ? (
                  <img
                    src={selectedStudentForDetail.student.faceReferenceUrl}
                    alt={selectedStudentForDetail.student.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-gray-500">
                    {selectedStudentForDetail.student.fullName.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-gray-900">
                  {selectedStudentForDetail.student.fullName}
                </div>
                <div className="text-gray-500 font-mono">
                  {selectedStudentForDetail.student.studentCode} • {selectedStudentForDetail.student.faculty}
                </div>
                <div className="mt-1">
                  <ExamSubmissionStatusBadge status={selectedStudentForDetail.status} />
                </div>
              </div>
            </div>

            {/* If violation exists */}
            {selectedStudentForDetail.violationCount > 0 && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800">
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  <span>{isThai ? 'พบการละเมิดกฎความปลอดภัย:' : 'Flagged Integrity Breach:'}</span>
                </div>
                {violations
                  .filter((v) => v.studentId === selectedStudentForDetail.student.id)
                  .map((v) => (
                    <div key={v.id} className="text-xs">
                      • {v.detail} ({isThai ? 'ตรวจพบเวลา' : 'Detected at'} {v.detectedAt})
                    </div>
                  ))}
              </div>
            )}

            {/* Quick Individual Proctor Actions */}
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
              <span className="font-bold text-blue-950 block">
                {isThai ? 'คำสั่งควบคุมเฉพาะรายบุคคล:' : 'Individual Proctor Actions:'}
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    adjustExamTime(
                      activeExam.id,
                      5,
                      'student',
                      selectedStudentForDetail.student.id,
                      isThai ? 'ชดเชยเวลาเครื่องหน่วงเฉพาะรายบุคคล' : 'Individual station latency grace'
                    );
                    setSelectedStudentForDetail(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px] cursor-pointer"
                >
                  {isThai ? '+5 นาที (นักศึกษาคนนี้)' : '+5 Mins (This Student)'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    reopenSubmission(
                      activeExam.id,
                      15,
                      'student',
                      selectedStudentForDetail.student.id,
                      isThai ? 'เปิดสิทธิ์ส่งใหม่เนื่องจากเครื่องรีสตาร์ต' : 'Individual equipment restart'
                    );
                    setSelectedStudentForDetail(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-[11px] cursor-pointer"
                >
                  {isThai ? 'เปิดรับส่งข้อสอบใหม่ (+15 นาที)' : 'Reopen Submission (+15m)'}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* TIME CONTROL MODAL (+5 / -5) */}
      <Modal
        isOpen={showTimeControlModal}
        onClose={() => setShowTimeControlModal(false)}
        title={isThai ? 'ปรับระยะเวลาการทำและส่งข้อสอบ' : 'Adjust Examination Submission Duration'}
        maxWidth="md"
      >
        <form onSubmit={handleApplyTimeControl} className="space-y-4 text-left text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              {isThai ? 'ระยะเวลาที่ต้องการปรับเปลี่ยน' : 'Adjustment Delta'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTimeControlDelta(5)}
                className={`py-2 px-3 rounded-xl font-bold border transition-colors cursor-pointer ${
                  timeControlDelta === 5 ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 border-gray-300 text-gray-700'
                }`}
              >
                {isThai ? '+5 นาที' : '+5 Minutes'}
              </button>
              <button
                type="button"
                onClick={() => setTimeControlDelta(-5)}
                className={`py-2 px-3 rounded-xl font-bold border transition-colors cursor-pointer ${
                  timeControlDelta === -5 ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 border-gray-300 text-gray-700'
                }`}
              >
                {isThai ? '-5 นาที' : '-5 Minutes'}
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              {isThai ? 'ขอบเขตการใช้งาน' : 'Application Scope'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTimeControlScope('room')}
                className={`py-2 px-3 rounded-xl font-bold border transition-colors cursor-pointer ${
                  timeControlScope === 'room' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 border-gray-300 text-gray-700'
                }`}
              >
                {isThai ? `ทั้งห้องสอบ (${room.labName})` : `Entire Room (${room.labName})`}
              </button>
              <button
                type="button"
                onClick={() => setTimeControlScope('student')}
                className={`py-2 px-3 rounded-xl font-bold border transition-colors cursor-pointer ${
                  timeControlScope === 'student' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 border-gray-300 text-gray-700'
                }`}
              >
                {isThai ? 'เฉพาะรายบุคคล' : 'Individual Student'}
              </button>
            </div>
          </div>

          {timeControlScope === 'student' && (
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                {isThai ? 'เลือกนักศึกษา' : 'Select Student'}
              </label>
              <select
                value={timeControlTargetStudent}
                onChange={(e) => setTimeControlTargetStudent(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-blue-500"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.studentCode})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              {isThai ? 'เหตุผลในการปรับเวลา (จำเป็น)' : 'Reason for Adjustment (Required)'}
            </label>
            <input
              type="text"
              required
              value={timeControlReason}
              onChange={(e) => setTimeControlReason(e.target.value)}
              placeholder={isThai ? 'เช่น ชดเชยความล่าช้าของระบบเครือข่าย' : 'e.g. Network latency compensation'}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowTimeControlModal(false)}
              className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-semibold text-xs hover:bg-gray-50 cursor-pointer"
            >
              {isThai ? 'ยกเลิก' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md cursor-pointer"
            >
              {isThai ? 'บันทึกการปรับเวลา' : 'Apply Adjustment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* REOPEN SUBMISSION MODAL */}
      <Modal
        isOpen={showReopenModal}
        onClose={() => setShowReopenModal(false)}
        title={isThai ? 'เปิดรับส่งไฟล์คำตอบข้อสอบใหม่' : 'Reopen Answer File Submissions'}
        maxWidth="md"
      >
        <form onSubmit={handleApplyReopen} className="space-y-4 text-left text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              {isThai ? 'ระยะเวลาที่เปิดรับเพิ่ม (นาที)' : 'Reopening Duration (Minutes)'}
            </label>
            <input
              type="number"
              min="5"
              max="60"
              required
              value={reopenMinutes}
              onChange={(e) => setReopenMinutes(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              {isThai ? 'ขอบเขต' : 'Scope'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setReopenScope('room')}
                className={`py-2 px-3 rounded-xl font-bold border transition-colors cursor-pointer ${
                  reopenScope === 'room' ? 'bg-purple-600 text-white border-purple-600' : 'bg-gray-50 border-gray-300 text-gray-700'
                }`}
              >
                {isThai ? 'ทั้งห้องปฏิบัติการ' : 'Whole Laboratory Room'}
              </button>
              <button
                type="button"
                onClick={() => setReopenScope('student')}
                className={`py-2 px-3 rounded-xl font-bold border transition-colors cursor-pointer ${
                  reopenScope === 'student' ? 'bg-purple-600 text-white border-purple-600' : 'bg-gray-50 border-gray-300 text-gray-700'
                }`}
              >
                {isThai ? 'เฉพาะนักศึกษาที่ระบุ' : 'Specific Student'}
              </button>
            </div>
          </div>

          {reopenScope === 'student' && (
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                {isThai ? 'เลือกนักศึกษา' : 'Target Student'}
              </label>
              <select
                value={reopenTargetStudent}
                onChange={(e) => setReopenTargetStudent(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-blue-500"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.studentCode})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              {isThai ? 'เหตุผลในการเปิดรับส่งใหม่' : 'Reason for Reopening'}
            </label>
            <input
              type="text"
              required
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder={isThai ? 'เช่น เครื่องคอมพิวเตอร์ไฟดับและต้องรีสตาร์ต' : 'e.g. Workstation power failure restart'}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowReopenModal(false)}
              className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-semibold text-xs hover:bg-gray-50 cursor-pointer"
            >
              {isThai ? 'ยกเลิก' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-md cursor-pointer"
            >
              {isThai ? 'ยืนยันการเปิดรับส่งใหม่' : 'Confirm Reopen'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
