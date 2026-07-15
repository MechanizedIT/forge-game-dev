import { lstat, readFile, rename, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import type { GeneratedAllowedFile, GeneratedQuestRunJournal } from "../contracts/index.js";
import { readContainedUtf8File, runGit, sha256, validateExpectedAbsentWorkFile } from "./boundary.js";

export interface GeneratedPreimage {
  relativePath: string;
  sha256: string;
  contentsBase64: string;
  kind?: "existing";
}

export interface GeneratedAbsentPreimage {
  relativePath: string;
  kind: "new";
  expectedAbsent: true;
}

export interface GeneratedPreimageBundle {
  runId: string;
  files: Array<GeneratedPreimage | GeneratedAbsentPreimage>;
  schemaVersion?: 2;
}

export class GeneratedConcurrentEditError extends Error {
  constructor(readonly paths: string[]) {
    super(`Automatic recovery refused because these files changed after Forge reviewed them: ${paths.join(", ")}`);
    this.name = "GeneratedConcurrentEditError";
  }
}

async function writeBufferAtomic(filePath: string, contents: Buffer): Promise<void> {
  const temporaryPath = `${filePath}.${process.pid}-${Date.now()}.tmp`;
  try {
    await writeFile(temporaryPath, contents, { flag: "wx" });
    await rename(temporaryPath, filePath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

export async function captureGeneratedPreimages(
  projectPath: string,
  runId: string,
  allowedFiles: GeneratedAllowedFile[],
): Promise<GeneratedPreimageBundle> {
  const files = await Promise.all(allowedFiles.map(async (allowed) => {
    if ("kind" in allowed && allowed.kind === "new") {
      await validateExpectedAbsentWorkFile(projectPath, allowed.relativePath);
      return { relativePath: allowed.relativePath, kind: "new" as const, expectedAbsent: true as const };
    }
    const file = await readContainedUtf8File(projectPath, allowed.relativePath);
    if (!("preSha256" in allowed) || file.sha256 !== allowed.preSha256) throw new Error(`Preimage hash changed before capture: ${allowed.relativePath}`);
    const bytes = await readFile(path.join(projectPath, allowed.relativePath));
    return {
      relativePath: allowed.relativePath,
      sha256: file.sha256,
      contentsBase64: bytes.toString("base64"),
      ...("kind" in allowed ? { kind: "existing" as const } : {}),
    };
  }));
  return allowedFiles.some((allowed) => "kind" in allowed) ? { schemaVersion: 2, runId, files } : { runId, files };
}

export async function exactRollbackGeneratedRun(options: {
  journal: GeneratedQuestRunJournal;
  preimages: GeneratedPreimageBundle;
}): Promise<string[]> {
  const { journal } = options;
  if (options.preimages.runId !== journal.runId) throw new Error("Rollback preimages belong to another generated run.");
  if (runGit(journal.canonicalProjectPath, ["rev-parse", "HEAD"]) !== journal.startHead) {
    throw new GeneratedConcurrentEditError(["<project HEAD>"]);
  }
  const preimages = new Map(options.preimages.files.map((item) => [item.relativePath, item]));
  const concurrent: string[] = [];
  for (const relativePath of journal.changedFiles) {
    const expected = journal.observedPostHashes[relativePath];
    const info = await lstat(path.join(journal.canonicalProjectPath, relativePath)).catch(() => null);
    if (!expected || !info?.isFile() || info.isSymbolicLink()) {
      concurrent.push(relativePath);
      continue;
    }
    const current = sha256(await readFile(path.join(journal.canonicalProjectPath, relativePath)));
    if (current !== expected || !preimages.has(relativePath)) concurrent.push(relativePath);
  }
  if (concurrent.length > 0) throw new GeneratedConcurrentEditError(concurrent.sort());
  for (const relativePath of journal.changedFiles) {
    const preimage = preimages.get(relativePath)!;
    if (preimage.kind === "new") {
      await unlink(path.join(journal.canonicalProjectPath, relativePath));
      continue;
    }
    const bytes = Buffer.from(preimage.contentsBase64, "base64");
    if (sha256(bytes) !== preimage.sha256) throw new Error(`Rollback preimage is corrupt: ${relativePath}`);
    await writeBufferAtomic(path.join(journal.canonicalProjectPath, relativePath), bytes);
  }
  for (const relativePath of journal.changedFiles) {
    const preimage = preimages.get(relativePath)!;
    if (preimage.kind === "new") {
      if (await lstat(path.join(journal.canonicalProjectPath, relativePath)).catch(() => null)) throw new Error(`Rollback deletion failed: ${relativePath}`);
      continue;
    }
    const restored = sha256(await readFile(path.join(journal.canonicalProjectPath, relativePath)));
    if (restored !== preimage.sha256) throw new Error(`Rollback verification failed: ${relativePath}`);
  }
  return [...journal.changedFiles].sort();
}

export async function assessGeneratedRecovery(journal: GeneratedQuestRunJournal): Promise<{
  action: "none" | "resume" | "retry" | "rollback" | "manual";
  message: string;
  concurrentPaths: string[];
}> {
  const currentHead = runGit(journal.canonicalProjectPath, ["rev-parse", "HEAD"], true);
  if (currentHead !== journal.startHead && journal.phase !== "completed") {
    return { action: "manual", message: "Project HEAD changed after this run began; Forge preserved the project for explicit recovery.", concurrentPaths: ["<project HEAD>"] };
  }
  if (journal.phase === "contract_review" || journal.phase === "approved") {
    return { action: "resume", message: "The reviewed contract is intact and can resume safely.", concurrentPaths: [] };
  }
  if (journal.phase === "waiting_for_playtest") {
    return { action: "resume", message: "Automated proof passed; resume with the real creator playtest.", concurrentPaths: [] };
  }
  if (journal.changedFiles.length === 0) {
    return { action: "retry", message: "No approved game file changed; the run can be retried or cancelled.", concurrentPaths: [] };
  }
  const concurrent: string[] = [];
  for (const relativePath of journal.changedFiles) {
    const expected = journal.observedPostHashes[relativePath];
    const info = await lstat(path.join(journal.canonicalProjectPath, relativePath)).catch(() => null);
    if (!expected || !info?.isFile() || info.isSymbolicLink()) {
      concurrent.push(relativePath);
      continue;
    }
    const current = sha256(await readFile(path.join(journal.canonicalProjectPath, relativePath)));
    if (current !== expected) concurrent.push(relativePath);
  }
  return concurrent.length > 0
    ? { action: "manual", message: "Files changed after Forge reviewed the run; automatic rollback is unsafe.", concurrentPaths: concurrent.sort() }
    : { action: "rollback", message: "The reviewed generated-run changes remain exact and can be rolled back safely.", concurrentPaths: [] };
}
