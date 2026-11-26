# SecureLab Phase 0.2 — Canonical Identity & Section Resolution

วันที่ 26 พฤศจิกายน 2026

## 1. Executive Summary

ดำเนินการ F01/F02/F03 โดยเพิ่ม canonical Exam.sectionId, shared resolver ที่แยก resolved/missing/ambiguous และ shared collision-resistant ID allocator สำหรับ Teacher/Admin/Course ที่เคยใช้ collection length เป็น ID เปลี่ยน readers/writers ที่กระทบ Student, Teacher และ Admin พร้อม forward migration ที่รักษา historical records

การเปลี่ยนนี้รักษารูปแบบ UI เดิม เพิ่มปี/ภาคเรียนในข้อความตัวเลือก Section เพื่อให้แยกตัวเลือกเลขเดียวกันได้ ไม่เพิ่ม framework หรือ dependency และไม่แก้ AGENTS.md งาน F04–F20 ยังอยู่นอก implementation นี้

## 2. Confirmed Root Causes

- Exam เคยเก็บ courseId + sectionNo แม้ Section uniqueness รวม academic year และ semester ทำให้ `.find()` เลือกรายการแรกเมื่อเลขซ้ำ
- lookup เดียวกันอยู่ใน wizard, context, monitoring, seats, eligibility และ history guards
- Teacher/Admin/addCourse ใช้ length + 1 ซึ่งชนกับ ID เดิมได้หลัง delete-middle
- การ resolve หลังกรอง Course/Section ตาม role อาจทำให้ legacy ambiguity หายไปจากชุดข้อมูลที่ reader มองเห็น จึงต้องรักษาสถานะ unresolved ตั้งแต่ migration ด้วย full course catalog

ตรวจ HEAD ผ่าน git show ยืนยัน old first-match expression และ length allocator อยู่จริง ตัวอย่าง characterization ของ lookup เดิมคืน old-year เมื่อคาด new-year การสร้าง tests ใหม่เกิดหลังเริ่ม implementation จึงไม่มีผล red run ของ regression suite ใหม่ก่อนแก้โค้ด ข้อจำกัดนี้แยกจาก baseline ที่รันก่อนแก้ครบแล้ว

## 3. Before/After Architecture

```text
Before
Exam(courseId, sectionNo) → duplicated first-match lookups
Creation → collection.length + 1

After
Exam(courseId, sectionId, legacy sectionNo)
  → sectionIdentity.resolveExamSection
  → resolved | missing | ambiguous
  → canonical readers / authorization / migration
Creation → entityIdentity.allocateEntityId → collision check
```

sectionIdOf ย้าย implementation เดิมไป sectionIdentity และ re-export จาก courseState เพื่อรักษา callers เดิม resolver import types เท่านั้น จึงไม่สร้าง runtime cycle กับ courseState

## 4. Files Changed

| ไฟล์ | การเปลี่ยน |
| --- | --- |
| src/types.ts | optional canonical sectionId และ unresolved marker สำหรับ legacy records |
| src/services/sectionIdentity.ts | shared stable Section identity, explicit resolver, migration, conservative history reference guard |
| src/services/entityIdentity.ts | shared secure random allocator พร้อม occupied-ID check |
| src/services/courseState.ts | resolver reuse, roster snapshots, eligibility, historical Course/Section guards |
| src/services/examWizard.ts | sectionId ใน wizard/draft/session conversion, shared resolution และ validation |
| src/services/teacherMonitoring.ts | canonical monitoring resolution |
| src/context/AppContext.tsx | load/reset migration, canonical create/edit, role visibility, seat/upload resolution, ID allocation |
| src/components/teacher/ExamCreationWizard.tsx | select value เป็น Section ID และข้อความปี/ภาคเรียน |
| src/components/teacher/LiveExamMonitoring.tsx | shared section lookup |
| src/components/teacher/SeatAssignmentManager.tsx | shared section lookup |
| src/components/student/ExamInfoRules.tsx | shared section lookup |
| src/services/courseState.test.ts | regression tests ใหม่ 8 รายการ |
| SECURELAB_PHASE_0_2_CANONICAL_IDENTITY_REPORT.md | รายงานนี้ |

ไฟล์ audit Phase 0 เป็น untracked file ที่มีอยู่ก่อนเริ่มงานและเก็บไว้ตามเดิม ไม่มี commit/push

## 5. Canonical Data Model Changes

ExamSession เพิ่ม `sectionId?: string` เนื่องจาก records เก่ายังอาจ unresolved และเพิ่ม `sectionResolution?: 'missing' | 'ambiguous'` เพื่อป้องกัน filtered readers ตีความ legacy record ใหม่เอง `sectionNo` คงเป็น display/compatibility

New exam command resolve กับ full storedCourses ตรวจ ownership ผ่าน courseId และ actual teacher assignment ก่อนเขียน sectionId เสมอ Edit รักษา Exam ID ตรวจสิทธิ์รอบเดิมและ actual destination Section แล้วบันทึก canonical ID/หมายเลขปัจจุบัน การ renumber Section จึงไม่เปลี่ยน relationship ที่มี ID แล้ว

Section IDs เดิมไม่ถูก regenerate ตัว helper fallback สำหรับ legacy Section ที่ไม่มี id รักษาสูตรเดิมของ course migration ทุกประการ

## 6. Shared Section Resolver Contract

`resolveExamSection(reference, courses)` คืน union ดังนี้

- resolved พร้อม course และ section เมื่อมี candidate เดียว
- missing เมื่อ course/Section ID ไม่พบหรือ ownership ไม่ตรง
- ambiguous เมื่อมีมากกว่าหนึ่ง candidate

หากมี sectionId ใช้ ID และตรวจ course ownership โดยไม่มี fallback ไป sectionNo หากไม่มี ID อนุญาต legacy matching เฉพาะ candidate เดียว หากมี unresolved marker จะคงผลนั้นไว้ `examSection()` เป็น convenience adapter ที่คืน undefined สำหรับ unresolved และใช้ resolver เดียวกัน

`examReferencesSection()` ใช้สำหรับ conservative deletion/history guards เท่านั้น จึงยังป้องกันการลบทุก candidate ที่เลขตรงกับ unresolved legacy record การป้องกันประวัติไม่ได้ให้ operational authorization

## 7. Migration Behavior

AppContext เรียก migrateExamSections หลัง migrateCourses และก่อนคำนวณ role projections เมื่อโหลด securelab_exams การ persist ใช้ key และ effect เดิม ไม่มีการล้าง LocalStorage หรือ IndexedDB ไม่มีการเปลี่ยน IndexedDB schema

- unique legacy mapping เติม sectionId ของ existing Section
- ambiguous/missing เก็บ original record ทุก field และเติม marker
- existing sectionId คงเดิม แม้ขณะนั้น reference หาย resolver จะคืน missing
- migration เป็น idempotent รวมเมื่อ serialize/parse แล้วรันซ้ำ
- ไม่เปลี่ยน Exam ID, Section ID, seat assignments, submissions, snapshots หรือ imported roster order
- reset action เดิมถูกปรับให้ใช้ migration เช่นกัน งานนี้ไม่ได้เรียก reset

## 8. Ambiguous and Missing Legacy Records

นโยบายคือเก็บ unresolved records ใน canonical exam storage และ Admin context สำหรับ review โดยปฏิเสธ Student/Teacher exam visibility และ mutation ที่อาศัย resolved Section ไม่มีการเดาปี/ภาคเรียนจากวันสอบและไม่มีการ invent Section ID

marker คงอยู่แม้ catalog ภายหลังเหลือ candidate เดียว เพื่อไม่ให้การลบ/กรองข้อมูลกลายเป็นการอนุมัติ mapping อัตโนมัติ การ recovery ต้องระบุ canonical sectionId ที่ตรวจสอบแล้วอย่างชัดเจน เฟสนี้ไม่มีหน้าจอ recovery ใหม่ตามข้อจำกัดเรื่อง UI และไม่มี backend recovery endpoint

Drafts ยังใช้ storage เดิมและเพิ่ม sectionId แบบ additive เมื่อเลือกใหม่ Legacy draft ที่ไม่มี ID อาจแสดง selection จาก unique projected catalog แต่ final context command จะ resolve ด้วย full catalog และไม่สร้าง canonical exam เมื่อกำกวม จึงอาจต้องเลือก Section ใหม่ก่อนบันทึก

## 9. ID Allocation Strategy

Teacher/Admin/addCourse ใช้ shared allocateEntityId โดยรักษา prefix tch/adm/crs และใช้ crypto.randomUUID เมื่อมี หรือ 128-bit crypto.getRandomValues fallback แยก internal ID จาก teacherCode/adminCode/courseCode ตรวจ ID ที่มีอยู่ก่อนคืนค่าและจำกัด retry หากชนซ้ำ

ตรวจ source consumers ไม่พบการ parse numeric suffix ของ IDs ที่เปลี่ยนนี้ IDs เดิมคงเดิมทั้งหมด UUID ไม่ขึ้นกับ collection length จึงไม่มี deterministic reuse หลังลบ ส่วน probabilistic collision ยังคงต้องมี database unique constraint เมื่อทำ production

Browser tabs อาจเขียน LocalStorage snapshots ทับกันได้แม้สร้างคนละ ID การป้องกัน collision แยกจาก lost-update prevention เฟสนี้ไม่ได้สร้าง storage transaction/version-lock framework

## 10. Affected Consumers

- Admin จัด Course/Section, deletion guards และ entity creation
- Teacher wizard select/drafts/edit, monitoring, detail ผ่าน monitoring authorization, roster overrides/snapshots, seat allocation/movement และ answer repository ผ่าน filtered exams
- Student available exams, rules, eligible roster, snapshot access และ final submission command
- Seat/submission IDs อ้าง exam เดิมและไม่ได้ถูก rewrite
- Search/display ที่ใช้ sectionNo เป็นข้อความยังเก็บไว้ ส่วน seed rule ที่ตรวจเลขพร้อมปี/ภาคเรียนไม่ได้เปลี่ยนเป็น resolver เพราะเป็นการระบุ seed record เฉพาะ

## 11. Regression Tests and Results

เพิ่ม 8 tests ใน courseState.test.ts ที่ execute ผ่าน test:courses เดิม ครอบคลุม repeated sectionNo across years/semesters, array order independence, different teachers/authorization denial, actual student eligibility, renumbering, foreign/missing IDs, unique/ambiguous/missing migration, snapshot/import order preservation, wizard round-trip, deletion guards, ID allocation sparse/delete-middle/repeated creates และ serialization/idempotence

Snapshot test ยืนยันว่า unresolved Section ไม่ให้สิทธิ์แม้มี historical roster และ valid canonical snapshot คงเดิม ID allocation ทดสอบ 100 creations ต่อ prefix รวม 300 IDs

Existing suites ตรวจ UI markup และ pure domain flows การทดสอบใหม่ไม่ได้ mount AppProvider ใน real browser และไม่ได้จำลอง database concurrency

## 12. Full Baseline Comparison

ใช้ Windows PowerShell และ npm.cmd ไม่มี dependency installation

| Exact command | ก่อนเปลี่ยน | หลังเปลี่ยน |
| --- | --- | --- |
| npm.cmd run lint | PASS | PASS |
| npm.cmd run test:academic | 26 PASS | 26 PASS |
| npm.cmd run test:auth | 23 PASS | 23 PASS |
| npm.cmd run test:courses | 33 PASS | 41 PASS |
| npm.cmd run test:monitoring | 13 PASS | 13 PASS |
| npm.cmd run test:exam-status | 5 PASS | 5 PASS |
| npm.cmd run test:demo-time | 5 PASS | 5 PASS |
| npm.cmd run test:student-demo | 4 PASS | 4 PASS |
| npm.cmd run test:file-preview | 11 PASS | 11 PASS |
| npm.cmd run test:archive-preview | 9 PASS | 9 PASS |
| npm.cmd run test:final-confirmation | 2 PASS | 2 PASS |
| npm.cmd run test:prepared-files | 3 PASS | 3 PASS |
| npm.cmd run test:student-navigation | 3 PASS | 3 PASS |
| npm.cmd run test:exam-wizard | 18 PASS | 18 PASS |
| npm.cmd run test:exam-management | 12 PASS | 12 PASS |
| npm.cmd run test:exam-detail | 6 PASS | 6 PASS |
| npm.cmd run test:exam-roster | 5 PASS | 5 PASS |
| npm.cmd run test:rooms | 28 PASS | 28 PASS |
| npm.cmd run build | PASS | PASS |
| git diff --check | PASS | PASS |

รวม baseline 206 tests และหลังเปลี่ยน 214 tests Build ยังคงมี existing warning เรื่อง chunks ใหญ่กว่า 500 kB ไม่มีการแก้ bundle optimization ในเฟสนี้ ระหว่างพัฒนามี TypeScript errors จากการเปลี่ยน lookup ที่แก้แล้วก่อน final validation

## 13. Manual Verification Results

| กิจกรรม | ผล | หลักฐาน/ข้อจำกัด |
| --- | --- | --- |
| Browser inventory | ตรวจแล้ว | browser access host unavailable |
| Native Chrome fallback | ATTEMPTED | ผูก Chrome window ได้ แต่ navigation/state read ไม่สำเร็จและ get_window_state timeout |
| Full Student/Teacher/Admin click-through | NOT_RUN | browser interaction ไม่ให้ผลที่ยืนยันได้ |
| Browser persisted-state reload | NOT_RUN | ไม่มีผล UI reload ที่สังเกตยืนยันได้ |
| Migration serialize/parse/repeat | PASS automated | service regression test |
| Production security enforcement | NOT_RUN | frontend-only prototype |

ไม่มีการอ้างว่าหน้าแอปผ่าน smoke test จากเพียงการพิมพ์ URL และไม่มีการ clear browser storage เพื่อทำให้ migration ผ่าน

## 14. Known Limitations

- Manual flow/reload และ browser provider integration ยังต้อง verify เพิ่ม
- Recovery UI ของ unresolved legacy exams ยังไม่มี records เก็บไว้สำหรับ explicit recovery ในภายหลัง
- ID uniqueness เป็น cryptographic randomness พร้อม local collision check ยังไม่ใช่ distributed transaction/DB constraint
- Legacy draft จับคู่ได้เพียงบางบริบทต้อง reselection และ final full-catalog validation
- Tests ที่เพิ่มเน้น domain regression ไม่มี executable failing-before suite run ที่เก็บไว้ก่อน implementation มี baseline และ HEAD characterization แยกกัน

## 15. Remaining Risks

F04–F20 ยังต้องจัดลำดับแยกตาม audit โดยเฉพาะ audit schema, per-student time adjustment, multi-key persistence, IndexedDB commit errors และ production authentication/security boundary ไม่ได้ถือว่าการผ่าน tests ครั้งนี้แก้ประเด็นเหล่านั้นแล้ว

การ unresolved legacy record อาจทำให้รอบที่เคยมองเห็นด้วย first-match หายจาก Teacher/Student view จนได้รับการ review นี่เป็น fail-closed behavior เพื่อไม่ผูกสิทธิ์กับ Section ที่เดาเอง Admin storage ยังคงรักษารอบเดิม

## 16. Completion Assessment

| Gate | ผล | ขอบเขตการยืนยัน |
| --- | --- | --- |
| F01_RESOLVED | YES | canonical write, full-catalog migration และ access denial สำหรับ unresolved |
| F02_RESOLVED | YES | confirmed length-based Teacher/Admin/Course creation paths |
| F03_RESOLVED | YES | shared resolver สำหรับ operational readers และ shared conservative history guard |
| MIGRATION_VERIFIED | YES | automated migration/preservation/idempotence; browser reload NOT_RUN |
| CROSS_ROLE_REGRESSION_PASSED | YES | existing automated suites และ cross-role domain cases; manual click-through NOT_RUN |
| READY_FOR_PHASE_0_3 | NO | ควรปิด manual flow/reload verification gap และ review unresolved recovery ก่อนอนุมัติเฟสถัดไป |

Phase 0.2 implementation ส่งให้ review พร้อมผล automated verification และข้อจำกัด manual verification หยุดที่เฟสนี้เพื่อรอ explicit approval
