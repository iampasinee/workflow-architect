# SecureLab

SecureLab is a Thai-language frontend prototype for secure laboratory exam administration and file submission. It uses React 19, TypeScript, Vite 6, and Tailwind CSS 4. Login, ICIT identity checks, biometric verification, exam monitoring, file transfer, and integrity checks are simulated in the browser; there is no production backend.

## Run locally

Install Node.js and npm, then run:

```sh
npm install
npm run dev
```

Open <http://localhost:3000>. Vite also prints LAN addresses for testing from another device. The app always starts on the login page; choose a demo persona to enter a Student, Teacher, or Admin flow. In PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.

No API key is currently required. `.env.example` contains inherited placeholders that application source does not use. Never place secrets in client-side environment variables or commit populated `.env` files.

## Development commands

| Command | Purpose |
| --- | --- |
| `npm install` | Install dependencies from `package-lock.json`. |
| `npm run dev` | Start Vite on port 3000 and expose it on the LAN. |
| `npm run lint` | Run TypeScript validation with `tsc --noEmit`. |
| `npm run test:academic` | Test academic migration, relationships, validation, and bulk assignment with Node/tsx. |
| `npm run test:courses` | Test course/section migration, uniqueness, assignments, deletion guards, and portal projections. |
| `npm run build` | Create the production bundle in `dist/`. |
| `npm run preview` | Serve the production bundle locally. |
| `npm run clean` | Remove `dist/` and `server.js`; requires a Unix-compatible shell. |

## Project structure

- `src/main.tsx` and `src/App.tsx`: startup, login-first behavior, and role flow selection.
- `src/components/student/`: identity confirmation, exam rules, progress stepper, staged uploads, and submission confirmation.
- `src/components/teacher/`: course, exam, monitoring, integrity, and reopening workflows.
- `src/components/admin/`: dashboard, user, academic, course/section, room, biometric, security, audit, and profile screens.
- `src/components/common/` and `src/components/simulation/`: shared UI and demo controls.
- `src/context/AppContext.tsx`: application state, permissions, CRUD actions, and localStorage migrations.
- `src/data/initialData.ts` and `src/data/academicStructure.ts`: mock records and academic hierarchy.
- `src/types.ts` and `src/types/stagedUpload.ts`: shared domain models.
- `src/services/stagedUploadStorage.ts`: IndexedDB staged-file and sequence persistence.
- `src/types/academic.ts`, `src/services/academicState.ts`: normalized academic records, migration, and integrity validation.
- `src/types/course.ts`, `src/services/courseState.ts`: course/section inputs, migration, validation, assignments, and access projections.
- `src/components/admin/FacultiesAndGroupsPage.tsx` and `AcademicCascade.tsx`: academic administration and shared assignment selectors.
- `src/utils/`: route, translation, and file-size helpers.

## Current role workflows

The interface is fixed to Thai. `AppContext` retains the language API for compatibility but always stores and returns `th`.

Admin navigation uses hash routes such as `#/admin/users/students` and `#/admin/faculties-and-groups`. User Management has separate Student, Teacher, and Administrator views. Student Management supports search, sorting, pagination, status actions, browser-generated UTF-8 CSV exports, list and class-group views, and create/edit/transfer/delete workflows. Student, Teacher, and Administrator remain fixed internal roles; there is no role-management screen.

Course and Section Management is available at `#/admin/courses`. Courses belong to a faculty and department; sections use stable IDs and record a Buddhist academic year, semester, positive section number, exactly one active primary teacher, optional active co-teachers, and assigned class groups. Course codes are case-insensitively unique. Section identity is unique by course, year, semester, and section number. A class group cannot be assigned to two sections of the same course in the same term. Referenced records cannot be deleted and should be deactivated instead. Teacher and student portal data is projected from these section assignments, so group transfers and instructor changes take effect without duplicating rosters.

The course page uses separate Thai tabs for รายวิชา and ตอนเรียน, live summary cards, responsive search/filter cards, paginated tables, and icon actions. The เพิ่มรายวิชาใหม่ and เปิดตอนเรียนใหม่ dialogs use wide responsive forms: course fields are full-width, section fields cascade from course to academic offering, teacher assignment supports primary/co-instructors, and cohort selection shows admission year, current year, and active headcount. Section forms require at least one cohort and display conflict validation before saving.

The initial faculty is `คณะเทคโนโลยีและการจัดการอุตสาหกรรม`. Administrators can configure additional faculties, departments, programs, and class groups at `#/admin/faculties-and-groups`. The page has four editable management tabs and one read-only year/cohort summary, live metrics, search, parent/status filters, sorting, pagination, and confirmed status/deletion actions. Academic relationships use stable internal IDs; Thai names and group/program codes are display values. Academic selection is a five-level cascade:

```text
คณะ → ภาควิชา → สาขาวิชา → ชั้นปี → กลุ่มเรียน
```

Changing a parent clears all dependent selections. INET, INE, and all other existing programs/groups are preserved. Years 1–4 and any extended cohorts are derived per program from the current academic year, student admission prefixes, and class-group admission years. Group lists/cards are filtered by program and year. Inactive records and their descendants are excluded from new assignments; existing student associations remain visible. Deletion is blocked whenever children or students reference a record.

Student Management consumes the same state. It supports an unassigned-student filter and confirmed bulk assignment into an active group matching each selected student's affiliation and year. CSV still exports all filtered rows, independently of checkbox selection.

Legacy group IDs are migrated to their current INET groups while preserving profile, account, and biometric data. Normalization retains `facultyId` and synchronizes legacy display fields. `year`, `yearLevel`, and `yearLevelId` are derived compatibility fields and are omitted from persisted student records. An explicitly empty group remains unassigned across refreshes. Existing program/group IDs are retained; the separate normalized store is persisted as `securelab_academic_state`.

## Automatic student year levels

The academic page header also offers “เพิ่มข้อมูลแบบลำดับ”: a six-step wizard for faculty, department, program, admission year, batch class groups, and review. Existing active entities can be reused or new entities drafted. Back preserves draft values; ancestor changes reset dependent selections, and closing a dirty draft requires confirmation. Nothing enters Context/localStorage before the final, fully validated transaction. Standalone tab forms remain available; the year tab stays read-only.

Class-group codes are case-insensitively unique within `(programId, admissionYear)`, not globally. The wizard and standalone forms share this rule. Program codes remain globally unique; program names are unique within their department. New inactive ancestors retain their status and keep their descendants unavailable for student assignments.

`src/utils/academicYear.ts` defines the authoritative `academicSettings.currentAcademicYear` (initially 2569 BE). Never infer it from the computer's calendar. The setting is observable: changing it rerenders all Context consumers without rewriting admission years.

`calculateStudentYearLevel(studentCode)` reads the first two digits, including dashed IDs, and calculates `currentAcademicYear - (2500 + prefix) + 1`. Prefixes 69/68/67/66/65 yield years 1/2/3/4/5 in academic year 2569. Extended students retain their account status; invalid or future prefixes cannot be saved.

Student forms show a read-only computed year and restrict groups to the same admission cohort. Changing a prefix clears an incompatible form selection. Transfer and bulk-assignment actions validate the cohort again. The simulated spreadsheet import overrides conflicting year values with a warning and rejects invalid IDs.

Groups persist `admissionYear`; legacy year links are migrated once. Year-summary rows and group year links are derived, not persisted. Existing group memberships are preserved during migration even if their historic year conflicts with a student's prefix; editing such a student requires selecting a compatible group. The year summary includes extended cohorts, student status totals, and group counts. Changing a populated group's program or admission year requires moving its members first.

## Staged upload workflow

At desktop widths, the Student Exam File Submission page uses two columns: rules on the left and a compact drop zone followed immediately by staged files on the right. Below 1024px, these sections stack vertically.

Selecting or dropping a file immediately stores its blob in browser-local IndexedDB and simulates upload progress. Drafts survive refreshes, and interrupted simulated transfers resume when the upload page mounts. Each new file receives a stable `uploadId` and a persistent, non-reusable `uploadSequence` shared across file types for that exam and student.

The default generated submission name is:

```text
{studentId}_{firstName}_{lastName}_{uploadSequence}.{extension}
6410123457_somying_rakrian_1.py
```

The exam can override this through `fileRequirements.automaticFilenamePattern`. Profile name parts are lowercased, spaces and hyphens become underscores, and unsupported characters are stripped. The original machine filename remains in `originalName`; the final filename is stored separately as `submissionName`.

Rename updates only `submissionName` and never changes the binary, `uploadId`, sequence, progress, or status. Rename accepts a 1–100 character base name matching `^[A-Za-z0-9_-]+$`, preserves the extension, and rejects case-insensitive duplicates.

File validation uses raw `File.size` bytes. Only `file.size === 0` is considered empty, so valid files smaller than 1 KB are accepted and displayed in bytes. Allowed extensions, maximum size, and minimum ready-file count come from the exam configuration.

Manual submission opens a confirmation dialog and locks file actions after success. When time expires, ready files are submitted automatically; active uploads receive a 10-second grace period. If no valid file is ready, the result is “No files submitted.” Teachers may reopen a finalized submission for a limited duration.

## Persistence and limitations

Application records use `localStorage`. Staged blobs and sequence counters use the `securelab-staged-uploads` IndexedDB database, version 6. Deleting a staged file does not release its sequence number. Storage is local to the current browser and origin—not a server backup—and automatic timeout logic cannot execute while the app is closed.

The simulation reset restores seeded application records but does not clear IndexedDB drafts. Existing localStorage data normally takes precedence over seed data, except when a documented forward migration applies. Authentication, biometric checks, monitoring, upload transfer, and integrity validation are demonstrations and must not be treated as production security controls.

## Verification and contributions

Run `npm run test:academic`, `npm run test:courses`, `npm run lint`, `npm run build`, and `git diff --check` before handing off changes. Domain tests use Node's test runner through the existing `tsx` dependency; no coverage threshold is configured. Manually regression-test affected Student, Teacher, and Admin flows. Vite may print a non-failing bundle-size advisory during production builds.

See [AGENTS.md](AGENTS.md) for contributor guidelines.
