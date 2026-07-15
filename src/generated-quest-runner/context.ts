import type { GeneratedQuestImplementationContract } from "../contracts/index.js";
import { readContainedUtf8File } from "./boundary.js";

export const GENERATED_CONTEXT_CHARACTER_LIMIT = 40_000;

export interface GeneratedQuestContext {
  prompt: string;
  characterCount: number;
  files: Array<{ relativePath: string; sha256: string; characters: number }>;
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
  const contents = await Promise.all(contract.allowedFiles.map(async (allowed) => {
    const file = await readContainedUtf8File(projectPath, allowed.relativePath);
    if (file.sha256 !== allowed.preSha256) throw new Error(`Approved file changed after contract preparation: ${allowed.relativePath}`);
    return { allowed, ...file };
  }));
  const scene = contents.find((item) => item.allowed.role === "main_scene");
  const sceneNodes = scene ? sceneNodeSummary(scene.contents) : [];
  const prompt = [
    "Implement one approved Forge generated quest now. Do not propose another plan.",
    `Visible result: ${contract.visibleOutcome}`,
    `Why it matters: ${contract.whyItMatters}`,
    `You may modify only these existing files: ${contract.allowedFiles.map((item) => item.relativePath).join(", ")}.`,
    "Do not create, delete, rename, move, or link files. Do not edit .forge, .git, .godot, dependencies, caches, project settings, verifier code, or another project.",
    "Do not run Godot, Git, package managers, downloads, or network commands. Forge owns verification and Git outside your sandbox.",
    "Preserve the node name ObjectiveMarker and its existing script path so the controlled starter verifier remains valid.",
    "Expose exactly one stable mechanic observable by adding metadata forge_role = \"gravity_orb\" to the existing ObjectiveMarker node.",
    "Make the visible objective copy and code-native drawing clearly describe one gravity orb. Do not add gravity interaction in this quest.",
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
    files: contents.map((item) => ({
      relativePath: item.allowed.relativePath,
      sha256: item.sha256,
      characters: item.contents.length,
    })),
    sceneNodes,
  };
}
