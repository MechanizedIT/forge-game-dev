import { spawnSync } from "node:child_process";

export interface CapturedProcessResult {
  output: string;
  status: number;
}

export function runCaptured(executable: string, args: string[]): CapturedProcessResult {
  const result = spawnSync(executable, args, { encoding: "utf8", windowsHide: true });
  if (result.error) {
    throw result.error;
  }

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  return { output, status: result.status ?? 1 };
}

export function readGodotVersion(executable: string): string {
  const result = runCaptured(executable, ["--version"]);
  if (result.status !== 0) {
    throw new Error(`Godot --version failed (${result.status}): ${result.output}`);
  }

  return result.output.split(/\r?\n/, 1)[0]?.trim() ?? "";
}
