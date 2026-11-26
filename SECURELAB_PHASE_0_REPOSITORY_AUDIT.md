# SecureLab Phase 0 — Repository Audit & Standardization Assessment

วันที่ตรวจ 26 พฤศจิกายน 2026 · ขอบเขต frontend repository ณ working tree ปัจจุบัน

## 1. Executive Summary

SecureLab มี domain services และ regression tests ที่เป็นฐานสำหรับพัฒนาต่อได้ โดยเฉพาะ Academic, Course/Section, Room migration, exam status และ upload preview อย่างไรก็ตาม ยังมีข้อบกพร่องในความสัมพันธ์ Exam–Section, ID generation, การเพิ่มเวลารายบุคคล, audit schema และความทนทานของ browser persistence ที่ควรแก้ก่อนออกแบบ API contract ฉบับใช้งานจริง

ผล baseline คือ TypeScript ผ่าน ชุดทดสอบ 17 คำสั่งรวม 206 tests ผ่าน และ production build ผ่านพร้อม bundle-size warning ผลเหล่านี้ครอบคลุม behavior ที่ tests ระบุเท่านั้น ยังไม่มีการยืนยัน multi-tab concurrency, browser IndexedDB failure หรือ production security enforcement

อ่าน AGENTS.md ทั้งไฟล์ รวมข้อกำหนด academic, authentication, room, upload และ legacy compatibility ประกอบ README.md, package.json, types, services, context และ role consumers การตรวจนี้เพิ่มเฉพาะรายงาน ไม่มีการแก้ application source, AGENTS.md, dependencies หรือ browser storage และไม่มี commit/push การรัน build สร้าง output ใน dist ตามคำสั่งเดิมของโครงการ

Severity ใช้ High สำหรับปัญหาที่อาจผูกข้อมูล/สิทธิ์ผิดหรือกระทบคำตอบสอบ Medium สำหรับความทนทานและความสอดคล้องที่ต้องจัดการก่อน integration และ Low สำหรับ debt ที่ยังไม่มีหลักฐานทำให้ flow ผิด ไม่มีการจัด plaintext mock password เป็นช่องโหว่ production ที่ deploy แล้ว เพราะ repository นี้ระบุชัดว่าเป็น prototype

## 2. Current Architecture

```text
main.tsx → AppProvider → App.tsx → Auth / Student / Teacher / Admin
                         ↓ useApp()
AppContext → domain services → mock seed / LocalStorage
Student ExamSessionView → stagedUploadStorage → IndexedDB
Preview → filePreview / archivePreview → escaped text / image / ZIP metadata
```

AppContext เป็นทั้ง composition root, persona/session state, navigation state, authorization projections, domain commands, migrations, persistence และ toast coordinator ส่วน academicState, courseState, roomState และ examWizard แยก pure logic ออกมาแล้วบางส่วน UI หลายหน้าจึง reuse services ได้ แต่ command validation และ transaction orchestration ยังอยู่หลายชั้น

React Context ใช้ value object เดียวและมีนาฬิกาผ่าน useExamClock จึงมีโอกาสทำให้ consumers ที่ไม่เกี่ยวกับเวลา render ตาม context update ควรวัดด้วย profiler ก่อนสรุปผลกระทบด้าน performance

## 3. Repository Inventory

| ส่วน | สิ่งที่พบ | บทบาท |
| --- | --- | --- |
| Git tracked files | 120 ไฟล์ก่อนเพิ่มรายงาน | inventory จาก git ls-files |
| src | 110 ไฟล์ รวม 109 .ts/.tsx/.d.ts และ 18 test files | application และ tests |
| src/components | auth, admin, teacher, student, common, simulation | role UI และ shared primitives |
| src/services | academic, auth, course, room, wizard, monitoring, roster, preview, storage, demo time | domain logic และ adapters |
| src/types.ts + src/types | legacy-facing models และ canonical records/input types | contracts ที่ยังผสม compatibility |
| src/data | initialData, academicStructure, teacherCourseDemo | seed/mock |
| vite.config.ts / tsconfig.json | Vite React/Tailwind, TypeScript validation | toolchain |
| package.json / package-lock.json | npm scripts และ locked dependency graph | ไม่มี backend start script |

ไฟล์ขนาดใหญ่ ได้แก่ ExamSessionView.tsx 1,595 บรรทัด, AppContext.tsx 1,383, LiveExamMonitoring.tsx 1,231 และ UserRoleManager.tsx 950 ขนาดเป็นตัวบอกจุดที่ควรแยกความรับผิดชอบร่วมกับ behavior analysis ไม่ถือเป็น defect โดยลำพัง

Static import scan พบทุก source module มี incoming import ยกเว้น main.tsx ซึ่งเป็น entry point และ vite-env.d.ts ซึ่งเป็น ambient declaration จึงไม่มีหลักฐานเพียงพอให้ประกาศว่า component ใดเป็น unused file จากชื่อไฟล์อย่างเดียว

## 4. Domain Model Analysis

| Domain | รูปแบบปัจจุบัน | ข้อสังเกต |
| --- | --- | --- |
| Academic | Faculty → Department → Major, adjacent ClassGroup | stable IDs และ derived year เป็นแนวทางหลัก |
| Student | id, studentCode, optional majorId/admissionYear/classGroupId พร้อม legacy display fields | ต้องแยก unresolved migration state จาก valid write contract ในอนาคต |
| Teacher | facultyId/departmentId และ fallback labels | course access มาจาก Section assignment |
| Course | embedded sections ภายใน Course[] | Section มี stable id แต่ Exam ยังเลือกด้วย sectionNo |
| Section | cohorts + included/excludedStudentIds | whole cohort และ optional Class Group narrowing |
| Exam | courseId, sectionNo, roomId, imported/eligible student IDs, layout, policy | ความสัมพันธ์ Section ยังไม่เป็น foreign key ที่ชัดเจน |
| Room | Floor → PhysicalRoom → ExamRoom → RoomSeat → ComputerDevice | Room[] เป็น projection สำหรับ role consumers |
| SeatAssignment | examId + seatNo + studentId | อาศัย room ของ exam เพื่อ resolve label |
| Submission | examId/studentId และ file metadata | blob อยู่ staged IndexedDB แยกจาก submission record |
| Audit | AuditLog กับ AuditLogEntry คนละ shape | producer และ Admin reader ไม่ตรงกัน |

Database ต้องรักษา composite uniqueness ของ Section ตาม Course + academic year + semester + section number, ClassGroup sequence ที่ห้าม reuse, device identifiers ที่ unique, one computer per seat และ historical references การ normalize ตารางในอนาคตต้องรักษา imported roster order และ snapshot semantics

## 5. Source of Truth Analysis

| ข้อมูล | แหล่งหลักใน implementation | ผู้ใช้ข้อมูล |
| --- | --- | --- |
| Academic hierarchy/migration | academicState.ts, types/academic.ts | Admin, registration, student profile, Section cohorts |
| Current academic year | utils/academicYear.ts | derived student year และ admission options |
| Course/Section eligibility | courseState.ts | Admin CRUD, Teacher portal, Student exams |
| Exam setup | examWizard.ts + AppContext commands | wizard, drafts, monitoring |
| Effective exam status | examStatus.ts + useExamClock/demoTime | exam lists, Student access, monitoring |
| Room canonical state | roomState.ts + fixedRoomCatalog.ts | Admin canonical UI และ projected Room[] |
| Auth mock | authState.ts + mock auth slice | login/registration |
| Blob/sequence | stagedUploadStorage.ts | current Student attempt และ preview |
| File naming/replacement | ExamSessionView.tsx | Student staging |
| Audit | AppContext producers → SystemAuditLog/ExamActivityReport | shape conflict ตาม F04 |

### F01 — Exam อ้าง Section ด้วยหมายเลขที่ซ้ำข้ามปี/ภาคเรียนได้

- Classification / Category / Severity — Confirmed issue · Domain relationship / authorization · High
- Evidence — src/types.ts:204–233 กำหนด ExamSession เป็น `courseId` + `sectionNo` โดยไม่มี sectionId; src/services/courseState.ts:134 และ 162 อนุญาต uniqueness ตามปี/ภาคเรียน; src/services/examWizard.ts:213,221,369 และ src/services/teacherMonitoring.ts:60–63 ใช้ `.find(...sectionNo === ...)`; AppContext.tsx:362,881,921 ใช้หมายเลขเดียวกัน
- Root cause — exam relationship เก่าคงอยู่หลัง Section มี stable identity และหลาย teaching periods
- Current behavior — เมื่อ Course มี Section เลขเดียวกันหลายปี lookup เลือกตัวแรก หรือ authorization projection จับคู่ Section เลขเดียวกันในอีก period ได้ courseState.ts:269–270 มี guard สำหรับ ambiguous roster overrides อยู่แล้ว แต่ไม่ครอบคลุมทุก reader
- Impact / Consumers — roster, Teacher visibility, Student eligibility, wizard, monitoring, delete guards และ historical exams อาจ resolve ผิด Section
- Recommendation — เพิ่ม canonical sectionId ผ่าน forward migration ที่ map เฉพาะกรณีไม่กำกวม เก็บ unresolved records ให้ตรวจแก้ ห้ามเดา ID และปรับทุก consumer ก่อนเลิก fallback
- Refactoring risk — สูง เพราะเป็น cross-flow persisted relationship
- Required regression — same Course/sectionNo ต่างปีและ semester, คนละผู้สอน/cohort, ambiguous legacy exam, renamed section, frozen roster และ authorization denial

### F02 — ID สร้างจากจำนวนรายการอาจชนหลังลบ

- Classification / Category / Severity — Confirmed issue · Stable IDs · High
- Evidence — AppContext.tsx:659 `tch_${String(teachers.length + 1)...}`, :705 ใช้ admins.length และ :742 ใช้ storedCourses.length
- Root cause — collection length ถูกใช้เป็น identity allocator
- Current behavior — หากเหลือ tch_0001 กับ tch_0003 หลังลบ tch_0002 การเพิ่มถัดไปสร้าง tch_0003 ซ้ำ
- Impact / Consumers — profile lookup, React keys, teacher assignments และ foreign references อาจชี้หลาย record; course/admin มี pattern เดียวกัน
- Recommendation — ใช้ allocator ที่ไม่ reuse เช่น UUID ผ่าน existing command boundary และให้ backend/database enforce uniqueness เมื่อเชื่อมต่อ
- Refactoring risk — Medium ต้องรักษา IDs ของข้อมูลเดิม
- Required regression — delete-middle/add, repeated creation, existing sparse IDs และ concurrent creates

## 6. Confirmed Duplicate Logic

การพบ pattern ซ้ำไม่ได้แปลว่าผิดทุกกรณี จุดที่ยืนยันว่าเป็น implementation ของกฎเดียวกันและควรรวมมีดังนี้

### F03 — Section resolution ถูกทำซ้ำหลายชั้น

- Classification / Category / Severity — Confirmed issue · Duplicate domain lookup · High
- Evidence — examWizard.ts:213, teacherMonitoring.ts:62, courseState.ts:259, AppContext.tsx:881,921,945,1141 ล้วน resolve Course/Section ด้วย courseId และ sectionNo
- Root cause — ยังไม่มี resolver ของ Exam→Section ที่เป็น canonical และรายงาน ambiguity
- Current behavior — lookup และ active/authorization checks แตกต่างตาม caller
- Impact / Consumers — การแก้ F01 เฉพาะ UI จะยังเหลือ reader ที่ผูกผิด
- Recommendation — สร้าง shared resolver พร้อม explicit resolved/missing/ambiguous result แล้วเปลี่ยน consumers แบบ incremental
- Refactoring risk — High และสัมพันธ์กับ F01
- Required regression — ทดสอบ resolver และ flow authorization ทั้งสาม role ด้วย fixture เดียวกัน

### F04 — Audit models ขัดกันและ Admin อ่าน fields ที่ producer ไม่เขียน

- Classification / Category / Severity — Confirmed issue · Conflicting models · High
- Evidence — src/types.ts:282–299 `AuditLog` ใช้ actor/action/details ขณะที่ :305–315 `AuditLogEntry` ใช้ performedBy/role/target/ip/status; AppContext.tsx:335 เก็บ AuditLog[]; SystemAuditLog.tsx:26,29–35,140–162 อ่านอีก shape; AppContext.tsx:975–982 เขียน actor และ details
- Root cause — Admin audit UI กับ domain event producers ใช้คนละ contract; TypeScript strictNullChecks ไม่ได้เปิด
- Current behavior — actor/target/IP/status ว่างหรือ fallback เป็น failure และ role filter ตัดรายการที่ไม่มี role
- Impact / Consumers — Admin audit, Teacher activities และการส่งออกในอนาคตสูญเสียความหมายของเหตุการณ์
- Recommendation — canonical audit event ที่มี actor stable ID, event type, target, ISO timestamp และ structured payload พร้อม adapter สำหรับ legacy logs
- Refactoring risk — High ต้องอ่าน log เดิมได้
- Required regression — seat move/time/reopen event render, role filter, legacy adapter, malformed event และ audit authorization

### F05 — CourseRecord/SectionRecord เป็น competing type declarations ที่ยังไม่มี consumer

- Classification / Category / Severity — Potential issue requiring verification · Types / dead declarations · Low
- Evidence — src/types/course.ts:3–26 ประกาศ normalized CourseRecord/SectionRecord; src/types.ts:151–198 มี Course/Section แบบ embedded; rg พบชื่อ CourseRecord/SectionRecord เฉพาะ declaration ส่วน UI/service ใช้ Course, CourseInput, SectionInput และ LocatedSection
- Root cause — เตรียม normalized contract ไว้แต่ runtime ยังเป็น embedded model
- Current behavior — ไม่พบ runtime defect จาก declarations นี้
- Impact / Consumers — backend implementer อาจเลือก contract ที่ไม่ได้เป็น source of truth จริง
- Recommendation — หลังอนุมัติให้กำหนดบทบาท adapter/DTO/canonical ให้ชัดก่อนใช้เป็น API contract
- Refactoring risk — Low สำหรับ unused declarations แต่ High หากเปลี่ยน runtime model
- Required regression — type validation, serialized Course migration และ Section assignment tests เมื่อมีการเปลี่ยน

### F06 — Compatibility duplication ที่ควรคงไว้ระหว่าง migration

- Classification / Category / Severity — Legacy compatibility requirement · Models · Informational
- Evidence — src/types.ts:79–107 Student เก็บ majorId/admissionYear พร้อม legacy faculty/program/year fields; types.ts:143–152 Room projection; AppContext.tsx:272–275 derive student fields และ :386 serialize ผ่าน withoutStudentYear; roomState.ts มี migrateRoomState/projectRooms
- Root cause / Current behavior — consumer เดิมและ persisted snapshots ต้องอ่านได้ระหว่างเปลี่ยน canonical model
- Impact / Consumers — ลบ fields หรือ Room projection ทันทีอาจทำให้ Student/Teacher และข้อมูลเก่าเสีย
- Recommendation — กำหนด read-compatible DTO และ canonical write types ให้ต่างหน้าที่ พร้อม migration exit criteria
- Refactoring risk — High
- Required regression — academic vเก่า, unresolved major, room v1/v2, seat/device IDs และ historical exam projection

## 7. Documentation Conflicts

### F07 — คำแนะนำสร้างห้องยังอยู่คู่กับ fixed catalog

- Classification / Category / Severity — Confirmed issue · Documentation conflict · Medium
- Evidence — AGENTS.md:1196–1215 อธิบาย newly created Physical Rooms และ suffix input; :1219–1223 กำหนด fixed seven-room catalog และห้าม creation/rename/delete; :1861 ยังบอก New Physical Room codes; fixedRoomCatalog.ts:4 ระบุเจ็ดห้องจริง
- Root cause — guideline เรื่อง generic service และ managed product UI ไม่แยก applicability ให้ชัด
- Current behavior — service/test generic CRUD ยังมีเพื่อ compatibility แต่ managed Admin UI จำกัด catalog
- Impact / Consumers — ผู้พัฒนาครั้งถัดไปอาจนำปุ่มเพิ่มห้องกลับมาโดยเข้าใจว่าเป็น requirement
- Recommendation — หลังอนุมัติ ปรับข้อความ generic ให้ระบุว่าใช้กับ legacy/domain compatibility และให้ fixed catalog เป็น product rule
- Refactoring risk — Low สำหรับเอกสาร, High หากตีความเป็นคำสั่งลบ migration
- Required regression — fixed seven rooms, absence of creation controls, preserve customized layouts และ legacy room references

README.md ระบุ mock security และ plaintext credentials ชัดเจน แต่ข้อความในบาง UI ยังสร้างความเข้าใจเกิน implementation ตาม F11 AGENTS.md:87 และ README command table เรียก npm install ว่าติดตั้งตาม lockfile ซึ่งไม่ได้ให้ reproducible/frozen behavior แบบ npm ci ควรชี้แจงในขั้น documentation review โดยไม่เปลี่ยน dependency ระหว่าง audit

## 8. State and Persistence Issues

### F08 — Multi-key writes ไม่มี atomic boundary และ write error handling

- Classification / Category / Severity — Confirmed issue · Persistence · High
- Evidence — AppContext.tsx:376–427 เขียน academic/students/auth/rooms/courses/exams/seats/submissions/violations ด้วย useEffect แยกกัน; :910–911 seat changes และ :929 exam changes เป็นคนละ state; :231–239 safeParse จับ read failure แต่ write effects ไม่จับ quota/security errors
- Root cause — React state updates ถูกใช้แทน transaction และ durable commit
- Current behavior — UI สำเร็จก่อน persistence effects เสร็จ; quota failure หรือ process interruption อาจเก็บเพียงบาง slice และอีก tab เขียนทับ snapshot ได้ ไม่มี storage-event reconciliation ใน context
- Impact / Consumers — exam-seat-audit และ student-auth/academic state อาจไม่สอดคล้องหลัง reload
- Recommendation — persistence adapter พร้อม explicit commit result และ versioned snapshot/transaction strategy สำหรับ prototype; backend ใช้ database transaction และ optimistic concurrency
- Refactoring risk — High
- Required regression — quota/denied storage, interrupted commit, reload, two tabs, stale version และ partial migration

### F09 — JSON parse สำเร็จไม่ได้แปลว่าเป็น valid state

- Classification / Category / Severity — Confirmed issue · Runtime validation / migration · Medium
- Evidence — AppContext.tsx:231–239 `return JSON.parse(saved)` cast เป็น T; :260–261 เรียก storedStudents.map และ :305–307 เรียก exam collection.map โดยไม่มี shape guard
- Root cause — generic type assertion ถูกใช้เป็น storage validation
- Current behavior — JSON `{}` ที่ parse ได้ใน array key ทำให้ initialization throw แทน safe fallback
- Impact / Consumers — application boot, migration และทุก portal
- Recommendation — validate envelope/collection/record shapes ก่อน migration เก็บข้อมูลที่ผิดสำหรับ recovery และไม่เงียบแทนข้อมูลผู้ใช้ด้วย seed
- Refactoring risk — High เนื่องจาก fallback อาจเปลี่ยนข้อมูลเก่า
- Required regression — null/object/array malformed fields, invalid versions, unresolved foreign keys และ repeat migration idempotence

### F10 — IndexedDB promise resolve ก่อน commit และ delete ไม่รอผล

- Classification / Category / Severity — Confirmed issue · Upload durability · High
- Evidence — stagedUploadStorage.ts:101–132 runTransaction ส่ง resolve ให้ request.onsuccess โดย transaction.oncomplete ทำเพียง close; ExamSessionView.tsx:488–491 ลบจาก UI แล้ว `void deleteStagedUpload(uploadId)`; saveQuestionFiles:167–182 รอ transaction complete ซึ่งเป็น pattern ที่ทนทานกว่า
- Root cause — request success กับ durable transaction completion ถูกถือเป็นเหตุการณ์เดียวกัน
- Current behavior — save/delete บางเส้นทางรายงานสำเร็จก่อน transaction เสร็จ; delete failure ไม่มี rollback UI หรือ user feedback จึงอาจกลับมาเมื่อ reload
- Impact / Consumers — upload progress, rename/delete, restore และ preview identity
- Recommendation — resolve transaction helper เมื่อ oncomplete, reject abort/error และ close ทุกทาง; await deletion ก่อน commit UI หรือ rollback เมื่อผิดพลาด
- Refactoring risk — High เพราะผูกกับ autosubmit และ grace period
- Required regression — IDB abort หลัง request success, blocked upgrade, quota, failed delete/rename, reload, concurrent sequence reservation และ v1–v6 migration

### F11 — เพิ่มเวลารายบุคคลปรับเวลารวมของทั้งรอบ

- Classification / Category / Severity — Confirmed issue · Exam timing · High
- Evidence — LiveExamMonitoring.tsx:431–440 ส่ง scope และ targetStudentId; AppContext.tsx:956–980 รับทั้งสองแต่ :968–972 อัปเดต `exam.adjustedMinutes` โดยไม่แตกแขนง scope; ใช้ target เฉพาะข้อความ log
- Root cause — model มี adjustedMinutes ระดับ Exam แต่ UI มี individual control
- Current behavior — เลือกรายบุคคลแล้วนักศึกษาทั้งรอบเห็นเวลาเพิ่มจาก exam field เดียวกัน
- Impact / Consumers — Student countdown/access, monitoring/status และ schedule conflict semantics
- Recommendation — ตกลง contract ของ per-student adjustment แล้วใช้ shared effective deadline resolver โดยคง room adjustment และ reopening แยกความหมาย
- Refactoring risk — High
- Required regression — A เพิ่มเวลาแต่ B ไม่เปลี่ยน, room + individual combination, late/auto submit, demo/real clock และ audit target

## 9. Security Boundary Analysis

### F12 — Integrity/audit UI อ้างการตรวจทาง cryptographic ที่ยังไม่มี

- Classification / Category / Severity — Confirmed issue · Misleading security feedback · High
- Evidence — AppContext.tsx:1148–1172 ใช้ sizeBytes === 0 ตัดสิน damaged/valid แล้วเขียน `Format and checksum verified` กับ passed; AnswerFileRepository.tsx:283–289 แสดง success badge และ fallback checksum คงที่; SystemAuditLog.tsx:220–223 อ้าง institutional ICIT HMAC และ :70 immutable history ขณะที่ logs อยู่ LocalStorage
- Root cause — mock result และ UI assurance ไม่ได้แยกกันใน contract
- Current behavior — nonempty metadata ถูกแสดงเสมือนตรวจ checksum; ไม่มี hash/signature verification ในเส้นทางนี้
- Impact / Consumers — Student submission feedback, Teacher answer repository และ Admin forensic audit อาจถูกเข้าใจว่าเป็น production assurance
- Recommendation — ระบุ simulated/unverified status ใน contract/UI หลังอนุมัติ และให้ backend คำนวณ digest จาก bytes, verify retrieval และจัด append-only audit ตาม requirement ที่ออกแบบจริง
- Refactoring risk — Medium
- Required regression — nonempty invalid bytes ไม่ได้สถานะ cryptographically verified, damaged status rendering, missing digest และ mock labels

### F13 — Mock auth/time/policy เป็น boundary ที่ต้องย้ายก่อน production

- Classification / Category / Severity — Acceptable existing implementation · Mock security boundary · Informational ใน prototype / production blocker
- Evidence — authState.ts:169–173 เทียบ mockPassword ใน browser; :194–205 merge registered/face/password ตาม canonical seeds; demoTime.ts:4 `DEMO_TIME_ENABLED = true`; AppContext.tsx:398 persist mockAuthUsers; ExamPolicy ใน types.ts:25–67 เป็น configuration
- Root cause / Current behavior — prototype จำลอง Google account, password, face status, device/network restrictions และ time override ไม่มี server session หรือ trusted enforcement
- Impact / Consumers — ทุก role, exam access และ submission ต้องตรวจใหม่ฝั่ง server เมื่อเชื่อม backend
- Recommendation — server authentication/session, authorization ทุก command/read, trusted time, password hashing/reset, scoped roster/blob access และแยก Agent enforcement contract; ห้ามอาศัย role filter ใน UI เป็น security boundary
- Refactoring risk — High
- Required regression — unauthenticated/role mismatch, object-level access, teacher unassigned Section, suspended account, spoofed browser state/time และ expired session

### F14 — Command authorization/validation ยังไม่รวมศูนย์

- Classification / Category / Severity — Potential issue requiring verification · Command boundary · High
- Evidence — AppContext.tsx:915–931 createExamSession ตรวจ ready room และ active course/section ผ่าน projected courses แล้ว save seats แต่ไม่มี call ไป final wizard validator; :956–973 adjustExamTime ตรวจ status แต่ไม่มี teacherCanManageSection ใน command; :1142 uploadFiles มี explicit role/currentStudent/eligibility guard
- Root cause — หลาย command เชื่อว่า UI และ projected context ตรวจสิทธิ์/inputs มาแล้ว
- Current behavior — normal wizard มี validation แต่ direct command caller ไม่ได้รับ guard ชุดเดียวกัน ต้องพิสูจน์ผ่าน provider-level integration tests
- Impact / Consumers — simulation controls, Teacher operations และ future API callers อาจ bypass กฎที่มีเฉพาะ UI
- Recommendation — ทำ command preconditions เป็น shared service โดยคง UI feedback แล้ว port เงื่อนไขไป server independently
- Refactoring risk — High
- Required regression — invoke commands โดยข้าม wizard, invalid schedule/overlap, unrelated teacher, student role และ stale projected state

### F15 — Preview boundary ปัจจุบันแยก executable content ได้เหมาะสม

- Classification / Category / Severity — Acceptable existing implementation · Untrusted uploads · Informational
- Evidence — filePreview.ts:24–41 เลือก SVG เป็น metadata, image ต้องตรง MIME, text ใช้ read-only text; :53–57 จำกัด text 1 MB; archivePreview.ts:6–15 มี resource limits และ :71 อ่าน entries metadata; filePreview/archive tests ทดสอบ active-looking source และ archive fallback
- Root cause / Current behavior — preview แสดงข้อมูลโดยไม่ evaluate uploaded code และ ZIP ไม่แตกไฟล์ลง filesystem
- Impact / Consumers — Student preview ยังคงเป็น untrusted-data reader; ไม่เท่ากับ antivirus, MIME authenticity หรือ safe execution
- Recommendation — รักษา fail-closed preview, resource limits และ execution separation เมื่อเพิ่ม backend; future code judge ต้อง isolated sandbox ตาม AGENTS
- Refactoring risk — High หากเพิ่ม active document viewer หรือ judge
- Required regression — HTML/JS escape, SVG fallback, MIME mismatch, malformed/encrypted ZIP, path traversal metadata, bomb limits และ attempt isolation

## 10. Dead Code and Dependency Findings

### F16 — Download/export หลายปุ่มเป็น simulation

- Classification / Category / Severity — Acceptable existing implementation · Incomplete integration · Medium readiness gap
- Evidence — AnswerFileRepository.tsx:53–59 single download ทำเพียง showToast; :62–85 bulk ใช้ timers; SystemAuditLog.tsx:39–47 export ทำเพียง showToast; SubmittedFile ใน types.ts:251–262 มี metadata/uploadId แต่ไม่มี durable object locator/digest contract
- Root cause / Current behavior — prototype แสดง flow โดยยังไม่มี retrieval/archive/export implementation
- Impact / Consumers — ผู้สอนไม่สามารถใช้ปุ่มเหล่านี้รับคำตอบจริงเพื่อทำงาน production ได้
- Recommendation — ออกแบบ finalized immutable object reference, authorized download, archive manifest และ audit export contract ก่อน implementation
- Refactoring risk — High สำหรับคำตอบจริง, Medium สำหรับ UI adapters
- Required regression — bytes round-trip, original/renamed filename, teacher ownership, partial bulk failure, expired links และ CSV escaping

### F17 — Dependency declarations และ build payload มี debt

- Classification / Category / Severity — Potential issue requiring verification · Dependencies / performance · Medium
- Evidence — package.json:31,35,36,38,47 มี @google/genai, dotenv, express, motion, @types/express; repository search ไม่พบ imports การใช้งานใน source/config ของแพ็กเกจเหล่านี้; vite อยู่ทั้ง dependencies และ devDependencies; build แสดง main JS 1,019.49 kB และ pdf chunk 501.34 kB
- Root cause — starter dependencies และ role code รวมใน application entry
- Current behavior — build ผ่านพร้อม warning; absence of imports ไม่พิสูจน์ว่าลบ dependency ได้โดยไม่ตรวจ tooling
- Impact / Consumers — install surface, maintenance และ initial-load performance ต้องวัดเพิ่ม
- Recommendation — ตรวจ direct/transitive/tooling usage และ lockfile ก่อนเสนอ removal แยก PR; วัด load แล้วค่อยแยก role chunks
- Refactoring risk — Low–Medium
- Required regression — clean install/build ใน environment ที่อนุมัติ, role navigation และ lazy import error recovery

### F18 — Type-only circular coupling และ compiler checks ที่ยังผ่อนปรน

- Classification / Category / Severity — Confirmed issue · Module coupling / validation debt · Low
- Evidence — types.ts:206 `import('./services/examLayout').ExamLayout` และ examLayout.ts:1 import type จาก ../types ทำให้ graph มี types→service→types; tsconfig.json ไม่เปิด strict/noUnusedLocals/noUnusedParameters; types.ts:311 role เป็น string ทำให้ SystemAuditLog รับ role ได้โดย type checking ปัจจุบัน
- Root cause — domain shape อยู่ใน service และ TypeScript defaults ยังผ่อนปรน
- Current behavior — cycle เป็น type-only จึงไม่มีหลักฐาน runtime initialization failure; unused declarations และ nullability mismatch หลุด baseline ได้
- Impact / Consumers — contract discoverability และ refactor confidence
- Recommendation — หลังอนุมัติย้าย ExamLayout ไป types module และเปิด stricter checks ทีละกลุ่มโดยไม่ suppress errors
- Refactoring risk — Medium สำหรับ strict rollout, Low สำหรับ type move
- Required regression — tsc, all domain suites และ serialized exam compatibility

### F19 — Shared Modal ยังไม่มี keyboard focus lifecycle

- Classification / Category / Severity — Confirmed issue · Shared UI accessibility · Medium
- Evidence — common/Modal.tsx:25–34 เพิ่ม Escape handler; :64–92 render role=dialog แต่ไม่มี initial focus, focus trap, return focus หรือ background inert management ทั้ง component; ExamSessionView.tsx:502–507 ทำ return focus สำหรับ delete dialog เอง
- Root cause — shared primitive ดูแล appearance/close แต่ focus behavior อยู่บาง callers
- Current behavior — keyboard focus สามารถคงอยู่ด้านหลัง modal; dialogs ซ้อนอาจรับ Escape พร้อมกัน
- Impact / Consumers — Admin CRUD/import, Teacher wizard controls และ confirmation dialogs
- Recommendation — รวม keyboard/focus lifecycle ใน shared primitive พร้อม nested modal policy หลังอนุมัติ
- Refactoring risk — Medium เพราะมี consumers จำนวนมาก
- Required regression — Tab/Shift+Tab, Escape เฉพาะ top dialog, restore trigger, async busy modal และ screen-reader labels

### F20 — Reset ใช้ origin-wide clear และไม่ได้จัดการ IndexedDB

- Classification / Category / Severity — Confirmed issue · Demo persistence isolation · Medium
- Evidence — AppContext.tsx:1238–1267 `resetToMockDefaults` เรียก `localStorage.clear()` และ reset React slices; SimulationToolbar.tsx:231 เรียก action นี้; ไม่มี staged IndexedDB cleanup ใน action
- Root cause — reset ไม่มี namespace/storage scope ที่ชัด
- Current behavior — ลบ LocalStorage ทุก key ของ origin รวม key อื่นที่อาจร่วม origin ขณะที่ staged blobs/counters ยังอยู่
- Impact / Consumers — demo drafts/preferences และ upload storage lifecycle อาจไม่ตรงกับคำว่า reset
- Recommendation — กำหนด reset scope ให้ชัดและลบเฉพาะ application-owned data ภายใต้ explicit user action พร้อม handle active attempts
- Refactoring risk — Medium และอาจทำลายข้อมูลถ้าออกแบบผิด
- Required regression — preserve unrelated key, reset all intended slices, blob retention policy และ active-attempt reset

## 11. Baseline Test and Build Results

Environment เป็น Windows PowerShell, Node v24.18.0, npm 11.16.0 ใช้ dependencies ที่มีอยู่ ไม่มี npm install/update/remove และไม่รัน destructive clean script

| Exact command | Exit | ผล |
| --- | --- | --- |
| npm.cmd run lint | 0 | tsc --noEmit ผ่าน |
| npm.cmd run test:academic | 0 | 26/26 |
| npm.cmd run test:auth | 0 | 23/23 |
| npm.cmd run test:courses | 0 | 33/33 |
| npm.cmd run test:monitoring | 0 | 13/13 |
| npm.cmd run test:exam-status | 0 | 5/5 |
| npm.cmd run test:demo-time | 0 | 5/5 |
| npm.cmd run test:student-demo | 0 | 4/4 |
| npm.cmd run test:file-preview | 0 | 11/11 |
| npm.cmd run test:archive-preview | 0 | 9/9 |
| npm.cmd run test:final-confirmation | 0 | 2/2 |
| npm.cmd run test:prepared-files | 0 | 3/3 |
| npm.cmd run test:student-navigation | 0 | 3/3 |
| npm.cmd run test:exam-wizard | 0 | 18/18 |
| npm.cmd run test:exam-management | 0 | 12/12 |
| npm.cmd run test:exam-detail | 0 | 6/6 |
| npm.cmd run test:exam-roster | 0 | 5/5 |
| npm.cmd run test:rooms | 0 | 28/28 |
| npm.cmd run build | 0 | Vite 6.4.3, 1,863 modules, 6.34 seconds |
| git diff --check | 0 | ผ่านก่อนเพิ่มรายงาน |

Build warning เดิมคือ chunks ใหญ่กว่า 500 kB หลัง minification main JS 1,019.49 kB (gzip 244.10 kB), PDF JS 501.34 kB (gzip 150.11 kB), PDF worker 1,271.92 kB ไม่มี source modification ก่อน baseline จึงถือผลและ warning นี้เป็นสถานะก่อน refactor

Test scripts ถูก execute ครั้งแรกครบใน runner เดียว บาง output ถูก tool ตัด จึงรัน tests ซ้ำเพื่อเก็บ count แบบสั้น ความพยายามสร้าง summary runner ครั้งหนึ่งล้มเหลวด้วย SyntaxError เนื่องจาก Unicode regex ผ่าน PowerShell pipe แล้วเปลี่ยน encoding แก้ runner เป็น ASCII และรันใหม่ผ่าน นี่เป็น audit tooling failure ไม่ใช่ application failure อีก warning คือ Node DEP0190 ของ runner แรกที่ใช้ shell:true ไม่ใช่ warning จาก application code

ไม่ได้รัน dev/preview ซึ่งเป็น long-running servers หรือ clean ซึ่งลบ artifacts ไม่ใช่ validation ไม่มี browser interaction, browser storage mutation หรือการทดลองโหลด PDF จริงใน audit นี้ ชุด tests ส่วนมากเป็น pure services และ server-rendered component assertions ไม่มี browser E2E suite ใน scripts

## 12. Prioritized Refactoring Backlog

| Priority | Finding | งานที่เสนอ | Completion evidence |
| --- | --- | --- | --- |
| P0 ก่อน canonical API/schema | F01/F03 | Stable Exam.sectionId และ shared resolver | ambiguous migration + cross-period authorization tests |
| P0 | F02 | Non-reused IDs | sparse-ID create และ concurrency tests |
| P0 | F11 | Individual deadline semantics | แยกผลต่อ Student A/B และ auto-submit |
| P0 | F04/F12 | Audit contract และ honest integrity states | producer→reader tests และ missing digest handling |
| P0 integration gate | F13/F14 | Server command/read authorization contract | role/object ownership matrix |
| P1 | F08/F09 | Persistence validation/commit adapters | fault/reload/multi-tab tests |
| P1 | F10 | IDB commit/error lifecycle | aborted transaction และ failed-delete recovery |
| P1 | F16 | Finalized storage/retrieval contract | bytes round-trip และ scoped download |
| P1 | F19/F20 | Modal focus/reset scope | browser keyboard และ persistence-isolation tests |
| P2 | F05/F06/F18 | Canonical write types/legacy adapters | migration compatibility และ stricter type checks |
| P2 | F07/F17 | Documentation applicability/dependency review | updated guidance และ measured bundle outcome |

Priority ไม่ใช่อนุมัติ implementation รายการทั้งหมดเป็นข้อเสนอรอการอนุมัติ

## 13. Proposed Incremental Refactoring Plan

1. เก็บ baseline นี้และเพิ่ม characterization tests เฉพาะ regression ที่พิสูจน์ได้ก่อนเปลี่ยน behavior โดยเริ่ม F01/F02/F11/F04
2. กำหนด canonical identity และ command contracts แยก read projection, legacy persisted DTO และ valid write inputs โดยรักษา current UI
3. ทำ forward migration ของ exam section relationship แบบ explicit ambiguity report แล้วเปลี่ยน readers/writers ทีละ flow
4. แยก command preconditions ออกจาก UI และ AppContext โดย reuse existing domain services คง snapshot/cohort/collision rules
5. สร้าง persistence port พร้อม commit/error/version semantics แล้วค่อยลดความรับผิดชอบ AppContext เป็น domain slices โดยไม่เปลี่ยน framework
6. ทำ storage/upload lifecycle contract ให้ final submission อ้าง immutable bytes และมี idempotent finalization/replace/reopen semantics
7. ทบทวน security feedback, shared Modal และ dependency usage เป็นชุดเปลี่ยนแปลงแยกที่ตรวจย้อนกลับง่าย
8. เมื่อ frontend contracts และ migration ผ่าน จึงออกแบบ API/database transactions และ production auth ตาม approval แยกต่างหาก

แต่ละขั้นต้องรัน suites ที่เกี่ยวข้องและ full cross-flow baseline ก่อน merge พร้อมทดสอบ reload ของ persisted fixtures ห้ามแก้ปัญหาด้วยการล้าง storage

## 14. Regression Risk Assessment

| จุดเปลี่ยน | Risk | สิ่งที่ต้องรักษา |
| --- | --- | --- |
| Section identity / roster | High | assigned teachers, inclusions/exclusions, imported order, eligible snapshot, same-number periods |
| Academic canonical types | High | unresolved legacy data, Major path, derived year, ClassGroup sequence/history |
| Room projection/layout | High | fixed catalog, historical IDs, customized dimensions, occupied/history shrink guards |
| Exam time / submission | High | real/demo time distinction, deadline, grace 10s, reopening, retry separated from canonical submission |
| Blob storage | High | uploadId, sequence, originalName, selected question, rename/replacement and failed writes |
| Audit | High | actor/target identities, historical event readability and access restrictions |
| Context split | Medium–High | caller behavior, memoization, current personas และ mutation ordering |
| Shared Modal | Medium | nested dialogs, async validation, back vs close semantics |
| Dependency cleanup | Medium | dynamic PDF/XLSX/ZIP imports, Vite worker build และ platform commands |

Missing coverage ที่เห็นจาก scripts/tests ได้แก่ provider-level command integration, browser IDB migrations/fault injection, real PDF/XLSX parsing fixtures, multi-tab races, complete upload replacement→finalize→Teacher retrieval และ keyboard modal behavior ข้อเสนอ tests ในแต่ละ finding คือ regression gates สำหรับงานอนาคต ไม่มีการสร้าง tests เพิ่มใน audit นี้

## 15. Backend Readiness Assessment

ความพร้อมอยู่ระดับมี domain prototype และ baseline ที่นำไปจัดทำ contracts ได้ ยังไม่ควรนำ browser state shapes ไปสร้าง database/API ตรง ๆ โดยไม่แก้ identity ambiguity และ transaction boundaries

| Boundary | สิ่งที่มีแล้ว | ข้อกำหนดก่อน production |
| --- | --- | --- |
| Identity/auth | canonical mock roles, provisioned Admin, university email parser | verified identity provider, server session, account provisioning, hashed passwords/reset |
| Academic | stable parent IDs, cohort selectors และ migrations | FK constraints, inactive/historical policy, unresolved data remediation |
| Course/Section | composite validation และ teacher assignments | Section FK ใน exams, unique indexes, authorization ทุก request |
| Exam scheduling | readiness/capacity/row reservation validation | server clock, transactional overlap protection, concurrent booking policy |
| Roster/seats | effective roster, snapshot path, allocation/move logs | atomic membership/seat/audit transaction, occupancy uniqueness, historical device identity |
| Submission | question naming, staging, preview, final metadata | immutable stored bytes, digest, idempotency, finalization lock, ownership-scoped retrieval |
| Monitoring/events | status selectors และ simulated violations | trusted event origin, reconnect/order/dedup semantics, review workflow |
| Audit | local event records | canonical schema, actor IDs, reliable timestamps, retention/access/tamper strategy |
| Local exam mode | policy configuration | explicit central/local synchronization, authority และ failure/reconciliation design |

Production upload API ต้องตรวจ authorization, deadline, extension/content/size policy และ attempt state ฝั่ง server ทุกครั้ง การเก็บไฟล์ การดู preview และ code execution ต้องคงคนละขอบเขต ไฟล์อัปโหลดไม่ถูก execute โดย storage/backend หากเพิ่ม code judging ต้องมี sandbox subsystem ตาม AGENTS.md

## 16. Known Limitations

- เป็น static inspection ร่วมกับ existing automated scripts ไม่มี browser E2E, network penetration test, deployment review หรือ database เพราะ repository นี้ยังเป็น frontend prototype
- ไม่ตรวจ dependency vulnerability advisory ออนไลน์หรือ npm audit และไม่สรุปว่า dependencies ปลอดภัยจากการที่ build/tests ผ่าน Findings เรื่อง dependencies เป็น usage/readiness assessment
- Static import graph เป็นการ scan local import/export references รวม type edges ไม่ใช่ runtime bundler proof พบ type-only cycle ตาม F18 และไม่มีหลักฐานพอให้กล่าวว่ามี runtime circular initialization defect
- ไม่มีการพิสูจน์ performance ด้วย profiler หรือ large roster/load benchmark Bundle warning เป็นผล build จริง ส่วน Context render cost ต้องวัดเพิ่ม
- PDF importer อ่าน text rows ด้วย positional grouping/regex ใน rosterImport.ts:69–88 และไม่มี OCR text-table compatibility จึงต้องตรวจด้วย representative files ไม่สามารถรับรองทุก PDF จากนามสกุลไฟล์ได้
- บาง UI ยังมี bilingual branches ขณะที่ context บังคับ th ตาม AppContext.tsx:215–225 ถือเป็น compatibility/debt ไม่ประกาศทุก branch เป็น product defect
- Legacy compatibility ถูกบันทึกเป็นข้อกำหนดที่ต้องรักษา ไม่มีข้อเสนอให้ลบ migration หรือ historical fields โดยขาด consumer analysis
- เลขบรรทัดอ้างอิง working tree ระหว่าง audit อาจเปลี่ยนหลังการแก้ไขครั้งถัดไป ผล baseline เป็น pre-refactoring ทั้งหมด การเพิ่มรายงานไม่มีการเปลี่ยน application behavior

สถานะส่งมอบคือ Phase 0 audit เสร็จและรอ explicit approval สำหรับงาน implementation ที่เลือกจาก backlog
