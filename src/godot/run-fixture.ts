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

export interface GodotLaunchResult {
  executable: string;
  version: string;
  workspacePath: string;
}

const verificationSuccessTokens = [
  "FORGE_FIXTURE_VERIFY_OK",
  "FORGE_ENEMY_TARGETING_VERIFY_OK",
] as const;

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

  const hasSuccessToken = verificationSuccessTokens.some((token) =>
    result.output.includes(token),
  );
  if (result.status !== 0 || !hasSuccessToken) {
    throw new Error(`Godot fixture verification failed (${result.status}):\n${result.output}`);
  }

  return { ...runtime, output: result.output };
}

export async function playFixture(): Promise<void> {
  const runtime = await resolveRuntime();
  await launchPreparedGame(runtime.workspacePath, {
    executable: runtime.executable,
    version: runtime.version,
  });
}

export async function launchPreparedGame(
  workspacePath: string,
  resolvedGodot?: { executable: string; version: string },
): Promise<GodotLaunchResult> {
  const godot = resolvedGodot ?? (await ensurePinnedGodot());
  const result = spawnSync(godot.executable, ["--path", workspacePath], {
    stdio: "inherit",
    windowsHide: false,
  });

  if (result.error) {
    throw result.error;
  }
  if ((result.status ?? 1) !== 0) {
    throw new Error(`Godot exited with status ${result.status ?? 1}`);
  }
  return {
    executable: godot.executable,
    version: godot.version,
    workspacePath,
  };
}
