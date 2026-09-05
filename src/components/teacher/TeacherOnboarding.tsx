import React from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, UserCheck, CheckCircle2, ArrowRight, Building2, Mail, Hash } from 'lucide-react';
import { Badge } from '../common/Badge';

export const TeacherOnboarding: React.FC = () => {
  const { currentTeacher, confirmTeacherProfile, setActiveTeacherRoute, language } = useApp();
  const isThai = language === 'th';

  const handleConfirm = () => {
    if (currentTeacher) {
      confirmTeacherProfile(currentTeacher.id);
      setActiveTeacherRoute('T1');
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-12 bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-left">
      <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-5">
        <UserCheck className="w-6 h-6" />
      </div>

      <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
        {isThai ? 'การยืนยันตัวตน ICIT ครั้งแรก (T0)' : 'First-Time ICIT Authentication (T0)'}
      </span>
      <h1 className="text-2xl font-bold text-gray-900 mt-1 mb-2">
        {isThai ? 'ตรวจสอบและยืนยันข้อมูลอาจารย์ผู้สอน' : 'Instructor Profile Verification'}
      </h1>
      <p className="text-sm text-gray-500 mb-6 leading-relaxed">
        {isThai
          ? 'ข้อมูลสิทธิ์ของท่านได้รับการเชื่อมโยงจากระบบทะเบียนกลาง ICIT มหาวิทยาลัย โปรดตรวจสอบและยืนยันข้อมูลอาจารย์เพื่อเริ่มต้นใช้งานศูนย์ควบคุมการสอบ'
          : 'Your institutional credentials have been synchronized from the central university ICIT directory. Please review and confirm your academic instructor profile to initialize your examination proctor workspace.'}
      </p>

      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 space-y-4 mb-6">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <span className="text-xs font-semibold text-gray-500">
            {isThai ? 'ข้อมูลอัตลักษณ์สถาบัน' : 'Institutional Identity'}
          </span>
          <Badge variant="purple">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isThai ? 'บทบาท: อาจารย์ผู้สอน' : 'Role: Teacher'}</span>
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-gray-500 mb-1 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>{isThai ? 'ชื่อ-นามสกุล (ยืนยันโดย ICIT):' : 'Full Name (ICIT Verified):'}</span>
            </span>
            <span className="font-semibold text-gray-900 text-sm">{currentTeacher?.fullName}</span>
          </div>

          <div>
            <span className="text-gray-500 mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-600" />
              <span>{isThai ? 'อีเมลมหาวิทยาลัย:' : 'University Email:'}</span>
            </span>
            <span className="font-semibold text-gray-900 text-sm font-mono">{currentTeacher?.email}</span>
          </div>

          <div>
            <span className="text-gray-500 mb-1 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-blue-600" />
              <span>{isThai ? 'รหัสอาจารย์ / บุคลากร:' : 'Teacher ID / Code:'}</span>
            </span>
            <span className="font-semibold text-gray-900 text-sm font-mono">{currentTeacher?.teacherCode}</span>
          </div>

          <div>
            <span className="text-gray-500 mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>{isThai ? 'คณะ & ภาควิชา:' : 'Faculty & Department:'}</span>
            </span>
            <span className="font-semibold text-gray-900 text-sm">
              {currentTeacher?.faculty} — {currentTeacher?.department}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-3 mb-6 text-xs text-blue-900">
        <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <strong className="block font-semibold mb-0.5">
            {isThai ? 'ความสมบูรณ์ของโปรไฟล์: พร้อมใช้งาน 100%' : 'Profile Completeness: 100% Ready'}
          </strong>
          {isThai
            ? 'บัญชีมหาวิทยาลัยของท่านได้รับสิทธิ์คุมสอบ การจัดผังที่นั่ง และดาวน์โหลดคลังไฟล์คำตอบข้อสอบเรียบร้อยแล้ว'
            : 'Your institutional account holds valid proctor privileges for laboratory examination monitoring, seating configuration, and file repository downloads.'}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
        <button
          onClick={handleConfirm}
          className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
        >
          <span>{isThai ? 'ยืนยันข้อมูล & เข้าสู่แดชบอร์ดอาจารย์' : 'Confirm Profile & Open Teacher Dashboard'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
