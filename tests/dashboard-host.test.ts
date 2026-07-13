import assert from "node:assert/strict";
import type { ThreadEvent } from "@openai/codex-sdk";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { dashboardProgressStages, type CreatorConfirmation } from "../src/dashboard/shared.js";
import {
  DashboardConflictError,
  ForgeDashboardService,
  type ForgeDashboardServiceOptions,
} from "../src/dashboard-host/service.js";
import { createForgeDashboardServer } from "../src/dashboard-host/server.js";
import { repositoryRoot } from "../src/demo/paths.js";
import type { CodexExecutor, CommandRunner } from "../src/quest-runner/types.js";

const completedAt = "2026-07-13T23:30:00.000Z";
const completedEvents: ThreadEvent[] = [
  { type: "thread.started", thread_id: "dashboard-test-thread" },
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
      command: "npm run godot:verify",
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

const passingCommands: CommandRunner = (argv) => ({
  exitCode: 0,
  output: argv.includes("godot:verify")
    ? "FORGE_ENEMY_TARGETING_VERIFY_OK idle=pass detection=pass chase=pass player=pass"
    : "checks passed",
});

function fakeExecutor(options: {
  beforeEvents?: (workspacePath: string) => Promise<void>;
  onStart?: () => void;
} = {}): CodexExecutor {
  return {
    start: async ({ workspacePath }) => {
      options.onStart?.();
      if (options.beforeEvents) await options.beforeEvents(workspacePath);
      const enemyPath = path.join(workspacePath, "scripts", "enemy.gd");
      await writeFile(
        enemyPath,
        `${await readFile(enemyPath, "utf8")}\n# dashboard host test change\n`,
        "utf8",
      );
      return {
        events: (async function* () {
          for (const event of completedEvents) yield event;
        })(),
        getThreadId: () => "dashboard-test-thread",
      };
    },
  };
}

async function withForgeHome(run: (forgeHome: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "forge-dashboard-host-test-"));
  try {
    await run(path.join(root, "Forge"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function createService(
  forgeHome: string,
  overrides: Partial<ForgeDashboardServiceOptions> = {},
): ForgeDashboardService {
  return new ForgeDashboardService({
    forgeHome,
    codexExecutor: fakeExecutor(),
    commandRunner: passingCommands,
    gameLauncher: async () => ({ version: "4.7.stable.test" }),
    now: () => new Date(completedAt),
    ...overrides,
  });
}

async function runToConfirmation(service: ForgeDashboardService): Promise<void> {
  service.beginRun("APPROVE");
  await service.waitForRun();
  assert.equal((await service.getSnapshot()).phase, "ready_to_play");
  await service.beginLaunch();
  assert.equal((await service.getSnapshot()).phase, "awaiting_confirmation");
}

test("dashboard loads the real prepared roadmap, quest, and plan", async () => {
  await withForgeHome(async (forgeHome) => {
    const snapshot = await createService(forgeHome).getSnapshot();
    assert.equal(snapshot.project.projectId, "sample-game");
    assert.equal(snapshot.quest.questId, "enemy-targeting");
    assert.equal(snapshot.plan.questId, snapshot.quest.questId);
    assert.equal(snapshot.roadmap.quests[0]?.questId, snapshot.quest.questId);
    assert.equal(snapshot.roadmap.quests[0]?.state, "available");
    assert.equal(snapshot.review, null);
  });
});

test("approval starts one real runner execution and rejects a duplicate", async () => {
  await withForgeHome(async (forgeHome) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    let starts = 0;
    const service = createService(forgeHome, {
      codexExecutor: fakeExecutor({ beforeEvents: async () => gate, onStart: () => { starts += 1; } }),
    });
    service.beginRun("APPROVE");
    assert.throws(() => service.beginRun("APPROVE"), DashboardConflictError);
    assert.throws(() => service.beginRun("CANCEL"), DashboardConflictError);
    release();
    await service.waitForRun();
    assert.equal(starts, 1);
    assert.equal((await service.getSnapshot()).phase, "ready_to_play");
  });
});

test("approval cancellation starts no SDK execution", async () => {
  await withForgeHome(async (forgeHome) => {
    let starts = 0;
    const service = createService(forgeHome, {
      codexExecutor: fakeExecutor({ onStart: () => { starts += 1; } }),
    });
    service.beginRun("CANCEL");
    const snapshot = await service.getSnapshot();
    assert.equal(starts, 0);
    assert.equal(snapshot.phase, "world_ready");
    assert.match(snapshot.notice ?? "", /No Codex run started/);
  });
});

test("the host delivers all five friendly progress stages in order", async () => {
  await withForgeHome(async (forgeHome) => {
    const service = createService(forgeHome);
    const delivered: string[][] = [];
    const unsubscribe = service.subscribe((event) => {
      if (event.type === "progress") delivered.push([...event.progress]);
    });
    service.beginRun("APPROVE");
    await service.waitForRun();
    unsubscribe();
    assert.deepEqual(delivered.at(-1), [...dashboardProgressStages]);
    assert.deepEqual((await service.getSnapshot()).progress, [...dashboardProgressStages]);
  });
});

test("verification failure produces real evidence and cannot launch", async () => {
  await withForgeHome(async (forgeHome) => {
    const failingCommands: CommandRunner = (argv) => ({
      exitCode: argv.includes("godot:verify") ? 1 : 0,
      output: argv.includes("godot:verify") ? "controlled verification failure" : "checks passed",
    });
    const service = createService(forgeHome, { commandRunner: failingCommands });
    service.beginRun("APPROVE");
    await service.waitForRun();
    const snapshot = await service.getSnapshot();
    assert.equal(snapshot.phase, "verification_failed");
    assert.equal(snapshot.review?.verdict, "FAIL");
    assert.equal(snapshot.completion, null);
    assert.throws(() => service.beginLaunch(), DashboardConflictError);
  });
});

test("game launch failure leaves confirmation and completion unavailable", async () => {
  await withForgeHome(async (forgeHome) => {
    const service = createService(forgeHome, {
      gameLauncher: async () => { throw new Error("controlled launch failure"); },
    });
    service.beginRun("APPROVE");
    await service.waitForRun();
    await service.beginLaunch();
    const snapshot = await service.getSnapshot();
    assert.equal(snapshot.phase, "ready_to_play");
    assert.match(snapshot.error ?? "", /controlled launch failure/);
    assert.equal(snapshot.completion, null);
    await assert.rejects(
      service.confirmCreatorResult("I SAW IT WORK"),
      DashboardConflictError,
    );
  });
});

test("creator cancellation and rejection both leave the quest incomplete", async () => {
  for (const response of ["CANCEL", "IT DID NOT WORK"] as CreatorConfirmation[]) {
    await withForgeHome(async (forgeHome) => {
      const service = createService(forgeHome);
      await runToConfirmation(service);
      await service.confirmCreatorResult(response);
      const snapshot = await service.getSnapshot();
      assert.equal(snapshot.phase, "ready_to_play");
      assert.equal(snapshot.completion, null);
      assert.equal(snapshot.roadmap.quests[0]?.state, "available");
    });
  }
});

test("successful confirmation persists completion and a fresh dashboard reloads it", async () => {
  await withForgeHome(async (forgeHome) => {
    const service = createService(forgeHome);
    await runToConfirmation(service);
    await service.confirmCreatorResult("I SAW IT WORK");
    const completed = await service.getSnapshot();
    assert.equal(completed.phase, "quest_complete");
    assert.equal(completed.review?.verdict, "PASS");
    assert.equal(completed.completion?.creatorConfirmation.response, "I SAW IT WORK");
    assert.equal(completed.roadmap.quests[0]?.state, "completed");

    const reloaded = await createService(forgeHome).getSnapshot();
    assert.equal(reloaded.phase, "quest_complete");
    assert.equal(reloaded.roadmap.quests[0]?.state, "completed");
    assert.equal(reloaded.completion?.completedAt, completedAt);
  });
});

test("the local HTTP host serves the dashboard and validated state API", async () => {
  await withForgeHome(async (forgeHome) => {
    const staticRoot = path.join(path.dirname(forgeHome), "static");
    await mkdir(staticRoot, { recursive: true });
    await writeFile(path.join(staticRoot, "index.html"), "<main>Forge host test</main>", "utf8");
    const server = createForgeDashboardServer(createService(forgeHome), staticRoot);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const address = server.address() as AddressInfo;
      const base = `http://127.0.0.1:${address.port}`;
      const state = await fetch(`${base}/api/state`);
      const snapshot = (await state.json()) as { quest: { questId: string } };
      assert.equal(state.status, 200);
      assert.equal(snapshot.quest.questId, "enemy-targeting");
      assert.match(await (await fetch(base)).text(), /Forge host test/);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});

test("the command-line quest path still cancels safely without interactive approval", async () => {
  await withForgeHome(async (forgeHome) => {
    const tsxCli = path.join(repositoryRoot, "node_modules", "tsx", "dist", "cli.mjs");
    const result = spawnSync(
      process.execPath,
      [tsxCli, path.join(repositoryRoot, "src", "quest-runner", "cli.ts"), "enemy-targeting"],
      {
        cwd: repositoryRoot,
        env: { ...process.env, FORGE_HOME: forgeHome },
        encoding: "utf8",
        windowsHide: true,
      },
    );
    assert.equal(result.status, 2, `${result.stdout}\n${result.stderr}`);
    assert.match(`${result.stdout}${result.stderr}`, /No Codex run started/);
  });
});
