import { acceptedSystemQuestPlanSchema, acceptedSystemRoadmapSchema, type GeneratedQuestImplementationContract } from "../contracts/index.js";
import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { readContainedUtf8File } from "./boundary.js";
import { generatedProfileCatalog } from "./profiles.js";
import { ArchitectureService, type ArchitectureContextPackage } from "../project-architecture/service.js";

export const GENERATED_CONTEXT_CHARACTER_LIMIT = 40_000;

export interface GeneratedQuestContext {
  prompt: string;
  characterCount: number;
  files: Array<{ relativePath: string; kind?: "existing" | "new"; sha256: string | null; characters: number }>;
  sceneNodes: string[];
  architectureContext: ArchitectureContextPackage | null;
  contextSummary: {
    primaryArea: string | null;
    secondaryAreas: string[];
    relatedPreviousSteps: string[];
    selectedFiles: string[];
    regressionChecks: string[];
  };
}

async function planningNarrative(projectPath: string, projectId: string, questId: string): Promise<{
  experience: { title: string; outcome: string } | null;
  creatorNotes: string;
}> {
  const load = async (relativePath: string): Promise<unknown | null> => {
    const target = path.join(projectPath, relativePath);
    const info = await lstat(target).catch(() => null);
    if (!info) return null;
    if (!info.isFile() || info.isSymbolicLink() || await realpath(target) !== target) throw new Error(`Forge planning context is unsafe: ${relativePath}`);
    return JSON.parse(await readFile(target, "utf8")) as unknown;
  };
  const [roadmapValue, planValue] = await Promise.all([load(".forge/system-roadmap.json"), load(".forge/system-quests.json")]);
  if (!roadmapValue || !planValue) return { experience: null, creatorNotes: "" };
  const roadmap = acceptedSystemRoadmapSchema.parse(roadmapValue);
  const plan = acceptedSystemQuestPlanSchema.parse(planValue);
  if (roadmap.projectId !== projectId || plan.projectId !== projectId) throw new Error("Forge planning context belongs to another project.");
  const batch = plan.systems.find((system) => system.quests.some((quest) => quest.questId === questId));
  const experience = batch ? roadmap.systems.find((system) => system.systemId === batch.systemId) ?? null : null;
  return { experience: experience ? { title: experience.title, outcome: experience.outcome } : null, creatorNotes: batch?.creatorDescription ?? "" };
}

function contextSummary(context: ArchitectureContextPackage | null, selectedFiles: string[]): GeneratedQuestContext["contextSummary"] {
  return {
    primaryArea: context?.primaryArea?.name ?? null,
    secondaryAreas: context?.secondaryAreas.map((area) => area.name) ?? [],
    relatedPreviousSteps: context?.relatedPreviousSteps.map((step) => step.stepId) ?? [],
    selectedFiles,
    regressionChecks: context?.regressionChecks ?? [],
  };
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
  const selectedFiles = contract.allowedFiles.map((item) => item.relativePath);
  const architecture = await new ArchitectureService().load(projectPath, contract.projectId);
  const architectureContext = architecture ? new ArchitectureService().selectContext(architecture, contract.questId, selectedFiles) : null;
  const narrative = await planningNarrative(projectPath, contract.projectId, contract.questId);
  const focusedContext = architectureContext ? {
    currentStep: { requestedChange: contract.repairRequest ?? contract.visibleOutcome, successCriteria: contract.acceptanceCriteria.map((criterion) => criterion.criterion), creatorNotes: narrative.creatorNotes },
    relatedExperience: narrative.experience,
    primaryGameArea: architectureContext.primaryArea,
    secondaryGameAreas: architectureContext.secondaryAreas,
    relatedPreviousSteps: architectureContext.relatedPreviousSteps,
    selectedFiles: architectureContext.selectedFiles,
    verification: { targetedChecks: architectureContext.regressionChecks, projectConstraints: architectureContext.projectConstraints },
    limits: architectureContext.limits,
  } : null;
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
      ...(contract.repairRequest ? ["Repair the failed result for this same Step. Do not create or plan another Step.", `Repair request: ${contract.repairRequest}`] : []),
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
      ...(focusedContext ? ["", "FOCUSED FORGE CONTEXT", JSON.stringify(focusedContext, null, 2)] : []),
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
      architectureContext,
      contextSummary: contextSummary(architectureContext, selectedFiles),
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
    ...(contract.repairRequest ? ["Repair the failed result for this same Step. Do not create or plan another Step.", `Repair request: ${contract.repairRequest}`] : []),
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
    ...(focusedContext ? ["", "FOCUSED FORGE CONTEXT", JSON.stringify(focusedContext, null, 2)] : []),
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
    architectureContext,
    contextSummary: contextSummary(architectureContext, selectedFiles),
  };
}
