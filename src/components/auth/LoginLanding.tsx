import React, { useState } from 'react';
import { ArrowRight, FlaskConical, KeyRound, ShieldCheck, Sparkles, UserPlus, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { resolveMockAuthAccount } from '../../services/authState';
import type { MockAuthUser } from '../../types/auth';
import { getAdminRouteFromHash } from '../../utils/adminRoutes';
import { AuthDomainNotice } from './AuthDomainNotice';
import { MockGoogleAccountSelector } from './MockGoogleAccountSelector';
import { MockRegistrationFlow } from './MockRegistrationFlow';

type AuthView = 'landing' | 'login' | 'register';

const secondaryButton = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 shadow-xs hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';
const primaryButton = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';

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
    teachers,
    admins,
    examSessions,
    submissions,
    setCurrentExamId,
    mockAuthUsers,
    showToast,
  } = useApp();
  const [view, setView] = useState<AuthView>('landing');
  const [selectedEmail, setSelectedEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  const [unregisteredUser, setUnregisteredUser] = useState<MockAuthUser | null>(null);

  const activeExam = examSessions.find((exam) => exam.status === 'in_progress') || examSessions[0];
  const defaultUploadStudent = students.find((student) => {
    if (student.accountStatus !== 'active') return false;
    const submission = submissions.find((item) => item.examId === activeExam?.id && item.studentId === student.id);
    return submission?.status !== 'submitted' && submission?.status !== 'late';
  }) || students.find((student) => student.accountStatus === 'active') || students[0];

  const openLogin = (email = '') => {
    setSelectedEmail(email);
    setLoginError('');
    setUnregisteredUser(null);
    setView('login');
  };

  const enterRole = (account: MockAuthUser) => {
    if (account.role === 'student') {
      const student = students.find((item) => item.id === account.subjectId);
      if (!student || student.accountStatus !== 'active') {
        setLoginError('บัญชีนักศึกษาไม่พร้อมเข้าใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
        return;
      }
      setCurrentStudent(student);
      if (activeExam) setCurrentExamId(activeExam.id);
      setActiveStudentStep('ST1');
      setRole('student');
      showToast('เข้าสู่ระบบ Mockup สำเร็จ', `ยินดีต้อนรับ ${student.fullName}`, 'success');
      return;
    }
    if (account.role === 'teacher') {
      const teacher = teachers.find((item) => item.id === account.subjectId);
      if (!teacher || teacher.accountStatus !== 'active') {
        setLoginError('บัญชีอาจารย์ไม่พร้อมเข้าใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
        return;
      }
      setCurrentTeacher(teacher);
      setActiveTeacherRoute('T1');
      setRole('teacher');
      showToast('เข้าสู่ระบบ Mockup สำเร็จ', `ยินดีต้อนรับ ${teacher.fullName}`, 'success');
      return;
    }
    const admin = admins.find((item) => item.id === account.subjectId);
    if (!admin || admin.accountStatus !== 'active' || !account.adminProvisioned) {
      setLoginError('บัญชีผู้ดูแลระบบไม่ได้รับสิทธิ์จากระบบ');
      return;
    }
    setCurrentAdmin(admin);
    setActiveAdminRoute(getAdminRouteFromHash());
    setRole('admin');
    showToast('เข้าสู่ระบบ Mockup สำเร็จ', `ยินดีต้อนรับ ${admin.fullName}`, 'success');
  };

  const handleMockLogin = () => {
    setLoginError('');
    setUnregisteredUser(null);
    const resolution = resolveMockAuthAccount(selectedEmail, mockAuthUsers);
    if (resolution.error || !resolution.user) {
      setLoginError(resolution.domain === 'unsupported'
        ? 'ไม่สามารถเข้าใช้งานได้ กรุณาใช้บัญชีอีเมลของมหาวิทยาลัยเท่านั้น'
        : resolution.error || 'ไม่สามารถตรวจสอบบัญชีได้');
      return;
    }
    if (!resolution.user.registered) {
      setUnregisteredUser(resolution.user);
      setLoginError('ยังไม่พบการลงทะเบียนของบัญชีนี้');
      return;
    }
    enterRole(resolution.user);
  };

  const loginAsPersona = (type: 'admin' | 'teacher' | 'student_returning' | 'student_first_time') => {
    if (type === 'admin') {
      setRole('admin');
      setCurrentAdmin(admins[0]);
      setActiveAdminRoute(getAdminRouteFromHash());
      return;
    }
    if (type === 'teacher') {
      setRole('teacher');
      setCurrentTeacher(teachers[0]);
      setActiveTeacherRoute('T1');
      return;
    }
    const student = type === 'student_first_time'
      ? students.find((item) => item.isFirstTime) || students[3]
      : defaultUploadStudent;
    setRole('student');
    if (student) setCurrentStudent(student);
    if (activeExam) setCurrentExamId(activeExam.id);
    setActiveStudentStep('ST1');
  };

  if (view === 'register') {
    return <AuthShell><MockRegistrationFlow onBack={() => setView('landing')} onGoLogin={openLogin} /></AuthShell>;
  }

  if (view === 'login') {
    return <AuthShell>
      <div className="mx-auto w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-5 shadow-xl sm:p-8">
        <button type="button" onClick={() => setView('landing')} className="text-sm font-bold text-slate-600 hover:text-blue-700">← กลับหน้าหลัก</button>
        <div className="mt-4"><p className="text-xs font-bold text-blue-600">SECURELAB AUTHENTICATION MOCKUP</p><h1 className="mt-1 text-2xl font-bold text-slate-900">เข้าสู่ระบบ SecureLab</h1><p className="mt-2 text-sm text-slate-500">กรุณาใช้บัญชี Google ของมหาวิทยาลัย</p></div>
        <div className="mt-5"><AuthDomainNotice compact /></div>
        <div className="mt-4"><MockGoogleAccountSelector value={selectedEmail} onChange={(email) => { setSelectedEmail(email); setLoginError(''); setUnregisteredUser(null); }} onContinue={handleMockLogin} actionLabel="Sign in with Google (จำลอง)" /></div>
        {loginError && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><p className="font-bold">{loginError}</p><p className="mt-2 text-xs">นักศึกษา: @email.kmutnb.ac.th<br />อาจารย์และผู้ดูแลระบบ: @itm.kmutnb.ac.th</p>{unregisteredUser && <button type="button" onClick={() => setView('register')} className="mt-3 rounded-lg bg-red-700 px-3 py-2 text-xs font-bold text-white">ลงทะเบียน</button>}</div>}
        <p className="mt-6 text-center text-xs text-slate-500">ยังไม่มีบัญชี? <button type="button" onClick={() => setView('register')} className="font-bold text-blue-700 hover:underline">ลงทะเบียน</button></p>
      </div>
    </AuthShell>;
  }

  return <AuthShell>
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xl sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20"><ShieldCheck className="h-7 w-7" /></div>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700"><Sparkles className="h-3.5 w-3.5" />SecureLab Frontend Mockup</div>
        <h1 className="mx-auto mt-4 max-w-3xl text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">ระบบสแกนใบหน้าและติดตามการใช้ทรัพยากรคอมพิวเตอร์สำหรับการสอบในห้องปฏิบัติการ</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-500">เลือกเข้าสู่ระบบสำหรับบัญชีที่ลงทะเบียนแล้ว หรือลงทะเบียนบัญชีมหาวิทยาลัยพร้อมขั้นตอนใบหน้าแบบจำลอง</p>
        <div className="mx-auto mt-7 grid max-w-xl gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => openLogin()} className={primaryButton}><KeyRound className="h-5 w-5" />เข้าสู่ระบบ<ArrowRight className="h-4 w-4" /></button>
          <button type="button" onClick={() => setView('register')} className={secondaryButton}><UserPlus className="h-5 w-5" />ลงทะเบียน</button>
        </div>
        <div className="mx-auto mt-7 max-w-2xl text-left"><AuthDomainNotice /></div>
      </section>

      <section aria-label="Workflow Demo" className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white/80 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-blue-600" /><h2 className="text-sm font-bold text-slate-900">จำลองบทบาทและเส้นทางการใช้งาน (Workflow Demo)</h2></div><span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700"><FlaskConical className="h-3 w-3" />เครื่องมือสำหรับ Development</span></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <PersonaButton title="นักศึกษา (เคยลงทะเบียนแล้ว)" code="6410123456" name="นายสมชาย ใจดี (Somchai)" detail="ยืนยันใบหน้า → รับทราบระเบียบ → อัปโหลดไฟล์" onClick={() => loginAsPersona('student_returning')} />
          <PersonaButton title="นักศึกษาใหม่ (เข้าสอบครั้งแรก)" code="6410123459" name="นายณัฐวุฒิ ประเสริฐ (Nattawut)" detail="ตั้งรหัสผ่านสอบ → ลงทะเบียนภาพใบหน้า → เข้าห้องสอบ" onClick={() => loginAsPersona('student_first_time')} />
          <PersonaButton title="อาจารย์คุมสอบ (ยืนยันสิทธิ์แล้ว)" code="T00123" name="ผศ.ดร. อนุชา วิชัยดี" detail="แดชบอร์ด → ติดตามสอบสด → จัดผังที่นั่ง" onClick={() => loginAsPersona('teacher')} />
          <PersonaButton title="ผู้ดูแลระบบส่วนกลาง" code="A0001" name="ปิยดา ดูแลระบบ" detail="แดชบอร์ด → จัดการผู้ใช้ → ห้องสอบและเครื่อง" onClick={() => loginAsPersona('admin')} className="sm:col-span-2 lg:col-span-3" />
        </div>
      </section>
    </main>
  </AuthShell>;
};

const AuthShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="relative min-h-screen overflow-hidden bg-slate-50 text-left text-slate-900">
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#cbd5e130_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e130_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_60%,transparent_100%)]" />
    <header className="relative z-10 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur sm:px-6"><div className="mx-auto flex max-w-7xl items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white"><ShieldCheck className="h-6 w-6" /></div><div><p className="text-lg font-bold">SecureLab</p><p className="text-[11px] text-slate-500">ระบบจัดการการสอบในห้องปฏิบัติการ</p></div></div></header>
    <div className="relative z-[1] px-3 py-6 sm:px-6">{children}</div>
  </div>
);

interface PersonaButtonProps {
  title: string;
  code: string;
  name: string;
  detail: string;
  onClick: () => void;
  className?: string;
}

const PersonaButton: React.FC<PersonaButtonProps> = ({ title, code, name, detail, onClick, className = '' }) => (
  <button type="button" onClick={onClick} className={`rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600 ${className}`}>
    <div className="flex items-start justify-between gap-2"><span className="text-xs font-bold text-blue-700">{title}</span><span className="font-mono text-[10px] text-slate-500">{code}</span></div>
    <p className="mt-2 text-sm font-bold text-slate-900">{name}</p><p className="mt-1 text-xs text-slate-500">{detail}</p>
  </button>
);
