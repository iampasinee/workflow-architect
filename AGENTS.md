# Repository Guidelines

## Project Structure & Module Organization

This React 19, TypeScript, Vite 6, and Tailwind CSS 4 prototype starts in `src/main.tsx`; `src/App.tsx` selects role flows. Put role UI in `src/components/student/`, `teacher/`, or `admin/`, shared primitives in `common/`, and demo controls in `simulation/`. State and migrations live in `src/context/AppContext.tsx`; models and seeds are in `src/types.ts` and `src/data/`. Global styles belong in `src/index.css`; assets go in `public/`.

## Build, Test, and Development Commands

- `npm install`: install locked dependencies.
- `npm run dev`: start Vite on port 3000 and expose it on the LAN.
- `npm run lint`: run `tsc --noEmit`.
- `npm run test:academic`: test academic hierarchy and cohort integrity.
- `npm run test:courses`: test course/section migration, validation, and portal assignments.
- `npm run build`: create production files in `dist/`.
- `npm run preview`: serve the production bundle locally.

Use `npm.cmd` in PowerShell if script policy blocks npm.

## Coding Style & Naming Conventions

Use two-space indentation, semicolons, single quotes, and multiline trailing commas. Prefer PascalCase component files, camelCase variables, descriptive Props interfaces, and named exports. Reuse context actions and shared types. Style with Tailwind utilities; no ESLint or formatter is configured. Interface copy is Thai-only; technical identifiers such as ICIT, CSV, IP Address, and MAC Address may remain English.

## Domain and Persistence Conventions

Academic records use stable IDs. Use `src/services/academicState.ts` for relationships and `src/utils/academicYear.ts` for derived student years—never the calendar. Selectors cascade Faculty → Department → Program → Year → Class Group. Exclude inactive ancestors from assignments and block deletion of referenced records.

Course and section rules live in `src/services/courseState.ts`; the admin UI is `src/components/admin/CoursesAndSectionsPage.tsx`. Preserve foreign keys, enforce composite uniqueness and cohort collisions, and derive portal access from section assignments.

For staged uploads, identify records by `uploadId` and validate raw `sizeBytes`. Rename changes only `submissionName`; preserve `originalName`, sequence, blob, progress, and status. IndexedDB changes require forward migrations.

## Testing Guidelines

Run both domain tests, lint, build, and `git diff --check`. Manually check cascades, CRUD, CSV, and affected role flows. No coverage threshold is configured.

## Commit & Pull Request Guidelines

Use short imperative subjects, optionally prefixed with `feat:` or `fix:`. PRs should describe visible changes, verification, issues, screenshots, and storage migrations.

## Security & Configuration

Never commit secrets or log biometric, authentication, or exam data. Browser storage is mock persistence, not a production backup.
