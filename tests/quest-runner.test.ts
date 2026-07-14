import assert from "node:assert/strict";
import type { ThreadEvent } from "@openai/codex-sdk";
import { access, cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  implementationHandoffSchema,
  reviewResultSchema,
} from "../src/contracts/index.js";
import { initializeWorkspaceGitBaseline } from "../src/demo/git-workspace.js";
import { baselineFixturePath } from "../src/demo/paths.js";
import { loadPreparedEnemyTargeting } from "../src/quests/prepared-enemy-targeting.js";
import { buildBoundedQuestContext } from "../src/quest-runner/context.js";
import { mapSdkEventToProgress, ProgressReporter } from "../src/quest-runner/progress.js";
import type { CodexExecutor, CommandRunner } from "../src/quest-runner/types.js";
import { runCommand } from "../src/quest-runner/verification.js";
import {
  executePreparedQuest,
  prepareQuestRun,
  type PreparedQuestRun,
} from "../src/quest-runner/workflow.js";

async function withWorkspace(run: (workspacePath: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "forge-quest-runner-test-"));
  const workspacePath = path.join(root, "demo-workspace");
  try {
    await cp(baselineFixturePath, workspacePath, { recursive: true });
    await initializeWorkspaceGitBaseline(workspacePath);
    await run(workspacePath);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const completedEvents: ThreadEvent[] = [
  { type: "thread.started", thread_id: "fake-thread" },
  { type: "turn.started" },
  {
    type: "item.completed",
    item: {
      id: "change-1",
      type: "file_change",
      changes: [{ path: "scripts/enemy.gd", kind: "update" }],
      status: "completed",
    },
  },
  {
    type: "item.completed",
    item: {
      id: "command-1",
      type: "command_execution",
      command: "godot --headless",
      aggregated_output: "ok",
      exit_code: 0,
      status: "completed",
    },
  },
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

function fakeExecutor(
  onStart: (workspacePath: string) => Promise<void> = async () => {},
  events: ThreadEvent[] = completedEvents,
): CodexExecutor {
  return {
    start: async ({ workspacePath }) => {
      await onStart(workspacePath);
      return {
        events: (async function* () {
          for (const event of events) yield event;
        })(),
        getThreadId: () => "fake-thread",
      };
    },
  };
}

const passingCommands: CommandRunner = (argv) => ({
  exitCode: 0,
  output: argv.includes("godot:verify")
    ? "FORGE_ENEMY_TARGETING_VERIFY_OK idle=pass detection=pass chase=pass player=pass"
    : "19 tests passed",
});

async function modifyEnemy(workspacePath: string): Promise<void> {
  const enemyPath = path.join(workspacePath, "scripts", "enemy.gd");
  const current = await readFile(enemyPath, "utf8");
  await writeFile(enemyPath, `${current}\n# controlled fake SDK change\n`, "utf8");
}

async function prepare(workspacePath: string): Promise<PreparedQuestRun> {
  return prepareQuestRun({ questId: "enemy-targeting", workspacePath });
}

test("invalid quest and plan data is rejected before execution", async () => {
  await assert.rejects(prepareQuestRun({ questId: "missing-quest", workspacePath: "unused" }), /Unknown/);
  await withWorkspace(async (workspacePath) => {
    const planPath = path.join(workspacePath, ".forge", "plans", "enemy-targeting.json");
    const plan = JSON.parse(await readFile(planPath, "utf8")) as Record<string, unknown>;
    await writeFile(planPath, JSON.stringify({ ...plan, stage: "IMPLEMENT" }), "utf8");
    await assert.rejects(prepare(workspacePath));
  });
});

test("approval cancellation starts no SDK run and never completes the quest", async () => {
  await withWorkspace(async (workspacePath) => {
    const prepared = await prepare(workspacePath);
    let starts = 0;
    const executor = fakeExecutor(async () => {
      starts += 1;
    });
    const result = await executePreparedQuest(prepared, {
      approved: false,
      codexExecutor: executor,
    });

    assert.equal(result.status, "cancelled");
    assert.equal(result.roadmapState, "available");
    assert.equal(starts, 0);
    await assert.rejects(access(path.join(workspacePath, ".forge", "runs")));
    const bundle = await loadPreparedEnemyTargeting(workspacePath);
    assert.equal(bundle.roadmap.quests[0]?.state, "available");
  });
});

test("bounded context includes only declared files and approved instructions", async () => {
  await withWorkspace(async (workspacePath) => {
    await writeFile(path.join(workspacePath, "secret.txt"), "DO-NOT-INCLUDE", "utf8");
    const bundle = await loadPreparedEnemyTargeting(workspacePath);
    const context = await buildBoundedQuestContext(bundle, workspacePath);

    assert.deepEqual(context.allowedChangeFiles, [
      "main.tscn",
      "scripts/enemy.gd",
      "scripts/verify_fixture.gd",
    ]);
    assert.match(context.prompt, /QUEST JSON/);
    assert.match(context.prompt, /APPROVED PLAN JSON/);
    assert.match(context.prompt, /scripts\/player\.gd/);
    assert.match(context.prompt, /exported NodePath/);
    assert.match(context.prompt, /Do not assign a NodePath value to a directly exported CharacterBody2D/);
    assert.doesNotMatch(context.prompt, /DO-NOT-INCLUDE/);
  });
});

test("SDK events map to deduplicated creator-friendly progress", () => {
  assert.equal(mapSdkEventToProgress(completedEvents[0]!), "inspecting");
  assert.equal(mapSdkEventToProgress(completedEvents[2]!), "building");
  assert.equal(mapSdkEventToProgress(completedEvents[3]!), "testing");
  assert.equal(mapSdkEventToProgress(completedEvents[4]!), null);

  const messages: string[] = [];
  const reporter = new ProgressReporter((message) => messages.push(message));
  reporter.emit("building");
  reporter.emit("building");
  reporter.emit("testing");
  reporter.emit("building");
  assert.deepEqual(messages, ["Updating the game", "Running verification"]);
});

test("the real command runner can invoke npm without a Windows shell", () => {
  const result = runCommand(["npm", "--version"], process.cwd());
  assert.equal(result.exitCode, 0, result.output);
  assert.match(result.output, /^\d+\.\d+\.\d+/);
});

test("a successful fake SDK run writes valid handoff and conditional review artifacts", async () => {
  await withWorkspace(async (workspacePath) => {
    const result = await executePreparedQuest(await prepare(workspacePath), {
      approved: true,
      codexExecutor: fakeExecutor(modifyEnemy),
      commandRunner: passingCommands,
      runId: "enemy-targeting-success-test",
    });

    assert.equal(
      result.status,
      "ready_for_play",
      result.status === "failed" ? JSON.stringify(result.review) : undefined,
    );
    if (result.status !== "ready_for_play") return;
    assert.equal(result.review.verdict, "CONDITIONAL PASS");
    assert.equal(result.review.nextStage, "REVIEW");
    assert.equal(result.roadmapState, "available");
    assert.equal(result.handoff.codexThreadId, "fake-thread");

    const handoff = implementationHandoffSchema.parse(
      JSON.parse(await readFile(path.join(result.runDirectory, "implementation-handoff.json"), "utf8")),
    );
    const review = reviewResultSchema.parse(
      JSON.parse(await readFile(path.join(result.runDirectory, "review.json"), "utf8")),
    );
    assert.equal(handoff.status, "succeeded");
    assert.equal(review.criteria.at(-1)?.result, "pending_play");
  });
});

test("verification failure produces FAIL and no false completion", async () => {
  await withWorkspace(async (workspacePath) => {
    const failingCommands: CommandRunner = (argv) =>
      argv.includes("godot:verify")
        ? { exitCode: 1, output: "verification failed" }
        : { exitCode: 0, output: "tests passed" };
    const result = await executePreparedQuest(await prepare(workspacePath), {
      approved: true,
      codexExecutor: fakeExecutor(modifyEnemy),
      commandRunner: failingCommands,
      runId: "enemy-targeting-failure-test",
    });

    assert.equal(result.status, "failed");
    if (result.status !== "failed") return;
    assert.equal(result.review.verdict, "FAIL");
    assert.equal(result.review.nextStage, "REVIEW");
    assert.equal(result.roadmapState, "available");
    const roadmap = (await loadPreparedEnemyTargeting(workspacePath)).roadmap;
    assert.equal(roadmap.quests[0]?.state, "available");
  });
});

test("an out-of-plan file fails scope review and cannot produce a successful handoff", async () => {
  await withWorkspace(async (workspacePath) => {
    const result = await executePreparedQuest(await prepare(workspacePath), {
      approved: true,
      codexExecutor: fakeExecutor(async (target) => {
        await modifyEnemy(target);
        await writeFile(path.join(target, "unexpected.txt"), "out of scope\n", "utf8");
      }),
      commandRunner: passingCommands,
      runId: "enemy-targeting-scope-failure-test",
    });

    assert.equal(result.status, "failed");
    if (result.status !== "failed") return;
    assert.equal(result.review.scope.result, "failed");
    assert.deepEqual(result.review.scope.unexpectedFiles, ["unexpected.txt"]);
    assert.equal(result.handoff.status, "partial");
    assert.match(result.handoff.deviations[0] ?? "", /unexpected\.txt/);
    assert.equal(result.roadmapState, "available");
  });
});

test("review validation refuses PASS before creator play confirmation", async () => {
  await withWorkspace(async (workspacePath) => {
    const result = await executePreparedQuest(await prepare(workspacePath), {
      approved: true,
      codexExecutor: fakeExecutor(modifyEnemy),
      commandRunner: passingCommands,
      runId: "enemy-targeting-review-test",
    });
    if (result.status !== "ready_for_play") {
      const details = result.status === "failed" ? JSON.stringify(result.review) : result.status;
      assert.fail(`Expected controlled conditional pass: ${details}`);
    }

    assert.throws(() =>
      reviewResultSchema.parse({
        ...result.review,
        verdict: "PASS",
        nextStage: "DOCUMENT",
      }),
    );
  });
});
