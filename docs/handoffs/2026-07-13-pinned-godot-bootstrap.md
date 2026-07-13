# Pinned Godot Bootstrap Implementation Handoff

- **Handoff stage:** `REVIEW`
- **Current workflow state:** `COMPLETE`
- **Approved scope:** Pinned Godot acquisition and cache integration only
- **Plan:** [`../plans/2026-07-13-pinned-godot-bootstrap.md`](../plans/2026-07-13-pinned-godot-bootstrap.md)
- **Review:** [`../reviews/2026-07-13-pinned-godot-bootstrap-review.md`](../reviews/2026-07-13-pinned-godot-bootstrap-review.md)
- **Closeout:** [`../closeouts/2026-07-13-pinned-godot-bootstrap-closeout.md`](../closeouts/2026-07-13-pinned-godot-bootstrap-closeout.md)

## TL;DR

Forge can now acquire the approved portable Godot build after one clear confirmation, verify it before extraction, and reuse the versioned cache for prepare, verify, and play.

## Changed

- Added immutable Godot artifact metadata and an explicit `godot:bootstrap` command.
- Added streamed temporary download, SHA-256 verification, safe ZIP extraction, atomic installation, version validation, and a verified cache marker.
- Integrated cache/override/detected resolution with `demo:prepare`, verification, and play.
- Added offline tests for permission, cache, mismatch cleanup, normal extraction, and traversal rejection.
- Documented the judge-facing command and official checksum provenance.

## Evidence

- `npm run check` passes typechecking and all 16 offline tests.
- Explicit opt-in acquisition reports `Source: download` and Godot `4.7.stable.official.5b4e0cb0f`.
- A subsequent bootstrap reports `Source: cache` without downloading.
- Prepare preserves the workspace; confirmed reset, headless verification, and a 120-frame play smoke pass.
- The committed fixture has no diff from accepted baseline `8ae0cddf9c40da12d6a76fcf270eecda08260378`.

## Remaining risks

- Only the approved Standard Windows x86_64 build is supported.
- A clean-machine judge rehearsal is still required during packaging.
- Enemy Targeting and the Forge quest workflow remain intentionally absent.

## Next bounded action

Add only the prepared Enemy Targeting quest data and deterministic acceptance criteria needed by the command-line golden path.
