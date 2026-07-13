import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  implementationHandoffSchema,
  reviewResultSchema,
  type ImplementationHandoff,
  type ReviewResult,
} from "../contracts/index.js";
import {
  dashboardProgressStages,
  type CreatorConfirmation,
  type DashboardEvent,
  type DashboardPhase,
  type DashboardProgressStage,
  type DashboardSnapshot,
} from "../dashboard/shared.js";
import { prepareDemoWorkspace } from "../demo/workspace.js";
import type { GameLauncher, GameLaunchEvidence } from "../quest-runner/completion.js";
import {
  finalizeQuestAfterPlay,
  loadQuestCompletion,
} from "../quest-runner/completion.js";
import type { CodexExecutor, CommandRunner } from "../quest-runner/types.js";
import {
  executePreparedQuest,
  prepareQuestRun,
  QuestAlreadyCompletedError,
  type PreparedQuestRun,
  type QuestRunResult,
} from "../quest-runner/workflow.js";
import { loadPreparedEnemyTargeting } from "../quests/prepared-enemy-targeting.js";

type ExecutedQuestResult = Extract<QuestRunResult, { status: "ready_for_play" | "failed" }>;
type Subscriber = (event: DashboardEvent) => void;

export class DashboardConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DashboardConflictError";
  }
}

export interface ForgeDashboardServiceOptions {
  codexExecutor: CodexExecutor;
  gameLauncher: GameLauncher;
  commandRunner?: CommandRunner;
  forgeHome?: string;
  now?: () => Date;
}

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf8")) as unknown;
}

async function readTechnicalEvents(filePath: string): Promise<Record<string, unknown>[]> {
  try {
    const contents = await readFile(filePath, "utf8");
    return contents
      .split(/\r?\n/u)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Record<string, unknown>);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class ForgeDashboardService {
  private phase: DashboardPhase = "world_ready";
  private progress: DashboardProgressStage[] = [];
  private prepared: PreparedQuestRun | null = null;
  private result: ExecutedQuestResult | null = null;
  private launchEvidence: GameLaunchEvidence | null = null;
  private activeRun: Promise<void> | null = null;
  private activeLaunch: Promise<void> | null = null;
  private notice: string | null = null;
  private error: string | null = null;
  private readonly subscribers = new Set<Subscriber>();

  constructor(private readonly options: ForgeDashboardServiceOptions) {}

  subscribe(subscriber: Subscriber): () => void {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  }

  private emit(event: DashboardEvent): void {
    for (const subscriber of this.subscribers) subscriber(event);
  }

  private emitRefresh(): void {
    this.emit({ type: "refresh" });
  }

  private addProgress(message: string): void {
    if (!dashboardProgressStages.includes(message as DashboardProgressStage)) return;
    const stage = message as DashboardProgressStage;
    if (this.progress.includes(stage)) return;
    this.progress = [...this.progress, stage];
    this.emit({ type: "progress", progress: this.progress });
  }

  private async workspace(): Promise<{ workspacePath: string; workspaceStatus: "created" | "preserved" }> {
    const result = await prepareDemoWorkspace(
      this.options.forgeHome === undefined ? {} : { forgeHome: this.options.forgeHome },
    );
    if (result.status !== "created" && result.status !== "preserved") {
      throw new Error(`Unexpected dashboard workspace status: ${result.status}`);
    }
    return { workspacePath: result.workspacePath, workspaceStatus: result.status };
  }

  async getSnapshot(): Promise<DashboardSnapshot> {
    const workspace = await this.workspace();
    const bundle = await loadPreparedEnemyTargeting(workspace.workspacePath, {
      allowCompleted: true,
    });
    const completion = await loadQuestCompletion(workspace.workspacePath);
    const runId = completion?.runId ?? this.result?.review.runId ?? null;
    let handoff: ImplementationHandoff | null = this.result?.handoff ?? null;
    let review: ReviewResult | null = this.result?.review ?? null;

    if (completion && runId) {
      handoff = implementationHandoffSchema.parse(
        await readJson(
          path.join(workspace.workspacePath, ".forge", "runs", runId, "implementation-handoff.json"),
        ),
      );
      review = reviewResultSchema.parse(
        await readJson(path.join(workspace.workspacePath, completion.finalReview)),
      );
    }

    const technicalEvents = runId
      ? await readTechnicalEvents(
          path.join(workspace.workspacePath, ".forge", "runs", runId, "events.jsonl"),
        )
      : [];

    return {
      project: {
        projectId: bundle.roadmap.projectId,
        name: "Sample Game",
        engine: "Godot 4.7",
        workspaceStatus: workspace.workspaceStatus,
      },
      phase: completion ? "quest_complete" : this.phase,
      roadmap: bundle.roadmap,
      quest: bundle.quest,
      plan: bundle.plan,
      progress: [...this.progress],
      handoff,
      review,
      completion,
      technicalEvents,
      notice: this.notice,
      error: this.error,
    };
  }

  beginRun(approval: "APPROVE" | "CANCEL"): void {
    if (this.activeRun || this.activeLaunch) {
      throw new DashboardConflictError("Enemy Targeting already has an active operation.");
    }
    if (approval === "CANCEL") {
      this.notice = "Approval cancelled. No Codex run started and nothing was changed.";
      this.error = null;
      this.emitRefresh();
      return;
    }
    if (this.result) {
      throw new DashboardConflictError("Enemy Targeting already has an active or reviewed run.");
    }

    this.phase = "implementation_running";
    this.progress = [];
    this.notice = null;
    this.error = null;
    const operation = this.runApprovedQuest();
    this.activeRun = operation.finally(() => {
      this.activeRun = null;
    });
    this.emitRefresh();
  }

  async waitForRun(): Promise<void> {
    await this.activeRun;
  }

  private async runApprovedQuest(): Promise<void> {
    try {
      this.prepared = await prepareQuestRun({
        questId: "enemy-targeting",
        ...(this.options.forgeHome === undefined ? {} : { forgeHome: this.options.forgeHome }),
      });
      const result = await executePreparedQuest(this.prepared, {
        approved: true,
        codexExecutor: this.options.codexExecutor,
        ...(this.options.commandRunner === undefined
          ? {}
          : { commandRunner: this.options.commandRunner }),
        onProgress: (message) => this.addProgress(message),
      });
      if (result.status === "cancelled") {
        throw new Error("Approved dashboard run was unexpectedly cancelled.");
      }
      this.result = result;
      this.phase = result.status === "ready_for_play" ? "ready_to_play" : "verification_failed";
      this.error =
        result.status === "failed"
          ? result.review.concerns.join(" ") || "Automated verification failed."
          : null;
    } catch (error) {
      if (error instanceof QuestAlreadyCompletedError) {
        this.phase = "quest_complete";
        this.notice = `Enemy Targeting was completed at ${error.completion.completedAt}.`;
      } else {
        this.phase = "blocked";
        this.error = messageFrom(error);
      }
    } finally {
      this.emitRefresh();
    }
  }

  beginLaunch(): Promise<void> {
    if (this.activeLaunch) {
      throw new DashboardConflictError("The prepared game is already launching.");
    }
    if (!this.prepared || !this.result || this.result.status !== "ready_for_play") {
      throw new DashboardConflictError("Enemy Targeting is not ready for creator play.");
    }
    if (this.phase !== "ready_to_play") {
      throw new DashboardConflictError("Creator play is not available in the current state.");
    }

    this.phase = "launching_game";
    this.notice = "Godot is running. Return to Forge after the game closes.";
    this.error = null;
    const operation = this.launchPreparedGame();
    this.activeLaunch = operation.finally(() => {
      this.activeLaunch = null;
    });
    this.emitRefresh();
    return this.activeLaunch;
  }

  private async launchPreparedGame(): Promise<void> {
    try {
      this.launchEvidence = await this.options.gameLauncher(this.prepared!.workspacePath);
      this.phase = "awaiting_confirmation";
      this.notice = "The game closed. Confirm only what you personally observed.";
    } catch (error) {
      this.launchEvidence = null;
      this.phase = "ready_to_play";
      this.error = `Game launch failed: ${messageFrom(error)}`;
      this.notice = "The quest remains incomplete.";
    } finally {
      this.emitRefresh();
    }
  }

  async confirmCreatorResult(response: CreatorConfirmation): Promise<void> {
    if (
      !this.prepared ||
      !this.result ||
      this.result.status !== "ready_for_play" ||
      !this.launchEvidence ||
      this.phase !== "awaiting_confirmation"
    ) {
      throw new DashboardConflictError("A successful game launch must finish before confirmation.");
    }

    const finalized = await finalizeQuestAfterPlay(this.prepared, this.result, {
      launchEvidence: this.launchEvidence,
      creatorResponse: response,
      ...(this.options.now === undefined ? {} : { now: this.options.now }),
    });
    this.launchEvidence = null;

    if (finalized.status === "completed") {
      this.phase = "quest_complete";
      this.notice = "Creator confirmation and completed roadmap state were saved.";
      this.error = null;
    } else if (finalized.status === "reported_failure") {
      this.phase = "ready_to_play";
      this.error = "You reported that the mechanic did not work. The quest remains incomplete.";
      this.notice = "Review the saved evidence before repairing or explicitly resetting.";
    } else if (finalized.status === "cancelled") {
      this.phase = "ready_to_play";
      this.notice = "Confirmation cancelled. The quest remains incomplete.";
      this.error = null;
    } else {
      this.phase = "blocked";
      this.error = finalized.reason;
    }
    this.emitRefresh();
  }
}
