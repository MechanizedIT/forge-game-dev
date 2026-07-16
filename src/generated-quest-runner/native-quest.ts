import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";

import {
  acceptedSystemQuestPlanSchema,
  acceptedSystemRoadmapSchema,
  generatedQuestArtifactV2Schema,
  type AcceptedNativeQuest,
  type AcceptedSystemQuestPlan,
  type AcceptedSystemRoadmap,
  type GeneratedQuestArtifactV2,
  type GeneratedQuestPlanState,
  type GeneratedRoadmapV2,
} from "../contracts/index.js";

export const nativePlanningPaths = [
  ".forge/system-roadmap.json",
  ".forge/system-quests.json",
] as const;

export interface NativePlanningRecord {
  relativePath: typeof nativePlanningPaths[number];
  sha256: string;
}

export interface LoadedNativeQuest {
  quest: GeneratedQuestArtifactV2;
  systemId: string;
  workOrderFingerprint: string;
  planningRecords: NativePlanningRecord[];
  dependencyStates: Map<string, GeneratedQuestPlanState>;
  systemRoadmap: AcceptedSystemRoadmap;
  systemQuestPlan: AcceptedSystemQuestPlan;
}

function digest(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function readOwnedRecord(projectPath: string, relativePath: typeof nativePlanningPaths[number]): Promise<{ bytes: Buffer; value: unknown }> {
  const root = await realpath(path.resolve(projectPath));
  const target = path.resolve(root, relativePath);
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`Forge planning record escaped the project: ${relativePath}`);
  const info = await lstat(target).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (!info) throw new Error(`Forge planning record is missing: ${relativePath}`);
  if (!info.isFile() || info.isSymbolicLink() || await realpath(target) !== target) throw new Error(`Forge planning record is unsafe: ${relativePath}`);
  const bytes = await readFile(target);
  return { bytes, value: JSON.parse(bytes.toString("utf8")) as unknown };
}

export function nativeWorkOrderFingerprint(quest: Pick<AcceptedNativeQuest, "questId" | "title" | "playerVisibleOutcome" | "doneWhen" | "excludedScope" | "workOrder">): string {
  if (!quest.workOrder) throw new Error("Confirm the quest work plan before preparing Codex work.");
  const reviewed = {
    questId: quest.questId,
    title: quest.title,
    playerVisibleOutcome: quest.playerVisibleOutcome,
    doneWhen: quest.doneWhen,
    excludedScope: quest.excludedScope,
    existingFiles: quest.workOrder.existingFiles,
    newFiles: quest.workOrder.newFiles,
  };
  return createHash("sha256").update(JSON.stringify(reviewed), "utf8").digest("hex");
}

export function createNativeQuestArtifact(options: {
  projectId: string;
  savedQuest: AcceptedNativeQuest;
  sequence: number;
  state: GeneratedQuestPlanState;
}): GeneratedQuestArtifactV2 {
  const { savedQuest } = options;
  return generatedQuestArtifactV2Schema.parse({
    schemaVersion: 2,
    projectId: options.projectId,
    questId: savedQuest.questId,
    revision: 1,
    sequence: options.sequence,
    title: savedQuest.title,
    visibleOutcome: savedQuest.playerVisibleOutcome,
    whyItMatters: savedQuest.whyItMatters,
    currentPlayableFacts: ["The registered Godot project is the starting point for this creator-approved quest."],
    dependsOn: savedQuest.dependsOn,
    state: options.state,
    scope: {
      included: ["Change only the creator-confirmed Godot files listed in this work plan."],
      excluded: savedQuest.excludedScope,
    },
    acceptanceCriteria: savedQuest.doneWhen.map((criterion, index) => ({
      id: `AC-${index + 1}`,
      criterion,
      verificationIds: ["V-1"],
    })),
    verificationIdeas: [{ id: "V-1", idea: "Forge checks the chosen files and Godot, then the creator plays the real game." }],
    editableFileRoles: [],
    verificationProfile: null,
    workOrder: savedQuest.workOrder ? {
      existingFiles: savedQuest.workOrder.existingFiles,
      newFiles: savedQuest.workOrder.newFiles,
    } : undefined,
    implementation: savedQuest.implementation ?? "not_enabled",
  });
}

export async function loadNativeQuest(options: {
  projectPath: string;
  projectId: string;
  questId: string;
  legacyRoadmap: GeneratedRoadmapV2;
}): Promise<LoadedNativeQuest | null> {
  const questPlanTarget = path.join(options.projectPath, nativePlanningPaths[1]);
  if (!await lstat(questPlanTarget).catch(() => null)) return null;
  const [roadmapRecord, questRecord] = await Promise.all([
    readOwnedRecord(options.projectPath, nativePlanningPaths[0]),
    readOwnedRecord(options.projectPath, nativePlanningPaths[1]),
  ]);
  const systemRoadmap = acceptedSystemRoadmapSchema.parse(roadmapRecord.value);
  const systemQuestPlan = acceptedSystemQuestPlanSchema.parse(questRecord.value);
  if (systemRoadmap.projectId !== options.projectId || systemQuestPlan.projectId !== options.projectId) {
    throw new Error("The saved Forge planning records belong to another project.");
  }
  const legacyIds = new Set(options.legacyRoadmap.quests.map((quest) => quest.questId));
  const nativeIds = systemQuestPlan.systems.flatMap((system) => system.quests.map((quest) => quest.questId));
  const collision = nativeIds.find((questId) => legacyIds.has(questId));
  if (collision) throw new Error(`A saved native quest collides with an existing quest: ${collision}`);

  for (const savedSystem of systemQuestPlan.systems) {
    const roadmapSystem = systemRoadmap.systems.find((system) => system.systemId === savedSystem.systemId);
    if (!roadmapSystem) throw new Error("The saved native quests reference a missing game system.");
    if (roadmapSystem.questIds.length !== savedSystem.baseQuestIds.length || roadmapSystem.questIds.some((questId, index) => savedSystem.baseQuestIds[index] !== questId)) {
      throw new Error("The saved native quests no longer match their game system.");
    }
  }

  const matches = systemQuestPlan.systems.flatMap((system) => system.quests.map((quest, index) => ({ system, quest, index })))
    .filter((item) => item.quest.questId === options.questId);
  if (matches.length === 0) return null;
  if (matches.length !== 1) throw new Error("The saved native quest identity is ambiguous.");
  const match = matches[0]!;
  const savedQuest = match.quest;
  if (!savedQuest.workOrder) throw new Error("Confirm the quest work plan before preparing Codex work.");
  const fingerprint = nativeWorkOrderFingerprint(savedQuest);
  if (fingerprint !== savedQuest.workOrder.fingerprint) throw new Error("The saved quest work plan no longer matches its confirmed fingerprint.");

  const dependencyStates = new Map<string, GeneratedQuestPlanState>(options.legacyRoadmap.quests.map((quest) => [quest.questId, quest.state]));
  for (const system of systemQuestPlan.systems) {
    for (const quest of system.quests) {
      const complete = quest.implementation !== undefined;
      const ready = quest.dependsOn.every((dependency) => dependencyStates.get(dependency) === "completed");
      dependencyStates.set(quest.questId, complete ? "completed" : ready ? "available" : "blocked");
    }
  }
  const state = dependencyStates.get(savedQuest.questId)!;
  const sequence = match.system.baseQuestIds.length + match.index + 1;
  return {
    quest: createNativeQuestArtifact({ projectId: options.projectId, savedQuest, sequence, state }),
    systemId: match.system.systemId,
    workOrderFingerprint: fingerprint,
    planningRecords: [
      { relativePath: nativePlanningPaths[0], sha256: digest(roadmapRecord.bytes) },
      { relativePath: nativePlanningPaths[1], sha256: digest(questRecord.bytes) },
    ],
    dependencyStates,
    systemRoadmap,
    systemQuestPlan,
  };
}
