# Forge Project Status

**Last updated:** 2026-07-13

**Current milestone:** `v0.2 Task 2.1 — Visual hierarchy and roadmap semantics`

**Overall state:** `COMPLETE` — the isolated fixture shell now communicates the game, current quest, future sequence, Companion guidance, and idea entry clearly while the refined v0.1 sample experience remains the default

## What works now

- Immutable tag `v0.1.0` still resolves to golden commit `99a439aff4425cc3572bd90eb2412ea89ff052ad`.
- Refined fallback commit `4d276125aeb44d007cca96193daf9515fca2a99e` matches `origin/main`.
- Development continues on `feature/v0.2-living-workshop`.
- `npm run forge` still launches the existing sample experience and remains the default until final v0.2 rehearsal.
- `npm run forge:v0.1` builds and opens `/legacy.html`, which renders a byte-identical copy of the protected pre-task sample component.
- `npm run forge:v0.2` builds and opens `/v0.2.html`, an isolated Living Game Workshop preview with exactly two Launchpad choices.
- **Explore the sample game** opens a responsive fixture-backed Project World with the roadmap as the dominant canvas, a stylized preview and current-state summary, five roadmap states, the Forge Companion, and a local-only idea field.
- **Create a new game** opens an honest placeholder explaining that idea-to-blueprint planning is not connected yet.
- Launchpad choices now preview their destination: a miniature playable arena plus verified quest rail for the sample, and an idea-to-three-node roadmap transformation for Create.
- Project World now reads left to right as Foundation → First Encounter → Game Feel → Polish, with no crossing paths; narrow layouts preserve that order vertically.
- Enemy Targeting owns the primary review action. The Companion and distinct `+ Add an idea` port sit beneath it without obscuring roadmap modules or dependencies.
- The sample snapshot is a larger game-like arena with an explicit idle enemy and no-target state rather than another abstract blueprint.
- `npm run check:v0.1` builds both entries and exercises prepared artifacts, approval, duplicate-run protection, ordered progress, scope and verification gates, launch/confirmation behavior, persistence, reset, and CLI cancellation.
- The complete Enemy Targeting workflow, pinned Godot runtime, explicit creator confirmation, persistent completion, and safe reset remain available.

## Verification

```powershell
npm run check:v0.1
npm run check
npm run forge:v0.2
npm run forge:v0.1
```

- Focused compatibility: 37/37 tests passed.
- Full suite: 52/52 tests passed.
- Production build emitted `index.html`, `legacy.html`, and `v0.2.html`.
- Browser review passed at 1440×900, 768×900, and 390×844 with no horizontal overflow or console warnings/errors.
- Both Launchpad actions end at y=713 in the 1440×900 viewport; the desktop Project World action, Companion, and idea port remain visible without overlaps.
- The reduced-motion media rule is loaded in the production page and neutralizes animation/transition duration; focused tests guard the rule and all four Companion states.
- No fixture, quest runner, Godot runtime, demo workspace, quest loader, contract, verification, reset, or completion file changed.

## Truthful Task 2 boundary

- **Real:** isolated launch routing, Launchpad navigation, responsive workshop shell, local idea-field interaction, and the protected v0.1 backend and workflow.
- **Fixture:** sample preview, playable-state explanation, roadmap nodes and regions, Companion context, and recommended-quest presentation.
- **Unavailable in this shell:** real Enemy Targeting review/build/playtest integration, GPT-5.6 planning, blueprint contracts, starter creation, generated-project persistence, and sample visual art.

## Approved v0.2 scope

Required: Living Game Workshop Launchpad, redesigned sample shell, GPT-5.6 idea-to-blueprint planning, one controlled Top-down arena starter, real project creation, generated roadmap/documentation/Chronicle, and persistent new-project Project World.

Optional only after the required path is stable: generated-quest implementation, Side-scrolling platformer, Movement sandbox, and the sample visual-art pass.

## Still incomplete

- Sample-flow recomposition inside the new shell
- GPT-5.6 new-game intake and blueprint generation
- Top-down arena starter creation and verification
- Persistent generated-project World, roadmap, documentation, and Chronicle
- Final v0.2 hardening and real end-to-end rehearsal
- Existing submission packaging items: public video/links, primary `/feedback` ID, license, and optional replay decision

## Next bounded task

Task 3, after approval: connect the real prepared Enemy Targeting flow to the Living Game Workshop shell, preserving all current backend semantics and both fallback commands. Do not begin GPT planning, starter creation, or new-project persistence.

See [`PLAN.md`](PLAN.md), the [Task 2.1 review](docs/reviews/2026-07-13-v0.2-task-2-1-visual-hierarchy-review.md), and the [Task 2.1 closeout](docs/closeouts/2026-07-13-v0.2-task-2-1-visual-hierarchy-closeout.md).
