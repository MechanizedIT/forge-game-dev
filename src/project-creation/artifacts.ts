import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { z } from "zod";

import {
  chronicleSchema,
  chronicleV2Schema,
  acceptedRoadmapProvenanceSchema,
  firstPlayableMilestoneSchema,
  gameBlueprintSchema,
  gameVisionSchema,
  generatedProjectManifestSchema,
  generatedProjectStateSchema,
  generatedProjectStateV2Schema,
  generatedQuestArtifactSchema,
  generatedQuestArtifactV2Schema,
  generatedRoadmapV2Schema,
  planningProvenanceSchema,
  roadmapSchema,
  starterManifestSchema,
  type GameBlueprint,
  type GeneratedQuestArtifact,
  type GeneratedQuestArtifactV2,
  type StarterManifest,
} from "../contracts/index.js";
import { writeJsonAtomic, writeTextAtomic } from "../quest-runner/artifacts.js";
import type { ApprovedBlueprintEnvelope } from "./shared.js";
import { sanitizeProjectSlug } from "./filesystem.js";

export interface GeneratedArtifactResult {
  questIds: string[];
  portableJsonPaths: string[];
}

async function writeValidated<T>(filePath: string, schema: z.ZodType<T>, value: unknown): Promise<void> {
  const parsed = schema.parse(value);
  await writeJsonAtomic(filePath, parsed);
  schema.parse(JSON.parse(await readFile(filePath, "utf8")) as unknown);
}

function questId(title: string, index: number): string {
  return `q${index + 1}-${sanitizeProjectSlug(title).slice(0, 28).replace(/-+$/u, "")}`;
}

function questArtifact(
  blueprint: GameBlueprint,
  projectId: string,
  referenceMap: ReadonlyMap<string, string>,
  index: number,
): GeneratedQuestArtifact {
  const quest = blueprint.quests[index]!;
  const id = referenceMap.get(quest.reference)!;
  const criteria = blueprint.acceptanceCriteria.filter((item) => item.questReference === quest.reference);
  const verification = blueprint.verificationIdeas.filter((item) => item.questReference === quest.reference);
  return generatedQuestArtifactSchema.parse({
    schemaVersion: 1,
    projectId,
    questId: id,
    sequence: index + 1,
    title: quest.title,
    visibleOutcome: quest.visibleOutcome,
    dependsOn: quest.dependencies.map((reference) => referenceMap.get(reference)!),
    scope: { included: blueprint.includedScope, excluded: blueprint.excludedScope },
    acceptanceCriteria: criteria.map((criterion) => ({
      id: criterion.reference,
      criterion: criterion.criterion,
      verificationIds: criterion.verificationReferences,
    })),
    verificationIdeas: verification.map((idea) => ({ id: idea.reference, idea: idea.idea })),
    implementation: "not_enabled",
  });
}

function renderQuestMarkdown(quest: GeneratedQuestArtifact): string {
  return `# ${quest.title}\n\n${quest.visibleOutcome}\n\n## Scope\n\nIncluded:\n${quest.scope.included.map((item) => `- ${item}`).join("\n")}\n\nExcluded:\n${quest.scope.excluded.map((item) => `- ${item}`).join("\n")}\n\n## Acceptance and proof\n\n${quest.acceptanceCriteria.map((criterion) => `- **${criterion.id}:** ${criterion.criterion}\n  - Proof: ${criterion.verificationIds.join(", ")}`).join("\n")}\n\nImplementation is not enabled in Task 5.\n`;
}

function questArtifactV2(
  envelope: ApprovedBlueprintEnvelope,
  projectId: string,
  referenceMap: ReadonlyMap<string, string>,
  index: number,
): GeneratedQuestArtifactV2 {
  const accepted = envelope.acceptedRoadmap!;
  const quest = accepted.quests[index]!;
  return generatedQuestArtifactV2Schema.parse({
    schemaVersion: 2,
    projectId,
    questId: referenceMap.get(quest.reference)!,
    revision: 1,
    sequence: index + 1,
    title: quest.title,
    visibleOutcome: quest.visibleOutcome,
    whyItMatters: quest.whyItMatters,
    currentPlayableFacts: quest.currentPlayableFacts,
    dependsOn: quest.dependsOn.map((reference) => referenceMap.get(reference)!),
    state: index === 0 ? "available" : "blocked",
    scope: quest.scope,
    acceptanceCriteria: quest.acceptanceCriteria,
    verificationIdeas: quest.verificationIdeas,
    editableFileRoles: quest.editableFileRoles,
    verificationProfile: quest.verificationProfile,
    implementation: "not_enabled",
  });
}

function renderQuestMarkdownV2(quest: GeneratedQuestArtifactV2): string {
  return `# ${quest.title}\n\n${quest.visibleOutcome}\n\n## Why it matters\n\n${quest.whyItMatters}\n\n## Already playable\n\n${quest.currentPlayableFacts.map((item) => `- ${item}`).join("\n")}\n\n## Delta scope\n\nIncluded:\n${quest.scope.included.map((item) => `- ${item}`).join("\n")}\n\nExcluded:\n${quest.scope.excluded.map((item) => `- ${item}`).join("\n")}\n\n## Acceptance and proof ideas\n\n${quest.acceptanceCriteria.map((criterion) => `- **${criterion.id}:** ${criterion.criterion}\n  - Proof idea: ${criterion.verificationIds.join(", ")}`).join("\n")}\n\nImplementation readiness: ${quest.verificationProfile ? `registered existing-file profile \`${quest.verificationProfile}\`` : "planned; no registered verifier"}.\n`;
}

export async function writeGeneratedProjectArtifacts(options: {
  projectPath: string;
  projectId: string;
  envelope: ApprovedBlueprintEnvelope;
  starter: StarterManifest;
  createdAt: string;
}): Promise<GeneratedArtifactResult> {
  const { projectPath, projectId, envelope, starter, createdAt } = options;
  const blueprint = gameBlueprintSchema.parse(envelope.blueprint);
  const forge = path.join(projectPath, ".forge");
  const starterAware = envelope.acceptedRoadmap !== undefined;
  const openFoundation = starter.foundation === "open_godot";
  const versionedRoadmap = starterAware || openFoundation;
  const planningQuests = openFoundation ? [] : starterAware ? envelope.acceptedRoadmap!.quests : blueprint.quests;
  const referenceMap = new Map(planningQuests.map((quest, index) => [quest.reference, questId(quest.title, index)]));
  const quests = openFoundation
    ? []
    : starterAware
    ? planningQuests.map((_, index) => questArtifactV2(envelope, projectId, referenceMap, index))
    : blueprint.quests.map((_, index) => questArtifact(blueprint, projectId, referenceMap, index));
  const questIds = quests.map((quest) => quest.questId);
  if (openFoundation) {
    await mkdir(path.join(forge, "quests"), { recursive: true });
    await mkdir(path.join(forge, "docs", "quests"), { recursive: true });
  }
  const jsonFiles: Array<[string, z.ZodType<unknown>, unknown]> = [
    [".forge/approved-game-blueprint.json", gameBlueprintSchema, blueprint],
    [".forge/game-vision.json", gameVisionSchema, {
      schemaVersion: 1, projectId, vision: blueprint.vision, coreAction: blueprint.coreAction,
      funTarget: blueprint.funTarget, inputMode: blueprint.inputMode,
      smallestPlayableResult: blueprint.smallestPlayableResult,
    }],
    [".forge/first-playable.json", firstPlayableMilestoneSchema, {
      schemaVersion: 1, projectId, title: "First Playable", outcome: blueprint.firstPlayableMilestone, questIds,
    }],
    [".forge/roadmap.json", versionedRoadmap ? generatedRoadmapV2Schema : roadmapSchema, {
      schemaVersion: versionedRoadmap ? 2 : 1,
      projectId, updatedAt: createdAt,
      quests: quests.map((quest, index) => ({
        questId: quest.questId,
        ...(versionedRoadmap ? { revision: 1 } : {}),
        title: quest.title, summary: quest.visibleOutcome,
        state: index === 0 ? "available" : versionedRoadmap ? "blocked" : "locked",
        dependsOn: quest.dependsOn, position: { column: index, row: 0 },
      })),
    }],
    [".forge/project-state.json", versionedRoadmap ? generatedProjectStateV2Schema : generatedProjectStateSchema, {
      schemaVersion: versionedRoadmap ? 2 : 1, projectId, currentView: "project_created", selectedQuestId: questIds[0] ?? null,
      ...(versionedRoadmap ? { nextRecommendedQuestId: questIds[0] ?? null } : {}), lastOpenedAt: createdAt,
    }],
    [".forge/chronicle.json", versionedRoadmap ? chronicleV2Schema : chronicleSchema, {
      schemaVersion: versionedRoadmap ? 2 : 1,
      projectId,
      entries: [{ entryId: "project-created-1", type: "project_created", occurredAt: createdAt, summary: blueprint.initialChronicleSummary }],
    }],
    [".forge/planning-provenance.json", planningProvenanceSchema, {
      schemaVersion: 1,
      projectId,
      model: envelope.provenance.model,
      reasoningEffort: envelope.provenance.reasoningEffort,
      sandbox: envelope.provenance.sandbox,
      network: envelope.provenance.network,
      sanitizedThreadId: envelope.provenance.threadId ? `${envelope.provenance.threadId.slice(0, 12)}…` : null,
      attempts: envelope.provenance.attempts,
      blueprintSha256: envelope.blueprintSha256,
      approvedAt: envelope.approvedAt,
      ...(envelope.proposal ? {
        originalIdea: envelope.proposal.originalIdea,
        recommendedInterpretation: envelope.proposal.recommendedInterpretation,
        foundationFit: envelope.proposal.foundationFit,
      } : {}),
    }],
    [".forge/starter-manifest.json", starterManifestSchema, starter],
    [".forge/project-manifest.json", generatedProjectManifestSchema, {
      schemaVersion: 1,
      projectId,
      displayName: blueprint.projectName,
      foundation: starter.foundation,
      createdAt,
      engine: { kind: "godot", version: "4.7", dimension: "2D", language: "GDScript", projectFile: "project.godot", mainScene: "res://scenes/main.tscn" },
      starter: { id: starter.starterId, version: starter.version, manifest: ".forge/starter-manifest.json" },
      artifacts: {
        approvedBlueprint: ".forge/approved-game-blueprint.json",
        ...(starterAware ? { acceptedRoadmap: ".forge/accepted-roadmap-provenance.json" } : {}),
        vision: ".forge/game-vision.json",
        firstPlayable: ".forge/first-playable.json",
        roadmap: ".forge/roadmap.json",
        questsDirectory: ".forge/quests",
        projectState: ".forge/project-state.json",
        chronicle: ".forge/chronicle.json",
        planningProvenance: ".forge/planning-provenance.json",
        localCreationProvenance: ".forge/local/creation-provenance.json",
        localGodotVerification: ".forge/local/godot-verification.json",
        localGitBaseline: ".forge/local/git-baseline.json",
      },
    }],
  ];
  if (starterAware) jsonFiles.push([".forge/accepted-roadmap-provenance.json", acceptedRoadmapProvenanceSchema, {
    schemaVersion: 1, projectId, acceptedRoadmap: envelope.acceptedRoadmap,
  }]);
  for (const quest of quests) jsonFiles.push([`.forge/quests/${quest.questId}.json`, starterAware ? generatedQuestArtifactV2Schema : generatedQuestArtifactSchema, quest]);
  for (const [relative, schema, value] of jsonFiles) await writeValidated(path.join(projectPath, relative), schema, value);

  await writeTextAtomic(path.join(projectPath, "PROJECT.md"), `# ${blueprint.projectName}\n\n${openFoundation ? "A new Forge-owned Godot project ready for the creator's idea." : blueprint.vision}\n\n## First playable\n\n${openFoundation ? "Shape the game into systems and small quests inside Forge." : blueprint.firstPlayableMilestone}\n\n## Foundation\n\nGodot 4 · 2D · GDScript · ${openFoundation ? "Open project" : "Top-down Arena"} · code-native visuals\n`);
  await writeTextAtomic(path.join(forge, "docs", "game-vision.md"), `# Game Vision\n\n${blueprint.vision}\n\n- **Core action:** ${blueprint.coreAction}\n- **Fun target:** ${blueprint.funTarget}\n- **Smallest playable result:** ${blueprint.smallestPlayableResult}\n`);
  await writeTextAtomic(path.join(forge, "docs", "first-playable.md"), `# First Playable\n\n${blueprint.firstPlayableMilestone}\n\nQuests: ${questIds.join(" → ")}\n`);
  await writeTextAtomic(path.join(forge, "docs", "roadmap.md"), `# Roadmap\n\n${starterAware ? `## Already playable\n\n${envelope.acceptedRoadmap!.alreadyPlayable.map((fact) => `- ${fact.statement}`).join("\n")}\n\n## Planned changes\n\n` : ""}${quests.map((quest, index) => `${index + 1}. **${quest.title}** — ${quest.visibleOutcome}`).join("\n")}\n`);
  await writeTextAtomic(path.join(forge, "docs", "chronicle.md"), `# Chronicle\n\n- ${createdAt} — ${blueprint.initialChronicleSummary}\n`);
  for (const quest of quests) await writeTextAtomic(path.join(forge, "docs", "quests", `${quest.questId}.md`), starterAware ? renderQuestMarkdownV2(quest as GeneratedQuestArtifactV2) : renderQuestMarkdown(quest as GeneratedQuestArtifact));

  return { questIds, portableJsonPaths: jsonFiles.map(([relative]) => relative) };
}

async function walkExpected(root: string, current = root): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const target = path.join(current, entry.name);
    const relative = path.relative(root, target).replaceAll("\\", "/");
    if (entry.isSymbolicLink()) throw new Error(`Generated project contains an unexpected link: ${relative}`);
    if (entry.isDirectory()) {
      if (relative === ".git" || relative === ".godot" || relative === ".forge/local") continue;
      result.push(...await walkExpected(root, target));
    } else if (entry.isFile()) result.push(relative);
  }
  return result.sort();
}

export async function expectedBaselineFiles(projectPath: string): Promise<string[]> {
  return walkExpected(projectPath);
}

export async function assertNoAbsolutePathsInPortableArtifacts(
  projectPath: string,
  forgeHome: string,
): Promise<void> {
  for (const relative of await expectedBaselineFiles(projectPath)) {
    if (!relative.startsWith(".forge/") && relative !== "PROJECT.md") continue;
    const contents = await readFile(path.join(projectPath, relative), "utf8");
    if (contents.includes(path.resolve(forgeHome)) || /(?:^|[\s"'`(])(?:[A-Za-z]:[\\/]|\\\\|\/(?:Users|home|tmp|var|etc|opt|mnt)\/)/mu.test(contents)) {
      throw new Error(`Portable artifact contains an absolute local path: ${relative}`);
    }
  }
}
