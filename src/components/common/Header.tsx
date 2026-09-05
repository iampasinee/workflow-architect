import React from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, LogOut, User, Bell, ChevronRight, Laptop, Languages } from 'lucide-react';
import { Badge } from './Badge';

export const Header: React.FC = () => {
  const {
    role,
    setRole,
    currentStudent,
    currentTeacher,
    currentAdmin,
    violations,
    setActiveTeacherRoute,
    setActiveAdminRoute,
    language,
    toggleLanguage,
    setLanguage,
  } = useApp();

  const isThai = language === 'th';
  const unacknowledgedViolations = violations.filter((v) => !v.acknowledged);

  const currentUserDisplay = () => {
    if (role === 'admin') {
      return {
        name: currentAdmin?.fullName || (isThai ? 'ผู้ดูแลระบบ' : 'Administrator'),
        email: currentAdmin?.email || 'admin@icit.university.ac.th',
        roleLabel: isThai ? 'ผู้ดูแลระบบส่วนกลาง (ICIT)' : 'System Administrator',
        badge: isThai ? 'ผู้ดูแลระบบ' : 'Admin',
      };
    }
    if (role === 'teacher') {
      return {
        name: currentTeacher?.fullName || (isThai ? 'อาจารย์ผู้คุมสอบ' : 'Teacher'),
        email: currentTeacher?.email || 'teacher@icit.university.ac.th',
        roleLabel: currentTeacher?.faculty || (isThai ? 'คณะวิศวกรรมศาสตร์' : 'Faculty of Engineering'),
        badge: isThai ? 'อาจารย์ผู้คุมสอบ' : 'Teacher',
      };
    }
    return {
      name: currentStudent?.fullName || (isThai ? 'นักศึกษา' : 'Student'),
      email: currentStudent?.email || 'student@icit.university.ac.th',
      roleLabel: currentStudent
        ? `${currentStudent.studentCode} • ${isThai ? `ชั้นปีที่ ${currentStudent.year}` : `Year ${currentStudent.year}`}`
        : (isThai ? 'เข้าสู่ระบบแล้ว' : 'Signed In'),
      badge: isThai ? 'ผู้เข้าสอบ' : 'Examinee',
    };
  };

  const user = currentUserDisplay();

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Brand & Context */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 tracking-tight leading-none text-base">
                SecureLab
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-100">
                {isThai ? 'ระบบการสอบ' : 'PORTAL'}
              </span>
            </div>
            <span className="text-[11px] text-gray-400 font-medium leading-none">
              {isThai ? 'ระบบจัดการการสอบแล็บคอมพิวเตอร์' : 'Lab Exam & Integrity System'}
            </span>
          </div>
        </div>

        <div className="hidden md:flex items-center text-xs text-gray-400 gap-1 pl-4 border-l border-gray-200">
          <span>{isThai ? 'เกตเวย์ยืนยันตัวตน ICIT' : 'ICIT Authentication Gateway'}</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <Badge variant="success" size="sm">
            {isThai ? 'เครือข่ายแล็บ LAN ปลอดภัย' : 'Protected LAN'}
          </Badge>
        </div>
      </div>

      {/* Right User & Actions */}
      <div className="flex items-center gap-3">
        {/* Language Switcher */}
        <div className="flex items-center bg-gray-100 rounded-xl p-0.5 border border-gray-200 text-xs font-medium">
          <button
            onClick={() => setLanguage('th')}
            title="เปลี่ยนเป็นภาษาไทย"
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
              isThai
                ? 'bg-white text-blue-700 font-semibold shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>🇹🇭</span>
            <span>ไทย</span>
          </button>
          <button
            onClick={() => setLanguage('en')}
            title="Switch to English"
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
              !isThai
                ? 'bg-white text-blue-700 font-semibold shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>🇬🇧</span>
            <span>EN</span>
          </button>
        </div>

        {/* Violation alert counter for teacher */}
        {role === 'teacher' && (
          <button
            onClick={() => setActiveTeacherRoute('T5')}
            className={`relative p-2 rounded-xl border transition-colors flex items-center gap-2 text-xs font-medium ${
              unacknowledgedViolations.length > 0
                ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <Bell className={`w-4 h-4 ${unacknowledgedViolations.length > 0 ? 'text-red-600 animate-bounce' : ''}`} />
            <span className="hidden sm:inline">
              {isThai ? 'แจ้งเตือนผิดปกติ' : 'Active Alerts'}
            </span>
            {unacknowledgedViolations.length > 0 && (
              <span className="bg-red-600 text-white rounded-full px-1.5 py-0.2 text-[10px] font-bold">
                {unacknowledgedViolations.length}
              </span>
            )}
          </button>
        )}

        {/* User Card */}
        <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-gray-900 leading-tight">
              {user.name}
            </div>
            <div className="text-[11px] text-gray-500 font-medium">
              {user.email}
            </div>
          </div>

          <div className="w-9 h-9 rounded-full bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
            {user.name.charAt(0)}
          </div>

          <button
            onClick={() => setRole(null)}
            title={isThai ? 'สลับผู้ใช้ / ออกจากระบบ' : 'Switch User / Sign out to SSO Landing'}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
