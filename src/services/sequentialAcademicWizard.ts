import { AcademicInput, AcademicState, AcademicStatus, AcademicTier } from '../types/academic';
import { academicSettings } from '../utils/academicYear';
import { OFFICIAL_FACULTY_NAME } from '../data/academicStructure';
import { deriveAcademicState, isAcademicPathActive, normalizeAcademicInput, saveAcademicState, validateAcademicInput } from './academicState';

export interface SequentialWizardDraft {
  facultyMode: 'existing' | 'new';
  selectedFacultyId: string | null;
  newFacultyName: string;
  facultyStatus: AcademicStatus;
  departmentMode: 'existing' | 'new';
  selectedDepartmentId: string | null;
  newDepartmentName: string;
  departmentStatus: AcademicStatus;
  programMode: 'existing' | 'new';
  selectedProgramId: string | null;
  newProgramCode: string;
  newProgramName: string;
  admissionYear: number | null;
  groups: { tempId: string; code: string; status: AcademicStatus }[];
}

export const createWizardDraft = (state: AcademicState): SequentialWizardDraft => ({
  facultyMode: 'existing', selectedFacultyId: state.faculties.find((f) => f.name === OFFICIAL_FACULTY_NAME && f.status === 'active')?.id || null,
  newFacultyName: '', facultyStatus: 'active', departmentMode: 'existing', selectedDepartmentId: null,
  newDepartmentName: '', departmentStatus: 'active', programMode: 'existing', selectedProgramId: null,
  newProgramCode: '', newProgramName: '', admissionYear: academicSettings.currentAcademicYear,
  groups: [{ tempId: crypto.randomUUID(), code: '', status: 'active' }],
});

export interface WizardResult { state?: AcademicState; error?: string; step?: number; }

/** Pure transaction builder: failed validation cannot mutate the source store. */
export const buildWizardTransaction = (source: AcademicState, draft: SequentialWizardDraft, throughStep = 6): WizardResult => {
  let state = source;
  let facultyId = draft.selectedFacultyId || '';
  let departmentId = draft.selectedDepartmentId || '';
  let programId = draft.selectedProgramId || '';
  const input = (values: Partial<AcademicInput>): AcademicInput => normalizeAcademicInput({
    name: '', code: '', facultyId, departmentId, programId, yearLevelId: '', level: 0, status: 'active', ...values,
  });
  const add = (tier: AcademicTier, values: AcademicInput) => {
    const error = validateAcademicInput(state, tier, values);
    if (error) return { error };
    state = saveAcademicState(state, tier, values);
    return { id: state[tier].at(-1)!.id };
  };
  if (draft.facultyMode === 'new') {
    if (!['active', 'inactive'].includes(draft.facultyStatus)) return { error: 'สถานะคณะไม่ถูกต้อง', step: 1 };
    if (source.faculties.some((f) => f.name.trim().toLowerCase() === draft.newFacultyName.trim().toLowerCase()))
      return { error: 'มีคณะชื่อนี้อยู่แล้ว กรุณาเลือกจากรายการคณะที่มีอยู่', step: 1 };
    const result = add('faculties', input({ name: draft.newFacultyName }));
    if (result.error) return { ...result, step: 1 };
    facultyId = result.id!;
  } else if (!isAcademicPathActive(state, 'faculties', facultyId)) return { error: 'กรุณาเลือกคณะที่เปิดใช้งาน', step: 1 };
  if (throughStep === 1) return {};
  if (draft.departmentMode === 'new') {
    if (!['active', 'inactive'].includes(draft.departmentStatus)) return { error: 'สถานะภาควิชาไม่ถูกต้อง', step: 2 };
    const result = add('departments', input({ name: draft.newDepartmentName }));
    if (result.error) return { ...result, step: 2 };
    departmentId = result.id!;
  } else if (!state.departments.some((d) => d.id === departmentId && d.facultyId === facultyId) || !isAcademicPathActive(state, 'departments', departmentId))
    return { error: 'กรุณาเลือกภาควิชาที่เปิดใช้งานในคณะนี้', step: 2 };
  if (throughStep === 2) return {};
  if (draft.programMode === 'new') {
    const result = add('programs', input({ name: draft.newProgramName, code: draft.newProgramCode }));
    if (result.error) return { ...result, step: 3 };
    programId = result.id!;
  } else if (!state.programs.some((p) => p.id === programId && p.departmentId === departmentId) || !isAcademicPathActive(state, 'programs', programId))
    return { error: 'กรุณาเลือกสาขาวิชาที่เปิดใช้งานในภาควิชานี้', step: 3 };
  if (throughStep === 3) return {};
  if (!Number.isSafeInteger(draft.admissionYear) || draft.admissionYear! < 2500 || draft.admissionYear! > academicSettings.currentAcademicYear)
    return { error: 'กรุณาเลือกปีการศึกษาที่เข้าที่ถูกต้อง', step: 4 };
  if (throughStep === 4) return {};
  if (!draft.groups.length) return { error: 'กรุณาเพิ่มกลุ่มเรียนอย่างน้อย 1 กลุ่ม', step: 5 };
  for (const [index, group] of draft.groups.entries()) {
    const result = add('classGroups', input({ code: group.code, admissionYear: draft.admissionYear!, status: group.status }));
    if (result.error) return { error: `กลุ่มที่ ${index + 1}: ${result.error}`, step: 5 };
  }
  // New inactive parents are staged as active only inside this isolated transaction
  // so their entire chain can be created; persisted statuses retain the user's choice.
  state = { ...state,
    faculties: state.faculties.map((f) => draft.facultyMode === 'new' && f.id === facultyId ? { ...f, status: draft.facultyStatus } : f),
    departments: state.departments.map((d) => draft.departmentMode === 'new' && d.id === departmentId ? { ...d, status: draft.departmentStatus } : d),
  };
  return { state: deriveAcademicState(state, []) };
};
