# SecureLab — Phase 0.2.3 Browser Testing Infrastructure & Final Acceptance

วันที่ตรวจ: 26 พฤศจิกายน 2026 (Asia/Bangkok)  
ขอบเขต: Playwright infrastructure, Chromium E2E และการประเมิน acceptance ของ Phase 0.2; ไม่มีการแก้ application source หรือข้อมูล browser ของผู้ใช้

## 1. Executive Summary

ติดตั้ง `@playwright/test` และ Chromium เพื่อทดสอบแอปจริงบน `http://127.0.0.1:43121` โดยใช้ browser context และ storage ของ test origin แยกต่างหาก E2E 13 รายการผ่านสองรอบสุดท้าย (13/13 ทั้งคู่) ร่วมกับ baseline domain tests 219/219, TypeScript และ production build ที่ผ่าน ผลนี้ยืนยัน D01–D03 ใน controlled prototype ได้ตามกรณีที่ระบุด้านล่าง แต่ **ยังไม่ยืนยัน actual user-data migration** และ E2E ยังไม่ครอบคลุมทุกกรณีใน Objective 5–8 จึงไม่ประกาศ Phase 0.2 เป็น final acceptance หรือเริ่ม Phase 0.3

อ่าน `AGENTS.md`, `README.md`, `package.json` และรายงาน Phase 0, 0.2, 0.2.1, 0.2.2 ครบก่อนเปลี่ยน testing infrastructure; ตรวจ working tree และคงการแก้เดิมทั้งหมดไว้

## 2. Baseline Verification

ก่อนติดตั้ง Playwright: Windows NT 10.0.19045.0, Node v24.18.0, npm 11.16.0; React 19, Vite 6.4.3, TypeScript 5.8.2. `npm.cmd run lint` exit 0; test scripts 17 ชุด exit 0 รวม 219 pass, 0 fail; `npm.cmd run build` exit 0; `git diff --check` exit 0. โครงเดิมใช้ `tsx --test` สำหรับ domain tests และมี React SSR บางกรณี จึงเพิ่ม browser tests เป็นชุดแยก ไม่แทนที่ชุดเดิม

| Script | จำนวนผ่านก่อน/หลัง |
| --- | ---: |
| `test:academic` | 26 |
| `test:auth` | 23 |
| `test:courses` | 46 |
| `test:monitoring` | 13 |
| `test:exam-status` | 5 |
| `test:demo-time` | 5 |
| `test:student-demo` | 4 |
| `test:file-preview` | 11 |
| `test:archive-preview` | 9 |
| `test:final-confirmation` | 2 |
| `test:prepared-files` | 3 |
| `test:student-navigation` | 3 |
| `test:exam-wizard` | 18 |
| `test:exam-management` | 12 |
| `test:exam-detail` | 6 |
| `test:exam-roster` | 5 |
| `test:rooms` | 28 |
| **รวม** | **219** |

## 3. Playwright Infrastructure

`playwright.config.ts` ใช้ Chromium, 4 workers เมื่อรัน suite เต็ม, no retry, `forbidOnly` บน CI, HTML/list reporter และเก็บ screenshot, trace, video เมื่อ fail. `webServer` เปิด Vite ที่ loopback port 43121 ด้วย `--strictPort` และ `reuseExistingServer: false`; test runner จัดการปิด server หลังจบ. เพิ่ม `test:e2e` และ `test:e2e:headed` สำหรับ debug แบบ 1 worker. Smoke test เปิดแอป คลิก UI, อ่าน controlled LocalStorage, reload และตรวจ browser console errors. การเปิด server อย่างเดียวไม่ถูกนับเป็น browser verification

คำสั่งติดตั้ง: `npm.cmd install --save-dev @playwright/test` exit 0; `npx.cmd playwright install chromium` exit 0. Playwright 1.65.1 และ Chromium for Testing 159.0.8154.6 (Playwright Chromium revision 1255) ทำงานจริงใน Windows environment นี้

## 4. Dependency Changes

`package.json` เพิ่ม dev dependency `@playwright/test: ^1.65.1` และสอง testing scripts; `package-lock.json` เพิ่ม `@playwright/test`, `playwright`, `playwright-core` เวอร์ชัน 1.65.1 เท่านั้นตาม diff ไม่มีการอัปเกรด production dependencies. npm install รายงาน 5 vulnerabilities (1 moderate, 3 high, 1 critical) จาก dependency tree ที่ติดตั้ง; ไม่ใช้ `npm audit fix` เพราะอยู่นอกขอบเขตนี้. Build ยังคงเตือน chunk >500 kB เหมือน baseline

## 5. Test Isolation Strategy

Playwright สร้าง context ใหม่ต่อ test และใช้ origin `127.0.0.1:43121`, ไม่ใช้ Chrome profile ปกติหรือ dev origin port 3000. Fixture เติม LocalStorage ผ่าน `addInitScript` เฉพาะ context ทิ้งได้; IndexedDB test ใช้ database ของ test origin. ไม่อ่าน ไม่ลบ และไม่เขียน LocalStorage/IndexedDB ของผู้ใช้จริง. Tests ไม่พึ่งลำดับรันและไม่มี fixed sleep. Browser artifacts ที่สร้างโดย runner อยู่ใน `test-results/` และ `playwright-report/` ซึ่งถูก ignore

## 6. Fixture Design

`e2e/fixtures.ts` ใช้ `initialData`, `migrateCourses`, `migrateExamSections` และชนิดข้อมูลจริง มี seed Student/Teacher/Admin จาก mock account flow เดิม; เพิ่ม Course QA999 ปลายทาง, QA998 ที่อาจารย์ทดสอบไม่มีสิทธิ์, Section เลข 1 ที่อยู่ต่างปี/ภาคเรียนและ teacher assignment, Section ภาคฤดูร้อนที่ไม่มี Exam อ้างอิง และ cohort ต่างปี. Exam fixture มี canonical 3 รายการ, unique legacy 1, ambiguous 1, missing 1; มีสถานะ upcoming/in_progress/completed ใน D01 parameterized cases. เก็บ seat assignments และ submissions จาก seed. ชื่อ E2E ของ unresolved/unauthorized Exam ช่วยตรวจ UI filtering โดยไม่เปลี่ยน domain logic

## 7. Admin E2E Results

- `admin.spec.ts`: D01 ปฏิเสธการย้าย referenced Section ข้าม Course สำหรับ upcoming, in_progress และ completed พร้อมข้อความไทย; เทียบ LocalStorage Courses, Exams, seats, submissions ก่อน/หลัง และตรวจซ้ำหลัง reload. ทั้ง 3 ผ่าน
- แก้ section number ภายใน Course เดิมได้ และย้าย Section ที่ไม่มี Exam อ้างอิงไป Course อื่นเมื่อกรอก cohort ที่ถูกต้องได้; stable Section ID ยังอยู่. ผ่าน
- `identities.spec.ts`: สร้าง Course สองรายการ, สร้าง Teacher สองราย, ลบรายแรกแล้วสร้างรายที่สาม; ID ไม่ซ้ำและรายที่สองยังอยู่. สร้าง Admin แล้วตรวจ ID ทั้ง collection ไม่ซ้ำ. ผ่าน
- ยังไม่มี browser case เฉพาะสำหรับ Student record rendering, Course/Section delete guard, duplicate Section validation หรือ cohort collision rejection; domain tests เดิมครอบคลุม logic หลายส่วน แต่ไม่ควรนับเป็น UI verification

## 8. Teacher E2E Results

- Wizard ของ mock Teacher ไม่แสดง QA998 ซึ่งไม่ได้รับมอบหมาย; รายการ Section เลขเดียวกันแสดง `ตอนเรียน 1 | ภาคการศึกษา 1 / ปีการศึกษา 2569` และ `ตอนเรียน 1 | ภาคการศึกษา 2 / ปีการศึกษา 2568` โดยไม่มี `?` ผิดรูปแบบ. เลือก Section หลังแล้วบันทึกร่าง; storage มี `sectionId` ที่เลือก
- Management table ไม่แสดง Exam ที่ unique แต่ไม่ authorized และ ambiguous/missing unresolved จาก fixture
- ผ่าน Wizard หกขั้นตอน สร้าง Exam ใหม่โดย `sectionId = fixture-section-period-2`; แก้ Exam เดิมแล้วตรวจจำนวน Exam คงเดิม, ID เดิม และ sectionId เดิม
- ยังไม่มี E2E ของ Monitoring detail, seat/roster UI consistency, ambiguous legacy draft ที่พยายามบันทึกเป็น canonical Exam หรือการเลือก Section ชัดเจนเพื่อกู้ draft ดังกล่าว

## 9. Student E2E Results

- Student Rules แสดง period จริงของ canonical Section ภาค 2/2568 และภาคฤดูร้อน/2569; storage ยืนยัน `sectionId` ตรง fixture
- ใน Student Exam selector ไม่พบ ambiguous/missing Exam; เข้าสู่ Exam Info → Rules → Upload ผ่าน mock flow
- อัปโหลด `.py` ที่มีข้อความ `window.securelabInjected = true`, เปิด preview แบบ read-only และตรวจว่าโค้ดไม่ได้ execute; เปลี่ยนชื่อ รอ mock upload เป็น `พร้อมส่ง`, เลือก `.py` ซ้ำ เห็น confirmation แทนที่ แล้ว final submit สำเร็จ
- ยังไม่มี browser test ครบทุก unrelated cohort/teaching period, การแสดง period สำหรับ unresolved record ใน non-operational view และการตรวจ payload/receipt หลัง submission ทุกช่อง

## 10. Browser Persistence and Reload

`persistence.spec.ts` รันใน Chromium จริง: unique legacy เติม `sectionId` ที่แน่นอนได้, ambiguous/missing เก็บ marker และไม่มี `sectionId`; reload สองครั้งแล้วเทียบ Exam collection ทั้งชุดแบบ deep equality เพื่อยืนยัน idempotence รวม ID และ ordered roster ที่อยู่ใน object. Seat assignment และ submission collections เท่าเดิมหลัง reload. D01 rejected operation เทียบ storage ทั้งสี่ collection ทันทีและเทียบ Courses/Exams หลัง reload. ใช้ `stagedUploadStorage` ของแอปบันทึก controlled Blob ลง IndexedDB แล้ว reload และอ่าน blob size/status กลับได้. นี่เป็น browser persistence ที่ test origin เท่านั้น

## 11. D01–D03 Browser Verification

| Defect | Browser evidence | ผล |
| --- | --- | --- |
| D01 | Admin UI ปฏิเสธ referenced Section move ทั้ง 3 สถานะ, Thai alert, no partial Courses/Exams/seats/submissions write และ reload | ผ่านใน controlled fixture |
| D02 | Student Rules แสดง Section period ภาค 2/2568 และ summer/2569 จาก `sectionId` ที่เลือก | ผ่านใน controlled fixture |
| D03 | Teacher Wizard แยก Section เลข 1 ต่าง teaching period ด้วยข้อความไทย; draft/create เก็บ stable `sectionId` | ผ่านใน controlled fixture |

## 12. Unresolved Record Assessment

Seed ที่ migrate จาก `initialCourses`/`initialExamSessions` ตาม Phase 0.2.2 มี Exam 3: resolved 3, missing 0, ambiguous 0. Controlled browser fixture มี canonical 3, unique legacy ที่ migrate สำเร็จ 1, ambiguous 1, missing 1. ทั้งสอง unresolved records คงอยู่พร้อม marker หลัง reload และไม่แสดงใน Teacher management หรือ Student operational selector ที่ตรวจ. การใช้ filtered role projection ไม่ทำให้ ambiguous record ถูกผูก Section โดยปริยายใน browser cases นี้

**Actual user browser inventory: NOT_RUN / unknown.** ไม่มีสิทธิ์ตรวจ storage ของผู้ใช้จริงในคำขอนี้ จึงไม่ทราบจำนวน record หรือประวัติที่ต้องกู้คืน. Recovery ที่ปลอดภัยต้องเริ่มด้วย read-only inventory และสำรองข้อมูลตามกระบวนการที่ผู้ใช้อนุมัติ; สำหรับ Exam ID แต่ละรายการ ตรวจ Course ID, candidate Section stable IDs, academic year/semester, teacher, roster order, seats, submissions และหลักฐานกำกับเวลา; เสนอ mapping ที่ระบุ explicit `sectionId` พร้อม preview ผลกระทบและ audit; ยืนยันก่อนเขียนข้อมูล. หากหลักฐานไม่พอ ให้คง missing/ambiguous marker ไว้. ไม่มี Recovery UI หรือ automatic guess ในเฟสนี้

## 13. Full Automated Regression Results

หลังเพิ่ม infrastructure: `npm.cmd run lint` exit 0; รัน `npm.cmd run test:academic`, `test:auth`, `test:courses`, `test:monitoring`, `test:exam-status`, `test:demo-time`, `test:student-demo`, `test:file-preview`, `test:archive-preview`, `test:final-confirmation`, `test:prepared-files`, `test:student-navigation`, `test:exam-wizard`, `test:exam-management`, `test:exam-detail`, `test:exam-roster`, `test:rooms` แยกกันครบ 17 scripts, ทุก script exit 0, 219/219 pass ตาม counts ใน §2. `npm.cmd run build` exit 0, Vite 6.4.3 แปลง 1,865 modules, built in 5.81s. `git diff --check` exit 0; มีเพียง LF→CRLF advisory ของ working tree ที่มีอยู่ก่อนและไฟล์ package ที่แก้ ไม่มี whitespace error. E2E แยกนับ 13 รายการ; ไม่รวมเป็น 219

## 14. E2E Repeatability Results

คำสั่ง `npm.cmd run test:e2e` รัน suite เต็มหลังแก้ test fixture รอบที่ 1: exit 0, 13 passed, 0 failed, 0 skipped, 36.1s; รอบที่ 2: exit 0, 13 passed, 0 failed, 0 skipped, 34.7s. ก่อนหน้านั้น targeted/full exploratory runs พบ selector ของ radio, room label, fixture cohort และการเลือก replacement ระหว่างสถานะ `กำลังอัปโหลด`; ปรับเฉพาะ E2E/fixture ให้รอ UI condition และใช้ข้อมูลถูกต้อง. กรณี replacement ที่ UI เตือนให้รอไฟล์เดิมเป็นพฤติกรรมที่สอดคล้องกับ source ไม่ใช่ app defect. ไม่มี skipped test หรือ retry ที่ซ่อน failure. เมื่อมี failure ระหว่างพัฒนา artifacts อยู่ใต้ `test-results/<test-name>/` (`test-failed-1.png`, `trace.zip`, `video.webm`, `error-context.md`); รอบสุดท้ายผ่าน จึงไม่มี failure artifact ใหม่. HTML report ที่ `playwright-report/index.html`

## 15. Files Changed

ไฟล์ที่เพิ่ม/แก้เฉพาะ Phase 0.2.3: `package.json`, `package-lock.json`, `.gitignore`, `playwright.config.ts`, `e2e/fixtures.ts`, `e2e/smoke.spec.ts`, `e2e/admin.spec.ts`, `e2e/identities.spec.ts`, `e2e/teacher.spec.ts`, `e2e/student.spec.ts`, `e2e/persistence.spec.ts` และรายงานนี้. Working tree ยังมี application source, services, tests และรายงานของ Phase ก่อนหน้าที่เป็น pre-existing changes; ไม่มีการ revert, modify หรือ commit สิ่งเหล่านั้นในเฟสนี้

## 16. Defects Discovered

ไม่พบ application defect ใหม่ที่ยืนยันได้จาก 13 E2E cases. ปัญหาระหว่างพัฒนา test เป็น fixture/selector/timing ตาม §14 และแก้เฉพาะ test files. Coverage gaps ใน §7–§9 ไม่ใช่หลักฐานว่าระบบทำงานผิด และไม่ถูกระบุเป็น defect. ไม่อ้างว่า mock authentication, face verification หรือ client-side storage เป็น production security control

## 17. Known Limitations

- E2E เฉพาะ Chromium บน Windows, mock app, disposable test origin; ยังไม่ตรวจ Firefox/WebKit, mobile, network/device enforcement หรือ deployment จริง
- ไม่มี actual user-data inventory/migration acceptance; unresolved recovery ต้องอนุมัติและมีหลักฐานจริงก่อน
- Admin delete/collision UI, Teacher Monitoring/roster/ambiguous draft completion และ Student unrelated-cohort exhaustive cases ยังไม่ผ่าน browser verification
- Seat/submission deep-equality กับ fixture ตรวจ preservation หลัง reload/rejection แต่ยังไม่ทดสอบทุกการแก้ไข seat/submission ผ่าน UI
- npm audit แจ้ง 5 vulnerabilities และ Vite แจ้ง large chunks; ไม่แก้ dependency หรือ performance นอกขอบเขต

## 18. Final Acceptance Assessment

ค่า `YES` หมายถึงยืนยันเฉพาะ scope ที่อธิบาย ไม่ขยายเป็น production หรือ user-data acceptance

| Gate | ผล | Scope / เหตุผล |
| --- | --- | --- |
| PLAYWRIGHT_INFRASTRUCTURE_READY | YES | ติดตั้ง, Chromium launch, dedicated server/context, diagnostics |
| BROWSER_SMOKE_TEST_PASSED | YES | UI interaction, console check, controlled LocalStorage, reload |
| D01_BROWSER_VERIFIED | YES | Admin controlled fixture, 3 Exam statuses, rejection/persistence |
| D02_BROWSER_VERIFIED | YES | Student canonical semester 2 และ summer display |
| D03_BROWSER_VERIFIED | YES | Wizard labels, stable `sectionId` ใน draft/create |
| ADMIN_BROWSER_FLOW_PASSED | NO | กรณีที่รันทดสอบผ่าน แต่ delete/collision และ Student record rendering ยังไม่ครบ Objective 5 |
| TEACHER_BROWSER_FLOW_PASSED | NO | Wizard ผ่าน แต่ Monitoring, seat/roster และ ambiguous draft UI ยังไม่ครบ Objective 6 |
| STUDENT_BROWSER_FLOW_PASSED | NO | Rules/upload ผ่าน แต่ unrelated cohort และ unresolved informational display ยังไม่ครบ Objective 7 |
| PERSISTED_RELOAD_VERIFIED | YES | controlled LocalStorage/IndexedDB, D01 rejection, repeated migration |
| LEGACY_MIGRATION_BROWSER_VERIFIED | YES | unique/ambiguous/missing fixture ใน Chromium หลัง reload |
| CONTROLLED_UNRESOLVED_POLICY_VERIFIED | YES | markers คงอยู่, no invented ID, filtered Teacher/Student operational views |
| ACTUAL_USER_DATA_VERIFIED | NOT_RUN | ไม่ได้รับอนุญาตให้ inspect user browser storage |
| FULL_DOMAIN_REGRESSION_PASSED | YES | 17 scripts, 219/219, lint/build/diff check |
| E2E_REGRESSION_PASSED | YES | 13/13 สองรอบ, no skip/retry |
| PHASE_0_2_ACCEPTED | NO | controlled prototype มีหลักฐานดีขึ้น แต่ browser objectives ยังไม่ครบและ actual user-data unknown; รอ explicit acceptance decision |
| READY_FOR_PHASE_0_3 | NO | ยังไม่รับ Phase 0.2 แบบ final และคำสั่งห้ามเริ่ม Phase 0.3 |

หากต้องการยอมรับเฉพาะ controlled prototype สามารถตัดสินใจแยกจาก actual user-data migration ได้ โดยต้องระบุ scope ที่ยอมรับอย่างชัดเจน. สำหรับ final acceptance ตามรายการนี้ ต้องเติม browser cases ที่ขาดหรือยอมรับ coverage gaps อย่างชัดเจน และตัดสินใจเรื่อง actual user-data inventory/recovery แยกต่างหาก. หยุดงานที่ Phase 0.2.3 ตามคำสั่ง
