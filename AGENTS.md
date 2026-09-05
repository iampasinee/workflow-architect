# Repository Guidelines

## Project Structure & Module Organization

This is a React 19, TypeScript, Vite 6, and Tailwind CSS 4 frontend prototype. Startup lives in `src/main.tsx`; `src/App.tsx` selects login and role flows. Place role UI in `src/components/student/`, `teacher/`, or `admin/`, shared primitives in `common/`, and demo controls in `simulation/`. Central state lives in `src/context/AppContext.tsx`; shared models and seeds are in `src/types.ts` and `src/data/initialData.ts`. Staging uses `src/types/stagedUpload.ts` and `src/services/stagedUploadStorage.ts`. Global styles belong in `src/index.css`; static assets go in `public/`.

## Build, Test, and Development Commands

- `npm install` installs dependencies; `package-lock.json` is present.
- `npm run dev` starts Vite on port 3000 and exposes it on the local network.
- `npm run lint` runs TypeScript checking with `tsc --noEmit`.
- `npm run build` creates a production bundle in `dist/`.
- `npm run preview` serves the production bundle for a local smoke test.
- `npm run clean` removes generated `dist/` and `server.js` files; it requires a Unix-compatible shell.

Use `npm.cmd` in PowerShell if script policy blocks npm. Run lint and build before submitting changes.

## Coding Style & Naming Conventions

Use two-space indentation, semicolons, single quotes, and multiline trailing commas. Prefer PascalCase component filenames, camelCase variables, descriptive Props interfaces, and named exports. Reuse shared types and context. Styling uses Tailwind utilities; no ESLint or formatter configuration is present.

## Staged Upload Conventions

Use `uploadId` for identity and raw `sizeBytes` for validation. Preserve `originalName`; manual rename changes only `submissionName`. Automatic naming uses profile fields, a configurable template, and persistent per-session sequences. Keep blobs, progress, and status intact during rename. IndexedDB changes require forward migrations preserving existing drafts. See README.md for current behavior and storage limitations.

## Testing Guidelines

No automated runner or coverage threshold is configured. Check affected roles through demo controls, including file selection/drop, naming, refresh restoration, submission locks, and timeout/grace behavior. If adding tests, use colocated `*.test.tsx` files and document the runner in `package.json`.

## Commit & Pull Request Guidelines

Git history is unavailable in this snapshot. Use short imperative subjects, optionally prefixed with `feat:` or `fix:`. PRs should describe user-visible changes, verification, relevant issues, UI screenshots, and configuration or storage migrations.

## Security & Configuration

Current frontend flows require no Gemini API key. `.env.example` contains unused integration placeholders. Never commit secrets or populated environment files, or log biometric, authentication, or exam data. IndexedDB is browser-local mock storage, not a server backup.
