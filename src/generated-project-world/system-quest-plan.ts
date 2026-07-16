import {
  acceptedSystemQuestPlanSchema,
  projectModelSchema,
  type AcceptedSystemQuestPlan,
  type ChronicleV2,
  type ProjectModel,
  type ProjectModelHistoryEntry,
  type ProjectModelQuest,
  type ProjectModelResult,
} from "../contracts/index.js";
import { deriveProjectSystemStatus } from "./project-model.js";
import {
  activeProjectWorkPhases,
  projectModelResultFromSession,
  projectModelWorkSessionFromSnapshot,
} from "./project-model.js";
import type { GeneratedQuestRunSnapshot } from "../generated-quest-runner/shared.js";

export function nativeQuestIds(plan: AcceptedSystemQuestPlan | null): Set<string> {
  return new Set(plan?.systems.flatMap((system) => system.quests.map((quest) => quest.questId)) ?? []);
}

export function applyAcceptedSystemQuests(
  model: ProjectModel,
  value: AcceptedSystemQuestPlan,
  nativeSessions: GeneratedQuestRunSnapshot[] = [],
  nativeHistoryEntries: ChronicleV2["entries"] = [],
): ProjectModel {
  const plan = acceptedSystemQuestPlanSchema.parse(value);
  if (plan.projectId !== model.project.projectId) throw new Error("The saved system quests belong to another project.");
  const knownQuestIds = new Set(model.quests.map((quest) => quest.questId));
  const questsBySystem = new Map(model.systems.map((system) => [system.systemId, model.quests.filter((quest) => quest.systemId === system.systemId)]));

  for (const saved of plan.systems) {
    const system = model.systems.find((candidate) => candidate.systemId === saved.systemId);
    if (!system) throw new Error("The saved system quests reference a missing system.");
    if (saved.baseQuestIds.length !== system.questIds.length || saved.baseQuestIds.some((questId, index) => system.questIds[index] !== questId)) {
      throw new Error("The saved system quests no longer match their base system membership.");
    }
    const completed = new Set(saved.baseQuestIds.filter((questId) => model.quests.find((quest) => quest.questId === questId)?.status === "completed"));
    const additions: ProjectModelQuest[] = [];
    for (const savedQuest of saved.quests) {
      if (knownQuestIds.has(savedQuest.questId)) throw new Error("A saved native quest ID collides with an existing quest.");
      if (savedQuest.dependsOn.some((dependency) => !completed.has(dependency) && !additions.some((quest) => quest.questId === dependency))) {
        throw new Error("A saved native quest dependency is not an earlier quest in the selected system.");
      }
      const sessions = nativeSessions.filter((session) => session.questId === savedQuest.questId);
      const latest = sessions.at(-1);
      const status = savedQuest.implementation
        ? "completed"
        : latest && activeProjectWorkPhases.has(latest.phase)
          ? "active"
          : savedQuest.dependsOn.every((dependency) => completed.has(dependency)) ? "available" : "blocked";
      const quest: ProjectModelQuest = {
        questId: savedQuest.questId,
        systemId: saved.systemId,
        title: savedQuest.title,
        playerVisibleOutcome: savedQuest.playerVisibleOutcome,
        doneWhen: savedQuest.doneWhen,
        status,
        dependsOn: savedQuest.dependsOn,
        workSessionIds: sessions.map((session) => session.runId),
        latestWorkSessionId: latest?.runId ?? null,
        extraProof: null,
      };
      additions.push(quest);
      knownQuestIds.add(quest.questId);
      if (quest.status === "completed") completed.add(quest.questId);
    }
    questsBySystem.set(saved.systemId, [...(questsBySystem.get(saved.systemId) ?? []), ...additions]);
  }

  const quests = model.systems.flatMap((system) => questsBySystem.get(system.systemId) ?? []);
  const systems = model.systems.map((system) => {
    const systemQuests = questsBySystem.get(system.systemId) ?? [];
    return { ...system, questIds: systemQuests.map((quest) => quest.questId), status: deriveProjectSystemStatus(systemQuests.map((quest) => quest.status)) };
  });
  const workSessions = [...model.workSessions, ...nativeSessions.map(projectModelWorkSessionFromSnapshot)]
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.workSessionId.localeCompare(right.workSessionId));
  const nativeResults = nativeSessions.map(projectModelResultFromSession).filter((result): result is ProjectModelResult => result !== null);
  const results = [...model.results, ...nativeResults]
    .sort((left, right) => workSessions.findIndex((session) => session.workSessionId === left.workSessionId) - workSessions.findIndex((session) => session.workSessionId === right.workSessionId));
  const addedHistory: ProjectModelHistoryEntry[] = nativeHistoryEntries.map((entry) => ({
    historyEntryId: entry.entryId,
    kind: entry.type,
    occurredAt: entry.occurredAt,
    summary: entry.summary,
    questId: entry.type === "quest_completed" ? entry.questId : null,
    workSessionId: entry.type === "quest_completed" ? entry.runId : null,
  }));
  const allHistory = [...model.history, ...addedHistory];
  const completedOrder = workSessions.filter((session) => session.phase === "completed").map((session) => session.workSessionId);
  const history = [
    ...allHistory.filter((entry) => entry.kind !== "quest_completed"),
    ...completedOrder.map((sessionId) => allHistory.find((entry) => entry.kind === "quest_completed" && entry.workSessionId === sessionId)!).filter(Boolean),
  ];
  return projectModelSchema.parse({ ...model, systems, quests, workSessions, results, history });
}
