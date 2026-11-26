# SecureLab — Phase 0.2.2: Referential Integrity & Defect Correction

วันที่ตรวจ: 26 พฤศจิกายน 2569 (Asia/Bangkok)  
ขอบเขต: D01, D02, D03 เท่านั้น; ไม่มี backend, database, dependency, schema หรือ migration version ใหม่

## 1. Executive Summary

แก้ D01 โดยห้ามย้าย Section ที่ Exam อ้างอิงไป Course อื่น ณ mutation boundary `saveSection()` และคำสั่ง Admin `saveSectionRecord()` ใช้ Course/Exam collection ชุดเต็ม การปฏิเสธให้ข้อความภาษาไทยและไม่เรียก `setCourses` แก้ D02 ให้ Student Rules แสดงภาค/ปีจาก canonical Section ที่ resolve ได้ และแก้ D03 ให้ตัวเลือก Wizard ใช้ข้อความไทยที่แยก Section เลขเดียวกันต่างปีหรือภาคเรียนได้ ผลอัตโนมัติผ่าน 219/219 แต่ browser และ reload ยัง NOT_RUN จึงยังไม่อนุมัติ Phase 0.3

## 2. Baseline Results

ก่อนแก้ Phase 0.2.2: รายงาน Phase 0.2.1 ระบุ 17 scripts, 214 tests, lint/build ผ่าน ใน turn นี้รัน 17 scripts เดิมก่อนเพิ่ม regression test ทุก script exit 0 (214 tests ตาม baseline) ตรวจ `package.json`, README, AGENTS.md, Phase 0 audit, Phase 0.2 implementation report และ Phase 0.2.1 acceptance report แล้ว Working tree มีไฟล์ Phase 0.2 ที่ยังไม่ commit; เก็บไว้ทั้งหมด

## 3. D01 Root Cause and Reproduction

- `src/components/admin/CoursesAndSectionsPage.tsx:198–200` อนุญาตเปลี่ยน Course ใน Section editor
- `src/context/AppContext.tsx:782–790` เดิม validate แล้วเรียก `saveSection` โดยไม่ส่ง Exam collection
- `src/services/courseState.ts:194–218` เดิมย้าย Section ID เดิมไป Course ใหม่
- `src/services/sectionIdentity.ts:11–22` canonical resolver ตรวจว่า `Exam.courseId` เป็นเจ้าของ `sectionId` จริง จึงคืน `missing` หลังย้าย

เพิ่ม regression test ลง `courseState.test.ts` ก่อนแก้ แล้วรัน `npm.cmd run test:courses`: exit 1, 42 tests, pass 41, fail 1, ข้อผิดพลาด `Missing expected exception` ที่บรรทัดทดสอบการย้าย Section ที่ Exam อ้างอิง แสดงว่า valid input เดิมย้ายได้และทำให้ reference ขาด

## 4. Approved Referential Integrity Policy

Section ที่ Exam อาจอ้างอิงจะย้าย Course ไม่ได้ ไม่ขึ้นกับสถานะ `upcoming`, `in_progress`, `completed` ใช้ `examReferencesSection()` เดิม จึงครอบคลุม canonical ID, unique legacy number และ conservative candidate ของ `missing`/`ambiguous` ตาม guard เดิม การแก้ Section ภายใน Course เดิมยังทำได้ภายใต้ validation เดิม Section ที่ไม่มี Exam อ้างอิงย้ายได้เมื่อ validation ผ่าน ไม่เปลี่ยน ownership check ของ resolver และไม่แก้ `Exam.courseId` อัตโนมัติ

## 5. Mutation Boundary Changes

- `src/services/courseState.ts`: เพิ่ม `sectionReassignmentError(courses, exams, input, id)` เพื่อหาตำแหน่งเดิมและตรวจ references; `saveSection(courses, input, id, exams)` บังคับรับ Exam collection และ throw ก่อนสร้างผลลัพธ์ใหม่เมื่อย้ายต้องห้าม
- `src/context/AppContext.tsx`: `saveSectionRecord` ตรวจ guard ก่อน validation เพื่อให้ข้อผิดพลาดเฉพาะเจาะจง จากนั้นส่ง `storedCourses` และ `storedExamSessions` ชุดเต็มเข้า service; กรณีถูกปฏิเสธคืน `{success:false,error}` พร้อม toast ภาษาไทย ไม่มี `setCourses`, `setExamSessions`, seat หรือ submission write
- ตรวจ callers: การย้าย Section ของ Admin ผ่าน `saveSectionRecord` เพียงเส้นทางเดียวใน app; direct `saveSection` ใน tests ได้ปรับให้ส่ง Exam array ครบ การสร้าง Section, ลบ Section และเปลี่ยนสถานะยังใช้กฎเดิม ส่วนการแก้ student membership ของ Teacher เป็น operation อีกชนิดและไม่ได้ย้าย Section ระหว่าง Course

## 6. D02 Display Correction

`ExamInfoRules.tsx` ใช้ `examSection(activeExam, courses)` เดิมและ `formatSectionAcademicPeriod(section)` ใหม่ในการแสดง `ภาคการศึกษา 1/2` หรือ `ภาคฤดูร้อน` กับปี พ.ศ. ของ Section จริง เมื่อ resolve ไม่ได้แสดง `ไม่พบข้อมูลภาคการศึกษาและปีการศึกษา` โดยไม่เดาปีหรือภาคเรียน ไม่มีการเปลี่ยน eligibility, exam start หรือ submission flow

## 7. D03 Label Correction

`ExamCreationWizard.tsx` ใช้ `formatSectionOption(section)` แสดงเช่น `ตอนเรียน 1 | ภาคการศึกษา 2 / ปีการศึกษา 2568` ค่า `<option value>` ยังเป็น `sectionIdOf(state.courseId, section)` ตัวคั่น ` ? ` เดิมถูกเอาออกและไม่มีการเปลี่ยน selection semantics

## 8. Files Changed

| File | Phase 0.2.2 change |
| --- | --- |
| `src/services/courseState.ts` | guard และบังคับส่ง Exam collection ใน saveSection |
| `src/context/AppContext.tsx` | Admin command ตรวจและส่ง full collections พร้อม Thai error |
| `src/services/sectionIdentity.ts` | formatter ภาคเรียนและ option label |
| `src/components/student/ExamInfoRules.tsx` | period จาก resolved Section |
| `src/components/teacher/ExamCreationWizard.tsx` | option label ภาษาไทย |
| `src/services/courseState.test.ts` | 5 regression tests ใหม่ และปรับ direct saveSection callers |
| `SECURELAB_PHASE_0_2_2_DEFECT_CORRECTION_REPORT.md` | รายงานฉบับนี้ |

ไฟล์อื่นที่แสดงเป็น modified/untracked ใน working tree เป็นงาน Phase 0/0.2/0.2.1 เดิม ไม่ถูกลบหรือ reset ในเฟสนี้

## 9. Existing Data and Migration Impact

ไม่มี schema, storage key หรือ migration rewrite ใหม่ `migrateExamSections` ยัง preserve Exam ID, ordered rosters, markers และ idempotence Seed ที่ migrate จาก `initialCourses`/`initialExamSessions` มี Exam 3 รายการ, resolved 3, missing 0, ambiguous 0 (`exam_0003` ผูกปี 2568 ภาค 2) Controlled fixtures ใน tests ยืนยัน reference/seat/submission arrays ไม่เปลี่ยนเมื่อ reject และ JSON serialize/parse แล้ว Exam ยัง resolve ได้ นี่เป็นผลกับ seed และ fixture เท่านั้น ไม่ใช่ inventory ของ browser ผู้ใช้

## 10. Recovery Policy and Limitations

guard ป้องกันการสร้าง D01 ใหม่ใน command ปัจจุบัน แต่ไม่ซ่อม Exam ที่เสียหายก่อนหน้านี้ `missing`/`ambiguous` คงอยู่ ไม่เดา Section และไม่ลบ marker การกู้คืนใน phase ที่อนุมัติภายหลังควรให้ผู้ดูแลตรวจ Course, Section stable ID, ภาค/ปี, teacher, roster, seats และ submission จากหลักฐานจริง แล้วเสนอ explicit mapping ต่อ Exam ID แต่ละรายการพร้อม preview และ audit ก่อนแก้ข้อมูล ไม่ใช้เลข Section หรือชื่อแสดงอย่างเดียว ยังไม่มี Recovery UI หรือการแก้ user browser storage ในเฟสนี้ Actual persisted inventory: **NOT_RUN / unknown**

## 11. New Regression Tests

เพิ่ม 5 tests ใน `test:courses` (41 → 46):

1. referenced Section move ถูกปฏิเสธก่อนเปลี่ยน Course/Exam และ input ที่เดิมผ่าน validation
2. `upcoming`/`in_progress`/`completed` และ canonical, legacy, `missing`, `ambiguous` candidate ถูกป้องกัน
3. reject แล้ว Exam ยัง resolved; Teacher/Student projections, roster order, seat/submission references และ serialize/migrate ยังเดิม
4. unique legacy move ถูกป้องกัน; unreferenced move และ same-Course edit ยังใช้ได้; validation เดิมของ uniqueness/cohort collision มี tests เดิมผ่าน
5. period สำหรับภาค 1, 2, summer และ unresolved; Wizard label แยกเลขเดียวกันต่างปี/ภาคและไม่มี ` ? `

Tests ครอบคลุม service mutation จริงและ context wiring ผ่าน source review; ไม่อ้างว่าเป็น provider mount หรือ browser click-through

## 12. Full Validation Results

| Exact command | Tests | Exit |
| --- | ---: | ---: |
| `npm.cmd run lint` | TypeScript | 0 |
| `npm.cmd run test:academic` | 26 | 0 |
| `npm.cmd run test:auth` | 23 | 0 |
| `npm.cmd run test:courses` | 46 | 0 |
| `npm.cmd run test:monitoring` | 13 | 0 |
| `npm.cmd run test:exam-status` | 5 | 0 |
| `npm.cmd run test:demo-time` | 5 | 0 |
| `npm.cmd run test:student-demo` | 4 | 0 |
| `npm.cmd run test:file-preview` | 11 | 0 |
| `npm.cmd run test:archive-preview` | 9 | 0 |
| `npm.cmd run test:final-confirmation` | 2 | 0 |
| `npm.cmd run test:prepared-files` | 3 | 0 |
| `npm.cmd run test:student-navigation` | 3 | 0 |
| `npm.cmd run test:exam-wizard` | 18 | 0 |
| `npm.cmd run test:exam-management` | 12 | 0 |
| `npm.cmd run test:exam-detail` | 6 | 0 |
| `npm.cmd run test:exam-roster` | 5 | 0 |
| `npm.cmd run test:rooms` | 28 | 0 |
| `npm.cmd run build` | 1865 modules | 0 |
| `git diff --check` | whitespace | 0 |

รวม **17 scripts, 219 tests, pass 219, fail 0** เพิ่ม 5 จาก baseline 214. Build Vite 6.4.3 ผ่านใน 5.61s เตือน chunks >500 kB (main 1,021.43 kB, PDF 501.34 kB, worker 1,271.92 kB) ซึ่งมีอยู่ใน baseline `git diff --check` มี LF→CRLF advisories ของ working tree เดิม แต่ไม่มี whitespace error. รอบเก็บผล test ใช้ PowerShell สรุป counts ซึ่งเกิด `Cannot index into a null array` จากบรรทัดรวมยอดใน harness ชั่วคราว; **ทุก npm script exit 0 และแสดง count/pass/fail ถูกต้อง** ยอด 219 คำนวณจากราย script ข้างบน ไม่ใช้ค่า `TOTAL=0` ที่ harness พิมพ์ผิด ไม่มีการแก้หรือสร้างไฟล์ harness

## 13. Browser Verification Results

ลอง `cua.getState()` ใน turn นี้: browsers ว่าง พร้อม `Browsers: Error: The browser access host is unavailable` จึงไม่ใช้ native Chrome fallback ซึ่งรอบก่อน Computer Use หยุดเพราะไม่สามารถยืนยัน URL บน Windows ได้ ไม่มีการเข้าหน้าแอป คลิก flow หรือ reload จริง; ไม่ตรวจหรือเคลียร์ LocalStorage/IndexedDB ของผู้ใช้

Manual checklist บน **disposable origin/profile** แยกจากข้อมูลเดิม:

1. Admin สร้าง Course/Section/Exam fixture แล้วลองย้าย Section ที่ Exam อ้างอิงทุกสถานะ; ต้องเห็น Thai error, Course/Exam/seat/submission ไม่เปลี่ยนหลัง reload
2. Admin ย้าย Section ที่ไม่มี Exam เมื่อ validation ผ่าน และแก้ Section ใน Course เดิม; ตรวจ uniqueness/cohort collision ที่ยังปฏิเสธตามเดิม
3. Teacher เปิด exam creation Wizard เลือก Section เลขเดียวกันต่างปี/ภาค; label ชัดเจนและบันทึก `sectionId` ที่เลือกจริง ตรวจ monitoring/roster
4. Student เปิด Rules ของ Exam ปี 2568 ภาค 2 และ summer fixture; period ตรง Section จริง ทดสอบ unresolved fixture ว่าไม่แสดงปีเดา และตรวจการเข้าสอบ/ส่งไฟล์
5. Reload disposable profile แล้วตรวจ Exam IDs, Section IDs, rosters, seats, submissions และ console errors; หลีกเลี่ยงการนำ fixture เข้า origin ที่มีข้อมูลจริง

## 14. Known Limitations

- Browser, provider interaction และ actual persisted reload ไม่ได้รัน; service tests ไม่แทนการตรวจ UI จริง
- `saveSection` เป็น pure domain mutation helper ที่ต้องรับ canonical Exam array จาก caller; app command ส่ง `storedExamSessions` ครบแล้ว ไม่มี backend หรือ concurrent client protection ใน prototype
- ไม่มี recovery workflow สำหรับ unresolved records เดิม และไม่ทราบ inventory จริงของ browser ผู้ใช้
- mock authentication/security ยังเป็น frontend simulation ไม่ใช่ production enforcement

## 15. Remaining Risks

- หากมี code path ใหม่เรียก `saveSection` ด้วย Exam subset หรือ array ว่างโดยผิดพลาด guard อาจไม่เห็น reference; API บังคับ parameter และ tests ปัจจุบันตรวจ caller ที่มีอยู่ แต่ production backend ต้อง enforce foreign key/transaction
- Existing unresolved records อาจซ่อนจาก Teacher/Student flow ตาม fail-closed policy; ต้องสำรวจข้อมูลจริงและอนุมัติ recovery mapping ก่อนรับรอง migration ระดับข้อมูลผู้ใช้
- ไม่มี browser evidence ว่า toast, responsive UI และ persistence ทำงานตามที่คาด

## 16. Acceptance Assessment

| Gate | Result | Verification scope |
| --- | --- | --- |
| D01_RESOLVED | YES | domain mutation, AppContext wiring review, tests; browser NOT_RUN |
| D02_RESOLVED | YES | canonical period formatter + component wiring review/tests; browser NOT_RUN |
| D03_RESOLVED | YES | Wizard label formatter/value review/tests; browser NOT_RUN |
| REFERENTIAL_INTEGRITY_VERIFIED | YES | controlled service casesทุกสถานะและ reference kinds; actual browser NOT_RUN |
| UNREFERENCED_SECTION_REASSIGNMENT_PRESERVED | YES | controlled service mutation + existing validation tests |
| HISTORICAL_DATA_PRESERVED | YES | controlled fixture serialization, roster/seat/submission assertions; actual user data unknown |
| FULL_AUTOMATED_REGRESSION_PASSED | YES | lint, 219 tests, build, diff check |
| ADMIN_BROWSER_FLOW_PASSED | NOT_RUN | browser host unavailable |
| TEACHER_BROWSER_FLOW_PASSED | NOT_RUN | browser host unavailable |
| STUDENT_BROWSER_FLOW_PASSED | NOT_RUN | browser host unavailable |
| PERSISTED_RELOAD_VERIFIED | NOT_RUN | browser host unavailable; existing user storage untouched |
| UNRESOLVED_RECORD_RISK_ACCEPTABLE | NO | seed 0 unresolved แต่ actual persisted inventory unknown และยังไม่มี approved recovery |
| PHASE_0_2_ACCEPTED | NO | final browser/reload และ unresolved-risk gates ยังไม่ครบ |
| READY_FOR_PHASE_0_3 | NO | ต้องปิด acceptance gates ก่อน |

หยุดหลังส่งรายงาน Phase 0.2.2; ไม่เริ่ม Phase 0.3
