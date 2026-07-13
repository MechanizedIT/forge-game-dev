# Forge Project Status

**Last updated:** 2026-07-13
**Current milestone:** Prepared Enemy Targeting quest
**Overall state:** Prepared quest ready for command-line execution work

## What works now

- Strict project, roadmap, quest, plan, handoff, review, and workflow contracts
- Minimal playable Godot 4.7 fixture with player movement and a visible idle enemy
- Persistent demo workspace preparation with explicit reset behavior
- Automatic pinned Godot 4.7 download with pre-extraction SHA-256 verification
- Versioned verified Godot cache with `GODOT_BIN` override support
- Game launch and headless Godot verification
- A strict Enemy Targeting quest, prepared implementation plan, and available roadmap node

## Current user experience

The sample game can be prepared, launched, reset, and verified from the command line. Enemy Targeting can now be inspected as a validated quest and plan, but Forge cannot send it to Codex yet and the enemy still remains idle. The dashboard is not connected.

## Just completed

- Prepared the Enemy Targeting goal, non-goals, context, deterministic criteria, and verification steps
- Added a decision-complete implementation plan at `APPROVE` and a real `available` roadmap node
- Verified strict loading, cross-references, context files, and invalid-state rejection with 19 tests

## In progress

No implementation milestone is currently in progress. The next task requires a bounded command-line runtime plan and approval.

## Blocked or uncertain

No hard blocker is recorded. Enemy Targeting is prepared but intentionally not implemented. Codex execution, progress capture, review artifacts, and a clean-machine packaging rehearsal remain incomplete.

## What should happen next

Build the command-line Codex execution loop for the prepared **Enemy Targeting** quest using the official SDK, before dashboard work.

## Try it

```powershell
npm install
npm run demo:prepare -- confirm-download
npm run demo:play
```

Later runs use `npm run demo:prepare` without download confirmation. Run `npm run godot:verify` for headless verification. Reset with `npm run demo:reset -- confirm-reset`. `GODOT_BIN` remains available as an override.

The prepared artifacts live under `fixtures/godot/baseline/.forge`. They describe future behavior; the current game correctly shows the idle baseline.

## Key evidence

- Roadmap: [`ROADMAP.md`](ROADMAP.md)
- Fixture guide: [`docs/GODOT_FIXTURE.md`](docs/GODOT_FIXTURE.md)
- AI work log: [`docs/AI_WORK_LOG.md`](docs/AI_WORK_LOG.md)
- Technical evidence: [`docs/plans/`](docs/plans/), [`docs/reviews/`](docs/reviews/), and [`docs/closeouts/`](docs/closeouts/)
