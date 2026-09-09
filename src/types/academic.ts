export type AcademicStatus = 'active' | 'inactive';

interface AcademicRecordBase {
  id: string;
  status: AcademicStatus;
  updatedAt: string;
}

export interface FacultyRecord extends AcademicRecordBase { name: string; }
export interface DepartmentRecord extends AcademicRecordBase { facultyId: string; name: string; }
export interface ProgramRecord extends AcademicRecordBase { departmentId: string; code: string; name: string; }
export interface YearLevelRecord extends AcademicRecordBase { programId: string; level: number; name: string; }
export interface ClassGroupRecord extends AcademicRecordBase { programId: string; yearLevelId: string; code: string; }

export interface AcademicState {
  faculties: FacultyRecord[];
  departments: DepartmentRecord[];
  programs: ProgramRecord[];
  yearLevels: YearLevelRecord[];
  classGroups: ClassGroupRecord[];
}

export type AcademicTier = keyof AcademicState;
export type AcademicRecord = AcademicState[AcademicTier][number];
export interface AcademicInput {
  name: string;
  code: string;
  facultyId: string;
  departmentId: string;
  programId: string;
  yearLevelId: string;
  level: number;
  status: AcademicStatus;
}
export interface AcademicResult { success: boolean; error?: string; }
