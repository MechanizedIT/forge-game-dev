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
- [ ] Create the smallest playable Godot sample project.
- [ ] Add a prepared **Enemy Targeting** quest and acceptance criteria.
- [ ] Implement focused plan, build, and closeout skills.
- [ ] Invoke Codex against the sample project's working directory.
- [ ] Capture structured events, diff, commands, checks, and handoffs.
- [ ] Run pinned Godot headless verification.

**Exit:** One command can plan, implement, verify, and record the quest without the dashboard.

### Milestone 2 — Connect the dashboard

- [ ] Create the visual roadmap with locked, available, active, and completed states.
- [ ] Add the persistent in-app companion.
- [ ] Show selected quest purpose, plan, acceptance criteria, and actions.
- [ ] Support **Build with Codex**, **Refine plan**, and a contextual prompt field.
- [ ] Connect the interface to the real quest workflow.

**Exit:** The prepared quest can be approved and started from the user interface.

### Milestone 3 — Make progress understandable

- [ ] Translate Codex events into creator-friendly stage updates.
- [ ] Keep raw commands and logs behind progressive disclosure.
- [ ] Add clear approval, retry, failure, and uncertainty states.
- [ ] Show verification evidence and changed files in the outcome.

**Exit:** A non-expert can tell what Forge is doing, why, and whether it worked.

### Milestone 4 — Complete the playable loop

- [ ] Launch the changed game with the pinned Godot binary.
- [ ] Demonstrate enemy idle, detection, and chase behavior.
- [ ] Persist quest and roadmap state across restart.
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

- [ ] Verify the single-command launch path on a clean Windows environment.
- [ ] Pin or checksum the portable Godot download.
- [ ] Provide an offline or replay fallback for the core demonstration.
- [ ] Replace README mockups and placeholder links.
- [ ] Record a public demo video under three minutes.
- [ ] Preserve the primary Codex `/feedback` session ID.
- [ ] Run the exact judge path repeatedly and fix reliability issues.

**Exit:** Every submission link works, the repository is understandable, and the golden path is repeatable within a few minutes.

## Prepared quests

1. **Enemy Targeting** — required golden path.
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

Workflow state: `PLAN`; implementation approval pending. The proposed task is to build the pinned Godot acquisition boundary and repeatable baseline fixture. See [`docs/plans/2026-07-13-godot-baseline-fixture.md`](docs/plans/2026-07-13-godot-baseline-fixture.md). Do not add Enemy Targeting yet.
