# IRHAM STUDIO — project status

**Scope delivered:** Stage 1 of the personal 30-day execution command center. The selected repository is `IrhamDhani/jarvis-web`; the app uses React, TypeScript, and Vite. It is a responsive web app with browser-local persistence.

## Implemented

- Shared desktop sidebar, mobile navigation, current page indication, date/time, project-day calculation, original SVG studio artwork, bundled typography, and a consistent warm visual theme.
- Dashboard with data-derived progress, separate website/workbook summaries, current-day missions, upcoming milestones, and a project-health explanation.
- Complete 30-day roadmap with 30 meaningful deliverables, objective/description, acceptance criteria, priority/status, dates, notes, links, and prompt references. Deliverable completion requires explicit personal acceptance.
- 120 initially incomplete tasks distributed through the plan; task creation, editing, deletion confirmation, priority/status, estimates/actual minutes, deadlines, notes, and prompt text. Tasks can be reordered within the same day and project group.
- Daily task completion and project task progress kept separate from overall milestone progress. Completed-task timestamps are recorded from actions; dates do not fabricate completion.
- Eight dated daily-review answers, including AI output and personal verification. Review drafts autosave, can be explicitly saved, and survive refresh. A saved-date selector keeps historical reviews accessible after rescheduling.
- Website and workbook task workspaces with search, status filtering, completion controls, and navigation to daily work.
- Categorized quick capture and searchable/editable capture records with tags, created/updated timestamps, confirmed deletion, and a decision filter. AI prompts can be saved as captures; this is not yet the Stage 2 prompt library.
- Global workspace search and focus sessions with optional task association, pause/resume, and explicit elapsed-time saving. Saved linked sessions add their elapsed minutes to the associated task's actual time.
- Editable name, project start date, and default focus duration. Rescheduling shifts milestone dates and task deadlines while preserving task completion timestamps and historical review dates.
- Automatic browser persistence, validated JSON export/import with a preview and replacement confirmation, exact typed `RESET` confirmation, visible storage errors, and protected recovery of malformed or unsupported stored data.
- Netlify build configuration with Node 22, `dist` output, and a single-page application fallback.

## Validation checkpoint

Executed successfully in the cloud workspace:

- Frozen installation with `npm ci` using the committed lockfile.
- `npm run build`: TypeScript validation and the Vite production build pass.
- `npm test`: **35 of 35** business-rule and storage tests pass.
- `npm run test:e2e`: **14 of 14** Chromium workflow tests pass. Mobile navigation and accessibility were rerun successfully after the final drawer focus safeguards.
- **19 automated accessibility audits** cover the seven desktop/mobile pages, the open mobile drawer, and task/milestone dialogs. No violations were reported for the WCAG A/AA rule tags tested. This is automated coverage, not a complete manual accessibility certification.
- The built production app was served and exercised in Chromium: the dashboard renders, checkbox state survives refresh, an empty mission shows 0% without errors, and a new task can be created from that empty state and survives refresh. No runtime errors occurred in that smoke check.
- Source formatting and Git whitespace checks pass.

Reproduce checks with:

```bash
npm ci
npm run build
npm test
npm run test:e2e
```

Chromium browser checks use a 1440px desktop viewport and a 390px mobile viewport, with Asia/Jakarta calendar behavior. The browser suite covers navigation, all 30 roadmap milestones, separate task/deliverable completion, durable task editing and ordering, all eight review answers, rescheduling, backup download/restore/corruption rejection, typed reset, protected storage recovery, focus-session saving, capture workflows, and mobile layout/dialog behavior. Multi-tab changes, recovery locking, review autosave, historical review access after rescheduling, and fractional focus time are also covered. No cross-browser, real-device, public-hosting, or production traffic results are claimed.

Node 24 is available in the cloud environment. Netlify pins Node 22. See the README for local browser installation and the optional Chromium executable override.

## Data and behavior boundaries

The initial plan is planning content. All tasks and deliverables start incomplete, all actual time starts at zero, and no reviews, captures, focus activity, sales, customers, revenue, or user-testing results are invented.

Data belongs to the current browser profile and origin. Tabs sharing that origin receive valid updates and stale writes are rejected; this is not cloud synchronization. There is no account, cloud database, cross-device sync, or automatic remote backup. Exported JSON is the supported manual transfer and recovery path. Invalid imports preserve current records; unreadable or unsupported saved data is kept unchanged until an explicit restore or reset. The recovery download contains the original stored text, even when that text cannot be opened by this version.

The focus timer continues within the open studio tab. Closing or refreshing the tab discards an unfinished countdown. Only completed or explicitly saved elapsed sessions count toward focus totals. Saving a linked session increases the associated task's actual minutes; task actual minutes also remain editable. Session association does not itself certify task completion.

The app requires no API keys or paid services and makes no AI API calls. Capture fields and backups should not contain secrets or sensitive personal information; local data and JSON exports are not encrypted by the app.

## Stage 2 — pending

| Area              | Remaining scope                                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Website tracker   | Full module/feature records, dedicated bug lifecycle, verification/evidence tracking, and richer product-workflow views.                                           |
| Workbook workflow | Dedicated chapters, writing/editorial/verification stages, exercises/solutions progress, and release artifact tracking.                                            |
| AI prompt library | Reusable structured prompt records, templates, execution/output logs, and verification links. Current task prompt text and AI-prompt captures remain simple notes. |

## Stage 3 — pending

| Area                       | Remaining scope                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| Analytics                  | Historical trend views and data-derived execution insights beyond the current summary measures. |
| Launch center              | Product launch checklist, actual order/customer evidence, and release readiness workflows.      |
| PWA / offline installation | Manifest, service worker, offline strategy, installation behavior, and update lifecycle.        |

The Math Lab learning product, workbook manuscript/PDF, payment/order fulfillment, external analytics, native applications, and AI integrations have not been built by this command-center implementation.

## Maintenance and release notes

- Use the committed `package-lock.json` and `npm ci`; validate dependency updates with the same build and relevant tests.
- Keep domain rules and calendar arithmetic in `src/lib/model.ts`, and persistence/schema behavior in `src/lib/storage.ts`; components should call the shared typed actions.
- Preserve original stored data when adding schema versions. Design and test an explicit migration before supporting a new version.
- Export and restore a backup before clearing browser data or changing the hosting origin. Keep confidential data out of repository files and workspace notes.
- `npm run build` produces deployment-ready files, and `npm run preview` serves that output locally. Public Netlify deployment is a separate action and has not been claimed here.

## Cloud environment configuration

Reusable `install_script` and `start_skill` instructions were saved in the environment configuration draft. They install from the lockfile, build the application, explain how to restart the development server, and describe readiness checks. The current machine was installed, started, and validated; saving the draft does not apply or publish it. Review and save the draft in environment settings, then publish the environment to create a reusable snapshot. No new-task restoration or public deployment has been claimed.
