# Godot Fixture Foundation Implementation Handoff

- **Handoff stage:** `REVIEW`
- **Current workflow state:** `COMPLETE`
- **Approved scope:** Fixture, workspace lifecycle, and verification foundation only
- **Review:** [`../reviews/2026-07-13-godot-fixture-foundation-review.md`](../reviews/2026-07-13-godot-fixture-foundation-review.md)
- **Closeout:** [`../closeouts/2026-07-13-godot-fixture-foundation-closeout.md`](../closeouts/2026-07-13-godot-fixture-foundation-closeout.md)

## TL;DR

Forge now ships an immutable, asset-free Godot 4.7 GDScript baseline with a movable player and idle enemy. Node commands prepare, preserve, reset, play, and headlessly verify a persistent per-user demo workspace.

## Changed

- Added `fixtures/godot/baseline` with the main scene, player script, idle enemy script, and headless verifier.
- Added safe workspace prepare/reset functions with `%LOCALAPPDATA%\Forge` default and `FORGE_HOME` override.
- Added `GODOT_BIN`, project-local, and PATH executable lookup without downloads.
- Added `demo:prepare`, `demo:reset`, `demo:play`, and `godot:verify` scripts.
- Added seven focused executable/workspace tests alongside the four existing contract tests.
- Added the operational run guide in `docs/GODOT_FIXTURE.md`.

## Verification evidence

- `npm run check` — typecheck passed; 11 tests passed; 0 failed.
- `npm run demo:prepare` — existing workspace reported `preserved`.
- `npm run demo:reset -- confirm-reset` — workspace restored successfully.
- `npm run godot:verify` with local Standard Godot — `4.7.stable.official.5b4e0cb0f`; emitted `FORGE_FIXTURE_VERIFY_OK player=Player enemy=Enemy baseline=idle`.
- `git diff --check` — passed.

## Remaining risks

- Godot is currently user-configured or locally detected; automatic pinned acquisition and checksum verification are deferred.
- The fixture proves only the idle baseline. Enemy Targeting remains intentionally absent.

## Next bounded action

Implement only pinned Godot archive acquisition, SHA-256 verification before extraction, and versioned caching; reuse this fixture unchanged.
