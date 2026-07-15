import { z } from "zod";

import {
  firstPlayableMilestoneSchema,
  gameVisionSchema,
  projectModelSchema,
  type ChronicleV2,
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

const activePhases = new Set([
  "approved",
  "implementing",
  "verifying",
  "waiting_for_playtest",
  "completion_pending",
]);
const terminalPhases = new Set(["completed", "failed", "cancelled", "interrupted"]);

export function deriveLegacyQuestStatus(
  persisted: GeneratedQuestArtifactV2["state"],
  latest: Pick<GeneratedQuestRunSnapshot, "phase"> | undefined,
): ProjectModelQuest["status"] {
  if (persisted === "completed") return "completed";
  if (latest && activePhases.has(latest.phase)) return "active";
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

function resultId(runId: string): string {
  return `result-${runId}`;
}

function migrateResult(session: GeneratedQuestRunSnapshot): ProjectModelResult | null {
  if (!terminalPhases.has(session.phase)) return null;
  const receipt = session.receipt;
  return {
    resultId: resultId(session.runId),
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
  const results = inputs.sessions.map(migrateResult).filter((result): result is ProjectModelResult => result !== null);
  const roadmapIds = inputs.roadmap.quests.map((quest) => quest.questId);
  const selectedQuestId = inputs.state.selectedQuestId !== null && roadmapIds.includes(inputs.state.selectedQuestId)
    ? inputs.state.selectedQuestId
    : roadmapIds[0]!;
  const nextRecommendedQuestId = inputs.state.schemaVersion === 2
    ? inputs.state.nextRecommendedQuestId
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
    workSessions: inputs.sessions.map((session) => ({
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
      resultId: terminalPhases.has(session.phase) ? resultId(session.runId) : null,
    })),
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
