# Pinned Godot Bootstrap Review

- **Workflow state:** `REVIEW`
- **Verdict:** `PASS`
- **Baseline:** `8ae0cddf9c40da12d6a76fcf270eecda08260378`
- **Plan:** [`../plans/2026-07-13-pinned-godot-bootstrap.md`](../plans/2026-07-13-pinned-godot-bootstrap.md)

## Acceptance review

1. **PASS — Explicit permission:** Absent Godot produces a clear `confirm-download` instruction naming the 84 MB size; the offline test proves no download begins without it.
2. **PASS — Integrity before extraction:** Acquisition hashes the completed temporary archive and calls extraction only after an exact pinned match.
3. **PASS — Failure safety:** The mismatch test proves extraction is never called and archive/extraction/install remnants are removed.
4. **PASS — Safe atomic install:** ZIP validation rejects traversal, absolute paths, and links; extraction occurs in a unique sibling and is renamed only after executable/version validation.
5. **PASS — Runtime validation:** The real executable reported `4.7.stable.official.5b4e0cb0f` before the cache became reusable.
6. **PASS — Reuse and override:** The cache-reuse test records zero downloads; existing `GODOT_BIN` and local lookup tests remain green.
7. **PASS — Offline suite:** Permission, reuse, mismatch cleanup, successful local extraction, and traversal tests use controlled local data.
8. **PASS — Opt-in network:** Only `confirm-download` enables download; `godot:bootstrap` without it reused the installed cache.
9. **PASS — Existing path:** Prepare/preserve, confirmed reset, headless fixture verification, and the auto-closing game launch all passed.
10. **PASS — Scope:** `git diff 8ae0cdd -- fixtures/godot/baseline` is empty; no dashboard, Codex, quest mechanic, platform matrix, or engine manager was added.

## Evidence

- `npm run check` — typecheck passed; 16 tests passed; 0 failed.
- `npm run godot:bootstrap -- confirm-download` — exact official archive verified and installed; Godot 4.7 reported.
- `npm run godot:bootstrap` — verified cache reused.
- `npm run demo:prepare` twice — existing workspace preserved.
- `npm run demo:reset -- confirm-reset` — reset passed.
- `npm run godot:verify` — emitted `FORGE_FIXTURE_VERIFY_OK player=Player enemy=Enemy baseline=idle`.
- Godot play smoke — GUI executable exited `0` after 120 frames.
- `git diff --check` and fixture-baseline diff — pass.

## Review conclusion

The implementation satisfies the approved task without changing sample gameplay. It is ready for documentation closeout and commit.
