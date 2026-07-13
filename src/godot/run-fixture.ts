import { spawnSync } from "node:child_process";

import { prepareDemoWorkspace } from "../demo/workspace.js";
import { ensurePinnedGodot } from "./bootstrap.js";
import { runCaptured } from "./process.js";

export interface GodotRunResult {
  executable: string;
  version: string;
  workspacePath: string;
  output: string;
}

async function resolveRuntime(): Promise<{
  executable: string;
  version: string;
  workspacePath: string;
}> {
  const godot = await ensurePinnedGodot();

  const workspace = await prepareDemoWorkspace();
  return {
    executable: godot.executable,
    version: godot.version,
    workspacePath: workspace.workspacePath,
  };
}

export async function verifyFixture(): Promise<GodotRunResult> {
  const runtime = await resolveRuntime();
  const result = runCaptured(runtime.executable, [
    "--headless",
    "--path",
    runtime.workspacePath,
    "--script",
    "res://scripts/verify_fixture.gd",
  ]);

  if (result.status !== 0 || !result.output.includes("FORGE_FIXTURE_VERIFY_OK")) {
    throw new Error(`Godot fixture verification failed (${result.status}):\n${result.output}`);
  }

  return { ...runtime, output: result.output };
}

export async function playFixture(): Promise<void> {
  const runtime = await resolveRuntime();
  const result = spawnSync(runtime.executable, ["--path", runtime.workspacePath], {
    stdio: "inherit",
    windowsHide: false,
  });

  if (result.error) {
    throw result.error;
  }
  if ((result.status ?? 1) !== 0) {
    throw new Error(`Godot exited with status ${result.status ?? 1}`);
  }
}
