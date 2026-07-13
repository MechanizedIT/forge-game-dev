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

On automated success, run `npm run demo:play`. Approach the red enemy to see `IDLE` change to `CHASING`, then retreat beyond its range.

`npm run quest:run -- enemy-targeting confirm-run` is the explicit non-interactive live command. It runs the real SDK; ordinary automated tests use a fake event stream.

## Safety and evidence

- Codex receives only the approved quest, plan, and three declared workspace files.
- Its working directory is the persistent demo workspace, never `fixtures/godot/baseline`.
- The SDK turn uses workspace-write isolation, no network, no additional writable directories, and no automatic approvals inside the turn.
- Forge refuses a missing or dirty Git baseline. Preserve wanted changes, then use `npm run demo:reset -- confirm-reset` when an explicit clean reset is appropriate.
- Runtime evidence is written to `<Forge home>/demo-workspace/.forge/runs/<run-id>/`: plan snapshot, sanitized events, Git diff, implementation handoff, and review.
- `PASS` is impossible until the creator play check exists. This milestone can return `CONDITIONAL PASS` with the roadmap still `available`, or `FAIL` without false completion.

Codex authentication must already be available in the local Codex environment. No credentials or downloaded Godot binaries are stored in the repository.
