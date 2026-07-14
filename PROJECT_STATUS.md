# Forge Project Status

**Last updated:** 2026-07-13

**Current milestone:** `v0.2 Task 1 — Protect the v0.1 baseline`

**Overall state:** `COMPLETE` — the refined v0.1 sample experience is preserved behind a dedicated legacy entry and the focused compatibility boundary passes

## What works now

- Immutable tag `v0.1.0` still resolves to golden commit `99a439aff4425cc3572bd90eb2412ea89ff052ad`.
- Refined fallback commit `4d276125aeb44d007cca96193daf9515fca2a99e` matches `origin/main`.
- Development continues on `feature/v0.2-living-workshop`.
- `npm run forge` still launches the existing sample experience and remains the default until final v0.2 rehearsal.
- `npm run forge:v0.1` builds and opens `/legacy.html`, which renders a byte-identical copy of the protected pre-task sample component.
- `npm run check:v0.1` builds both entries and exercises prepared artifacts, approval, duplicate-run protection, ordered progress, scope and verification gates, launch/confirmation behavior, persistence, reset, and CLI cancellation.
- The complete Enemy Targeting workflow, pinned Godot runtime, explicit creator confirmation, persistent completion, and safe reset remain available.

## Verification

```powershell
npm run check:v0.1
npm run check
npm run godot:verify
npm run forge:v0.1
```

- Focused compatibility: 37/37 tests passed.
- Full suite: 49/49 tests passed.
- Production build emitted both `index.html` and `legacy.html`.
- Legacy HTTP smoke returned 200 from `/legacy.html`.
- Godot 4.7 emitted `FORGE_ENEMY_TARGETING_VERIFY_OK idle=pass detection=pass chase=pass player=pass controls=arrows+wasd`.
- No fixture, quest runner, Godot runtime, demo workspace, quest loader, contract, verification, reset, or completion file changed.

## Approved v0.2 scope

Required: Living Game Workshop Launchpad, redesigned sample shell, GPT-5.6 idea-to-blueprint planning, one controlled Top-down arena starter, real project creation, generated roadmap/documentation/Chronicle, and persistent new-project Project World.

Optional only after the required path is stable: generated-quest implementation, Side-scrolling platformer, Movement sandbox, and the sample visual-art pass.

## Still incomplete

- Launchpad and Living Game Workshop visual shell
- Sample-flow recomposition inside the new shell
- GPT-5.6 new-game intake and blueprint generation
- Top-down arena starter creation and verification
- Persistent generated-project World, roadmap, documentation, and Chronicle
- Final v0.2 hardening and real end-to-end rehearsal
- Existing submission packaging items: public video/links, primary `/feedback` ID, license, and optional replay decision

## Next bounded task

Task 2: build the Launchpad and Project World shell with fixture data only. Keep `npm run forge` on the protected experience and do not begin GPT planning, starter creation, or persistence.

See [`PLAN.md`](PLAN.md), the [Task 1 review](docs/reviews/2026-07-13-v0.2-task-1-baseline-protection-review.md), and the [Task 1 closeout](docs/closeouts/2026-07-13-v0.2-task-1-baseline-protection-closeout.md).
