import {
  gitBaselineResultSchema,
  type GitBaselineResult,
} from "../contracts/index.js";
import { runProjectProcess, type ProjectProcessRunner } from "./process.js";

export type GitBaselineCreator = (options: {
  projectPath: string;
  projectId: string;
  expectedFiles: string[];
  committedAt: string;
}) => Promise<GitBaselineResult>;

function requireGit(
  processRunner: ProjectProcessRunner,
  projectPath: string,
  args: string[],
): string {
  const result = processRunner({ executable: "git", args, cwd: projectPath });
  if (result.status !== 0) throw new Error(`Git ${args[0] ?? "command"} failed (${result.status}): ${result.output}`);
  return result.output.trim();
}

export function createGitBaselineCreator(
  processRunner: ProjectProcessRunner = runProjectProcess,
): GitBaselineCreator {
  return async ({ projectPath, projectId, expectedFiles, committedAt }) => {
    requireGit(processRunner, projectPath, ["init", "--quiet"]);
    requireGit(processRunner, projectPath, ["config", "user.name", "Forge"]);
    requireGit(processRunner, projectPath, ["config", "user.email", "forge@localhost"]);
    requireGit(processRunner, projectPath, ["add", "--all"]);
    const staged = requireGit(processRunner, projectPath, ["diff", "--cached", "--name-only", "--diff-filter=ACMR"])
      .split(/\r?\n/u).filter(Boolean).map((file) => file.replaceAll("\\", "/")).sort();
    const expected = [...expectedFiles].sort();
    if (JSON.stringify(staged) !== JSON.stringify(expected)) {
      throw new Error(`Git baseline inventory mismatch. Expected ${expected.join(", ")}; staged ${staged.join(", ")}.`);
    }
    requireGit(processRunner, projectPath, ["commit", "--quiet", "-m", "Forge project baseline"]);
    const commitSha = requireGit(processRunner, projectPath, ["rev-parse", "HEAD"]);
    const status = requireGit(processRunner, projectPath, ["status", "--porcelain=v1", "--untracked-files=all"]);
    if (status) throw new Error(`Git baseline worktree is not clean: ${status}`);
    const remotes = requireGit(processRunner, projectPath, ["remote"]);
    if (remotes) throw new Error("Generated project baseline must not configure Git remotes.");
    return gitBaselineResultSchema.parse({
      schemaVersion: 1,
      projectId,
      status: "passed",
      commitSha,
      commitMessage: "Forge project baseline",
      cleanWorktree: true,
      remoteCount: 0,
      committedAt,
    });
  };
}

export function requireCleanGeneratedProjectGit(
  projectPath: string,
  processRunner: ProjectProcessRunner = runProjectProcess,
): void {
  const status = requireGit(processRunner, projectPath, ["status", "--porcelain=v1", "--untracked-files=all"]);
  if (status) throw new Error(`Generated project worktree is not clean: ${status}`);
  const remotes = requireGit(processRunner, projectPath, ["remote"]);
  if (remotes) throw new Error("Generated project unexpectedly has a Git remote.");
}
