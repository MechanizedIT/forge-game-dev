import type { ProjectModelQuestStatus, ProjectModelSystemStatus } from "../../contracts/index.js";
import type { GeneratedProjectWorldSnapshot } from "../../generated-project-world/shared.js";

import type { EntityStatus, ForgeActivity, ForgeEntity, ForgeWorldState } from "./model.js";

function systemStatus(status: ProjectModelSystemStatus): EntityStatus {
  if (status === "completed") return "complete";
  if (status === "active") return "building";
  if (status === "deferred") return "attention";
  return "planned";
}

function questStatus(status: ProjectModelQuestStatus): EntityStatus {
  if (status === "completed") return "complete";
  if (status === "active") return "building";
  if (status === "available") return "ready";
  if (status === "blocked" || status === "deferred") return "attention";
  return "planned";
}

function progressForQuest(status: ProjectModelQuestStatus): number {
  return { completed: 100, active: 65, available: 20, planned: 0, blocked: 0, deferred: 0 }[status];
}

function percent(done: number, total: number): number {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

function activityTone(index: number): ForgeActivity["tone"] {
  return (["gold", "blue", "green", "pink"] as const)[index % 4]!;
}

function activityWhen(value: string): string {
  const elapsed = Math.max(0, Date.now() - Date.parse(value));
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function adaptGeneratedProjectWorld(snapshot: GeneratedProjectWorldSnapshot): ForgeWorldState {
  const entities: Record<string, ForgeEntity> = {};
  const questById = new Map(snapshot.projectModel.quests.map((quest) => [quest.questId, quest]));
  const briefById = new Map(snapshot.quests.map((quest) => [quest.questId, quest]));
  const nativeById = new Map(
    (snapshot.systemQuestPlan?.systems ?? []).flatMap((system) => system.quests.map((quest) => [quest.questId, quest] as const)),
  );
  const completedQuestCount = snapshot.projectModel.quests.filter((quest) => quest.status === "completed").length;

  entities[snapshot.project.projectId] = {
    id: snapshot.project.projectId,
    kind: "world",
    parentId: null,
    childIds: snapshot.projectModel.systems.map((system) => system.systemId),
    name: snapshot.project.displayName,
    description: snapshot.projectModel.project.vision,
    outcome: snapshot.vision.smallestPlayableResult,
    imageRef: "world-rust-runner",
    status: snapshot.projectModel.quests.length > 0 && completedQuestCount === snapshot.projectModel.quests.length ? "complete" : "building",
    progress: percent(completedQuestCount, snapshot.projectModel.quests.length),
    relatedFiles: [snapshot.projectModel.project.engine.projectFile, snapshot.projectModel.project.engine.mainScene],
    acceptanceCriteria: [snapshot.vision.smallestPlayableResult],
  };

  snapshot.projectModel.systems.forEach((system, systemIndex) => {
    const quests = system.questIds.map((questId) => questById.get(questId)).filter(Boolean);
    const complete = quests.filter((quest) => quest?.status === "completed").length;
    entities[system.systemId] = {
      id: system.systemId,
      kind: "building",
      parentId: snapshot.project.projectId,
      childIds: system.questIds,
      name: system.title,
      description: system.outcome,
      outcome: system.outcome,
      imageRef: ["building-run", "building-dodge", "building-collect", "building-upgrade"][systemIndex % 4]!,
      status: systemStatus(system.status),
      progress: percent(complete, quests.length),
      relatedFiles: [],
      acceptanceCriteria: quests.map((quest) => quest!.playerVisibleOutcome),
    };
  });

  snapshot.projectModel.quests.forEach((quest, questIndex) => {
    const brief = briefById.get(quest.questId);
    const native = nativeById.get(quest.questId);
    const approvedFiles = native?.workOrder
      ? [...native.workOrder.existingFiles, ...native.workOrder.newFiles]
      : brief?.run?.contract.allowedFiles.map((file) => file.relativePath) ?? [];
    entities[quest.questId] = {
      id: quest.questId,
      kind: "part",
      parentId: quest.systemId,
      childIds: [],
      name: quest.title,
      description: native?.whyItMatters ?? brief?.whyItMatters ?? quest.playerVisibleOutcome,
      outcome: quest.playerVisibleOutcome,
      imageRef: ["part-run", "part-jump", "part-coyote", "part-obstacles"][questIndex % 4]!,
      status: questStatus(quest.status),
      progress: progressForQuest(quest.status),
      relatedFiles: approvedFiles,
      acceptanceCriteria: quest.doneWhen,
    };
  });

  return {
    version: 1,
    worldId: snapshot.project.projectId,
    entities,
    repairs: [],
    activity: snapshot.activity.slice(0, 4).map((item, index) => ({
      id: item.activityId,
      title: item.label,
      detail: item.summary,
      when: activityWhen(item.occurredAt),
      tone: activityTone(index),
    })),
    updatedAt: snapshot.project.lastOpenedAt,
  };
}
