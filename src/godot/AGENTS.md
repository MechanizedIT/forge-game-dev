# Godot Runtime Instructions

## Owns

Pinned Godot metadata, explicit download/checksum/cache behavior, safe extraction, executable discovery, fixture verification, and game launch helpers.

## Does not own

Quest acceptance criteria, generated-project artifact state, project registration, or UI evidence claims.

## Start here

Read `pinned-build.ts`, `bootstrap.ts`, `run-fixture.ts`, and `../../docs/GODOT_FIXTURE.md`; creation-specific verification starts in `../project-creation/godot-verifier.ts`.

## Invariants

Downloads require explicit consent and checksum success; extraction cannot escape its destination; verification success requires approved version/arguments and exact markers.

## Required checks

Run `tests/godot-bootstrap.test.ts`, `tests/godot-executable.test.ts`, and the owning sample or project-creation suite.
