# Forge Project Status

**Last updated:** 2026-07-14

**Current milestone:** `v0.2 Task 5 — Controlled Top-down Arena Project Creation and Persistence`

**Overall state:** `COMPLETE` — Forge can turn an approved, current blueprint into one verified, Git-baselined Top-down Arena project and rediscover it after restart. Rendering the generated project inside Project World remains Task 6.

## What works now

- Immutable tag `v0.1.0` still resolves to `99a439aff4425cc3572bd90eb2412ea89ff052ad`; refined fallback commit `4d276125aeb44d007cca96193daf9515fca2a99e` remains the recovery point.
- Development continues on `feature/v0.2-living-workshop`; `npm run forge` and `npm run forge:v0.1` keep the protected sample experience, while `npm run forge:v0.2` opens the Living Game Workshop.
- The complete sample journey still supports approval, official-SDK implementation, understandable progress, automated proof, Godot play, explicit creator confirmation, persistent completion, restart, and reset.
- **Create a new game** produces a validated GPT-5.6 Top-down Arena blueprint and requires a separate, exact final filesystem confirmation before creation.
- Forge—not GPT—allocates a direct child of its managed projects root, copies the versioned controlled starter inventory, writes strict project records, and reloads every artifact before promotion.
- Creation reports the seven required honest stages: validating the blueprint, preparing the workspace, assembling the starter, writing project records, checking Godot, creating the baseline, and registering the project.
- The pinned Godot 4.7 verifier checks the main scene, player, inputs, movement, objective, scripts, and external-resource boundary with a stable success marker.
- Forge creates exactly one clean local Git baseline commit with a local identity and no remotes, then registers the project last through an atomic registry.
- Restart discovery, recent-project summaries, reopen, and folder opening work. Reopened projects truthfully report `Created · Project World integration pending`.
- Cancellation and failures preserve sanitized evidence and remove only Forge-owned staging or final paths after canonical path and symlink checks.

## Task 5 evidence

- `npm run check` passes 79/79 tests; `npm run check:v0.1` passes the production build and all 37 protected compatibility tests.
- The real rehearsal planned and created **Last-Moment Pulse** as project `last-moment-pulse-6631032087`, wrote 32 controlled files, and produced clean Git commit `9f73f5040bac9b67e806a56129170a150c139637` with no remotes.
- Pinned Godot `4.7.stable.official.5b4e0cb0f` emitted the exact Forge success marker, and a separate visible launch ran for 120 frames and exited successfully.
- A fresh service instance found and reopened the project without regeneration. The committed sample hash remained unchanged before and after creation.
- Edge `150.0.4078.65` reviewed confirmation, progress, Godot verification, created desktop/tablet/mobile states, reduced motion, recent/reopen, and controlled failure with no console, network, overflow, focus, action, or overlap issues.
- The model supplied blueprint content only; it supplied no destination paths, commands, arbitrary files, source code, or verification commands.

The installed in-app Browser plugin still fails before tab creation with `Cannot redefine property: process`. The repeatable fallback is the pinned project-local `@playwright/test` `1.61.1` harness, with reports and screenshots in the Task 5 browser evidence.

## Required v0.2 scope still ahead

- Generated-project Project World loading for the persisted roadmap, quest briefs, playable-state summary, documentation, Chronicle, selection state, and idea seed
- Required end-to-end hardening after both complete paths exist

Optional only afterward: generated-quest implementation, Side-scrolling platformer, Movement sandbox, and the sample visual-art pass.

## Next bounded task

Stop for approval. Task 6 may connect the created project to Project World using its existing authoritative artifacts. It must not regenerate the project, mutate the controlled starter, begin generated-quest Codex implementation, or add another starter.

See the [Task 5 handoff](docs/handoffs/2026-07-14-v0.2-task-5-project-creation.md), [review](docs/reviews/2026-07-14-v0.2-task-5-project-creation-review.md), [closeout](docs/closeouts/2026-07-14-v0.2-task-5-project-creation-closeout.md), [real creation evidence](docs/evidence/2026-07-14-v0.2-task-5-real-project-creation.json), and [browser evidence](docs/evidence/2026-07-14-v0.2-task-5-browser-review/README.md).
