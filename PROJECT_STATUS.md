# Forge Project Status

**Last updated:** 2026-07-13

**Current milestone:** Complete command-line Enemy Targeting quest loop

**Overall state:** The terminal golden path works end to end; visual dashboard integration is next

## What works now

A creator can prepare the bundled Godot project, approve Enemy Targeting, let the official Codex SDK implement it, follow plain-language progress, receive automated verification, launch the changed game, and explicitly confirm whether the mechanic worked.

Forge completes the quest only after all of these succeed:

- The bounded Codex run finishes with only approved files changed.
- Project and Godot verification pass.
- The verified Godot game launches and closes successfully.
- The creator enters exactly `I SAW IT WORK`.

Completion persists the workflow as `COMPLETE`, changes the roadmap node to `completed`, records the confirmation time, and writes final review and closeout evidence. Failure, cancellation, missing interactive input, or launch failure leaves the quest incomplete. Rerunning a completed quest explains its state instead of rebuilding it.

## Try it

```powershell
npm install
npm run demo:prepare -- confirm-download
npm run quest:run -- enemy-targeting
```

Type `APPROVE`, then `LAUNCH` after automated checks pass. In the game, approach and retreat from the enemy to check `IDLE` → `CHASING` → `IDLE`. After closing the game, enter one of the exact responses shown by Forge.

The immutable fixture remains the idle reset baseline. `npm run demo:reset -- confirm-reset` explicitly starts over and removes generated completion state.

## Still incomplete

- Visual roadmap dashboard and companion interface
- Dashboard completion feedback, animation, and sound
- Clean-machine judge rehearsal and replay fallback

## Next milestone

Connect the proven command-line workflow to the visual roadmap dashboard without changing its safety, verification, or human-confirmation rules.

Operational details: [`docs/QUEST_CLI.md`](docs/QUEST_CLI.md).
