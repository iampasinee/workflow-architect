# SecureLab

SecureLab is a frontend prototype for laboratory exam submission and monitoring, built with React 19, TypeScript, Vite 6, and Tailwind CSS 4. It provides Thai/English interfaces and simulated student, teacher, and administrator workflows. Authentication, biometric verification, and uploads are demonstrations.

## Run locally

Install Node.js with npm, then run:

```sh
npm install
npm run dev
```

Open http://localhost:3000. The initial page is the login screen; select a demo persona to explore the role workflows. The development server is exposed on the local network. In PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.

The current frontend requires no API key. `.env.example` contains inherited `GEMINI_API_KEY` and `APP_URL` placeholders, but application source does not currently use them. Never commit populated environment files or put secrets in client-side code.

## Development commands

| Command | Purpose |
| --- | --- |
| `npm install` | Install dependencies; `package-lock.json` is present. |
| `npm run dev` | Start Vite on port 3000. |
| `npm run lint` | Check TypeScript with `tsc --noEmit`. |
| `npm run build` | Build production assets into `dist/`. |
| `npm run preview` | Serve the production bundle locally. |
| `npm run clean` | Remove `dist/` and `server.js`; requires a Unix-compatible shell. |

## Project structure

- `src/main.tsx`, `src/App.tsx`: startup and role-based screen selection.
- `src/components/`: authentication, student, teacher, administrator, shared, and simulation UI.
- `src/context/AppContext.tsx`: application state and simulated actions.
- `src/types.ts`, `src/data/initialData.ts`: shared models and mock records.
- `src/types/stagedUpload.ts`, `src/services/stagedUploadStorage.ts`: staged-file model and IndexedDB persistence.
- `src/utils/fileSize.ts`: byte-size display formatting.
- `src/index.css`, `public/`: global styling and static assets.

## Staged upload workflow

The student page uses a two-column workflow at 1024px and above. The rules card occupies roughly 38% on the left, while a compact drop zone and the staged-file list share the 62% right column. Smaller screens stack all three sections vertically. Selecting or dropping a file immediately copies its blob into browser-local IndexedDB and simulates progress over approximately 2–3 seconds. Staged drafts survive refreshes, and interrupted mock uploads resume when the exam page loads.

New files receive a unique `uploadId` and a persistent sequence shared across file types for each exam/student pair. The default submission name is:

```text
{studentId}_{firstName}_{lastName}_{uploadSequence}.{extension}
6410123457_somying_rakrian_1.py
```

`studentId` uses the profile's `studentCode`. Names use `firstName` and `lastName`, falling back to splitting `fullName`. Name parts are lowercased, spaces/hyphens become underscores, and characters other than English letters and underscores are removed. No romanization service is implemented. `fileRequirements.automaticFilenamePattern` optionally supplies the five-token template; backend configuration retrieval is not implemented.

Students can Rename or Remove staged files. Rename changes only `submissionName`; it preserves the original filename, binary, identifier, status, and progress. Base names are trimmed, limited to 1–100 characters, and validated against `^[A-Za-z0-9_-]+$`. Full-name duplicates are rejected case-insensitively. Enter saves; Escape or Cancel discards edits.

Exam configuration controls allowed extensions and maximum file size. Only zero-byte files are empty; valid files under 1 KB are accepted and displayed in bytes. The default active exam accepts `.zip` and `.py`; `.jpg` requires instructor configuration.

Manual finalization requires at least `requiredFileCount` ready files and no uploading, invalid, or failed rows. “Finish Exam and Submit Files” opens a review dialog. Timer expiry locks editing and automatically submits ready files, allowing active uploads a 10-second grace period. Unfinished transfers become failed. With no ready files, the page displays “No files submitted” and prompts contact with the instructor. Successful submission displays the submitted files and timestamp. Teachers can reopen submissions for a limited duration.

## Persistence and limitations

Application records use `localStorage`. Blobs and sequence counters use the `securelab-staged-uploads` IndexedDB database, currently version 6. Migrations preserve existing submission names. Deleting a staged file does not decrement the sequence counter.

Storage is local to the browser and origin, not a remote backup. Closing the browser stops mock timers; automatic finalization cannot execute while the app is closed. The simulation reset restores application seeds but does not clear IndexedDB drafts or counters. Deleting that database through browser developer tools permanently removes its staged files and counters.

Existing localStorage records take precedence over updated seed data. Authentication, security monitoring, and integrity-check UI are mock workflows and should not be treated as production security guarantees.

## Verification and contributions

Run `npm run lint` and `npm run build` before handing off changes. No automated test runner or coverage threshold is configured. Manually check affected role flows, selection/drop, rename validation, refresh restoration, submission locks, and timeout behavior with demo controls. Builds may report a non-failing bundle-size advisory.

See [AGENTS.md](AGENTS.md) for contributor guidelines.
