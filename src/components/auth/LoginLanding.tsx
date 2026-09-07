import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  GraduationCap,
  KeyRound,
  ArrowRight,
  Sparkles,
  Lock,
  Building,
  CheckCircle2,
  Users,
  Eye,
  EyeOff
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { getAdminRouteFromHash } from '../../utils/adminRoutes';

export const LoginLanding: React.FC = () => {
  const {
    setRole,
    setActiveAdminRoute,
    setActiveTeacherRoute,
    setActiveStudentStep,
    setCurrentStudent,
    setCurrentTeacher,
    setCurrentAdmin,
    students,
    examSessions,
    submissions,
    setCurrentExamId,
    teachers,
    admins,
    showToast,
    language
  } = useApp();

  const isThai = language === 'th';
  const activeExam =
    examSessions.find((exam) => exam.status === 'in_progress') || examSessions[0];
  const defaultUploadStudent =
    students.find((student) => {
      if (student.accountStatus !== 'active') return false;
      const submission = submissions.find(
        (item) => item.examId === activeExam?.id && item.studentId === student.id
      );
      return submission?.status !== 'submitted' && submission?.status !== 'late';
    }) || students.find((student) => student.accountStatus === 'active') || students[0];
  const [showIcitModal, setShowIcitModal] = useState(false);
  const [icitUsername, setIcitUsername] = useState(defaultUploadStudent?.studentCode || '');
  const [icitPassword, setIcitPassword] = useState('••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleIcitLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setShowIcitModal(false);

      // Match username or default to student
      const cleanUsername = (icitUsername || '').trim();
      if (cleanUsername.startsWith('A') || cleanUsername.toLowerCase().includes('admin')) {
        setRole('admin');
        if (admins.length > 0) setCurrentAdmin(admins[0]);
        setActiveAdminRoute(getAdminRouteFromHash());
        const adminName = admins[0]?.fullName || 'Admin';
        showToast(
          isThai ? 'เข้าสู่ระบบสำเร็จผ่าน ICIT SSO' : 'ICIT SSO Authenticated',
          isThai ? `ยินดีต้อนรับผู้ดูแลระบบ ${adminName}` : `Welcome Administrator ${adminName}`,
          'success'
        );
      } else if (cleanUsername.startsWith('T') || cleanUsername.toLowerCase().includes('teacher')) {
        setRole('teacher');
        if (teachers.length > 0) setCurrentTeacher(teachers[0]);
        setActiveTeacherRoute('T1');
        const teacherName = teachers[0]?.fullName || 'Teacher';
        showToast(
          isThai ? 'เข้าสู่ระบบสำเร็จผ่าน ICIT SSO' : 'ICIT SSO Authenticated',
          isThai ? `ยินดีต้อนรับอาจารย์ ${teacherName}` : `Welcome ${teacherName}`,
          'success'
        );
      } else {
        // Find student or default to first student
        const matched = students.find(s => s.studentCode === cleanUsername) || defaultUploadStudent;
        setRole('student');
        if (matched) setCurrentStudent(matched);
        if (activeExam) setCurrentExamId(activeExam.id);
        setActiveStudentStep('ST1');
        const studentName = matched?.fullName || 'Student';
        showToast(
          isThai ? 'เข้าสู่ระบบสำเร็จผ่าน ICIT SSO' : 'ICIT SSO Authenticated',
          isThai ? `ยินดีต้อนรับนักศึกษา ${studentName}` : `Welcome ${studentName}`,
          'success'
        );
      }
    }, 600);
  };

  const loginAsPersona = (type: 'admin' | 'teacher_returning' | 'teacher_new' | 'student_returning' | 'student_first_time') => {
    switch (type) {
      case 'admin':
        setRole('admin');
        setCurrentAdmin(admins[0]);
        setActiveAdminRoute(getAdminRouteFromHash());
        showToast(isThai ? 'เข้าสู่ระบบในฐานะผู้ดูแลระบบ' : 'Signed in as Admin', admins[0].fullName, 'info');
        break;
      case 'teacher_returning':
        setRole('teacher');
        setCurrentTeacher(teachers[0]);
        setActiveTeacherRoute('T1');
        showToast(isThai ? 'เข้าสู่ระบบในฐานะอาจารย์คุมสอบ' : 'Signed in as Returning Teacher', teachers[0].fullName, 'info');
        break;
      case 'teacher_new':
        setRole('teacher');
        setCurrentTeacher(teachers[1]);
        setActiveTeacherRoute('T0'); // First time onboarding screen
        showToast(
          isThai ? 'เข้าสู่ระบบในฐานะอาจารย์ใหม่' : 'Signed in as First-Time Teacher',
          isThai ? 'กรุณายืนยันข้อมูลโปรไฟล์ ICIT (ขั้นตอน T0)' : 'Please verify your ICIT profile (T0)',
          'info'
        );
        break;
      case 'student_returning':
        setRole('student');
        setCurrentStudent(defaultUploadStudent);
        if (activeExam) setCurrentExamId(activeExam.id);
        setActiveStudentStep('ST1');
        showToast(isThai ? 'เข้าสู่ระบบในฐานะนักศึกษาผู้เข้าสอบ' : 'Signed in as Returning Student', defaultUploadStudent?.fullName, 'info');
        break;
      case 'student_first_time':
        const firstTimeStd = students.find(s => s.isFirstTime) || students[3];
        setRole('student');
        setCurrentStudent(firstTimeStd);
        if (activeExam) setCurrentExamId(activeExam.id);
        setActiveStudentStep('ST1');
        showToast(
          isThai ? 'เข้าสู่ระบบในฐานะนักศึกษาใหม่' : 'Signed in as First-Time Student',
          isThai ? 'นำทางไปยังการตั้งรหัสผ่าน ST2A และลงทะเบียนใบหน้า ST2B' : 'Directing to First-Time Setup ST2A/ST2B',
          'info'
        );
        break;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-gray-900 relative overflow-hidden">
      {/* Subtle background tech grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e140_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e140_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Top Bar */}
      <header className="px-6 py-6 max-w-7xl mx-auto w-full flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl tracking-tight text-gray-900">SecureLab</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {isThai ? 'เวอร์ชัน 1.3' : 'v1.3 PRD'}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {isThai ? 'ระบบส่งไฟล์คำตอบข้อสอบและป้องกันการทุจริตห้องแล็บ' : 'Exam File Submission & Anti-Cheating Portal'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-600 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-xs">
            <Building className="w-3.5 h-3.5 text-blue-600" />
            <span>{isThai ? 'เครือข่ายห้องปฏิบัติการคอมพิวเตอร์แบบบูรณาการ' : 'Integrated Computer Laboratory Network'}</span>
          </div>
        </div>
      </header>

      {/* Main Hero & Sign-in Box */}
      <main className="max-w-4xl mx-auto w-full px-6 py-12 flex flex-col items-center text-center z-10">
        <Badge variant="purple" className="mb-4">
          <Sparkles className="w-3.5 h-3.5" /> {isThai ? 'ระบบการสอบในห้องปฏิบัติการคอมพิวเตอร์ระดับสถาบัน' : 'Institutional Computer Laboratory Examination System'}
        </Badge>

        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-gray-900 max-w-2xl leading-tight">
          {isThai
            ? 'ระบบส่งข้อสอบปลอดภัย พร้อมตรวจสอบความถูกต้องแบบเรียลไทม์'
            : 'Reliable Exam Submissions with Real-Time Integrity Verification'}
        </h1>

        <p className="mt-4 text-base sm:text-lg text-gray-600 max-w-xl leading-relaxed">
          {isThai
            ? 'จัดการผังที่นั่งสอบอัตโนมัติ ยืนยันตัวตนด้วยข้อมูลชีวมิติใบหน้า ซิงโครไนซ์เวลานับถอยหลัง ตรวจสอบความสมบูรณ์ของไฟล์คำตอบ (.zip/.py) และตรวจจับพฤติกรรมผิดปกติทันที'
            : 'Automating assigned seating, biometric facial identity matching, countdown synchronization, valid answer archive verification, and active cheating prevention.'}
        </p>

        {/* Primary Action Button: Sign in with ICIT Account */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={() => setShowIcitModal(true)}
            className="px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base shadow-xl shadow-blue-600/20 transition-all flex items-center gap-3 hover:scale-102 cursor-pointer"
          >
            <KeyRound className="w-5 h-5 text-blue-200" />
            <span>{isThai ? 'เข้าสู่ระบบด้วยบัญชี ICIT Account' : 'Sign in with ICIT Account'}</span>
            <ArrowRight className="w-4 h-4 text-blue-200" />
          </button>
        </div>

        {/* Quick Persona Access for Testing Workflows */}
        <div className="mt-14 w-full bg-white border border-gray-200 rounded-2xl p-6 text-left shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-gray-900">
                {isThai ? 'จำลองบทบาทและเส้นทางการใช้งาน (Workflow Demo)' : 'Instant Role & Workflow Demonstration'}
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {isThai ? 'คลิกเลือกบทบาทเพื่อทดสอบโฟลว์ตามข้อกำหนด PRD' : 'Click any role to test its specific PRD journey'}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Student 1: Returning */}
            <button
              onClick={() => loginAsPersona('student_returning')}
              className="p-3.5 rounded-xl bg-gray-50 hover:bg-blue-50/70 border border-gray-200 hover:border-blue-300 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {isThai ? 'นักศึกษา (เคยลงทะเบียนแล้ว)' : 'Student (Returning)'}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">6410123456</span>
              </div>
              <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-600">นายสมชาย ใจดี (Somchai)</div>
              <div className="text-xs text-gray-500 mt-1">
                {isThai ? 'ตรงสู่ ยืนยันใบหน้า ST2C → รับทราบระเบียบ → จับเวลาถอยหลัง → อัปโหลดไฟล์' : 'Direct to Face Verification ST2C → Exam Info → Focus Countdown → File Upload'}
              </div>
            </button>

            {/* Student 2: First-time */}
            <button
              onClick={() => loginAsPersona('student_first_time')}
              className="p-3.5 rounded-xl bg-gray-50 hover:bg-blue-50/70 border border-gray-200 hover:border-blue-300 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  {isThai ? 'นักศึกษาใหม่ (เข้าสอบครั้งแรก)' : 'Student (First-Time)'}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">6410123459</span>
              </div>
              <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-600">นายณัฐวุฒิ ประเสริฐ (Nattawut)</div>
              <div className="text-xs text-gray-500 mt-1">
                {isThai ? 'ทดสอบ ST2A ตั้งรหัสผ่านสอบ → ST2B ลงทะเบียนภาพใบหน้า → เข้าห้องสอบ' : 'Tests ST2A Password Setup → ST2B Facial Enrollment → Exam Entry'}
              </div>
            </button>

            {/* Teacher 1: Returning */}
            <button
              onClick={() => loginAsPersona('teacher_returning')}
              className="p-3.5 rounded-xl bg-gray-50 hover:bg-blue-50/70 border border-gray-200 hover:border-blue-300 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  {isThai ? 'อาจารย์คุมสอบ (ยืนยันสิทธิ์แล้ว)' : 'Teacher (Confirmed)'}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">T00123</span>
              </div>
              <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-600">ผศ.ดร. อนุชา วิชัยดี (Dr. Anucha)</div>
              <div className="text-xs text-gray-500 mt-1">
                {isThai ? 'T1 แดชบอร์ด → ติดตามสอบสด T5 → ขยายเวลาสอบ → จัดผังที่นั่ง' : 'T1 Dashboard → Live Monitoring T5 → Time Control → Seat Mapping'}
              </div>
            </button>

            {/* Teacher 2: First-Time T0 */}
            <button
              onClick={() => loginAsPersona('teacher_new')}
              className="p-3.5 rounded-xl bg-gray-50 hover:bg-blue-50/70 border border-gray-200 hover:border-blue-300 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                  {isThai ? 'อาจารย์ใหม่ (ทดสอบ T0 Onboarding)' : 'Teacher (First-Time T0)'}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">T00124</span>
              </div>
              <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-600">ดร. กาญจนา พลอย (Dr. Kanchana)</div>
              <div className="text-xs text-gray-500 mt-1">
                {isThai ? 'ทดสอบหน้าจอ T0: ตรวจสอบและยืนยันข้อมูลอาจารย์ผู้คุมสอบ ICIT' : 'Tests Screen T0: Teacher Onboarding & ICIT Profile Confirmation'}
              </div>
            </button>

            {/* Admin */}
            <button
              onClick={() => loginAsPersona('admin')}
              className="p-3.5 rounded-xl bg-gray-50 hover:bg-blue-50/70 border border-gray-200 hover:border-blue-300 text-left transition-all group sm:col-span-2 lg:col-span-2 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                  {isThai ? 'ผู้ดูแลระบบส่วนกลาง (ICIT System Admin)' : 'System Administrator'}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">A0001</span>
              </div>
              <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-600">ปิยดา ดูแลระบบ (Piyada Dulaerabob)</div>
              <div className="text-xs text-gray-500 mt-1">
                {isThai ? 'ชุดผู้ดูแลระบบเต็มรูปแบบ: A1 แดชบอร์ด → จัดการผู้ใช้ → จัดการห้องและเครื่องสอบ → ผูก Static IP/MAC A12 → รายวิชา' : 'Full Admin suite: A1 Dashboard → User Management → Rooms & Seating Maps → Static IP/MAC Device Binding A12 → Courses'}
              </div>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-xs text-gray-500 border-t border-gray-200 bg-white/60">
        {isThai
          ? 'SecureLab Exam Portal • กรอบการทำงานด้านความปลอดภัยและยืนยันตัวตนห้องปฏิบัติการคอมพิวเตอร์ • ออกแบบตามข้อกำหนด PRD เวอร์ชัน 1.3'
          : 'SecureLab Examination Portal • Computer Laboratory Identity & Integrity Framework • Designed per PRD Specification v1.3'}
      </footer>

      {/* ICIT SSO Login Dialog Modal */}
      {showIcitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white text-gray-900 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">
                    {isThai ? 'ระบบยืนยันตัวตน ICIT Single Sign-On' : 'ICIT Single Sign-On'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {isThai ? 'เกตเวย์รับรองความถูกต้องส่วนกลางมหาวิทยาลัย' : 'Central University Authentication'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowIcitModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 text-sm font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleIcitLoginSubmit} className="mt-4 space-y-4 text-left">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {isThai ? 'ชื่อผู้ใช้บัญชี ICIT / รหัสนักศึกษา / รหัสอาจารย์' : 'ICIT Account Username / Student Code'}
                </label>
                <input
                  type="text"
                  required
                  value={icitUsername}
                  onChange={(e) => setIcitUsername(e.target.value)}
                  placeholder={isThai ? 'เช่น 6410123456 หรือ T00123' : 'e.g. 6410123456 or T00123'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-[11px] text-gray-400 mt-1 block">
                  {isThai
                    ? 'กรอกรหัสนักศึกษา (6410123456), รหัสอาจารย์ (T00123) หรือรหัสผู้ดูแล (A0001)'
                    : 'Enter student ID (6410123456), teacher ID (T00123), or admin ID (A0001)'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {isThai ? 'รหัสผ่าน (Password)' : 'Password'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={icitPassword}
                    onChange={(e) => setIcitPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <span>{isThai ? 'กำลังยืนยันความถูกต้องกับ ICIT...' : 'Authenticating with ICIT...'}</span>
                  ) : (
                    <>
                      <span>{isThai ? 'ยืนยันตัวตนและเข้าสู่ระบบ' : 'Authorize & Continue'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
