# Repository Guidelines

## Project Structure & Module Organization

This React 19, TypeScript, Vite 6, and Tailwind CSS 4 prototype starts in `src/main.tsx`; `src/App.tsx` selects login and role flows. Put role UI in `src/components/student/`, `teacher/`, or `admin/`, shared primitives in `common/`, and demo controls in `simulation/`. State and migrations live in `src/context/AppContext.tsx`; models and seeds are in `src/types.ts` and `src/data/`. IndexedDB staging uses `src/types/stagedUpload.ts` and `src/services/stagedUploadStorage.ts`. Global styles belong in `src/index.css`; static assets go in `public/`.

## Build, Test, and Development Commands

- `npm install`: install locked dependencies.
- `npm run dev`: start Vite on port 3000 and expose it on the LAN.
- `npm run lint`: run `tsc --noEmit`.
- `npm run build`: create production files in `dist/`.
- `npm run preview`: serve the production bundle locally.

Use `npm.cmd` in PowerShell if script policy blocks npm. `npm run clean` uses Unix `rm`; do not rely on it in plain PowerShell.

## Coding Style & Naming Conventions

Use two-space indentation, semicolons, single quotes, and multiline trailing commas. Prefer PascalCase component files, camelCase variables, descriptive Props interfaces, and named exports. Reuse context actions and shared types. Style with Tailwind utilities; no ESLint or formatter is configured. Interface copy is Thai-only; technical identifiers such as ICIT, CSV, IP Address, and MAC Address may remain English.

## Domain and Persistence Conventions

Academic definitions live in Context's `academicState` with stable internal IDs; Thai names are display values. Use `src/services/academicState.ts` for validation, migration, and relationship checks. Selectors cascade Faculty → Department → Program → Year → Class Group. Exclude inactive ancestors from new assignments and block deletion of referenced records.

For staged uploads, identify records by `uploadId` and validate raw `sizeBytes`. Preserve `originalName`; rename changes only `submissionName`. Keep `uploadSequence`, blobs, progress, and status intact. IndexedDB schema changes require forward migrations that preserve drafts.

## Testing Guidelines

Run `npm run test:academic` for Node tests covering migration and academic integrity, plus `npm run lint`, `npm run build`, and `git diff --check`. Manually check cascades, CRUD, bulk assignment, CSV, and affected exam flows. No coverage threshold is configured.

## Commit & Pull Request Guidelines

History uses short imperative subjects such as `feat: add academic structure`. PRs should describe visible changes, verification performed, related issues, screenshots for UI work, and any localStorage or IndexedDB migration.

## Security & Configuration

No API key is required. Never commit secrets or populated environment files, and never log biometric, authentication, or exam data. Browser storage is mock persistence, not a production backup.
