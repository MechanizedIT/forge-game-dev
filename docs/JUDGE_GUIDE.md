# Forge Open-Idea Alpha Judge Guide

## No-install public overview

The additional Task 8 showcase under `showcase/` preserves a static, shareable explanation and guided replay of the earlier verified v0.2 paths. It does not run Codex, call GPT, launch Godot or Git, access files, modify a project, or persist visitor state. The local alpha path below is newer and is the authoritative product demonstration.

Run it locally with `npm run showcase`, validate it with `npm run showcase:check`, or review the production build with `npm run showcase:review`. The public deployment URL remains an owner-supplied submission link; the real judged application path below is unchanged.

## What Forge is

Forge turns AI game-development work into visible, bounded, verified quests. It helps a creator shape a game idea, keeps Codex focused on one approved change at a time, verifies the result, and records what changed.

## Setup

Requirements: 64-bit Windows 10 or 11, Node.js 20.19+ or 22.12+, Git 2.x, internet access, Codex authentication, and model access for live roadmap/quest planning.

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

`npm run forge` is the alpha judge launch. `npm run forge:v0.1` remains the protected direct sample path, and `npm run forge:v0.2` is retained as an explicit alias.

## Fastest judge path

Choose **Start a new game**.

1. Enter a project name and choose **Create and open**. Forge creates one neutral runnable Godot project, verifies it, creates a clean local Git baseline, and registers it last. No game type or template is selected.
2. In Project World, choose **Shape systems** and describe any simple Godot game idea in ordinary words.
3. Review and confirm the broad systems. Open one system and refine it into small ordered quests.
4. Confirm the quests. Forge shows every saved quest and marks the next available one as **Recommended next**.
5. Prepare that quest. Review its outcome, success checks, and editable file suggestions, then confirm the exact one-to-four-file work plan.
6. Open the quest, choose **Send to Codex**, and wait for the plain-language work and verification stages.
7. Choose **Play the real game**. After seeing the mechanic, close Godot and choose **Worked** only if it worked.
8. Confirm the quest, parent system, roadmap, History, project notes, and next available quest update.
9. Repeat with a second quest to show that one open idea can grow through multiple independent mechanics.
10. Close Forge completely, restart it, reopen the project, and launch the game. The completed work and next quest persist.

The owner proved this path with an endlessly running robot on an alien landscape, then separate jump and random-obstacle quests. The protected **Explore the sample game** / Enemy Targeting journey remains available when a shorter prebuilt compatibility demonstration is useful.

## Likely recovery actions

- **Codex authentication:** run `npx codex login status`, then `npx codex login`, and restart Forge.
- **Planning model unavailable:** configure authorized model access and retry. Forge stops; it does not silently invent a fallback roadmap.
- **Godot unavailable:** run `npm run demo:prepare -- confirm-download` again. Only a checksum-valid archive becomes the cache.
- **Port 4173 occupied:** stop the other Forge host, or run `$env:FORGE_PORT=4174; npm run forge` and open the printed URL.
- **Completed/preserved sample:** use **Start Fresh Demo**, or stop Forge and run `npm run demo:reset -- confirm-reset` before relaunching.
- **A native quest stops:** open its preserved work session and follow the displayed retry, scope-review, or safe-undo action. Forge does not silently broaden file authority or record completion.
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
- Open-project milestone: `docs/closeouts/2026-07-15-alpha-open-project-repeatable-quests-closeout.md`
- Quest handoff and completion milestone: `docs/closeouts/2026-07-16-alpha-quest-handoff-reliable-completion-closeout.md`
- Latest quest-handoff Edge evidence: `docs/evidence/2026-07-16-alpha-quest-handoff/`
