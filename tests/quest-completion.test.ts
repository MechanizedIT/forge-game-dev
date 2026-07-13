import assert from "node:assert/strict";
import type { ThreadEvent } from "@openai/codex-sdk";
import { access, cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  questCompletionSchema,
  reviewResultSchema,
  roadmapSchema,
} from "../src/contracts/index.js";
import { initializeWorkspaceGitBaseline } from "../src/demo/git-workspace.js";
import { baselineFixturePath } from "../src/demo/paths.js";
import { loadPreparedEnemyTargeting } from "../src/quests/prepared-enemy-targeting.js";
import {
  completeQuestAfterPlay,
  enemyTargetingCompletionPath,
} from "../src/quest-runner/completion.js";
import type { CodexExecutor, CommandRunner } from "../src/quest-runner/types.js";
import {
  executePreparedQuest,
  prepareQuestRun,
  QuestAlreadyCompletedError,
  type PreparedQuestRun,
  type QuestRunResult,
} from "../src/quest-runner/workflow.js";

const completedAt = "2026-07-13T23:00:00.000Z";
const sdkEvents: ThreadEvent[] = [
  { type: "thread.started", thread_id: "completion-test-thread" },
  { type: "turn.started" },
  {
    type: "turn.completed",
    usage: {
      input_tokens: 10,
      cached_input_tokens: 0,
      output_tokens: 5,
      reasoning_output_tokens: 1,
    },
  },
];

async function withWorkspace(run: (workspacePath: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "forge-quest-completion-test-"));
  const workspacePath = path.join(root, "demo-workspace");
  try {
    await cp(baselineFixturePath, workspacePath, { recursive: true });
    await initializeWorkspaceGitBaseline(workspacePath);
    await run(workspacePath);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const passingCommands: CommandRunner = (argv) => ({
  exitCode: 0,
  output: argv.includes("godot:verify")
    ? "FORGE_ENEMY_TARGETING_VERIFY_OK idle=pass detection=pass chase=pass player=pass"
    : "checks passed",
});

function fakeExecutor(): CodexExecutor {
  return {
    start: async ({ workspacePath }) => {
      const enemyPath = path.join(workspacePath, "scripts", "enemy.gd");
      await writeFile(
        enemyPath,
        `${await readFile(enemyPath, "utf8")}\n# completion test change\n`,
        "utf8",
      );
      return {
        events: (async function* () {
          for (const event of sdkEvents) yield event;
        })(),
        getThreadId: () => "completion-test-thread",
      };
    },
  };
}

async function createRun(
  workspacePath: string,
  commandRunner: CommandRunner = passingCommands,
): Promise<{
  prepared: PreparedQuestRun;
  result: Extract<QuestRunResult, { status: "ready_for_play" | "failed" }>;
}> {
  const prepared = await prepareQuestRun({ questId: "enemy-targeting", workspacePath });
  const result = await executePreparedQuest(prepared, {
    approved: true,
    codexExecutor: fakeExecutor(),
    commandRunner,
    runId: "enemy-targeting-completion-test",
  });
  if (result.status === "cancelled") throw new Error("Approved test run was cancelled");
  return { prepared, result };
}

async function assertIncomplete(workspacePath: string): Promise<void> {
  const bundle = await loadPreparedEnemyTargeting(workspacePath);
  assert.equal(bundle.roadmap.quests[0]?.state, "available");
  await assert.rejects(access(path.join(workspacePath, enemyTargetingCompletionPath)));
}

test("successful automated review plus creator confirmation persists complete state", async () => {
  await withWorkspace(async (workspacePath) => {
    const { prepared, result } = await createRun(workspacePath);
    let launches = 0;
    const completionResult = await completeQuestAfterPlay(prepared, result, {
      launchGame: async (target) => {
        launches += 1;
        assert.equal(target, workspacePath);
        return { version: "4.7.stable.test" };
      },
      requestCreatorResponse: async () => "I SAW IT WORK",
      now: () => new Date(completedAt),
    });

    assert.equal(completionResult.status, "completed");
    if (completionResult.status !== "completed") return;
    assert.equal(launches, 1);
    assert.equal(completionResult.finalReview.verdict, "PASS");
    assert.equal(completionResult.finalReview.playCheck.result, "passed");
    assert.equal(completionResult.completion.workflowState, "COMPLETE");
    assert.equal(completionResult.completion.creatorConfirmation.response, "I SAW IT WORK");
    assert.equal(completionResult.completion.completedAt, completedAt);

    const roadmap = roadmapSchema.parse(
      JSON.parse(await readFile(path.join(workspacePath, ".forge", "roadmap.json"), "utf8")),
    );
    const persistedCompletion = questCompletionSchema.parse(
      JSON.parse(
        await readFile(path.join(workspacePath, enemyTargetingCompletionPath), "utf8"),
      ),
    );
    const finalReview = reviewResultSchema.parse(
      JSON.parse(await readFile(path.join(result.runDirectory, "final-review.json"), "utf8")),
    );
    assert.equal(roadmap.quests[0]?.state, "completed");
    assert.equal(persistedCompletion.roadmapState, "completed");
    assert.equal(
      finalReview.criteria.find((criterion) => criterion.criterionId === "AC-6")?.result,
      "passed",
    );
  });
});

test("creator reporting failure leaves the quest incomplete", async () => {
  await withWorkspace(async (workspacePath) => {
    const { prepared, result } = await createRun(workspacePath);
    const completion = await completeQuestAfterPlay(prepared, result, {
      launchGame: async () => ({ version: "4.7.stable.test" }),
      requestCreatorResponse: async () => "IT DID NOT WORK",
    });
    assert.equal(completion.status, "reported_failure");
    await assertIncomplete(workspacePath);
  });
});

test("creator cancellation leaves the quest incomplete", async () => {
  await withWorkspace(async (workspacePath) => {
    const { prepared, result } = await createRun(workspacePath);
    const completion = await completeQuestAfterPlay(prepared, result, {
      launchGame: async () => ({ version: "4.7.stable.test" }),
      requestCreatorResponse: async () => "CANCEL",
    });
    assert.equal(completion.status, "cancelled");
    await assertIncomplete(workspacePath);
  });
});

test("a non-exact success phrase is rejected without recording confirmation", async () => {
  await withWorkspace(async (workspacePath) => {
    const { prepared, result } = await createRun(workspacePath);
    await assert.rejects(
      completeQuestAfterPlay(prepared, result, {
        launchGame: async () => ({ version: "4.7.stable.test" }),
        requestCreatorResponse: async () => "I saw it work",
      }),
    );
    await assertIncomplete(workspacePath);
  });
});

test("game launch failure cannot complete the quest or request confirmation", async () => {
  await withWorkspace(async (workspacePath) => {
    const { prepared, result } = await createRun(workspacePath);
    let confirmationRequests = 0;
    const completion = await completeQuestAfterPlay(prepared, result, {
      launchGame: async () => {
        throw new Error("controlled launch failure");
      },
      requestCreatorResponse: async () => {
        confirmationRequests += 1;
        return "I SAW IT WORK";
      },
    });
    assert.equal(completion.status, "launch_failed");
    assert.equal(confirmationRequests, 0);
    await assertIncomplete(workspacePath);
  });
});

test("failed automated verification cannot launch or complete the quest", async () => {
  await withWorkspace(async (workspacePath) => {
    const failingCommands: CommandRunner = (argv) => ({
      exitCode: argv.includes("godot:verify") ? 1 : 0,
      output: argv.includes("godot:verify") ? "verification failed" : "checks passed",
    });
    const { prepared, result } = await createRun(workspacePath, failingCommands);
    let launches = 0;
    const completion = await completeQuestAfterPlay(prepared, result, {
      launchGame: async () => {
        launches += 1;
        return { version: "4.7.stable.test" };
      },
      requestCreatorResponse: async () => "I SAW IT WORK",
    });
    assert.equal(result.status, "failed");
    assert.equal(completion.status, "not_eligible");
    assert.equal(launches, 0);
    await assertIncomplete(workspacePath);
  });
});

test("an already-completed quest is reported before dirty-workspace rebuild checks", async () => {
  await withWorkspace(async (workspacePath) => {
    const { prepared, result } = await createRun(workspacePath);
    const completion = await completeQuestAfterPlay(prepared, result, {
      launchGame: async () => ({ version: "4.7.stable.test" }),
      requestCreatorResponse: async () => "I SAW IT WORK",
      now: () => new Date(completedAt),
    });
    assert.equal(completion.status, "completed");

    await assert.rejects(
      prepareQuestRun({ questId: "enemy-targeting", workspacePath }),
      (error: unknown) =>
        error instanceof QuestAlreadyCompletedError &&
        error.completion.completedAt === completedAt,
    );
  });
});
