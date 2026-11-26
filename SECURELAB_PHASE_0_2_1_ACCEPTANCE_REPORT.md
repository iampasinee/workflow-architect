# SecureLab Phase 0.2.1 — Integration Verification & Acceptance

วันที่ตรวจ 26 พฤศจิกายน 2026

## 1. Executive Summary

ผลตรวจรับ Phase 0.2 ยังเป็น **ไม่ผ่าน Final Acceptance** แม้ TypeScript, automated tests 214 ข้อ และ production build ผ่านเท่ากับ baseline Phase 0.2

พบข้อบกพร่องที่ยืนยันด้วย controlled fixture ว่า Admin สามารถย้าย Section ที่ Exam อ้างอิงไปอีก Course โดย Exam ยังคง courseId เดิม ทำให้ canonical resolver คืน missing และรอบสอบไม่อยู่ใน operational Teacher/Student projection อีกต่อไป เป็น integration gap ของ Exam–Section ownership ที่ต้องแก้หลังได้รับอนุมัติ

Browser integration และ persisted browser reload ยังเป็น NOT_RUN Browser host ใช้งานไม่ได้ และ native Chrome fallback ถูก Computer Use หยุดเพราะยืนยัน URL บน Windows ไม่ได้ ไม่ถือ server startup, source review, serialization test หรือ URL ใน address bar เป็น browser verification

เฟสนี้เพิ่มเฉพาะรายงานนี้ ไม่มีการแก้ application source, tests, AGENTS.md, dependencies หรือข้อมูล browser ของ origin เดิม ไม่มี commit/push และไม่มีการเริ่ม Phase 0.3

## 2. Current Working Tree Status

สถานะเริ่มงานมี modified files 10 ไฟล์จาก Phase 0.2 ดังนี้

- src/components/student/ExamInfoRules.tsx
- src/components/teacher/ExamCreationWizard.tsx
- src/components/teacher/LiveExamMonitoring.tsx
- src/components/teacher/SeatAssignmentManager.tsx
- src/context/AppContext.tsx
- src/services/courseState.test.ts
- src/services/courseState.ts
- src/services/examWizard.ts
- src/services/teacherMonitoring.ts
- src/types.ts

มี untracked files เดิม 4 ไฟล์ คือ SECURELAB_PHASE_0_REPOSITORY_AUDIT.md, SECURELAB_PHASE_0_2_CANONICAL_IDENTITY_REPORT.md, src/services/entityIdentity.ts และ src/services/sectionIdentity.ts เก็บไว้ตามเดิม ไม่ reset หรือ stash งานเหล่านี้

อ่าน AGENTS.md, README.md, audit Phase 0, implementation report Phase 0.2 และ package.json ประกอบ actual implementation และใช้ baseline 214 tests เป็นเกณฑ์เปรียบเทียบ การรัน build สร้าง dist ตาม script เดิม ไฟล์ source ไม่ถูกแก้ในเฟสตรวจรับ

## 3. Implementation Review

| หัวข้อ | ผล review | หลักฐาน |
| --- | --- | --- |
| Canonical Exam.sectionId | มี additive optional field เพื่อรองรับ legacy unresolved | src/types.ts ใน ExamSession |
| Shared resolver | resolved/missing/ambiguous, ID มี precedence และไม่ fallback เมื่อผิด | sectionIdentity.ts:11–21 |
| Course ownership | resolve เฉพาะ Section ภายใน courseId ที่ระบุ | sectionIdentity.ts:13–17 |
| Full catalog migration | โหลด exams หลัง storedCourses migration ก่อน role projections | AppContext.tsx:297–309,361–370 |
| Unresolved markers | เก็บ missing/ambiguous และไม่ resolve ใหม่เพราะ role filter | sectionIdentity.ts:12,28–35 |
| New exam write | actual Section/Teacher check และเขียน canonical ID | AppContext.tsx:921–939 |
| Exam edit | ตรวจ existing visible exam, actual destination assignment และเขียน ID | AppContext.tsx:941–963 |
| Student eligibility | reject missing section และ canonical ID mismatch ก่อน snapshot/cohort | courseState.ts:248–254 |
| Historical roster | migration spread original record และ snapshot code ใช้ resolver | sectionIdentity.ts:28–35, courseState.ts:257–267 |
| Seat/submission reference | migration ไม่เขียน collections เหล่านี้, commands ใช้ resolved Section | AppContext.tsx:887 เป็นต้นไป และ uploadFiles |
| Entity allocation | Teacher/Admin/legacy addCourse ใช้ shared crypto allocator | AppContext.tsx:665,711,748; entityIdentity.ts:2–12 |
| Normal Admin Course creation | CoursesAndSectionsPage เรียก saveCourseRecord → saveCourse ใช้ crypto.randomUUID เดิม | AppContext.tsx:771–779, courseState.ts:171–190 |
| Legacy drafts | ไม่มี sectionId migration ตอน load draft; save command resolve full catalog อีกครั้ง | ExamCreationWizard.tsx:124–128,303–312; examWizard.ts:438–451 |
| Section reassignment | ยังย้าย Section ข้าม Course ได้โดยไม่มี exam integrity guard | CoursesAndSectionsPage.tsx:199; AppContext.tsx:782–790 |

ข้อสังเกตด้าน coverage คือ ID allocator tests ที่มีอยู่ทดสอบ helper โดยตรง ส่วนปุ่ม Admin Course ปกติใช้ saveCourse ซึ่งมี UUID อยู่ก่อนแล้ว จึงไม่อ้างว่าทั้งสองเส้นทางผ่าน browser creation/delete verification แล้ว

## 4. Remaining Unsafe Section Lookup Assessment

ค้น `sectionNo`, `sectionId`, readers และ writers ใน context, services, Student/Teacher/Admin consumers แล้ว แยกผลดังนี้

| Pattern ที่เหลือ | การประเมิน |
| --- | --- |
| sectionIdentity.ts:17 legacy candidate filter | ยอมรับได้ ใช้ candidate count และ explicit unresolved result |
| sectionIdentity.ts:43 fallback ใน examReferencesSection | ยอมรับได้ เป็น conservative historical deletion guard ไม่ใช่ access grant |
| courseState.ts:273 duplicateSectionNumbers | ใช้ตรวจ legacy ambiguity ใน roster mutation ไม่ใช่ first-match resolution |
| examWizard.ts:211–214 selectWizardCourse | compatibility ของ selection state; actual resolver และ final full-catalog command ตรวจอีกครั้ง |
| teacherCourseDemo.ts seed selection | หมายเลขร่วมกับปี/ภาคเรียนเพื่อระบุ seed เฉพาะ ไม่ใช่ Exam relationship lookup |
| sectionNo ใน search/table/title | display/search compatibility ไม่ใช่ foreign key |
| ExamInfoRules.tsx:99–100 | ข้อความปี/ภาคเรียน hard-coded เป็น display defect ตาม D02 |

ไม่พบ first-match operational Exam→Section `.find(sectionNo === exam.sectionNo)` เดิมใน readers ที่ตรวจหลัง Phase 0.2 อย่างไรก็ตาม shared resolver ไม่ได้ทำให้ command ที่ย้าย Section ข้าม Course รักษาความสัมพันธ์ได้เอง ข้อบกพร่อง D01 ยังคงเกิดก่อนถึงขั้น reader

Legacy draft ที่กำกวมอาจดูเหมือน resolve ได้เมื่อ wizard ใช้ teacher-scoped catalog แต่ payload ไม่มี sectionId ที่ได้รับการเลือกจริง Final createExamSession ใช้ storedCourses จึง reject ambiguous mapping โดยไม่มีการสร้าง exam สำเร็จ จำเป็นต้อง browser-verify ทั้งข้อความ error และการคง draft เมื่อ save ถูกปฏิเสธ

## 5. Browser Verification Environment

Environment เป็น Windows PowerShell, Node v24.18.0, npm 11.16.0 และ dependencies ที่ติดตั้งไว้แล้ว

เริ่ม dev server ด้วยคำสั่งเดิมของโครงการและ override เฉพาะ test origin

```powershell
npm.cmd run dev -- --port 43121 --host 127.0.0.1
```

Vite 6.4.3 รายงาน ready in 585 ms ที่ http://127.0.0.1:43121/ ใช้ port แยกจาก localhost:3000 เพื่อไม่ให้การทดลองใช้ LocalStorage/IndexedDB ของ origin เดิม และเปิดแท็บใหม่ใน Chrome แทนการนำแท็บ SecureLab เดิมมาใช้ ไม่ได้ seed fixtures ลง browser เพราะ browser verification ถูกหยุดก่อนยืนยันหน้าแอปได้

ลำดับเครื่องมือที่ลองในเฟสนี้

1. `cua.getState()` คืน browsers ว่าง พร้อม `Browsers: Error: The browser access host is unavailable`
2. Native Chrome fallback ผ่าน `cua.getApp()` ผูกหน้าต่างได้ จากนั้น Ctrl+t เปิด New Tab สำเร็จ
3. paste URL ของ test origin ลง address bar แล้ว AX แสดงข้อความ URL นั้น
4. กด Return และอ่าน state ถูกหยุดด้วยข้อความต่อไปนี้

```text
Computer Use has been stopped for this turn because it could not determine the current browser URL on Windows with enough confidence to enforce policy. Stop your work and send a final message noting why Computer Use ended.
```

หยุด Computer Use โดยไม่มีการ retry input เดิม ไม่ได้ยืนยันว่าแอปโหลดสำเร็จ ไม่ได้ inspect หรือ export actual user browser storage Dev server ที่เริ่มสำหรับเฟสนี้ถูกหยุดด้วย Ctrl+C หลังตรวจ non-browser เสร็จ การหยุดนั้น exit 1 จาก interrupt เป็น expected termination ไม่ใช่ validation failure

## 6. Admin Flow Results

| Acceptance check | Browser result | หลักฐานที่มีแยกจาก browser |
| --- | --- | --- |
| Existing Student/Teacher/Admin อ่านได้ | NOT_RUN | seed records และ types อ่านได้จาก module; ไม่มี UI confirmation |
| Delete permitted middle Teacher แล้ว create | NOT_RUN | helper regression ครอบคลุม sparse/repeated IDs |
| Admin/Course creation unique internal IDs | NOT_RUN | crypto allocation/static command wiring และ existing tests |
| Same-number Sections ต่างปี/semester | NOT_RUN | existing composite uniqueness tests และ controlled fixture |
| Course/Section deletion guards | NOT_RUN | course suite ผ่าน และ shared historical guard ตรวจจาก source |
| Section edit ข้าม Course รักษา Exam relationship | NOT_RUN ใน browser; FAIL controlled service integration | D01 ทำให้ resolved → missing |

การอ่าน seed counts ไม่เท่ากับยืนยันว่า table, form หรือ persisted profile UI ทำงานครบ

## 7. Teacher Flow Results

| Acceptance check | Browser result | Review/automated evidence |
| --- | --- | --- |
| Only assigned Sections/exams | NOT_RUN | AppContext projection + monitoring tests ตรวจ ID และ role scope |
| Distinguish same-number teaching periods | NOT_RUN | wizard option มี semester/year แต่ StudentGroupManager buttons ยังแสดงเลข/จำนวนเป็นหลัก |
| Create saves canonical sectionId | NOT_RUN | command writer และ wizard round-trip tests |
| Edit preserves stable Exam ID | NOT_RUN | normal wizard payload ไม่มี id และ context map by existing id; domain test ผ่าน |
| Monitoring resolves actual Section | NOT_RUN | monitoring shared resolver + cross-period tests |
| Seat/roster behavior | NOT_RUN | seat commands resolve storedCourses, migration ไม่เขียน seat collection |
| Ambiguous legacy draft save blocked | NOT_RUN | final full-catalog create guard แต่ต้องตรวจ error/draft behavior ใน browser |

D01 ทำให้รอบที่อ้าง Section ซึ่งถูกย้ายออกจาก Course หายจาก authorized exams แม้ roster/submission เดิมยังอยู่ใน storage

## 8. Student Flow Results

| Acceptance check | Browser result | Review/automated evidence |
| --- | --- | --- |
| Correct teaching-period eligibility | NOT_RUN | studentMatchesExamSection ตรวจ canonical ID ก่อน cohort/snapshot |
| No access to another period | NOT_RUN | shared resolver + role projection tests |
| Exam Info/Rules/Submission normal entry points | NOT_RUN | code paths อ่านได้ แต่ไม่มี click-through |
| Missing/ambiguous access denied | NOT_RUN | controlled fixture และ existing regression ยืนยัน service denial |

D02 เป็น display defect ที่อาจสื่อปี/ภาคเรียนผิด แม้ Section ที่ใช้ตรวจ eligibility เป็น canonical แล้ว D01 กระทบ Student available exam, rules และ submission visibility หลัง Section ถูกย้าย Course

## 9. Persistence and Reload Results

| ข้อกำหนด | Browser | Non-browser evidence |
| --- | --- | --- |
| Canonical new exam survives reload | NOT_RUN | writer/persistence effect review เท่านั้น |
| Unique legacy migrates | NOT_RUN | seed 3/3 + controlled 1/1 service migration |
| Ambiguous preserved | NOT_RUN | controlled fixture คง ID/fields และเพิ่ม marker |
| Missing preserved | NOT_RUN | controlled fixture คง record และเพิ่ม marker |
| Markers survive serialization/reload | NOT_RUN | JSON serialize/parse/idempotence ผ่าน เป็น simulated serialization เท่านั้น |
| Filtered role cannot resolve ambiguity | NOT_RUN | controlled teacher projection ส่งกลับ ambiguous |
| Historical references unchanged | NOT_RUN | migration ไม่รับ seat/submission collections, Exam IDs/snapshot/import lists ผ่าน assertions |
| Migration idempotent | NOT_RUN | service repeat/JSON round-trip ผ่าน |
| Existing entity IDs unchanged | NOT_RUN | seed migration และ helper ไม่มี rewrite existing IDs |
| No silent LocalStorage/IndexedDB loss | NOT_RUN | ไม่มี storage clear จากเฟสนี้; actual storage effects/IDB reload ยังไม่ตรวจ |

Fallback provider-level feasibility ตรวจด้วย existing React, react-dom/server และ tsx ผ่าน stdin โดยใช้ in-memory Storage ไม่ใช้ real browser profile ผล `renderToString(AppProvider → Capture(useApp))` หยุดก่อน capture ด้วยข้อความ

```text
Missing getServerSnapshot, which is required for server-rendered content. Will revert to client rendering.
```

สาเหตุคือ useAcademicYear ใน utils/academicYear.ts:18–21 ใช้ useSyncExternalStore โดยไม่มี getServerSnapshot; AppProvider เรียกที่ AppContext.tsx:277 เป็นข้อจำกัดของ SSR fallback ไม่ใช่หลักฐานว่า client browser เสีย ไม่แก้ source เพื่อให้ harness ผ่าน

คำสั่ง `npm.cmd ls react-test-renderer jsdom happy-dom @playwright/test playwright --depth=0` แสดง empty และ exit 1 จึงไม่มี direct client DOM/test-renderer harness ตามรายการนี้ ส่วน package scripts ที่มีอยู่ใช้ service tests และ server-render assertions ไม่ติดตั้ง dependency เพิ่ม และไม่อ้างว่าการ mock hooks เองจะเทียบเท่า actual provider/browser integration

## 10. Legacy Migration Results

ใช้ `node --import tsx --input-type=module` ผ่าน PowerShell here-string รัน imports จริงจาก initialData, academicState, courseState และ sectionIdentity บน in-memory fixtures ไม่เขียน repository source หรือ storage ของผู้ใช้

### Seed data

| รายการ | จำนวน |
| --- | --- |
| Exam records inspected | 3 |
| Canonical ก่อน migration | 0 |
| Successfully migrated | 3 |
| Missing | 0 |
| Ambiguous | 0 |

Mapping ที่ได้จริง

| Exam ID | Section ID หลัง migration |
| --- | --- |
| exam_0001 | section-crs_0001-2569-1-1 |
| exam_0002 | section-crs_0002-2569-1-1 |
| exam_0003 | section-crs_0003-2568-2-1 |

Seed inventory ประกอบด้วย Students 22, Teachers 2, Courses 3, SeatAssignments 10 และ Submissions 7 การ migration ตรวจเฉพาะ domain relationships ใน memory ไม่ได้หมายความว่า browser dataset มี counts เดียวกัน

### Controlled fixture

สร้าง 4 Exam records แยกจาก seed โดยอ้าง Course ที่มีเลข Section 1 ต่างปี/ภาคเรียนสองรายการ และ unique Course อีกหนึ่งรายการ

| Fixture | ก่อน | หลัง |
| --- | --- | --- |
| fx-canonical | sectionId fixture-b | resolved, คง ID |
| fx-unique | legacy หมายเลขเดียวใน fixture-unique | resolved, เติม fixture-unique-section |
| fx-ambiguous | legacy เลข 1 ใน fixture-course ที่มี 2 candidates | ambiguous, ไม่มี guessed ID |
| fx-missing | legacy courseId ไม่มีใน catalog | missing, record คงอยู่ |

Assertions ผ่านสำหรับ migration repeat, JSON serialization round-trip, original Exam IDs, existing roster fields และ ambiguity หลังกรอง teacher catalog ตัว fixture อ้างอิง seed seat/submission arrays เพื่อยืนยันการแยก collections แต่ไม่ได้บันทึกหรือ reload arrays เหล่านั้นจาก browser

รวมตรวจ 7 Exam inputs จาก seed และ controlled cases โดยเป็นคนละชุดข้อมูล ห้ามตีความเป็น browser production inventory รวมกัน หลัง migration มี resolved canonical 5, missing 1 และ ambiguous 1 ในสองชุดนี้

## 11. Unresolved Record Assessment

Seed ไม่มี unresolved ขณะตรวจ Controlled cases มี unresolved 2 รายการตามตั้งใจ ทั้งสองยังอยู่ใน records หลัง serialization และถูกปฏิเสธ operational access ไม่มี Section relationship ที่เดาขึ้นมา

Actual persisted user data เป็น **NOT_RUN / จำนวนไม่ทราบ** ไม่ได้ดึง LocalStorage หรือ IndexedDB จาก origin เดิม จึงไม่สรุปว่าไม่มีผู้ใช้หรือรอบสอบจริงได้รับผลกระทบ

Unresolved records recoverable ในระดับ data เพราะ Exam ID, roster, seats/submissions และ metadata ไม่ถูก discard แต่ยังไม่มี dedicated recovery workflow และ updateExamSession ปฏิเสธรอบที่ไม่อยู่ใน Teacher-visible exams การแก้ด้วย existing Teacher edit UI จึงใช้ไม่ได้กับ unresolved records ที่ถูกซ่อน

ต้องมีแผน explicit recovery ที่ได้รับอนุมัติก่อนตรวจรับ final อาจเป็น controlled admin-assisted remediation หรือ dedicated Admin workflow ตามข้อมูลจริง ไม่ได้สรุปว่าต้องสร้าง Recovery UI ใหม่ทันทีจาก seed ที่ไม่มี unresolved แต่ D01 สามารถสร้าง missing references ใหม่ได้ใน flow ที่มีอยู่ จึงยังถือ unresolved risk ว่ายอมรับได้ไม่ได้

## 12. Automated Validation Results

| Exact command | Tests | Exit | Result |
| --- | --- | --- | --- |
| npm.cmd run lint | — | 0 | PASS |
| npm.cmd run test:academic | 26 | 0 | PASS |
| npm.cmd run test:auth | 23 | 0 | PASS |
| npm.cmd run test:courses | 41 | 0 | PASS |
| npm.cmd run test:monitoring | 13 | 0 | PASS |
| npm.cmd run test:exam-status | 5 | 0 | PASS |
| npm.cmd run test:demo-time | 5 | 0 | PASS |
| npm.cmd run test:student-demo | 4 | 0 | PASS |
| npm.cmd run test:file-preview | 11 | 0 | PASS |
| npm.cmd run test:archive-preview | 9 | 0 | PASS |
| npm.cmd run test:final-confirmation | 2 | 0 | PASS |
| npm.cmd run test:prepared-files | 3 | 0 | PASS |
| npm.cmd run test:student-navigation | 3 | 0 | PASS |
| npm.cmd run test:exam-wizard | 18 | 0 | PASS |
| npm.cmd run test:exam-management | 12 | 0 | PASS |
| npm.cmd run test:exam-detail | 6 | 0 | PASS |
| npm.cmd run test:exam-roster | 5 | 0 | PASS |
| npm.cmd run test:rooms | 28 | 0 | PASS |
| npm.cmd run build | — | 0 | PASS |
| git diff --check | — | 0 | PASS |

รวม 17 test scripts, 214 tests, fail 0 เท่ากับ baseline Phase 0.2 ไม่มีการแก้ test หรือเพิ่ม test file ใน verification phase นี้

Build ใช้ Vite 6.4.3 transform 1,865 modules และใช้เวลา 10.01s main JS 1,020.18 kB (gzip 244.46 kB), PDF JS 501.34 kB และ worker 1,271.92 kB มี existing warning chunks >500 kB ตามเดิม git diff --check มี advisory เรื่อง LF จะถูกแทนเป็น CRLF เมื่อ Git แตะไฟล์ ไม่ใช่ whitespace error

Controlled assertion runner ของ seed/legacy/idempotence และ reproduction D01 exit 0 เพราะ assertions ยืนยันผลที่รายงาน การ assert ว่าพบ defect แล้วสำเร็จไม่ได้ทำให้ acceptance ของ feature เป็น PASS

## 13. Defects Discovered

### D01 — Referenced Section ย้ายข้าม Course แล้ว Exam กลายเป็น missing

- Classification — Confirmed integration defect, High, เกี่ยวข้อง F01 และ historical referential integrity
- Evidence — CoursesAndSectionsPage.tsx:199 เปิดให้เปลี่ยน courseId ใน Section editor; AppContext.tsx:782–790 validate/saveSection แล้ว setCourses โดยไม่ตรวจ Exam references หรือปรับ Exam; courseState.ts:194–218 คง Section ID แต่ย้าย record ไป Course ใหม่; sectionIdentity.ts:13–17 ตรวจ ownership เฉพาะ courseId ของ Exam เดิม
- Reproduction — migrate seed Courses, clone source Course เป็น controlled-destination ที่ไม่มี Sections แล้วใช้ source Section ทำ valid SectionInput ไป destination; validateSectionInput คืน undefined; saveSection คง Section ID; resolveExamSection ของ canonical Exam ก่อนย้ายเป็น resolved หลังย้ายเป็น missing
- Observed output — `ACCEPTANCE_DEFECT_MOVE: validation=accepted before=resolved after=missing stableSectionId=preserved ExamID=preserved`
- Root cause — command boundary ของ Section reassignment ไม่รักษา Exam.courseId + sectionId ownership invariant แม้ reader ตรวจ ownership ถูกต้องแล้ว
- Affected consumers — Admin Section edit, Teacher exam listing/monitoring/edit/seats/answer repository และ Student exam access/submission visibility; references ยังอยู่แต่ resolve ไม่ได้
- Recommended fix — พิจารณา block Course reassignment ของ Section ที่มี Exam references หรือออกแบบ explicit historical-safe reassignment ที่รักษา references เป็น transaction ต้องตกลง behavior ก่อน implementation ไม่ควรแก้ด้วยการให้ resolver ค้นข้าม Course โดยไม่ตรวจ ownership
- Required regression — referenced/unreferenced cross-Course Section edit, canonical/legacy/ambiguous exam references, upcoming/in-progress/completed exams, Teacher/Student projections หลัง save/reload, seat/submission/snapshot preservation
- Origin — capability ย้าย Section มีมาก่อน Phase 0.2 และ legacy courseId relationship เดิมก็ได้รับผลกระทบเช่นกัน จึงไม่เรียกเป็น regression ที่เพิ่งเกิดจาก UUID/resolver แต่เป็น acceptance gap ที่ยังไม่ได้ปิดใน F01
- Status — documented, ไม่มี implementation ในเฟสนี้

### D02 — Student Rules แสดง teaching period คงที่

- Classification — Confirmed display issue, Medium, pre-existing
- Evidence — ExamInfoRules.tsx:99–100 แสดงภาคการศึกษา 1 / ปีการศึกษา 2569 และ English 2026 เป็นค่าคงที่ แม้ :51 resolve Section จริงแล้ว; seed exam_0003 map ไป Section ปี 2568 semester 2
- Root cause — subtitle ใช้ hard-coded display text แทน resolved section.semester/academicYear
- Current behavior / Impact — นักศึกษาอาจเห็นปี/ภาคเรียนไม่ตรงกับ Section ที่ระบบใช้ตรวจสิทธิ์ ทำให้การยืนยัน correct-period flow สับสน ยังไม่มีหลักฐานว่า display นี้ให้สิทธิ์ผิด
- Recommended fix — derive subtitle จาก resolved Section โดยรักษารูปแบบ UI และจัดการ unresolved display
- Required regression — Student Rules ของ semester 1/2/summer ต่างปี และ missing Section
- Status — documented, รออนุมัติ

### D03 — Separator ใน Section option เป็น literal question mark

- Classification — Confirmed minor copy issue, Low
- Evidence — ExamCreationWizard.tsx:370 ปัจจุบันเป็น `Section {section.sectionNo} ? {section.semester}/{section.academicYear}`
- Root cause — ข้อความ separator ใน Phase 0.2 กลายเป็น `?` ระหว่างการเขียนผ่าน tool encoding
- Impact — ยังแยกปี/ภาคเรียนได้ แต่ UI copy ไม่ตรงเจตนาของ separator
- Recommended fix / Tests — เปลี่ยนเป็น separator ที่ตั้งใจหลังอนุมัติ และตรวจ option labels ใน browser/markup
- Status — documented, ไม่มี source correction ใน verification-only phase

## 14. Manual Verification Instructions if Required

ขั้นตอนนี้ยังไม่ได้ execute ครบ ใช้ test profile หรือ controlled origin ใหม่เท่านั้น ห้ามใช้ reset/clear storage ของ origin ผู้ใช้เดิม

1. เริ่ม `npm.cmd run dev -- --port 43121 --host 127.0.0.1` เปิด http://127.0.0.1:43121/ ใน test profile ยืนยันหน้า Login และไม่มี runtime error ก่อนเริ่ม เก็บ origin/profile ที่ใช้ใน evidence
2. Login ด้วยบัญชี mock ที่ระบุใน README ใช้ password เดโมเดิมสำหรับบัญชี seed ที่รองรับ ไม่ใช้บัญชีมหาวิทยาลัยจริง บันทึกจำนวน records และ IDs ก่อน mutation ผ่าน DevTools Application บน test origin
3. Admin เปิดนักศึกษา/อาจารย์/ผู้ดูแล ตรวจ row/detail ที่มีอยู่ สร้าง Teacher disposable 3 รายโดยใช้คณะ/ภาควิชาที่ active และรหัส/อีเมลคนละค่า จด internal IDs ลบรายกลางที่ไม่มี Section อ้างอิงแล้วสร้างรายใหม่ ตรวจว่าทุก ID ไม่ซ้ำ รวมกับ deleted ID
4. สร้าง Admin และ Course disposable ผ่าน UI ตรวจ internal ID เทียบกับ adminCode/courseCode แล้ว reload/login ใหม่ ตรวจ IDs คงเดิม อย่าคาดว่า Course ID ต้องมี prefix crs_ เพราะ normal saveCourse ใช้ UUID ตรง ๆ
5. ใน Course ทดสอบ สร้าง Section เลข 1 ปี 2568 semester 1 และปี 2569 semester 2 โดยใช้ cohorts ที่ถูกต้องและ Teachers คนละคน ทดสอบ composite duplicate ภายใน period เดียวว่าถูกปฏิเสธ
6. Teacher A และ B login แยกครั้ง ตรวจว่าแต่ละคนเห็นเฉพาะ assigned Section สร้าง exam ผ่าน wizard ทั้ง 6 ขั้น ใช้วันเวลาอนาคต, room พร้อมและ row range ที่ไม่ชน พร้อม roster ที่มีอยู่ ตรวจ securelab_exams ว่า sectionId ตรงกับ Section ที่เลือกและ courseId เป็นเจ้าของจริง
7. จด Exam ID แล้วแก้ชื่อ/ข้อสอบตาม flow ที่อนุญาต ตรวจ ID คงเดิม เปิด monitoring และ seat assignment เทียบรายชื่อกับ actual Section ตรวจ submission/seat references โดยไม่ลบ historical records
8. Login นักศึกษาของแต่ละ cohort ตรวจ available exams ว่าไม่มีรอบอีก teaching period เปิด Info/Rules ตรวจ subtitle เทียบ resolved period จากนั้นใช้ demo-time controls ตาม README เพื่อเข้า Submission ทดสอบเลือกข้อ/ไฟล์/preview/rename/replace/send ด้วยไฟล์ทดสอบที่ไม่มีข้อมูลส่วนตัว
9. ก่อน reload export เฉพาะ controlled test keys ผ่าน DevTools Application สำหรับ securelab_courses, securelab_exams, securelab_seat_assignments, securelab_submissions และ draft key จด ordered importedStudentIds/eligibleStudentIds จาก fixture แล้ว reload/login ใหม่ เปรียบเทียบ fields และ counts
10. เตรียม controlled legacy fixtures 4 exam records ใน test origin เท่านั้น ได้แก่ canonical B, unique legacy, repeated-number ambiguous legacy และ missing-course legacy ใช้ cloned valid Exam records จากข้อ 6 เปลี่ยนเฉพาะ id/courseId/sectionId/sectionNo และเก็บ sentinel roster arrays ที่รู้ลำดับ ห้ามแก้ origin เดิม ก่อนทดสอบจดค่าทุก key ที่ต้องรักษาไว้
11. Reload แล้วตรวจ unique เติม actual sectionId, ambiguous/missing อยู่ครบพร้อม marker, canonical และ historical IDs คงเดิม ตรวจ Teacher/Student ว่า unresolved ไม่ปรากฏ และ reload ซ้ำอีกครั้งเพื่อเทียบ idempotence ตรวจ IndexedDB stores ของ test attempt ว่ายังอยู่
12. Legacy draft case ใช้ร่างของ Teacher A เอา sectionId ออกจาก state ให้เลขซ้ำใน full catalog แต่ A ได้รับมอบหมายเพียง candidate เดียว ลอง save final โดยไม่เลือก Section ใหม่ ต้องไม่เกิด canonical Exam ใหม่และ draft ต้องยังอยู่ จากนั้นเลือก actual Section ใน wizard ใหม่แล้ว save ต้องได้ canonical sectionId
13. Admin ลอง delete Course/Section ที่มี Exam อ้างอิง ต้องถูก guard และข้อมูลยังอยู่ สำหรับ D01 ใช้ disposable Course/Section/Exam เท่านั้น ทดลองย้าย referenced Section ไป Course อื่น จดผล resolved/missing และ affected views เพื่อยืนยัน defect หลังอนุมัติ fix จึงตรวจซ้ำด้วย expected protected behavior
14. จบด้วยตรวจ console, reload อีกครั้ง และบันทึกแต่ละ check เป็น PASS/FAIL พร้อมค่า expected/actual ห้ามแทน NOT_RUN ด้วย PASS จากเพียงการเปิดหน้าได้

การเตรียม fixtures ต้องคัดลอกจาก test data ที่ทราบ provenance ห้ามเดา mapping ของ actual unresolved records Recovery review สำหรับข้อมูลผู้ใช้จริงต้องแยกออกจาก disposable verification

## 15. Known Limitations

- Browser host unavailable และ native Computer Use ถูกหยุดด้วย URL policy confidence จึงไม่มี final role click-through, client persistence effects หรือ IDB reload evidence
- Provider SSR fallback ถูกจำกัดด้วย missing getServerSnapshot และไม่มี installed direct client test harness ตามแพ็กเกจที่ตรวจ ไม่เพิ่ม framework/dependencies
- Existing suites ครอบคลุม domain/markup แต่ไม่ครอบคลุม D01 ไม่แก้หรือเพิ่ม tests files เพราะอนุญาตเฉพาะ verification report
- Controlled fixture serialization เป็น service-level evidence ไม่ใช่ browser persistence proof
- ไม่ inspect actual persisted user data จึงยังไม่ทราบ missing/ambiguous production-like inventory
- ไม่ทำ F04–F20 และไม่ตีความ mock authentication/monitoring/policy ว่าเป็น production enforcement
- รายงานนี้แทน acceptance assessment ก่อนหน้าเฉพาะการตัดสิน final gate โดยไม่แก้ historical Phase 0.2 report ซึ่งสะท้อนผล ณ เวลานั้น

## 16. Final Acceptance Assessment

| Gate | ผล | เหตุผล |
| --- | --- | --- |
| F01_IMPLEMENTATION_VERIFIED | NO | canonical write/resolve มีจริง แต่ D01 ยังทำให้ valid relationship ขาดใน Admin workflow |
| F02_IMPLEMENTATION_VERIFIED | YES | reviewed confirmed allocation paths + existing crypto/sparse ID regression; browser create/delete แยกเป็น NOT_RUN |
| F03_IMPLEMENTATION_VERIFIED | YES | operational readers ที่ตรวจ reuse shared resolver; legacy/display/history usages แยกหน้าที่ชัด |
| ADMIN_BROWSER_FLOW_PASSED | NOT_RUN | ไม่ได้ยืนยันหน้าแอป/flow ผ่าน browser |
| TEACHER_BROWSER_FLOW_PASSED | NOT_RUN | browser tooling หยุดก่อน flow |
| STUDENT_BROWSER_FLOW_PASSED | NOT_RUN | browser tooling หยุดก่อน flow |
| PERSISTED_RELOAD_VERIFIED | NOT_RUN | ไม่มี actual browser storage reload evidence |
| LEGACY_MIGRATION_VERIFIED | YES | seed + controlled fixtures + serialization/idempotence ผ่าน; browser portion NOT_RUN |
| UNRESOLVED_RECORD_RISK_ACCEPTABLE | NO | D01 สร้าง missing reference ใหม่ได้ และ actual user inventory/recovery ยังไม่ยืนยัน |
| FULL_REGRESSION_PASSED | YES | 214 existing tests, lint, build และ whitespace ผ่าน |
| PHASE_0_2_ACCEPTED | NO | defect และ required browser/reload gates ยังเปิด |
| READY_FOR_PHASE_0_3 | NO | final acceptance ยังไม่ครบ |

ส่งมอบเฉพาะผล verification พร้อม defect evidence และ manual procedure เพื่อพิจารณาอนุมัติงานแก้ไขแยกต่างหาก
