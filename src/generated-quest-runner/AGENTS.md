# Generated Quest Runner Instructions

## Owns

Current generated-quest preparation plus the future general work-session boundary:
approval, exclusive run lock and journal, bounded context, official SDK
orchestration, sanitized progress, baseline and optional proof, creator
confirmation, exact rollback, completion Git transaction, receipt repair,
recovery, and run evidence.

## Does not own

Project creation or registry writes, prepared Enemy Targeting semantics, arbitrary
project scanning, browser-supplied paths/commands/models/verifiers/Git values, or
presentation layout.

## Start here

Read `service.ts` for the workflow boundary, `native-quest.ts` for accepted
system-quest work orders, `completion.ts` for the exact Git transaction,
`recovery.ts` for restart/rollback behavior, and `contract.ts` for persisted run
state. Confirm callers in `../dashboard-host/server.ts` and presentation in
`../dashboard-v2/GeneratedProjectWorld.tsx` before changing a boundary.

## Invariants

- Resolve only registered canonical direct-child projects.
- Inventory and hashes govern the boundary; Git status alone is insufficient.
- GET and status reads never mutate project artifacts.
- Only `worked` may enter completion, and automated proof reruns afterward.
- Rollback writes no path until every touched path matches its observed posthash.
- Completion stages and commits an exact manifest once; recovery never broad-resets.
- Never fabricate creator play, Codex execution, or verification evidence.

## Product direction and current compatibility

Read `../../docs/PRODUCT_VISION.md` before planning runner changes. A verification
profile may add evidence, but it must not decide whether a creator's quest is a
valid idea. The target work-session model allows creator-approved existing and
new UTF-8 game files, pauses when the agent needs undeclared scope, runs baseline
Godot health checks, and keeps exact undo.

The current native work-session path allows one to four creator-approved
existing or expected-new UTF-8 Godot text files and pauses when Codex needs
undeclared scope. Preserve Task A's closed profile behavior for older projects
and tests; do not expand the profile catalog as a substitute for open planning.

## Required checks

Run generated-runner, recovery, completion, generated-world, dashboard-host, project
creation, contracts, and prepared quest tests, followed by `npm run check:v0.1`.
