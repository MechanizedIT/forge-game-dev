# Dashboard Workflow Integration Handoff

- **Workflow state:** `DOCUMENT`
- **Result:** The Forge Workshop dashboard is connected to the authoritative Enemy Targeting workflow.

## Implemented

- Added a native Node/TypeScript local host that serves the production dashboard and exposes validated state, approval, live progress, play, and creator-confirmation actions.
- Added one in-memory coordinator for the active Codex turn and Godot process. It prevents duplicates but creates no second durable workflow or roadmap state.
- Reused `prepareQuestRun`, `executePreparedQuest`, strict review artifacts, verified Godot launch, and completion persistence without changing SDK scope or safety rules.
- Split the existing completion service into a reusable post-launch finalizer while keeping the CLI launch-and-confirm wrapper intact.
- Replaced the frontend prototype controller and static evidence with real quest, plan, roadmap, handoff, review, verification, sanitized event, launch, and completion data.
- Added `npm run forge` as the production dashboard launch command.

## Evidence

- TypeScript passed for backend, host, and dashboard.
- All 45 offline tests passed, including duplicate prevention, progress delivery, verification failure, launch failure, rejection, cancellation, persistence reload, HTTP state, and CLI cancellation.
- The Vite production build passed.
- Browser smoke checks passed for real artifact loading, Quest Brief navigation, live progress, failure evidence, no mocked controller, no primary raw SDK output, no console errors, and no horizontal overflow at 1280 and 700 pixels.
- Godot 4.7 fixture verification passed and a 120-frame launch smoke exited 0.

## Live-run result

An isolated official SDK run was started from the dashboard. It changed exactly the three approved files and streamed real progress. Repository checks passed, but Godot rejected the generated detection behavior at 180 pixels. Forge rendered the real failed-verification state, preserved evidence, and did not offer play or completion. No human visual confirmation was performed or claimed.

## Remaining risks

- A successful official SDK dashboard run through human play confirmation still needs rehearsal.
- Restarting the host during an active run does not recover that live process; durable completed state does reload correctly.
- Chronicle currently presents the latest completion rather than indexing multiple attempts.

## TL;DR

The dashboard is now a real control surface over the existing Forge workflow, and its safety gates held during both automated success tests and a genuine live verification failure. The next bounded action is a clean-machine successful judge rehearsal with real human confirmation.
