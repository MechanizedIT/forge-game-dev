import { spawnSync } from "node:child_process";

import { prepareDemoWorkspace } from "../demo/workspace.js";
import { findGodotExecutable } from "./find-executable.js";

export interface GodotRunResult {
  executable: string;
  version: string;
  workspacePath: string;
  output: string;
}

function runCaptured(executable: string, args: string[]): { output: string; status: number } {
  const result = spawnSync(executable, args, { encoding: "utf8", windowsHide: true });
  if (result.error) {
    throw result.error;
  }

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  return { output, status: result.status ?? 1 };
}

async function resolveRuntime(): Promise<{
  executable: string;
  version: string;
  workspacePath: string;
}> {
  const executable = await findGodotExecutable();
  const versionResult = runCaptured(executable, ["--version"]);
  if (versionResult.status !== 0) {
    throw new Error(`Godot --version failed (${versionResult.status}): ${versionResult.output}`);
  }

  const version = versionResult.output.split(/\r?\n/, 1)[0]?.trim() ?? "";
  if (!version.startsWith("4.7")) {
    throw new Error(`Forge requires Godot 4.7 for this fixture; found ${version || "unknown"}`);
  }

  const workspace = await prepareDemoWorkspace();
  return { executable, version, workspacePath: workspace.workspacePath };
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
