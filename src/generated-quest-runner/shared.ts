import type {
  GeneratedCompletionReceipt,
  GeneratedCreatorResult,
  GeneratedQuestImplementationContract,
  GeneratedQuestPlanState,
  GeneratedQuestProof,
  GeneratedRunPhase,
} from "../contracts/index.js";

export interface GeneratedQuestEligibility {
  eligible: boolean;
  reason: string | null;
  revision: number;
  state: GeneratedQuestPlanState;
}

export interface GeneratedQuestRunSnapshot {
  projectId: string;
  questId: string;
  phase: GeneratedRunPhase;
  contract: GeneratedQuestImplementationContract;
  progress: string[];
  proofs: GeneratedQuestProof;
  changedFiles: string[];
  creatorResult: GeneratedCreatorResult | null;
  error: string | null;
  recovery: {
    action: "none" | "resume" | "retry" | "rollback" | "manual";
    message: string;
    concurrentPaths: string[];
  };
  receipt: GeneratedCompletionReceipt | null;
  actions: {
    approve: boolean;
    start: boolean;
    play: boolean;
    confirm: boolean;
    retry: boolean;
    cancel: boolean;
    rollback: boolean;
  };
}

export interface GeneratedQuestRunEvent {
  type: "refresh" | "progress";
  projectId: string;
  questId: string;
  phase?: GeneratedRunPhase;
  message?: string;
}

export interface GeneratedQuestAdjustmentInput {
  expectedRevision: number;
  visibleOutcome: string;
  includedScope: string[];
}

export interface GeneratedQuestPlanMutationResult {
  projectId: string;
  questId: string;
  revision: number;
  state: GeneratedQuestPlanState;
  visibleOutcome: string;
  commitSha: string;
}

export interface GeneratedQuestRunnerSummary {
  eligibility: GeneratedQuestEligibility;
  run: GeneratedQuestRunSnapshot | null;
}
