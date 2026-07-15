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
- [x] Reframe and browser-review the real sample flow inside the Living Game Workshop without changing backend semantics.
- [x] Add focused GPT-5.6 idea intake and Top-down arena blueprint generation.
- [x] Create and verify one real Top-down arena starter project.
- [x] Persist and reopen the generated roadmap, documentation, project state, Chronicle, and derived idea activity.
- [x] Harden and rehearse both required paths end to end, including creator-confirmed sample play, default v0.2 promotion, compatibility, browser, reset, generated-project cleanliness, and clean-clone gates.

#### Optional after required rehearsal

- [ ] Apply the bounded sample visual-art pass.
- [ ] Plan generated-quest Codex implementation as a separate task.
- [ ] Add Side-scrolling platformer or Movement sandbox one at a time.

**Scope:** The required starter is Top-down arena only. Do not build a generalized template framework or the other starters before the required experience works and has been rehearsed.

#### Task 8 — Public Showcase, Guided Walkthrough, and Submission Landing Page

- [x] Add an isolated static showcase driven by typed release, link, tour, walkthrough, evidence, proof, capability, limitation, and vision content.
- [x] Explain Forge to non-programmers through the problem, method, interface tour, two verified workflow replays, current/future boundary, architecture, proof, and local-use path.
- [x] Reuse inspected Task 7 application states with public provenance and keep generated/code-native illustration visibly separate from evidence.
- [x] Add static build, content/privacy validation, optional public-link states, performance budgets, and Vercel/generic-host readiness without deployment.
- [x] Pass Edge review at desktop, tablet, mobile, deep-link, keyboard, focus, dialog, and reduced-motion states without importing operational Forge code.

**Exit:** Judges have a deploy-ready, no-install explanation and guided replay while the full Forge application, v0.2 release tag, local safety boundaries, and Task 7 evidence remain unchanged.

#### Alpha Task A — Generated Quest Completion Loop

- [x] Add a sibling generated-project runner with an exact fingerprinted implementation contract and a maximum four-existing-file boundary.
- [x] Govern execution with registered canonical projects, clean expected local Git, no remotes, official SDK workspace restrictions, durable journaling, cancellation, and restart recovery.
- [x] Separate boundary, project-health, mechanic, and creator proof; require visible play and explicit creator success before completion.
- [x] Restore only run-owned exact preimages after safe failure and refuse rollback over concurrent edits.
- [x] Atomically reconcile quest, roadmap, Chronicle, deterministic records, project state, provenance, completion Git commit, and ignored actual-SHA receipt.
- [x] Complete Gravity Tap Arena Quest 1 through a real official SDK run, creator-selected **Worked**, fresh-service reload, and full host restart.
- [x] Preserve the sample runner, unrelated generated projects, showcase, and protected `v0.2.0` tag.

**Exit:** One prepared generated quest now completes as a bounded, verified, creator-gated transaction. This alpha branch is not the `v0.2.0` release, supports only the prepared existing-file contract, and does not include Task B's starter-aware fresh-intake work.

#### Alpha Task B — Honest Starter-Aware Intake and Roadmap Review

- [ ] Show one explicit Top-down Arena interpretation with fit, tradeoffs, alternatives, revise, and reject instead of silently coercing the idea.
- [ ] Separate immutable approved-blueprint provenance from a fingerprinted accepted roadmap that labels starter facts and planned deltas.
- [ ] Support bounded roadmap title/outcome, optional-delta, removal, and dependency-safe reorder decisions before creation.
- [ ] Persist new projects directly with truthful v2 roadmap/quest artifacts while keeping existing generated projects read-only and compatible.
- [ ] Register one Forge-owned `relay_activation_v1` profile so fresh Signal Sweep Quest 1 is genuinely eligible under the Task A boundary.
- [ ] Rehearse live Signal Sweep planning and controlled creation, reopen it, and inspect the exact first contract without running Codex or claiming completion.

**Status:** `APPROVED / IMPLEMENTATION READY`. The creator-approved plan is recorded in
[`docs/plans/2026-07-14-alpha-task-b-starter-aware-planning.md`](docs/plans/2026-07-14-alpha-task-b-starter-aware-planning.md).

**Exit:** One fresh idea has an honestly supported interpretation, an explicitly accepted non-duplicative roadmap, and one clean created project whose first quest has a registered existing-file contract. Real relay implementation and completion remain a separate creator-gated proof run.

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

Alpha Task A is merged into `main`. Task B's approved implementation plan is the next
bounded action. Submission actions remain
owner-controlled: review public copy, supply the demo/live/Devpost URLs, select a
license, deploy the static site, and push or submit only when authorized.
