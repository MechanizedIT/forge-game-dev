import type { GeneratedQuestImplementationContract } from "../contracts/index.js";
import { readContainedUtf8File } from "./boundary.js";
import { generatedProfileCatalog } from "./profiles.js";

export const GENERATED_CONTEXT_CHARACTER_LIMIT = 40_000;

export interface GeneratedQuestContext {
  prompt: string;
  characterCount: number;
  files: Array<{ relativePath: string; kind?: "existing" | "new"; sha256: string | null; characters: number }>;
  sceneNodes: string[];
}

function sceneNodeSummary(contents: string): string[] {
  return contents.split(/\r?\n/u)
    .filter((line) => /^\[node\s/u.test(line))
    .slice(0, 40)
    .map((line) => line.slice(0, 240));
}

export async function buildGeneratedQuestContext(
  projectPath: string,
  contract: GeneratedQuestImplementationContract,
): Promise<GeneratedQuestContext> {
  if (contract.schemaVersion === 1) {
    const contents = await Promise.all(contract.allowedFiles.map(async (allowed) => {
      const file = await readContainedUtf8File(projectPath, allowed.relativePath);
      if (file.sha256 !== allowed.preSha256) throw new Error(`Approved file changed after contract preparation: ${allowed.relativePath}`);
      return { allowed, ...file };
    }));
    const scene = contents.find((item) => item.allowed.role === "main_scene");
    const profile = generatedProfileCatalog[contract.verificationProfile];
    const sceneNodes = scene ? sceneNodeSummary(scene.contents) : [];
    const prompt = [
      "Implement one approved Forge generated quest now. Do not propose another plan.",
      `Visible result: ${contract.visibleOutcome}`,
      `Why it matters: ${contract.whyItMatters}`,
      `You may modify only these existing files: ${contract.allowedFiles.map((item) => item.relativePath).join(", ")}.`,
      "Do not create, delete, rename, move, or link files. Do not edit .forge, .git, .godot, dependencies, caches, project settings, verifier code, or another project.",
      "Do not run Godot, Git, package managers, downloads, or network commands. Forge owns verification and Git outside your sandbox.",
      "Preserve the node name ObjectiveMarker and its existing script path so the controlled starter verifier remains valid.",
      ...profile.contextInstructions,
      "Finish with a concise implementation summary; your summary is not proof.",
      "",
      "APPROVED CONTRACT",
      JSON.stringify(contract, null, 2),
      "",
      "RELEVANT SCENE/NODE SUMMARY",
      sceneNodes.join("\n"),
      "",
      "EXACT APPROVED FILES",
      ...contents.flatMap((item) => [
        `--- ${item.allowed.relativePath} · sha256 ${item.sha256} ---`,
        item.contents,
      ]),
    ].join("\n");
    if (prompt.length > GENERATED_CONTEXT_CHARACTER_LIMIT) {
      throw new Error(`Generated quest context is ${prompt.length} characters; the limit is ${GENERATED_CONTEXT_CHARACTER_LIMIT}.`);
    }
    return {
      prompt,
      characterCount: prompt.length,
      files: contents.map((item) => ({ relativePath: item.allowed.relativePath, sha256: item.sha256, characters: item.contents.length })),
      sceneNodes,
    };
  }
  const contents = await Promise.all(contract.allowedFiles.filter((allowed) => !("kind" in allowed) || allowed.kind === "existing").map(async (allowed) => {
    const file = await readContainedUtf8File(projectPath, allowed.relativePath);
    if (!("preSha256" in allowed) || file.sha256 !== allowed.preSha256) throw new Error(`Approved file changed after contract preparation: ${allowed.relativePath}`);
    return { allowed, ...file };
  }));
  const newFiles = contract.allowedFiles.filter((allowed) => "kind" in allowed && allowed.kind === "new");
  const scene = contents.find((item) => ("role" in item.allowed && item.allowed.role === "main_scene") || item.allowed.relativePath.endsWith(".tscn"));
  const profile = contract.verificationProfile ? generatedProfileCatalog[contract.verificationProfile] : null;
  const sceneNodes = scene ? sceneNodeSummary(scene.contents) : [];
  const prompt = [
    "Implement one approved Forge generated quest now. Do not propose another plan.",
    `Visible result: ${contract.visibleOutcome}`,
    `Why it matters: ${contract.whyItMatters}`,
    `You may change only these approved files: ${contract.allowedFiles.map((item) => item.relativePath).join(", ")}.`,
    `Approved existing files: ${contents.map((item) => item.allowed.relativePath).join(", ") || "none"}.`,
    `Approved new UTF-8 files: ${newFiles.map((item) => item.relativePath).join(", ") || "none"}.`,
    "Do not create any other file. Do not delete, rename, move, or link files. Do not edit .forge, .git, .godot, project.godot, add-ons, dependencies, caches, verifier code, or another project.",
    "Do not run Godot, Git, package managers, downloads, or network commands. Forge owns verification and Git outside your sandbox.",
    ...(profile ? profile.contextInstructions : []),
    ...(contract.schemaVersion === 2 ? ["If another file is truly required, make no more writes and finish with exactly one line: FORGE_SCOPE_REQUEST {\"paths\":[\"project/relative/path.gd\"],\"reason\":\"plain reason\"}"] : []),
    "Finish with a concise implementation summary; your summary is not proof.",
    "",
    "APPROVED CONTRACT",
    JSON.stringify(contract, null, 2),
    "",
    "RELEVANT SCENE/NODE SUMMARY",
    sceneNodes.join("\n"),
    "",
    "EXACT APPROVED FILES",
    ...contents.flatMap((item) => [
      `--- ${item.allowed.relativePath} · sha256 ${item.sha256} ---`,
      item.contents,
    ]),
    ...newFiles.map((item) => `--- ${item.relativePath} · approved new UTF-8 file; expected absent ---`),
  ].join("\n");
  if (prompt.length > GENERATED_CONTEXT_CHARACTER_LIMIT) {
    throw new Error(`Generated quest context is ${prompt.length} characters; the limit is ${GENERATED_CONTEXT_CHARACTER_LIMIT}.`);
  }
  return {
    prompt,
    characterCount: prompt.length,
    files: [
      ...contents.map((item) => ({
      relativePath: item.allowed.relativePath,
      kind: "existing" as const,
      sha256: item.sha256,
      characters: item.contents.length,
      })),
      ...newFiles.map((item) => ({ relativePath: item.relativePath, kind: "new" as const, sha256: null, characters: 0 })),
    ],
    sceneNodes,
  };
}
