# Forge Project Status

**Last updated:** 2026-07-13

**Current milestone:** Enemy Targeting command-line vertical slice

**Overall state:** Live Codex implementation and automated review work; creator completion is next

## What works now

- Prepare or explicitly reset a persistent Godot 4.7 demo workspace with a clean Git baseline.
- Download and checksum-verify the pinned portable Godot build when approved, or use `GODOT_BIN`.
- Load the strict prepared Enemy Targeting quest and approved plan.
- Require explicit approval, then run the official `@openai/codex-sdk` against only the demo workspace and three declared files.
- Show five plain-language progress stages, capture sanitized events and the real diff, run project and Godot checks, and write validated handoff/review evidence.
- Return `CONDITIONAL PASS` without changing roadmap state when automation passes but play confirmation is still missing.

## Current user experience

```powershell
npm install
npm run demo:prepare -- confirm-download
npm run quest:run -- enemy-targeting
```

Type `APPROVE` after reviewing the bounded change. On `CONDITIONAL PASS`, run `npm run demo:play`, approach the red enemy to see it change from `IDLE` to `CHASING`, and retreat to make it idle again.

The live path was exercised successfully with the official SDK: exactly three planned files changed, project checks passed, Godot emitted all four deterministic signals, and AC-1 through AC-5 passed. AC-6 remains pending because Forge does not yet record the creator's “I saw it work” confirmation.

## Still incomplete

- Launch-and-confirm workflow, persistent quest completion, and completion feedback
- Dashboard and companion UI
- Clean-machine judge rehearsal and replay fallback

The immutable fixture intentionally remains the idle baseline. Reset still discards the generated mechanic only after exact `confirm-reset` approval. A dirty workspace is never overwritten by a quest run.

## Next milestone

Add the smallest terminal launch and explicit play-confirmation step. It may complete the quest only when the existing review is `CONDITIONAL PASS` and the creator confirms the visible behavior; otherwise the roadmap remains available.

Operational details: [`docs/QUEST_CLI.md`](docs/QUEST_CLI.md). Technical evidence: [`docs/evidence/2026-07-13-enemy-targeting-cli-live.json`](docs/evidence/2026-07-13-enemy-targeting-cli-live.json).
