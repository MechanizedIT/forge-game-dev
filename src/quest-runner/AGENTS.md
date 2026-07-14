# Quest Runner Instructions

## Owns

The prepared sample quest execution, bounded Codex context, progress translation, verification, run evidence, play gate, and completion mutation.

## Does not own

Generated-project quests, project registry state, blueprint planning, or dashboard layout.

## Start here

Read `workflow.ts`, `completion.ts`, `verification.ts`, `../quests/prepared-enemy-targeting.ts`, and `../../docs/QUEST_CLI.md`.

## Invariants

Approval precedes execution; only declared files and commands are allowed; roadmap completion requires successful automated review and exact creator confirmation.

## Required checks

Run `tests/quest-runner.test.ts`, `tests/quest-completion.test.ts`, `tests/prepared-quest.test.ts`, and `npm run check:v0.1`.
