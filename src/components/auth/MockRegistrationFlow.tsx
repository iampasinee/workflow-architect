import React, { useMemo, useState } from 'react';
import { Camera, Check, ChevronLeft, CircleUserRound, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { resolveMockAuthAccount } from '../../services/authState';
import { classGroupsForCohort, isAcademicPathActive } from '../../services/academicState';
import type { FaceEnrollmentStatus, MockAuthUser } from '../../types/auth';
import { calculateYearLevelFromAdmissionYear, getAdmissionCode, getAdmissionYearOptions, useAcademicYear } from '../../utils/academicYear';
import { AuthDomainNotice } from './AuthDomainNotice';
import { MockGoogleAccountSelector } from './MockGoogleAccountSelector';

interface MockRegistrationFlowProps {
  onBack: () => void;
  onGoLogin: (email?: string) => void;
}

interface RegistrationInfo {
  code: string;
  firstName: string;
  lastName: string;
  majorId: string;
  admissionYear: number;
  classGroupId: string;
  facultyId: string;
  departmentId: string;
}

const emptyInfo: RegistrationInfo = {
  code: '',
  firstName: '',
  lastName: '',
  majorId: '',
  admissionYear: 0,
  classGroupId: '',
  facultyId: '',
  departmentId: '',
};

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500';
const secondaryButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600';
const primaryButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40';

const splitName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/);
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') };
};

export const MockRegistrationFlow: React.FC<MockRegistrationFlowProps> = ({ onBack, onGoLogin }) => {
  const {
    mockAuthUsers,
    completeMockRegistration,
    academicState,
    students,
    teachers,
    admins,
    updateStudent,
    updateTeacher,
    updateAdmin,
  } = useApp();
  const currentAcademicYear = useAcademicYear();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [target, setTarget] = useState<MockAuthUser | null>(null);
  const [info, setInfo] = useState<RegistrationInfo>(emptyInfo);
  const [faceStatus, setFaceStatus] = useState<FaceEnrollmentStatus>('not_started');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const activeFaculties = academicState.faculties.filter((item) => item.status === 'active');
  const availableDepartments = academicState.departments.filter((item) => item.facultyId === info.facultyId && item.status === 'active');
  const availableMajors = academicState.majors.filter((item) => item.status === 'active' && isAcademicPathActive(academicState, 'majors', item.id));
  const availableGroups = info.majorId && info.admissionYear
    ? classGroupsForCohort(academicState, info.majorId, info.admissionYear, true)
    : [];
  const selectedMajor = academicState.majors.find((item) => item.id === info.majorId);
  const selectedDepartment = academicState.departments.find((item) => item.id === selectedMajor?.departmentId);
  const selectedFaculty = academicState.faculties.find((item) => item.id === selectedDepartment?.facultyId);
  const selectedGroup = academicState.classGroups.find((item) => item.id === info.classGroupId);
  const yearLevel = info.admissionYear
    ? calculateYearLevelFromAdmissionYear(info.admissionYear, currentAcademicYear)
    : null;
  const admissionYears = useMemo(() => getAdmissionYearOptions(currentAcademicYear).slice(0, 12), [currentAcademicYear]);

  const initializeInfo = (user: MockAuthUser) => {
    if (user.role === 'student') {
      const student = students.find((item) => item.id === user.subjectId);
      const names = splitName(student?.fullName || '');
      setInfo({
        ...emptyInfo,
        code: student?.studentCode || user.email.split('@')[0],
        firstName: student?.firstName || names.firstName,
        lastName: student?.lastName || names.lastName,
        majorId: student?.majorId || '',
        admissionYear: student?.admissionYear || 0,
        classGroupId: student?.classGroupId || '',
      });
    } else if (user.role === 'teacher') {
      const teacher = teachers.find((item) => item.id === user.subjectId);
      const names = splitName(teacher?.fullName || '');
      setInfo({
        ...emptyInfo,
        code: teacher?.teacherCode || '',
        firstName: names.firstName,
        lastName: names.lastName,
        facultyId: teacher?.facultyId || '',
        departmentId: teacher?.departmentId || '',
      });
    } else {
      const admin = admins.find((item) => item.id === user.subjectId);
      const names = splitName(admin?.fullName || '');
      setInfo({ ...emptyInfo, code: admin?.adminCode || '', firstName: names.firstName, lastName: names.lastName });
    }
  };

  const selectRegistrationAccount = () => {
    setError('');
    const resolution = resolveMockAuthAccount(selectedEmail, mockAuthUsers);
    if (resolution.error || !resolution.user) {
      setError(resolution.error || 'ไม่สามารถตรวจสอบบัญชีได้');
      return;
    }
    if (resolution.user.registered) {
      setTarget(resolution.user);
      setError('บัญชีนี้ลงทะเบียนในระบบแล้ว');
      return;
    }
    setTarget(resolution.user);
    initializeInfo(resolution.user);
    setFaceStatus('not_started');
    setStep(2);
  };

  const validateInfo = () => {
    if (!target) return 'กรุณาเลือกบัญชี';
    if (!info.code.trim() || !info.firstName.trim() || !info.lastName.trim()) return 'กรุณากรอกข้อมูลผู้ใช้ให้ครบถ้วน';
    if (target.role === 'student') {
      if (!info.majorId) return 'กรุณาเลือกสาขาวิชา';
      if (!info.admissionYear || !yearLevel?.isValid) return 'กรุณาเลือกปีเข้าที่ถูกต้อง';
      if (info.classGroupId && !availableGroups.some((group) => group.id === info.classGroupId)) return 'กลุ่มเรียนไม่ตรงกับสาขาวิชาและปีเข้า';
    }
    if (target.role === 'teacher') {
      if (!info.facultyId) return 'กรุณาเลือกคณะ';
      if (!info.departmentId || !availableDepartments.some((item) => item.id === info.departmentId)) return 'กรุณาเลือกภาควิชาให้ตรงกับคณะ';
    }
    if (target.role === 'admin' && !target.adminProvisioned) return 'บัญชีผู้ดูแลระบบต้องได้รับการกำหนดสิทธิ์จากระบบ';
    return '';
  };

  const continueFromInfo = () => {
    const validationError = validateInfo();
    setError(validationError);
    if (!validationError) setStep(3);
  };

  const continueFromFace = () => {
    if (faceStatus !== 'verified_mock') {
      setError('กรุณาลงทะเบียนใบหน้าก่อนดำเนินการต่อ');
      return;
    }
    setError('');
    setStep(4);
  };

  const confirmRegistration = () => {
    if (!target || faceStatus !== 'verified_mock') {
      setError('กรุณาลงทะเบียนใบหน้าก่อนดำเนินการต่อ');
      return;
    }
    const fullName = `${info.firstName.trim()} ${info.lastName.trim()}`.trim();
    let profileSaved = true;
    if (target.role === 'student') {
      profileSaved = updateStudent(target.subjectId, {
        email: target.email,
        studentCode: info.code.trim(),
        fullName,
        firstName: info.firstName.trim(),
        lastName: info.lastName.trim(),
        majorId: info.majorId,
        admissionYear: info.admissionYear,
        classGroupId: info.classGroupId || undefined,
        faceReferenceStatus: 'available',
        isFirstTime: false,
      });
    } else if (target.role === 'teacher') {
      profileSaved = updateTeacher(target.subjectId, {
        email: target.email,
        teacherCode: info.code.trim(),
        fullName,
        facultyId: info.facultyId,
        departmentId: info.departmentId,
        icitProfileStatus: 'confirmed',
      });
    } else {
      updateAdmin(target.subjectId, { email: target.email, fullName });
    }
    if (!profileSaved) {
      setError('ไม่สามารถบันทึกข้อมูลผู้ใช้ได้ กรุณาตรวจสอบข้อมูลอีกครั้ง');
      return;
    }
    const result = completeMockRegistration(target.id, faceStatus);
    if (!result.success) {
      setError(result.error || 'ลงทะเบียนไม่สำเร็จ');
      return;
    }
    setError('');
    setSuccess(true);
  };

  if (success && target) {
    return <div className="mx-auto max-w-xl rounded-3xl border border-emerald-200 bg-white p-6 text-center shadow-xl sm:p-8">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Check className="h-8 w-8" /></div>
      <h1 className="mt-5 text-2xl font-bold text-slate-900">ลงทะเบียนสำเร็จ</h1>
      <p className="mt-2 break-all text-sm text-slate-600">บันทึกสถานะจำลองสำหรับ {target.email} เรียบร้อยแล้ว</p>
      <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">ขั้นตอนนี้เป็น frontend mockup ยังไม่มีการสร้าง session หรือยืนยันตัวตนกับ Google จริง</p>
      <button type="button" onClick={() => onGoLogin(target.email)} className={`${primaryButton} mt-6 w-full`}>เข้าสู่ระบบ</button>
    </div>;
  }

  const roleLabel = target?.role === 'student' ? 'นักศึกษา' : target?.role === 'teacher' ? 'อาจารย์' : 'ผู้ดูแลระบบ';
  const steps = ['บัญชี Google', 'ข้อมูลผู้ใช้', 'ใบหน้า', 'ยืนยัน'];

  return <div className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-5 shadow-xl sm:p-8">
    <div className="flex items-start gap-3">
      <button type="button" onClick={onBack} aria-label="กลับหน้าหลัก" className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600"><ChevronLeft className="h-5 w-5" /></button>
      <div><p className="text-xs font-bold text-blue-600">SECURELAB REGISTRATION MOCKUP</p><h1 className="mt-1 text-2xl font-bold text-slate-900">ลงทะเบียนใช้งาน SecureLab</h1><p className="mt-1 text-sm text-slate-500">ยืนยันบัญชี ตรวจสอบข้อมูล และลงทะเบียนใบหน้าแบบจำลอง</p></div>
    </div>

    <nav aria-label="ขั้นตอนการลงทะเบียน" className="mt-6">
      <ol className="grid grid-cols-4 gap-1 sm:gap-3">
        {steps.map((label, index) => {
          const number = index + 1;
          const active = step === number;
          const complete = step > number;
          return <li key={label} aria-current={active ? 'step' : undefined} className="min-w-0 text-center">
            <div className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold ${complete ? 'border-emerald-500 bg-emerald-500 text-white' : active ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-400'}`}>{complete ? <Check className="h-4 w-4" /> : number}</div>
            <p className={`mt-1 truncate text-[10px] sm:text-xs ${active ? 'font-bold text-blue-700' : 'text-slate-500'}`}>{label}</p>
          </li>;
        })}
      </ol>
    </nav>

    <div className="mt-6 border-t border-slate-100 pt-6">
      {step === 1 && <div className="space-y-4">
        <AuthDomainNotice compact />
        <MockGoogleAccountSelector value={selectedEmail} onChange={(email) => { setSelectedEmail(email); setTarget(null); setError(''); }} onContinue={selectRegistrationAccount} actionLabel="ยืนยันบัญชี Google (จำลอง)" />
        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><p className="font-bold">{error}</p>{target?.registered && <button type="button" onClick={() => onGoLogin(target.email)} className="mt-2 font-bold underline">ไปหน้าเข้าสู่ระบบ</button>}</div>}
      </div>}

      {step === 2 && target && <div className="space-y-4">
        <div><h2 className="text-lg font-bold text-slate-900">ตรวจสอบข้อมูล{roleLabel}</h2><p className="mt-1 break-all text-xs text-slate-500">บัญชี: {target.email}</p></div>
        {target.role === 'admin' && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><div className="flex gap-2"><ShieldCheck className="h-5 w-5 shrink-0" /><div><p className="font-bold">บัญชีผู้ดูแลระบบต้องได้รับการกำหนดสิทธิ์จากระบบ</p><p className="mt-1 text-xs">บัญชีนี้เป็นบัญชี mock ที่กำหนดไว้ล่วงหน้า จึงสามารถดำเนินการต่อได้ ไม่มีตัวเลือกสมัครเป็นผู้ดูแลระบบทั่วไป</p></div></div></div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-700">อีเมล<input readOnly value={target.email} className={`${inputClass} mt-1 bg-slate-50`} /></label>
          <label className="text-xs font-semibold text-slate-700">{target.role === 'student' ? 'รหัสนักศึกษา' : target.role === 'teacher' ? 'รหัสบุคลากร/อาจารย์' : 'รหัสผู้ดูแลระบบ'}<input value={info.code} onChange={(event) => setInfo({ ...info, code: event.target.value })} className={`${inputClass} mt-1`} /></label>
          <label className="text-xs font-semibold text-slate-700">ชื่อ<input value={info.firstName} onChange={(event) => setInfo({ ...info, firstName: event.target.value })} className={`${inputClass} mt-1`} /></label>
          <label className="text-xs font-semibold text-slate-700">นามสกุล<input value={info.lastName} onChange={(event) => setInfo({ ...info, lastName: event.target.value })} className={`${inputClass} mt-1`} /></label>
        </div>

        {target.role === 'student' && <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <label htmlFor="registration-major" className="block text-xs font-semibold text-slate-700">สาขาวิชา<select id="registration-major" aria-label="สาขาวิชา" value={info.majorId} onChange={(event) => setInfo({ ...info, majorId: event.target.value, classGroupId: '' })} className={`${inputClass} mt-1`}><option value="">เลือกสาขาวิชา</option>{availableMajors.map((major) => <option key={major.id} value={major.id}>[{major.code}] {major.name}</option>)}</select></label>
          {selectedMajor && <p className="text-xs text-slate-500">{selectedFaculty?.name || '—'} → {selectedDepartment?.name || '—'}</p>}
          <div className="grid gap-4 sm:grid-cols-3">
            <label htmlFor="registration-admission-year" className="text-xs font-semibold text-slate-700">ปีเข้า<select id="registration-admission-year" aria-label="ปีเข้า" value={info.admissionYear || ''} onChange={(event) => setInfo({ ...info, admissionYear: Number(event.target.value), classGroupId: '' })} className={`${inputClass} mt-1`}><option value="">เลือกปีเข้า</option>{admissionYears.map((year) => <option key={year} value={year}>{year} (ปีเข้า {getAdmissionCode(year)})</option>)}</select></label>
            <label htmlFor="registration-year-level" className="text-xs font-semibold text-slate-700">ชั้นปี<input id="registration-year-level" aria-label="ชั้นปี" readOnly value={yearLevel?.formattedYearLevel || 'คำนวณอัตโนมัติ'} className={`${inputClass} mt-1 bg-slate-100`} /></label>
            <label htmlFor="registration-class-group" className="text-xs font-semibold text-slate-700">กลุ่มเรียน<select id="registration-class-group" aria-label="กลุ่มเรียน" disabled={!info.majorId || !info.admissionYear} value={info.classGroupId} onChange={(event) => setInfo({ ...info, classGroupId: event.target.value })} className={`${inputClass} mt-1`}><option value="">ยังไม่กำหนด</option>{availableGroups.map((group) => <option key={group.id} value={group.id}>{group.code}</option>)}</select></label>
          </div>
        </div>}

        {target.role === 'teacher' && <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
          <label htmlFor="registration-faculty" className="text-xs font-semibold text-slate-700">คณะ<select id="registration-faculty" aria-label="คณะ" value={info.facultyId} onChange={(event) => setInfo({ ...info, facultyId: event.target.value, departmentId: '' })} className={`${inputClass} mt-1`}><option value="">เลือกคณะ</option>{activeFaculties.map((faculty) => <option key={faculty.id} value={faculty.id}>{faculty.name}</option>)}</select></label>
          <label htmlFor="registration-department" className="text-xs font-semibold text-slate-700">ภาควิชา<select id="registration-department" aria-label="ภาควิชา" disabled={!info.facultyId} value={info.departmentId} onChange={(event) => setInfo({ ...info, departmentId: event.target.value })} className={`${inputClass} mt-1`}><option value="">เลือกภาควิชา</option>{availableDepartments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
        </div>}

        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap justify-between gap-2 border-t pt-4"><button type="button" onClick={() => { setError(''); setStep(1); }} className={secondaryButton}>ย้อนกลับ</button><button type="button" onClick={continueFromInfo} className={primaryButton}>ดำเนินการต่อ</button></div>
      </div>}

      {step === 3 && target && <div className="space-y-4">
        <div><h2 className="text-lg font-bold text-slate-900">ลงทะเบียนใบหน้า</h2><p className="mt-1 text-xs text-slate-500">ขั้นตอนบังคับสำหรับการลงทะเบียน Mockup นี้จะบันทึกเฉพาะสถานะ ไม่จัดเก็บภาพใบหน้า</p></div>
        <ul className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2"><li>• มองตรงไปที่กล้อง</li><li>• อยู่ในพื้นที่ที่มีแสงเพียงพอ</li><li>• ไม่สวมหน้ากาก</li><li>• จัดใบหน้าให้อยู่ในกรอบ</li></ul>
        <div className={`relative flex aspect-video max-h-80 items-center justify-center overflow-hidden rounded-2xl border-2 ${faceStatus === 'verified_mock' ? 'border-emerald-400 bg-emerald-50' : faceStatus === 'capturing' ? 'border-blue-400 bg-slate-900' : 'border-dashed border-slate-300 bg-slate-100'}`}>
          <div className={`flex h-40 w-32 items-center justify-center rounded-[45%] border-2 ${faceStatus === 'verified_mock' ? 'border-emerald-500 text-emerald-600' : faceStatus === 'capturing' ? 'animate-pulse border-blue-400 text-blue-300' : 'border-slate-300 text-slate-400'}`}><CircleUserRound className="h-16 w-16" /></div>
          <span className="absolute bottom-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-700">{faceStatus === 'verified_mock' ? 'บันทึกใบหน้าเรียบร้อย' : faceStatus === 'capturing' ? 'กล้องจำลองพร้อมถ่ายภาพ' : 'กรอบใบหน้า'}</span>
        </div>
        <div className="flex flex-wrap gap-2">{faceStatus === 'not_started' && <button type="button" onClick={() => { setFaceStatus('capturing'); setError(''); }} className={secondaryButton}><Camera className="h-4 w-4" />เริ่มกล้องจำลอง</button>}{faceStatus === 'capturing' && <button type="button" onClick={() => { setFaceStatus('verified_mock'); setError(''); }} className={primaryButton}><Camera className="h-4 w-4" />ถ่ายภาพใบหน้า (จำลอง)</button>}{faceStatus === 'verified_mock' && <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-700"><Check className="h-4 w-4" />ลงทะเบียนแล้ว</span>}</div>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap justify-between gap-2 border-t pt-4"><button type="button" onClick={() => { setError(''); setStep(2); }} className={secondaryButton}>ย้อนกลับ</button><button type="button" onClick={continueFromFace} className={primaryButton}>ดำเนินการต่อ</button></div>
      </div>}

      {step === 4 && target && <div className="space-y-4">
        <div><h2 className="text-lg font-bold text-slate-900">ยืนยันการลงทะเบียน</h2><p className="mt-1 text-xs text-slate-500">ตรวจสอบข้อมูลก่อนบันทึกสถานะจำลอง</p></div>
        <dl className="divide-y divide-slate-100 rounded-2xl border border-slate-200 px-4 text-sm">
          {[['บัญชี', target.email], ['ประเภทผู้ใช้', roleLabel], [target.role === 'student' ? 'รหัสนักศึกษา' : 'รหัสผู้ใช้', info.code], ['ชื่อ-นามสกุล', `${info.firstName} ${info.lastName}`], ...(target.role === 'student' ? [['สาขาวิชา', selectedMajor ? `[${selectedMajor.code}] ${selectedMajor.name}` : '—'], ['ปีเข้า', info.admissionYear ? `${info.admissionYear} (ปีเข้า ${getAdmissionCode(info.admissionYear)})` : '—'], ['ชั้นปี', yearLevel?.formattedYearLevel || '—'], ['กลุ่มเรียน', selectedGroup?.code || 'ยังไม่กำหนด']] : []), ['ใบหน้า', faceStatus === 'verified_mock' ? 'ลงทะเบียนแล้ว' : 'ยังไม่ลงทะเบียน']].map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2 py-3"><dt className="text-slate-500">{label}</dt><dd className="break-all text-right font-semibold text-slate-900">{value}</dd></div>)}
        </dl>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap justify-between gap-2 border-t pt-4"><button type="button" onClick={() => { setError(''); setStep(3); }} className={secondaryButton}>ย้อนกลับ</button><button type="button" onClick={confirmRegistration} disabled={faceStatus !== 'verified_mock'} className={primaryButton}>ยืนยันการลงทะเบียน</button></div>
      </div>}
    </div>

    <p className="mt-6 text-center text-xs text-slate-500">มีบัญชีแล้ว? <button type="button" onClick={() => onGoLogin(selectedEmail)} className="font-bold text-blue-700 hover:underline">เข้าสู่ระบบ</button></p>
  </div>;
};
