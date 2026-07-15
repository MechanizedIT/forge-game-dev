# Forge Alpha Pivot Milestone 1 — Acceptance Review

## What I did

- Compared the actual diff with every approved acceptance rule.
- Ran the full compatibility and protected test gates.
- Reopened both real projects without changing them.

## What this means

The milestone meets its approved boundary. The new model is open, the legacy path still works, and no runner execution rule or project record changed.

## What you do next

Review the uncommitted milestone diff.

## How to do it

Open PowerShell in `C:\Users\cwood\Documents\forge-game-dev`, then run `git diff`.

## Technical details (optional)

### Acceptance criteria

- **PASS — Open representation:** A branching-dialogue model validates without a supported-game-type, capability, starter, delta, editable-role, or profile entry.
- **PASS — Systems before quests:** Multiple systems validate when one has no quests; an entirely unrefined project may have an empty quest collection; every zero-quest system remains `planned`.
- **PASS — System-first focus:** Focus always selects an existing system, may omit the quest, and rejects a selected quest that belongs to another system.
- **PASS — Optional extra proof:** Adding or removing `extraProof.profileId` leaves model validity and quest/system statuses unchanged.
- **PASS — One-for-one migration:** Ordered quest IDs, run-backed work-session IDs, terminal result IDs, and Chronicle history IDs/counts match their validated sources.
- **PASS — Gravity Tap:** Quest 1 is completed, Quest 2 is available, and run `run-q1-enter-the-arena-1784085217366-54d6c1f399c3` links its result and Chronicle entry to commit `f4cbba5928e22c0a3471239d7b67b490c7649a56` and tree `1fd2f3045f65d1d4ec70475666ea089a9ae12d85`.
- **PASS — Signal Sweep:** Quest 1 stays available with session `run-q1-activate-the-signal-relay-1784097644808-d6b07df30793` at `2026-07-15T06:40:44.808Z`; changed files and results remain empty; later quests remain blocked.
- **PASS — Read-only reopen:** The registry digest remained `a23042ae97c706285780d91642faed0a0e29261ab04b4feb2b6f75c840f06b86`. All `.forge`, tracked-record, run-file, active-lock, Git HEAD/status, and remote values matched before and after.
- **PASS — Deterministic legacy system:** Every v1/v2 flat roadmap becomes exactly one selected `system-first-playable` system with unchanged quest order, quest focus, and IDs.
- **PASS — Exact statuses:** An empty system is planned; otherwise all-completed is completed, all-unfinished-deferred is deferred, any active/available/completed quest makes the system active, and remaining combinations are planned. Approved/implementing/verifying/playtest/completion-pending runs are active; contract review and terminal failures preserve persisted quest status.
- **PASS — Fail closed:** Broken ownership, focus, ordered links, session/result/history links, and malformed run directories are rejected before Project World returns a model.
- **PASS — Protected behavior:** Task A completion/recovery, Task B creation/prepare, full dashboard, and protected v0.1 checks pass.
- **PASS — Scope:** The diff contains no migration framework, repository scanner, catalog, UI redesign, external import, native writer, planner rewrite, or execution-policy rewrite.
- **PASS — Honest closeout:** Documentation says arbitrary Godot systems and quests are representable, while arbitrary unprofiled execution remains deferred.

### Commands and results

- Approved focused command: 51 tests passed.
- `npm run check`: 121 tests passed.
- `npm run check:v0.1`: 38 tests and production build passed.
- `npm run context:check`: 11 subsystems, 10 routes, 255 path references, and 68 test references passed.
- `git diff --check`: passed.

No commit, push, or pull request was created.
