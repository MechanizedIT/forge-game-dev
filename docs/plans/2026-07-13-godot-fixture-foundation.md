# Godot Fixture and Verification Foundation

- **Approved scope:** Sample fixture and verification foundation only
- **Workflow:** `IMPLEMENT → REVIEW → DOCUMENT → COMPLETE`
- **Current workflow state:** `COMPLETE`

## Goal

Create the smallest working Godot 4.7 GDScript project that proves Forge has a playable, resettable baseline before dashboard or Codex runtime work begins.

## Acceptance criteria

1. The fixture has a controllable player and clearly visible idle enemy, with no targeting, detection, chase, external art, or .NET dependency.
2. A headless command uses `GODOT_BIN` or a small local/PATH lookup, confirms Godot 4.7, loads the project without script errors, verifies the required player/enemy nodes and scripts, and exits successfully.
3. Prepare creates the persistent demo workspace only when absent and preserves later user changes.
4. Reset makes no changes without explicit confirmation and restores the immutable fixture when confirmed.
5. Focused tests cover prepare, preserve, reset cancellation, reset success, configured executable lookup, PATH lookup, and missing-executable errors.
6. No automatic download/extraction, dashboard, Codex integration, Enemy Targeting, completion/replay, or generalized engine manager is added.
7. Tests and real Godot verification pass, unrelated scope is absent, and implementation/review/closeout/work-log records are complete.

## Result

All criteria passed. Evidence is in the [implementation handoff](../handoffs/2026-07-13-godot-fixture-foundation.md), [review result](../reviews/2026-07-13-godot-fixture-foundation-review.md), and [closeout](../closeouts/2026-07-13-godot-fixture-foundation-closeout.md).
