# Godot Fixture Foundation

Forge includes an immutable Godot 4.7 GDScript baseline under `fixtures/godot/baseline`. It contains a controllable player and a clearly visible enemy that intentionally remains idle. It has no external art, .NET dependency, detection, targeting, or chase logic.

## Prepare Godot and the demo

On the first machine, explicitly approve the approximately 84 MB official portable download:

```powershell
npm run demo:prepare -- confirm-download
```

Forge downloads only Godot `4.7-stable` Standard Windows x86_64, verifies the pinned SHA-256 before extraction, confirms the executable reports Godot 4.7, and installs it under `%LOCALAPPDATA%\Forge\tools\godot\4.7-stable`. Later prepare, verify, and play commands reuse that cache without downloading.

To acquire or validate Godot without preparing the workspace, use the explicit opt-in command:

```powershell
npm run godot:bootstrap -- confirm-download
```

Normal automated tests remain offline.

### Existing Godot override

Forge continues to honor `GODOT_BIN`, then local/PATH lookup. The executable must report Godot 4.7.

PowerShell example:

```powershell
$env:GODOT_BIN = 'C:\path\to\Godot_v4.7-stable_win64_console.exe'
```

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

Stop the dashboard host before resetting, then restart it after reset so its in-memory notice state matches the restored workspace. Use `confirm-reset` exactly as shown. Without it, Forge cancels the reset and changes nothing. Direct CLI callers may also pass `--yes`; the positional confirmation avoids npm treating `--yes` as its own configuration flag.
