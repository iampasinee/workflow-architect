# Repository Guidelines

## Project Structure & Module Organization

This project is a React 19, TypeScript, Vite 6, and Tailwind CSS 4 frontend prototype for a university exam submission and exam management system.

The application starts in `src/main.tsx`.

`src/App.tsx` selects and renders role-based flows.

Put role-specific UI in:

* `src/components/student/`
* `src/components/teacher/`
* `src/components/admin/`

Put shared UI primitives in:

* `src/components/common/`

Put demo, mock, and simulation controls in:

* `src/components/simulation/`

Application state, persisted browser state, and migrations live primarily in:

* `src/context/AppContext.tsx`

Models, domain types, and seed/mock data live in:

* `src/types.ts`
* `src/data/`

Global styles belong in:

* `src/index.css`

Static assets belong in:

* `public/`

Do not rebuild the project from scratch unless explicitly requested.

Preserve existing Student, Teacher, and Admin flows when modifying unrelated features.

Before changing shared types, state schemas, or domain relationships, inspect all consumers first.

---

## Project Purpose

This system is primarily an exam submission and exam management system.

Its main flows are:

* Student Flow
* Teacher Flow
* Admin Flow

Do not unnecessarily turn the project into a full university registration system.

Academic data should be only as complex as required to support:

* student identity
* course/section assignment
* teacher assignment
* exam creation
* exam access
* exam submission
* administrative management

Prefer simple and maintainable domain structures over unnecessary hierarchy.

---

## Build, Test, and Development Commands

Use:

* `npm install` — install locked dependencies
* `npm run dev` — start Vite on port 3000 and expose it on the LAN
* `npm run lint` — run TypeScript validation with `tsc --noEmit`
* `npm run test:academic` — test academic hierarchy, student assignment, migrations, and derived academic data
* `npm run test:courses` — test course/section migration, validation, teacher assignment, student eligibility, and portal assignments
* `npm run build` — create the production bundle in `dist/`
* `npm run preview` — serve the production bundle locally
* `git diff --check` — check whitespace errors before finishing

Use `npm.cmd` in PowerShell if script policy blocks npm.

After meaningful domain or cross-flow changes, run:

```bash
npm run lint
npm run test:academic
npm run test:courses
npm run build
git diff --check
```

Also inspect `package.json` and run any other relevant tests already defined by the project.

Do not consider a task complete if tests or build errors introduced by the change remain unresolved.

---

## Coding Style & Naming Conventions

Use:

* two-space indentation
* semicolons
* single quotes
* multiline trailing commas where appropriate

Prefer:

* PascalCase component filenames
* camelCase variables and functions
* descriptive Props interfaces
* named exports
* shared domain utilities instead of repeated local logic

Reuse existing:

* context actions
* services
* selectors
* helpers
* shared types

before introducing new parallel implementations.

Style UI with Tailwind CSS utilities.

No ESLint or formatter is currently configured.

Interface copy is Thai-only unless explicitly requested otherwise.

Technical terms may remain English when appropriate, including:

* ICIT
* CSV
* IP Address
* MAC Address
* IndexedDB
* ID

Avoid unnecessary English text in user-facing Thai interfaces.

---

## Stable ID Convention

Domain relationships must use stable IDs.

Do not use display names as relational identifiers.

Examples of stable relationship keys include:

* `facultyId`
* `departmentId`
* `majorId`
* `courseId`
* `sectionId`
* `teacherId`
* `studentId`
* `uploadId`

Display names, codes, labels, and descriptions may change.

Relationships must continue working if a display label changes.

---

## Academic Structure

The canonical academic hierarchy is:

```text
Faculty
→ Department
→ Major
```

Thai UI wording:

```text
คณะ
→ ภาควิชา
→ สาขาวิชา
```

The Admin sidebar/menu name must remain:

`จัดการคณะและกลุ่มเรียน`

Do not rename this menu unless explicitly requested.

Inside the `จัดการคณะและกลุ่มเรียน` page, Admin manages:

* คณะ
* ภาควิชา
* สาขาวิชา
* กลุ่มเรียน

Do not use manually managed Year Level entities. Class Group is supported as a lightweight grouping record keyed by `majorId + admissionYear`; it is not another parent level in the canonical hierarchy.

The previous academic structure:

```text
Faculty
→ Department
→ Program
→ Year
→ Class Group
```

must not return as the canonical hierarchy. Class Group remains adjacent cohort data rather than a child hierarchy that owns Year entities.

Use `Major` for the domain concept corresponding to:

`สาขาวิชา`

Avoid creating competing `Program` and `Major` concepts unless migration compatibility requires it temporarily.

---

## Academic Entity Relationships

Department belongs to one Faculty.

Conceptually:

```ts
type Department = {
  id: string;
  facultyId: string;
  code: string;
  name: string;
};
```

Major belongs to one Department.

Conceptually:

```ts
type Major = {
  id: string;
  departmentId: string;
  code: string;
  name: string;
};
```

Faculty conceptually contains:

```ts
type Faculty = {
  id: string;
  code: string;
  name: string;
};
```

Use the project's existing type naming conventions when implementing actual code.

Do not duplicate parent relationships unnecessarily.

For example, if Major already references Department and Department references Faculty, avoid storing a second conflicting Faculty relationship on Major unless the existing architecture requires it temporarily.

---

## Academic State Service

Use:

`src/services/academicState.ts`

for academic relationships, validation, migration, selectors, and academic domain rules where appropriate.

Do not scatter duplicate academic relationship logic across UI components.

Prefer reusable selectors and helpers.

Before modifying `academicState.ts`, inspect:

* student management
* Course/Section management
* Teacher portal
* Student portal
* persisted state migrations

because academic relationships may be consumed across multiple role flows.

---

## Cascading Academic Selectors

Academic selectors cascade as:

```text
Faculty
→ Department
→ Major
```

Required behavior:

* selecting Faculty filters available Departments
* selecting Department filters available Majors
* changing Faculty clears an invalid selected Department
* changing Faculty also clears an invalid selected Major
* changing Department clears an invalid selected Major
* inactive or unavailable parents must not allow invalid child assignments

The final canonical student academic assignment should save:

`majorId`

rather than separately storing all parent identifiers.

Do not allow the UI to save inconsistent combinations such as:

```text
Faculty A
Department B from Faculty C
Major D from another Department
```

---

## Student Academic Identity

A student's canonical academic assignment should primarily use:

```ts
{
  studentId: string;
  majorId: string;
  admissionYear: number;
  classGroupId?: string;
}
```

Other profile fields may exist normally.

Do not use these as canonical stored academic identity fields:

* `facultyId`
* `departmentId`
* `yearLevel`
* legacy `groupId` or multiple primary group IDs

Faculty and Department should be derived through:

```text
student.majorId
→ Major.departmentId
→ Department.facultyId
```

This avoids duplicated academic data becoming inconsistent.

Temporary compatibility fields may remain only where required for safe migration.

The new canonical source of truth must be:

* `majorId`
* `admissionYear`
* optional `classGroupId` for one primary Class Group

---

## Admission Year and "ปีเข้า"

The student admission cohort is shown in the UI using the Thai label:

`ปีเข้า`

Examples:

```text
admissionYear = 2567
display = ปีเข้า 67

admissionYear = 2568
display = ปีเข้า 68

admissionYear = 2569
display = ปีเข้า 69
```

Store the full Buddhist academic year where possible.

Example:

```ts
admissionYear: 2567
```

Display the shortened admission code where appropriate:

```text
67
```

Do not use the term:

`รุ่น`

for this concept in the UI.

Use:

* `ปีเข้า`
* `ปีเข้า 67`
* `ปีเข้า 68`

instead.

Create or reuse one shared admission-code formatting helper.

Conceptually:

```ts
function getAdmissionCode(admissionYear: number): string {
  return String(admissionYear).slice(-2);
}
```

Do not duplicate `slice`, `substring`, or admission-code formatting logic across many components.

---

## Student ID and Admission Year

Do not use the first digits of `studentId` as the canonical admission-year source.

The student ID may be used as a convenience to:

* suggest the admission year
* auto-fill the admission year
* assist Admin during data entry

when the format is recognizable.

However, `admissionYear` must remain stored separately.

Admin must be able to correct the admission year if the student ID format does not match the expected convention.

Do not derive critical domain behavior permanently from student ID substring logic.

---

## Automatic Student Year Level

Student year level is derived data.

Do not permanently store year level as the canonical source of truth.

Use:

`src/utils/academicYear.ts`

for derived academic-year and student-year calculations.

Use the central current academic year already provided by the application.

Do not use the device calendar year directly.

Do not hard-code a separate academic year inside individual components.

The canonical calculation is:

```ts
yearLevel = currentAcademicYear - admissionYear + 1;
```

Example:

```text
currentAcademicYear = 2569
admissionYear = 2567

yearLevel = 3
```

Therefore the student displays:

`ชั้นปี 3`

When the central current academic year changes, displayed student year levels must update automatically without manually editing each student.

Year level is read-only.

Admin must not manually assign or edit it.

Do not create Year Level as a manually managed academic entity.

---

## Year-Level Validation

Derived student year level must be validated.

Future admission years must not silently produce valid student years.

Invalid academic-year combinations should be handled explicitly.

Do not silently convert invalid values into plausible student years.

Prefer shared helper logic for:

* valid admission year
* derived year level
* academic-year formatting

instead of implementing separate behavior in each page.

---

## Student Management UI

Admin Student Management should clearly display academic information.

Recommended table columns:

* รหัสนักศึกษา
* ชื่อ-นามสกุล
* คณะ
* ภาควิชา
* สาขาวิชา
* ปีเข้า
* ชั้นปี
* กลุ่มเรียน
* สถานะ
* การดำเนินการ

Example:

```text
รหัสนักศึกษา: 6706022510158
สาขาวิชา: IT
ปีเข้า: 67
ชั้นปี: 3
กลุ่มเรียน: INET-DE-RA
```

`ชั้นปี` is derived automatically.

Do not provide a manual year-level edit control.

---

## Student Create/Edit Form

Student academic selection should follow:

```text
คณะ
→ ภาควิชา
→ สาขาวิชา
```

The final canonical value saved to the student should be:

`majorId`

The form should also collect or determine:

`admissionYear`

The form may optionally assign one active `classGroupId` after Major and admission year are selected. Available groups must match both values, and changing either value must clear an incompatible group.

The UI may display a shortened admission code such as:

`67`

where appropriate.

If student ID auto-fill exists, treat it as a suggestion rather than the canonical source.

Do not permanently save duplicated Faculty and Department values if they can be derived safely from Major.

---

## Student Filters

Student Management may support filters for:

* รหัสนักศึกษา / ชื่อ
* คณะ
* ภาควิชา
* สาขาวิชา
* ปีเข้า
* ชั้นปี
* กลุ่มเรียน
* สถานะ

Academic filters must cascade consistently:

```text
Faculty
→ Department
→ Major
```

Year-level filtering must use the derived year level.

Admission-year filtering should resolve against stored `admissionYear`, and Class Group options must be scoped to the selected Major and admission year.

Do not create a separate persistent Year entity merely to support filtering.

---

## Deletion and Referential Integrity

Block deletion of academic records that are still referenced unless there is an explicit safe migration or reassignment flow.

Examples:

* Department cannot be deleted while Majors still depend on it
* Major cannot be deleted while Students still depend on it
* Faculty cannot be deleted while Departments still depend on it

Inactive ancestors should be excluded from new assignments.

Existing historical data should not be silently corrupted because a record is deactivated.

Do not silently cascade-delete academic relationships unless explicitly required.

---

## Legacy Year-Level Data

Search for old fields and entities such as:

* `yearLevel`
* `yearLevelId`
* academic Year entity
* Program Year
* Class Year

when modifying the academic model.

Refactor these usages so derived student year level comes from:

```text
admissionYear
+
currentAcademicYear
```

Do not leave two active competing sources of truth.

Temporary legacy fields may exist only during migration or compatibility handling.

---

## Legacy Class Group Data

Student academic identity must no longer depend on a manually managed Class Group master record.

Search for usages such as:

* `groupId`
* `groupIds`
* `classGroupId`
* group code
* academic group name

before modifying or removing group behavior.

Do not blindly delete group-related code.

Some existing Course/Section behavior may currently depend on old group relationships.

Inspect those consumers first.

The goal is:

Student academic identity should no longer require a manually managed academic Group entity.

---

## Course and Section Domain

Course and section rules live primarily in:

`src/services/courseState.ts`

The Admin UI is primarily in:

`src/components/admin/CoursesAndSectionsPage.tsx`

Preserve the existing:

`จัดการรายวิชาและตอนเรียน`

flow.

Do not break:

* Course CRUD
* Section creation
* Section editing
* academic year selection
* semester selection
* primary teacher assignment
* co-teacher assignment
* teacher portal visibility
* student eligibility
* exam creation flow

Course/Section changes must preserve stable IDs and foreign-key relationships.

---

## Course Uniqueness

Preserve existing composite uniqueness rules.

A Section should not be duplicated for the same meaningful combination of:

* course
* academic year
* semester
* section number

Use the existing project domain implementation as the source of truth when exact constraints already exist.

Do not weaken existing validation while refactoring academic structure.

---

## Teacher Assignment

Sections may have:

* Primary Teacher
* Co-Teachers

Primary Teacher must be valid and active according to existing business rules.

Co-Teachers must not duplicate the Primary Teacher.

Teacher portal access should continue to derive from assigned Sections.

Do not break Teacher Flow while changing academic student grouping.

---

## Section Student Eligibility

Student eligibility for a Section must no longer depend on a manually managed Class Group as the student's canonical academic identity.

Preferred conceptual academic cohort representation:

```ts
type SectionCohort = {
  majorId: string;
  admissionYear: number;
};
```

Example:

```ts
section.cohorts = [
  {
    majorId: 'major_it',
    admissionYear: 2567,
  },
];
```

Eligible students can conceptually be resolved by:

```ts
student.majorId === cohort.majorId
&&
student.admissionYear === cohort.admissionYear
```

This allows a Section to represent:

```text
สาขาวิชา IT
รหัส 67
```

or multiple cohorts such as:

```text
IT รหัส 67
IT รหัส 68
```

Use stable IDs and stored academic years.

Do not use display strings such as:

`IT-67`

as relational identifiers.

---

## Section Cohort Selection UI

When assigning academic student groups to a Section, prefer a simple UI based on:

* คณะ
* ภาควิชา
* สาขาวิชา
* รหัส

Example:

```text
สาขาวิชา: IT

รหัส:
☑ 67
☑ 68
☐ 69
```

The UI may use Faculty and Department to filter Majors.

The stored cohort relationship should primarily use:

* `majorId`
* `admissionYear`

Avoid storing redundant parent relationships when they can be derived safely.

---

## Section Collision Rules

Preserve existing business rules preventing invalid duplicate student/cohort assignment where applicable.

For example, if the current domain prevents the same academic cohort from being assigned to multiple Sections of the same Course in the same academic year and semester, preserve that behavior.

Adapt existing collision checks from legacy `groupId` logic to the new academic cohort representation where necessary.

Do not remove validation merely because the underlying grouping model changes.

---

## Student Membership and Exam Integrity

Dynamic cohort resolution is acceptable for normal Section eligibility.

However, exam integrity may require stable membership at a specific point in time.

If the current architecture uses explicit membership snapshots, preserve them where appropriate.

If a snapshot is needed, prefer creating it at the relevant workflow stage rather than relying only on mutable labels.

Do not let renamed academic display labels alter historical exam membership.

---

## Academic Migration Rules

Existing browser-persisted state and mock data may use older schemas.

Academic schema changes require forward migration.

Migration should attempt to:

* preserve existing valid students
* preserve student IDs
* preserve admission years
* map legacy academic assignments to `majorId` where safely possible
* derive year level rather than storing it
* remove obsolete Year dependencies where safe
* remove obsolete student Group dependencies where safe
* preserve Course/Section relationships
* preserve Teacher assignments
* avoid duplicate academic entities
* avoid invalid parent-child relationships

Do not silently assign an incorrect Major.

If a legacy record cannot be mapped safely, use an explicit safe fallback and document the limitation.

Do not silently corrupt persisted academic relationships.

---

## Migration Compatibility

Temporary compatibility fields may remain during migration if necessary.

However:

* clearly identify the new canonical source of truth
* avoid continuing to write new data into legacy structures
* prefer one-way forward migration
* avoid maintaining two active competing models indefinitely

When modifying persisted schemas, inspect all migration versions and existing state initialization logic.

---

## App Context and Persistence

State and migration logic live primarily in:

`src/context/AppContext.tsx`

Before changing persisted shapes:

* inspect initialization
* inspect storage reads
* inspect storage writes
* inspect migration version logic
* inspect mock seed fallback behavior
* inspect all affected selectors

Do not clear user browser state simply to avoid writing a migration unless explicitly requested.

Preserve valid existing demo data where practical.

---

## Course/Section Migration

If existing Sections use:

* `groupId`
* `groupIds`

for student grouping, migrate carefully.

Preferred new representation:

```ts
type SectionCohort = {
  majorId: string;
  admissionYear: number;
};
```

Do not remove old group relationships before extracting enough information to reconstruct equivalent cohort relationships where safely possible.

If exact migration cannot be guaranteed, document that limitation.

Do not silently assign students from the wrong Major or admission year.

---

## Portal Compatibility

After academic changes, verify all role portals.

### Admin Flow

Verify:

* academic CRUD
* student management
* Course/Section management
* filters
* assignments
* migrations

### Teacher Flow

Verify:

* assigned Sections remain visible
* assigned Courses remain visible
* student eligibility remains correct
* exam creation still works
* exam management still works

### Student Flow

Verify:

* student profile academic information renders correctly
* available exams still resolve correctly
* exam access is not lost due to academic migration
* submission flow remains unchanged unless explicitly modified

Do not consider an academic refactor complete if only the Admin page works.

---

## Upload Domain Conventions

For staged uploads, use:

`uploadId`

as the stable record identifier.

Do not use filenames as primary identifiers.

Validate raw file size using:

`sizeBytes`

Rename operations may change only:

`submissionName`

Preserve:

* `originalName`
* extension
* sequence
* blob
* progress
* status
* upload identity

Do not regenerate unrelated upload state when renaming a file.

---

## Submission Filename Rules

Generated submission filenames must preserve the original extension.

User-editable filename labels should use a safe allowlist.

Prefer:

* English letters
* numbers
* hyphen
* underscore

The system should control the extension.

Do not rely on a blacklist of invalid characters when an allowlist can be used.

Do not allow filename changes to alter stable upload identity.

---

## IndexedDB Rules

IndexedDB changes require forward migrations.

Do not silently discard existing staged submission data when changing storage structure.

Inspect existing IndexedDB schema/version logic before changing persisted upload data.

---

## CSV Behavior

Preserve existing CSV behavior unless explicitly modified.

When academic schema changes affect CSV:

* update import/export mappings carefully
* maintain clear Thai headers where applicable
* validate academic references
* avoid silently creating invalid Faculty/Department/Major combinations

Manually test affected CSV flows.

---

## UI Consistency

Reuse the project's existing Admin UI patterns.

Do not introduce a completely different design language for one page.

Preserve:

* spacing conventions
* table patterns
* modal patterns
* button hierarchy
* form styling
* Tailwind usage
* loading/empty/error states where already used

Academic simplification should make the UI easier to use, not merely reduce data fields.

---

## Academic Structure UI

The page:

`จัดการคณะและกลุ่มเรียน`

should focus on managing:

```text
คณะ
ภาควิชา
สาขาวิชา
```

Recommended presentation may use tabs:

```text
[ คณะ ] [ ภาควิชา ] [ สาขาวิชา ]
```

or another pattern consistent with the current application.

Do not reintroduce:

* ชั้นปี management
* กลุ่มเรียน management

as academic master-data CRUD unless explicitly requested later.

---

## Required Thai Terminology

Use these labels consistently:

* `จัดการคณะและกลุ่มเรียน`
* `คณะ`
* `ภาควิชา`
* `สาขาวิชา`
* `รหัส`
* `ชั้นปี`
* `รหัสนักศึกษา`
* `ชื่อ-นามสกุล`
* `สถานะ`

Do not use:

`รุ่น`

for the admission cohort unless explicitly requested in a future change.

---

## Testing Guidelines

Run:

```bash
npm run lint
npm run test:academic
npm run test:courses
npm run build
git diff --check
```

when relevant to the change.

No coverage threshold is currently configured.

Update or add tests when domain behavior changes.

Do not only test rendering.

---

## Academic Tests

Academic changes should verify at least:

1. Faculty → Department relationship
2. Department → Major relationship
3. Student Major assignment
4. Admission year persistence
5. Admission-code formatting
6. Automatic student year-level calculation
7. Academic-year changes update derived year level
8. Invalid future admission years
9. Cascading Faculty → Department → Major selectors
10. Student filtering by Faculty
11. Student filtering by Department
12. Student filtering by Major
13. Student filtering by admission code
14. Student filtering by derived year level
15. deletion guards
16. migration from legacy Year data
17. migration from legacy Group data where applicable

---

## Course Tests

Course/Section changes should verify at least:

1. Course loading
2. Course CRUD where supported
3. Section loading
4. Section uniqueness
5. Primary Teacher assignment
6. Co-Teacher assignment
7. cohort assignment
8. cohort collision validation
9. migration from old `groupId` / `groupIds`
10. Teacher portal assignment
11. student eligibility
12. exam creation compatibility

Preserve existing tests where still valid.

Update tests to reflect the new canonical academic model.

---

## Manual Verification

When relevant, manually verify:

* Faculty CRUD
* Department CRUD
* Major CRUD
* Student create
* Student edit
* Student search
* cascading selectors
* admission code
* derived year level
* academic-year change
* Section creation
* teacher assignment
* cohort assignment
* Teacher Flow
* Student Flow
* Admin Flow
* CSV
* persistence after reload

Check the browser console for errors.

Do not consider a task complete merely because the page renders.

---

## Definition of Done

A task is not complete only because the UI renders.

Before finishing a meaningful change:

* inspect affected consumers
* verify data relationships
* verify migration behavior
* verify create/edit/delete where relevant
* verify filters
* verify role flows
* run required tests
* run build
* check for TypeScript errors
* check for console errors where possible
* run `git diff --check`

Fix regressions introduced by the change.

At completion, report:

1. files changed
2. data model changes
3. migration changes
4. UI changes
5. tests run
6. known limitations or assumptions

---

## Commit & Pull Request Guidelines

Use short imperative commit subjects.

Optional prefixes:

* `feat:`
* `fix:`
* `refactor:`
* `test:`
* `docs:`

Pull requests should describe:

* visible changes
* business-rule changes
* data model changes
* storage migrations
* verification performed
* tests run
* known limitations
* screenshots for visible UI changes where useful

Avoid vague commit messages such as:

* `update`
* `fix stuff`
* `changes`

---

## Security & Configuration

Never commit secrets.

Never log sensitive:

* biometric data
* authentication credentials
* exam submission contents
* private student data
* tokens
* passwords

Browser storage is mock persistence for this prototype.

It is not:

* a production database
* a secure backup
* a production authentication boundary

Do not present browser-local persistence as production-grade security.

---

## Refactoring Rules

Before large refactors:

1. inspect current types
2. inspect persisted-state migrations
3. inspect services
4. inspect Admin consumers
5. inspect Teacher consumers
6. inspect Student consumers
7. inspect tests

Prefer incremental forward-compatible changes.

Do not rewrite working unrelated modules.

Do not remove legacy data structures until their remaining consumers are understood.

Do not suppress TypeScript errors to make a migration appear complete.

---

## Source of Truth

For academic identity, the new canonical source of truth is:

```text
Student
├── studentId
├── majorId
└── admissionYear
```

Derived dynamically:

```text
Faculty
Department
Admission Code
Year Level
```

For academic master data, the canonical source of truth is:

```text
Faculty
→ Department
→ Major
```

For Course/Section academic cohort assignment, prefer:

```text
Major
+
Admission Year
```

rather than manually managed student Class Groups.

Do not introduce another competing academic model without explicit instruction.

---

## Final Architecture Summary

Academic master data:

```text
คณะ
└── ภาควิชา
    └── สาขาวิชา
```

Student academic identity:

```text
นักศึกษา
├── รหัสนักศึกษา
├── majorId
├── admissionYear
└── ข้อมูลโปรไฟล์อื่น ๆ
```

Derived display data:

```text
คณะ
ภาควิชา
สาขาวิชา
รหัส 67 / 68 / 69
ชั้นปี
```

Section academic targeting:

```text
สาขาวิชา
+
รหัส
```

Example:

```text
สาขาวิชา IT
รหัส 67
```

or:

```text
IT รหัส 67
IT รหัส 68
```

The system should remain simple enough for an exam submission application while preserving valid academic relationships and existing Student, Teacher, and Admin flows.
