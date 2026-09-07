import React from 'react';
import { Check, GraduationCap, Info, KeyRound, Minus, Shield, UserCog } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface PermissionRow {
  th: string;
  en: string;
  student: boolean;
  teacher: boolean;
  admin: boolean;
}

const permissionRows: PermissionRow[] = [
  { th: 'เข้าสอบและส่งไฟล์คำตอบของตนเอง', en: 'Take exams and submit own answer files', student: true, teacher: false, admin: false },
  { th: 'ดูสถานะการส่งข้อสอบของตนเอง', en: 'View own submission status', student: true, teacher: false, admin: false },
  { th: 'จัดการรายวิชาและรอบการสอบ', en: 'Manage courses and exam sessions', student: false, teacher: true, admin: false },
  { th: 'จัดกลุ่มนักศึกษาและผังที่นั่งสอบ', en: 'Manage student groups and exam seating', student: false, teacher: true, admin: false },
  { th: 'ติดตามการสอบและตรวจไฟล์คำตอบ', en: 'Monitor exams and review submissions', student: false, teacher: true, admin: false },
  { th: 'จัดการบัญชีผู้ใช้งาน', en: 'Manage user accounts', student: false, teacher: false, admin: true },
  { th: 'จัดการห้องสอบและเครื่องคอมพิวเตอร์', en: 'Manage exam rooms and workstations', student: false, teacher: false, admin: true },
  { th: 'จัดการข้อมูลชีวมิติและความปลอดภัย', en: 'Manage biometrics and security controls', student: false, teacher: false, admin: true },
  { th: 'ตรวจสอบ Audit Log ของระบบ', en: 'Review system audit logs', student: false, teacher: false, admin: true },
];

export const RolePermissions: React.FC = () => {
  const { language } = useApp();
  const isThai = language === 'th';
  const roles = [
    {
      id: 'student',
      name: isThai ? 'นักศึกษา' : 'Student',
      description: isThai ? 'เข้าสอบและจัดการไฟล์คำตอบของตนเอง' : 'Takes exams and manages personal answer files.',
      icon: GraduationCap,
      colors: 'border-blue-200 bg-blue-50 text-blue-700',
    },
    {
      id: 'teacher',
      name: isThai ? 'อาจารย์' : 'Teacher',
      description: isThai ? 'จัดการข้อสอบ ผู้เข้าสอบ และการตรวจข้อสอบ' : 'Manages exams, examinees, and submitted answers.',
      icon: UserCog,
      colors: 'border-purple-200 bg-purple-50 text-purple-700',
    },
    {
      id: 'admin',
      name: isThai ? 'ผู้ดูแลระบบ' : 'Admin',
      description: isThai ? 'ดูแลผู้ใช้ โครงสร้างพื้นฐาน และความปลอดภัย' : 'Controls users, infrastructure, and system security.',
      icon: Shield,
      colors: 'border-red-200 bg-red-50 text-red-700',
    },
  ];

  const permissionIcon = (allowed: boolean) => allowed ? (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-blue-600" aria-label={isThai ? 'อนุญาต' : 'Allowed'}>
      <Check className="h-4 w-4" strokeWidth={2.5} />
    </span>
  ) : (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-400" aria-label={isThai ? 'ไม่อนุญาต' : 'Not allowed'}>
      <Minus className="h-4 w-4" />
    </span>
  );

  return (
    <div className="space-y-6 text-left">
      <header className="border-b border-gray-200 pb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
          {isThai ? 'การควบคุมสิทธิ์การเข้าถึง (A3)' : 'Access Control (A3)'}
        </span>
        <h1 className="mt-0.5 text-2xl font-bold text-gray-900">
          {isThai ? 'บทบาทและสิทธิ์การใช้งาน' : 'Roles & Permissions'}
        </h1>
        <p className="mt-1 text-xs text-gray-500">
          {isThai ? 'ตรวจสอบขอบเขตการเข้าถึงทรัพยากรของผู้ใช้งานแต่ละประเภท' : 'Review the system resources available to each predefined user type.'}
        </p>
      </header>

      <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
        <div>
          <div className="font-semibold">
            {isThai ? 'บทบาทและสิทธิ์ถูกกำหนดตามประเภทผู้ใช้งานของระบบ' : 'Roles and permissions are defined by the system user types.'}
          </div>
          <p className="mt-0.5 text-xs text-blue-700">
            {isThai ? 'หน้านี้เป็นข้อมูลแบบอ่านอย่างเดียว ไม่รองรับการสร้างหรือแก้ไขบทบาทเพิ่มเติม' : 'This page is read-only; custom roles cannot be created or edited.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {roles.map((role) => {
          const Icon = role.icon;
          return (
            <article key={role.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
              <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl border ${role.colors}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-gray-900">{role.name}</h2>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">{role.description}</p>
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600">
                <KeyRound className="h-3.5 w-3.5" />
                {isThai ? 'บทบาทมาตรฐานของระบบ' : 'System-defined role'}
              </div>
            </article>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-bold text-gray-900">
            {isThai ? 'ตารางเปรียบเทียบสิทธิ์' : 'Permission Matrix'}
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            {isThai ? 'แสดงสิทธิ์หลักตามทรัพยากรและขั้นตอนการทำงานปัจจุบัน' : 'Core capabilities across the current system resources and workflows.'}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
              <tr>
                <th className="px-6 py-3.5 font-semibold">{isThai ? 'ความสามารถของระบบ' : 'System capability'}</th>
                <th className="w-28 px-4 py-3.5 text-center font-semibold">Student</th>
                <th className="w-28 px-4 py-3.5 text-center font-semibold">Teacher</th>
                <th className="w-28 px-4 py-3.5 text-center font-semibold">Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {permissionRows.map((permission) => (
                <tr key={permission.en} className="hover:bg-gray-50/70">
                  <td className="px-6 py-3.5 font-medium text-gray-800">{isThai ? permission.th : permission.en}</td>
                  <td className="px-4 py-3.5 text-center">{permissionIcon(permission.student)}</td>
                  <td className="px-4 py-3.5 text-center">{permissionIcon(permission.teacher)}</td>
                  <td className="px-4 py-3.5 text-center">{permissionIcon(permission.admin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
