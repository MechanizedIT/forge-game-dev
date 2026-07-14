# Dashboard Judge-Path Reliability Handoff

- **Workflow state:** `DOCUMENT`
- **Result:** The real Enemy Targeting dashboard path completed successfully.
- **Plan:** [`../plans/2026-07-13-dashboard-judge-path-reliability.md`](../plans/2026-07-13-dashboard-judge-path-reliability.md)

## Root cause

The failed dashboard run generated `@export var player: CharacterBody2D` but serialized `player = NodePath("../Player")` in the scene. The runtime field was not a valid player node, so detection stayed false at 180 pixels. The verifier, timing, workspace, and dashboard runner were sound: the earlier successful CLI diff used an exported `NodePath` resolved after initialization and passed the same check.

## Correction

The bounded Codex work packet now explicitly requires that proven exported-`NodePath` resolution pattern and rejects assigning a `NodePath` value to a directly exported node field. No gameplay file, acceptance criterion, verifier, SDK boundary, retry loop, or fixture was changed in the repository.

## Real evidence

- Live SDK thread: `019f5dfe-7e18-78c2-a858-e4a6bdd7384a`.
- Changed files: `main.tscn`, `scripts/enemy.gd`, and `scripts/verify_fixture.gd`; no unexpected files.
- `VERIFY-1` and `VERIFY-2` passed; Godot emitted the complete Enemy Targeting success token.
- The game launched with Godot `4.7.stable.official.5b4e0cb0f`.
- The creator entered `I SAW IT WORK` after observing the mechanic.
- Final review is `PASS`; workflow and roadmap persisted as complete.

## Remaining risk

This proves the path on the development Windows machine. A clean-machine repetition is still required for packaging confidence.
