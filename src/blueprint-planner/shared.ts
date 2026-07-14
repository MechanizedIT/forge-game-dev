import type {
  ClarificationQuestion,
  ClarificationTopic,
  GameBlueprint,
} from "../contracts/index.js";

export const blueprintPlanningStages = [
  "Understanding your idea",
  "Defining the playable core",
  "Building the roadmap",
  "Preparing the blueprint",
] as const;

export type BlueprintPlanningStage = (typeof blueprintPlanningStages)[number];
export type BlueprintPlanningPhase =
  | "intake"
  | "planning"
  | "clarification"
  | "review"
  | "ready"
  | "failed"
  | "cancelled";

export interface BlueprintUsage {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
}

export interface BlueprintProvenance {
  model: "gpt-5.6";
  reasoningEffort: "high";
  sandbox: "read-only";
  network: "disabled";
  threadId: string | null;
  attempts: number;
  latencyMs: number | null;
  usage: BlueprintUsage | null;
}

export interface BlueprintPlanningSnapshot {
  phase: BlueprintPlanningPhase;
  idea: string;
  answers: Partial<Record<ClarificationTopic, string>>;
  stage: BlueprintPlanningStage | null;
  completedStages: BlueprintPlanningStage[];
  clarificationQuestions: ClarificationQuestion[];
  blueprint: GameBlueprint | null;
  provenance: BlueprintProvenance;
  validationPassed: boolean;
  validationProblems: string[];
  error: string | null;
  approval: {
    blueprintSha256: string;
    approvedAt: string;
  } | null;
  effects: {
    projectFilesWritten: 0;
    commandsRun: 0;
    godotProcessesStarted: 0;
  };
}

export type BlueprintPlanningEvent = { type: "refresh" };
