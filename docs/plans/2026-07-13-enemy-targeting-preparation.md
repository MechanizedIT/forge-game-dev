# Enemy Targeting Quest Preparation Plan

- **Workflow state:** `COMPLETE`
- **Approval:** Creator-approved on 2026-07-13
- **Scope:** Prepared quest, deterministic criteria, prepared plan, roadmap linkage, validation, and tests only

## Goal

Create one complete Enemy Targeting work packet that the next milestone can hand to Codex without adding the gameplay mechanic or runtime loop now.

## Acceptance criteria

1. A strict quest artifact explicitly records player outcome, importance, current baseline, expected behavior, relevant existing files, included/excluded scope, six bounded criteria, and verification instructions.
2. The criteria deterministically cover idle outside 220 pixels, detection inside 220 pixels, movement toward the player, preserved player input, headless verification, and visible play confirmation.
3. A revision-one prepared implementation plan begins at `APPROVE`, references every real criterion and verification, has no open decisions, and restricts future implementation to the existing scene, enemy script, and verifier.
4. The fixture roadmap references the real quest in `available` state.
5. A focused loader validates all three strict artifacts, their cross-references, and the existence of every context file.
6. Tests prove valid load, invalid acceptance/workflow rejection, and real roadmap linkage.
7. No targeting behavior, Godot infrastructure, Codex runtime, dashboard, scanning, or extra quest implementation is added.

## Sequence

1. Extend the quest contract only for required explicit intent fields and unique IDs.
2. Add the quest, prepared plan, and roadmap metadata under the demo fixture's `.forge` directory.
3. Add one fixed-bundle loader and focused validation tests.
4. Review scope and evidence, reconcile project status, document closeout, and commit once.
