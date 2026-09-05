import { Student, Teacher, Admin, Room, Course, ExamSession, SeatAssignment, Submission, Violation } from '../types';

export const initialStudents: Student[] = [
  {
    id: 'std_0001',
    studentCode: '6410123456',
    fullName: 'Somchai Jaidee',
    firstName: 'Somchai',
    lastName: 'Jaidee',
    email: '6410123456@icit.university.ac.th',
    faculty: 'Faculty of Engineering',
    department: 'Computer Engineering',
    year: 3,
    faceReferenceUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
    accountStatus: 'active',
    isFirstTime: false,
  },
  {
    id: 'std_0002',
    studentCode: '6410123457',
    fullName: 'Somying Rakrian',
    firstName: 'Somying',
    lastName: 'Rakrian',
    email: '6410123457@icit.university.ac.th',
    faculty: 'Faculty of Engineering',
    department: 'Computer Engineering',
    year: 3,
    faceReferenceUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    accountStatus: 'active',
    isFirstTime: false,
  },
  {
    id: 'std_0003',
    studentCode: '6410123458',
    fullName: 'Wichai Phianphayayam',
    email: '6410123458@icit.university.ac.th',
    faculty: 'Faculty of Science',
    department: 'Computer Science',
    year: 2,
    faceReferenceUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    accountStatus: 'suspended',
    statusReason: 'Administrative disciplinary review - pending proctor committee',
    isFirstTime: false,
  },
  {
    id: 'std_0004',
    studentCode: '6410123459',
    fullName: 'Nattawut Prasert',
    email: '6410123459@icit.university.ac.th',
    faculty: 'Faculty of Engineering',
    department: 'Computer Engineering',
    year: 1,
    faceReferenceUrl: '', // First time: no face reference enrolled yet
    accountStatus: 'active',
    isFirstTime: true,
  },
  {
    id: 'std_0005',
    studentCode: '6410123460',
    fullName: 'Kanya Srisuk',
    email: '6410123460@icit.university.ac.th',
    faculty: 'Faculty of Engineering',
    department: 'Computer Engineering',
    year: 4,
    faceReferenceUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    accountStatus: 'graduated_inactive',
    statusReason: 'Graduated Academic Year 2025',
    isFirstTime: false,
  },
  {
    id: 'std_0006',
    studentCode: '6410123461',
    fullName: 'Anan Sukhumvit',
    email: '6410123461@icit.university.ac.th',
    faculty: 'Faculty of Engineering',
    department: 'Computer Engineering',
    year: 3,
    faceReferenceUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    accountStatus: 'active',
    isFirstTime: false,
  },
  {
    id: 'std_0007',
    studentCode: '6410123462',
    fullName: 'Ploy Pailin',
    email: '6410123462@icit.university.ac.th',
    faculty: 'Faculty of Engineering',
    department: 'Computer Engineering',
    year: 3,
    faceReferenceUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&auto=format&fit=crop&q=80',
    accountStatus: 'active',
    isFirstTime: false,
  },
  {
    id: 'std_0008',
    studentCode: '6410123463',
    fullName: 'Thana Wattana',
    email: '6410123463@icit.university.ac.th',
    faculty: 'Faculty of Engineering',
    department: 'Computer Engineering',
    year: 3,
    faceReferenceUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80',
    accountStatus: 'active',
    isFirstTime: false,
  },
  {
    id: 'std_0009',
    studentCode: '6410123464',
    fullName: 'Benjaporn Thongkham',
    email: '6410123464@icit.university.ac.th',
    faculty: 'Faculty of Engineering',
    department: 'Computer Engineering',
    year: 3,
    faceReferenceUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
    accountStatus: 'active',
    isFirstTime: false,
  },
  {
    id: 'std_0010',
    studentCode: '6410123465',
    fullName: 'Chanon Kittisuk',
    email: '6410123465@icit.university.ac.th',
    faculty: 'Faculty of Engineering',
    department: 'Computer Engineering',
    year: 3,
    faceReferenceUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
    accountStatus: 'active',
    isFirstTime: false,
  },
  {
    id: 'std_0011',
    studentCode: '6410123466',
    fullName: 'Darika Boonrod',
    email: '6410123466@icit.university.ac.th',
    faculty: 'Faculty of Engineering',
    department: 'Computer Engineering',
    year: 3,
    faceReferenceUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
    accountStatus: 'active',
    isFirstTime: false,
  },
  {
    id: 'std_0012',
    studentCode: '6410123467',
    fullName: 'Ekachai Charoen',
    email: '6410123467@icit.university.ac.th',
    faculty: 'Faculty of Engineering',
    department: 'Computer Engineering',
    year: 3,
    faceReferenceUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80',
    accountStatus: 'active',
    isFirstTime: false,
  }
];

export const initialTeachers: Teacher[] = [
  {
    id: 'tch_0001',
    teacherCode: 'T00123',
    fullName: 'Asst. Prof. Dr. Anucha Wichaidee',
    email: 'anucha.w@icit.university.ac.th',
    faculty: 'Faculty of Engineering',
    department: 'Computer Engineering',
    role: 'teacher',
    icitProfileStatus: 'confirmed',
    accountStatus: 'active',
  },
  {
    id: 'tch_0002',
    teacherCode: 'T00124',
    fullName: 'Dr. Kanchana Ploy',
    email: 'kanchana.p@icit.university.ac.th',
    faculty: 'Faculty of Science',
    department: 'Computer Science',
    role: 'teacher',
    icitProfileStatus: 'pending', // Test first-time teacher onboarding T0
    accountStatus: 'active',
  }
];

export const initialAdmins: Admin[] = [
  {
    id: 'adm_0001',
    adminCode: 'A0001',
    fullName: 'Piyada Dulaerabob',
    email: 'piyada.a@icit.university.ac.th',
    role: 'admin',
    accountStatus: 'active',
  }
];

// Generate room 0001 with 5 rows x 8 columns = 40 seats
function generateSeatsForLab301() {
  const seats = [];
  const rows = ['A', 'B', 'C', 'D', 'E'];
  for (let r = 0; r < rows.length; r++) {
    for (let c = 1; c <= 8; c++) {
      const seatNo = `${rows[r]}${c}`;
      const seatIndex = r * 8 + c;
      const pad = String(seatIndex).padStart(2, '0');
      
      // PRD Section 6 specs:
      // A1: online
      // A2: online
      // A3: online: false (offline)
      // Damaged: D4
      // Unavailable: E8
      let status: 'online' | 'offline' | 'damaged' | 'unavailable' = 'online';
      if (seatNo === 'A3') status = 'offline';
      else if (seatNo === 'D4') status = 'damaged';
      else if (seatNo === 'E8') status = 'unavailable';

      seats.push({
        seatNo,
        machineNo: `PC-301-${pad}`,
        ip: `192.168.10.${10 + seatIndex}`,
        mac: `AC:DE:48:00:${pad}:${String(20 + seatIndex).padStart(2, '0')}`,
        status,
        disabled: seatNo === 'E8'
      });
    }
  }
  return seats;
}

export const initialRooms: Room[] = [
  {
    id: 'room_0001',
    building: 'Engineering Building 1',
    floor: 3,
    labName: 'Lab 301',
    status: 'ready',
    rows: 5,
    columns: 8,
    deskOrientation: 'front',
    seats: generateSeatsForLab301(),
  },
  {
    id: 'room_0002',
    building: 'Science Building 2',
    floor: 4,
    labName: 'Lab 405',
    status: 'ready',
    rows: 4,
    columns: 6,
    deskOrientation: 'pod',
    seats: Array.from({ length: 24 }).map((_, i) => {
      const r = String.fromCharCode(65 + Math.floor(i / 6));
      const c = (i % 6) + 1;
      const num = String(i + 1).padStart(2, '0');
      return {
        seatNo: `${r}${c}`,
        machineNo: `PC-405-${num}`,
        ip: `192.168.20.${10 + i}`,
        mac: `AC:DE:48:02:${num}:${num}`,
        status: 'online',
        disabled: false
      };
    }),
  }
];

export const initialCourses: Course[] = [
  {
    id: 'crs_0001',
    courseCode: 'CS301',
    courseName: 'Data Structures and Algorithms',
    faculty: 'Faculty of Engineering',
    department: 'Computer Engineering',
    status: 'active',
    sections: [
      { sectionNo: '1', semester: 1, academicYear: 2026, teacherId: 'tch_0001', studentCount: 40 },
      { sectionNo: '2', semester: 1, academicYear: 2026, teacherId: 'tch_0002', studentCount: 35 },
    ]
  },
  {
    id: 'crs_0002',
    courseCode: 'CS402',
    courseName: 'Operating Systems & Concurrency',
    faculty: 'Faculty of Engineering',
    department: 'Computer Engineering',
    status: 'active',
    sections: [
      { sectionNo: '1', semester: 1, academicYear: 2026, teacherId: 'tch_0001', studentCount: 38 }
    ]
  },
  {
    id: 'crs_0003',
    courseCode: 'CPE213',
    courseName: 'Computer Architecture & Assembly',
    faculty: 'Faculty of Engineering',
    department: 'Computer Engineering',
    status: 'active',
    sections: [
      { sectionNo: '1', semester: 2, academicYear: 2025, teacherId: 'tch_0001', studentCount: 30 }
    ]
  }
];

export const initialExamSessions: ExamSession[] = [
  {
    id: 'exam_0001',
    courseId: 'crs_0001',
    sectionNo: '1',
    examDate: '2026-09-15',
    startTime: '09:00',
    endTime: '11:00',
    durationMinutes: 120,
    adjustedMinutes: 0,
    roomId: 'room_0001',
    format: 'offline',
    fileRequirements: {
      acceptedExtensions: ['.zip', '.py'],
      maxSizeMb: 25,
      filenamePattern: '{studentCode}_final',
      automaticFilenamePattern: '{studentId}_{firstName}_{lastName}_{uploadSequence}.{extension}',
      requiredFileCount: 1,
      instructions: 'Submit either a single .zip archive containing all your solution files and test cases, or an individual .py source file for Section A. Compression into .zip is only mandatory if multiple files are required.',
    },
    rules: [
      { id: 'r1', text: 'Do not access websites other than those explicitly permitted by the instructor.' },
      { id: 'r2', text: 'Do not use another person’s account or computer to sign in or submit.' },
      { id: 'r3', text: 'Do not communicate with others inside or outside the laboratory during the examination.' },
      { id: 'r4', text: 'Ensure files are non-empty and readable before final submission.' },
      { id: 'r5', text: 'Only standard laboratory computer peripherals are permitted.' },
    ],
    status: 'in_progress',
  },
  {
    id: 'exam_0002',
    courseId: 'crs_0002',
    sectionNo: '1',
    examDate: '2026-09-22',
    startTime: '13:30',
    endTime: '16:30',
    durationMinutes: 180,
    roomId: 'room_0001',
    format: 'offline',
    fileRequirements: {
      acceptedExtensions: ['.zip', '.c'],
      maxSizeMb: 50,
      filenamePattern: '{studentCode}_os_exam',
      requiredFileCount: 1,
      instructions: 'Upload your kernel module patch and build script zipped.',
    },
    rules: [
      { id: 'r1', text: 'Strict closed-book exam. No external storage devices.' },
      { id: 'r2', text: 'Duplicate logins or network snooping will invalidate the score immediately.' },
    ],
    status: 'upcoming',
  },
  {
    id: 'exam_0003',
    courseId: 'crs_0003',
    sectionNo: '1',
    examDate: '2026-08-20',
    startTime: '09:30',
    endTime: '11:30',
    durationMinutes: 120,
    roomId: 'room_0002',
    format: 'offline',
    fileRequirements: {
      acceptedExtensions: ['.zip', '.asm'],
      maxSizeMb: 10,
      filenamePattern: '{studentCode}_arch',
      requiredFileCount: 1,
      instructions: 'Assembly code files in .asm or zipped repository.',
    },
    rules: [
      { id: 'r1', text: 'Follow all proctor guidelines.' }
    ],
    status: 'completed',
  }
];

export const initialSeatAssignments: SeatAssignment[] = [
  { examId: 'exam_0001', seatNo: 'A1', studentId: 'std_0001' },
  { examId: 'exam_0001', seatNo: 'A2', studentId: 'std_0002' },
  { examId: 'exam_0001', seatNo: 'A4', studentId: 'std_0004' },
  { examId: 'exam_0001', seatNo: 'A5', studentId: 'std_0006' },
  { examId: 'exam_0001', seatNo: 'A6', studentId: 'std_0007' },
  { examId: 'exam_0001', seatNo: 'A7', studentId: 'std_0008' },
  { examId: 'exam_0001', seatNo: 'A8', studentId: 'std_0009' },
  { examId: 'exam_0001', seatNo: 'B1', studentId: 'std_0010' },
  { examId: 'exam_0001', seatNo: 'B2', studentId: 'std_0011' },
  { examId: 'exam_0001', seatNo: 'B3', studentId: 'std_0012' },
];

export const initialSubmissions: Submission[] = [
  {
    id: 'sub_0001',
    examId: 'exam_0001',
    studentId: 'std_0001',
    files: [
      {
        fileName: '6410123456_final.zip',
        sizeKb: 2450,
        submittedAt: '2026-09-15T10:45:12',
        integrityStatus: 'valid',
        integrityMessage: 'Archive structure verified, SHA-256 integrity passed'
      }
    ],
    status: 'submitted',
    integrityCheck: 'passed',
    submittedAt: '2026-09-15T10:45:12',
  },
  {
    id: 'sub_0002',
    examId: 'exam_0001',
    studentId: 'std_0002',
    files: [],
    status: 'in_progress',
    integrityCheck: 'pending',
  },
  {
    id: 'sub_0006',
    examId: 'exam_0001',
    studentId: 'std_0006',
    files: [
      {
        fileName: '6410123461_final.zip',
        sizeKb: 3120,
        submittedAt: '2026-09-15T10:32:10',
        integrityStatus: 'valid',
        integrityMessage: 'Archive verified'
      }
    ],
    status: 'submitted',
    integrityCheck: 'passed',
    submittedAt: '2026-09-15T10:32:10',
  },
  {
    id: 'sub_0007',
    examId: 'exam_0001',
    studentId: 'std_0007',
    files: [
      {
        fileName: '6410123462_final.py',
        sizeKb: 48,
        submittedAt: '2026-09-15T10:58:40',
        integrityStatus: 'valid',
        integrityMessage: 'Python source syntax verified'
      }
    ],
    status: 'submitted',
    integrityCheck: 'passed',
    submittedAt: '2026-09-15T10:58:40',
  },
  {
    id: 'sub_0008',
    examId: 'exam_0001',
    studentId: 'std_0008',
    files: [
      {
        fileName: '6410123463_corrupt.zip',
        sizeKb: 12,
        submittedAt: '2026-09-15T11:04:15',
        integrityStatus: 'damaged',
        integrityMessage: 'Header damaged or premature EOF encountered'
      }
    ],
    status: 'late',
    integrityCheck: 'failed',
    submittedAt: '2026-09-15T11:04:15',
  },
  // Submissions for completed exam_0003
  {
    id: 'sub_arch_01',
    examId: 'exam_0003',
    studentId: 'std_0001',
    files: [
      {
        fileName: '6410123456_arch.zip',
        sizeKb: 1240,
        submittedAt: '2026-08-20T11:15:00',
        integrityStatus: 'valid',
        integrityMessage: 'Passed'
      }
    ],
    status: 'submitted',
    integrityCheck: 'passed',
    submittedAt: '2026-08-20T11:15:00',
  },
  {
    id: 'sub_arch_02',
    examId: 'exam_0003',
    studentId: 'std_0002',
    files: [
      {
        fileName: '6410123457_arch.asm',
        sizeKb: 85,
        submittedAt: '2026-08-20T11:22:15',
        integrityStatus: 'valid',
        integrityMessage: 'Passed'
      }
    ],
    status: 'submitted',
    integrityCheck: 'passed',
    submittedAt: '2026-08-20T11:22:15',
  }
];

export const initialViolations: Violation[] = [
  {
    id: 'vio_0001',
    examId: 'exam_0001',
    studentId: 'std_0002',
    seatNo: 'A2',
    type: 'unauthorized_website',
    detail: 'Accessed unauthorized domain: facebook.com',
    detectedAt: '2026-09-15T10:12:03',
    acknowledged: false,
  },
  {
    id: 'vio_0002',
    examId: 'exam_0001',
    studentId: 'std_0003',
    seatNo: 'A3',
    type: 'duplicate_login',
    detail: 'A duplicate login from another device was detected (IP 192.168.10.99)',
    detectedAt: '2026-09-15T09:30:44',
    acknowledged: true,
  }
];
