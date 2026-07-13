# Enemy Targeting CLI

This is Forge's first real vertical slice: one prepared quest, one official Codex SDK turn, deterministic verification, and a structured review.

## Run it

```powershell
npm install
npm run demo:prepare -- confirm-download
npm run quest:run -- enemy-targeting
```

Type `APPROVE` after reviewing the quest summary. Forge shows:

```text
Understanding the quest
Inspecting the game
Building enemy targeting
Testing the mechanic
Reviewing the result
```

On automated success, Forge offers to launch the verified demo workspace. Type `LAUNCH`, then check:

- The enemy is `IDLE` outside 220 pixels.
- The enemy changes to `CHASING` and approaches inside 220 pixels.
- The enemy returns to `IDLE` after the player retreats beyond 220 pixels.

After closing the game, enter exactly `I SAW IT WORK`, `IT DID NOT WORK`, or `CANCEL`. Only the first response completes the quest.

`npm run quest:run -- enemy-targeting confirm-run` explicitly approves the live SDK turn. If no interactive input is available afterward, Forge records no creator confirmation and leaves the quest incomplete. Ordinary automated tests use a fake event stream, fake launcher, and scripted responses.

## Safety and evidence

- Codex receives only the approved quest, plan, and three declared workspace files.
- Its working directory is the persistent demo workspace, never `fixtures/godot/baseline`.
- The SDK turn uses workspace-write isolation, no network, no additional writable directories, and no automatic approvals inside the turn.
- Forge refuses a missing or dirty Git baseline. Preserve wanted changes, then use `npm run demo:reset -- confirm-reset` when an explicit clean reset is appropriate.
- Runtime evidence is written to `<Forge home>/demo-workspace/.forge/runs/<run-id>/`: plan snapshot, sanitized events, Git diff, implementation handoff, automated review, final review, and completion closeout.
- Successful confirmation writes `.forge/state/enemy-targeting.json`, advances the workflow to `COMPLETE`, and changes the roadmap node to `completed` with a timestamp.
- `IT DID NOT WORK`, `CANCEL`, launch failure, and failed automation leave the roadmap `available`. A completed quest is explained on rerun rather than silently rebuilt.

Codex authentication must already be available in the local Codex environment. No credentials or downloaded Godot binaries are stored in the repository.
