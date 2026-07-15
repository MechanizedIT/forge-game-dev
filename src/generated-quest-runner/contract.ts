import { createHash } from "node:crypto";

import {
  generatedQuestArtifactV2Schema,
  generatedQuestImplementationContractSchema,
  generatedRoadmapV2Schema,
  type GeneratedQuestArtifactAny,
  type GeneratedQuestArtifactV2,
  type GeneratedQuestImplementationContract,
  type GeneratedQuestPlanState,
  type GeneratedRoadmapV2,
  type Roadmap,
} from "../contracts/index.js";
import { readContainedUtf8File } from "./boundary.js";

const roleCatalog = {
  "top-down-arena@1.0.0": {
    main_scene: "scenes/main.tscn",
    objective_visual: "scripts/objective_marker.gd",
  },
} as const;

function normalizedState(state: Roadmap["quests"][number]["state"]): GeneratedQuestPlanState {
  if (state === "locked") return "blocked";
  if (state === "completed") return "completed";
  return "available";
}

function defaultWhy(quest: GeneratedQuestArtifactAny): string {
  return quest.sequence === 1
    ? "This makes the first game-space objective visually honest before Forge adds interaction mechanics."
    : "This advances the accepted first playable after its earlier dependencies are complete.";
}

export function normalizeGeneratedQuest(
  quest: GeneratedQuestArtifactAny,
  roadmapState: Roadmap["quests"][number]["state"] | GeneratedQuestPlanState,
): GeneratedQuestArtifactV2 {
  if (quest.schemaVersion === 2) return generatedQuestArtifactV2Schema.parse(quest);
  const state = ["planned", "available", "blocked", "deferred", "completed"].includes(roadmapState)
    ? roadmapState as GeneratedQuestPlanState
    : normalizedState(roadmapState as Roadmap["quests"][number]["state"]);
  return generatedQuestArtifactV2Schema.parse({
    schemaVersion: 2,
    projectId: quest.projectId,
    questId: quest.questId,
    revision: 1,
    sequence: quest.sequence,
    title: quest.title,
    visibleOutcome: quest.visibleOutcome,
    whyItMatters: defaultWhy(quest),
    currentPlayableFacts: [
      "The controlled Top-down Arena starter loads successfully.",
      "A bounded arena, player, objective marker, and camera already exist.",
      "Keyboard movement is already verified by the controlled starter proof.",
    ],
    dependsOn: quest.dependsOn,
    state,
    scope: quest.scope,
    acceptanceCriteria: quest.acceptanceCriteria,
    verificationIdeas: quest.verificationIdeas,
    editableFileRoles: ["main_scene", "objective_visual"],
    verificationProfile: "gravity_orb_presence_v1",
    implementation: quest.implementation,
  });
}

export function normalizeGeneratedRoadmap(roadmap: Roadmap | GeneratedRoadmapV2): GeneratedRoadmapV2 {
  if (roadmap.schemaVersion === 2) return generatedRoadmapV2Schema.parse(roadmap);
  return generatedRoadmapV2Schema.parse({
    schemaVersion: 2,
    projectId: roadmap.projectId,
    updatedAt: roadmap.updatedAt,
    quests: roadmap.quests.map((quest) => ({
      ...quest,
      revision: 1,
      state: normalizedState(quest.state),
    })),
  });
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stableValue(child)]));
  }
  return value;
}

export function contractFingerprint(value: Omit<GeneratedQuestImplementationContract, "fingerprint">): string {
  return createHash("sha256").update(JSON.stringify(stableValue(value))).digest("hex");
}

export async function buildGeneratedQuestContract(options: {
  projectPath: string;
  starterId: "top-down-arena";
  starterVersion: string;
  quest: GeneratedQuestArtifactV2;
  dependencyStates: Map<string, GeneratedQuestPlanState>;
}): Promise<GeneratedQuestImplementationContract> {
  const { quest } = options;
  if (quest.questId !== "q1-enter-the-arena" || quest.sequence !== 1) {
    throw new Error("Task A supports only the prepared first Gravity Tap quest.");
  }
  if (quest.state !== "available") throw new Error("Only an available generated quest can be prepared.");
  if (quest.implementation !== "not_enabled") throw new Error("The generated quest already has implementation provenance.");
  for (const dependency of quest.dependsOn) {
    if (options.dependencyStates.get(dependency) !== "completed") throw new Error(`Quest dependency is incomplete: ${dependency}`);
  }
  if (quest.verificationProfile !== "gravity_orb_presence_v1") throw new Error("The quest verification profile is not registered for Task A.");
  const catalog = roleCatalog[`${options.starterId}@${options.starterVersion}` as keyof typeof roleCatalog];
  if (!catalog) throw new Error("The starter version has no Forge-owned editable-file role catalog.");
  const allowedFiles = await Promise.all(quest.editableFileRoles.map(async (role) => {
    const relativePath = catalog[role];
    if (!relativePath) throw new Error(`The starter does not resolve editable role ${role}.`);
    const file = await readContainedUtf8File(options.projectPath, relativePath);
    return { role, relativePath, preSha256: file.sha256 };
  }));
  const parsedWithPlaceholder = generatedQuestImplementationContractSchema.parse({
    schemaVersion: 1 as const,
    projectId: quest.projectId,
    questId: quest.questId,
    questRevision: quest.revision,
    visibleOutcome: quest.visibleOutcome,
    whyItMatters: quest.whyItMatters,
    currentPlayableFacts: quest.currentPlayableFacts,
    steps: [
      {
        id: "STEP-1",
        summary: "Make the existing objective unmistakably read as one gravity orb while preserving the controlled starter structure.",
        fileRoles: quest.editableFileRoles,
      },
      {
        id: "STEP-2",
        summary: "Expose the stable Forge gravity-orb observable used by the repository-owned mechanic proof.",
        fileRoles: quest.editableFileRoles,
      },
    ],
    allowedFiles,
    excludedScope: quest.scope.excluded,
    acceptanceCriteria: [
      {
        id: "AC-1",
        criterion: "The opening arena visibly contains exactly one clearly identifiable gravity orb.",
        proofReferences: ["boundary", "mechanic", "creator"],
      },
      {
        id: "AC-2",
        criterion: "The controlled arena, player, keyboard movement, and project load remain healthy.",
        proofReferences: ["project_health", "creator"],
      },
    ],
    verificationProfile: quest.verificationProfile,
    creatorPlaySteps: [
      "Launch the real game from Forge.",
      "Confirm the opening arena contains one obvious gravity orb.",
      "Move the player and confirm the starter still behaves normally.",
      "Return to Forge and choose the truthful result.",
    ],
    risksAndAssumptions: [
      "The objective node name remains stable so the controlled starter verifier is not weakened.",
      "No gravity interaction, scoring, new file, dependency, or external asset is part of this quest.",
    ],
    fingerprint: "0".repeat(64),
  });
  const { fingerprint: _placeholder, ...withoutFingerprint } = parsedWithPlaceholder;
  return generatedQuestImplementationContractSchema.parse({
    ...withoutFingerprint,
    fingerprint: contractFingerprint(withoutFingerprint),
  });
}

export function verifyContractFingerprint(contract: GeneratedQuestImplementationContract): void {
  const { fingerprint, ...body } = generatedQuestImplementationContractSchema.parse(contract);
  if (contractFingerprint(body) !== fingerprint) throw new Error("Generated quest contract fingerprint does not match its reviewed content.");
}
