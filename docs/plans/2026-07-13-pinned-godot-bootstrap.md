# Pinned Godot Bootstrap Plan

- **Workflow state:** `COMPLETE`
- **Approval:** Creator-approved on 2026-07-13
- **Scope:** Automatic acquisition of the one approved Windows Godot build; no fixture changes

## Goal

A judge can prepare and play the demo without locating Godot manually.

## Approved build

- Godot `4.7-stable`, Standard Windows x86_64, GDScript
- Archive: `Godot_v4.7-stable_win64.exe.zip` (`83,764,371` bytes)
- SHA-256: `02a5312236f4e0209c78bcb2f52135b1963e6b8888c873c9cee81459e60bcd71`
- Source: official `godotengine/godot-builds` release asset ID `451176037`; provenance remains recorded in the [baseline fixture plan](2026-07-13-godot-baseline-fixture.md)

## Acceptance criteria

1. `demo:prepare` accepts explicit `confirm-download` permission before an approximately 84 MB download.
2. The archive downloads to a temporary file, is SHA-256 verified before extraction, and is removed after success or failure.
3. Checksum mismatch prevents extraction and execution and removes partial state.
4. ZIP extraction rejects absolute, traversal, and symbolic-link entries and installs atomically into a versioned per-user tools directory.
5. The expected executable must report Godot 4.7 before a verified cache marker is written.
6. A valid cache is reused without a network request; `GODOT_BIN` and existing local lookup remain supported.
7. Offline tests cover permission gating, cache reuse, checksum failure cleanup, valid extraction, and traversal rejection.
8. Real acquisition is available only through an explicit opt-in command.
9. Prepare, preserve, reset, headless verification, and a short game launch still pass with the pinned cache.
10. The fixture, dashboard, Codex runtime, Enemy Targeting, other platforms/versions, and general engine management remain unchanged.

## Sequence

1. Add pinned metadata, cache paths, version checking, and a safe ZIP boundary.
2. Integrate the bootstrap into prepare and runtime resolution.
3. Add offline tests and an explicit real-download command.
4. Exercise the judge path, review scope/diff, document evidence, and close out.
