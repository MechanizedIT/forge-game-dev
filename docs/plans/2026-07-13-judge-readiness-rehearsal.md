# Judge-Readiness Rehearsal Plan

- **Workflow state:** `COMPLETE`
- **Approved scope:** Clean Windows install, dashboard golden-path rehearsal, reset/replay verification, and only small packaging or documentation corrections exposed by the rehearsal.
- **Baseline:** `a5321ed1406c599de70a9ba951552d81aee82e7a`

## Acceptance criteria

1. A separate clean checkout follows only the root README from install through launch.
2. The rehearsal does not reuse the development workspace, demo state, dependencies, or Godot cache.
3. First-time Godot consent, download, checksum validation, extraction, and deterministic fixture verification succeed.
4. The real dashboard reaches automated proof, play confirmation, persisted completion, and a fresh completed-state read.
5. Reset removes generated completion state and returns the roadmap to an available, replayable quest.
6. Node, Windows, Git, internet, Codex authentication, URL, recovery, reset, and proof-boundary guidance match observed behavior.
7. Committed evidence contains no credentials, private transcripts, unredacted local paths, or downloaded binaries.
8. Only minimal judge-readiness fixes are made; all checks, production build, Godot verification, and diff review pass.

## Evidence to capture

- Clean-checkout commit and environment versions
- Exact install, prepare, launch, quest, persistence, and reset results
- Browser-visible dashboard states and console health
- Automated test/build/Godot output
- Committed-evidence and provenance audit

## Stop conditions

- Do not add product features or broaden the supported project/engine surface.
- Do not weaken automated or creator-confirmation gates.
- Treat submission URLs, screenshots, video recording, Devpost entry, and `/feedback` capture as manual submission work unless a local correction is already available.
