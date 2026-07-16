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

- [x] Show one explicit Top-down Arena interpretation with fit, tradeoffs, alternatives, revise, and reject instead of silently coercing the idea.
- [x] Separate immutable approved-blueprint provenance from a fingerprinted accepted roadmap that labels starter facts and planned deltas.
- [x] Support bounded roadmap title/outcome, optional-delta, removal, and dependency-safe reorder decisions before creation.
- [x] Persist new projects directly with truthful v2 roadmap/quest artifacts while keeping existing generated projects read-only and compatible.
- [x] Register one Forge-owned `relay_activation_v1` profile so fresh Signal Sweep Quest 1 is genuinely eligible under the Task A boundary.
- [x] Rehearse live Signal Sweep planning and controlled creation, reopen it, and inspect the exact first contract without running Codex or claiming completion.

**Status:** `COMPLETE`. The creator-gated rerun preserved the three-turn live planning record, accepted the supported interpretation and roadmap, created and registered Signal Sweep, passed pinned Godot and clean local Git checks, survived a full Forge restart, reopened Project World, and prepared the exact three-existing-file relay contract. The contract remains unapproved in `contract_review`; no SDK build, gameplay proof, or quest completion occurred. The creator-approved plan is recorded in
[`docs/plans/2026-07-14-alpha-task-b-starter-aware-planning.md`](docs/plans/2026-07-14-alpha-task-b-starter-aware-planning.md).

**Exit:** One fresh idea has an honestly supported interpretation, an explicitly accepted non-duplicative roadmap, and one clean created project whose first quest has a registered existing-file contract. Real relay implementation and completion remain a separate creator-gated proof run.

#### Alpha Pivot Milestone 1 — Open Project Model

- [x] Add one strict product-facing `Project → Systems → Quests → Work Sessions → Results` read model where broad systems can wait for quest refinement, with system-or-quest focus and ordered history links.
- [x] Project every validated v1/v2 generated project into one deterministic `First Playable` compatibility system without rewriting project files.
- [x] Add runner-owned read-only listing for every validated project session, including stable run IDs and timestamps.
- [x] Keep verification profiles as optional descriptive extra proof only; they do not decide model validity, dependency readiness, quest status, or system status.
- [x] Reopen real Gravity Tap and Signal Sweep records without changing project, run, lock, registry, or Git state.
- [x] Preserve the current UI and Task A runner through deprecated compatibility transport.

**Status:** `COMPLETE`. Arbitrary Godot systems and quests are now representable in the new product model. A planned system may exist before it has quests, and focus may stay on that system until refinement. Legacy flat roadmaps reopen as one truthful `system-first-playable` system with exact quest, session, result, history, and focus links.

**Truth boundary:** Generic profile-free Codex execution is not complete. The existing generated runner still uses Task A/Task B profile gates only as compatibility execution policy. Removing those gates requires a separate owner-approved runner milestone.

**Exit:** Generated Project World exposes the open hierarchy, both real compatibility projects reopen read-only, and the protected runner and UI behavior still pass.

#### Alpha Pivot Milestone 2 — Profile-free Work Sessions

- [x] Let an available quest prepare from one to four creator-approved existing or expected-new Godot text files without a verification profile.
- [x] Keep exact v1 Gravity Tap and Signal Sweep contracts, fingerprints, prompts, proof, histories, and reload behavior.
- [x] Run exact file-boundary review and fixed pinned-Godot project health for every new work session; record missing optional mechanic proof as `not_run`.
- [x] Pause in `scope_review` when Codex asks for undeclared files without changing authority.
- [x] Restore approved existing bytes and delete only unchanged run-owned approved new files after an all-path safety check.
- [x] Prove approval, execution, play, creator confirmation, completion, one local Git receipt, restart reload, and exact undo with the test-owned welcome beacon.

**Status:** `COMPLETE`. Creator-approved file scope now grants permission. Profiles add optional proof only. The existing runner remains the single execution path, and the current UI only gained the small wording needed to show existing/new files, no extra proof, and scope review.

**Truth boundary:** Forge does not yet create or edit work orders through conversation or a file picker. The alpha proof uses a test-owned work order. External project import, broad scanning, non-Godot engines, and the new workspace shell remain separate milestones.

**Exit:** The profile-free temporary project completes and undoes safely; all full and protected checks pass; live Gravity Tap and Signal Sweep read audits are byte-identical.

#### Alpha Pivot Milestone 3 — Connected Workspace Shell

- [x] Keep one project shell mounted around Roadmap, History, Project files, quest review, and work sessions.
- [x] Show systems and quests from the open Project Model, including honest systems with no quests.
- [x] Give the selected system or quest one short Forgie recommendation and one next action.
- [x] Add a slim Workbench Dock with Play Game, Open Folder, and Toolbox only.
- [x] Keep exact contract approval, active-work safety, proof, play confirmation, completion, reload, and rollback behavior unchanged.
- [x] Prove desktop, tablet, phone, keyboard focus, reduced motion, controlled failures, exact pre-approval, and active-work locks in temporary browser data.

**Status:** `COMPLETE`. Opening a generated project now enters one connected workspace. The main view is the system roadmap. History, project files, quest details, Forgie guidance, Play, Open Folder, and Toolbox stay in the same shell. Any active work session focuses its real quest and locks Play plus navigation while safe folder access remains available.

**Truth boundary:** This milestone is presentation only. It adds no new service, endpoint, runner, integration, project schema, tool permission, capability, supported game type, or profile gate. Toolbox lists only the two existing actions.

**Exit:** Focused and full checks pass, both browser suites pass, and live Gravity Tap plus Signal Sweep remain byte-identical after read-only reload.

#### Alpha Pivot Milestone 4 — Open Idea to System Roadmap

- [x] Start inside an existing Forge-owned Godot workspace and accept a free-form creator idea.
- [x] Ask at most one round of three essential questions, then propose three to six broad systems.
- [x] Let the creator repeatedly revise or exactly accept the complete roadmap.
- [x] Persist accepted systems in one fixed Forge planning record while allowing systems with no quests.
- [x] Preserve every quest, work session, result, history link, focus rule, runner boundary, and legacy read path.
- [x] Prove safe failure, retry, cancellation, reload, responsive screens, exact Git status, and whole-project bytes with temporary copies.

**Status:** `COMPLETE`. Any ordinary Godot game idea can become a visual system roadmap. Profiles, capabilities, starters, templates, and game types do not grant permission. The creator accepts one exact proposal, and Forge writes only `.forge/system-roadmap.json`.

**Truth boundary:** This milestone shapes broad systems only. It does not invent quests, choose implementation files, prepare work orders, touch Godot files, or start Codex work.

**Exit:** Focused, full, protected, build, context, and three browser suites pass. Live Gravity Tap and Signal Sweep remain byte-identical after read-only reload.

#### Alpha Pivot Milestone 5 — System to Quests and Work Order

- [x] Open one broad system and discuss its player-facing outcome in ordinary language.
- [x] Ask at most one essential clarification round, then propose up to five ordered quests with visible outcomes.
- [x] Let the creator revise or exactly accept the quest list without a mechanic type, capability, profile, starter, or template gate.
- [x] Persist accepted quests under the selected system in one fixed Forge planning record.
- [x] Offer a bounded chooser for safe existing and expected-new Godot text files inside the canonical project.
- [x] Save the first quest's exact one-to-four-file work-order draft only after explicit creator review, then stop before runner contract preparation.
- [x] Prove restart resume, stale-state rejection, active-work locks, safe cancellation, responsive screens, and unchanged Godot bytes with temporary projects.

**Status:** `COMPLETE`. A creator can refine one broad system into a short quest list, revise it, accept it, and review the first quest's exact file scope. Forge saves only `.forge/system-quests.json`; it does not prepare a runner contract or start an agent in this milestone.

**Truth boundary:** The work order is a planning draft, not file authority. The existing profile-free runner still owns contract preparation, exact approval, execution, proof, play confirmation, completion, Git evidence, reload, and undo. The full creator rehearsal that joins these paths is separate.

**Exit:** Focused, full, protected, build, context, and temporary browser checks pass. Live Gravity Tap and Signal Sweep remain byte-identical after read-only reload.

#### Alpha Pivot Milestone 6 — Genuine Creator Rehearsal

- [x] Join free-form game ideas, broad systems, small quests, file choice, and the existing profile-free runner in one connected path.
- [x] Replace main creator-facing engineering words with **work plan**, **files Codex may change**, **Confirm this plan**, **Send to Codex**, and short pencil-button tooltips.
- [x] Recheck the exact saved planning bytes before work starts and throughout completion without turning planning records or profiles into permission.
- [x] Prove safe launch gating, changed-plan rejection, failed-save recovery, exact undo, one-commit repair, reload, and older-project compatibility with temporary projects.
- [x] Pass the full, protected, build, context, and five temporary browser suites.
- [x] Repair live system and quest suggestions for the current Codex response shape, keep strict checks, and show a friendly retry message instead of raw service errors.
- [x] Receive the owner's personal **Worked** choice after visible play in the named isolated project.
- [x] Make the one authorized local milestone commit after that owner choice.

**Status:** `COMPLETE`. The owner played the isolated Godot game, saw the promised welcome beacon, and chose **Worked**. Completion reloaded successfully and the authorized local milestone commit was created.

**Truth rule:** A successful launch or closed game is not success. Only the creator's visible **Worked** choice may save completion. Gravity Tap and Signal Sweep remain read only.

**Exit:** The isolated owner rehearsal completes, reloads, and records one local commit for the Forge milestone. No push, pull request, merge, deploy, remote, tag, or release change occurs.

#### Alpha Milestone 7 — Open Project and Repeatable Quest Loop

- [x] Replace the active new-game ceremony with project name → neutral runnable Godot workspace → Project World.
- [x] Create the neutral workspace without a Codex planning call, game-type fit, starter chooser, capability, or verification-profile gate.
- [x] Keep staged creation, containment, pinned Godot verification, clean local Git, registry-last persistence, restart reopen, and old-project compatibility.
- [x] Let every available accepted native quest receive its own creator-confirmed one-to-four-file work plan.
- [x] Reuse the existing profile-free runner, scope pause, proof, play, **Worked**, completion, reload, and undo path.
- [x] Prove empty-roadmap reopen, real Godot 4.7 creation, a real clean Git baseline, dependency unlock, second-quest scoping, full tests, protected tests, build, and context checks.

**Status:** `COMPLETE`. A creator can create a neutral Godot project first, describe any simple idea inside the existing open roadmap flow, refine systems into quests, and repeat the safe quest loop. Project creation itself uses zero Codex planning turns. Each later planning or work step stays small and creator-triggered.

**Truth boundary:** Forge still owns the project location and supports Godot only. It does not import arbitrary projects, scan broadly, choose files automatically, create art, export a finished game, or run quests autonomously.

**Exit:** A temporary real project passed pinned Godot 4.7 and clean local Git creation. The full suite passes 166/166, protected v0.1 passes 38/38 with the production build, and the open project plus repeatable work-order checks pass.

#### Alpha Milestone 8 — Clear Quest Handoff and Reliable Worked Completion

- [x] Show every saved quest after system refinement and mark the next available quest as recommended.
- [x] Carry the exact quest title, visible outcome, and done-when checks into file preparation.
- [x] Suggest a small editable starting set from validated Godot files without another Codex turn or broader scan.
- [x] Release transient quest-planning ownership when the creator leaves, while reconstructing saved quests and confirmed work orders later.
- [x] Fix native **Worked** completion when finalized project state already differs from the Git index, including hidden local-state paths.
- [x] Preserve exact completion-manifest equality, rollback, one commit, receipt, restart, protected sample behavior, and the four-file maximum.

**Status:** `COMPLETE`. System refinement now ends with a visible quest list and one recommended next action. File preparation is explicitly about one named quest and starts with editable local recommendations. Leaving the chooser no longer blocks another system. Native completion compares deterministic records with the Git index, so the already-final project-state file is expected and committed instead of causing a false stopped result.

**Truth boundary:** File suggestions are convenience only. They do not grant authority, call Codex, inspect beyond the existing bounded candidate list, or bypass the creator's exact work-plan review.

**Exit:** Full tests pass 167/167, protected v0.1 passes 38/38 with the production build, context validation passes, the native hidden-state completion regression commits and reloads, and the nine-state Edge review switches systems and returns with zero issues. The owner then completed the repaired obstacle quest and passed the full restart/reopen/status/History/next-quest/game-launch check.

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

Alpha Milestone 8 is complete. Its closeout preserves the neutral new-project path,
repeatable quest loop, clearer quest handoff, and reliable **Worked** completion. Choose the next bounded milestone before implementation; the
roadmap deliberately does not authorize a successor yet. Submission actions remain
owner-controlled: review public copy, supply the demo/live/Devpost URLs, select a
license, deploy the static site, and push or submit only when authorized.
