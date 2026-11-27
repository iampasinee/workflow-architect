# SecureLab — Phase 0.2.4 Targeted Acceptance Closure

วันที่ 27 พฤศจิกายน 2026 (Asia/Bangkok)

## 1. Executive Summary

เพิ่ม browser coverage 9 cases โดยคง 13 cases เดิม รวม 22 Chromium E2E tests และเพิ่ม assertions ตรวจ submission attempt metadata ใน Student upload test เดิม Domain regression ยังผ่าน 219/219 ไม่มีการเปลี่ยน application source, dependencies, package-lock, business rules หรือข้อมูล browser จริงของผู้ใช้ ผลเพิ่มหลักฐานของ F01–F03 และ D01–D03 แต่ยังมีข้อจำกัดของการตรวจ imported roster display order จึงยังไม่ประกาศ final acceptance

อ่าน AGENTS.md, README.md, package.json, playwright.config.ts และรายงาน Phase 0 ถึง 0.2.3 ตามรายการที่กำหนดก่อนเริ่ม; ตรวจ existing E2E และ fixture builders. Working tree ตอนเริ่มสะอาด การเปลี่ยนแปลง Phase ก่อนอยู่ใน repository แล้ว ไม่ได้ revert หรือ commit/push ในเฟสนี้

## 2. Baseline Verification

Environment: Windows, Node v24.18.0, npm 11.16.0, Playwright 1.65.1, Chromium revision 1255 / Chromium 159.0.8154.6 ตาม infrastructure เดิม. เริ่มด้วย `npm.cmd run lint` ผ่าน และ `npm.cmd run test:e2e` เริ่ม 13 cases เดิม; output รอบเริ่มต้นถูก yield ระหว่างรัน จึงไม่ใช้รอบนั้นเป็นหลักฐาน exit/count สุดท้าย. ทั้ง 13 cases ได้รับการยืนยันอีกครั้งใน final full suites โดยไม่ตัด case เดิมออก

รันทั้ง 17 domain scripts ก่อนเปลี่ยน test: ทุก script exit 0 รวม 219 pass, 0 fail/skip. `npm.cmd run build` exit 0 (8.86s, 1,865 modules), `git diff --check` exit 0. ไม่มี baseline source/build defect ใหม่. ข้อจำกัดเรื่องการเก็บผล baseline E2E นี้แยกจาก final repeatability ที่เก็บ exit ครบ

## 3. Previously Outstanding Coverage

จาก Phase 0.2.3: Admin Student rendering, Course/Section delete guards, duplicate/cohort collision UI; Teacher monitoring และ ambiguous legacy draft; Student unrelated cohort/group/period denial และ submission metadata. เฟสนี้เพิ่ม tests ใน `e2e/closure.spec.ts` และขยาย `e2e/student.spec.ts` โดยใช้ fixture/domain services เดิมและ disposable browser context. ไม่มีการ mock validation หรือ resolver

## 4. New Admin E2E Results

- เปิดรายชื่อนักศึกษาผ่านเมนูจริง พบ row รหัส `6410123456`
- Course CS301 ที่มี Sections/Exams ลบไม่ได้: modal แสดง alert และไม่มีปุ่มยืนยัน destructive action. Section เลข 1 ปี 2569 ภาค 1 ที่มี Exam อ้างอิงลบไม่ได้เช่นกัน
- ใช้ Section ที่ไม่มี Exam อ้างอิงใน edit form เปลี่ยนเป็นเลขซ้ำใน period เดิมแล้วถูกปฏิเสธ; เปลี่ยนเป็นเลข 99 แต่ cohort ซ้อน period เดิมยังถูกปฏิเสธ. Courses collection ไม่เปลี่ยนทั้งก่อน/หลัง rejection และ reload
- Same-number ต่าง teaching periods และ valid unreferenced move ยังคงผ่าน existing tests

เพิ่ม case ผ่าน New Section form โดยกรอก composite key เดิมแล้ว assert ข้อความ `รายวิชานี้มีตอนเรียนดังกล่าว` และ Courses ไม่เปลี่ยน. Edit duplicate/collision assertions ตรวจข้อความเฉพาะของแต่ละ business rejection แล้ว

## 5. New Teacher E2E Results

สร้าง disposable legacy draft ไม่มี sectionId และมี sectionNo=1 ซึ่งมีสอง candidate ใน catalog. เปิดผ่าน tab ร่างการสอบและปุ่มแก้ไขต่อ: Section selector ว่าง; กดถัดไปยังคงขั้นข้อมูลการสอบ ไม่สร้าง Exam และ stored draft ไม่เปลี่ยน. เลือก `fixture-section-period-2` ชัดเจนแล้วผ่าน Wizard สร้าง Exam ได้ พร้อม stored sectionId ที่เลือก. Existing teacher test ตรวจ courseId/sectionId และ editing preserves ID แยกต่างหาก

Monitoring fixture ผูก Exam ชื่อ E2E_CANONICAL_MONITOR กับ Section ต่าง period ซึ่งมีเลข 1 เหมือนเดิม ตั้งวันสอบตรงวันทดสอบและ snapshot roster สองคนในลำดับที่กำหนด. เปิดการติดตามผ่าน card ของ Exam นั้น เห็น heading ถูกต้องและ student row ของ seed Student; reload แล้ว Exams, seats, submissions เท่าเดิมทั้ง object รวม snapshot order. Existing teacher tests ยืนยัน unauthorized/unresolved Exams ไม่อยู่ใน management entry point

เพิ่ม assertion ผู้มีสิทธิ์สอบทั้งหมด = 2 ใน detail และ courseId=crs_0001 ของ recovered draft แล้ว. ข้อจำกัด: ยังไม่ตรวจทุก row/seat label และลำดับ imported roster ผ่าน UI. การเทียบ persisted order ไม่เท่ากับยืนยัน display order. No artificial route หรือ authorization bypass ถูกเพิ่ม

## 6. New Student E2E Results

เพิ่ม 4 parameterized denial cases: Major อื่นใน academic catalog, admissionYear อื่น, classGroup narrowing ที่ไม่รวม Student, และ Exam ที่ชี้ canonical Section ต่าง teaching period โดย Section เลขเดียวกันอีกอันยังมี eligible cohort. Student mock ไป Exam Rules ผ่าน workflow จริงและไม่พบ exam_0001 ใน selector; ambiguous/missing fixtures ก็ไม่อยู่ใน selector

Unresolved Rules informational view ไม่สามารถเข้าถึงผ่าน workflow ที่ตรวจได้เพราะ selector ตัด unresolved Exam ก่อนเลือก จึงไม่สร้าง route หรือเปลี่ยน access control เพื่อ render fallback. ไม่อ้างว่าได้เห็น fallback academic period ใน browser; existing D02 semester/summer cases ยังคงผ่าน

ขยาย upload test: อ่าน staged IndexedDB uploadId/sessionKey, ตรวจ Exam ID และ `:attempt:`; หลัง replace และ final submit ตรวจ latest `securelab_demo_submission_attempts_v1` ว่า examId ตรง, studentId ตรง staging key, questionNumber=1 และ uploadId เดิม. Reload แล้ว canonical submissions และ demo attempts เท่าเดิม. โค้ดไฟล์ยัง preview เป็น read-only text และไม่ execute ตาม existing assertion. เนื่องจากเป็น demo retry จึงตรวจ attempt collection แยกจาก canonical submission ตาม contract ปัจจุบัน

ข้อจำกัด: classGroup denial ใช้ ID ที่ไม่รวม Student เพื่อทดสอบ fail-closed ไม่ใช่การสร้าง valid RA/RB ผ่าน Admin ก่อน; ไม่มีการเพิ่ม submission contract ใหม่

## 7. Referential Integrity and Reload Results

Existing persistence suite ยืนยัน canonical/unique legacy migration, ambiguous/missing markers และ idempotence หลัง reload จริงสองครั้ง รวม seat/submission equality และ staged Blob persistence. Existing D01 parameterization ป้องกัน upcoming/in_progress/completed. New cases เพิ่ม delete/collision rejected writes, monitoring snapshot preservation และ Student submission attempt relationships. ทั้งหมดอยู่ที่ `http://127.0.0.1:43121` ใน isolated Chromium contexts ไม่ใช้ normal browser profile

## 8. Dependency Vulnerability Assessment

คำสั่ง `npm.cmd audit`, `npm.cmd audit --omit=dev`, `npm.cmd audit --json` ทุกคำสั่ง exit 1 เพราะพบ vulnerabilities ไม่ใช่ network error: 5 packages (1 critical, 3 high, 1 moderate). `--omit=dev` ยังพบทั้งห้า เพราะ dependency paths อยู่ใน production tree ตาม package manifest. ตรวจ `npm.cmd ls body-parser proxy-addr qs source-map-js vite` exit 0; อ่าน package.json, vite.config.ts และค้น source references. ไม่ได้รัน audit fix หรือแก้ lockfile

| Package ที่ติดตั้ง | Severity / ประเภท | Path และ range ที่ได้รับผล | เวอร์ชันแก้ไขที่ประเมิน |
| --- | --- | --- | --- |
| body-parser 1.20.6 | High, transitive production | express 4.22.2 → body-parser; `<1.20.9` | 1.20.9 มีใน npm registry; patch line เดิม |
| proxy-addr 2.0.7 | Critical, transitive production | express 4.22.2 → proxy-addr; `>=1.1.0 <2.0.8` | 2.0.8 มีใน registry; patch line เดิม |
| qs 6.15.3 | Moderate, transitive production | express → qs และ express → body-parser → qs; aggregate `2.2.5–6.16.0` | registry latest 6.17.1 อยู่นอก reported ranges |
| source-map-js 1.2.1 | High, transitive production | @tailwindcss/vite → @tailwindcss/node → source-map-js และ autoprefixer → postcss → source-map-js; `>=1.0.0 <1.2.2` | 1.2.2 มีใน registry; patch line เดิม |
| vite 6.4.3 | High (aggregate), direct production manifest / development server usage | root vite และ peer paths ผ่าน @vitejs/plugin-react / @tailwindcss/vite; `<=6.4.3` | registry มี 6.4.4–6.4.6; 6.4.6 เป็น candidate นอก reported ranges ต้องตรวจ release notes และ regression ก่อน update |

Advisory evidence จาก audit JSON:

- body-parser: [GHSA-27r3-jxmh-p828](https://github.com/advisories/GHSA-27r3-jxmh-p828), npm source 1243073: DoS จาก trailing bytes หลัง compressed request body
- proxy-addr: [GHSA-jqcg-44mw-7w3h](https://github.com/advisories/GHSA-jqcg-44mw-7w3h), 1241210: IPv4-mapped IPv6 trust subnet ทำ IP spoofing
- qs: [GHSA-x5fp-wj9c-mxmx](https://github.com/advisories/GHSA-x5fp-wj9c-mxmx), 1158506, range `>=6.14.2 <=6.15.3`; [GHSA-4mjr-xmp4-gh2g](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g), 1158507, `>=2.2.5 <6.16.0`; [GHSA-6pq8-jhm2-2vcw](https://github.com/advisories/GHSA-6pq8-jhm2-2vcw), 1243687, `>=6.7.0 <=6.16.0`: parsing/stringification DoS variants
- source-map-js: [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q), 1241209: event-loop DoS จาก indexed source-map section offsets
- Vite: [GHSA-698v-4r3x-3vcv](https://github.com/advisories/GHSA-698v-4r3x-3vcv) 1242622, [GHSA-r825-w8mm-5pxw](https://github.com/advisories/GHSA-r825-w8mm-5pxw) 1242651, [GHSA-587h-7wmj-h5pm](https://github.com/advisories/GHSA-587h-7wmj-h5pm) 1242658: launch-editor Windows escaping/argument/existence-check variants; [GHSA-9jrq-w75r-8gcw](https://github.com/advisories/GHSA-9jrq-w75r-8gcw) 1242724: cross-origin script execution through custom middleware; [GHSA-rq7h-c2jc-7f22](https://github.com/advisories/GHSA-rq7h-c2jc-7f22) 1242730: non-Windows fs.allow bypass. ทุก Vite range ใน JSON คือ `<=6.4.3`

Reachability assessment: ไม่พบ application source import express/body-parser/proxy-addr/qs โดยตรงในการค้น จึงยังไม่มีหลักฐานว่า frontend runtime เปิด request-parser หรือ trusted proxy path ที่โจมตีได้; เป็น dependency ที่ต้องจัดการก่อนนำมาใช้ backend. source-map-js อยู่ใน CSS/build tooling; build ใช้งานจริง แต่ยังไม่ได้พิสูจน์ว่า attacker-controlled indexed map ส่งถึง vulnerable function ได้. Vite dev server ใช้งานจริง, `npm run dev` bind LAN; test server จำกัด loopback. Windows launch-editor advisories อาจเกี่ยวข้องกับ environment แต่ยังไม่ได้ทดสอบ exploit หรือ editor preconditions. Production static bundle ไม่ได้ยืนยันว่าจะรัน Vite server; ห้ามสรุปว่า dev tooling ปลอดภัยเพราะเป็น dev usage

ข้อเสนอ: อนุมัติ dependency-remediation phase แยก แล้วปรับ parent/lock resolution ภายใน compatible ranges ไป patched versions, ทดสอบ audit/build/E2E ซ้ำ และตรวจว่ามี unused Express dependency ที่ถอดได้หรือไม่ก่อนตัดสินใจ. Versions ที่เสนออยู่ใน major line เดิม จึงไม่คาดว่าต้อง major breaking upgrade ตาม metadata แต่ยังไม่รับรอง API compatibility จนตรวจ changelog/test; ไม่ติดตั้งหรืออัปเกรดในเฟสนี้

## 9. Actual User Data Verification Status

**NOT_RUN**: ไม่อ่าน ไม่ export ไม่แก้ และไม่ clear user LocalStorage/IndexedDB. Future read-only inventory ต้องอนุมัติแยก: ระบุ origin/profile, สำรองตามขั้นตอนที่ยินยอม, นับ canonical/unique/missing/ambiguous ต่อ Exam ID; ตรวจ Course ID, candidate Section stable IDs, period, teachers, ordered roster, seats และ submission references. Mapping ที่มีหลักฐานชัดจึงเสนอ explicit correction พร้อม preview/audit เพื่ออนุมัติอีกครั้ง; ไม่เดาและไม่ลบ marker หากยังไม่แน่ชัด. ไม่มี Recovery UI

Controlled Prototype Acceptance, Actual User Data Migration Acceptance และ Production Security Acceptance เป็นคนละ scope. ไม่ใช้ test-origin results แทนข้อมูลผู้ใช้หรือ security enforcement ของ backend

## 10. New Test Cases

`e2e/closure.spec.ts` เพิ่ม 9 cases: Admin rendering/deletion 1; Student restrictions 4; Admin edit duplicate/collision 1; Admin New Section duplicate 1; Teacher ambiguous draft 1; Teacher monitoring 1. `e2e/student.spec.ts` เพิ่ม metadata/reload assertions ใน case เดิม ไม่เพิ่ม count. All 13 existing cases คงอยู่ ใช้ selectors ตาม role/label และ poll/visible conditions; ไม่มี fixed sleep, skipped case หรือ domain mock

## 11. Full Domain Regression Results

รัน `npm.cmd run <script>` สำหรับทั้ง 17 scripts ก่อนและหลังเพิ่ม tests: ทุกคำสั่ง exit 0, fail 0, skipped 0. Counts: test:academic 26, test:auth 23, test:courses 46, test:monitoring 13, test:exam-status 5, test:demo-time 5, test:student-demo 4, test:file-preview 11, test:archive-preview 9, test:final-confirmation 2, test:prepared-files 3, test:student-navigation 3, test:exam-wizard 18, test:exam-management 12, test:exam-detail 6, test:exam-roster 5, test:rooms 28; รวม 219

`npm.cmd run lint` exit 0. Final `npm.cmd run build` exit 0, 23.50s (รันขณะ browser suite ทำงาน), 1,865 modules; large-chunk warning เหมือน baseline. `git diff --check` exit 0 มี LF→CRLF advisory ของ e2e/student.spec.ts. ไม่รวม 219 domain tests กับ E2E count

## 12. E2E Repeatability Results

`npm.cmd run test:e2e` บน revision ก่อนปรับ fixture Major/otherPeriod: 21/21, exit 0, 55.6s และ 54.9s. หลังปรับให้ otherPeriod เปลี่ยน canonical target โดยคง eligible same-number Section อีกอันไว้ รอบแรกผ่าน 21/21 exit 0 ใน 53.0s; ผลรอบสุดท้ายบันทึกใน addendum ด้านล่าง. Smoke case ตรวจ console/page errors เป็น empty list; ไม่อ้างว่าทุก case มี console-error collector

Exploratory failure 1: draft test ใช้ role button เพื่อเลือก tab ร่างการสอบ จึง timeout 30s; แก้ test selector เป็น role tab แล้ว targeted case ผ่าน. เป็น test defect ไม่ใช่ application defect. Diagnostics ถูกสร้างใต้ `test-results/closure-Teacher-ambiguous--05345-nonical-Section-is-selected-chromium/` ได้แก่ screenshot, trace.zip, video และ error-context; runner อาจแทนที่ artifacts เมื่อรันครั้งถัดไป. Current HTML report อยู่ `playwright-report/index.html` ซึ่ง ignored

## 13. Files Changed

- เพิ่ม `e2e/closure.spec.ts`
- แก้ `e2e/student.spec.ts` เพื่อเพิ่ม assertions ของ upload/attempt/reload
- แก้ `e2e/identities.spec.ts` เพิ่ม timeout เฉพาะ workflow หลายขั้นตอนจาก 30 เป็น 60 วินาที หลังพบ transient toast obstruction
- เพิ่มรายงานนี้

ไม่มี model, migration, UI, production source หรือ dependency change

## 14. Confirmed Defects

ไม่พบ application defect ใหม่ที่ยืนยันได้จาก cases ที่รัน. Coverage limitations ไม่ถูกเรียกเป็น defect. Test-selector timeout ตาม §12 แก้ใน testing code เท่านั้น. ไม่ได้แก้ F04–F20 หรือเริ่ม Phase 0.3

พบ repeatability failure เพิ่มเติมใน suite 22 cases รอบแรก: identities case ใช้เวลารวมเกิน 30s ขณะ trace แสดง toast `เพิ่มรายวิชาแล้ว` intercept ปุ่ม `เพิ่มอาจารย์`; 21 passed / 1 failed, exit 1 (~1.1m). Case เดียวกันผ่านก่อนหน้านี้หลายรอบ จึงจัดเป็น timing sensitivity ของ lengthy UI test ร่วม transient UI obstruction ไม่ยืนยัน persistent application defect. เพิ่มเฉพาะ test timeout เป็น 60s; ไม่ force click, ไม่ skip หรือเปิด retry. ควรติดตาม toast obstruction หากเกิดกับผู้ใช้จริง. Artifact path: `test-results/identities-Admin-creates-u-16d4b-r-deleting-a-middle-Teacher-chromium/trace.zip`

## 15. Remaining Coverage Limitations

Monitoring ยังไม่ยืนยัน every-seat UI และ imported display order; ตรวจ eligible count และ preserved snapshot order ใน storage แล้ว. Student Class Group denial fixture ไม่ใช่ end-to-end Admin RA/RB setup. Baseline E2E รอบเริ่มต้นเก็บ final output ไม่ครบ แม้ final suites ยืนยัน 13 cases เดิมแล้ว. Actual user data และ production security enforcement ไม่ได้ตรวจ

## 16. Final Acceptance Recommendation

| Gate | ผล | Scope |
| --- | --- | --- |
| F01_VERIFIED | YES | canonical writes/resolution, reload, fail-closed controlled cases |
| F02_VERIFIED | YES | existing Teacher/Admin/Course ID E2E และ domain tests |
| F03_VERIFIED | YES | shared resolution/guards, role filtering, legacy persistence |
| D01_BROWSER_VERIFIED | YES | existing three-status rejection tests |
| D02_BROWSER_VERIFIED | YES | existing semester/summer display tests |
| D03_BROWSER_VERIFIED | YES | existing Wizard period labels/stable IDs |
| ADMIN_TARGETED_E2E_PASSED | NO | cases ผ่านในรอบแรก แต่ final repeat พบ New Section entry timeout ตาม addendum |
| TEACHER_TARGETED_E2E_PASSED | NO | executed cases pass; roster/seat display assertions ยังไม่ครบ |
| STUDENT_TARGETED_E2E_PASSED | YES | controlled eligibility denial + submission metadata ตาม contract ปัจจุบัน; caveats §6 |
| PERSISTED_RELOAD_VERIFIED | YES | controlled browser storage เท่านั้น |
| LEGACY_MIGRATION_BROWSER_VERIFIED | YES | unique/ambiguous/missing fixtures จาก existing suite |
| FULL_DOMAIN_REGRESSION_PASSED | YES | 219/219 |
| FULL_E2E_REGRESSION_PASSED | NO | 22-case default parallel execution ยังพบ timing failures; sequential results แยกด้านล่าง ไม่ใช้แทน gate เดิมโดยปริยาย |
| DEPENDENCY_RISK_ASSESSED | YES | audit + dependency paths + reachability caveats; ไม่ใช่ remediation |
| CONTROLLED_PROTOTYPE_READY_FOR_ACCEPTANCE | NO | ยังมี coverage gaps ที่ต้องปิดหรือรับ scope อย่างชัดเจน |
| ACTUAL_USER_DATA_VERIFIED | NOT_RUN | ไม่มี separate authorization |
| PHASE_0_2_FINAL_ACCEPTANCE | NO | รอ explicit review; ไม่ลด acceptance gates |
| READY_FOR_PHASE_0_3 | NO | ยังไม่มี explicit approval |

คำแนะนำ: review ผล controlled prototype และข้อจำกัดข้างต้นก่อนตัดสินใจ acceptance; user-data migration และ production security ต้องมีการประเมินแยก. หยุดหลังรายงาน Phase 0.2.4 ตามคำสั่ง

### Final execution addendum

หลังเพิ่ม New Section case และ assertions สุดท้าย default `npm.cmd run test:e2e` รอบแรก 21 passed/1 failed (identity timeout 30s); รอบถัดไปหลังเพิ่ม identity timeout 60s ยัง 20 passed/2 failed, exit 1, 2.2m: identity ที่ toast intercept และ Student upload ที่ timeout ตรงยืนยันและเริ่มทำข้อสอบ. ไม่มี skip. หลักฐานนี้ยืนยันว่า parallel repeatability ยังไม่ผ่าน และไม่อ้างสาเหตุว่าเป็น resource contention โดยปราศจาก profiling

ปรับ test ของ identity ให้ปิด notification ผ่านปุ่ม UI เดิมก่อนเพิ่ม Teacher (ไม่ force click หรือแก้ app); คง timeout 60s. รัน complete suite ด้วย `npm.cmd run test:e2e -- --workers=1` เพื่อแยกผล sequential จาก default parallel: รอบแรก 22 passed, 0 failed/skipped, exit 0, 1.5m. เป็นการตรวจครบทุก case โดยใช้ config เดิมและ CLI worker override; ไม่เปลี่ยน default config. Final lint/diff check exit 0. ผล sequential รอบสองบันทึกต่อท้ายเมื่อจบ

Sequential รอบสอง: **21 passed / 1 failed / 0 skipped**, exit 1, 1.8m. New Section composite-key case timeout 30s ระหว่างคลิกปุ่มเปิดตอนเรียน; locator พบ element แต่ DOM detach ระหว่าง action ก่อนถึง business validation. กรณีนี้เคยผ่าน targeted suite และ sequential รอบแรก จึงเป็น repeatability failure ที่ยังต้องหาสาเหตุ ไม่ใช่หลักฐานว่า duplicate validation ยอมรับข้อมูลผิด. Trace: `test-results/closure-Admin-New-Section--f30d2-mposite-key-without-writing-chromium/trace.zip` พร้อม screenshot/video/error-context. ไม่ลบหรือ skip case และไม่แก้ application code. **ยังไม่ผ่านข้อกำหนด two consecutive full-suite passes บน final test revision**. ข้อเสนอสำหรับงานต่อ: ตรวจ navigation/re-render timeline และ runtime load จาก trace, ทำให้ test entry point เสถียร แล้วรัน suite ซ้ำ; ถ้าพิสูจน์ว่าเป็น application defect ต้องขออนุมัติแก้ source แยกตามขอบเขตเฟสนี้
