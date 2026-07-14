import { lstat, mkdir, realpath, rm } from "node:fs/promises";
import path from "node:path";

const windowsReservedNames = new Set([
  "con", "prn", "aux", "nul",
  "com1", "com2", "com3", "com4", "com5", "com6", "com7", "com8", "com9",
  "lpt1", "lpt2", "lpt3", "lpt4", "lpt5", "lpt6", "lpt7", "lpt8", "lpt9",
]);

export interface ProjectRoots {
  forgeHome: string;
  projectsRoot: string;
  stagingRoot: string;
  failureRoot: string;
}

function isContained(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

async function ensureDirectOwnedDirectory(parent: string, name: string): Promise<string> {
  const target = path.join(parent, name);
  const existing = await lstat(target).catch(() => null);
  if (existing?.isSymbolicLink()) throw new Error(`Refusing Forge directory link or junction: ${target}`);
  if (existing && !existing.isDirectory()) throw new Error(`Forge path is not a directory: ${target}`);
  if (!existing) await mkdir(target);
  const canonicalParent = await realpath(parent);
  const canonicalTarget = await realpath(target);
  if (!isContained(canonicalParent, canonicalTarget) || path.dirname(canonicalTarget) !== canonicalParent) {
    throw new Error(`Forge directory escaped its owner: ${target}`);
  }
  return canonicalTarget;
}

export async function prepareProjectRoots(forgeHomeValue: string): Promise<ProjectRoots> {
  const forgeHome = path.resolve(forgeHomeValue);
  await mkdir(forgeHome, { recursive: true });
  const homeStats = await lstat(forgeHome);
  if (homeStats.isSymbolicLink() || !homeStats.isDirectory()) {
    throw new Error(`Forge home must be a real directory: ${forgeHome}`);
  }
  const canonicalHome = await realpath(forgeHome);
  const projectsRoot = await ensureDirectOwnedDirectory(canonicalHome, "projects");
  const stagingRoot = await ensureDirectOwnedDirectory(projectsRoot, ".staging");
  const evidenceRoot = await ensureDirectOwnedDirectory(canonicalHome, "evidence");
  const failureRoot = await ensureDirectOwnedDirectory(evidenceRoot, "creation-failures");
  return { forgeHome: canonicalHome, projectsRoot, stagingRoot, failureRoot };
}

export function sanitizeProjectSlug(displayName: string): string {
  const normalized = displayName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 32)
    .replace(/-+$/gu, "");
  const safe = normalized || "game";
  return windowsReservedNames.has(safe) ? `forge-${safe}` : safe;
}

export function idSuffix(value: string): string {
  const suffix = value.toLowerCase().replace(/[^a-f0-9]/gu, "").slice(0, 10);
  if (suffix.length < 8) throw new Error("Forge could not allocate a safe project identifier.");
  return suffix;
}

export function assertDirectChild(root: string, target: string): void {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  if (!isContained(resolvedRoot, resolvedTarget) || path.dirname(resolvedTarget) !== resolvedRoot) {
    throw new Error(`Refusing an out-of-root project path: ${resolvedTarget}`);
  }
}

export async function safeRemoveOwnedDirectory(
  root: string,
  target: string,
  ownedPaths: ReadonlySet<string>,
): Promise<boolean> {
  const resolvedTarget = path.resolve(target);
  assertDirectChild(root, resolvedTarget);
  if (!ownedPaths.has(resolvedTarget)) throw new Error(`Refusing to remove an unowned path: ${resolvedTarget}`);
  const stats = await lstat(resolvedTarget).catch(() => null);
  if (!stats) return true;
  if (stats.isSymbolicLink() || !stats.isDirectory()) {
    throw new Error(`Refusing recursive cleanup of a link or non-directory: ${resolvedTarget}`);
  }
  const canonicalRoot = await realpath(root);
  const canonicalTarget = await realpath(resolvedTarget);
  assertDirectChild(canonicalRoot, canonicalTarget);
  await rm(resolvedTarget, { recursive: true, force: false });
  return true;
}
