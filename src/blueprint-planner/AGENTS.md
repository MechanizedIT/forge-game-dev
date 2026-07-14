# Blueprint Planner Instructions

## Owns

Idea intake, bounded clarification, GPT session behavior, blueprint validation/repair, provenance, cancellation, and in-memory approval state.

## Does not own

Filesystem creation, starter source, registry writes, Godot execution, or generated-quest implementation.

## Start here

Read `service.ts`, `prompt.ts`, `sdk.ts`, `../contracts/game-blueprint.ts`, and the Task 4A closeout linked from `../../docs/REPOSITORY_GUIDE.md`.

## Invariants

Foundation and schema remain deterministic; at most one clarification screen and one repair are allowed; approval alone writes no project files.

## Required checks

Run `tests/blueprint-planning.test.ts`, `tests/dashboard-v2.test.ts`, and `npm run check:v0.1` when host wiring changes.
