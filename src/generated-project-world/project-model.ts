import { z } from "zod";

import {
  firstPlayableMilestoneSchema,
  gameVisionSchema,
  projectModelSchema,
  type ChronicleV2,
  type AcceptedSystemRoadmap,
  type GeneratedProjectManifest,
  type GeneratedProjectStateAny,
  type GeneratedQuestArtifactV2,
  type GeneratedRoadmapV2,
  type ProjectModel,
  type ProjectModelQuest,
  type ProjectModelResult,
  type ProjectModelSystemStatus,
} from "../contracts/index.js";
import type { GeneratedQuestRunSnapshot } from "../generated-quest-runner/shared.js";

export interface LegacyProjectModelInputs {
  manifest: GeneratedProjectManifest;
  vision: z.infer<typeof gameVisionSchema>;
  firstPlayable: z.infer<typeof firstPlayableMilestoneSchema>;
  roadmap: GeneratedRoadmapV2;
  quests: GeneratedQuestArtifactV2[];
  state: GeneratedProjectStateAny;
  chronicle: ChronicleV2;
  sessions: GeneratedQuestRunSnapshot[];
}

export const activeProjectWorkPhases = new Set([
  "approved",
  "implementing",
  "scope_review",
  "verifying",
  "waiting_for_playtest",
  "completion_pending",
]);
export const terminalProjectWorkPhases = new Set(["completed", "failed", "cancelled", "interrupted"]);

export function deriveLegacyQuestStatus(
  persisted: GeneratedQuestArtifactV2["state"],
  latest: Pick<GeneratedQuestRunSnapshot, "phase"> | undefined,
): ProjectModelQuest["status"] {
  if (persisted === "completed") return "completed";
  if (latest && activeProjectWorkPhases.has(latest.phase)) return "active";
  return persisted;
}

export function deriveProjectSystemStatus(statuses: ProjectModelQuest["status"][]): ProjectModelSystemStatus {
  if (statuses.length === 0) return "planned";
  if (statuses.every((status) => status === "completed")) return "completed";
  const unfinished = statuses.filter((status) => status !== "completed");
  if (unfinished.length > 0 && unfinished.every((status) => status === "deferred")) return "deferred";
  if (statuses.some((status) => status === "active" || status === "available" || status === "completed")) return "active";
  return "planned";
}

export function projectModelResultId(runId: string): string {
  return `result-${runId}`;
}

export function projectModelResultFromSession(session: GeneratedQuestRunSnapshot): ProjectModelResult | null {
  if (!terminalProjectWorkPhases.has(session.phase)) return null;
  const receipt = session.receipt;
  return {
    resultId: projectModelResultId(session.runId),
    workSessionId: session.runId,
    questId: session.questId,
    status: session.phase as ProjectModelResult["status"],
    summary: session.error ?? session.progress.at(-1) ?? `Work session ${session.phase.replaceAll("_", " ")}.`,
    occurredAt: session.updatedAt,
    changedFiles: session.changedFiles,
    creatorDecision: session.creatorResult,
    gitCommitSha: receipt?.commitSha ?? null,
    treeSha: receipt?.treeSha ?? null,
  };
}

export function projectModelWorkSessionFromSnapshot(session: GeneratedQuestRunSnapshot) {
  return {
    workSessionId: session.runId,
    questId: session.questId,
    phase: session.phase,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    contractFingerprint: session.contract.fingerprint,
    allowedFiles: session.contract.allowedFiles.map((file) => file.relativePath),
    progress: session.progress,
    proofs: session.proofs,
    changedFiles: session.changedFiles,
    creatorResult: session.creatorResult,
    error: session.error,
    recovery: session.recovery,
    resultId: terminalProjectWorkPhases.has(session.phase) ? projectModelResultId(session.runId) : null,
  };
}

export function buildLegacyProjectModel(inputs: LegacyProjectModelInputs): ProjectModel {
  const systemId = "system-first-playable";
  const sessionsByQuest = new Map<string, GeneratedQuestRunSnapshot[]>();
  for (const session of inputs.sessions) {
    const current = sessionsByQuest.get(session.questId) ?? [];
    current.push(session);
    sessionsByQuest.set(session.questId, current);
  }

  const quests: ProjectModelQuest[] = inputs.quests.map((quest) => {
    const sessions = sessionsByQuest.get(quest.questId) ?? [];
    const latest = sessions.at(-1);
    return {
      questId: quest.questId,
      systemId,
      title: quest.title,
      playerVisibleOutcome: quest.visibleOutcome,
      doneWhen: quest.acceptanceCriteria.map((criterion) => criterion.criterion),
      status: deriveLegacyQuestStatus(quest.state, latest),
      dependsOn: quest.dependsOn,
      workSessionIds: sessions.map((session) => session.runId),
      latestWorkSessionId: latest?.runId ?? null,
      extraProof: quest.verificationProfile ? { profileId: quest.verificationProfile } : null,
    };
  });
  const results = inputs.sessions.map(projectModelResultFromSession).filter((result): result is ProjectModelResult => result !== null);
  const roadmapIds = inputs.roadmap.quests.map((quest) => quest.questId);
  const selectedQuestId = inputs.state.selectedQuestId !== null && roadmapIds.includes(inputs.state.selectedQuestId)
    ? inputs.state.selectedQuestId
    : roadmapIds[0] ?? null;
  const savedNextRecommendedQuestId = inputs.state.schemaVersion === 2 ? inputs.state.nextRecommendedQuestId : null;
  const nextRecommendedQuestId = savedNextRecommendedQuestId !== null && roadmapIds.includes(savedNextRecommendedQuestId)
    ? savedNextRecommendedQuestId
    : inputs.roadmap.quests.find((quest) => quest.state === "available")?.questId ?? null;

  return projectModelSchema.parse({
    modelVersion: 1,
    project: {
      projectId: inputs.manifest.projectId,
      name: inputs.manifest.displayName,
      vision: inputs.vision.vision,
      engine: {
        kind: "godot",
        version: inputs.manifest.engine.version,
        projectFile: inputs.manifest.engine.projectFile,
        mainScene: inputs.manifest.engine.mainScene,
      },
      systemIds: [systemId],
    },
    systems: [{
      systemId,
      projectId: inputs.manifest.projectId,
      title: inputs.firstPlayable.title,
      outcome: inputs.firstPlayable.outcome,
      status: deriveProjectSystemStatus(quests.map((quest) => quest.status)),
      questIds: roadmapIds,
    }],
    quests,
    workSessions: inputs.sessions.map(projectModelWorkSessionFromSnapshot),
    results,
    history: inputs.chronicle.entries.map((entry) => ({
      historyEntryId: entry.entryId,
      kind: entry.type,
      occurredAt: entry.occurredAt,
      summary: entry.summary,
      questId: entry.type === "quest_completed" ? entry.questId : null,
      workSessionId: entry.type === "quest_completed" ? entry.runId : null,
    })),
    focus: { selectedSystemId: systemId, selectedQuestId, nextRecommendedQuestId },
  });
}

export function applyAcceptedSystemRoadmap(model: ProjectModel, roadmap: AcceptedSystemRoadmap): ProjectModel {
  if (roadmap.projectId !== model.project.projectId) throw new Error("The saved system roadmap belongs to another project.");
  const currentQuestIds = model.quests.map((quest) => quest.questId);
  const acceptedQuestIds = roadmap.systems.flatMap((system) => system.questIds);
  if (currentQuestIds.length !== acceptedQuestIds.length || new Set(acceptedQuestIds).size !== acceptedQuestIds.length) {
    throw new Error("The saved system roadmap does not contain every current quest exactly once.");
  }
  if (currentQuestIds.some((questId) => !acceptedQuestIds.includes(questId))) {
    throw new Error("The saved system roadmap is missing a current quest.");
  }

  const originalSystemByQuest = new Map(model.quests.map((quest) => [quest.questId, quest.systemId]));
  for (const originalSystem of model.systems) {
    const accepted = roadmap.systems.find((system) => system.systemId === originalSystem.systemId);
    if (!accepted) throw new Error("The saved system roadmap removed an existing system.");
    const expected = originalSystem.questIds;
    if (expected.length !== accepted.questIds.length || expected.some((questId, index) => accepted.questIds[index] !== questId)) {
      throw new Error("The saved system roadmap changed existing quest membership.");
    }
  }

  const acceptedSystemByQuest = new Map(roadmap.systems.flatMap((system) => system.questIds.map((questId) => [questId, system.systemId] as const)));
  for (const quest of model.quests) {
    if (acceptedSystemByQuest.get(quest.questId) !== originalSystemByQuest.get(quest.questId)) {
      throw new Error("The saved system roadmap moved an existing quest.");
    }
  }
  const currentPopulatedOrder = model.systems.filter((system) => system.questIds.length > 0).map((system) => system.systemId);
  const acceptedPopulatedOrder = roadmap.systems.filter((system) => system.questIds.length > 0).map((system) => system.systemId);
  if (currentPopulatedOrder.some((systemId, index) => acceptedPopulatedOrder[index] !== systemId)) {
    throw new Error("The saved system roadmap reordered existing quest groups.");
  }
  const selectedQuestId = model.focus.selectedQuestId;
  const selectedSystemId = selectedQuestId
    ? acceptedSystemByQuest.get(selectedQuestId) ?? roadmap.systems[0]!.systemId
    : roadmap.systems.some((system) => system.systemId === model.focus.selectedSystemId)
      ? model.focus.selectedSystemId
      : roadmap.systems[0]!.systemId;

  return projectModelSchema.parse({
    ...model,
    project: {
      ...model.project,
      vision: roadmap.creatorIdea,
      systemIds: roadmap.systems.map((system) => system.systemId),
    },
    systems: roadmap.systems.map((system) => ({
      systemId: system.systemId,
      projectId: model.project.projectId,
      title: system.title,
      outcome: system.outcome,
      status: deriveProjectSystemStatus(system.questIds.map((questId) => model.quests.find((quest) => quest.questId === questId)!.status)),
      questIds: system.questIds,
    })),
    quests: model.quests,
    focus: { ...model.focus, selectedSystemId },
  });
}
