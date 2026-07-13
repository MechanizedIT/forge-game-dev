import type {
  ImplementationHandoff,
  ImplementationPlan,
  Quest,
  QuestCompletion,
  ReviewResult,
  Roadmap,
} from "../contracts/index.js";

export const dashboardProgressStages = [
  "Inspecting approved files",
  "Preparing the change",
  "Updating the game",
  "Running verification",
  "Preparing the result",
] as const;

export type DashboardProgressStage = (typeof dashboardProgressStages)[number];

export type DashboardPhase =
  | "world_ready"
  | "implementation_running"
  | "ready_to_play"
  | "launching_game"
  | "awaiting_confirmation"
  | "quest_complete"
  | "verification_failed"
  | "blocked";

export interface DashboardSnapshot {
  project: {
    projectId: string;
    name: string;
    engine: string;
    workspaceStatus: "created" | "preserved";
  };
  phase: DashboardPhase;
  roadmap: Roadmap;
  quest: Quest;
  plan: ImplementationPlan;
  progress: DashboardProgressStage[];
  handoff: ImplementationHandoff | null;
  review: ReviewResult | null;
  completion: QuestCompletion | null;
  technicalEvents: Record<string, unknown>[];
  notice: string | null;
  error: string | null;
}

export type DashboardEvent =
  | { type: "progress"; progress: DashboardProgressStage[] }
  | { type: "refresh" };

export type CreatorConfirmation = "I SAW IT WORK" | "IT DID NOT WORK" | "CANCEL";
