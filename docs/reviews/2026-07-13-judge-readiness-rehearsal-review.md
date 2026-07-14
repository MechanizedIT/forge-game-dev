# Judge-Readiness Rehearsal Review

- **Workflow state:** `REVIEW`
- **Verdict:** `PASS`
- **Baseline:** `a5321ed1406c599de70a9ba951552d81aee82e7a`
- **Recommendation:** `READY` for live judge testing; manual submission packaging remains

## Acceptance review

1. **PASS — Clean checkout:** A fresh remote clone resolved to the requested baseline and followed the root README without development-workspace state.
2. **PASS — Isolation:** The rehearsal used an empty Forge home, new demo workspace, new dependency directory, and no existing Godot cache for first prepare.
3. **PASS — Setup:** Dependency installation reported zero vulnerabilities. Explicit consent downloaded, checksummed, extracted, and validated Godot 4.7; a later prepare reported cache reuse.
4. **PASS — Real golden path:** The official SDK run changed exactly the three approved files, automated review returned `CONDITIONAL PASS`, and deterministic Godot verification emitted the prepared success token.
5. **PASS — Human proof and persistence:** The game was observed as `IDLE`, then `CHASING`, then `IDLE` after retreat. Only then was `I SAW IT WORK` chosen. A fresh page read returned final `PASS` and a 1-of-1 completed roadmap.
6. **PASS — Replay:** Explicit reset restored the immutable fixture. After stopping and restarting Forge, the roadmap returned to 0 of 1 complete with Enemy Targeting available.
7. **PASS — Judge guidance:** Requirements, locked install, Codex login status, first download, URL, proof boundary, reset, common recovery, and deferred submission work are now explicit. Real dashboard screenshots replace missing mockups.
8. **PASS — Safety and scope:** No product feature, quest, verifier relaxation, cloud path, replay simulation, or infrastructure expansion was added. The committed-evidence scan found no credentials, private transcript, absolute user path, or Godot binary.

## Minimal fixes

- Correct the Node engine range to match Vite's actual support.
- Replace missing README screenshots and remove fake submission links.
- Document the bundled Codex login check and exact stop/reset/relaunch sequence.
- Add common download, authentication, failed-run, and port-conflict recovery.
- Replace the unhandled `EADDRINUSE` stack with an actionable local-host message.

## Final repository verification

- `npm ci` — passed; 40 packages audited, zero vulnerabilities reported.
- `npm run check` — passed typechecking and 45/45 offline tests.
- `npm run dashboard:build` — passed production build.
- `npm run godot:verify` — passed with Godot 4.7 and `FORGE_FIXTURE_VERIFY_OK player=Player enemy=Enemy baseline=idle`.
- Occupied-port startup — exited 1 with the documented close-or-change-port recovery and no unhandled stack.
- Alternate-port state request — returned HTTP 200 with validated Enemy Targeting state.
- Browser console — no warnings or errors during the clean dashboard rehearsal and replay check.

Sanitized machine-readable evidence: [`../evidence/2026-07-13-judge-readiness-rehearsal.json`](../evidence/2026-07-13-judge-readiness-rehearsal.json).
