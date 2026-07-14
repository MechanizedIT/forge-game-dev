# Forge Build Week Roadmap

## Objective

Deliver a judge-ready prototype that proves this claim:

> Forge turns game development with Codex into a guided series of understandable, verifiable quests, so creators stay in control while seeing their game visibly improve.

## Definition of done

A judge can install Forge with minimal steps, open the bundled example project, select **Enemy Targeting**, approve its plan, let Codex implement it, see verification pass, play the changed game, and return to a roadmap that celebrates and remembers the completed quest.

## Shortest path

### Milestone 0 — Freeze the contract

- [x] Create lean judge-facing repository documents.
- [x] Record the initial commit SHA in `BUILD_WEEK_BASELINE.md`.
- [x] Define project, roadmap, quest, plan, handoff, review, and work-log templates.
- [x] Separate required work from stretch goals.

**Exit:** Codex can identify the first bounded implementation task without loading the prior Forge repository.

Architecture, sequencing, exact first-task acceptance criteria, and approval decisions are recorded in [`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md).

### Milestone 1 — Prove one quest from the command line

- [x] Scaffold strict typed contracts and validate the prepared examples.
- [x] Create the smallest playable Godot sample project.
- [x] Add configured Godot 4.7 fixture verification and resettable workspace behavior.
- [x] Add a prepared **Enemy Targeting** quest and acceptance criteria.
- [ ] Implement focused plan, build, and closeout skills.
- [x] Invoke Codex against the sample project's working directory.
- [x] Capture structured events, diff, commands, checks, and handoffs.
- [x] Run pinned Godot headless verification.

**Exit:** One command can plan, implement, verify, and record the quest without the dashboard.

### Milestone 2 — Connect the dashboard

- [x] Create a frontend prototype of the visual roadmap with available, planned, active, and completed states.
- [x] Add the Forge Companion across the five prototype states.
- [x] Show selected quest purpose, plan, acceptance criteria, scope, proof, and actions in the prototype.
- [x] Support **Build with Codex** through the existing approval and runner boundary.
- [ ] Support **Refine plan** and a contextual prompt field.
- [x] Connect the interface to the real quest workflow.

**Exit:** The prepared quest can be approved and started from the user interface.

### Milestone 3 — Make progress understandable

- [x] Translate Codex events into creator-friendly stage updates.
- [x] Keep raw commands and logs behind progressive disclosure.
- [ ] Add clear approval, retry, failure, and uncertainty states.
- [x] Show verification evidence and changed files in the outcome.

**Exit:** A non-expert can tell what Forge is doing, why, and whether it worked.

### Milestone 4 — Complete the playable loop

- [x] Launch the changed game with the pinned Godot binary.
- [x] Demonstrate enemy idle, detection, and chase behavior.
- [x] Persist quest and roadmap state across restart.
- [x] Complete one real dashboard run with genuine creator confirmation.
- [ ] Add a roadmap pulse, companion state change, completion sound, and concise **Quest Complete** card.
- [ ] Unlock or recommend the next quest.

**Exit:** The judge sees a tangible gameplay result and satisfying persistent progression.

### Milestone 5 — Add the second proof path

- [ ] Accept a small gameplay idea in plain language.
- [ ] Clarify the intended visible outcome.
- [ ] Create a new roadmap node and bounded quest.
- [ ] Generate a reviewable plan and acceptance criteria.

**Exit:** Forge proves that it can structure a new idea, even if only the prepared quest is fully hardened for live implementation.

### Milestone 6 — Package for judging

- [x] Verify the documented repository setup and launch path in an isolated clean Windows checkout.
- [x] Complete one end-to-end dashboard rehearsal on the development Windows machine.
- [x] Pin and checksum the portable Godot download.
- [ ] Provide an offline or replay fallback for the core demonstration.
- [x] Replace README mockups and placeholder links with real screenshots and honest pending-submission labels.
- [ ] Record a public demo video under three minutes.
- [ ] Preserve the primary Codex `/feedback` session ID.
- [x] Run the exact judge path repeatedly and fix reliability issues.

**Exit:** Every submission link works, the repository is understandable, and the golden path is repeatable within a few minutes.

### v0.1.0 — Day 1 Judge-Ready Golden Path

- [x] Preserve the clean-install, real-dashboard, automated-proof, creator-confirmation, persistence, and reset path as the official Day 1 checkpoint.
- [x] Record remaining submission work and known platform limitations without expanding product scope.

**Checkpoint:** The working judge path is frozen at `v0.1.0`. Further work begins from this known-good baseline and must not weaken its proof or replay guarantees.

### v0.1.0 — First-time judge usability refinement

- [x] Explain Forge and the review → approve → build → verify → play path on first launch.
- [x] Make **Review Enemy Targeting** the unmistakable start action.
- [x] Explain preserved available, in-progress, and completed demo workspaces plus the exact reset command.
- [x] Add confirmed **Start fresh demo** through the existing safe reset behavior.
- [x] Disable Proof and Chronicle until real evidence exists.
- [x] Make current/completed progress, elapsed time, and several-minute reassurance dominant during Codex work.
- [x] Support and verify arrow-key plus WASD movement and show exact play instructions.
- [ ] Perform one manual narrow-window visual pass; desktop browser review is complete.

**Checkpoint:** The focused usability work is implemented without a new workflow, state owner, or product capability. Review evidence records the one remaining narrow-window presentation check.

### v0.2 — Living Game Workshop

#### Task 1 — Protect the v0.1 baseline

- [x] Confirm immutable tag `v0.1.0` and refined fallback commit `4d27612`.
- [x] Create `feature/v0.2-living-workshop` from the refined fallback.
- [x] Preserve the current sample component behind `npm run forge:v0.1` and `/legacy.html`.
- [x] Keep `npm run forge` pointed at the existing experience.
- [x] Add `npm run check:v0.1` for the protected compatibility boundary.
- [x] Pass 37 focused compatibility tests, 49 full tests, production build, legacy HTTP smoke, and real Godot verification.
- [x] Confirm no fixture, runner, verification, reset, completion, or sample-workspace behavior changed.

**Exit:** The golden sample remains independently launchable and measurable before v0.2 interface work begins.

#### Required v0.2 path

- [x] Build the Launchpad and Project World shell with fixture data.
- [x] Refine Task 2 visual hierarchy, roadmap semantics, game preview, Companion placement, and responsive progression.
- [ ] Reframe the real sample flow inside the Living Game Workshop without changing backend semantics.
- [ ] Add focused GPT-5.6 idea intake and Top-down arena blueprint generation.
- [ ] Create and verify one real Top-down arena starter project.
- [ ] Persist and reopen the generated roadmap, documentation, project state, and Chronicle.
- [ ] Harden and rehearse both required paths end to end.

#### Optional after required rehearsal

- [ ] Apply the bounded sample visual-art pass.
- [ ] Plan generated-quest Codex implementation as a separate task.
- [ ] Add Side-scrolling platformer or Movement sandbox one at a time.

**Scope:** The required starter is Top-down arena only. Do not build a generalized template framework or the other starters before the required experience works and has been rehearsed.

## Prepared quests

1. **Enemy Targeting** — required golden path; the CLI and dashboard can implement, verify, launch, collect explicit creator confirmation, and persist completion in the per-user workspace.
2. **Player Dash** — roadmap choice; implementation is optional until the golden path is complete.
3. **Damage Feedback** — roadmap choice and candidate for the new-quest planning demonstration.

## Stretch goals

- Literal operating-system always-on-top companion
- Automated broad repository discovery
- Additional engines or sample projects
- Rich companion animation system
- Hosted remote execution
- General-purpose skill marketplace

Stretch work must not begin until the required judge path is reliable.

## First bounded implementation task — complete

Scaffold the minimal repository structure and typed contracts for the project manifest, roadmap, quest, implementation plan, implementation handoff, review result, and AI work-log entry. Do not implement the dashboard or Godot integration in this task.

Acceptance criteria:

- Each contract is small, documented, and validated.
- The prepared Enemy Targeting quest can be represented without optional infrastructure.
- Workflow states match `PLAN → APPROVE → IMPLEMENT → REVIEW → DOCUMENT → COMPLETE`.
- Required and stretch fields are clearly separated.
- Example data loads in an automated test.
- `docs/AI_WORK_LOG.md` records the work and verification.

Workflow state: `COMPLETE`. Evidence is recorded in the [review result](docs/reviews/2026-07-13-contract-layer-review.md) and [closeout artifact](docs/closeouts/2026-07-13-contract-layer-closeout.md).

## Next bounded task

Task 3 from [`PLAN.md`](PLAN.md), after explicit approval: reframe the real sample Enemy Targeting journey inside the Living Game Workshop shell without changing backend semantics. Connect the prepared roadmap, Quest Forge, Active Build, Playtest Gate, completion, Proof, Chronicle, and reset states; keep `npm run forge` and `npm run forge:v0.1` available throughout the task. Do not begin GPT planning, blueprint contracts, starter creation, or new-project persistence.
