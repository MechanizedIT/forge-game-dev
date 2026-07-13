import type { ThreadEvent } from "@openai/codex-sdk";
import path from "node:path";

import type {
  ImplementationHandoff,
  QuestCompletion,
  ReviewResult,
} from "../contracts/index.js";
import {
  captureWorkspaceDiff,
  requireCleanWorkspaceGit,
} from "../demo/git-workspace.js";
import { repositoryRoot } from "../demo/paths.js";
import { prepareDemoWorkspace } from "../demo/workspace.js";
import {
  loadPreparedEnemyTargeting,
  type PreparedQuestBundle,
} from "../quests/prepared-enemy-targeting.js";
import { writeJsonAtomic, writeJsonLinesAtomic } from "./artifacts.js";
import { loadQuestCompletion } from "./completion.js";
import { buildBoundedQuestContext, type BoundedQuestContext } from "./context.js";
import { mapSdkEventToProgress, ProgressReporter } from "./progress.js";
import { createImplementationHandoff, createReviewResult } from "./review.js";
import type { CodexExecutor, CommandRunner } from "./types.js";
import {
  assertApprovedVerificationCommands,
  runApprovedVerifications,
} from "./verification.js";

export interface PreparedQuestRun {
  bundle: PreparedQuestBundle;
  context: BoundedQuestContext;
  workspacePath: string;
}

export type QuestRunResult =
  | { status: "cancelled"; roadmapState: "available" }
  | {
      status: "ready_for_play";
      handoff: ImplementationHandoff;
      review: ReviewResult;
      runDirectory: string;
      roadmapState: "available";
    }
  | {
      status: "failed";
      handoff: ImplementationHandoff;
      review: ReviewResult;
      runDirectory: string;
      roadmapState: "available";
    };

export interface PrepareQuestRunOptions {
  forgeHome?: string;
  questId: string;
  workspacePath?: string;
}

export class QuestAlreadyCompletedError extends Error {
  constructor(readonly completion: QuestCompletion) {
    super(
      `Enemy Targeting was completed at ${completion.completedAt}. Reset explicitly to restore the baseline before rebuilding it.`,
    );
    this.name = "QuestAlreadyCompletedError";
  }
}

export async function prepareQuestRun(options: PrepareQuestRunOptions): Promise<PreparedQuestRun> {
  if (options.questId !== "enemy-targeting") {
    throw new Error(`Unknown or unsupported quest: ${options.questId}`);
  }

  const workspacePath = options.workspacePath
    ? path.resolve(options.workspacePath)
    : (
        await prepareDemoWorkspace(
          options.forgeHome === undefined ? {} : { forgeHome: options.forgeHome },
        )
      ).workspacePath;
  const bundle = await loadPreparedEnemyTargeting(workspacePath, { allowCompleted: true });
  const roadmapQuest = bundle.roadmap.quests.find(
    (quest) => quest.questId === bundle.quest.questId,
  );
  const completion = await loadQuestCompletion(workspacePath);
  if (roadmapQuest?.state === "completed" && completion) {
    if (completion.questId !== bundle.quest.questId) {
      throw new Error("Stored completion does not match the prepared Enemy Targeting quest.");
    }
    throw new QuestAlreadyCompletedError(completion);
  }
  if (roadmapQuest?.state === "completed" || completion) {
    throw new Error(
      "Enemy Targeting completion state is inconsistent. Reset explicitly before another run.",
    );
  }
  assertApprovedVerificationCommands(bundle.quest);
  await requireCleanWorkspaceGit(workspacePath);
  const context = await buildBoundedQuestContext(bundle, workspacePath);
  return { bundle, context, workspacePath };
}

function sanitizeError(error: unknown, workspacePath: string): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replaceAll(workspacePath, "<demo-workspace>").slice(0, 1_000);
}

function sanitizeEvent(event: ThreadEvent): Record<string, unknown> {
  if (event.type === "thread.started") return { type: event.type, threadId: event.thread_id };
  if (event.type === "turn.completed") return { type: event.type, usage: event.usage };
  if (event.type === "turn.failed") return { type: event.type, failed: true };
  if (event.type === "error") return { type: event.type, failed: true };
  if (event.type === "item.started" || event.type === "item.updated" || event.type === "item.completed") {
    const status = "status" in event.item ? event.item.status : undefined;
    return {
      type: event.type,
      itemType: event.item.type,
      ...(status === undefined ? {} : { status }),
    };
  }
  return { type: event.type };
}

function createRunId(): string {
  return `enemy-targeting-${Date.now()}`;
}

export async function executePreparedQuest(
  prepared: PreparedQuestRun,
  options: {
    approved: boolean;
    codexExecutor?: CodexExecutor;
    commandRunner?: CommandRunner;
    onProgress?: (message: string) => void;
    runId?: string;
  },
): Promise<QuestRunResult> {
  if (!options.approved) return { status: "cancelled", roadmapState: "available" };
  if (!options.codexExecutor) throw new Error("An approved run requires the official Codex executor");

  await requireCleanWorkspaceGit(prepared.workspacePath);
  const runId = options.runId ?? createRunId();
  const runDirectory = path.join(prepared.workspacePath, ".forge", "runs", runId);
  const approvedPlanPath = path.join(runDirectory, "plan.json");
  await writeJsonAtomic(approvedPlanPath, prepared.bundle.plan);

  const reporter = new ProgressReporter(options.onProgress ?? (() => {}));
  reporter.emit("understanding");
  reporter.emit("inspecting");
  reporter.emit("building");
  const sanitizedEvents: Record<string, unknown>[] = [];
  let codexError: string | null = null;
  let codexThreadId = "not-started";
  let turnCompleted = false;

  try {
    const session = await options.codexExecutor.start({
      prompt: prepared.context.prompt,
      workspacePath: prepared.workspacePath,
    });
    for await (const event of session.events) {
      sanitizedEvents.push(sanitizeEvent(event));
      const progress = mapSdkEventToProgress(event);
      if (progress) reporter.emit(progress);
      if (event.type === "turn.failed") throw new Error(event.error.message);
      if (event.type === "error") throw new Error(event.message);
      if (event.type === "turn.completed") turnCompleted = true;
    }
    codexThreadId = session.getThreadId() ?? "missing-thread-id";
    if (!turnCompleted) throw new Error("Codex event stream ended without turn.completed");
  } catch (error) {
    codexError = sanitizeError(error, prepared.workspacePath);
  }

  const diff = captureWorkspaceDiff(prepared.workspacePath);
  if (!codexError && diff.files.length > 0) reporter.emit("testing");
  const verificationRuns =
    !codexError && diff.files.length > 0
      ? runApprovedVerifications(
          prepared.bundle.quest,
          repositoryRoot,
          options.commandRunner,
        )
      : [];
  reporter.emit("reviewing");
  const reviewInputs = {
    bundle: prepared.bundle,
    codexError,
    codexThreadId,
    diff,
    runId,
    verificationRuns,
  };
  const handoff = createImplementationHandoff(reviewInputs);
  const review = createReviewResult(reviewInputs);

  await writeJsonLinesAtomic(path.join(runDirectory, "events.jsonl"), sanitizedEvents);
  await writeJsonAtomic(path.join(runDirectory, "diff.json"), diff);
  await writeJsonAtomic(path.join(runDirectory, "implementation-handoff.json"), handoff);
  await writeJsonAtomic(path.join(runDirectory, "review.json"), review);

  const evidence = { handoff, review, runDirectory, roadmapState: "available" as const };
  return review.verdict === "CONDITIONAL PASS"
    ? { status: "ready_for_play", ...evidence }
    : { status: "failed", ...evidence };
}
