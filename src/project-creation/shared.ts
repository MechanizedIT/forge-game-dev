import type { GameBlueprint } from "../contracts/index.js";
import type { BlueprintProvenance } from "../blueprint-planner/shared.js";

export const projectCreationStages = [
  "Validating the blueprint",
  "Preparing the workspace",
  "Assembling the starter",
  "Writing project records",
  "Checking the Godot project",
  "Creating the baseline",
  "Registering the project",
] as const;

export type ProjectCreationStage = (typeof projectCreationStages)[number];
export type ProjectCreationPhase = "idle" | "creating" | "created" | "failed";

export interface ApprovedBlueprintEnvelope {
  blueprint: GameBlueprint;
  blueprintSha256: string;
  approvedAt: string;
  provenance: BlueprintProvenance;
}

export interface CreatedProjectSummary {
  projectId: string;
  displayName: string;
  foundation: "top_down_arena";
  projectLocation: string;
  createdAt: string;
  questCount: number;
  starterVersion: string;
  godotVersion: string;
  godotSuccessMarker: "FORGE_TOP_DOWN_ARENA_VERIFY_OK";
  gitCommitSha: string;
  documentationSaved: true;
  chronicleInitialized: true;
  registered: true;
}

export interface ProjectCreationSnapshot {
  phase: ProjectCreationPhase;
  stage: ProjectCreationStage | null;
  completedStages: ProjectCreationStage[];
  startedAt: string | null;
  displayName: string | null;
  foundation: "top_down_arena" | null;
  projectId: string | null;
  relativeProjectIdentifier: string | null;
  questCount: number | null;
  explanation: string | null;
  createdProject: CreatedProjectSummary | null;
  error: string | null;
  failureEvidence: string | null;
}

export interface RecentProjectSummary {
  projectId: string;
  displayName: string;
  canonicalPath: string;
  foundation: "top_down_arena";
  createdAt: string;
  lastOpenedAt: string;
  starterVersion: string;
  available: boolean;
  stateLabel: string;
  questCount: number | null;
  godotSmokeCheckPassed: boolean;
}

export interface ProjectCreationStateResponse {
  creation: ProjectCreationSnapshot;
  recentProjects: RecentProjectSummary[];
  mutationToken: string;
}

export type ProjectCreationEvent = { type: "refresh" };
