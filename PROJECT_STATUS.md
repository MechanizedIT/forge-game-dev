# Forge Project Status

**Last updated:** 2026-07-14

**Current milestone:** `v0.2 Task 3 — Real sample integration`

**Overall state:** `REVIEW` — the real Enemy Targeting path is implemented and has passed a creator-confirmed live rehearsal inside the Living Game Workshop, but required browser screenshots and responsive/console review remain blocked by the installed Browser plugin failing during initialization

## What works now

- Immutable tag `v0.1.0` still resolves to `99a439aff4425cc3572bd90eb2412ea89ff052ad`; refined fallback commit `4d276125aeb44d007cca96193daf9515fca2a99e` remains the recovery point.
- Development continues on `feature/v0.2-living-workshop`.
- `npm run forge` still opens the protected refined sample experience.
- `npm run forge:v0.1` still opens the direct legacy sample experience.
- `npm run forge:v0.2` opens the Living Game Workshop Launchpad.
- **Explore the sample game** now loads the real dashboard snapshot and artifacts rather than fixture sample data.
- Project World truthfully reflects fresh, preserved, in-progress, and completed workspaces; real Enemy Targeting availability/completion; Proof and Chronicle availability; and reset eligibility.
- Quest Forge presents the existing quest and exact prepared plan as: what changes, what Codex may change, and how Forge will prove it.
- Active Build calls the existing official SDK runner and renders the five real stages, elapsed time, locked files, and real run identity without fake percentages or logs.
- Playtest Gate renders the real diff/review evidence, launches the pinned Godot workspace, and requires one of the existing exact creator outcomes after the game closes.
- Final `PASS`, mint roadmap completion, Chronicle, and completion screen appear only after creator-confirmed success is persisted.
- Cancelled reset preserves progress; confirmed reset restores only the generated demo workspace.
- **Create a new game** and the idea composer remain honestly preview-only.

## Verification

- Full suite: 52/52 tests passed.
- Protected compatibility: 37/37 tests passed with a successful production build.
- Live official-SDK run `enemy-targeting-1784006264583` changed exactly `main.tscn`, `scripts/enemy.gd`, and `scripts/verify_fixture.gd`; unexpected files were zero.
- All five progress stages arrived in order. Repository checks and Godot verification passed.
- Godot `4.7.stable.official.5b4e0cb0f` launched. The creator explicitly reported `I SAW IT WORK`; final review became `PASS` only afterward.
- A fresh host reloaded completed roadmap and Chronicle state. Cancelled reset preserved completion; confirmed reset restored Enemy Targeting to available.
- Post-reset Godot verification emitted `FORGE_FIXTURE_VERIFY_OK player=Player enemy=Enemy baseline=idle controls=arrows+wasd`.
- `git diff --check` passed before documentation and is rerun at handoff.

## Remaining Task 3 validation

The installed in-app Browser plugin fails before opening a tab with `Cannot redefine property: process`. The requested eight screenshots, browser console review, and responsive checks at 1440×900, 768×900, and approximately 390×844 are not complete. CSS and focused tests cover the intended breakpoints and reduced-motion rule, but Forge does not claim those as visual evidence.

## Approved v0.2 scope still ahead

- GPT-5.6 focused new-game intake and Top-down arena blueprint generation
- One controlled Top-down arena starter, verification, and project creation
- Persistent generated-project World, roadmap, documentation, project state, and Chronicle
- Required end-to-end hardening after both paths exist

Optional only afterward: generated-quest implementation, Side-scrolling platformer, Movement sandbox, and the sample visual-art pass.

## Next bounded task

Restore the supported browser-review connection and complete Task 3’s real-state screenshots, console review, responsive review, and reduced-motion inspection. If those pass, promote the Task 3 review and closeout to complete. Do not begin Task 4 first.

See the [Task 3 handoff](docs/handoffs/2026-07-14-v0.2-task-3-sample-integration.md), [review](docs/reviews/2026-07-14-v0.2-task-3-sample-integration-review.md), [closeout](docs/closeouts/2026-07-14-v0.2-task-3-sample-integration-closeout.md), and [live evidence](docs/evidence/2026-07-14-v0.2-task-3-live.json).
