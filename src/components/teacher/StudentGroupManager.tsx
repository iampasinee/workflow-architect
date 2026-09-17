import { calculateStudentYearLevel } from '../../utils/academicYear';
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Search,
  Check,
  X,
  FileText
} from 'lucide-react';
import { Badge, AccountStatusBadge, ExamSubmissionStatusBadge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { Student } from '../../types';

interface ImportedRow {
  studentCode: string;
  fullName: string;
  email: string;
  department: string;
  year: number;
  isValid: boolean;
  errorReason?: string;
  warning?: string;
}

export const StudentGroupManager: React.FC = () => {
  const {
    students,
    addStudent,
    deleteStudent,
    showToast,
    courses,
    examSessions,
    submissions,
    language,
  } = useApp();
  const isThai = language === 'th';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('cs301_sec1');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Single Add form
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newFaculty, setNewFaculty] = useState('Faculty of Engineering');
  const [newDept, setNewDept] = useState('Computer Engineering');
  const newYear = calculateStudentYearLevel(newCode);

  // Excel Import state
  const [importRows, setImportRows] = useState<ImportedRow[]>([]);
  const [importFileName, setImportFileName] = useState('');

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newName) return;

    const accepted = addStudent({
      studentCode: newCode,
      fullName: newName,
      email: newEmail || `${newCode}@icit.university.ac.th`,
      faculty: newFaculty,
      department: newDept,
      year: newYear?.yearLevel || 0,
      faceReferenceUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
      accountStatus: 'active',
      isFirstTime: false,
    });

    if (!accepted) return;
    setIsAddModalOpen(false);
    setNewCode('');
    setNewName('');
    setNewEmail('');
  };

  // Sample spreadsheet roster simulation
  const simulateSpreadsheetLoad = () => {
    setImportFileName('CS301_Roster_Sec1_2026.xlsx');
    const mockParsed: ImportedRow[] = [
      {
        studentCode: '6410123470',
        fullName: 'Kittisak Vongsawat',
        email: '6410123470@icit.university.ac.th',
        department: 'Computer Engineering',
        year: 3,
        isValid: true,
      },
      {
        studentCode: '6410123471',
        fullName: 'Narumon Ratanasin',
        email: '6410123471@icit.university.ac.th',
        department: 'Computer Engineering',
        year: 3,
        isValid: true,
      },
      {
        studentCode: '6410123456', // Duplicate
        fullName: 'Somchai Jaidee',
        email: '6410123456@icit.university.ac.th',
        department: 'Computer Engineering',
        year: 3,
        isValid: false,
        errorReason: isThai
          ? 'รหัสนักศึกษาซ้ำ มีในบัญชีรายชื่อสอบนี้แล้ว'
          : 'Duplicate Student Code already registered in this exam roster.',
      },
      {
        studentCode: 'INVALID_ID',
        fullName: 'Unknown Candidate',
        email: 'bad@email',
        department: 'Computer Engineering',
        year: 2,
        isValid: false,
        errorReason: isThai
          ? 'รูปแบบรหัสนักศึกษาไม่ถูกต้อง (ต้องเป็นตัวเลข 10 หลัก)'
          : 'Invalid 10-digit university student code format.',
      },
      {
        studentCode: '6410123472',
        fullName: 'Patchara Bunterm',
        email: '6410123472@icit.university.ac.th',
        department: 'Computer Engineering',
        year: 3,
        isValid: true,
      },
    ];
    setImportRows(mockParsed.map((row, index) => {
      const result = calculateStudentYearLevel(row.studentCode);
      return { ...row, year: result?.yearLevel || 0, isValid: row.isValid && Boolean(result?.isValid),
        errorReason: !result?.isValid ? `แถวที่ ${index + 1}: ${result?.errorMessage || 'กรุณากรอกรหัสนักศึกษา'}` : row.errorReason,
        warning: result?.isValid && row.year !== result.yearLevel ? `ข้อมูลชั้นปีในไฟล์ไม่ตรงกับรหัสนักศึกษา ระบบปรับเป็นชั้นปีที่ ${result.yearLevel} อัตโนมัติ` : undefined,
      };
    }));
  };

  const confirmValidImportRows = () => {
    const validRows = importRows.filter((r) => r.isValid);
    validRows.forEach((row) => {
      addStudent({
        studentCode: row.studentCode,
        fullName: row.fullName,
        email: row.email,
        faculty: 'Faculty of Engineering',
        department: row.department,
        year: row.year,
        faceReferenceUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
        accountStatus: 'active',
        isFirstTime: false,
      });
    });

    showToast(
      isThai ? 'นำเข้าบัญชีรายชื่อสำเร็จ' : 'Roster Imported',
      isThai
        ? `นำเข้านักศึกษาจำนวน ${validRows.length} คน จากไฟล์ Excel เรียบร้อยแล้ว`
        : `Successfully enrolled ${validRows.length} students from Excel roster.`,
      'success'
    );
    setIsImportModalOpen(false);
    setImportRows([]);
  };

  const rosterExam =
    examSessions.find((exam) => exam.status === 'in_progress') ||
    examSessions.find((exam) => exam.status === 'upcoming') ||
    examSessions[0];
  const rosterSection = courses.find((course) => course.id === rosterExam?.courseId)?.sections
    .find((section) => section.sectionNo === rosterExam?.sectionNo);
  const rosterGroupIds = new Set(rosterSection?.groupIds || []);
  const term = searchTerm.toLowerCase();
  const filteredStudents = students.filter(
    (s) =>
      Boolean(s.classGroupId && rosterGroupIds.has(s.classGroupId)) &&
      ((s.studentCode || '').toLowerCase().includes(term) ||
        (s.fullName || '').toLowerCase().includes(term) ||
        (s.department || '').toLowerCase().includes(term))
  );

  const renderExamStatus = (student: Student) => {
    if (student.accountStatus !== 'active') {
      return <AccountStatusBadge status={student.accountStatus} />;
    }

    const submission = submissions.find(
      (item) => item.examId === rosterExam?.id && item.studentId === student.id
    );

    if (submission?.status === 'submitted' || submission?.status === 'late') {
      return <ExamSubmissionStatusBadge status={submission.status} />;
    }

    return (
      <ExamSubmissionStatusBadge
        status={rosterExam?.status === 'in_progress' ? 'in_progress' : 'not_started'}
      />
    );
  };

  return (
    <div className="space-y-6 text-left">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-200 gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
            {isThai ? 'บัญชีรายชื่อผู้เข้าสอบ (T3)' : 'Examinee Roster (T3)'}
          </span>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">
            {isThai ? 'การจัดการกลุ่มและรายชื่อนักศึกษา' : 'Student Group Management'}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {isThai
              ? 'จัดการกลุ่มนักศึกษาที่ลงทะเบียนในรอบสอบ และนำเข้ารายชื่อผ่านไฟล์ตาราง Excel'
              : 'Manage student cohorts assigned to exam sessions and import class rosters via Excel spreadsheets.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              simulateSpreadsheetLoad();
              setIsImportModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>{isThai ? 'นำเข้าไฟล์ Excel' : 'Import Excel Roster'}</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isThai ? 'เพิ่มผู้เข้าสอบ' : 'Add Examinee'}</span>
          </button>
        </div>
      </div>

      {/* Filter & Cohort Selector Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">
            {isThai ? 'กลุ่มการสอบ:' : 'Exam Cohort:'}
          </span>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:ring-2 focus:ring-blue-500"
          >
            <option value="cs301_sec1">
              CS301 - {isThai ? 'ตอน 1 (ผู้เข้าสอบ 40 คน)' : 'Sec 1 (40 Enrolled Examinees)'}
            </option>
            <option value="cs301_sec2">
              CS301 - {isThai ? 'ตอน 2 (ผู้เข้าสอบ 35 คน)' : 'Sec 2 (35 Enrolled Examinees)'}
            </option>
            <option value="cs402_sec1">
              CS402 - {isThai ? 'ตอน 1 (ผู้เข้าสอบ 38 คน)' : 'Sec 1 (38 Enrolled Examinees)'}
            </option>
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder={isThai ? 'ค้นหาผู้เข้าสอบ...' : 'Search examinees...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-3.5">{isThai ? 'ผู้เข้าสอบ' : 'Examinee'}</th>
                <th className="px-4 py-3.5">{isThai ? 'รหัสนักศึกษา' : 'Student Code'}</th>
                <th className="px-4 py-3.5">{isThai ? 'ภาควิชา & ชั้นปี' : 'Department & Year'}</th>
                <th className="px-4 py-3.5">{isThai ? 'อีเมล ICIT' : 'ICIT Email'}</th>
                <th className="px-4 py-3.5">{isThai ? 'ข้อมูลใบหน้าอ้างอิง' : 'Biometric Reference'}</th>
                <th className="px-4 py-3.5">{isThai ? 'สถานะ' : 'Status'}</th>
                <th className="px-6 py-3.5 text-right">{isThai ? 'การจัดการ' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.map((std) => (
                <tr key={std.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 shrink-0">
                        {std.faceReferenceUrl ? (
                          <img
                            src={std.faceReferenceUrl}
                            alt={std.fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-xs font-bold">
                            {std.fullName.charAt(0)}
                          </div>
                        )}
                      </div>
                      <span className="font-semibold text-gray-900">{std.fullName}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3.5 font-mono font-medium text-gray-800">
                    {std.studentCode}
                  </td>

                  <td className="px-4 py-3.5 text-gray-600">
                    {std.department} ({isThai ? 'ปี ' : 'Year '}{calculateStudentYearLevel(std.studentCode)?.yearLevel || '—'})
                  </td>

                  <td className="px-4 py-3.5 font-mono text-gray-500">
                    {std.email}
                  </td>

                  <td className="px-4 py-3.5">
                    {std.faceReferenceUrl ? (
                      <Badge variant="success" size="sm">
                        <Check className="w-3 h-3" />
                        <span>{isThai ? 'ลงทะเบียนแล้ว' : 'Enrolled'}</span>
                      </Badge>
                    ) : (
                      <Badge variant="warning" size="sm">
                        <span>{isThai ? 'รอลงทะเบียน ST2B' : 'Pending ST2B'}</span>
                      </Badge>
                    )}
                  </td>

                  <td className="px-4 py-3.5">
                    {renderExamStatus(std)}
                  </td>

                  <td className="px-6 py-3.5 text-right">
                    <button
                      onClick={() => deleteStudent(std.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title={isThai ? 'ลบออกจากรายชื่อ' : 'Remove from roster'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD EXAMINEE MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={isThai ? 'เพิ่มผู้เข้าสอบลงในกลุ่ม' : 'Add Examinee to Group'}
        maxWidth="md"
      >
        <form onSubmit={handleManualAdd} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {isThai ? 'รหัสนักศึกษา (10 หลัก)' : 'Student Code (10 digits)'}
            </label>
            <input
              type="text"
              required
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="e.g. 6410123488"
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {isThai ? 'ชื่อ-นามสกุล' : 'Full Name'}
            </label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Supachai Prasert"
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {isThai ? 'อีเมล ICIT (ไม่บังคับ)' : 'ICIT Email (Optional)'}
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder={isThai ? 'สร้างให้อัตโนมัติหากเว้นว่าง' : 'Auto-generated if blank'}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {isThai ? 'ภาควิชา' : 'Department'}
              </label>
              <input
                type="text"
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {isThai ? 'ชั้นปี' : 'Year Level'}
              </label>
              <input
                readOnly
                value={newYear?.formattedYearLevel || '—'}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              {isThai ? 'ยกเลิก' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md cursor-pointer"
            >
              {isThai ? 'เพิ่มนักศึกษา' : 'Add Student'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EXCEL IMPORT PREVIEW MODAL */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title={isThai ? 'ตัวอย่างการนำเข้ารายชื่อห้องสอบจาก Excel' : 'Excel Class Roster Import Preview'}
        maxWidth="2xl"
      >
        <div className="space-y-4 text-left text-xs">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-900">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <div>
                <strong className="block">{importFileName}</strong>
                <span className="text-[11px] text-emerald-700">
                  {importRows.filter((r) => r.isValid).length}{' '}
                  {isThai ? 'แถวข้อมูลถูกต้องพร้อมนำเข้า • ' : 'Valid rows ready to import • '}
                  {importRows.filter((r) => !r.isValid).length}{' '}
                  {isThai ? 'รายการที่พบปัญหา' : 'Issues flagged'}
                </span>
              </div>
            </div>
          </div>

          {/* Validation Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2">{isThai ? 'รหัส' : 'Code'}</th>
                  <th className="px-3 py-2">{isThai ? 'ชื่อ-นามสกุล' : 'Full Name'}</th>
                  <th className="px-3 py-2">{isThai ? 'ภาควิชา' : 'Department'}</th>
                  <th className="px-3 py-2">{isThai ? 'ผลการตรวจสอบ' : 'Validation Result'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {importRows.map((row, idx) => (
                  <tr key={idx} className={row.isValid ? 'bg-white' : 'bg-red-50/50'}>
                    <td className="px-3 py-2 font-mono">{row.studentCode}</td>
                    <td className="px-3 py-2 font-medium">{row.fullName}{row.warning && <p className="mt-1 text-xs text-amber-700">{row.warning}</p>}</td>
                    <td className="px-3 py-2 text-gray-500">{row.department}</td>
                    <td className="px-3 py-2">
                      {row.isValid ? (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>{isThai ? 'ถูกต้อง' : 'Valid'}</span>
                        </span>
                      ) : (
                        <span className="text-red-600 font-medium flex items-center gap-1" title={row.errorReason}>
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{row.errorReason}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-[11px] text-gray-500">
            {isThai
              ? 'เฉพาะแถวข้อมูลที่ถูกต้องเท่านั้นที่จะถูกนำเข้าสู่ระบบ ข้อมูลนักศึกษาที่ไม่ถูกต้องหรือซ้ำกันจะถูกข้ามโดยอัตโนมัติ'
              : 'Only valid rows will be imported into the course group. Invalid or duplicate student records will be skipped automatically.'}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => setIsImportModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              {isThai ? 'ยกเลิก' : 'Cancel'}
            </button>
            <button
              onClick={confirmValidImportRows}
              className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isThai ? 'ยืนยัน & นำเข้าผู้เข้าสอบที่ถูกต้อง' : 'Confirm & Import Valid Examinees'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
