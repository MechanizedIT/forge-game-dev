# Forge Project Status

**Last updated:** 2026-07-13

**Current milestone:** First usable Forge Workshop dashboard prototype complete; real workflow integration is next

**Overall state:** The terminal golden path works end to end, and a five-state React dashboard now demonstrates it honestly with mocked UI transitions

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

## Dashboard prototype

The Forge Workshop dashboard implements World Ready, Quest Brief, Implementation Running, Ready to Play, and Quest Complete as a responsive React/Vite click-through. It mirrors the committed Enemy Targeting quest, plan, scope, progress, and sanitized evidence language, but it does not read those artifacts or invoke the CLI at runtime. A visible prototype label and code comment make clear that dashboard transitions, Godot launch, creator confirmation, Chronicle preview, and completion persistence are mocked and write no Forge state.

Run it with:

```powershell
npm run dashboard:dev
```

## Still incomplete

- Thin local Node/TypeScript host connected to the proven quest workflow
- Real dashboard approval, progress event, evidence, Godot launch, and creator-confirmation adapters
- Deterministic dashboard ownership for an in-progress run and return from the Godot process
- Clean-machine judge rehearsal and replay fallback

## Next milestone

Add the smallest local host adapter that reads the prepared bundle and persistent roadmap state, then starts the existing runner only after the dashboard approval action. Do not change runner safety or completion semantics.

Operational details: [`docs/QUEST_CLI.md`](docs/QUEST_CLI.md). Dashboard specification: [`docs/BUILD_WEEK_DASHBOARD_CAPABILITY_AND_SCREEN_MAP.md`](docs/BUILD_WEEK_DASHBOARD_CAPABILITY_AND_SCREEN_MAP.md).
