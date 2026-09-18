# SecureLab

SecureLab เป็น frontend prototype ภาษาไทยสำหรับการจัดสอบในห้องปฏิบัติการ การจัดการผู้ใช้งาน/รายวิชา และการส่งไฟล์ข้อสอบ ใช้ React 19, TypeScript, Vite 6 และ Tailwind CSS 4 ระบบ Login, ICIT, biometric verification, exam monitoring, file transfer และ integrity checking เป็นการจำลองใน browser และยังไม่มี production backend

## เริ่มใช้งาน

ติดตั้ง Node.js และ npm แล้วรัน:

```sh
npm install
npm run dev
```

เปิด <http://localhost:3000> แอปเริ่มที่หน้า Login เสมอ จากนั้นเลือกบัญชีจำลองสำหรับ Student, Teacher หรือ Admin ใน PowerShell ใช้ `npm.cmd` แทน `npm` หาก execution policy ปิดกั้น `npm.ps1`

ไม่ต้องใช้ API key ในการรันปัจจุบัน ห้ามใส่ secret ใน client-side environment variables หรือ commit ไฟล์ `.env` ที่มีข้อมูลจริง

## คำสั่งพัฒนา

| คำสั่ง | การทำงาน |
| --- | --- |
| `npm install` | ติดตั้ง dependencies จาก lockfile |
| `npm run dev` | เปิด Vite ที่ port 3000 และ LAN |
| `npm run lint` | ตรวจ TypeScript ด้วย `tsc --noEmit` |
| `npm run test:academic` | ทดสอบ academic model, migration, Class Group, Teacher affiliation และ validation |
| `npm run test:courses` | ทดสอบ Course/Section, teacher assignment, cohort collision และ portal eligibility |
| `npm run test:rooms` | ทดสอบชั้น ห้อง ผังที่นั่ง อุปกรณ์ การย้ายข้อมูล และการป้องกันข้อมูลที่ถูกอ้างอิง |
| `npm run build` | สร้าง production bundle ใน `dist/` |
| `npm run preview` | เปิด production bundle ในเครื่อง |
| `git diff --check` | ตรวจ whitespace errors |

## โครงสร้างโครงการ

- `src/main.tsx`, `src/App.tsx`: startup, login-first และ role-based flow
- `src/components/student/`: identity, exam rules, progress stepper, staged upload และ submission
- `src/components/teacher/`: courses, exams, monitoring, integrity และ reopening
- `src/components/admin/`: dashboard, users, academic structure, Course/Section, rooms, biometric, security, audit และ profile
- `src/components/common/`, `src/components/simulation/`: shared UI และเครื่องมือจำลอง
- `src/context/AppContext.tsx`: state, CRUD, persistence และ forward migration
- `src/types.ts`, `src/types/`: domain models
- `src/data/`: mock/seed data
- `src/services/academicState.ts`: academic relationships, migration, selectors และ validation
- `src/services/academicStructureWizard.ts`: atomic-like academic structure wizard transaction
- `src/services/courseState.ts`: Course/Section migration, validation และ portal projections
- `src/services/roomState.ts`, `src/types/rooms.ts`: Floor/Physical Room/Exam Room, ผังที่นั่ง, อุปกรณ์ และ room migration
- `src/services/stagedUploadStorage.ts`: IndexedDB staged-file persistence
- `src/utils/academicYear.ts`: current academic year, admission code และ derived year level

## ภาษาและ Navigation

UI ปัจจุบันบังคับภาษาไทยทั้งระบบ แต่ Context ยังเก็บ language API เพื่อ compatibility Admin ใช้ hash routes เช่น `#/admin/users/students`, `#/admin/faculties-and-groups` และ `#/admin/courses` การ refresh ยังคงเริ่มที่ Login แล้วเปิด Admin route จาก hash หลังเข้าสู่ระบบ

Sidebar ผู้ดูแลระบบไม่มีหน้าจัดการบทบาทแบบกำหนดเอง บทบาท `student`, `teacher` และ `admin` เป็นบทบาทคงที่ และ Student/Teacher/Admin flows ยังคงแยกกัน

## การจัดการผู้ใช้งาน

เมนูจัดการผู้ใช้งานมีหน้าภาพรวม นักศึกษา อาจารย์ และผู้ดูแลระบบ พร้อม search, filters, sorting, pagination, status actions และ CRUD ตามข้อจำกัดเดิม

Workflow “เพิ่มผู้ใช้งาน” เริ่มจากเลือกประเภทบัญชี เมื่อเข้าฟอร์มนักศึกษา อาจารย์ หรือผู้ดูแลระบบ ปุ่ม `ย้อนกลับ` จะกลับไปหน้าประเภทบัญชีโดยไม่ปิด modal และล้าง draft ของบทบาทนั้น ปุ่ม `X` ปิด workflow ทั้งหมด ฟอร์มนักศึกษาใช้ validation และ academic selectors ชุดเดียวกับ Student Management

Teacher affiliation ใช้ stable `facultyId` และ `departmentId` ตามโครงสร้างวิชาการเดียวกับนักศึกษา โดย selector cascade เป็น `คณะ → ภาควิชา` ฟิลด์ข้อความเดิมคงไว้เฉพาะ fallback ของ persisted legacy data รายวิชา/ตอนเรียนที่อาจารย์สอนยังมาจาก Primary Teacher และ Co-Teacher assignment ไม่ได้มาจาก profile affiliation

## โครงสร้างวิชาการ

Canonical hierarchy คือ:

```text
คณะ (Faculty)
└── ภาควิชา (Department)
    └── สาขาวิชา (Major)
```

Student academic identity ใช้:

```ts
{
  majorId: string;
  admissionYear: number;
  classGroupId?: string;
}
```

คณะและภาควิชาของนักศึกษาถูก derive จาก `majorId` ส่วน `classGroupId` เป็นกลุ่มประจำแบบ lightweight เช่น RA/RB ไม่ใช่ parent ระดับที่สี่ของ hierarchy และนักศึกษามีกลุ่มประจำได้ไม่เกินหนึ่งกลุ่ม

หน้า `จัดการคณะและกลุ่มเรียน` มีสี่แท็บ:

```text
[ คณะ ] [ ภาควิชา ] [ สาขาวิชา ] [ กลุ่มเรียน ]
```

Class Group ผูกกับ `majorId + admissionYear` และเก็บ sequence ภายใน กลุ่มใหม่สร้างรหัสอัตโนมัติ เช่น `INET-DE-RA`, `INET-DE-RB`, `INET-DE-RC` ลำดับที่เคยใช้แล้วจะไม่ถูกนำกลับมาใช้แม้กลุ่มถูกปิดใช้งานหรือลบอย่างปลอดภัย การลบถูกป้องกันเมื่อยังมีนักศึกษาหรือ Section อ้างอิง

ปุ่ม `เพิ่มโครงสร้างการศึกษา` เปิด Wizard 5 ขั้น:

```text
คณะ → ภาควิชา → สาขาวิชา → ปีเข้าและกลุ่มเรียน → ตรวจสอบและบันทึก
```

แต่ละขั้นเลือกข้อมูลเดิมหรือสร้างใหม่ได้ Wizard แสดง preview ของรหัสกลุ่ม ตรวจข้อมูลทั้งหมดบน state ชั่วคราว และ commit ครั้งเดียวเมื่อยืนยัน รายการที่ไม่ผ่าน validation จะไม่ถูกบันทึกบางส่วน

## ปีเข้าและชั้นปี

`admissionYear` เก็บเป็นปีพุทธศักราชเต็ม เช่น `2567` และแสดงเป็น `ปีเข้า 67` ใน UI ห้ามใช้คำว่า `รุ่น` ชั้นปีไม่ใช่ master data และคำนวณจาก:

```text
yearLevel = currentAcademicYear - admissionYear + 1
```

`academicSettings.currentAcademicYear` ใน `src/utils/academicYear.ts` เป็นแหล่งปีการศึกษากลาง ห้ามคำนวณจากปีปฏิทินของอุปกรณ์ Student ID ใช้แนะนำปีเข้าในฟอร์มได้ แต่ `admissionYear` ที่บันทึกแยกต่างหากยังเป็น canonical source

Student Management มีโหมด `นักศึกษาทั้งหมด` สำหรับค้นหาเร็ว และ `แยกตามปีเข้า` สำหรับกรองคณะ ภาควิชา สาขาวิชา ปีเข้า ชั้นปี และกลุ่มเรียน ตารางแสดงกลุ่มที่กำหนดหรือ `ยังไม่กำหนด` และ CSV ส่งออกรายการทั้งหมดที่ผ่านตัวกรอง

## Course และ Section

Course ผูกกับคณะและภาควิชาด้วย stable IDs ส่วน Section ระบุปีการศึกษา ภาคเรียน หมายเลขตอนเรียน Primary Teacher, Co-Teachers และ cohorts

```ts
type SectionCohort = {
  majorId: string;
  admissionYear: number;
  classGroupIds?: string[];
};
```

`classGroupIds` ว่างหมายถึงทั้ง cohort สาขาวิชา+ปีเข้า และสามารถเลือก RA, RB หรือ RA+RB ใน Section เดียวได้ Class Group กับ Section เป็นคนละแนวคิด ระบบตรวจ overlap/collision ของนักศึกษาระหว่าง Section ในรายวิชาและภาคการศึกษาเดียวกัน Teacher Portal และ Student eligibility ถูก project จาก Section assignment โดยใช้ stable IDs

## ห้องสอบและเครื่องคอมพิวเตอร์

หน้า Admin มีสามแท็บ: `ห้องสอบ`, `ผังที่นั่งและเครื่อง` และ `เครื่องคอมพิวเตอร์` ใช้โครงสร้าง `Floor → PhysicalRoom → ExamRoom → RoomSeat → ComputerDevice` โดยไม่จัดการอาคาร ห้องจริงถูกสร้างใต้ชั้นก่อน แล้วจึงเลือกเปิดเป็นห้องสอบได้

ข้อมูลหลักอยู่ใน `src/types/rooms.ts` และกฎตรวจสอบใน `src/services/roomState.ts` ห้องจริงอ้างอิง `floorId`, ห้องสอบอ้างอิง `physicalRoomId`, ที่นั่งอ้างอิง `roomId` และเครื่องอ้างอิง `seatId` ด้วย stable ID ผู้ดูแลกรอกเฉพาะรหัสย่อย เช่น `08` หรือ `01A` แล้วระบบสร้าง `B4-08` หรือ `B4-01A` จากชั้นให้อัตโนมัติ รหัสถูก trim/แปลงเป็นตัวพิมพ์ใหญ่และห้ามซ้ำภายในชั้นเดียวกัน ห้องจริงหนึ่งห้องเปิดเป็นห้องสอบได้ครั้งเดียว เครื่องเก็บหมายเลขเครื่อง, Serial Number, IPv4 และ MAC Address; ตรวจข้อมูลซ้ำทั้งระบบและอนุญาตหนึ่งเครื่องต่อที่นั่ง

แท็บ `ห้องสอบ` เรียงเป็น Summary cards → Tabs → Filter bar → Room table โดยไม่มี Floor overview cards หรือแผงชั้นที่เลือก ตารางแสดง Physical Room ทุกห้อง ทั้งที่เปิดและยังไม่เปิดเป็นห้องสอบ พร้อมค้นหารหัสห้อง ตัวกรองชั้น/สถานะห้อง/สถานะการเปิดสอบ ปุ่มเปิดเป็นห้องสอบ และรายละเอียดแยกข้อมูล Physical Room กับ Exam Room การเพิ่มชั้น เพิ่มห้องในชั้น และเพิ่มห้องสอบยังเปิดผ่านปุ่มระดับหน้าและ modal ได้ ห้องที่ยังไม่เปิดเป็นห้องสอบจะยังสร้างผังหรือกำหนดเครื่องไม่ได้

ผังสร้างรหัส A01, A02 … AA01 พร้อม ID คงที่ ขยายผังจะคง ID เดิม ลดผังจะถูกบล็อกหากที่นั่งที่ถูกลบมีเครื่องหรือประวัติการสอบอ้างอิง ใช้ 0 × 0 เพื่อล้างผังที่ไม่มีการอ้างอิงได้

เก็บข้อมูลรุ่น 2 ใน `securelab_room_state` โดย migrate รุ่น 1 และ `securelab_rooms` เดิมไปข้างหน้า สำหรับห้องสอบเดิม ระบบสร้างหรือใช้ Physical Room ร่วมกันจากคู่ชั้น+รหัสห้อง พร้อมคง Exam Room ID, Seat ID, Computer ID และการอ้างอิงประวัติสอบเดิม หน้า Teacher/Student อ่านข้อมูลที่ project จากแหล่งใหม่โดยเก็บชื่อที่นั่งเดิมสำหรับข้อสอบที่มีอยู่

ข้อมูลเก่าที่ไม่มี Serial Number จะแสดง `ยังไม่ระบุ` ให้ผู้ดูแลกรอกเมื่อแก้ไข ไม่สร้าง Serial ขึ้นเอง ชั้นที่แปลงไม่ได้จะแสดง `ยังไม่กำหนดชั้น` และไม่พร้อมสำหรับการจัดสอบใหม่ การย้าย/ลบเครื่องที่มีประวัติการจัดสอบถูกบล็อก ข้อมูลนี้เตรียมไว้สำหรับ Device Binding แต่ยังไม่มีการตรวจฮาร์ดแวร์จริง

## การส่งไฟล์ข้อสอบ

หน้า Student Exam File Submission ใช้ layout สองคอลัมน์บน desktop: กติกาด้านซ้าย และ Drop Zone ตามด้วยไฟล์ที่เตรียมส่งด้านขวา ต่ำกว่า 1024px จะเรียงแนวตั้ง

ไฟล์ที่เลือกถูกเก็บใน IndexedDB ทันที แต่ละไฟล์มี `uploadId` และ `uploadSequence` คงที่ ชื่อส่งเริ่มต้นคือ:

```text
{studentId}_{firstName}_{lastName}_{uploadSequence}.{extension}
6410123457_somying_rakrian_1.py
```

Rename เปลี่ยนเฉพาะ `submissionName` โดยคง `originalName`, extension, sequence, blob, progress และ upload identity การตรวจไฟล์ใช้ `File.size` เป็น bytes และปฏิเสธเฉพาะไฟล์ 0 bytes จึงรองรับไฟล์ต่ำกว่า 1 KB

การส่งด้วยตนเองมี confirmation dialog เมื่อหมดเวลา ระบบส่งไฟล์พร้อมใช้โดยอัตโนมัติและให้ grace period 10 วินาทีแก่ไฟล์ที่กำลังอัปโหลด หากไม่มีไฟล์พร้อมส่งจะแสดงสถานะไม่พบไฟล์ Teachers สามารถ reopen submission ตาม flow เดิม

## Persistence และข้อจำกัด

Application state เก็บใน `localStorage`; staged blobs และ sequence counters เก็บใน IndexedDB `securelab-staged-uploads` browser storage เป็นเพียง mock persistence ไม่ใช่ production database หรือ security boundary

Academic, Teacher และ Course data ใช้ forward migration และไม่ล้างข้อมูลเก่าโดยอัตโนมัติ Legacy records จะถูก map เฉพาะเมื่อระบุความสัมพันธ์ได้อย่างไม่กำกวม มิฉะนั้นเก็บข้อความ fallback ไว้ให้ Admin แก้ไข

## การตรวจสอบก่อนส่งงาน

รัน:

```sh
npm run lint
npm run test:academic
npm run test:courses
npm run test:rooms
npm run build
git diff --check
```

ควร regression-test Student, Teacher และ Admin flows ที่ได้รับผลกระทบ Vite อาจแสดงคำเตือน bundle size ซึ่งไม่ทำให้ build ล้มเหลว

อ่านกติกาสำหรับผู้พัฒนาที่ [AGENTS.md](AGENTS.md)
