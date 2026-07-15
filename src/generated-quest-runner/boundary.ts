import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import path from "node:path";

import {
  generatedInventoryEntrySchema,
  type GeneratedAllowedFile,
} from "../contracts/index.js";

const excludedDirectoryPaths = new Set([".git", ".godot", ".forge/local", "node_modules"]);
const allowedUntrackedPaths = new Set([".forge/idea-seeds.json"]);
const allowedWorkExtensions = new Set([".gd", ".tscn", ".tres", ".gdshader", ".gdshaderinc"]);
const protectedWorkRoots = [".forge", ".git", ".godot", "addons", "node_modules"];

export interface GitStartState {
  baselineHead: string;
  startHead: string;
}

export interface BoundaryReview {
  passed: boolean;
  changedFiles: string[];
  observedPostHashes: Record<string, string>;
  problems: string[];
}

function relativePosix(root: string, target: string): string {
  return path.relative(root, target).replaceAll("\\", "/");
}

function isContained(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function excluded(relativePath: string): boolean {
  for (const directory of excludedDirectoryPaths) {
    if (relativePath === directory || relativePath.startsWith(`${directory}/`)) return true;
  }
  return false;
}

function normalizedWorkPath(relativePath: string): string {
  const normalized = relativePath.replaceAll("\\", "/");
  if (normalized !== relativePath || normalized.startsWith("./") || normalized.includes("//")) {
    throw new Error(`Approved path is not normalized: ${relativePath}`);
  }
  if (normalized === "project.godot" || protectedWorkRoots.some((root) => normalized === root || normalized.startsWith(`${root}/`))) {
    throw new Error(`Approved path is protected: ${relativePath}`);
  }
  if (normalized.includes("verification-profiles/") || /(?:^|\/)verif(?:y|ier|ication)[^/]*\.(?:gd|ts|js)$/iu.test(normalized)) {
    throw new Error(`Approved path is verifier code: ${relativePath}`);
  }
  const extension = [...allowedWorkExtensions].find((candidate) => normalized.endsWith(candidate));
  if (!extension) throw new Error(`Approved path is not a supported Godot text file: ${relativePath}`);
  return normalized;
}

export function sha256(contents: string | Buffer): string {
  return createHash("sha256").update(contents).digest("hex");
}

export async function readContainedUtf8File(
  projectPath: string,
  relativePath: string,
  maximumBytes = 120_000,
): Promise<{ contents: string; sha256: string; size: number }> {
  normalizedWorkPath(relativePath);
  const root = await realpath(path.resolve(projectPath));
  const target = path.resolve(root, relativePath);
  if (!isContained(root, target)) throw new Error(`Allowed file escapes the project: ${relativePath}`);
  const info = await lstat(target).catch(() => null);
  if (!info?.isFile() || info.isSymbolicLink()) throw new Error(`Allowed file is missing or unsafe: ${relativePath}`);
  const canonical = await realpath(target);
  if (canonical !== target || !isContained(root, canonical)) throw new Error(`Allowed file moved outside the project: ${relativePath}`);
  if (info.size > maximumBytes) throw new Error(`Allowed file exceeds the bounded text limit: ${relativePath}`);
  const bytes = await readFile(canonical);
  let contents: string;
  try {
    contents = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`Allowed file is not valid UTF-8: ${relativePath}`);
  }
  if (contents.includes("\0")) throw new Error(`Allowed file contains binary data: ${relativePath}`);
  return { contents, sha256: sha256(bytes), size: bytes.length };
}

export async function validateExpectedAbsentWorkFile(projectPath: string, relativePath: string): Promise<void> {
  normalizedWorkPath(relativePath);
  const root = await realpath(path.resolve(projectPath));
  const target = path.resolve(root, relativePath);
  if (!isContained(root, target)) throw new Error(`Approved new file escapes the project: ${relativePath}`);
  const existing = await lstat(target).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (existing !== null) throw new Error(`Approved new file already exists: ${relativePath}`);
  const parent = path.dirname(target);
  const parentInfo = await lstat(parent).catch(() => null);
  if (!parentInfo?.isDirectory() || parentInfo.isSymbolicLink()) throw new Error(`Approved new file has a missing or unsafe parent: ${relativePath}`);
  const canonicalParent = await realpath(parent);
  if (canonicalParent !== parent || !isContained(root, canonicalParent)) throw new Error(`Approved new file parent escapes the project: ${relativePath}`);
}

export async function captureControlledInventory(projectPath: string): Promise<Array<{
  relativePath: string;
  sha256: string;
  size: number;
}>> {
  const root = await realpath(path.resolve(projectPath));
  const entries: Array<{ relativePath: string; sha256: string; size: number }> = [];
  const walk = async (current: string): Promise<void> => {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      const relativePath = relativePosix(root, target);
      if (excluded(relativePath)) continue;
      if (entry.isSymbolicLink()) throw new Error(`Generated project contains an unsafe link: ${relativePath}`);
      if (entry.isDirectory()) {
        await walk(target);
      } else if (entry.isFile()) {
        const bytes = await readFile(target);
        entries.push(generatedInventoryEntrySchema.parse({
          relativePath,
          sha256: sha256(bytes),
          size: bytes.length,
        }));
      } else {
        throw new Error(`Generated project contains an unsupported filesystem entry: ${relativePath}`);
      }
    }
  };
  await walk(root);
  return entries.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

export function runGit(projectPath: string, args: string[], allowFailure = false): string {
  const result = spawnSync("git", args, { cwd: projectPath, encoding: "utf8", windowsHide: true });
  if (result.error) throw result.error;
  if (!allowFailure && (result.status ?? 1) !== 0) {
    throw new Error(`Git ${args[0] ?? "command"} failed: ${(result.stderr || result.stdout).trim()}`);
  }
  return (result.stdout ?? "").trim();
}

export function inspectCleanGitStart(projectPath: string, baselineHead: string): GitStartState {
  const startHead = runGit(projectPath, ["rev-parse", "HEAD"]);
  const ancestor = spawnSync("git", ["merge-base", "--is-ancestor", baselineHead, startHead], {
    cwd: projectPath,
    encoding: "utf8",
    windowsHide: true,
  });
  if ((ancestor.status ?? 1) !== 0) throw new Error("The verified Forge baseline is not an ancestor of the current project HEAD.");
  if (runGit(projectPath, ["remote"], true).trim() !== "") throw new Error("Generated quest execution requires a local project with no Git remotes.");
  const tracked = spawnSync("git", ["diff", "--quiet", "--exit-code"], { cwd: projectPath, windowsHide: true });
  const staged = spawnSync("git", ["diff", "--cached", "--quiet", "--exit-code"], { cwd: projectPath, windowsHide: true });
  if ((tracked.status ?? 1) !== 0 || (staged.status ?? 1) !== 0) throw new Error("Generated quest execution requires a clean tracked index and worktree.");
  const status = runGit(projectPath, ["status", "--porcelain", "--untracked-files=all"], true)
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => line.slice(3).replaceAll("\\", "/"))
    .filter((item) => !allowedUntrackedPaths.has(item) && !excluded(item));
  if (status.length > 0) throw new Error(`Generated quest execution found unapproved local paths: ${status.join(", ")}`);
  return { baselineHead, startHead };
}

export async function reviewBoundary(options: {
  projectPath: string;
  startHead: string;
  startInventory: Awaited<ReturnType<typeof captureControlledInventory>>;
  allowedFiles: GeneratedAllowedFile[];
}): Promise<BoundaryReview> {
  const currentHead = runGit(options.projectPath, ["rev-parse", "HEAD"]);
  const currentInventory = await captureControlledInventory(options.projectPath);
  const before = new Map(options.startInventory.map((entry) => [entry.relativePath, entry]));
  const after = new Map(currentInventory.map((entry) => [entry.relativePath, entry]));
  const allowed = new Set(options.allowedFiles.map((file) => file.relativePath));
  const approvedNew = new Set(options.allowedFiles.filter((file) => "kind" in file && file.kind === "new").map((file) => file.relativePath));
  const changed = new Set<string>();
  const observedPostHashes: Record<string, string> = {};
  const problems: string[] = [];
  if (currentHead !== options.startHead) problems.push("Project HEAD changed during Codex execution.");
  for (const relativePath of new Set([...before.keys(), ...after.keys()])) {
    const left = before.get(relativePath);
    const right = after.get(relativePath);
    if (!left) {
      if (!right || !approvedNew.has(relativePath)) problems.push(`New file is outside the approved boundary: ${relativePath}`);
      else {
        changed.add(relativePath);
        observedPostHashes[relativePath] = right.sha256;
      }
    }
    else if (!right) problems.push(`File was deleted: ${relativePath}`);
    else if (left.sha256 !== right.sha256) {
      changed.add(relativePath);
      if (!allowed.has(relativePath)) problems.push(`Unapproved file changed: ${relativePath}`);
      else observedPostHashes[relativePath] = right.sha256;
    }
  }
  const nameStatus = runGit(options.projectPath, ["status", "--porcelain", "--untracked-files=all"], true);
  for (const line of nameStatus.split(/\r?\n/u).filter(Boolean)) {
    const untracked = line.startsWith("?? ");
    const worktreeModified = line.startsWith(" M ") || line.startsWith("M ");
    const relativePath = line.slice(untracked || line.startsWith(" M ") ? 3 : 2).replaceAll("\\", "/");
    const acceptedExisting = worktreeModified && allowed.has(relativePath) && !approvedNew.has(relativePath);
    const acceptedNew = untracked && approvedNew.has(relativePath);
    const ignoredOwned = allowedUntrackedPaths.has(relativePath) || excluded(relativePath);
    if (!acceptedExisting && !acceptedNew && !ignoredOwned) {
      problems.push(`Git reported an unapproved change: ${line}`);
    }
  }
  if (changed.size === 0) problems.push("Codex completed without changing an approved file.");
  if ([...changed].some((item) => !allowed.has(item))) {
    // The detailed path problem above is the authority; this branch keeps the verdict explicit.
  }
  return {
    passed: problems.length === 0,
    changedFiles: [...changed].filter((item) => allowed.has(item)).sort(),
    observedPostHashes,
    problems,
  };
}
