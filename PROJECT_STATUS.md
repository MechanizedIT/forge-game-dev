# Forge Project Status

**Last updated:** 2026-07-13

**Current milestone:** `v0.1.0 — First-time judge usability refinement`

**Overall state:** `READY` for the real desktop judge path; one manual narrow-window review and submission packaging remain

This refinement responds directly to confusion observed during a real first-time run. It changes presentation and baseline controls without adding product capabilities or replacing the proven workflow. Release notes: [`BUILD_WEEK_CHANGELOG.md`](BUILD_WEEK_CHANGELOG.md).

## What works now

A clean 64-bit Windows 11 checkout at `a5321ed1406c599de70a9ba951552d81aee82e7a` completed the README path with Node 22.17.1 and Git 2.41:

- Locked npm installation completed with zero reported vulnerabilities.
- Explicit first-run consent downloaded, checksummed, and extracted pinned Godot 4.7; a later prepare reused the verified cache.
- The dashboard launched at its printed local URL and loaded the available Enemy Targeting quest.
- The official Codex SDK changed exactly the three approved Godot files.
- Project checks and deterministic Godot verification passed.
- The game visibly moved from `IDLE` to `CHASING` and back to `IDLE` after retreat.
- Forge requested creator confirmation only after play, persisted final `PASS`, and reloaded a 1-of-1 completed roadmap.
- An explicit reset restored the immutable fixture and a restarted host showed Enemy Targeting available at 0 of 1 complete.

The README now gives exact supported Node ranges, bundled Codex login checks, first-download behavior, the dashboard URL, reset/replay steps, and common recovery commands. Real dashboard screenshots replace the prior missing mockups. Port conflicts now produce a short actionable message instead of an unhandled Node stack.

The first World screen now explains Forge, the five-step demo, the three-file Codex boundary, and the proof model before asking the judge to **Review Enemy Targeting**. Proof and Chronicle stay disabled until they contain real evidence. Preserved setup reports whether the quest is available, in progress, or completed and prints the exact reset command; a completed dashboard offers **Start fresh demo** through the existing confirmed reset path.

During a real multi-minute SDK run, the dashboard now makes the current stage dominant, keeps completed stages visible, shows elapsed time, explains that Codex may take several minutes, and keeps technical events optional. Before play, Forge gives four exact instructions. The baseline player and real Godot verifier now support both arrow keys and WASD.

## Try the dashboard

```powershell
npm ci
npx codex login status
npm run demo:prepare -- confirm-download
npm run forge
```

Review Enemy Targeting, choose **Build with Codex**, wait for automated proof, choose **Play the result**, and confirm only what you observe. To replay, stop Forge with `Ctrl+C`, run `npm run demo:reset -- confirm-reset`, then run `npm run forge` again.

## Still incomplete

- Public demo video and Devpost URLs
- Primary Codex `/feedback` ID and final submission metadata
- Offline/replay fallback if live Codex or network access is unavailable
- License selection
- Plan refinement, contextual questions, and the multi-entry Chronicle remain honestly deferred product work
- One manual narrow-window visual pass; the controlled browser review covered the real desktop flow but could not resize its viewport

## Next milestone

Perform the manual narrow-window pass, then record the under-three-minute video, add final submission links and metadata, preserve the `/feedback` ID, choose the license, and decide whether an honestly labeled offline fallback is required.

Usability review: [`docs/reviews/2026-07-13-v0.1.0-first-run-usability-review.md`](docs/reviews/2026-07-13-v0.1.0-first-run-usability-review.md). Rehearsal evidence: [`docs/reviews/2026-07-13-judge-readiness-rehearsal-review.md`](docs/reviews/2026-07-13-judge-readiness-rehearsal-review.md). Operational details: [`README.md`](README.md) and [`docs/QUEST_CLI.md`](docs/QUEST_CLI.md).
