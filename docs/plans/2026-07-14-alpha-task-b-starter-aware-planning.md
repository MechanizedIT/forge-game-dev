# Forge Alpha Task B — Approved Implementation Plan

- **Workflow state:** `APPROVE`
- **Approval:** Approved by the creator on 2026-07-14
- **Branch:** `codex/alpha-task-b-starter-aware-planning`

## Outcome

Turn one ordinary-language game idea into an honest Top-down Arena interpretation,
an explicitly accepted starter-aware roadmap, and one clean generated project whose
first quest is a real delta from verified starter behavior and is eligible for the
existing bounded generated-quest loop.

Task B ends after a fresh **Signal Sweep** plan is accepted, created, reopened, and
its first exact implementation contract is prepared and inspected. It does not run
Codex against Signal Sweep, claim the relay works, complete a generated quest, or
perform submission work.

## Current evidence and discovered constraint

- Task A is merged into `main` at `5918d227` and its real Gravity Tap completion,
  rollback, restart, and protected-boundary evidence passed.
- The current planner silently fixes every result to the Top-down Arena foundation
  but has no explicit fit, tradeoff, or alternatives contract.
- Project creation writes blueprint-global v1 quest/roadmap artifacts, so new plans
  can repeat movement, arena, camera, or objective-marker behavior already supplied
  by the controlled starter.
- The generated runner currently supports only the prepared
  `gravity_orb_presence_v1` profile and hard-codes Gravity-specific eligibility,
  contract, context, proof, adjustment, and UI language.
- The focused Task B baseline is green: 46/46 planner, contract, creation,
  generated-world, generated-runner, and dashboard tests pass.

The proposed Signal Sweep rehearsal is not truthfully “implementable under Task A”
unless Forge adds one repository-owned relay profile and removes only the
Gravity-specific dispatch assumptions. That narrow profile-catalog extension is
therefore included in this plan; it is not a second generated-runner architecture.

## Approved decisions

1. **One foundation and one starter.** Keep Godot 4, 2D, GDScript, and the existing
   Top-down Arena starter. Do not add a second starter or claim native platformer
   support.
2. **Separate proposal from authority.** Preserve the creator's exact original idea
   and the creator-approved model blueprint as immutable provenance. A separately
   fingerprinted accepted roadmap becomes the mutable planning authority carried
   into project creation.
3. **Forge owns starter reconciliation.** The model may propose creative outcomes,
   but it cannot assign starter facts, files, verification profiles, eligibility,
   commands, or project destinations. A Forge-owned starter/delta catalog rejects
   quests that merely restate verified starter behavior.
4. **Bounded revisions, not chat.** Permit at most three pre-creation creator
   revision events. Interpretation/vision revision may use the existing read-only
   planning session with one repair and no second clarification loop. Roadmap
   title/outcome/remove/reorder operations are deterministic; “add” selects one
   prevalidated optional delta rather than accepting an arbitrary quest.
5. **Two approvals remain distinct.** The creator first accepts the creative plan
   and accepted-roadmap fingerprint, then separately confirms the exact Forge-owned
   filesystem creation. The redundant intermediate Ready screen may collapse into
   the creation review, but neither approval may be inferred.
6. **One additional proof profile.** Add `relay_activation_v1` beside the protected
   Gravity profile. Generalize dispatch through a two-entry Forge-owned catalog and
   keep the exact existing Gravity contract, proof, and legacy eligibility behavior
   covered by regression tests.
7. **No real Signal Sweep implementation in Task B.** Live GPT planning and exact
   creation confirmation require the creator during rehearsal. Codex execution,
   visible play, creator result, and completion are a later separately approved
   proof run.

## Authoritative contracts and ownership

### Blueprint planner

Introduce a strict proposal envelope around the existing `GameBlueprint`:

- `originalIdea` — the exact trimmed creator input, stored as provenance rather
  than re-authored by the model;
- `recommendedInterpretation` — one short supported Top-down Arena version;
- `foundationFit { level, explanation }` with `strong | partial | poor`;
- `tradeoffs[]` — one to three plain consequences;
- `alternatives[]` — two or three compatible options with stable IDs, titles,
  interpretations, and one-sentence consequences.

Do not add model-authored `creatorAdjustments`. Record each creator action as a
structured revision event with kind, target, prior/new fingerprint, timestamp, and
creator actor. Planning remains session-scoped and writes no project files.

### Accepted roadmap

Add a strict pre-creation roadmap envelope containing:

- the approved blueprint fingerprint and starter identity/version;
- Forge-owned **Already playable** facts from the controlled starter catalog;
- three to five planned delta quests with stable temporary references,
  `currentPlayableFacts`, narrow included/excluded delta scope, dependencies,
  acceptance/proof ideas, and Forge-assigned implementation readiness;
- revision number/events, current fingerprint, and explicit acceptance timestamp.

Only the first Signal Sweep quest receives the registered relay profile and the
logical existing-file roles needed by Task A. Later quests remain truthfully planned
without pretending that Forge has a verifier for them. Acceptance fails on stale
fingerprints, cycles, missing dependencies, fewer than three quests, a dependency
ordered after its consumer, starter-only outcomes, or a first quest without a
registered existing-file contract.

### Project creation

Extend the approved creation envelope with both approved fingerprints and validate
them before allocation. Creation persists:

- the immutable approved model blueprint and planning provenance;
- a new immutable accepted-roadmap provenance artifact;
- the mutable current roadmap and per-quest artifacts directly in the generated v2
  shapes used by Task A;
- deterministic Markdown rendered from the accepted roadmap, not the original
  model quest ordering.

Add the accepted-roadmap artifact to the generated-project manifest using an
explicit compatible schema path. Existing v0.2 and Task A projects must continue to
load without writes, migration, or fabricated accepted-roadmap provenance.

### Generated quest boundary

Extend the registered profile/file-role catalog only enough for Signal Sweep Quest
1:

- add the existing `scripts/main.gd` logical role beside the scene and objective
  roles;
- add `relay_activation_v1` contract, context instructions, Forge-owned Godot
  verifier, proof copy, and bounded creator play steps;
- permit the accepted first relay quest to prepare without the Gravity-only
  adjustment ceremony because the creator already accepted its roadmap fingerprint;
- keep Gravity Tap's exact legacy quest/revision gate and profile behavior intact;
- treat unregistered later quests as planned/ineligible, never as failed.

Profile-specific content must come from the catalog. The browser and model never
submit a profile, role-to-path mapping, verifier path, executable, or command.

## Ordered implementation

1. Add failing contract tests for honest recommendation fields, exact original-idea
   provenance, fit levels, alternatives, strict limits, unsafe output, and one repair.
2. Add the proposal and accepted-roadmap schemas, stable fingerprinting, revision
   events, starter fact/delta catalog, and deterministic graph/reconciliation rules.
3. Extend the planning service, prompt, session snapshot, and exact host/API bodies
   for recommendation choice, bounded revision, roadmap edits, roadmap acceptance,
   rejection, and cancellation without project writes.
4. Replace the single whole-blueprint review with explicit supported-interpretation,
   vision, and starter-aware roadmap review states. Show **Already playable** above
   **Planned changes**, plain edit consequences, and stale/invalid graph feedback.
5. Collapse only the redundant Ready presentation if browser review shows the two
   actual approvals remain unmistakable; retain exact creation confirmation.
6. Extend the creation envelope and transaction validation so both fingerprints are
   current before directory allocation. Write/reload immutable roadmap provenance,
   v2 roadmap/quest/state/Chronicle artifacts, and deterministic documents before
   Godot/Git/registration.
7. Add compatible manifest/artifact reads so old generated projects remain
   byte-for-byte read-only on GET and new Project Worlds display accepted starter
   facts, deltas, and truthful implementation eligibility.
8. Refactor the Gravity-specific generated contract/context/proof dispatch into a
   closed two-profile catalog; add `relay_activation_v1` and its repository-owned
   Godot script while preserving every Gravity assertion.
9. Add focused API, stale-fingerprint, revision, duplicate-starter, dependency,
   creation rollback, legacy reload, profile dispatch, and sample isolation tests.
10. Add/refresh the focused blueprint visual-review states for unsupported idea,
    recommendation, vision, roadmap edit error, accepted roadmap, creation review,
    and fresh Project World at desktop and narrow widths.
11. Run a live Signal Sweep planning rehearsal. Pause for creator acceptance of the
    model result and again for exact filesystem confirmation. Reopen the clean
    registered project, prepare and inspect Quest 1's relay contract, then stop
    without invoking the SDK or claiming gameplay proof.
12. Review every acceptance criterion, update the Task B review/closeout/handoff,
    roadmap, concise milestone status, AI work log, and sanitized rehearsal evidence.

## Acceptance criteria

1. An unsupported or poor-fit idea is never presented as native platformer or broad
   game support; Forge shows the Top-down Arena interpretation, fit explanation,
   tradeoffs, alternatives, revise, and reject.
2. The exact original idea and approved initial blueprint remain immutable
   provenance; creator revisions are structured, bounded, fingerprinted events.
3. The creator can review starter facts separately from planned changes; edit title
   or outcome, remove or reorder safely, add one prevalidated optional delta, reject,
   and explicitly accept the final roadmap.
4. Every accepted quest is a visible delta from Forge-owned starter facts; invalid
   dependencies, stale fingerprints, and starter-duplicate quests fail before
   project allocation.
5. Project creation requires both current approvals and persists/reloads immutable
   blueprint plus accepted-roadmap provenance and authoritative v2 plan artifacts.
6. Signal Sweep Quest 1 resolves to at most three existing starter files and a
   registered `relay_activation_v1` proof profile; later unsupported quests remain
   honestly planned/ineligible.
7. A fresh Signal Sweep project passes controlled creation, Godot, Git, registry,
   restart, Project World, and dry contract preparation without an SDK source change.
8. Existing v0.2 generated projects, the completed Gravity Tap project, the sample
   workflow, showcase, and `v0.2.0` tag remain unchanged and readable.
9. Focused tests, full `npm run check`, `npm run check:v0.1`, dashboard build,
   context validation, browser review, and `git diff --check` pass.

## Non-goals

- Another starter/foundation, arbitrary small-game support, import, or broad scan
- Arbitrary post-creation quest generation or general controlled new files
- Companion chat, idea promotion, export/publishing, deployment, or showcase refresh
- Running or completing the Signal Sweep generated quest inside Task B
- Weakening creator confirmation, rollback, Git, sample, or release-tag boundaries

## Kill and fallback gates

- If starter reconciliation cannot deterministically reject duplicate starter work,
  use only the Forge-owned Signal Sweep delta catalog; do not trust free-form quests.
- If the first accepted quest cannot prepare a valid existing-file relay contract,
  do not create or market Signal Sweep as implementable.
- If the relay profile threatens Task A's Gravity path, stop and retain Gravity Tap
  as the proof; do not generalize the runner further.
- If live planning cannot produce a non-duplicative accepted roadmap after one
  repair and bounded creator revision, freeze Task B and use the existing generated
  project fallback.
- Any risk to sample behavior, unrelated generated projects, showcase source,
  `main`, or `v0.2.0` stops implementation.

## Approval record

The creator approved the seven decisions and ordered scope above on 2026-07-14,
including the single relay profile/catalog extension. Implementation may begin in a
separate implementation handoff. Any replacement of Signal Sweep with a fresh
Gravity-compatible proof concept or expansion beyond this plan requires a new
approval.
