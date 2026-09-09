import { Student } from '../types';
import { AcademicInput, AcademicRecord, AcademicState, AcademicTier } from '../types/academic';
import { academicStructure, AcademicFaculty, legacyStudentAcademicAssignments, resolveAcademicGroupId } from '../data/academicStructure';

export const academicLabels: Record<AcademicTier, string> = {
  faculties: 'คณะ', departments: 'ภาควิชา', programs: 'สาขาวิชา', yearLevels: 'ชั้นปี', classGroups: 'กลุ่มเรียน',
};

// Preserve existing program and group IDs; only the faculty receives a new internal key.
export const createInitialAcademicState = (): AcademicState => {
  const state: AcademicState = { faculties: [], departments: [], programs: [], yearLevels: [], classGroups: [] };
  const common = { status: 'active' as const, updatedAt: '2026-09-09T00:00:00.000Z' };
  for (const faculty of academicStructure) {
    state.faculties.push({ ...common, id: faculty.id, name: faculty.name });
    for (const department of faculty.departments) {
      state.departments.push({ ...common, id: department.id, facultyId: faculty.id, name: department.nameTh });
      for (const program of department.programs) {
        state.programs.push({ ...common, id: program.id, departmentId: department.id, code: program.code, name: program.nameTh });
        for (const level of new Set([1, 2, 3, 4, ...program.classGroups.map((group) => group.yearLevel)])) {
          state.yearLevels.push({ ...common, id: `year_${program.id}_${level}`, programId: program.id, level, name: `ชั้นปีที่ ${level}` });
        }
        for (const group of program.classGroups) {
          state.classGroups.push({ ...common, id: group.id, code: group.code, programId: program.id, yearLevelId: `year_${program.id}_${group.yearLevel}` });
        }
      }
    }
  }
  return state;
};

export const academicPath = (state: AcademicState, tier: AcademicTier, id: string) => {
  const group = tier === 'classGroups' ? state.classGroups.find((item) => item.id === id) : undefined;
  const year = state.yearLevels.find((item) => item.id === (tier === 'yearLevels' ? id : group?.yearLevelId));
  const program = state.programs.find((item) => item.id === (tier === 'programs' ? id : group?.programId || year?.programId));
  const department = state.departments.find((item) => item.id === (tier === 'departments' ? id : program?.departmentId));
  const faculty = state.faculties.find((item) => item.id === (tier === 'faculties' ? id : department?.facultyId));
  return { faculty, department, program, year, group };
};

export const isAcademicPathActive = (state: AcademicState, tier: AcademicTier, id: string): boolean => {
  const path = academicPath(state, tier, id);
  const required = {
    faculties: [path.faculty],
    departments: [path.faculty, path.department],
    programs: [path.faculty, path.department, path.program],
    yearLevels: [path.faculty, path.department, path.program, path.year],
    classGroups: [path.faculty, path.department, path.program, path.year, path.group],
  }[tier];
  return required.every((record) => record?.status === 'active');
};

export const toAcademicHierarchy = (state: AcademicState, activeOnly = false): AcademicFaculty[] =>
  state.faculties.filter((f) => !activeOnly || f.status === 'active').map((faculty) => ({
    ...faculty,
    departments: state.departments.filter((d) => d.facultyId === faculty.id && (!activeOnly || d.status === 'active')).map((department) => ({
      ...department, nameTh: department.name, nameEn: department.name,
      programs: state.programs.filter((p) => p.departmentId === department.id && (!activeOnly || p.status === 'active')).map((program) => ({
        ...program, nameTh: program.name, nameEn: program.name,
        yearLevels: state.yearLevels.filter((y) => y.programId === program.id && (!activeOnly || y.status === 'active')),
        classGroups: state.classGroups.filter((g) => g.programId === program.id && (!activeOnly || isAcademicPathActive(state, 'classGroups', g.id))).map((group) => ({
          ...group, yearLevel: state.yearLevels.find((y) => y.id === group.yearLevelId)?.level || 0,
        })),
      })),
    })),
  }));

export const studentAcademicFields = (state: AcademicState, student: Student): Partial<Student> => {
  const group = state.classGroups.find((g) => g.id === student.classGroupId);
  const year = state.yearLevels.find((y) => y.id === (group?.yearLevelId || student.yearLevelId));
  const program = state.programs.find((p) => p.id === (group?.programId || year?.programId || student.programId));
  const department = state.departments.find((d) => d.id === (program?.departmentId || student.departmentId));
  const faculty = state.faculties.find((f) => f.id === (department?.facultyId || student.facultyId));
  return {
    ...(faculty && { facultyId: faculty.id, faculty: faculty.name }),
    ...(department && { departmentId: department.id, department: department.name }),
    ...(program && { programId: program.id, programCode: program.code, program: program.name }),
    ...(year && { yearLevelId: year.id, yearLevel: year.level, year: year.level }),
    ...(group && { classGroupId: group.id, classGroup: group.code }),
  };
};

export const migrateAcademicStudents = (students: Student[], state: AcademicState): Student[] =>
  students.map((student) => {
    // An explicit empty group represents an unassigned student, never a seed fallback.
    const groupId = resolveAcademicGroupId(student.classGroupId === undefined
      ? legacyStudentAcademicAssignments[student.id] : student.classGroupId);
    const group = state.classGroups.find((g) => g.id === groupId) ||
      (student.classGroupId === undefined ? state.classGroups.find((g) => g.code.toLowerCase() === student.classGroup?.toLowerCase()) : undefined);
    const program = state.programs.find((p) => p.id === student.programId || (student.programId === 'prog_001' && p.id === 'program_inet'));
    const department = state.departments.find((d) => d.id === student.departmentId || (student.departmentId === 'dep_001' && d.id === 'department_it'));
    const faculty = state.faculties.find((f) => f.id === student.facultyId || f.name === student.faculty);
    const migrated = {
      ...student, classGroupId: group?.id || '', classGroup: group?.code || '',
      programId: program?.id || student.programId, departmentId: department?.id || student.departmentId,
      facultyId: faculty?.id || student.facultyId,
    };
    const fields = studentAcademicFields(state, migrated);
    const year = state.yearLevels.find((y) => y.programId === fields.programId && y.level === (fields.yearLevel || student.yearLevel || student.year));
    return { ...migrated, ...fields, ...(year && { yearLevelId: year.id }) };
  });

export const studentsInAcademicRecord = (state: AcademicState, students: Student[], tier: AcademicTier, id: string) =>
  students.filter((student) => {
    const normalized = { ...student, ...studentAcademicFields(state, student) };
    if (tier === 'faculties') return normalized.facultyId === id;
    if (tier === 'departments') return normalized.departmentId === id;
    if (tier === 'programs') return normalized.programId === id;
    if (tier === 'yearLevels') {
      const year = state.yearLevels.find((y) => y.id === id);
      return normalized.yearLevelId === id || (year?.programId === normalized.programId && year?.level === normalized.yearLevel);
    }
    return normalized.classGroupId === id;
  });

export const academicDeleteError = (state: AcademicState, students: Student[], tier: AcademicTier, id: string): string | undefined => {
  const hasChildren = tier === 'faculties' ? state.departments.some((d) => d.facultyId === id)
    : tier === 'departments' ? state.programs.some((p) => p.departmentId === id)
      : tier === 'programs' ? state.yearLevels.some((y) => y.programId === id) || state.classGroups.some((g) => g.programId === id)
        : tier === 'yearLevels' ? state.classGroups.some((g) => g.yearLevelId === id) : false;
  if (hasChildren) return `ไม่สามารถลบ${academicLabels[tier]}นี้ได้ เนื่องจากยังมีข้อมูลภายใน กรุณาลบหรือย้ายข้อมูลที่เกี่ยวข้องก่อน หรือเลือกปิดใช้งาน`;
  if (studentsInAcademicRecord(state, students, tier, id).length) {
    return `ไม่สามารถลบ${academicLabels[tier]}นี้ได้ เนื่องจากยังมีนักศึกษาอยู่ กรุณาย้ายนักศึกษาไปยังกลุ่มอื่นก่อน หรือเลือกปิดใช้งาน`;
  }
};

export const normalizeAcademicInput = (input: AcademicInput): AcademicInput => ({
  ...input, name: input.name.trim(), code: input.code.trim().toUpperCase(),
});

export const validateAcademicInput = (state: AcademicState, tier: AcademicTier, input: AcademicInput, id?: string): string | undefined => {
  const existing = state[tier].find((r) => r.id === id);
  if (id && !existing) return 'ไม่พบข้อมูลที่ต้องการแก้ไข';
  if (input.status !== 'active' && input.status !== 'inactive') return 'สถานะไม่ถูกต้อง';
  const name = input.name || (tier === 'yearLevels' ? `ชั้นปีที่ ${input.level}` : '');
  if (tier !== 'classGroups' && (!name || name.length > 150)) return 'กรุณากรอกชื่อ 1–150 ตัวอักษร';
  if (tier === 'programs' && !/^[A-Z0-9]+$/.test(input.code)) return 'รหัสสาขาวิชาต้องเป็นอักษรอังกฤษ A–Z หรือตัวเลข 0–9';
  if (tier === 'classGroups' && (!/^[A-Z0-9_-]+$/.test(input.code) || input.code.length > 100)) return 'รหัสกลุ่มเรียนต้องเป็นอักษรอังกฤษ ตัวเลข ขีดกลาง หรือขีดล่าง ไม่เกิน 100 ตัวอักษร';
  if (tier === 'yearLevels' && (!Number.isSafeInteger(input.level) || input.level < 1)) return 'ลำดับชั้นปีต้องเป็นจำนวนเต็มบวก';
  const parentTier: AcademicTier | undefined = { faculties: undefined, departments: 'faculties', programs: 'departments', yearLevels: 'programs', classGroups: 'yearLevels' }[tier] as AcademicTier | undefined;
  const parentId = { faculties: '', departments: input.facultyId, programs: input.departmentId, yearLevels: input.programId, classGroups: input.yearLevelId }[tier];
  if (parentTier && !state[parentTier].some((r) => r.id === parentId)) return 'กรุณาเลือกข้อมูลต้นสังกัดให้ครบถ้วน';
  if (tier === 'classGroups' && state.yearLevels.find((y) => y.id === input.yearLevelId)?.programId !== input.programId) return 'ชั้นปีไม่ตรงกับสาขาวิชาที่เลือก';
  if (parentTier && !isAcademicPathActive(state, parentTier, parentId)) {
    const oldPath = id ? academicPath(state, tier, id) : undefined;
    const previousParent = { faculties: '', departments: oldPath?.faculty?.id, programs: oldPath?.department?.id, yearLevels: oldPath?.program?.id, classGroups: oldPath?.year?.id }[tier];
    if (!existing || previousParent !== parentId) return 'ข้อมูลต้นสังกัดถูกปิดใช้งาน กรุณาเลือกต้นสังกัดที่เปิดใช้งาน';
  }
  const duplicates = tier === 'faculties' ? state.faculties.some((r) => r.id !== id && r.name.toLowerCase() === name.toLowerCase())
    : tier === 'departments' ? state.departments.some((r) => r.id !== id && r.facultyId === input.facultyId && r.name.toLowerCase() === name.toLowerCase())
      : tier === 'programs' ? state.programs.some((r) => r.id !== id && r.code.toUpperCase() === input.code)
        : tier === 'yearLevels' ? state.yearLevels.some((r) => r.id !== id && r.programId === input.programId && r.level === input.level)
          : state.classGroups.some((r) => r.id !== id && r.code.toUpperCase() === input.code);
  if (duplicates) return `มี${academicLabels[tier]}นี้อยู่แล้ว กรุณาใช้ชื่อหรือรหัสอื่น`;
  if (tier === 'yearLevels' && existing && 'programId' in existing && existing.programId !== input.programId &&
    state.classGroups.some((g) => g.yearLevelId === id)) return 'ไม่สามารถย้ายชั้นปีที่มีกลุ่มเรียนอยู่ กรุณาย้ายกลุ่มเรียนก่อน';
};

export const saveAcademicState = (state: AcademicState, tier: AcademicTier, input: AcademicInput, id?: string): AcademicState => {
  const common = { id: id || crypto.randomUUID(), status: input.status, updatedAt: new Date().toISOString() };
  const record: AcademicRecord = tier === 'faculties' ? { ...common, name: input.name }
    : tier === 'departments' ? { ...common, name: input.name, facultyId: input.facultyId }
      : tier === 'programs' ? { ...common, name: input.name, code: input.code, departmentId: input.departmentId }
        : tier === 'yearLevels' ? { ...common, name: input.name || `ชั้นปีที่ ${input.level}`, level: input.level, programId: input.programId }
          : { ...common, code: input.code, programId: input.programId, yearLevelId: input.yearLevelId };
  const next = { ...state, [tier]: id ? state[tier].map((r) => r.id === id ? record : r) : [...state[tier], record] };
  if (tier === 'programs' && !id) {
    next.yearLevels = [...state.yearLevels, ...[1, 2, 3, 4].map((level) => ({
      ...common, id: crypto.randomUUID(), programId: record.id, level, name: `ชั้นปีที่ ${level}`,
    }))];
  }
  return next;
};

export const bulkAssignmentError = (state: AcademicState, students: Student[], studentIds: string[], groupId: string): string | undefined => {
  const group = state.classGroups.find((g) => g.id === groupId);
  const year = state.yearLevels.find((y) => y.id === group?.yearLevelId);
  if (!group || !year || !isAcademicPathActive(state, 'classGroups', groupId)) return 'กรุณาเลือกกลุ่มเรียนที่เปิดใช้งาน';
  const selected = students.filter((student) => studentIds.includes(student.id));
  if (!selected.length || selected.length !== new Set(studentIds).size) return 'กรุณาเลือกนักศึกษาที่มีอยู่ในระบบ';
  const pathFields = studentAcademicFields(state, { ...selected[0], classGroupId: groupId });
  if (selected.some((student) => {
    const fields = { ...student, ...studentAcademicFields(state, student) };
    return Boolean(state.classGroups.some((g) => g.id === student.classGroupId) ||
      (fields.programId && fields.programId !== group.programId) ||
      (fields.departmentId && fields.departmentId !== pathFields.departmentId) ||
      (fields.facultyId && fields.facultyId !== pathFields.facultyId) ||
      ((fields.yearLevel || fields.year) && (fields.yearLevel || fields.year) !== year.level));
  })) return 'นักศึกษาต้องยังไม่มีกลุ่มเรียน และคณะ ภาควิชา สาขาวิชาและชั้นปีต้องตรงกับกลุ่มปลายทาง';
};
