# Godot Fixture Foundation

Forge includes an immutable Godot 4.7 GDScript baseline under `fixtures/godot/baseline`. It contains a controllable player and a clearly visible enemy that intentionally remains idle. It has no external art, .NET dependency, detection, targeting, or chase logic.

## Configure Godot

Use the Standard Godot 4.7 executable. Forge checks `GODOT_BIN`, then the repository and `.tools/godot`, then `PATH`.

PowerShell example:

```powershell
$env:GODOT_BIN = 'C:\path\to\Godot_v4.7-stable_win64_console.exe'
```

Forge does not download or extract Godot in this task.

## Prepare and play

```powershell
npm run demo:prepare
npm run demo:play
```

The default Windows workspace is `%LOCALAPPDATA%\Forge\demo-workspace`. Preparing again preserves existing changes. Tests and advanced local workflows can set `FORGE_HOME` to an isolated directory.

Move the blue player with the arrow keys. The red **IDLE ENEMY** must not react.

## Verify

```powershell
npm run godot:verify
```

This uses the configured or detected Godot 4.7 executable in headless mode, loads the persistent workspace, and checks the main scene plus the required `Player` and `Enemy` nodes and scripts.

## Reset

Reset is destructive to the demo workspace and therefore requires explicit confirmation:

```powershell
npm run demo:reset -- confirm-reset
```

Use `confirm-reset` exactly as shown. Without it, Forge cancels the reset and changes nothing. Direct CLI callers may also pass `--yes`; the positional confirmation avoids npm treating `--yes` as its own configuration flag.
