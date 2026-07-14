# Forge v0.2 Judge Guide

## No-install public overview

The additional Task 8 showcase under `showcase/` gives judges a static, shareable explanation and guided replay of both verified v0.2 paths. It is explicitly labelled **Guided replay of verified Forge workflows** and does not run Codex, call GPT-5.6, launch Godot or Git, access files, modify a project, or persist visitor state.

Run it locally with `npm run showcase`, validate it with `npm run showcase:check`, or review the production build with `npm run showcase:review`. The public deployment URL remains an owner-supplied submission link; the real judged application path below is unchanged.

## What Forge is

Forge turns AI game-development work into visible, bounded, verified quests. It helps a creator shape a game idea, keeps Codex focused on one approved change at a time, verifies the result, and records what changed.

## Setup

Requirements: 64-bit Windows 10 or 11, Node.js 20.19+ or 22.12+, Git 2.x, internet access, Codex authentication, and GPT-5.6 API/model access for the new-game path.

```powershell
git clone https://github.com/MechanizedIT/forge-game-dev.git
cd forge-game-dev
npm ci
npx codex login status
# If signed out:
npx codex login
npm run demo:prepare -- confirm-download
npm run forge
```

Forge builds the UI, starts `http://127.0.0.1:4173/v0.2.html`, and opens the default browser. The first prepare explicitly authorizes the pinned Godot download and verifies its checksum. Live GPT and Codex work can take several minutes.

`npm run forge` is the v0.2 judge launch. `npm run forge:v0.1` remains the protected direct compatibility path, and `npm run forge:v0.2` is retained as an explicit alias.

## Fastest judge path

Choose **Explore the sample game** first.

1. Open **Review Enemy Targeting**.
2. Review the three-file boundary, automated proof, and personal playtest.
3. Choose **Approve & build with Codex**. This is the official Codex SDK boundary.
4. Wait for the five truthful stages and automated evidence.
5. Choose **Play the result**. Pinned Godot opens the real workspace.
6. Move with WASD or arrow keys. Approach and retreat until the enemy visibly changes `IDLE → CHASING → IDLE`.
7. Close Godot and choose **I saw it work** only if observed.
8. Reload Forge to see persisted roadmap and Chronicle completion.

Then choose **Create a new game**.

1. Enter one small 2D Top-down Arena idea.
2. GPT-5.6 high reasoning creates the validated blueprint; Forge never substitutes another model.
3. Approve the blueprint, then separately confirm project creation.
4. Forge copies only the controlled starter, validates records, runs pinned Godot verification, creates a clean local Git baseline, and registers the project last.
5. Open Project World, inspect the playable starter and planning-only quest briefs, save an idea, launch Godot, and open the folder.
6. Restart Forge and reopen the same project. Its roadmap, selected quest, documents, Chronicle, and idea seed persist.

Generated-quest Codex implementation is intentionally deferred. The sample path demonstrates the complete build-and-verify loop; the new-game path demonstrates GPT planning, deterministic creation, verification, persistence, and project organization.

## Likely recovery actions

- **Codex authentication:** run `npx codex login status`, then `npx codex login`, and restart Forge.
- **GPT-5.6 unavailable:** configure an authorized OpenAI API key/model entitlement and retry. Forge stops; it does not fall back.
- **Godot unavailable:** run `npm run demo:prepare -- confirm-download` again. Only a checksum-valid archive becomes the cache.
- **Port 4173 occupied:** stop the other Forge host, or run `$env:FORGE_PORT=4174; npm run forge` and open the printed URL.
- **Completed/preserved sample:** use **Start Fresh Demo**, or stop Forge and run `npm run demo:reset -- confirm-reset` before relaunching.
- **Browser does not open:** open the exact printed localhost URL manually.
- **Windows security prompt:** confirm only the pinned Godot executable under the Forge tools cache after the prepare command reports checksum success.

## Submission evidence

- Official Codex SDK: `src/quest-runner/sdk.ts`
- GPT-5.6 planning: `src/blueprint-planner/sdk.ts`
- Real Godot and creation proof: `docs/evidence/2026-07-14-v0.2-task-7-real-new-game.json`
- Task 7 rehearsal: `docs/evidence/2026-07-14-v0.2-task-7-rehearsal.json`
- Edge screenshots and reports: `docs/evidence/2026-07-14-v0.2-task-7-browser-review/`
- Build Week provenance: `BUILD_WEEK_BASELINE.md`, `BUILD_WEEK_CHANGELOG.md`, `docs/AI_WORK_LOG.md`, and Git history
- Static showcase: `showcase/README.md`
- Showcase responsive evidence: `docs/evidence/2026-07-14-v0.2-task-8-showcase-review/`
