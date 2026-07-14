import type { ImplementationPlan, Quest } from "../contracts/index.js";
import {
  dashboardNavigationAvailability,
  dashboardProgressStages,
  type DashboardProgressStage,
  type DashboardSnapshot,
} from "../dashboard/shared.js";

export type SampleWorkspaceState = "fresh" | "preserved" | "in_progress" | "completed";
export type SampleRoadmapState = "completed" | "active" | "available" | "planned" | "future";

export interface SampleRoadmapNode {
  id: string;
  title: string;
  summary: string;
  state: SampleRoadmapState;
  region: string;
  authoritative: boolean;
}

export interface SampleWorkflowPresentation {
  workspaceState: SampleWorkspaceState;
  workspaceLabel: string;
  currentPlayableState: string;
  proofAvailable: boolean;
  chronicleAvailable: boolean;
  resetEligible: boolean;
  currentStage: DashboardProgressStage;
  runLabel: string | null;
  nodes: SampleRoadmapNode[];
}

export function approvedFiles(plan: ImplementationPlan): string[] {
  return [...new Set(plan.steps.flatMap((step) => step.files))];
}

export function playInstruction(quest: Quest): string {
  return (
    quest.verification.find((verification) => verification.kind === "play")?.instruction ??
    "Move with the arrow keys or WASD and confirm the visible Enemy Targeting behavior."
  );
}

function runLabel(snapshot: DashboardSnapshot): string | null {
  return snapshot.completion?.runId ?? snapshot.review?.runId ?? null;
}

export function buildSampleWorkflowPresentation(
  snapshot: DashboardSnapshot,
): SampleWorkflowPresentation {
  const navigation = dashboardNavigationAvailability(snapshot);
  const actualQuest = snapshot.roadmap.quests.find(
    (quest) => quest.questId === snapshot.quest.questId,
  );
  const completed = actualQuest?.state === "completed" && snapshot.completion !== null;
  const active = snapshot.phase === "implementation_running";
  const workspaceState: SampleWorkspaceState = completed
    ? "completed"
    : active
      ? "in_progress"
      : snapshot.project.workspaceStatus === "preserved"
        ? "preserved"
        : "fresh";
  const workspaceLabel = {
    fresh: "Fresh sample workspace",
    preserved: "Existing sample workspace preserved",
    in_progress: "Codex build in progress",
    completed: "Verified completion persisted",
  }[workspaceState];
  const enemyState: SampleRoadmapState = completed ? "completed" : active ? "active" : "available";

  return {
    workspaceState,
    workspaceLabel,
    currentPlayableState: completed ? snapshot.quest.expectedBehavior : snapshot.quest.baselineBehavior,
    proofAvailable: navigation.Proof,
    chronicleAvailable: navigation.Chronicle,
    resetEligible: snapshot.phase !== "implementation_running" && snapshot.phase !== "launching_game",
    currentStage: snapshot.progress.at(-1) ?? dashboardProgressStages[0],
    runLabel: runLabel(snapshot),
    nodes: [
      {
        id: "player-movement",
        title: "Player Movement",
        summary: "The prepared baseline moves with arrow keys or WASD.",
        state: "completed",
        region: "Foundation",
        authoritative: false,
      },
      {
        id: snapshot.quest.questId,
        title: snapshot.quest.title,
        summary: snapshot.quest.playerOutcome,
        state: enemyState,
        region: "First Encounter",
        authoritative: true,
      },
      {
        id: "game-feel-direction",
        title: "Game Feel",
        summary: "A future direction, not yet a prepared quest.",
        state: "planned",
        region: "Response",
        authoritative: false,
      },
      {
        id: "polish-direction",
        title: "Polish",
        summary: "A future region beyond the current verified path.",
        state: "future",
        region: "Finish",
        authoritative: false,
      },
    ],
  };
}
