import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  creatorPlayResponseSchema,
  implementationHandoffSchema,
  questCompletionSchema,
  reviewResultSchema,
  roadmapSchema,
  type CreatorPlayResponse,
  type QuestCompletion,
  type ReviewResult,
  type Roadmap,
} from "../contracts/index.js";
import type { PreparedQuestRun, QuestRunResult } from "./workflow.js";
import { writeJsonAtomic } from "./artifacts.js";

export const enemyTargetingCompletionPath = ".forge/state/enemy-targeting.json";

export interface GameLaunchEvidence {
  version: string;
}

export type GameLauncher = (workspacePath: string) => Promise<GameLaunchEvidence>;
export type CreatorResponseProvider = () => Promise<unknown>;

export type QuestCompletionResult =
  | { status: "not_eligible"; reason: string }
  | { status: "launch_failed"; error: string }
  | { status: "reported_failure" }
  | { status: "cancelled" }
  | {
      status: "completed";
      completion: QuestCompletion;
      finalReview: ReviewResult;
      roadmap: Roadmap;
    };

export type QuestFinalizationResult = Exclude<
  QuestCompletionResult,
  { status: "launch_failed" }
>;

function artifactPath(runId: string, name: string): string {
  return `.forge/runs/${runId}/${name}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isEligibleAutomatedResult(result: QuestRunResult): boolean {
  if (result.status !== "ready_for_play") return false;
  const review = reviewResultSchema.parse(result.review);
  const handoff = implementationHandoffSchema.parse(result.handoff);
  if (review.scope.result !== "passed" || handoff.status !== "succeeded") return false;
  if (handoff.verificationRuns.length !== 2) return false;
  if (handoff.verificationRuns.some((verification) => verification.exitCode !== 0)) return false;
  if (review.verdict === "PASS") return true;
  if (review.verdict !== "CONDITIONAL PASS") return false;
  const unresolved = review.criteria.filter((criterion) => criterion.result !== "passed");
  return (
    unresolved.length === 1 &&
    unresolved[0]?.criterionId === "AC-6" &&
    unresolved[0].result === "pending_play"
  );
}

function completionEligibilityReason(
  prepared: PreparedQuestRun,
  result: QuestRunResult,
): string | null {
  if (result.status !== "ready_for_play" || !isEligibleAutomatedResult(result)) {
    return "Automated verification did not produce a review that is ready for creator play confirmation.";
  }

  const expectedRunDirectory = path.join(
    prepared.workspacePath,
    ".forge",
    "runs",
    result.review.runId,
  );
  return path.resolve(result.runDirectory) === path.resolve(expectedRunDirectory)
    ? null
    : "Run evidence is outside the prepared workspace.";
}

export async function loadQuestCompletion(
  workspacePath: string,
): Promise<QuestCompletion | null> {
  const completionPath = path.join(workspacePath, enemyTargetingCompletionPath);
  try {
    const contents = await readFile(completionPath, "utf8");
    return questCompletionSchema.parse(JSON.parse(contents) as unknown);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function completeQuestAfterPlay(
  prepared: PreparedQuestRun,
  result: QuestRunResult,
  options: {
    launchGame: GameLauncher;
    requestCreatorResponse: CreatorResponseProvider;
    now?: () => Date;
  },
): Promise<QuestCompletionResult> {
  const ineligible = completionEligibilityReason(prepared, result);
  if (ineligible) return { status: "not_eligible", reason: ineligible };

  let launch: GameLaunchEvidence;
  try {
    launch = await options.launchGame(prepared.workspacePath);
  } catch (error) {
    return { status: "launch_failed", error: errorMessage(error) };
  }

  return finalizeQuestAfterPlay(prepared, result, {
    launchEvidence: launch,
    creatorResponse: await options.requestCreatorResponse(),
    ...(options.now === undefined ? {} : { now: options.now }),
  });
}

export async function finalizeQuestAfterPlay(
  prepared: PreparedQuestRun,
  result: QuestRunResult,
  options: {
    launchEvidence: GameLaunchEvidence;
    creatorResponse: unknown;
    now?: () => Date;
  },
): Promise<QuestFinalizationResult> {
  if (result.status !== "ready_for_play") {
    return {
      status: "not_eligible",
      reason: "Automated verification did not produce a review that is ready for creator play confirmation.",
    };
  }
  const ineligible = completionEligibilityReason(prepared, result);
  if (ineligible) return { status: "not_eligible", reason: ineligible };

  const response: CreatorPlayResponse = creatorPlayResponseSchema.parse(
    options.creatorResponse,
  );
  if (response === "IT DID NOT WORK") return { status: "reported_failure" };
  if (response === "CANCEL") return { status: "cancelled" };

  const completedAt = (options.now ?? (() => new Date()))().toISOString();
  const finalReview = reviewResultSchema.parse({
    ...result.review,
    verdict: "PASS",
    criteria: result.review.criteria.map((criterion) => ({
      ...criterion,
      result: "passed",
    })),
    playCheck: {
      result: "passed",
      evidence: `Creator entered I SAW IT WORK at ${completedAt} after the game closed.`,
    },
    concerns: [],
    nextStage: "DOCUMENT",
  });

  const roadmap = roadmapSchema.parse({
    ...prepared.bundle.roadmap,
    updatedAt: completedAt,
    quests: prepared.bundle.roadmap.quests.map((quest) =>
      quest.questId === prepared.bundle.quest.questId
        ? { ...quest, state: "completed" }
        : quest,
    ),
  });

  const completion = questCompletionSchema.parse({
    schemaVersion: 1,
    runId: result.review.runId,
    questId: prepared.bundle.quest.questId,
    workflowState: "COMPLETE",
    roadmapState: "completed",
    automatedReview: {
      verdict: result.review.verdict,
      artifact: artifactPath(result.review.runId, "review.json"),
    },
    finalReview: artifactPath(result.review.runId, "final-review.json"),
    gameLaunch: {
      result: "passed",
      godotVersion: options.launchEvidence.version,
    },
    creatorConfirmation: {
      response,
      confirmedAt: completedAt,
    },
    completedAt,
    summary:
      "Automated verification passed and the creator confirmed the visible Enemy Targeting behavior.",
  });

  await writeJsonAtomic(path.join(result.runDirectory, "final-review.json"), finalReview);
  await writeJsonAtomic(path.join(result.runDirectory, "completion.json"), completion);
  await writeJsonAtomic(
    path.join(prepared.workspacePath, enemyTargetingCompletionPath),
    completion,
  );
  await writeJsonAtomic(
    path.join(prepared.workspacePath, ".forge", "roadmap.json"),
    roadmap,
  );

  return { status: "completed", completion, finalReview, roadmap };
}
