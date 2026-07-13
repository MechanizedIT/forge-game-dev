import { spawnSync } from "node:child_process";
import { stat } from "node:fs/promises";
import path from "node:path";

export interface WorkspaceDiff {
  files: string[];
  patch: string;
}

function runGit(workspacePath: string, args: string[]): string {
  const result = spawnSync("git", args, {
    cwd: workspacePath,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0) {
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
    throw new Error(`Git ${args[0] ?? "command"} failed (${result.status ?? 1}): ${output}`);
  }
  return `${result.stdout ?? ""}${result.stderr ?? ""}`.trimEnd();
}

export async function initializeWorkspaceGitBaseline(workspacePath: string): Promise<void> {
  const gitDirectory = path.join(workspacePath, ".git");
  const existing = await stat(gitDirectory).catch(() => null);
  if (existing?.isDirectory()) return;

  runGit(workspacePath, ["init", "--quiet"]);
  runGit(workspacePath, ["add", "--all"]);
  runGit(workspacePath, [
    "-c",
    "user.name=Forge Demo",
    "-c",
    "user.email=forge-demo@localhost",
    "commit",
    "--quiet",
    "-m",
    "Forge demo baseline",
  ]);
}

export async function requireCleanWorkspaceGit(workspacePath: string): Promise<void> {
  const gitDirectory = await stat(path.join(workspacePath, ".git")).catch(() => null);
  if (!gitDirectory?.isDirectory()) {
    throw new Error(
      "The demo workspace has no Forge Git baseline. Run npm run demo:reset -- confirm-reset before this quest.",
    );
  }

  runGit(workspacePath, ["rev-parse", "--verify", "HEAD"]);
  const status = runGit(workspacePath, ["status", "--porcelain=v1", "--untracked-files=all"]);
  if (status) {
    throw new Error(
      "The demo workspace has uncommitted changes. Forge preserved them and refused to run; reset explicitly or commit them yourself.",
    );
  }
}

function parseStatusPath(line: string): string {
  const raw = line.slice(3).trim();
  const renamed = raw.includes(" -> ") ? raw.split(" -> ").at(-1) ?? raw : raw;
  return renamed.replace(/^"|"$/g, "").replaceAll("\\", "/");
}

export function captureWorkspaceDiff(workspacePath: string): WorkspaceDiff {
  const status = runGit(workspacePath, ["status", "--porcelain=v1", "--untracked-files=all"]);
  const files = status
    ? [...new Set(status.split(/\r?\n/).filter(Boolean).map(parseStatusPath))].sort()
    : [];
  const patch = runGit(workspacePath, ["diff", "--no-ext-diff", "--no-color", "--"]);
  return { files, patch };
}
