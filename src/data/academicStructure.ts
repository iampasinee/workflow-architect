export interface AcademicClassGroup {
  id: string;
  code: string;
  yearLevel: number;
  academicYear?: number;
  studentIds?: string[];
}

export interface AcademicProgram {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string;
  classGroups: AcademicClassGroup[];
}

export interface AcademicDepartment {
  id: string;
  code?: string;
  nameTh: string;
  nameEn: string;
  programs: AcademicProgram[];
}

export interface AcademicFaculty {
  id: string;
  code?: string;
  nameTh: string;
  nameEn: string;
  departments: AcademicDepartment[];
}

export interface ResolvedAcademicPath {
  faculty: AcademicFaculty;
  department: AcademicDepartment;
  program: AcademicProgram;
  group: AcademicClassGroup;
}

export const academicStructure: AcademicFaculty[] = [
  {
    id: 'faculty_fimt',
    code: 'FIMT',
    nameTh: 'คณะเทคโนโลยีและการจัดการอุตสาหกรรม',
    nameEn: 'Faculty of Industrial Technology and Management',
    departments: [
      {
        id: 'department_it',
        code: 'IT',
        nameTh: 'ภาควิชาเทคโนโลยีสารสนเทศ',
        nameEn: 'Department of Information Technology',
        programs: [
          {
            id: 'program_inet',
            code: 'INET',
            nameTh: 'สาขาวิชาวิศวกรรมสารสนเทศและเครือข่าย',
            nameEn: 'Information and Network Engineering',
            classGroups: [
              {
                id: 'group_inet_de_ra',
                code: 'INET-DE-RA',
                yearLevel: 3,
                academicYear: 2569,
                studentIds: ['std_inet_ra_001', 'std_inet_ra_002'],
              },
              {
                id: 'group_inet_de_rb',
                code: 'INET-DE-RB',
                yearLevel: 3,
                academicYear: 2569,
                studentIds: ['std_inet_rb_001', 'std_inet_rb_002'],
              },
            ],
          },
          {
            id: 'program_ine',
            code: 'INE',
            nameTh: 'สาขาวิชาวิศวกรรมสารสนเทศและเครือข่าย',
            nameEn: 'Information and Network Engineering',
            classGroups: [
              {
                id: 'group_ine_de_ra',
                code: 'INE-DE-RA',
                yearLevel: 3,
                academicYear: 2569,
                studentIds: ['std_ine_ra_001', 'std_ine_ra_002'],
              },
              {
                id: 'group_ine_de_rb',
                code: 'INE-DE-RB',
                yearLevel: 3,
                academicYear: 2569,
                studentIds: ['std_ine_rb_001', 'std_ine_rb_002'],
              },
              {
                id: 'group_ine_de_rc',
                code: 'INE-DE-RC',
                yearLevel: 3,
                academicYear: 2569,
                studentIds: ['std_ine_rc_001', 'std_ine_rc_002'],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'fac_001',
    nameTh: 'คณะเทคโนโลยีและการจัดการอุตสาหกรรม',
    nameEn: 'Faculty of Industrial Technology and Management',
    departments: [
      {
        id: 'dep_001',
        nameTh: 'ภาควิชาเทคโนโลยีสารสนเทศ',
        nameEn: 'Department of Information Technology',
        programs: [
          {
            id: 'prog_001',
            code: 'INET',
            nameTh: 'สาขาวิชาวิศวกรรมสารสนเทศและเครือข่าย',
            nameEn: 'Information and Network Engineering',
            classGroups: [
              { id: 'group_001', code: 'INET-DE-RA', yearLevel: 3 },
              { id: 'group_002', code: 'INET-DE-RB', yearLevel: 3 },
              { id: 'group_003', code: 'INET-DE-Y1', yearLevel: 1 },
              { id: 'group_004', code: 'INET-DE-Y4', yearLevel: 4 },
            ],
          },
          {
            id: 'prog_002',
            code: 'IT',
            nameTh: 'สาขาวิชาเทคโนโลยีสารสนเทศ',
            nameEn: 'Information Technology',
            classGroups: [
              { id: 'group_005', code: 'IT-DE-RA', yearLevel: 2 },
              { id: 'group_006', code: 'IT-DE-RB', yearLevel: 3 },
            ],
          },
        ],
      },
      {
        id: 'dep_002',
        nameTh: 'ภาควิชาวิศวกรรมอุตสาหการ',
        nameEn: 'Department of Industrial Engineering',
        programs: [
          {
            id: 'prog_003',
            code: 'IE',
            nameTh: 'สาขาวิชาวิศวกรรมอุตสาหการ',
            nameEn: 'Industrial Engineering',
            classGroups: [
              { id: 'group_007', code: 'IE-DE-RA', yearLevel: 2 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'fac_002',
    nameTh: 'คณะวิทยาศาสตร์',
    nameEn: 'Faculty of Science',
    departments: [
      {
        id: 'dep_003',
        nameTh: 'ภาควิชาวิทยาการคอมพิวเตอร์',
        nameEn: 'Department of Computer Science',
        programs: [
          {
            id: 'prog_004',
            code: 'CS',
            nameTh: 'สาขาวิชาวิทยาการคอมพิวเตอร์',
            nameEn: 'Computer Science',
            classGroups: [
              { id: 'group_008', code: 'CS-DE-2A', yearLevel: 2 },
              { id: 'group_009', code: 'CS-DE-3A', yearLevel: 3 },
            ],
          },
        ],
      },
    ],
  },
];

export const findAcademicPathByGroup = (groupId?: string): ResolvedAcademicPath | null => {
  if (!groupId) return null;
  for (const faculty of academicStructure) {
    for (const department of faculty.departments) {
      for (const program of department.programs) {
        const group = program.classGroups.find((item) => item.id === groupId);
        if (group) return { faculty, department, program, group };
      }
    }
  }
  return null;
};

export const legacyStudentAcademicAssignments: Record<string, string> = {
  std_0001: 'group_001',
  std_0002: 'group_001',
  std_0003: 'group_008',
  std_0004: 'group_003',
  std_0005: 'group_004',
  std_0006: 'group_001',
  std_0007: 'group_001',
  std_0008: 'group_002',
  std_0009: 'group_002',
  std_0010: 'group_002',
  std_0011: 'group_002',
  std_0012: 'group_002',
};
