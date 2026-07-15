# Forge Alpha Pivot Milestone 1 — Implementation Handoff

## What I did

- Added the open Project → Systems → Quests → Work Sessions → Results model, including broad systems that do not have quests yet.
- Reopened Gravity Tap and Signal Sweep through one read-only compatibility path.
- Kept the current UI and generated runner working as before.

## What this means

Forge can now show broad Godot systems first, then add quests when the creator refines a system. Focus may stay on an unrefined system. Existing projects keep their exact records and history.

## What you do next

Review the uncommitted milestone diff.

## How to do it

Open PowerShell in `C:\Users\cwood\Documents\forge-game-dev`, then run:

```powershell
git status --short
git diff --stat
git diff
```

## Technical details (optional)

### Implemented boundary

- `src/contracts/project-plan.ts` owns the strict version 1 aggregate model and all cross-record links.
- A system may have zero quests and is then always `planned`. The complete quest collection may be empty. Focus always selects a system and selects a quest only when that quest belongs to the selected system.
- `GeneratedQuestRunnerService.listProjectSessions(projectId)` reads every owned run through the existing validated loader and sorts by creation time, then run ID.
- `src/generated-project-world/project-model.ts` projects legacy v1/v2 records into one `system-first-playable` system without writing files.
- Generated Project World exposes `projectModel`; the old roadmap, quest, starter-aware, and runner fields remain deprecated compatibility transport.
- Runner execution, approval, proof, recovery, rollback, and completion policy did not change.

### Verification

- Focused approved suite: 51/51 passed.
- `npm run check`: 121/121 passed.
- `npm run check:v0.1`: 38/38 passed with the production dashboard build.
- `npm run context:check`: passed.
- `git diff --check`: passed.
- Live read-only reopen: registry, project records, run files, active lock, Git HEAD, Git status, and remotes were identical before and after.

### Truth boundary

Open representation is complete. Generic profile-free Codex execution is not complete. Existing Gravity and relay profile gates remain compatibility-only runner policy until a separate owner-approved runner milestone.

No commit, push, or pull request was created.
