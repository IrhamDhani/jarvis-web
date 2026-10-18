# IRHAM STUDIO

A personal command center for a 30-day execution plan: build **IRHAM MATH LAB** and develop an **Algebra Workbook**. This repository implements Stage 1 of the command center, with a warm, responsive workspace and browser-local records.

It tracks work toward those products. It does not contain the Math Lab learning website, a completed workbook, or a generated PDF.

## Run locally

Use Node.js **22 or newer** and npm. Netlify is configured for Node 22; the cloud development environment uses Node 24.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`. No API key, `.env` file, database, or paid service is required. Fonts are bundled from the installed packages.

```bash
npm run build       # TypeScript validation and production output in dist/
npm run preview     # Serve the production build locally
npm test            # Vitest business logic and storage tests
npm run test:e2e    # Playwright browser workflows
```

Browser tests use Chromium. The configuration supports `CHROMIUM_EXECUTABLE_PATH` for a custom executable, otherwise uses `/usr/bin/chromium` when available, and falls back to Playwright's bundled Chromium. If neither is installed, install the bundled browser once:

```bash
npx playwright install chromium
npm run test:e2e
```

The Playwright configuration starts a Vite server on port 5173 automatically and can reuse an existing server. Linux machines may also require Chromium's operating-system dependencies. Current browser validation covers Chromium at 1440px desktop and 390px mobile widths, with the Asia/Jakarta timezone; other browsers and physical devices have not been verified.

## Stage 1 workspace

| Workspace         | Available workflow                                                                                                                                                         |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard         | Calendar-aware project day, separate project/task/deliverable progress, explained health status, upcoming work, quick capture, and focus timer.                            |
| 30-Day Roadmap    | All 30 milestones, meaningful deliverables and acceptance criteria, editable detail records, and explicit deliverable acceptance.                                          |
| Daily Missions    | Create, edit, prioritize, reorder within a day/project group, complete, and delete tasks; record estimates, actual time, deadlines, notes, and associated prompt text.     |
| IRHAM Math Lab    | Website task list, search, status filtering, completion, and links back to daily missions.                                                                                 |
| Algebra Workbook  | Workbook task list, search, status filtering, completion, and links back to daily missions.                                                                                |
| Notes & Resources | Searchable captures for tasks, bugs, mathematical ideas, book improvements, AI prompts, marketing ideas, and decisions; tags, timestamps, editing, and confirmed deletion. |
| Settings & Data   | Name, start date, focus duration, JSON backup export/import, protected data recovery, and confirmed reset.                                                                 |

Global search finds tasks, milestones, and captures. The `/` key opens it outside a form field. Mobile navigation, keyboard-accessible dialogs, focus restoration, and Escape dismissal are included.

Daily Missions provides eight review questions covering completed work, learning, problems, AI requests and output, personal verification, tomorrow's plan, and what to avoid. Review drafts save as you write, and the explicit save button remains available. Each review belongs to its calendar date. Use the Review date selector to reopen saved reviews after the schedule changes.

The focus timer can run while navigating within the studio, supports pause/resume and optional task association, and records completed or explicitly saved elapsed sessions. Saving a session associated with a task also adds its elapsed minutes to that task's actual time. It stops when the tab is refreshed or closed; an unfinished timer is not restored. Only saved sessions contribute to recorded focus time.

## What progress means

- **Daily and project progress** measures completed tasks in the selected group.
- **Overall progress** measures explicitly accepted roadmap deliverables out of 30. Completing all tasks for a day does not accept that deliverable automatically.
- **Completion is an action.** Dates passing never mark work complete. A roadmap deliverable requires you to check its acceptance criteria before recording completion.
- **Project health** follows the rules shown in the dashboard: completed deliverables, overdue deliverables, blocked or overdue tasks, future start, and otherwise on track.
- **Changing the start date** shifts milestone schedule dates and task deadlines. Completion timestamps and historical reviews remain attached to their original recorded dates.

First use creates 30 incomplete milestones and 120 actionable, incomplete tasks. Focus sessions, reviews, captures, and recorded task time start empty or zero. Seed records describe planned work, not completed products, customers, revenue, or collected feedback.

## Storage, backups, and recovery

Records save automatically to `localStorage` under `irham-studio-v1`. This is storage for the current browser profile and website origin. There is no account, backend, cross-device sync, or automatic remote backup. Clearing site data, changing the site's domain, or using a different browser produces a different workspace. Tabs on the same browser origin receive saved updates; stale edits are rejected before overwriting another tab's work.

Export a JSON backup in **Settings & Data** before clearing browser data or moving devices. Import validates the complete version 1 schema, shows a summary, and asks for confirmation before replacing the current workspace. Invalid or unsupported backups leave existing data intact. Export the current workspace first when you want to retain both versions.

If saved data is malformed or from an unsupported version, editing and automatic replacement pause. Settings can download the **original stored data unchanged** for recovery, then restore a valid backup or explicitly reset. Reset requires typing the exact word `RESET` and pressing a separate confirmation button. It restores the original plan and removes the current workspace's custom records and progress.

Browser storage and exported JSON are not encrypted by the app. Keep passwords, API keys, payment details, and sensitive personal data out of task and capture content. No credentials are needed for this version. Storage failures show a visible warning; export current data before closing the page if saving fails.

## Deploy to Netlify

Connect this repository in Netlify and use the existing `netlify.toml`:

| Setting                         | Value           |
| ------------------------------- | --------------- |
| Build command                   | `npm run build` |
| Publish directory               | `dist`          |
| Node version                    | `22`            |
| Environment variables / secrets | None required   |

The configuration includes the single-page application fallback to `index.html`. Navigation uses hash URLs, such as `/#roadmap` and `/#missions?day=4`. Hosting publishes the application files; it does not upload local workspace records or backup files. A local build does not mean a public Netlify deployment has been made.

## Source structure

```text
src/
  App.tsx                    Navigation, shared shell, storage/recovery state
  main.tsx                   React entry point and bundled fonts
  types.ts                   Tasks, milestones, reviews, captures, and actions
  styles.css                 Theme, responsive layouts, and interaction styles
  lib/
    model.ts                 Seed plan, calendar arithmetic, progress, health
    storage.ts               Schema validation, persistence, and data actions
  pages/
    Dashboard.tsx            Daily overview and project summaries
    Roadmap.tsx              Milestone grid and acceptance editor
    Missions.tsx             Task workflows and dated daily review
    ProjectWorkspace.tsx     Website/workbook task views
    Notes.tsx                Capture search and editing
    Settings.tsx             Preferences, backups, recovery, reset
  components/
    ui.tsx                   Shared dialogs, headings, badges, progress
    ErrorBoundary.tsx        Recoverable application error screen
    StudioArt.tsx            Original SVG illustration and studio mark
    QuickCapture.tsx         Fast categorized capture
    Focus.tsx                Focus countdown and session recording
    Search.tsx               Workspace search
tests/
  model.test.ts              Business rules and storage validation
  e2e.spec.ts                Browser workflows and reload persistence
```

Keep scheduling, calculation, and persistence rules in `lib/`; pages and components render state and call the typed actions. Keep secrets out of source control. Use `npm ci` with the committed lockfile for repeatable installs. When updating dependencies, review the lockfile diff and rerun the build, unit tests, and affected browser workflows. Data schema changes need an explicit migration and recovery strategy; do not silently replace an unsupported version.

## Scope and next stages

Stage 1 is a responsive web application. Full website feature/bug/verification tracking, workbook chapter/editorial workflows, and a reusable AI prompt library with execution logs remain Stage 2 work. Analytics, a launch center, and PWA/offline installation remain Stage 3 work. The app currently has no service worker, installable PWA, native app, AI API integration, payment system, generated workbook PDF, or connected sales/usage analytics.

See [PROJECT_STATUS.md](PROJECT_STATUS.md) for the implementation and validation checkpoint.
