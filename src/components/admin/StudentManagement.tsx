import { academicSettings, calculateStudentYearLevel } from '../../utils/academicYear';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Eye,
  GraduationCap,
  Layers,
  Network,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ScanFace,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  AcademicClassGroup,
  AcademicDepartment,
  AcademicFaculty,
  AcademicProgram,
  findAcademicPathByGroup,
  ResolvedAcademicPath,
  resolveAcademicGroupId,
} from '../../data/academicStructure';
import { AccountStatus, Student } from '../../types';
import { AccountStatusBadge, Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { isAcademicPathActive, toAcademicHierarchy } from '../../services/academicState';
import { AcademicCascade, AcademicSelection, defaultAcademicSelection } from './AcademicCascade';

type StudentViewMode = 'all' | 'groups';
type SortKey = 'studentCode' | 'fullName' | 'programCode' | 'classGroup' | 'yearLevel' | 'accountStatus';

interface ResolvedStudent {
  student: Student;
  path: ResolvedAcademicPath | null;
  firstName: string;
  lastName: string;
  programName: string;
  programCode: string;
  classGroup: string;
  yearLevel: number;
}

interface HierarchySelection {
  facultyId: string;
  departmentId: string;
  programId: string;
  yearLevel: string;
  groupId: string;
}

interface StudentFormState extends Omit<HierarchySelection, 'yearLevel'> {
  studentCode: string;
  firstName: string;
  lastName: string;
  email: string;
  yearLevel: number;
  faceReferenceUrl: string;
  accountStatus: AccountStatus;
}

const pageSize = 10;
const emptyHierarchy: HierarchySelection = {
  facultyId: '',
  departmentId: '',
  programId: '',
  yearLevel: '',
  groupId: '',
};

const getNameParts = (student: Student) => {
  const parts = student.fullName.trim().split(/\s+/);
  return {
    firstName: student.firstName || parts[0] || '',
    lastName: student.lastName || parts.slice(1).join(' '),
  };
};

const resolveStudent = (student: Student, isThai: boolean, hierarchy: AcademicFaculty[]): ResolvedStudent => {
  const groupId = resolveAcademicGroupId(
    student.classGroupId,
  );
  const path = findAcademicPathByGroup(groupId, hierarchy);
  const names = getNameParts(student);
  return {
    student,
    path,
    ...names,
    programName: path ? (isThai ? path.program.nameTh : path.program.nameEn) : student.program || '—',
    programCode: path?.program.code || student.programCode || '—',
    classGroup: path?.group.code || 'ยังไม่มีกลุ่มเรียน',
    yearLevel: calculateStudentYearLevel(student.studentCode)?.yearLevel || 0,
  };
};

const initialForm = (facultyId = ''): StudentFormState => ({
  ...emptyHierarchy,
  facultyId,
  studentCode: '',
  firstName: '',
  lastName: '',
  email: '',
  yearLevel: 0,
  faceReferenceUrl: '',
  accountStatus: 'active',
});

const escapeCsvValue = (value: string | number) => {
  const text = String(value);
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
};

const exportStudentRows = (rows: ResolvedStudent[], filename: string) => {
  const headers = ['รหัสนักศึกษา', 'ชื่อ-นามสกุล', 'อีเมลสถาบัน', 'คณะ', 'ภาควิชา', 'สาขาวิชา', 'รหัสสาขา', 'กลุ่มเรียน', 'ชั้นปี', 'ข้อมูลใบหน้า', 'สถานะบัญชี'];
  const statusText: Record<AccountStatus, string> = {
    active: 'ปกติ',
    suspended: 'ถูกระงับ',
    graduated_inactive: 'พ้นสภาพ',
  };
  const lines = rows.map((row) => [
    row.student.studentCode,
    row.student.fullName,
    row.student.email,
    row.path?.faculty.name || row.student.faculty,
    row.path?.department.nameTh || row.student.department,
    row.path?.program.nameTh || row.student.program || '',
    row.programCode,
    row.classGroup,
    row.yearLevel,
    row.student.faceReferenceUrl ? 'มีข้อมูล' : 'ยังไม่มีข้อมูล',
    statusText[row.student.accountStatus],
  ].map(escapeCsvValue).join(','));
  const blob = new Blob([`\uFEFF${headers.map(escapeCsvValue).join(',')}\r\n${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

export const StudentManagement: React.FC = () => {
  const {
    students,
    academicState,
    setActiveAdminRoute,
    assignStudentsToClassGroup,
    showToast,
    addStudent,
    updateStudent,
    deleteStudent,
    updateAccountStatus,
    language,
  } = useApp();
  const isThai = language === 'th';
  const academicStructure = useMemo(() => toAcademicHierarchy(academicState), [academicState]);
  const defaultFacultyId = academicState.faculties.find((f) => f.status === 'active')?.id || '';
  const defaultHierarchy = { ...emptyHierarchy, facultyId: defaultFacultyId };
  const [assignmentFilter, setAssignmentFilter] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSelection, setBulkSelection] = useState<AcademicSelection>(() => defaultAcademicSelection(academicState));
  const [bulkConfirmed, setBulkConfirmed] = useState(false);
  const [viewMode, setViewMode] = useState<StudentViewMode>('all');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    ...defaultHierarchy,
    yearLevel: '',
    accountStatus: '',
    faceStatus: '',
  });
  const [browse, setBrowse] = useState<HierarchySelection>(defaultHierarchy);
  const [sortKey, setSortKey] = useState<SortKey>('studentCode');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [viewStudent, setViewStudent] = useState<ResolvedStudent | null>(null);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [statusTarget, setStatusTarget] = useState<Student | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<StudentFormState>(() => initialForm(defaultFacultyId));
  const [transferTarget, setTransferTarget] = useState<ResolvedStudent | null>(null);
  const [transfer, setTransfer] = useState<HierarchySelection>(defaultHierarchy);
  const [transferReason, setTransferReason] = useState('');
  const [transferConfirm, setTransferConfirm] = useState(false);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);

  const resolvedStudents = useMemo(
    () => students.map((student) => resolveStudent(student, isThai, academicStructure)),
    [students, isThai, academicStructure],
  );

  const findFaculty = (facultyId: string) =>
    academicStructure.find((item) => item.id === facultyId);
  const findDepartment = (facultyName: string, departmentId: string) =>
    findFaculty(facultyName)?.departments.find((item) => item.id === departmentId);
  const findProgram = (facultyName: string, departmentId: string, programId: string) =>
    findDepartment(facultyName, departmentId)?.programs.find((item) => item.id === programId);
  const getYearLevels = (program?: AcademicProgram) =>
    [...new Set((program?.yearLevels || []).map((year) => year.level))].sort((left, right) => left - right);

  const filterDepartments = findFaculty(filters.facultyId)?.departments || [];
  const filterPrograms = findDepartment(filters.facultyId, filters.departmentId)?.programs || [];
  const filterProgram = findProgram(filters.facultyId, filters.departmentId, filters.programId);
  const filterYearLevels = getYearLevels(filterProgram);
  const filterGroups = (filterProgram?.classGroups || []).filter((group) =>
    !filters.yearLevel || group.yearLevel === Number(filters.yearLevel));
  const browseFaculty = findFaculty(browse.facultyId);
  const browseDepartment = findDepartment(browse.facultyId, browse.departmentId);
  const browseProgram = findProgram(browse.facultyId, browse.departmentId, browse.programId);
  const browseYearLevels = getYearLevels(browseProgram);
  const browseGroups = (browseProgram?.classGroups || []).filter((group) =>
    !browse.yearLevel || group.yearLevel === Number(browse.yearLevel));
  const browseGroup = browseGroups.find((item) => item.id === browse.groupId);

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = resolvedStudents.filter((row) => {
      const matchesSearch = !term || [
        row.student.studentCode,
        row.firstName,
        row.lastName,
        row.student.fullName,
        row.student.email,
        row.programCode,
        row.classGroup,
      ].some((value) => value.toLowerCase().includes(term));
      return matchesSearch
        && (!filters.facultyId || (row.path?.faculty.id || row.student.facultyId) === filters.facultyId)
        && (!assignmentFilter || (assignmentFilter === 'unassigned' ? !row.path : Boolean(row.path)))
        && (!filters.departmentId || row.path?.department.id === filters.departmentId)
        && (!filters.programId || row.path?.program.id === filters.programId)
        && (!filters.groupId || row.path?.group.id === filters.groupId)
        && (!filters.yearLevel || row.yearLevel === Number(filters.yearLevel))
        && (!filters.accountStatus || row.student.accountStatus === filters.accountStatus)
        && (!filters.faceStatus || (filters.faceStatus === 'available') === Boolean(row.student.faceReferenceUrl));
    });
    return list.sort((left, right) => {
      const leftValue = sortKey === 'studentCode' || sortKey === 'fullName' || sortKey === 'accountStatus'
        ? left.student[sortKey]
        : left[sortKey];
      const rightValue = sortKey === 'studentCode' || sortKey === 'fullName' || sortKey === 'accountStatus'
        ? right.student[sortKey]
        : right[sortKey];
      const comparison = typeof leftValue === 'number' && typeof rightValue === 'number'
        ? leftValue - rightValue
        : String(leftValue).localeCompare(String(rightValue), undefined, { sensitivity: 'base' });
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [resolvedStudents, search, filters, assignmentFilter, sortKey, sortDirection]);

  const groupStudents = browse.groupId
    ? resolvedStudents.filter((row) => row.path?.group.id === browse.groupId)
    : [];
  const visibleGroupStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return groupStudents
      .filter((row) => !term || [row.student.studentCode, row.student.fullName, row.student.email]
        .some((value) => value.toLowerCase().includes(term)))
      .sort((left, right) => {
        const leftValue = sortKey === 'studentCode' || sortKey === 'fullName' || sortKey === 'accountStatus'
          ? left.student[sortKey]
          : left[sortKey];
        const rightValue = sortKey === 'studentCode' || sortKey === 'fullName' || sortKey === 'accountStatus'
          ? right.student[sortKey]
          : right[sortKey];
        const comparison = typeof leftValue === 'number' && typeof rightValue === 'number'
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue), undefined, { sensitivity: 'base' });
        return sortDirection === 'asc' ? comparison : -comparison;
      });
  }, [groupStudents, search, sortKey, sortDirection]);
  const visibleStudents = viewMode === 'all' ? filteredStudents : visibleGroupStudents;
  const totalPages = Math.max(1, Math.ceil(visibleStudents.length / pageSize));
  const pagedStudents = visibleStudents.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [viewMode, search, filters, assignmentFilter, browse.groupId, sortKey, sortDirection]);
  useEffect(() => setSelectedStudentIds(new Set()), [viewMode, search, filters, assignmentFilter, browse.groupId]);
  useEffect(() => {
    const existingIds = new Set(students.map((student) => student.id));
    setSelectedStudentIds((current) => {
      const next = new Set([...current].filter((id) => existingIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [students]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const selectedOnPage = pagedStudents.filter((row) => selectedStudentIds.has(row.student.id)).length;
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectedOnPage > 0 && selectedOnPage < pagedStudents.length;
    }
  }, [selectedOnPage, pagedStudents.length]);

  const selectFilterFaculty = (facultyId: string) => setFilters((current) => ({
    ...current, facultyId, departmentId: '', programId: '', yearLevel: '', groupId: '',
  }));
  const selectFilterDepartment = (departmentId: string) => setFilters((current) => ({
    ...current, departmentId, programId: '', yearLevel: '', groupId: '',
  }));
  const selectFilterProgram = (programId: string) => setFilters((current) => ({
    ...current, programId, yearLevel: '', groupId: '',
  }));
  const selectFilterYear = (yearLevel: string) => setFilters((current) => ({
    ...current, yearLevel, groupId: '',
  }));
  const selectBrowseFaculty = (facultyId: string) => setBrowse({
    facultyId, departmentId: '', programId: '', yearLevel: '', groupId: '',
  });
  const selectBrowseDepartment = (departmentId: string) => setBrowse((current) => ({
    ...current, departmentId, programId: '', yearLevel: '', groupId: '',
  }));
  const selectBrowseProgram = (programId: string) => setBrowse((current) => ({
    ...current, programId, yearLevel: '', groupId: '',
  }));
  const selectBrowseYear = (yearLevel: string) => setBrowse((current) => ({
    ...current, yearLevel, groupId: '',
  }));

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const openCreate = () => {
    setForm(initialForm(defaultFacultyId));
    setCreateOpen(true);
  };

  const openCreateForGroup = () => {
    if (!browseFaculty || !browseDepartment || !browseProgram || !browseGroup) return;
    if (!isAcademicPathActive(academicState, 'classGroups', browseGroup.id)) {
      showToast('ไม่สามารถเพิ่มนักศึกษาในกลุ่มนี้ได้', 'กลุ่มเรียนหรือต้นสังกัดถูกปิดใช้งาน', 'warning');
      return;
    }
    setForm({
      ...initialForm(defaultFacultyId),
      facultyId: browseFaculty.id,
      departmentId: browseDepartment.id,
      programId: browseProgram.id,
      groupId: browseGroup.id,
      yearLevel: browseGroup.yearLevel,
    });
    setCreateOpen(true);
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((current) => {
      const next = new Set(current);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const toggleCurrentPage = () => {
    setSelectedStudentIds((current) => {
      const next = new Set(current);
      const pageIds = pagedStudents.map((row) => row.student.id);
      const allSelected = pageIds.length > 0 && pageIds.every((id) => next.has(id));
      pageIds.forEach((id) => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const openEdit = (student: Student) => {
    const row = resolveStudent(student, isThai, academicStructure);
    setForm({
      studentCode: student.studentCode,
      firstName: row.firstName,
      lastName: row.lastName,
      email: student.email,
      facultyId: row.path?.faculty.id || student.facultyId || defaultFacultyId,
      departmentId: row.path?.department.id || student.departmentId || '',
      programId: row.path?.program.id || student.programId || '',
      groupId: row.path?.group.id || '',
      yearLevel: row.yearLevel,
      faceReferenceUrl: student.faceReferenceUrl,
      accountStatus: student.accountStatus,
    });
    setEditStudent(student);
  };

  const academicUpdates = (values: StudentFormState) => {
    const path = findAcademicPathByGroup(values.groupId, academicStructure);
    if (!path) {
      if (!editStudent || editStudent.classGroupId || values.programId !== editStudent.programId ||
        values.yearLevel !== (editStudent.yearLevel || editStudent.year)) return null;
      return {
        ...editStudent, studentCode: values.studentCode.trim(), firstName: values.firstName.trim(), lastName: values.lastName.trim(),
        fullName: `${values.firstName.trim()} ${values.lastName.trim()}`.trim(), email: values.email.trim(),
        faceReferenceUrl: values.faceReferenceUrl.trim(), accountStatus: values.accountStatus,
      };
    }
    return {
      studentCode: values.studentCode.trim(),
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      fullName: `${values.firstName.trim()} ${values.lastName.trim()}`.trim(),
      email: values.email.trim(),
      departmentId: path.department.id,
      programId: path.program.id,
      classGroupId: path.group.id,
      facultyId: path.faculty.id,
      faculty: path.faculty.name,
      department: path.department.nameTh,
      program: path.program.nameTh,
      programCode: path.program.code,
      classGroup: path.group.code,
      year: calculateStudentYearLevel(values.studentCode)?.yearLevel || 0,
      yearLevel: calculateStudentYearLevel(values.studentCode)?.yearLevel || 0,
      faceReferenceUrl: values.faceReferenceUrl.trim(),
      faceReferenceStatus: values.faceReferenceUrl.trim() ? 'available' as const : 'missing' as const,
      accountStatus: values.accountStatus,
      isFirstTime: !values.faceReferenceUrl.trim(),
    };
  };

  const saveStudent = (event: React.FormEvent) => {
    event.preventDefault();
    const updates = academicUpdates(form);
    if (!updates) return;
    if (editStudent) {
      if (updateStudent(editStudent.id, updates)) setEditStudent(null);
    } else {
      if (addStudent(updates)) setCreateOpen(false);
    }
  };

  const openTransfer = (row: ResolvedStudent) => {
    setTransferTarget(row);
    setTransfer({ ...defaultHierarchy });
    setTransferReason('');
    setTransferConfirm(false);
  };

  const executeTransfer = () => {
    if (!transferTarget) return;
    const path = findAcademicPathByGroup(transfer.groupId, academicStructure);
    if (!path || path.group.id === transferTarget.path?.group.id) return;
    const updated = updateStudent(transferTarget.student.id, {
      departmentId: path.department.id,
      programId: path.program.id,
      classGroupId: path.group.id,
      facultyId: path.faculty.id,
      faculty: path.faculty.name,
      department: path.department.nameTh,
      program: path.program.nameTh,
      programCode: path.program.code,
      classGroup: path.group.code,
    });
    if (!updated) return;
    setTransferTarget(null);
    setTransferConfirm(false);
  };

  const deleteSelected = () => {
    if (deleteTarget && deleteStudent(deleteTarget.id)) setDeleteTarget(null);
  };

  const activeCount = students.filter((student) => student.accountStatus === 'active').length;
  const suspendedCount = students.filter((student) => student.accountStatus === 'suspended').length;
  const faceCount = students.filter((student) => Boolean(student.faceReferenceUrl)).length;

  const label = (item: { nameTh?: string; nameEn?: string }) => (isThai ? item.nameTh : item.nameEn) || '';
  return (
    <div className="space-y-5 text-left">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm shadow-blue-500/30">
            <GraduationCap className="h-6 w-6" strokeWidth={1.75} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">จัดการข้อมูลนักศึกษา</h1>
            <p className="mt-0.5 text-xs text-gray-500">ตรวจสอบ เพิ่ม แก้ไข และจัดการข้อมูลนักศึกษาภายในระบบ</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1" role="group" aria-label="เลือกรูปแบบการแสดงผล">
            <ViewToggleButton active={viewMode === 'all'} onClick={() => setViewMode('all')} icon={Filter} label="นักศึกษาทั้งหมด" />
            <ViewToggleButton active={viewMode === 'groups'} onClick={() => setViewMode('groups')} icon={Layers} label="ตามกลุ่มเรียน" />
          </div>
          <button type="button" onClick={openCreate} className="flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow-md hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
            <Plus className="h-4 w-4" strokeWidth={1.75} /> เพิ่มนักศึกษาใหม่
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="สรุปนักศึกษา">
        {[
          ['นักศึกษาทั้งหมด', students.length, Users, 'text-blue-600', 'ลงทะเบียนในระบบ'],
          ['สถานะปกติ', activeCount, CheckCircle2, 'text-emerald-600', 'มีสิทธิ์เข้าสอบ'],
          ['ถูกระงับ', suspendedCount, AlertTriangle, 'text-red-600', 'จำกัดการเข้าสอบ'],
          ['มีข้อมูลใบหน้าพร้อม', faceCount, ScanFace, 'text-violet-600', `${students.length ? Math.round((faceCount / students.length) * 100) : 0}% ของนักศึกษาทั้งหมด`],
        ].map(([title, value, Icon, color, note]) => {
          const MetricIcon = Icon as React.ElementType;
          return (
            <article key={String(title)} className="relative min-h-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <MetricIcon className={`absolute top-4 right-4 h-5 w-5 ${color}`} strokeWidth={1.75} />
              <div className={`text-[11px] font-semibold ${color}`}>{title as string}</div>
              <div className={`mt-2 font-mono text-2xl font-bold ${color}`}>{value as number}</div>
              <div className="mt-1 text-[10px] text-slate-400">{note as string}</div>
            </article>
          );
        })}
      </section>

      {viewMode === 'all' ? (
        <>
          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" strokeWidth={1.75} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 py-2 pr-3 pl-9 text-xs focus:ring-2 focus:ring-blue-500" placeholder="ค้นหารหัส ชื่อ-นามสกุล สาขา หรือกลุ่มเรียน..." />
              </div>
              <select value={filters.accountStatus} onChange={(event) => setFilters((current) => ({ ...current, accountStatus: event.target.value }))} className="h-10 rounded-xl border border-slate-200 px-3 text-xs">
                <option value="">ทุกสถานะบัญชี</option>
                <option value="active">ปกติ</option><option value="suspended">ถูกระงับ</option><option value="graduated_inactive">พ้นสภาพ</option>
              </select>
              <select value={filters.faceStatus} onChange={(event) => setFilters((current) => ({ ...current, faceStatus: event.target.value }))} className="h-10 rounded-xl border border-slate-200 px-3 text-xs">
                <option value="">ภาพใบหน้า: ทั้งหมด</option><option value="available">มีข้อมูล</option><option value="missing">ยังไม่มีข้อมูล</option>
              </select>
              <select aria-label="การกำหนดกลุ่มเรียน" value={assignmentFilter} onChange={(event) => setAssignmentFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-xs">
                <option value="">การกำหนดกลุ่ม: ทั้งหมด</option><option value="unassigned">ยังไม่มีกลุ่มเรียน</option><option value="assigned">มีกลุ่มเรียนแล้ว</option>
              </select>
              <button type="button" onClick={() => exportStudentRows(filteredStudents, `students-${new Date().toISOString().slice(0, 10)}.csv`)} disabled={!filteredStudents.length} className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                <Download className="h-4 w-4" strokeWidth={1.75} /> ส่งออก CSV
              </button>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <button type="button" onClick={() => setAdvancedFiltersOpen((current) => !current)} aria-expanded={advancedFiltersOpen} className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-blue-700">
                <Filter className="h-4 w-4" strokeWidth={1.75} /> ตัวกรองเพิ่มเติม <ChevronDown className={`h-4 w-4 transition-transform ${advancedFiltersOpen ? 'rotate-180' : ''}`} />
              </button>
              {selectedStudentIds.size > 0 && <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold text-blue-700">เลือกแล้ว {selectedStudentIds.size} รายการ</span>
                <button type="button" disabled={resolvedStudents.some((row) => selectedStudentIds.has(row.student.id) && Boolean(row.path))}
                  onClick={() => { setBulkSelection(defaultAcademicSelection(academicState)); setBulkConfirmed(false); setBulkOpen(true); }}
                  className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                  title="กำหนดกลุ่มเรียนให้เฉพาะนักศึกษาที่ยังไม่มีกลุ่ม">กำหนดกลุ่มเรียน</button>
              </div>}
            </div>
            {advancedFiltersOpen && (
              <div className="grid grid-cols-1 gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-2 xl:grid-cols-6">
                <AcademicSelect<AcademicFaculty> value={filters.facultyId} onChange={selectFilterFaculty} options={academicStructure} getValue={(item) => item.id} getLabel={(item) => item.name} placeholder="ทุกคณะ" />
                <AcademicSelect<AcademicDepartment> value={filters.departmentId} onChange={selectFilterDepartment} options={filterDepartments} getValue={(item) => item.id} getLabel={(item) => item.nameTh} placeholder="ทุกภาควิชา" disabled={!filters.facultyId} />
                <AcademicSelect<AcademicProgram> value={filters.programId} onChange={selectFilterProgram} options={filterPrograms} getValue={(item) => item.id} getLabel={(item) => `[${item.code}] ${item.nameTh}`} placeholder="ทุกสาขาวิชา" disabled={!filters.departmentId} />
                <AcademicSelect<{ id: string; label: string }> value={filters.yearLevel} onChange={selectFilterYear} options={filterYearLevels.map((year) => ({ id: String(year), label: `ชั้นปีที่ ${year}` }))} getValue={(item) => item.id} getLabel={(item) => item.label} placeholder="ทุกชั้นปี" disabled={!filters.programId} />
                <AcademicSelect<AcademicClassGroup> value={filters.groupId} onChange={(groupId) => setFilters((current) => ({ ...current, groupId }))} options={filterGroups} getValue={(item) => item.id} getLabel={(item) => item.code} placeholder="ทุกกลุ่มเรียน" disabled={!filters.yearLevel} />
                <button type="button" onClick={() => { setFilters({ ...defaultHierarchy, yearLevel: '', accountStatus: '', faceStatus: '' }); setSearch(''); setAssignmentFilter(''); }} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white"><RotateCcw className="h-4 w-4" /> ล้างตัวกรอง</button>
              </div>
            )}
          </section>
          <StudentTable rows={pagedStudents} isThai={isThai} grouped={false} selectable selectedIds={selectedStudentIds} selectAllRef={selectAllRef} onToggleSelection={toggleStudentSelection} onToggleCurrentPage={toggleCurrentPage} onSort={toggleSort} onView={setViewStudent} onEdit={(row) => openEdit(row.student)} onTransfer={openTransfer} onStatus={(row) => { setStatusTarget(row.student); setStatusReason(''); }} onDelete={(row) => setDeleteTarget(row.student)} />
        </>
      ) : (
        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="mb-4 flex flex-col justify-between gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Network className="h-5 w-5 text-blue-600" strokeWidth={1.75} /> ตัวกรองโครงสร้างการศึกษา</h2>
              <span className="text-[10px] text-slate-400">เลือก คณะ › ภาควิชา › สาขาวิชา › ชั้นปี › กลุ่มเรียน</span>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              <LabeledAcademicSelect<AcademicFaculty> step="1" label="คณะ" value={browse.facultyId} onChange={selectBrowseFaculty} options={academicStructure} getValue={(item) => item.id} getLabel={(item) => item.name} placeholder="ทุกคณะ" />
              <LabeledAcademicSelect<AcademicDepartment> step="2" label="ภาควิชา" value={browse.departmentId} onChange={selectBrowseDepartment} options={browseFaculty?.departments || []} getValue={(item) => item.id} getLabel={(item) => item.nameTh} disabled={!browse.facultyId} />
              <LabeledAcademicSelect<AcademicProgram> step="3" label="สาขาวิชา" value={browse.programId} onChange={selectBrowseProgram} options={browseDepartment?.programs || []} getValue={(item) => item.id} getLabel={(item) => `[${item.code}] ${item.nameTh}`} disabled={!browse.departmentId} />
              <LabeledAcademicSelect<{ id: string; label: string }> step="4" label="ชั้นปี" value={browse.yearLevel} onChange={selectBrowseYear} options={browseYearLevels.map((year) => ({ id: String(year), label: `ชั้นปีที่ ${year}` }))} getValue={(item) => item.id} getLabel={(item) => item.label} disabled={!browse.programId} />
              <LabeledAcademicSelect<AcademicClassGroup> step="5" label="กลุ่มเรียน" value={browse.groupId} onChange={(groupId) => setBrowse((current) => ({ ...current, groupId }))} options={browseGroups} getValue={(item) => item.id} getLabel={(item) => item.code} disabled={!browse.yearLevel} />
            </div>
          </div>

          {!browse.departmentId && <EmptyState text="กรุณาเลือกภาควิชา" />}
          {browse.departmentId && !browse.programId && <EmptyState text="กรุณาเลือกสาขาวิชา" />}
          {browse.programId && !browse.yearLevel && <EmptyState text="กรุณาเลือกชั้นปี" />}
          {browse.programId && browse.yearLevel && browseGroups.length === 0 && <EmptyState text="ไม่พบกลุ่มเรียนในชั้นปีที่เลือก" />}

          {browseProgram && browse.yearLevel && browseGroups.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Layers className="h-4 w-4 text-blue-600" /> กลุ่มเรียนชั้นปีที่ {browse.yearLevel} ในสาขาวิชา {browseProgram.code} <Badge variant="default">{browseGroups.length} กลุ่ม</Badge></h2><span className="text-[10px] text-slate-400">คลิกที่กลุ่มเพื่อดูรายชื่อนักศึกษา</span></div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {browseGroups.map((group) => {
                  const members = resolvedStudents.filter((row) => row.path?.group.id === group.id);
                  const active = members.filter((row) => row.student.accountStatus === 'active').length;
                  const suspended = members.filter((row) => row.student.accountStatus === 'suspended').length;
                  const inactive = members.filter((row) => row.student.accountStatus === 'graduated_inactive').length;
                  const faces = members.filter((row) => Boolean(row.student.faceReferenceUrl)).length;
                  const selected = browse.groupId === group.id;
                  return (
                    <button key={group.id} type="button" onClick={() => setBrowse((current) => ({ ...current, groupId: group.id }))} className={`cursor-pointer rounded-2xl border p-4 text-left transition hover:border-blue-400 hover:shadow-md ${selected ? 'border-blue-500 bg-blue-50/70 shadow-md shadow-blue-100' : 'border-slate-200 bg-white shadow-xs'}`}>
                      <div className="flex items-center justify-between"><div><strong className="text-base text-slate-900">{group.code}</strong><div className="text-[10px] text-slate-500">ชั้นปีที่ {group.yearLevel}</div></div><Badge variant={selected ? 'default' : 'neutral'}>{members.length} คน</Badge></div>
                      <div className="mt-4 space-y-1.5 text-[10px]"><GroupMetric color="bg-emerald-500" label="ปกติ" value={active} /><GroupMetric color="bg-red-500" label="ถูกระงับ" value={suspended} /><GroupMetric color="bg-slate-400" label="พ้นสภาพ" value={inactive} /><GroupMetric color="bg-violet-500" label="มีรูปใบหน้า" value={faces} suffix={`/${members.length}`} /></div>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600">ดูนักศึกษา <ChevronRight className="h-3.5 w-3.5" /></span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {browseGroup && browseFaculty && browseDepartment && browseProgram && (
            <>
              <nav className="flex flex-wrap items-center gap-1 text-xs text-gray-500" aria-label={isThai ? 'เส้นทางโครงสร้างการศึกษา' : 'Academic breadcrumb'}>
                <Crumb label={browseFaculty.name} onClick={() => setBrowse({ ...defaultHierarchy })} />
                <ChevronRight className="h-3.5 w-3.5" />
                <Crumb label={label(browseDepartment)} onClick={() => setBrowse({ ...defaultHierarchy, facultyId: browse.facultyId })} />
                <ChevronRight className="h-3.5 w-3.5" />
                <Crumb label={`${label(browseProgram)} (${browseProgram.code})`} onClick={() => setBrowse((current) => ({ ...current, yearLevel: '', groupId: '' }))} />
                <ChevronRight className="h-3.5 w-3.5" />
                <Crumb label={`ชั้นปีที่ ${browse.yearLevel}`} onClick={() => setBrowse((current) => ({ ...current, groupId: '' }))} />
                <ChevronRight className="h-3.5 w-3.5" /><strong className="text-gray-900">{browseGroup.code}</strong>
              </nav>
              <GroupSummary group={browseGroup} program={browseProgram} rows={groupStudents} onAdd={openCreateForGroup} onExport={() => exportStudentRows(groupStudents, `students-${browseGroup.code}.csv`)} />
              <div className="relative rounded-2xl border border-gray-200 bg-white p-3 shadow-xs">
                <Search className="absolute top-5 left-6 h-4 w-4 text-gray-400" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-xl border border-gray-200 py-2 pr-3 pl-9 text-xs focus:ring-2 focus:ring-blue-500" placeholder={isThai ? 'ค้นหานักศึกษาในกลุ่มด้วยรหัส ชื่อ หรืออีเมล...' : 'Search this group by code, name, or email...'} />
              </div>
              {groupStudents.length
                ? <StudentTable rows={pagedStudents} isThai={isThai} grouped onSort={toggleSort} onView={setViewStudent} onEdit={(row) => openEdit(row.student)} onTransfer={openTransfer} onStatus={(row) => { setStatusTarget(row.student); setStatusReason(''); }} onDelete={(row) => setDeleteTarget(row.student)} />
                : <EmptyState text={isThai ? 'ยังไม่มีนักศึกษาในกลุ่มเรียนนี้' : 'There are no students in this class group.'} />}
            </>
          )}
        </section>
      )}

      <Modal isOpen={bulkOpen} onClose={() => setBulkOpen(false)} title="กำหนดกลุ่มเรียน" maxWidth="640">
        <form className="space-y-4" onSubmit={(event) => {
          event.preventDefault();
          if (!bulkConfirmed) return;
          if (assignStudentsToClassGroup([...selectedStudentIds], bulkSelection.groupId).success) {
            setBulkOpen(false);
            setSelectedStudentIds(new Set());
          }
        }}>
          <p className="text-sm text-slate-600">นักศึกษาที่เลือก {selectedStudentIds.size} คน ต้องยังไม่มีกลุ่มเรียน และสังกัดกับชั้นปีต้องตรงกับกลุ่มปลายทาง</p>
          <ul className="max-h-36 overflow-y-auto rounded-xl bg-slate-50 p-3 text-xs">{students.filter((student) => selectedStudentIds.has(student.id)).map((student) => <li key={student.id} className="py-1">{student.studentCode} — {student.fullName}</li>)}</ul>
          <AcademicCascade value={bulkSelection} onChange={(next) => { setBulkSelection(next); setBulkConfirmed(false); }} />
          {bulkSelection.yearLevelId && !academicState.classGroups.some((g) => g.yearLevelId === bulkSelection.yearLevelId && isAcademicPathActive(academicState, 'classGroups', g.id)) && <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
            ยังไม่มีกลุ่มเรียน กรุณาสร้างกลุ่มเรียนก่อนเพิ่มนักศึกษา
            <button type="button" onClick={() => setActiveAdminRoute('ACADEMIC')} className="mt-2 block font-semibold text-blue-600">ไปจัดการคณะและกลุ่มเรียน</button>
          </div>}
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={bulkConfirmed} onChange={(event) => setBulkConfirmed(event.target.checked)} />ยืนยันการกำหนดกลุ่มเรียนให้นักศึกษาที่เลือกทั้งหมด</label>
          <ModalActions isThai={isThai} onCancel={() => setBulkOpen(false)} submitLabel="ยืนยันการกำหนดกลุ่ม" disabled={!bulkConfirmed || !bulkSelection.groupId} />
        </form>
      </Modal>

      {visibleStudents.length > 0 && (
        <Pagination page={page} totalPages={totalPages} count={visibleStudents.length} pageSize={pageSize} isThai={isThai} onChange={setPage} />
      )}

      <Modal isOpen={createOpen || Boolean(editStudent)} onClose={() => { setCreateOpen(false); setEditStudent(null); }} title={editStudent ? (isThai ? 'แก้ไขข้อมูลนักศึกษา' : 'Edit Student') : (isThai ? 'เพิ่มนักศึกษา' : 'Add Student')} maxWidth="xl">
        <StudentForm existingStudent={editStudent} form={form} setForm={setForm} isThai={isThai} onSubmit={saveStudent} onCancel={() => { setCreateOpen(false); setEditStudent(null); }} />
      </Modal>

      <Modal isOpen={Boolean(viewStudent)} onClose={() => setViewStudent(null)} title={isThai ? 'รายละเอียดนักศึกษา' : 'Student Details'} maxWidth="lg">
        {viewStudent && <StudentDetails row={viewStudent} isThai={isThai} />}
      </Modal>

      <Modal isOpen={Boolean(statusTarget)} onClose={() => setStatusTarget(null)} title={isThai ? 'เปลี่ยนสถานะบัญชี' : 'Change Account Status'} maxWidth="md">
        {statusTarget && (
          <form onSubmit={(event) => { event.preventDefault(); const next = statusTarget.accountStatus === 'active' ? 'suspended' : 'active'; updateAccountStatus(statusTarget.id, next, statusReason.trim() || undefined); setStatusTarget(null); }} className="space-y-4 text-xs">
            <p className="rounded-xl bg-amber-50 p-4 text-amber-900">{statusTarget.accountStatus === 'active' ? (isThai ? `ยืนยันระงับสิทธิ์ ${statusTarget.fullName}` : `Suspend ${statusTarget.fullName}?`) : (isThai ? `ยืนยันเปิดใช้งาน ${statusTarget.fullName}` : `Reactivate ${statusTarget.fullName}?`)}</p>
            {statusTarget.accountStatus === 'active' && <label className="block space-y-1 font-semibold text-gray-700"><span>{isThai ? 'เหตุผลการระงับสิทธิ์' : 'Suspension reason'}</span><input required value={statusReason} onChange={(event) => setStatusReason(event.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2 font-normal" /></label>}
            <ModalActions isThai={isThai} onCancel={() => setStatusTarget(null)} submitLabel={isThai ? 'ยืนยัน' : 'Confirm'} />
          </form>
        )}
      </Modal>

      <Modal isOpen={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title={isThai ? 'ยืนยันการลบนักศึกษา' : 'Delete Student'} maxWidth="sm">
        {deleteTarget && <div className="space-y-4 text-xs"><p className="rounded-xl bg-red-50 p-4 text-red-900">{isThai ? `ต้องการลบ ${deleteTarget.fullName} หรือไม่` : `Delete ${deleteTarget.fullName}?`}</p><div className="flex justify-end gap-2"><button type="button" onClick={() => setDeleteTarget(null)} className="rounded-xl border border-gray-300 px-4 py-2 font-semibold">{isThai ? 'ยกเลิก' : 'Cancel'}</button><button type="button" onClick={deleteSelected} className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white">{isThai ? 'ลบนักศึกษา' : 'Delete Student'}</button></div></div>}
      </Modal>

      <Modal isOpen={Boolean(transferTarget)} onClose={() => setTransferTarget(null)} title={isThai ? 'ย้ายกลุ่มเรียน' : 'Transfer Class Group'} maxWidth="lg">
        {transferTarget && !transferConfirm && (
          <form onSubmit={(event) => { event.preventDefault(); setTransferConfirm(true); }} className="space-y-4 text-xs">
            <div className="rounded-xl bg-blue-50 p-4"><strong>{transferTarget.student.fullName}</strong><div className="mt-1 text-blue-700">{isThai ? 'กลุ่มปัจจุบัน' : 'Current group'}: {transferTarget.classGroup}</div></div>
            <TransferSelectors selection={transfer} setSelection={setTransfer} isThai={isThai} studentCode={transferTarget.student.studentCode} currentGroupId={transferTarget.path?.group.id} />
            <label className="block space-y-1 font-semibold text-gray-700"><span>{isThai ? 'เหตุผลในการย้าย' : 'Transfer reason'}</span><textarea required value={transferReason} onChange={(event) => setTransferReason(event.target.value)} rows={3} className="w-full rounded-xl border border-gray-300 px-3 py-2 font-normal" /></label>
            <ModalActions isThai={isThai} onCancel={() => setTransferTarget(null)} submitLabel={isThai ? 'ตรวจสอบและยืนยัน' : 'Review Transfer'} disabled={!transfer.groupId || transfer.groupId === transferTarget.path?.group.id || !transferReason.trim()} />
          </form>
        )}
        {transferTarget && transferConfirm && (() => {
          const destination = findAcademicPathByGroup(transfer.groupId, academicStructure);
          return <div className="space-y-4 text-xs"><p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">{isThai ? `ยืนยันการย้าย ${transferTarget.student.fullName} จากกลุ่ม ${transferTarget.classGroup} ไปยังกลุ่ม ${destination?.group.code} หรือไม่` : `Transfer ${transferTarget.student.fullName} from ${transferTarget.classGroup} to ${destination?.group.code}?`}</p><div className="rounded-xl bg-gray-50 p-3 text-gray-600"><strong>{isThai ? 'เหตุผล' : 'Reason'}:</strong> {transferReason.trim()}</div><div className="flex justify-end gap-2"><button type="button" onClick={() => setTransferConfirm(false)} className="rounded-xl border border-gray-300 px-4 py-2 font-semibold">{isThai ? 'ย้อนกลับ' : 'Back'}</button><button type="button" onClick={executeTransfer} className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white">{isThai ? 'ยืนยันการย้าย' : 'Confirm Transfer'}</button></div></div>;
        })()}
      </Modal>
    </div>
  );
};

interface SelectableAcademicItem {
  id?: string;
  code?: string;
  label?: string;
  name?: string;
  nameTh?: string;
  nameEn?: string;
}

interface AcademicSelectProps<T extends SelectableAcademicItem> {
  value: string;
  onChange: (value: string) => void;
  options: T[];
  getValue: (item: T) => string;
  getLabel: (item: T) => string;
  placeholder?: string;
  allowEmpty?: boolean;
  disabled?: boolean;
}

const AcademicSelect = <T extends SelectableAcademicItem,>({ value, onChange, options, getValue, getLabel, placeholder = '', allowEmpty = true, disabled }: AcademicSelectProps<T>) => (
  <span className="relative block min-w-0">
    <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="h-10 w-full min-w-0 appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-9 text-xs disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400">
      {allowEmpty && <option value="">{placeholder}</option>}{options.map((item) => <option key={getValue(item)} value={getValue(item)}>{getLabel(item)}</option>)}
    </select>
    <ChevronDown className="pointer-events-none absolute top-3 right-3 h-4 w-4 text-slate-400" strokeWidth={1.75} />
  </span>
);

const LabeledAcademicSelect = <T extends SelectableAcademicItem,>({ step, label, ...props }: AcademicSelectProps<T> & { step: string; label: string }) => (
  <label className="space-y-1.5 text-xs font-semibold text-gray-700"><span>{step}. {label}</span><AcademicSelect {...props} placeholder={`— ${label} —`} /></label>
);

const ViewToggleButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ElementType; label: string }> = ({ active, onClick, icon: Icon, label }) => (
  <button type="button" onClick={onClick} className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${active ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-white/70'}`} aria-pressed={active}><Icon className="h-4 w-4" strokeWidth={1.75} />{label}</button>
);

const EmptyState: React.FC<{ text: string }> = ({ text }) => <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center text-sm text-gray-500"><GraduationCap className="mx-auto mb-3 h-9 w-9 text-gray-300" />{text}</div>;

const Crumb: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => <button type="button" onClick={onClick} className="cursor-pointer hover:text-blue-700 hover:underline">{label}</button>;

const GroupMetric: React.FC<{ color: string; label: string; value: number; suffix?: string }> = ({ color, label, value, suffix = '' }) => <div className="flex items-center gap-2"><span className={`h-1.5 w-1.5 rounded-full ${color}`} /><span className="text-slate-600">{label}</span><strong className="ml-auto text-slate-900">{value}{suffix}</strong></div>;

const GroupSummary: React.FC<{ group: AcademicClassGroup; program: AcademicProgram; rows: ResolvedStudent[]; onAdd: () => void; onExport: () => void }> = ({ group, program, rows, onAdd, onExport }) => {
  const active = rows.filter((row) => row.student.accountStatus === 'active').length;
  const suspended = rows.filter((row) => row.student.accountStatus === 'suspended').length;
  const inactive = rows.filter((row) => row.student.accountStatus === 'graduated_inactive').length;
  const faces = rows.filter((row) => Boolean(row.student.faceReferenceUrl)).length;
  return <section className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5"><div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold text-gray-900">กลุ่ม {group.code}</h2><Badge variant="default">ชั้นปีที่ {group.yearLevel}</Badge><Badge variant="neutral">{program.nameTh}</Badge></div><div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-slate-600"><span>นักศึกษาในกลุ่ม: <strong>{rows.length} คน</strong></span><span className="text-emerald-700">ปกติ: <strong>{active}</strong></span><span className="text-red-700">ถูกระงับ: <strong>{suspended}</strong></span><span>พ้นสภาพ: <strong>{inactive}</strong></span><span className="text-violet-700">มีข้อมูลใบหน้า: <strong>{faces}/{rows.length}</strong></span></div></div><div className="flex flex-wrap gap-2"><button type="button" onClick={onAdd} className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700"><Plus className="h-4 w-4" /> เพิ่มนักศึกษาในกลุ่มนี้</button><button type="button" onClick={onExport} disabled={!rows.length} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 disabled:opacity-40"><Download className="h-4 w-4" /> ส่งออกรายชื่อ</button></div></div></section>;
};

interface StudentTableProps {
  rows: ResolvedStudent[];
  isThai: boolean;
  grouped: boolean;
  selectable?: boolean;
  selectedIds?: Set<string>;
  selectAllRef?: React.RefObject<HTMLInputElement | null>;
  onToggleSelection?: (studentId: string) => void;
  onToggleCurrentPage?: () => void;
  onSort: (key: SortKey) => void;
  onView: (row: ResolvedStudent) => void;
  onEdit: (row: ResolvedStudent) => void;
  onTransfer?: (row: ResolvedStudent) => void;
  onStatus: (row: ResolvedStudent) => void;
  onDelete: (row: ResolvedStudent) => void;
}

const StudentTable: React.FC<StudentTableProps> = ({ rows, grouped, selectable = false, selectedIds = new Set(), selectAllRef, onToggleSelection, onToggleCurrentPage, onSort, onView, onEdit, onTransfer, onStatus, onDelete }) => {
  const sortable = (key: SortKey, title: string) => <button type="button" onClick={() => onSort(key)} className="cursor-pointer font-semibold hover:text-blue-700">{title} ↕</button>;
  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.student.id));
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              {selectable && <th className="w-10 px-4 py-3"><input ref={selectAllRef} type="checkbox" checked={allSelected} onChange={onToggleCurrentPage} aria-label="เลือกนักศึกษาทั้งหมดในหน้านี้" className="h-4 w-4 rounded border-slate-300" /></th>}
              <th className="px-4 py-3">{sortable('studentCode', 'รหัสนักศึกษา')}</th>
              <th className="px-4 py-3">{sortable('fullName', 'ชื่อ-นามสกุล')}</th>
              <th className="px-4 py-3">อีเมลสถาบัน</th>
              {!grouped && <th className="px-4 py-3">คณะ / ภาควิชา</th>}
              {!grouped && <th className="px-4 py-3">{sortable('classGroup', 'สาขา / กลุ่มเรียน')}</th>}
              <th className="px-4 py-3">{sortable('yearLevel', 'ชั้นปี')}</th>
              <th className="px-4 py-3">ข้อมูลใบหน้า</th>
              <th className="px-4 py-3">{sortable('accountStatus', 'สถานะบัญชี')}</th>
              <th className="px-4 py-3 text-right">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.student.id} className={selectedIds.has(row.student.id) ? 'bg-blue-50/60' : 'hover:bg-slate-50/70'}>
                {selectable && <td className="px-4 py-3"><input type="checkbox" checked={selectedIds.has(row.student.id)} onChange={() => onToggleSelection?.(row.student.id)} aria-label={`เลือก ${row.student.fullName}`} className="h-4 w-4 rounded border-slate-300" /></td>}
                <td className="px-4 py-3 font-mono font-semibold text-slate-900">{row.student.studentCode}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{row.student.fullName}</td>
                <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{row.student.email}</td>
                {!grouped && <td className="px-4 py-3"><div className="font-medium text-slate-800">{row.path?.department.nameTh || row.student.department}</div><div className="text-[10px] text-slate-400">{row.path?.faculty.name || row.student.faculty}</div></td>}
                {!grouped && <td className="px-4 py-3"><Badge variant={row.path ? 'default' : 'neutral'}>{row.classGroup}</Badge></td>}
                <td className="px-4 py-3 text-center font-semibold">{calculateStudentYearLevel(row.student.studentCode)?.formattedYearLevel || '—'}</td>
                <td className="px-4 py-3"><div className="flex items-center gap-2">{row.student.faceReferenceUrl ? <img src={row.student.faceReferenceUrl} alt="" className="h-7 w-7 rounded-full border border-violet-300 object-cover" /> : <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-400">?</span>}<Badge variant={row.student.faceReferenceUrl ? 'purple' : 'warning'}>{row.student.faceReferenceUrl ? 'มีข้อมูล' : 'ยังไม่มีข้อมูล'}</Badge></div></td>
                <td className="px-4 py-3"><AccountStatusBadge status={row.student.accountStatus} /></td>
                <td className="px-4 py-3"><div className="flex justify-end gap-0.5"><ActionButton title="ดูรายละเอียดนักศึกษา" onClick={() => onView(row)} icon={Eye} /><ActionButton title="ย้ายกลุ่มเรียน" onClick={() => onTransfer?.(row)} icon={ArrowRightLeft} color="text-blue-600" /><ActionButton title="แก้ไขข้อมูล" onClick={() => onEdit(row)} icon={Pencil} /><ActionButton title={row.student.accountStatus === 'active' ? 'ระงับบัญชี' : 'เปิดใช้งานบัญชี'} onClick={() => onStatus(row)} icon={row.student.accountStatus === 'active' ? AlertTriangle : UserCheck} color="text-amber-600" /><ActionButton title="ลบนักศึกษา" onClick={() => onDelete(row)} icon={Trash2} color="text-red-600" /></div></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={selectable ? 10 : 7} className="px-6 py-12 text-center text-slate-400">ไม่พบนักศึกษาที่ตรงกับเงื่อนไข</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ActionButton: React.FC<{ title: string; onClick: () => void; icon: React.ElementType; color?: string }> = ({ title, onClick, icon: Icon, color = 'text-slate-500' }) => <button type="button" onClick={onClick} title={title} aria-label={title} className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 ${color}`}><Icon className="h-4 w-4" strokeWidth={1.75} /></button>;

const Pagination: React.FC<{ page: number; totalPages: number; count: number; pageSize: number; isThai: boolean; onChange: (page: number) => void }> = ({ page, totalPages, count, pageSize, isThai, onChange }) => <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs"><span className="text-gray-500">{isThai ? `แสดง ${(page - 1) * pageSize + 1} - ${Math.min(page * pageSize, count)} จากทั้งหมด ${count} รายการ` : `Showing ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, count)} of ${count}`}</span><div className="flex items-center gap-2"><button type="button" disabled={page === 1} onClick={() => onChange(page - 1)} className="rounded-lg border border-gray-200 p-1.5 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><span>{page} / {totalPages}</span><button type="button" disabled={page === totalPages} onClick={() => onChange(page + 1)} className="rounded-lg border border-gray-200 p-1.5 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div>;

const StudentDetails: React.FC<{ row: ResolvedStudent; isThai: boolean }> = ({ row, isThai }) => <div className="space-y-3 text-xs">{[[isThai ? 'รหัสนักศึกษา' : 'Student Code', row.student.studentCode], [isThai ? 'ชื่อ-นามสกุล' : 'Full Name', row.student.fullName], [isThai ? 'อีเมลมหาวิทยาลัย' : 'University Email', row.student.email], [isThai ? 'คณะ' : 'Faculty', row.path?.faculty.name || row.student.faculty], [isThai ? 'ภาควิชา' : 'Department', row.path ? (isThai ? row.path.department.nameTh : row.path.department.nameEn) : row.student.department], [isThai ? 'สาขาวิชา' : 'Program', `${row.programName} (${row.programCode})`], [isThai ? 'กลุ่มเรียน' : 'Class Group', row.classGroup], ['ปีการศึกษาที่เข้า', String(calculateStudentYearLevel(row.student.studentCode)?.admissionYear || '—')], ['ชั้นปีปัจจุบัน', calculateStudentYearLevel(row.student.studentCode)?.formattedYearLevel || '—'], ['คำนวณจากปีการศึกษาปัจจุบัน', String(academicSettings.currentAcademicYear)]].map(([title, value]) => <div key={title} className="flex justify-between gap-4 border-b border-gray-100 pb-2"><span className="text-gray-500">{title}</span><strong className="text-right text-gray-900">{value}</strong></div>)}</div>;

const StudentForm: React.FC<{ existingStudent: Student | null; form: StudentFormState; setForm: React.Dispatch<React.SetStateAction<StudentFormState>>; isThai: boolean; onSubmit: (event: React.FormEvent) => void; onCancel: () => void }> = ({ existingStudent, form, setForm, isThai, onSubmit, onCancel }) => {
  const { academicState, setActiveAdminRoute } = useApp();
  const calculation = calculateStudentYearLevel(form.studentCode);
  const selectedGroup = academicState.classGroups.find((g) => g.id === form.groupId);
  useEffect(() => {
    const yearLevel = calculation?.yearLevel || 0;
    const compatible = !selectedGroup || selectedGroup.admissionYear === calculation?.admissionYear;
    if (form.yearLevel !== yearLevel || !compatible) setForm((current) => ({
      ...current, yearLevel, groupId: compatible ? current.groupId : '',
    }));
  }, [form.studentCode, form.yearLevel, selectedGroup, calculation?.yearLevel, calculation?.admissionYear, setForm]);
  const selection: AcademicSelection = {
    facultyId: form.facultyId, departmentId: form.departmentId, programId: form.programId,
    yearLevelId: academicState.yearLevels.find((y) => y.programId === form.programId && y.level === calculation?.yearLevel)?.id || '',
    groupId: form.groupId,
  };
  const existingYear = academicState.yearLevels.find((y) => y.programId === existingStudent?.programId && y.level === (existingStudent?.yearLevel || existingStudent?.year));
  const retained = existingStudent ? {
    facultyId: existingStudent.facultyId || '', departmentId: existingStudent.departmentId || '', programId: existingStudent.programId || '',
    yearLevelId: existingStudent.yearLevelId || existingYear?.id || '', groupId: existingStudent.classGroupId || '',
  } : undefined;
  const ready = Boolean(calculation?.isValid && selectedGroup?.admissionYear === calculation.admissionYear && form.groupId && (isAcademicPathActive(academicState, 'classGroups', form.groupId) || form.groupId === existingStudent?.classGroupId));
  const groups = academicState.classGroups.filter((g) => g.yearLevelId === selection.yearLevelId && isAcademicPathActive(academicState, 'classGroups', g.id));
  return (
    <form onSubmit={onSubmit} className="space-y-5 text-xs">
      <FormSection title={isThai ? 'ข้อมูลส่วนบุคคล' : 'Personal Information'}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label={isThai ? 'รหัสนักศึกษา' : 'Student Code'} value={form.studentCode} onChange={(studentCode) => setForm((current) => ({ ...current, studentCode }))} />
          <TextField label={isThai ? 'ชื่อ' : 'First Name'} value={form.firstName} onChange={(firstName) => setForm((current) => ({ ...current, firstName }))} />
          <TextField label={isThai ? 'นามสกุล' : 'Last Name'} value={form.lastName} onChange={(lastName) => setForm((current) => ({ ...current, lastName }))} />
          <TextField label={isThai ? 'อีเมลมหาวิทยาลัย' : 'University Email'} value={form.email} type="email" onChange={(email) => setForm((current) => ({ ...current, email }))} />
        </div>
      </FormSection>

      <FormSection title="ข้อมูลการศึกษา">
        {existingStudent?.classGroupId && academicState.classGroups.find((group) => group.id === existingStudent.classGroupId)?.admissionYear !== calculation?.admissionYear && !form.groupId && <p role="alert" className="mb-3 text-amber-700">ชั้นปีที่คำนวณใหม่ไม่ตรงกับกลุ่มเรียนเดิม กรุณาเลือกกลุ่มเรียนใหม่</p>}
        <AcademicCascade value={selection} studentCode={form.studentCode} retained={retained} onChange={(next) => setForm((current) => ({
          ...current, facultyId: next.facultyId, departmentId: next.departmentId, programId: next.programId,
          yearLevel: academicState.yearLevels.find((y) => y.id === next.yearLevelId)?.level || 0, groupId: next.groupId,
        }))} />
        {selection.yearLevelId && !groups.length && !ready && <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
          ยังไม่มีกลุ่มเรียน กรุณาสร้างกลุ่มเรียนก่อนเพิ่มนักศึกษา
          <button type="button" onClick={() => setActiveAdminRoute('ACADEMIC')} className="mt-2 block font-semibold text-blue-600">ไปจัดการคณะและกลุ่มเรียน</button>
        </div>}
      </FormSection>

      <FormSection title={isThai ? 'ข้อมูลความปลอดภัยและสถานะ' : 'Security & Status'}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label={isThai ? 'URL ภาพใบหน้าอ้างอิง (ไม่บังคับ)' : 'Face reference URL (optional)'} value={form.faceReferenceUrl} required={false} onChange={(faceReferenceUrl) => setForm((current) => ({ ...current, faceReferenceUrl }))} />
          <label className="space-y-1.5 font-semibold text-gray-700">
            <span>{isThai ? 'สถานะบัญชี' : 'Account Status'}</span>
            <select value={form.accountStatus} onChange={(event) => setForm((current) => ({ ...current, accountStatus: event.target.value as AccountStatus }))} className="w-full rounded-xl border border-gray-200 px-3 py-2">
              <option value="active">{isThai ? 'ปกติ' : 'Active'}</option>
              <option value="suspended">{isThai ? 'ถูกระงับ' : 'Suspended'}</option>
              <option value="graduated_inactive">{isThai ? 'พ้นสภาพ' : 'Terminated'}</option>
            </select>
          </label>
        </div>
        {form.faceReferenceUrl ? (
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-emerald-50 p-3">
            <img src={form.faceReferenceUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
            <Badge variant="success">{isThai ? 'มีข้อมูลภาพใบหน้าแล้ว' : 'Face reference available'}</Badge>
          </div>
        ) : (
          <div className="mt-3"><Badge variant="warning">{isThai ? 'ยังไม่มีข้อมูลภาพใบหน้า' : 'Face reference missing'}</Badge></div>
        )}
      </FormSection>
      <ModalActions isThai={isThai} onCancel={onCancel} submitLabel={isThai ? 'บันทึกข้อมูลนักศึกษา' : 'Save Student'} disabled={!calculation?.isValid || (!ready && !(existingStudent && !existingStudent.classGroupId && form.programId === existingStudent.programId && form.yearLevel === (existingStudent.yearLevel || existingStudent.year)))} />
    </form>
  );
};

const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => <section className="rounded-2xl border border-gray-200 p-4"><h3 className="mb-3 text-sm font-bold text-gray-900">{title}</h3>{children}</section>;
const TextField: React.FC<{ label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }> = ({ label, value, onChange, type = 'text', required = true }) => <label className="space-y-1.5 font-semibold text-gray-700"><span>{label}</span><input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 font-normal" /></label>;
const ModalActions: React.FC<{ isThai: boolean; onCancel: () => void; submitLabel: string; disabled?: boolean }> = ({ isThai, onCancel, submitLabel, disabled }) => <div className="flex justify-end gap-2 border-t border-gray-100 pt-4"><button type="button" onClick={onCancel} className="rounded-xl border border-gray-300 px-4 py-2 font-semibold">{isThai ? 'ยกเลิก' : 'Cancel'}</button><button type="submit" disabled={disabled} className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{submitLabel}</button></div>;

const TransferSelectors: React.FC<{ selection: HierarchySelection; setSelection: React.Dispatch<React.SetStateAction<HierarchySelection>>; isThai: boolean; studentCode: string; currentGroupId?: string }> = ({ selection, setSelection, currentGroupId, studentCode }) => {
  const { academicState, setActiveAdminRoute } = useApp();
  const yearLevelId = academicState.yearLevels.find((y) => y.programId === selection.programId && y.level === calculateStudentYearLevel(studentCode)?.yearLevel)?.id || '';
  const value = { ...selection, yearLevelId };
  const groups = academicState.classGroups.filter((g) => g.yearLevelId === yearLevelId && g.id !== currentGroupId && isAcademicPathActive(academicState, 'classGroups', g.id));
  return <div className="space-y-3">
    <AcademicCascade value={value} studentCode={studentCode} excludeGroupId={currentGroupId} onChange={(next) => setSelection({
      facultyId: next.facultyId, departmentId: next.departmentId, programId: next.programId,
      yearLevel: String(academicState.yearLevels.find((y) => y.id === next.yearLevelId)?.level || ''), groupId: next.groupId,
    })} />
    {yearLevelId && !groups.length && <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
      ยังไม่มีกลุ่มเรียน กรุณาสร้างกลุ่มเรียนก่อนเพิ่มนักศึกษา
      <button type="button" onClick={() => setActiveAdminRoute('ACADEMIC')} className="mt-2 block font-semibold text-blue-600">ไปจัดการคณะและกลุ่มเรียน</button>
    </div>}
  </div>;
};
