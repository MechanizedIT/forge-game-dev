import { readFile } from "node:fs/promises";
import path from "node:path";

import type { PreparedQuestBundle } from "../quests/prepared-enemy-targeting.js";

export interface BoundedQuestContext {
  allowedChangeFiles: string[];
  contextFiles: Array<{ path: string; contents: string }>;
  prompt: string;
}

function resolveInside(root: string, relativePath: string): string {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, relativePath);
  const relative = path.relative(resolvedRoot, resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Context path escapes the demo workspace: ${relativePath}`);
  }
  return resolved;
}

export async function buildBoundedQuestContext(
  bundle: PreparedQuestBundle,
  workspacePath: string,
): Promise<BoundedQuestContext> {
  const contextFiles = await Promise.all(
    bundle.quest.contextFiles.map(async (filePath) => ({
      path: filePath.replaceAll("\\", "/"),
      contents: await readFile(resolveInside(workspacePath, filePath), "utf8"),
    })),
  );
  const allowedChangeFiles = [
    ...new Set(bundle.plan.steps.flatMap((step) => step.files.map((file) => file.replaceAll("\\", "/")))),
  ].sort();
  const contextPaths = new Set(contextFiles.map((file) => file.path));
  for (const allowedFile of allowedChangeFiles) {
    if (!contextPaths.has(allowedFile)) {
      throw new Error(`Approved change file is missing from bounded context: ${allowedFile}`);
    }
  }

  const prompt = [
    "You are implementing one approved Forge quest in a bounded Godot demo workspace.",
    "Implement the approved plan now. Do not merely propose another plan.",
    `You may modify only these files: ${allowedChangeFiles.join(", ")}.`,
    "Do not modify .forge metadata, create commits, use the network, add dependencies, or touch files outside this workspace.",
    "For the Enemy-to-Player scene reference, use an exported NodePath and resolve it after the scene enters the tree (for example with get_node_or_null). Do not assign a NodePath value to a directly exported CharacterBody2D or Node field.",
    "Forge will run the approved verification commands after your turn. Finish with a concise implementation summary.",
    "",
    "QUEST JSON",
    JSON.stringify(bundle.quest, null, 2),
    "",
    "APPROVED PLAN JSON",
    JSON.stringify(bundle.plan, null, 2),
    "",
    "BOUNDED CONTEXT FILES",
    ...contextFiles.flatMap((file) => [
      `--- ${file.path} ---`,
      file.contents,
    ]),
  ].join("\n");

  return { allowedChangeFiles, contextFiles, prompt };
}
