import {
  acceptedSystemQuestPlanSchema,
  projectModelSchema,
  type AcceptedSystemQuestPlan,
  type ProjectModel,
  type ProjectModelQuest,
} from "../contracts/index.js";
import { deriveProjectSystemStatus } from "./project-model.js";

export function nativeQuestIds(plan: AcceptedSystemQuestPlan | null): Set<string> {
  return new Set(plan?.systems.flatMap((system) => system.quests.map((quest) => quest.questId)) ?? []);
}

export function applyAcceptedSystemQuests(model: ProjectModel, value: AcceptedSystemQuestPlan): ProjectModel {
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
    const available = new Set(saved.baseQuestIds.filter((questId) => model.quests.find((quest) => quest.questId === questId)?.status === "completed"));
    const additions: ProjectModelQuest[] = [];
    for (const savedQuest of saved.quests) {
      if (knownQuestIds.has(savedQuest.questId)) throw new Error("A saved native quest ID collides with an existing quest.");
      if (savedQuest.dependsOn.some((dependency) => !available.has(dependency) && !additions.some((quest) => quest.questId === dependency))) {
        throw new Error("A saved native quest dependency is not an earlier quest in the selected system.");
      }
      const status = savedQuest.dependsOn.every((dependency) => available.has(dependency)) ? "available" : "blocked";
      const quest: ProjectModelQuest = {
        questId: savedQuest.questId,
        systemId: saved.systemId,
        title: savedQuest.title,
        playerVisibleOutcome: savedQuest.playerVisibleOutcome,
        doneWhen: savedQuest.doneWhen,
        status,
        dependsOn: savedQuest.dependsOn,
        workSessionIds: [],
        latestWorkSessionId: null,
        extraProof: null,
      };
      additions.push(quest);
      knownQuestIds.add(quest.questId);
      if (quest.status === "completed") available.add(quest.questId);
    }
    questsBySystem.set(saved.systemId, [...(questsBySystem.get(saved.systemId) ?? []), ...additions]);
  }

  const quests = model.systems.flatMap((system) => questsBySystem.get(system.systemId) ?? []);
  const systems = model.systems.map((system) => {
    const systemQuests = questsBySystem.get(system.systemId) ?? [];
    return { ...system, questIds: systemQuests.map((quest) => quest.questId), status: deriveProjectSystemStatus(systemQuests.map((quest) => quest.status)) };
  });
  return projectModelSchema.parse({ ...model, systems, quests });
}
