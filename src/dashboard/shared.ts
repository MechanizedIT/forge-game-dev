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
    workspaceStatus: "created" | "preserved" | "reset";
  };
  phase: DashboardPhase;
  runStartedAt: string | null;
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

export type DemoResetAction = "CONFIRM RESET" | "CANCEL";

export function dashboardNavigationAvailability(
  snapshot: Pick<DashboardSnapshot, "review" | "completion">,
): { Proof: boolean; Chronicle: boolean } {
  return {
    Proof: snapshot.review !== null,
    Chronicle: snapshot.completion !== null,
  };
}

export function formatElapsedTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
