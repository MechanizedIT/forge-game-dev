# Forge Project Status

**Last updated:** 2026-07-13

**Current milestone:** Forge Workshop dashboard connected to the real Enemy Targeting workflow

**Overall state:** The dashboard is now a thin live interface over the proven command-line workflow; a successful human-confirmed dashboard rehearsal is still required

## What works now

A creator can prepare the bundled Godot project, approve Enemy Targeting, let the official Codex SDK implement it, follow plain-language progress, receive automated verification, launch the changed game, and explicitly confirm whether the mechanic worked.

Forge completes the quest only after all of these succeed:

- The bounded Codex run finishes with only approved files changed.
- Project and Godot verification pass.
- The verified Godot game launches and closes successfully.
- The creator enters exactly `I SAW IT WORK`.

Completion persists the workflow as `COMPLETE`, changes the roadmap node to `completed`, records the confirmation time, and writes final review and closeout evidence. Failure, cancellation, missing interactive input, or launch failure leaves the quest incomplete. Rerunning a completed quest explains its state instead of rebuilding it.

The Forge Workshop dashboard now reads the real prepared quest, plan, roadmap, review, verification, and completion artifacts. Its approval action starts the existing official Codex SDK runner, the five existing friendly stages stream into the UI, Godot launch returns to an explicit confirmation dialog, and completion appears only after the existing atomic persistence succeeds.

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

- One successful real dashboard run through creator visual confirmation. The development live run reached the real failure screen after Godot rejected the generated detection behavior; Forge correctly left the quest incomplete and no human confirmation was claimed.
- Restart recovery for an in-progress host process; live run ownership is intentionally in memory, while durable outcomes remain in existing artifacts.
- Plan refinement, contextual questions, and a multi-entry Chronicle index
- Clean-machine judge rehearsal and replay fallback

## Next milestone

Run the exact dashboard judge path on a clean Windows environment until one live implementation passes automated verification and a human confirms the visible mechanic. Fix only verified reliability defects; do not weaken the gates.

Operational details: [`docs/QUEST_CLI.md`](docs/QUEST_CLI.md). Dashboard specification: [`docs/BUILD_WEEK_DASHBOARD_CAPABILITY_AND_SCREEN_MAP.md`](docs/BUILD_WEEK_DASHBOARD_CAPABILITY_AND_SCREEN_MAP.md).
