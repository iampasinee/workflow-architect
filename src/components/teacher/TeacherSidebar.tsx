import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Grid3X3,
  Activity,
  FolderArchive,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface TeacherSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const TeacherSidebar: React.FC<TeacherSidebarProps> = ({ collapsed, onToggle }) => {
  const { activeTeacherRoute, setActiveTeacherRoute, violations, language } = useApp();
  const isThai = language === 'th';

  const activeViolationsCount = violations.filter((v) => !v.acknowledged).length;

  const menuItems = [
    { id: 'T1', label: isThai ? 'แผงควบคุมหลัก' : 'Dashboard', icon: LayoutDashboard },
    { id: 'T2', label: isThai ? 'รายวิชา & เซสชันการสอบ' : 'Courses & Exam Sessions', icon: CalendarDays },
    { id: 'T3', label: isThai ? 'กลุ่มนักศึกษา / ตอนเรียน' : 'Student Groups', icon: Users },
    { id: 'T4', label: isThai ? 'จัดผังที่นั่งสอบ' : 'Seat Assignments', icon: Grid3X3 },
    {
      id: 'T5',
      label: isThai ? 'ติดตามการสอบสด (Live)' : 'Live Exam Monitoring',
      icon: Activity,
      badge: activeViolationsCount > 0 ? activeViolationsCount : undefined,
    },
    { id: 'T7', label: isThai ? 'คลังไฟล์คำตอบข้อสอบ' : 'Answer File Repository', icon: FolderArchive },
    { id: 'T9', label: isThai ? 'ข้อมูลอาจารย์ผู้สอน' : 'Teacher Profile', icon: UserCheck },
  ];

  return (
    <aside
      className={`bg-white border-r border-gray-200 transition-all duration-200 flex flex-col justify-between shrink-0 z-20 ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      <div className="py-4">
        {/* Module Title */}
        <div className={`px-4 mb-4 flex items-center justify-between ${collapsed ? 'justify-center' : ''}`}>
          {!collapsed && (
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              {isThai ? 'พอร์ทัลอาจารย์ผู้สอน' : 'Instructor Portal'}
            </span>
          )}
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            title={collapsed ? (isThai ? 'ขยายแถบเมนู' : 'Expand Sidebar') : (isThai ? 'ย่อแถบเมนู' : 'Collapse Sidebar')}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav Items */}
        <nav className="space-y-1 px-2.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTeacherRoute === item.id || (item.id === 'T5' && activeTeacherRoute === 'T6') || (item.id === 'T7' && activeTeacherRoute === 'T8');

            return (
              <button
                key={item.id}
                onClick={() => setActiveTeacherRoute(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}

                {/* Badge if violations or notices */}
                {item.badge && !collapsed && (
                  <span className="ml-auto bg-red-600 text-white rounded-full text-[10px] font-bold px-1.5 py-0.2">
                    {item.badge}
                  </span>
                )}
                {item.badge && collapsed && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-600" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      {!collapsed && (
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 m-2 rounded-xl text-[11px] text-gray-500 space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isThai ? 'ระบบคุมสอบ ICIT ทำงานปกติ' : 'ICIT Proctor Session Active'}</span>
          </div>
          <div>{isThai ? 'เชื่อมต่อห้องแล็บ 301 แล้ว' : 'Computer Lab 301 Connected'}</div>
        </div>
      )}
    </aside>
  );
};
