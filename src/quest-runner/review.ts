import {
  implementationHandoffSchema,
  reviewResultSchema,
  type ImplementationHandoff,
  type ReviewResult,
} from "../contracts/index.js";
import type { PreparedQuestBundle } from "../quests/prepared-enemy-targeting.js";
import type { WorkspaceDiff } from "../demo/git-workspace.js";
import type { VerificationEvidence } from "./verification.js";

export interface ReviewInputs {
  bundle: PreparedQuestBundle;
  codexError: string | null;
  codexThreadId: string;
  diff: WorkspaceDiff;
  runId: string;
  verificationRuns: VerificationEvidence[];
}

export function createImplementationHandoff(inputs: ReviewInputs): ImplementationHandoff {
  const allowedFiles = new Set(inputs.bundle.plan.steps.flatMap((step) => step.files));
  const unexpectedFiles = inputs.diff.files.filter((file) => !allowedFiles.has(file));
  const verificationPassed =
    inputs.verificationRuns.length === 2 &&
    inputs.verificationRuns.every((verification) => verification.exitCode === 0);
  const status = inputs.codexError
    ? "failed"
    : verificationPassed && inputs.diff.files.length > 0 && unexpectedFiles.length === 0
      ? "succeeded"
      : "partial";
  return implementationHandoffSchema.parse({
    schemaVersion: 1,
    runId: inputs.runId,
    questId: inputs.bundle.quest.questId,
    stage: "REVIEW",
    approvedPlan: `.forge/runs/${inputs.runId}/plan.json`,
    codexThreadId: inputs.codexThreadId,
    summary: inputs.codexError
      ? "Codex did not complete the approved Enemy Targeting implementation."
      : "Codex completed its bounded Enemy Targeting turn; Forge captured the diff and verification evidence.",
    status,
    changes: inputs.diff.files.map((file) => ({
      path: file,
      summary: "Changed during the approved Enemy Targeting implementation.",
    })),
    verificationRuns: inputs.verificationRuns,
    deviations:
      unexpectedFiles.length > 0
        ? [`Changed files outside the approved plan: ${unexpectedFiles.join(", ")}`]
        : [],
    remainingRisks: inputs.codexError
      ? [inputs.codexError]
      : ["The creator still needs to launch the game and confirm the visible mechanic."],
  });
}

export function createReviewResult(inputs: ReviewInputs): ReviewResult {
  const allowedFiles = new Set(inputs.bundle.plan.steps.flatMap((step) => step.files));
  const unexpectedFiles = inputs.diff.files.filter((file) => !allowedFiles.has(file));
  const verificationPassed =
    inputs.verificationRuns.length === 2 &&
    inputs.verificationRuns.every((verification) => verification.exitCode === 0);
  const automatedPass =
    !inputs.codexError &&
    inputs.diff.files.length > 0 &&
    unexpectedFiles.length === 0 &&
    verificationPassed;
  const evidenceByCriterion: Record<string, string[]> = {
    "AC-1": ["VERIFY-2"],
    "AC-2": ["VERIFY-2"],
    "AC-3": ["VERIFY-2"],
    "AC-4": ["VERIFY-2"],
    "AC-5": ["VERIFY-1", "VERIFY-2"],
    "AC-6": ["VERIFY-3"],
  };
  const concerns: string[] = [];
  if (inputs.codexError) concerns.push(inputs.codexError);
  if (inputs.diff.files.length === 0) concerns.push("Codex completed without a project diff.");
  if (unexpectedFiles.length > 0) concerns.push(`Unexpected files changed: ${unexpectedFiles.join(", ")}`);
  if (!verificationPassed) concerns.push("One or more approved automated verifications failed.");

  return reviewResultSchema.parse({
    schemaVersion: 1,
    runId: inputs.runId,
    questId: inputs.bundle.quest.questId,
    stage: "REVIEW",
    verdict: automatedPass ? "CONDITIONAL PASS" : "FAIL",
    criteria: inputs.bundle.quest.acceptanceCriteria.map((criterion) => ({
      criterionId: criterion.id,
      result: criterion.id === "AC-6" ? "pending_play" : automatedPass ? "passed" : "failed",
      evidence: evidenceByCriterion[criterion.id] ?? [],
    })),
    scope: {
      result: unexpectedFiles.length === 0 ? "passed" : "failed",
      unexpectedFiles,
    },
    playCheck: {
      result: "not_run",
      evidence: "Run npm run demo:play and confirm the enemy visibly switches between IDLE and CHASING.",
    },
    concerns,
    nextStage: "REVIEW",
  });
}
