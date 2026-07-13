# Pinned Godot Baseline Fixture Plan

- **Workflow state:** `PLAN`
- **Approval state:** Awaiting creator approval
- **Task:** Build the pinned Godot acquisition boundary and repeatable baseline fixture

## Approved engine input

The creator selected Godot 4.7 stable, Standard Windows x86_64, using GDScript rather than .NET.

- **Release:** `4.7-stable` (published 2026-06-18)
- **Artifact:** `Godot_v4.7-stable_win64.exe.zip`
- **Artifact size:** `83,764,371` bytes
- **Official release asset URL:** `https://github.com/godotengine/godot-builds/releases/download/4.7-stable/Godot_v4.7-stable_win64.exe.zip`
- **Expected executable:** `Godot_v4.7-stable_win64.exe`
- **SHA-256:** `02a5312236f4e0209c78bcb2f52135b1963e6b8888c873c9cee81459e60bcd71`
- **Checksum source:** `digest` for asset ID `451176037` in the official [`godotengine/godot-builds` 4.7-stable release metadata](https://api.github.com/repos/godotengine/godot-builds/releases/tags/4.7-stable), retrieved 2026-07-13
- **Release confirmation:** [Godot 4.7 stable archive page](https://godotengine.org/download/archive/4.7-stable/) and [official build release](https://github.com/godotengine/godot-builds/releases/tag/4.7-stable)

The implementation must treat this metadata as pinned executable truth. It must not substitute a newer patch, .NET build, another architecture, or an unverified mirror.

## Bounded scope

1. Extend the project-manifest contract with the approved distribution, platform, architecture, archive URL, executable name, and SHA-256.
2. Add a Windows-first engine acquisition module that downloads to a temporary cache file, hashes the completed file, and extracts only after an exact match.
3. Safely extract the verified ZIP into a versioned per-user cache and confirm the executable reports Godot 4.7 stable.
4. Add an immutable, asset-light GDScript fixture with a controllable player and a visible idle enemy. Enemy detection and chase behavior must remain absent.
5. Copy the fixture into a persistent per-user demo workspace on first preparation; preserve it on later preparation; provide an explicit confirmed reset action.
6. Add a pinned headless smoke check and focused automated tests for metadata, integrity failure, safe extraction, copy/preserve/reset behavior, and project startup.
7. Produce implementation, review, closeout, roadmap, and AI work-log evidence.

Default Windows state lives under `%LOCALAPPDATA%\Forge`. A `FORGE_HOME` override keeps automated tests isolated and makes the location deterministic without creating a generalized configuration system.

## Exact acceptance criteria

1. The strict project-manifest schema and example contain exactly `4.7-stable`, `standard`, `windows`, `x86_64`, the approved archive URL, expected executable name, and approved SHA-256; unknown distribution values are rejected.
2. The checksum source, release page, artifact name, asset ID, size, URL, and retrieval date remain recorded in this plan or a linked runtime-source document.
3. Engine acquisition writes the response to a temporary file in the versioned per-user cache and computes SHA-256 from the completed file before any extraction begins.
4. A checksum mismatch returns a clear failure, does not extract or launch anything, and leaves no file that can be mistaken for a verified engine. An automated test proves this behavior without downloading the real archive.
5. A matching archive is extracted with path-traversal protection into a versioned cache; the expected executable exists and running it with `--version` reports `4.7.stable`.
6. The committed fixture is a minimal Godot 4.7 GDScript project with a controllable player, a visible idle enemy, no .NET dependency, no external art dependency, and no enemy detection or chase mechanic.
7. `npm run demo:prepare` creates the persistent demo workspace from the immutable fixture only when it is absent. Running it again preserves a test marker or equivalent user change.
8. `npm run demo:reset -- --yes` requires explicit confirmation and reconstructs the demo workspace from the fixture. Without confirmation it makes no changes. Automated tests exercise prepare, preserve, cancel, and reset in a temporary `FORGE_HOME`.
9. `npm run godot:verify` uses the verified cached executable in headless mode, loads the fixture, checks the required player and enemy nodes/scripts, and exits `0` without editor or script errors.
10. `npm run check` passes all contract and new focused unit tests; the real archive verification and headless smoke command are recorded separately so ordinary unit tests do not redownload an 83 MB archive.
11. No dashboard, Codex SDK/App Server integration, Enemy Targeting implementation, roadmap-completion logic, replay system, other Godot version/platform, or general engine manager is added.
12. The task ends with an implementation handoff, explicit review result, closeout artifact, roadmap update, AI work-log entry, and exact verification output. It advances to `COMPLETE` only if all criteria pass.

## Implementation sequence after approval

1. Update the manifest schema/example and tests with pinned distribution metadata.
2. Implement isolated cache paths, download, hashing, mismatch cleanup, and safe extraction.
3. Add and unit-test persistent fixture preparation/reset using temporary directories.
4. Add the minimal GDScript fixture and headless verifier.
5. Download the official archive once, verify the approved SHA-256 before extraction, confirm `--version`, and run the headless smoke check.
6. Review every criterion and write separate implementation, review, and closeout records.

## Out of scope

- Enemy Targeting or any other quest mechanic
- Dashboard or companion UI
- Codex SDK or App Server integration
- General engine/version management
- Other platforms, architectures, .NET, export templates, or game packaging
- Replay mode, roadmap completion, and completion effects

## Approval gate

Do not modify product code, download the archive, create the fixture, or extract Godot until the creator approves this task and its acceptance criteria.
