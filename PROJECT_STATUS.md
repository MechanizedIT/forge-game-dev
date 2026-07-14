# Forge Project Status

**Last updated:** 2026-07-13

**Current milestone:** Real dashboard judge path proven end to end

**Overall state:** The golden path has succeeded on the development Windows machine; clean-machine repetition and submission packaging remain

## What works now

A creator can prepare the bundled Godot project, approve Enemy Targeting, let the official Codex SDK implement it, follow plain-language progress, receive automated verification, launch the changed game, and explicitly confirm whether the mechanic worked.

Forge completes the quest only after all of these succeed:

- The bounded Codex run finishes with only approved files changed.
- Project and Godot verification pass.
- The verified Godot game launches and closes successfully.
- The creator enters exactly `I SAW IT WORK`.

Completion persists the workflow as `COMPLETE`, changes the roadmap node to `completed`, records the confirmation time, and writes final review and closeout evidence. Failure, cancellation, missing interactive input, or launch failure leaves the quest incomplete. Rerunning a completed quest explains its state instead of rebuilding it.

The Forge Workshop dashboard now reads the real prepared quest, plan, roadmap, review, verification, and completion artifacts. Its approval action starts the existing official Codex SDK runner, the five existing friendly stages stream into the UI, Godot launch returns to an explicit confirmation dialog, and completion appears only after the existing atomic persistence succeeds.

A fresh dashboard rehearsal now proves that full path. The official SDK changed exactly the three approved Godot files, all deterministic checks passed, the creator played the game and entered `I SAW IT WORK`, and a fresh dashboard read showed a `PASS` review plus the completed roadmap. The earlier failed rehearsal was traced to an unreliable generated node-reference form; the bounded work packet now requires the proven exported-`NodePath` resolution pattern.

## Try the dashboard

```powershell
npm install
npm run demo:prepare -- confirm-download
npm run forge
```

The prepare command is needed only for first-time pinned Godot setup. `npm run forge` builds the dashboard, starts the local host, and opens Forge Workshop. Review Enemy Targeting, choose **Build with Codex**, wait for real proof, choose **Play the result**, then confirm only what you observed.

The immutable fixture remains the idle reset baseline. `npm run demo:reset -- confirm-reset` explicitly starts over and removes generated completion state.

## Command-line fallback

`npm run quest:run -- enemy-targeting` remains the authoritative terminal path and uses the same runner, review, launch, confirmation, and persistence services as the dashboard.

## Still incomplete

- Restart recovery for an in-progress host process; live run ownership is intentionally in memory, while durable outcomes remain in existing artifacts.
- Plan refinement, contextual questions, and a multi-entry Chronicle index
- Clean-machine judge rehearsal and replay fallback

## Next milestone

Repeat the successful dashboard path on a clean Windows environment, then finish the labeled replay fallback and submission packaging.

Operational details: [`docs/QUEST_CLI.md`](docs/QUEST_CLI.md). Dashboard specification: [`docs/BUILD_WEEK_DASHBOARD_CAPABILITY_AND_SCREEN_MAP.md`](docs/BUILD_WEEK_DASHBOARD_CAPABILITY_AND_SCREEN_MAP.md).
