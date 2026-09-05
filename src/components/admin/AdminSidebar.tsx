import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  Users,
  Monitor,
  Camera,
  ShieldAlert,
  FileText,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ collapsed, onToggle }) => {
  const { activeAdminRoute, setActiveAdminRoute, violations, language } = useApp();
  const isThai = language === 'th';

  const unacknowledgedViolations = violations.filter((v) => !v.acknowledged).length;

  const menuItems = [
    { id: 'A1', label: isThai ? 'แดชบอร์ดภาพรวม' : 'Dashboard', icon: LayoutDashboard },
    { id: 'A2', label: isThai ? 'จัดการผู้ใช้ & บทบาท' : 'User & Role Management', icon: Users },
    { id: 'A4', label: isThai ? 'ห้องสอบ & เครื่องคอมพิวเตอร์' : 'Exam Room & Computer Setup', icon: Monitor },
    { id: 'A6', label: isThai ? 'จัดการข้อมูลใบหน้าชีวมิติ' : 'Biometric Reference Mgmt', icon: Camera },
    {
      id: 'A8',
      label: isThai ? 'ความปลอดภัย & ตรวจจับการทุจริต' : 'Security & Cheat Detection',
      icon: ShieldAlert,
      badge: unacknowledgedViolations > 0 ? unacknowledgedViolations : undefined,
    },
    { id: 'A10', label: isThai ? 'บันทึกประวัติระบบ (Audit Log)' : 'System Audit Log', icon: FileText },
    { id: 'A12', label: isThai ? 'ข้อมูลผู้ดูแลระบบ' : 'Admin Profile', icon: UserCheck },
  ];

  return (
    <aside
      className={`bg-white border-r border-gray-200 transition-all duration-200 flex flex-col justify-between shrink-0 z-20 text-gray-700 ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      <div className="py-4">
        {/* Module Title */}
        <div className={`px-4 mb-4 flex items-center justify-between ${collapsed ? 'justify-center' : ''}`}>
          {!collapsed && (
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              {isThai ? 'การจัดการระบบส่วนกลาง' : 'System Administration'}
            </span>
          )}
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            title={collapsed ? (isThai ? 'ขยายแถบข้าง' : 'Expand Sidebar') : isThai ? 'ย่อแถบข้าง' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav Items */}
        <nav className="space-y-1 px-2.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              activeAdminRoute === item.id ||
              (item.id === 'A2' && activeAdminRoute === 'A3') ||
              (item.id === 'A4' && activeAdminRoute === 'A5') ||
              (item.id === 'A6' && activeAdminRoute === 'A7') ||
              (item.id === 'A8' && activeAdminRoute === 'A9') ||
              (item.id === 'A10' && activeAdminRoute === 'A11');

            return (
              <button
                key={item.id}
                onClick={() => setActiveAdminRoute(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}

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

      {!collapsed && (
        <div className="p-4 border border-blue-100 bg-blue-50/70 m-3 rounded-xl text-[11px] text-gray-600 space-y-1">
          <div className="flex items-center gap-1.5 text-blue-700 font-semibold">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span>{isThai ? 'สิทธิ์ผู้ดูแลระบบสูงสุด (Root)' : 'Root Admin Privileges'}</span>
          </div>
          <div>{isThai ? 'เครือข่าย ICIT คลัสเตอร์ 1 กำลังทำงาน' : 'ICIT Network Cluster 1 Active'}</div>
        </div>
      )}
    </aside>
  );
};
