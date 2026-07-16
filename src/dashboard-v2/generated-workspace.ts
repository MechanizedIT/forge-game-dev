import type { ProjectModelQuestStatus, ProjectModelSystemStatus } from "../contracts/index.js";
import type { GeneratedProjectWorldSnapshot, GeneratedQuestBrief } from "../generated-project-world/shared.js";

export interface GeneratedWorkspaceQuest {
  questId: string;
  systemId: string;
  title: string;
  outcome: string;
  status: ProjectModelQuestStatus;
  dependsOn: string[];
  selected: boolean;
  recommended: boolean;
  brief: GeneratedQuestBrief | null;
  nativePlan: boolean;
}

export interface GeneratedWorkspaceSystem {
  systemId: string;
  title: string;
  outcome: string;
  status: ProjectModelSystemStatus;
  selected: boolean;
  quests: GeneratedWorkspaceQuest[];
  completedQuestCount: number;
}

export interface GeneratedWorkspaceContext {
  kind: "system" | "quest";
  title: string;
  summary: string;
  status: string;
  recommendation: string;
  primaryActionLabel: string | null;
  questId: string | null;
}

export interface GeneratedWorkspacePresentation {
  systems: GeneratedWorkspaceSystem[];
  selectedSystem: GeneratedWorkspaceSystem;
  selectedQuest: GeneratedWorkspaceQuest | null;
  context: GeneratedWorkspaceContext;
  locked: boolean;
  dock: {
    playEnabled: boolean;
    openFolderEnabled: true;
    toolboxEnabled: true;
    status: string | null;
  };
}

const activeRunPhases = new Set([
  "approved",
  "implementing",
  "scope_review",
  "verifying",
  "waiting_for_playtest",
  "completion_pending",
  "failed",
  "interrupted",
]);

const creatorPhaseLabels: Record<string, string> = {
  contract_review: "work plan ready", approved: "plan confirmed", implementing: "Codex working",
  scope_review: "file request", verifying: "checking", waiting_for_playtest: "ready to play",
  completion_pending: "saving result", completed: "completed", failed: "stopped",
  cancelled: "cancelled", interrupted: "interrupted",
};

function contextForQuest(quest: GeneratedWorkspaceQuest): GeneratedWorkspaceContext {
  const run = quest.brief?.run ?? null;
  if (!run) {
    if (quest.nativePlan) {
      return {
        kind: "quest", title: quest.title, summary: quest.outcome, status: quest.status,
        recommendation: "Check this quest and the one-to-four files chosen for it. Codex has not started.",
        primaryActionLabel: "Open quest", questId: quest.questId,
      };
    }
    const eligible = quest.brief?.eligibility.eligible ?? false;
    return {
      kind: "quest",
      title: quest.title,
      summary: quest.outcome,
      status: quest.status,
      recommendation: eligible
        ? "Open this quest to check its visible result and chosen files."
        : quest.brief?.eligibility.reason ?? "This quest is planned, but it is not ready for work yet.",
      primaryActionLabel: quest.brief ? "Open quest" : null,
      questId: quest.questId,
    };
  }

  const content = {
    contract_review: ["The work plan is ready. Confirming it will not start Codex.", "Check work plan"],
    approved: ["The plan is confirmed. Send it only when you are ready for Codex to change those files.", "Send to Codex"],
    implementing: ["Forge is changing only the chosen files. This may take a few minutes.", "View progress"],
    scope_review: ["Codex asked for different files. Nothing was added.", "Review request"],
    verifying: ["The change is finished. Forge is checking the project now.", "View checks"],
    waiting_for_playtest: ["The checks passed. Play the real game and decide whether the result works.", "Play and review"],
    completion_pending: ["Your result is being recorded in local project history.", "View completion"],
    completed: ["This quest is complete and recorded in local project history.", "View completed result"],
    failed: ["Forge stopped safely. Open the work session to see the next safe action.", "Review stopped work"],
    cancelled: ["This work session was cancelled. The quest remains incomplete.", "View cancelled work"],
    interrupted: ["Forge was interrupted. Open the work session before doing anything else.", "Review interrupted work"],
  } as const;
  const [recommendation, primaryActionLabel] = content[run.phase];
  return {
    kind: "quest",
    title: quest.title,
    summary: quest.outcome,
    status: creatorPhaseLabels[run.phase] ?? run.phase.replaceAll("_", " "),
    recommendation,
    primaryActionLabel,
    questId: quest.questId,
  };
}

export function buildGeneratedWorkspacePresentation(
  snapshot: GeneratedProjectWorldSnapshot,
  selectedSystemId?: string,
): GeneratedWorkspacePresentation {
  const modelQuestById = new Map(snapshot.projectModel.quests.map((quest) => [quest.questId, quest]));
  const briefById = new Map(snapshot.quests.map((quest) => [quest.questId, quest]));
  const activeBrief = snapshot.quests.find((quest) => quest.run !== null && quest.run.phase !== "completed" && quest.run.phase !== "cancelled") ?? null;
  const savedQuestId = activeBrief && modelQuestById.has(activeBrief.questId)
    ? activeBrief.questId
    : snapshot.state.selectedQuestId !== null && modelQuestById.has(snapshot.state.selectedQuestId)
    ? snapshot.state.selectedQuestId
    : snapshot.projectModel.focus.selectedQuestId;
  const savedQuest = savedQuestId ? modelQuestById.get(savedQuestId) ?? null : null;
  const validSelectedSystemId = activeBrief && savedQuest
    ? savedQuest.systemId
    : snapshot.projectModel.systems.some((system) => system.systemId === selectedSystemId)
    ? selectedSystemId!
    : savedQuest?.systemId ?? snapshot.projectModel.focus.selectedSystemId;

  const systems: GeneratedWorkspaceSystem[] = snapshot.projectModel.systems.map((system) => {
    const selected = system.systemId === validSelectedSystemId;
    const quests = system.questIds.map((questId) => {
      const quest = modelQuestById.get(questId)!;
      return {
        questId,
        systemId: system.systemId,
        title: quest.title,
        outcome: quest.playerVisibleOutcome,
        status: quest.status,
        dependsOn: quest.dependsOn,
        selected: selected && savedQuestId === questId,
        recommended: snapshot.projectModel.focus.nextRecommendedQuestId === questId,
        brief: briefById.get(questId) ?? null,
        nativePlan: !briefById.has(questId),
      };
    });
    return {
      systemId: system.systemId,
      title: system.title,
      outcome: system.outcome,
      status: system.status,
      selected,
      quests,
      completedQuestCount: quests.filter((quest) => quest.status === "completed").length,
    };
  });
  const selectedSystem = systems.find((system) => system.selected) ?? systems[0]!;
  const selectedQuest = selectedSystem.quests.find((quest) => quest.selected) ?? null;
  const selectedBrief = selectedQuest?.brief ?? null;
  const run = selectedBrief?.run ?? null;
  const locked = activeBrief !== null;
  const selectedContext: GeneratedWorkspaceContext = selectedQuest
    ? contextForQuest(selectedQuest)
    : {
      kind: "system",
      title: selectedSystem.title,
      summary: selectedSystem.outcome,
      status: selectedSystem.status,
      recommendation: selectedSystem.quests.length === 0
        ? "Describe this system and let Forge suggest a few small, visible quests."
        : "Choose a quest, or refine this system with a few more small outcomes.",
      primaryActionLabel: "Refine into quests",
      questId: null,
    };
  const context = snapshot.state.currentView === "project_world"
    ? selectedContext
    : { ...selectedContext, primaryActionLabel: null };

  return {
    systems,
    selectedSystem,
    selectedQuest,
    context,
    locked,
    dock: {
      playEnabled: !locked,
      openFolderEnabled: true,
      toolboxEnabled: true,
      status: run && activeRunPhases.has(run.phase) ? creatorPhaseLabels[run.phase] ?? run.phase.replaceAll("_", " ") : null,
    },
  };
}
