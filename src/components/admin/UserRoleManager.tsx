import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Shield,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  X,
  UserCheck
} from 'lucide-react';
import { Badge, AccountStatusBadge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { UserRole, AccountStatus } from '../../types';

interface UnifiedUser {
  id: string;
  code: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  status: AccountStatus;
}

export const UserRoleManager: React.FC = () => {
  const {
    students,
    teachers,
    showToast,
    updateStudentStatus,
    addStudent,
    language,
  } = useApp();
  const isThai = language === 'th';

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Selected user for status modification
  const [statusModalUser, setStatusModalUser] = useState<UnifiedUser | null>(null);
  const [newStatus, setNewStatus] = useState<AccountStatus>('active');
  const [suspensionReason, setSuspensionReason] = useState('');

  // Add User Form
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    email: '',
    role: 'student' as UserRole,
    department: 'Computer Engineering',
    faculty: 'Faculty of Engineering',
  });

  // Combine users for global list
  const allUsers: UnifiedUser[] = [
    ...students.map((s) => ({
      id: s.id,
      code: s.studentCode,
      name: s.fullName,
      email: s.email,
      role: 'student' as UserRole,
      department: s.department,
      status: s.accountStatus,
    })),
    ...teachers.map((t) => ({
      id: t.id,
      code: t.teacherCode,
      name: t.fullName,
      email: t.email,
      role: 'teacher' as UserRole,
      department: t.department,
      status: 'active' as AccountStatus,
    })),
    {
      id: 'adm_0001',
      code: 'ADM-1001',
      name: 'Dr. Pravit Chaiyaporn',
      email: 'pravit.c@icit.university.ac.th',
      role: 'admin' as UserRole,
      department: 'Central IT Infrastructure',
      status: 'active' as AccountStatus,
    },
  ];

  const filteredUsers = allUsers.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    const s = searchTerm.toLowerCase();
    return (
      (u.name || '').toLowerCase().includes(s) ||
      (u.code || '').toLowerCase().includes(s) ||
      (u.email || '').toLowerCase().includes(s) ||
      (u.department || '').toLowerCase().includes(s)
    );
  });

  const handleOpenStatusModal = (user: UnifiedUser) => {
    setStatusModalUser(user);
    setNewStatus(user.status);
    setSuspensionReason('');
  };

  const handleApplyStatusChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalUser) return;

    if (statusModalUser.role === 'student') {
      updateStudentStatus(statusModalUser.id, newStatus);
      showToast(
        isThai ? 'อัปเดตสถานะบัญชีแล้ว' : 'Account Status Updated',
        isThai
          ? `อัปเดตสถานะของนักศึกษา ${statusModalUser.name} เป็น ${
              newStatus === 'active' ? 'ปกติ (Active)' : newStatus === 'suspended' ? 'ระงับสิทธิ์ (Suspended)' : 'ไม่ใช้งาน (Inactive)'
            }${newStatus === 'suspended' ? ' เซสชันการสอบที่กำลังดำเนินการจะถูกยกเลิกทันที' : ''}`
          : `Student ${statusModalUser.name} status updated to ${newStatus.toUpperCase()}.${
              newStatus === 'suspended' ? ' Active exam sessions immediately revoked.' : ''
            }`,
        newStatus === 'suspended' ? 'warning' : 'success'
      );
    } else {
      showToast(
        isThai ? 'อัปเดตสถานะแล้ว' : 'Status Updated',
        isThai ? `อัปเดตผู้ใช้ ${statusModalUser.name} เรียบร้อยแล้ว` : `User ${statusModalUser.name} updated to ${newStatus}.`,
        'info'
      );
    }

    setStatusModalUser(null);
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.role === 'student') {
      addStudent({
        studentCode: formData.code,
        fullName: formData.name,
        email: formData.email,
        department: formData.department,
        faculty: formData.faculty,
        year: 3,
        accountStatus: 'active',
        isFirstTime: true,
      });
    }

    showToast(
      isThai ? 'สร้างผู้ใช้สำเร็จ' : 'User Created',
      isThai
        ? `ลงทะเบียน ${formData.name} ในบทบาท ${
            formData.role === 'student' ? 'นักศึกษา' : formData.role === 'teacher' ? 'อาจารย์' : 'ผู้ดูแลระบบ'
          } เรียบร้อยแล้ว`
        : `Successfully enrolled ${formData.name} as ${formData.role}.`,
      'success'
    );
    setIsModalOpen(false);
  };

  const getRoleLabel = (role: UserRole) => {
    if (!isThai) return role;
    switch (role) {
      case 'student':
        return 'นักศึกษา';
      case 'teacher':
        return 'อาจารย์';
      case 'admin':
        return 'ผู้ดูแลระบบ';
      default:
        return role;
    }
  };

  const getStatusLabel = (status: AccountStatus) => {
    if (!isThai) return status;
    switch (status) {
      case 'active':
        return 'ปกติ (Active)';
      case 'suspended':
        return 'ระงับสิทธิ์ (Suspended)';
      case 'graduated_inactive':
        return 'ไม่ใช้งาน / จบการศึกษา';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-200 gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
            {isThai ? 'การควบคุมสิทธิ์การเข้าถึง (A2 & A3)' : 'Access Control (A2 & A3)'}
          </span>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">
            {isThai ? 'จัดการผู้ใช้ & สิทธิ์การใช้งาน' : 'User & Role Management'}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {isThai
              ? 'จัดการบัญชีสถาบัน, กำหนดบทบาทอาจารย์/นักศึกษา และระงับสิทธิ์บัญชีผู้เข้าสอบทันทีเมื่อพบการทุจริต'
              : 'Manage university credentials, assign Teacher/Student roles, and enforce immediate suspension of examinee accounts.'}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{isThai ? 'เพิ่มผู้ใช้ใหม่' : 'Provision New User'}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-600">{isThai ? 'กรองตามบทบาท:' : 'Filter Role:'}</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">
              {isThai ? 'ทุกบทบาท' : 'All Roles'} ({allUsers.length})
            </option>
            <option value="student">
              {isThai ? 'นักศึกษา' : 'Students'} ({students.length})
            </option>
            <option value="teacher">
              {isThai ? 'อาจารย์' : 'Teachers'} ({teachers.length})
            </option>
            <option value="admin">
              {isThai ? 'ผู้ดูแลระบบ' : 'Administrators'} (1)
            </option>
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder={isThai ? 'ค้นหาด้วยรหัส, ชื่อ, ภาควิชา...' : 'Search by code, name, department...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-3.5">{isThai ? 'ข้อมูลผู้ใช้' : 'User Details'}</th>
                <th className="px-4 py-3.5">{isThai ? 'รหัสประจำตัว' : 'Institutional ID'}</th>
                <th className="px-4 py-3.5">{isThai ? 'บทบาท' : 'Assigned Role'}</th>
                <th className="px-4 py-3.5">{isThai ? 'ภาควิชา / สาขา' : 'Department'}</th>
                <th className="px-4 py-3.5">{isThai ? 'สถานะบัญชี' : 'Account Status'}</th>
                <th className="px-6 py-3.5 text-right">{isThai ? 'การจัดการ' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="font-semibold text-gray-900">{user.name}</div>
                    <div className="text-gray-500 font-mono text-[11px]">{user.email}</div>
                  </td>

                  <td className="px-4 py-3.5 font-mono font-medium text-gray-800">
                    {user.code}
                  </td>

                  <td className="px-4 py-3.5">
                    {user.role === 'admin' ? (
                      <Badge variant="danger" size="sm">{getRoleLabel('admin')}</Badge>
                    ) : user.role === 'teacher' ? (
                      <Badge variant="purple" size="sm">{getRoleLabel('teacher')}</Badge>
                    ) : (
                      <Badge variant="blue" size="sm">{getRoleLabel('student')}</Badge>
                    )}
                  </td>

                  <td className="px-4 py-3.5 text-gray-600">
                    {user.department}
                  </td>

                  <td className="px-4 py-3.5">
                    <AccountStatusBadge status={user.status} />
                  </td>

                  <td className="px-6 py-3.5 text-right">
                    <button
                      onClick={() => handleOpenStatusModal(user)}
                      className="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 font-semibold text-[11px] cursor-pointer"
                    >
                      {isThai ? 'เปลี่ยนสถานะ' : 'Change Status'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* STATUS CHANGE & SUSPENSION MODAL */}
      <Modal
        isOpen={!!statusModalUser}
        onClose={() => setStatusModalUser(null)}
        title={
          isThai
            ? `แก้ไขสถานะบัญชี: ${statusModalUser?.name}`
            : `Modify Account Status: ${statusModalUser?.name}`
        }
        maxWidth="md"
      >
        <form onSubmit={handleApplyStatusChange} className="space-y-4 text-left text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              {isThai ? 'สถานะบัญชีใหม่' : 'Target Account Status'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['active', 'suspended', 'graduated_inactive'] as AccountStatus[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setNewStatus(st)}
                  className={`py-2 px-2 rounded-xl font-bold border capitalize transition-colors cursor-pointer ${
                    newStatus === st
                      ? st === 'suspended'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-50 border-gray-300 text-gray-700'
                  }`}
                >
                  {getStatusLabel(st)}
                </button>
              ))}
            </div>
          </div>

          {newStatus === 'suspended' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2 text-red-900">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>{isThai ? 'คำเตือน: การระงับสิทธิ์เซสชันทันที' : 'Immediate Session Revocation Warning'}</span>
              </div>
              <p className="text-[11px] text-red-700 leading-relaxed">
                {isThai
                  ? 'การระงับสิทธิ์จะตัดการสอบที่กำลังดำเนินการบนเครื่องคอมพิวเตอร์ห้องปฏิบัติการทันที และนักศึกษาจะไม่สามารถส่งไฟล์คำตอบได้'
                  : 'Suspension will immediately terminate any active examination session on their assigned lab workstation. They will not be permitted to submit answer archives.'}
              </p>
              <div>
                <label className="block font-semibold text-red-900 mb-1">
                  {isThai ? 'เหตุผลการระงับสิทธิ์ (จำเป็น):' : 'Mandatory Suspension Reason:'}
                </label>
                <input
                  type="text"
                  required
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  placeholder={isThai ? 'เช่น ฝ่าฝืนวินัยการสอบระหว่างดำเนินการ' : 'e.g. Disciplinary breach during exam'}
                  className="w-full px-3 py-1.5 rounded-lg border border-red-300 text-xs focus:ring-2 focus:ring-red-500 bg-white"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setStatusModalUser(null)}
              className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-semibold text-xs hover:bg-gray-50 cursor-pointer"
            >
              {isThai ? 'ยกเลิก' : 'Cancel'}
            </button>
            <button
              type="submit"
              className={`px-6 py-2 rounded-xl text-white font-semibold text-xs shadow-md cursor-pointer ${
                newStatus === 'suspended' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isThai ? 'บันทึกสถานะ' : 'Save Status'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ADD USER MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isThai ? 'เพิ่มผู้ใช้ใหม่เข้าสู่ระบบ' : 'Provision New System User'}
        maxWidth="md"
      >
        <form onSubmit={handleAddUser} className="space-y-4 text-left text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">{isThai ? 'ชื่อ-นามสกุล' : 'Full Name'}</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                {isThai ? 'รหัสประจำตัวสถาบัน' : 'Institutional ID / Code'}
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">{isThai ? 'บทบาท' : 'Assigned Role'}</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-blue-500"
              >
                <option value="student">{isThai ? 'นักศึกษาผู้เข้าสอบ' : 'Student Examinee'}</option>
                <option value="teacher">{isThai ? 'อาจารย์ผู้คุมสอบ' : 'Teacher Proctor'}</option>
                <option value="admin">{isThai ? 'ผู้ดูแลระบบ' : 'System Administrator'}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">{isThai ? 'อีเมล' : 'Email Address'}</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-semibold text-xs hover:bg-gray-50 cursor-pointer"
            >
              {isThai ? 'ยกเลิก' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md cursor-pointer"
            >
              {isThai ? 'สร้างบัญชีผู้ใช้' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
