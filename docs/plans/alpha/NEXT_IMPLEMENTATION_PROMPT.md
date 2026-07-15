# Primary Implementation Prompt — Task A

Copy the prompt below into a new Codex task after the planning commit is reviewed and approved. Do not combine Task B.

---
Implement Forge Alpha Task A: one complete generated-quest implementation, verification, creator playtest, confirmation, completion, documentation, local Git, and restart loop.

## Starting point and safety

- Work from `main` checkpoint `1e734bf060ff3d17abcd45678a95e03d3690ba46` plus the reviewed planning commit at the tip of `planning/alpha-proof-game` (the commit containing `docs/plans/alpha/NEXT_IMPLEMENTATION_PROMPT.md`; resolve and record its SHA before branching).
- Create a separate worktree and a `codex/`-prefixed implementation branch. Do not work directly on `main`.
- Read the root `AGENTS.md`, `docs/REPOSITORY_GUIDE.md`, `docs/CHANGE_MAP.md`, `README.md`, `ROADMAP.md`, and the alpha [README](README.md), [roadmap](ALPHA_PROOF_GAME_ROADMAP.md), [architecture](ALPHA_ARCHITECTURE.md), [user journey](ALPHA_USER_JOURNEY.md), [proof game](PROOF_GAME_PLAN.md), and [UX review](UX_FRICTION_REVIEW.md). Then read only the relevant nested instructions, source owners, contracts, tests, and latest protecting closeouts.
- Verify `v0.2.0` still resolves to `08cffa71cd802b14c6c72ad343f9fa5b4007a482`. Do not move/recreate the tag.
- Preserve the sample Enemy Targeting semantics, immutable fixture, generated projects not selected for rehearsal, Task 7 evidence, public showcase source/content, and Task 8 behavior. Do not deploy or change repository visibility.
- Follow `PLAN → APPROVE → IMPLEMENT → REVIEW → DOCUMENT → COMPLETE`. Write a bounded Task A plan with criteria and stop for human approval before meaningful implementation.

## Goal

From a registered, clean, controlled Top-down Arena project, allow exactly one eligible generated quest to be adjusted, converted into a strict existing-file implementation contract, explicitly approved, implemented by the official Codex SDK, independently boundary/project/mechanic verified, visibly played, explicitly confirmed by the creator, atomically completed across all project records and local Git, and restored after process restart with the next eligible quest recommended.

Implement only this vertical slice. Stop after one real generated quest completes and all closeout evidence passes.

## Ownership

- Add `src/generated-quest-runner/AGENTS.md` and a sibling generated-quest-runner domain service. It owns contract preparation/fingerprinting, run journal/lock, focused context, SDK orchestration, progress, boundary review, proof aggregation, confirmation state, exact rollback, completion transaction, recovery, and generated-run evidence.
- `src/generated-project-world` remains the strict validated read snapshot plus its existing narrow selection/idea/launch actions. It may consume runner responses; do not turn its snapshot loader into a general mutation owner.
- `src/project-creation` keeps path allocation, starter creation, creation transaction, baseline Git, registry, and register-last ownership. Reuse only helpers whose invariants match.
- `src/quest-runner` keeps prepared Enemy Targeting semantics. Do not call its workflow/completion service for a generated project and do not weaken/hide its three-file, fixed-verifier, criteria, evidence, or completion assumptions. Extract only tiny stateless primitives with identical contracts and protected tests.
- `src/dashboard-host` owns exact same-origin HTTP/SSE/process adaptation, not durable generated state.
- `src/godot` owns pinned executable/process behavior and Forge-owned verification profiles.

## Required contracts and lifecycle

Implement strict versioned contracts equivalent to the alpha architecture:

- `GeneratedQuestImplementationContract`: project/quest/revision, player-visible outcome, why, current playable facts, bounded steps with logical editable file roles, exact Forge-resolved existing files and prehashes, excluded scope, acceptance criteria mapped to proof references, a registered Forge verification profile, creator play steps, risks/assumptions, and fingerprint.
- Forge—not the model/client—assigns run ID, canonical absolute project path, allowed-path resolution, commands, model/runtime configuration, timestamps, workflow state, and Git behavior.
- Durable plan states: `planned | available | blocked | deferred | completed` (provide a safe migration/compatibility adapter for current `locked | available | active | completed` projects rather than silently rewriting on read).
- Separate durable run journal phases: contract review, approved, implementing, verifying/failed, waiting for playtest, completion pending, completed/cancelled/interrupted. Do not overload roadmap state with transient process phases.

Every contract must be assembled from the accepted quest revision and verified starter/project facts. The model may propose wording/steps but never supplies paths, commands, verifier, Git, state, or runtime authority. Invalid/unsupported contracts fail before SDK invocation.

## File and capability boundary

- P0 is existing-file-only. Resolve starter-declared roles to one through four contained UTF-8 existing game source/scene files.
- No new, deleted, renamed, binary, symlink/junction/escape, absolute, or external file.
- Codex may not edit `.forge/**`, `.git/**`, `.godot/**`, `node_modules`, dependencies, imported cache/assets, executable/shell files, project registry, verifier source, or another project.
- Start only from the registered canonical direct-child project, expected baseline/HEAD, clean index/worktree, matching quest revision, and no active run.
- Capture the controlled inventory and hashes. After Codex, prove the exact tracked diff and reject every unapproved path/new/delete/rename before Godot verification.
- Disable network in the SDK. Use workspace-write rooted at the generated project. Forge runs all commands/Godot/Git outside the model.

## Focused context

Deterministically include only: accepted outcome/why, relevant verified current facts, bounded steps/exclusions/criteria, exact contents and hashes of the one-to-four allowed files, compact relevant scene/node summary, verification-profile observable contract, and Forge process/output rules. Cap the complete package at 40,000 UTF-8 characters. Never truncate; make an oversized quest ineligible. Exclude unrelated quests, full Chronicle/history, raw transcripts, secrets, other projects, and arbitrary files. Persist a sanitized context manifest and usage/latency, not hidden reasoning.

## Verification

Implement and display distinct proof layers:

1. **Boundary:** clean start HEAD, exact allowed diff, no new/delete/rename/escape/state/cache/dependency change, reviewed current hashes.
2. **Project health:** pinned Godot import/load, baseline controlled-starter verifier, required scripts/nodes, expected success markers.
3. **Mechanic:** a versioned Forge-owned verification profile outside Codex-editable paths. For the rehearsal, implement the smallest profile needed by the narrowed Gravity Tap first quest (`gravity_orb_presence_v1`) or, if a valid Signal Sweep project already exists, `relay_activation_v1`. Codex never edits the verifier that proves its work.

Codex's summary is not proof. Automated mechanic proof does not replace creator play.

## Creator actions and UI

In `GeneratedProjectWorld.tsx`, add outcome-first eligible quest behavior:

- Adjust (bounded outcome/scope edit, increments revision, invalidates old contract), Build, and Defer.
- Contract review with exact files, exclusions, proof, visible result, approve/back.
- Human-readable staged progress; raw terminal/model events only in technical disclosure.
- Separate Boundary, Project health, Mechanic, and Your playtest results.
- Play the real game; retain existing Open Folder. Add Open in Godot only after the core loop passes and only as the isolated project-ID action below.
- Confirmation choices: Worked, Did not work, Not ready, Retry, Cancel.
- Failure copy must say whether changes remain and whether exact rollback is safe.
- Completion card: visible outcome, changed files, proof, confirmation, Chronicle event, run ID, local Git short SHA, next eligible quest.
- Restart/recovery screen for inconsistent or incomplete runs; never optimistic completion.

Remove stale hard-coded quest counts/Task-number copy in the touched path and lead with plain outcomes rather than IDs/slugs. Keep static Companion read-only and label it Forge recommendation. Do not add chat.

Creator confirmation is mandatory. `Worked` is the only choice that may enter completion, and final proof must be rerun afterward. `Did not work`, `Not ready`, `Retry`, `Cancel`, verification failure, or host interruption never completes a quest.

## Rollback and recovery

Capture start HEAD, exact inventory/preimages/hashes, allowed paths, observed posthashes, run phase, proof, and confirmation. Automatic rollback may restore only paths touched during this run and only when each current hash still equals the recorded observed posthash. Use exact contained writes/preimages; never broad recursive deletion, `git clean`, hard reset, or unrelated checkout. P0 creates no file.

If an external/concurrent edit is detected, refuse automatic rollback and completion, preserve the project, name affected paths, and require explicit recovery. On restart, reload journal/lock/HEAD/status/hashes and resume only an unambiguous safe phase.

Cover invalid contract, SDK failure, unexpected tracked change, new file, deleted file, concurrent edit, Godot failure, creator failure/cancel/not-ready, commit failure, host interruption, and incomplete-run restart.

## Completion transaction and Git

After creator success: lock; revalidate HEAD/diff/contract; rerun all proof; build quest/roadmap/Chronicle/project/provenance/Markdown changes in memory; mark journal completion-preparing; capture state/doc preimages; atomically write exact tracked records; reload/cross-validate; stage the exact approved source + expected artifact manifest; verify staged-name equality; create one local commit `forge: complete <questId> [run:<runId>]`; then write ignored `.forge/local/runs/<runId>/commit.json` with actual SHA/tree/time; reload from a fresh service and validate commit/run linkage before returning completed.

Tracked artifacts reference run ID, not their own commit SHA. If commit fails, restore only transaction state/doc preimages, unstage exact manifest, retain the reviewed source diff, and expose retry/rollback. If commit succeeds but receipt write fails, recover the unique commit by run ID and repair the ignored receipt without another commit.

Update the quest, roadmap completion/unlocks, Chronicle `quest_completed`, deterministic project/roadmap/quest Markdown, project state/next recommendation, and implementation provenance in the same transaction. Initial approved blueprint and idea seeds remain unchanged. Failed/cancelled attempts remain run evidence, not Chronicle milestones.

## Host/API and optional editor action

Add exact project-ID/quest-ID routes for prepare/adjust/defer/approve/start/status-or-events/cancel/play/confirm/rollback. Enforce same origin on every mutation/action, exact bodies, safe IDs, and service-owned model/path/command/Git values. Do not accept raw path, command, model, verifier, allowed-file, Git, or arbitrary state values from the browser.

Only after the core generated completion acceptance suite and real rehearsal pass, optionally add `POST /api/projects/:projectId/editor` with empty body. Resolve registered canonical path and pinned executable server-side and launch fixed `--editor --path <canonicalProjectPath>` arguments with transient per-project state and bounded error copy. No caller arguments or project mutation. Cut it immediately if process-state work expands.

## Tests and review

Add focused contract/service/host/UI-source/recovery/completion tests plus malicious inputs and fault injection. At minimum test:

- schema/cross-reference/fingerprint/revision/profile rejection;
- traversal, symlink/junction, wrong project, dirty HEAD/index, active lock;
- unapproved tracked change, untracked new file, delete/rename, verifier/state/cache/dependency touch;
- SDK failure/cancel/interruption and sanitized progress/evidence;
- each verification layer and Codex-verifier separation;
- all confirmation outcomes;
- exact safe rollback and concurrent-edit refusal;
- every completion failure point, staged manifest, commit/receipt recovery, reload consistency;
- current generated project compatibility/migration;
- sample fixture byte/hash and all protected sample tests;
- creation/planner/world regressions; no showcase source changes.

Run the smallest tests during implementation, then `npm run context:check`, `npm run check`, `npm run check:v0.1`, production dashboard build, and `git diff --check`. Run showcase validation only as a read-only regression if shared root files change; do not edit showcase.

Run deterministic Edge browser review for quest brief, contract, active steps, each proof/failure, play, confirmation, completion, restart/recovery, desktop/tablet/mobile, keyboard/focus, reduced motion, console/network/layout issues. Preserve existing harness evidence patterns.

## Real rehearsal

Use the registered clean `gravity-tap-arena-6cbe7b2a54` project at baseline commit `7dbbbf43f206cd5334b226d6c9a98fbfcf0e10a8` when available. Narrow only its first available quest to the smallest existing-file orb-presence outcome that fits the profile. Do not mutate Last-Moment Pulse or any other project.

1. Record initial project inventory, hashes, clean Git/HEAD, registry/artifacts, sample hash, and tag.
2. Prepare and explicitly approve the contract through the real host/API/UI path.
3. Run the official SDK once with the approved bounded context.
4. Prove allowed diff and all three automated layers.
5. Launch visibly and stop for the creator to play and provide an exact confirmation through the real UI. Do not fabricate confirmation.
6. On success, complete/commit; start a fresh service/process; reopen and prove quest/roadmap/Chronicle/docs/Git/receipt/next recommendation.
7. Exercise at least one failed/cancelled run and exact rollback without losing the successful baseline/evidence.

If live Codex credentials/model are unavailable, deterministic tests may finish but the task is not complete. Report the blocker; do not substitute a fake success.

## Documentation and closeout

Record the approved Task A plan, handoff, review, closeout, sanitized evidence, AI work log, and exact commands/results. Update `PROJECT_STATUS.md` and `ROADMAP.md` only at actual milestone closeout, accurately separating what passed from what remains. Preserve Build Week provenance. Review the final diff against every criterion and unrelated changes.

## Non-goals and kill criteria

Do not implement Task B, free-form foundation UX, another starter, controlled new files, idea refinement/promotion, Companion chat, general context retrieval, Web export, publishing, showcase refresh, multiple generated quests, autonomous creator confirmation, or broad sample refactoring.

- If one real generated quest cannot complete/commit/reload by the end of the first major implementation day, stop secondary work and use `FALLBACK_IMPLEMENTATION_PROMPT.md`.
- If rollback or state/Git integrity is unreliable, do not expose Build and return to the released v0.2 path.
- If a new file seems required, narrow the quest.
- If editor launch threatens the core, cut it.

Stop after one real generated quest and one clean implementation commit. Report changed files, automated/manual evidence, remaining uncertainty, and the next bounded action. Do not start Task B.

---
