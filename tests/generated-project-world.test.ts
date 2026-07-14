import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { gameBlueprintSchema, gitBaselineResultSchema, godotVerificationResultSchema, type GameBlueprint } from "../src/contracts/index.js";
import { fingerprintBlueprint } from "../src/blueprint-planner/service.js";
import { createForgeDashboardServer } from "../src/dashboard-host/server.js";
import type { ForgeDashboardService } from "../src/dashboard-host/service.js";
import {
  GeneratedProjectWorldConflictError,
  GeneratedProjectWorldService,
  type GeneratedWorldLaunchRequest,
} from "../src/generated-project-world/service.js";
import { ProjectCreationService } from "../src/project-creation/service.js";
import type { ApprovedBlueprintEnvelope } from "../src/project-creation/shared.js";

const createdAt = "2026-07-14T18:00:00.000Z";
const openedAt = "2026-07-14T19:00:00.000Z";

function blueprint(): GameBlueprint {
  return gameBlueprintSchema.parse({
    projectName: "Last-Moment Pulse",
    vision: "A compact top-down arena about reclaiming space at the last moment.",
    foundation: "top_down_arena",
    inputMode: "keyboard",
    coreAction: "Move and create space.",
    funTarget: "Time a future pulse just before an enemy reaches the player.",
    smallestPlayableResult: "One player, one approaching enemy, and one repeatable pulse in a bounded arena.",
    firstPlayableMilestone: "Move in a bounded arena, meet one enemy, and push it away with a visible pulse.",
    quests: [
      { reference: "Q1", title: "Build the Bounded Arena", visibleOutcome: "A bounded arena appears.", dependencies: [] },
      { reference: "Q2", title: "Add Responsive Movement", visibleOutcome: "The player moves in four directions.", dependencies: ["Q1"] },
      { reference: "Q3", title: "Create the Approaching Enemy", visibleOutcome: "One enemy approaches the player.", dependencies: ["Q1", "Q2"] },
      { reference: "Q4", title: "Implement the Push Pulse", visibleOutcome: "Space pushes the nearby enemy away.", dependencies: ["Q2", "Q3"] },
    ],
    includedScope: ["One arena", "Keyboard movement", "One enemy", "One pulse"],
    excludedScope: ["External art", "Audio", "Generated quest implementation"],
    acceptanceCriteria: [
      { reference: "AC-1", questReference: "Q1", criterion: "The arena is visible.", verificationReferences: ["V-1"] },
      { reference: "AC-2", questReference: "Q2", criterion: "Movement responds.", verificationReferences: ["V-2"] },
      { reference: "AC-3", questReference: "Q3", criterion: "The enemy approaches.", verificationReferences: ["V-3"] },
      { reference: "AC-4", questReference: "Q4", criterion: "The pulse pushes the enemy.", verificationReferences: ["V-4"] },
    ],
    verificationIdeas: [
      { reference: "V-1", questReference: "Q1", idea: "Inspect the bounded starter layout." },
      { reference: "V-2", questReference: "Q2", idea: "Exercise arrow and WASD movement." },
      { reference: "V-3", questReference: "Q3", idea: "Observe the enemy closing distance." },
      { reference: "V-4", questReference: "Q4", idea: "Press Space and observe displacement." },
    ],
    projectDocumentationSummary: "A controlled Top-down Arena project.",
    initialChronicleSummary: "Forge created and verified the starter project.",
  });
}

function envelope(): ApprovedBlueprintEnvelope {
  const value = blueprint();
  return {
    blueprint: value,
    blueprintSha256: fingerprintBlueprint(value),
    approvedAt: createdAt,
    provenance: {
      model: "gpt-5.6", reasoningEffort: "high", sandbox: "read-only", network: "disabled",
      threadId: "world-test-thread", attempts: 1, latencyMs: 1,
      usage: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 1, reasoningOutputTokens: 0 },
    },
  };
}

function ids(...values: string[]): () => string {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)]!;
}

async function createFixture(root: string): Promise<{ forgeHome: string; projectId: string; projectPath: string }> {
  const forgeHome = path.join(root, "Forge");
  const service = new ProjectCreationService({
    forgeHome,
    now: () => new Date(createdAt),
    randomId: ids("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
    verifyGodot: async ({ projectId, verifiedAt }) => godotVerificationResultSchema.parse({
      schemaVersion: 1, projectId, status: "passed", godotVersion: "4.7.stable.test",
      arguments: ["--headless", "--path", ".", "--script", "res://scripts/verify_project.gd"],
      successMarker: "FORGE_TOP_DOWN_ARENA_VERIFY_OK",
      output: "FORGE_TOP_DOWN_ARENA_VERIFY_OK main=pass player=pass input=pass movement=pass objective=pass scripts=pass external=none",
      verifiedAt,
    }),
    createGitBaseline: async ({ projectId, committedAt }) => gitBaselineResultSchema.parse({
      schemaVersion: 1, projectId, status: "passed", commitSha: "a".repeat(40),
      commitMessage: "Forge project baseline", cleanWorktree: true, remoteCount: 0, committedAt,
    }),
    requireCleanGit: () => {},
  });
  service.beginCreation(envelope());
  await service.waitForIdle();
  const project = service.getSnapshot().createdProject;
  assert.ok(project, service.getSnapshot().error ?? "fixture creation failed");
  return { forgeHome, projectId: project.projectId, projectPath: project.projectLocation };
}

async function withFixture(run: (fixture: Awaited<ReturnType<typeof createFixture>>) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "forge-generated-world-test-"));
  try { await run(await createFixture(root)); } finally { await rm(root, { recursive: true, force: true }); }
}

async function digest(filePath: string): Promise<string> {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

test("read-only Project World joins exact Task 5 artifacts without changing project or registry bytes", async () => {
  await withFixture(async ({ forgeHome, projectId, projectPath }) => {
    const watched = [
      path.join(forgeHome, "project-registry.json"),
      path.join(projectPath, ".forge", "project-state.json"),
      path.join(projectPath, ".forge", "roadmap.json"),
      path.join(projectPath, ".forge", "chronicle.json"),
    ];
    const before = await Promise.all(watched.map(digest));
    const snapshot = await new GeneratedProjectWorldService({ forgeHome }).loadWorld(projectId);
    assert.equal(snapshot.project.displayName, "Last-Moment Pulse");
    assert.equal(snapshot.quests.length, 4);
    assert.equal(snapshot.playable.layoutLabel, "Verified starter layout");
    assert.match(snapshot.playable.summary, /verified starter/i);
    assert.deepEqual(snapshot.playable.plannedNotPlayable, ["Enemy approach remains planned.", "The Space-key push pulse remains planned."]);
    assert.ok(snapshot.quests.every((quest) => quest.implementation === "not_enabled"));
    assert.deepEqual(await Promise.all(watched.map(digest)), before);
  });
});

test("explicit open validates first and changes only registry recency", async () => {
  await withFixture(async ({ forgeHome, projectId, projectPath }) => {
    const registryPath = path.join(forgeHome, "project-registry.json");
    const projectState = path.join(projectPath, ".forge", "project-state.json");
    const stateBefore = await digest(projectState);
    const registryBefore = await digest(registryPath);
    const service = new GeneratedProjectWorldService({ forgeHome, now: () => new Date(openedAt) });
    const snapshot = await service.openWorld(projectId);
    assert.equal(snapshot.project.lastOpenedAt, openedAt);
    assert.notEqual(await digest(registryPath), registryBefore);
    assert.equal(await digest(projectState), stateBefore);

    await writeFile(path.join(projectPath, ".forge", "roadmap.json"), "{}", "utf8");
    const failedRegistry = await digest(registryPath);
    await assert.rejects(service.openWorld(projectId), GeneratedProjectWorldConflictError);
    assert.equal(await digest(registryPath), failedRegistry);
  });
});

test("selection and one-file idea activity survive a fresh service while Chronicle and roadmap stay byte-identical", async () => {
  await withFixture(async ({ forgeHome, projectId, projectPath }) => {
    for (const args of [["init"], ["config", "user.name", "Forge Test"], ["config", "user.email", "forge-test@example.invalid"], ["add", "--all"], ["commit", "-m", "Fixture baseline"]]) {
      const result = spawnSync("git", args, { cwd: projectPath, encoding: "utf8", windowsHide: true });
      assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
    }
    const roadmapPath = path.join(projectPath, ".forge", "roadmap.json");
    const chroniclePath = path.join(projectPath, ".forge", "chronicle.json");
    const before = [await digest(roadmapPath), await digest(chroniclePath)];
    const service = new GeneratedProjectWorldService({
      forgeHome,
      now: () => new Date(openedAt),
      randomId: ids("11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222"),
    });
    const initial = await service.loadWorld(projectId);
    const selected = initial.roadmap.quests[3]!.questId;
    await service.saveState(projectId, { currentView: "quest_brief", selectedQuestId: selected });
    const saved = await service.saveIdea(projectId, "Leave a fading ring after each pulse.");
    assert.match(saved.activity.label, /derived from saved seed/i);
    assert.deepEqual([await digest(roadmapPath), await digest(chroniclePath)], before);
    const restored = await new GeneratedProjectWorldService({ forgeHome }).loadWorld(projectId);
    assert.equal(restored.state.currentView, "quest_brief");
    assert.equal(restored.state.selectedQuestId, selected);
    assert.equal(restored.ideaSeeds[0]?.idea, "Leave a fading ring after each pulse.");
    assert.equal(restored.chronicle.entries.length, 1);
    assert.equal(restored.activity.filter((item) => item.source === "derived_idea_activity").length, 1);
    const gitStatus = spawnSync("git", ["status", "--porcelain"], { cwd: projectPath, encoding: "utf8", windowsHide: true });
    assert.equal(gitStatus.status, 0);
    assert.equal(gitStatus.stdout.trim(), "");
  });
});

test("concurrent idea saves serialize without lost records", async () => {
  await withFixture(async ({ forgeHome, projectId }) => {
    const service = new GeneratedProjectWorldService({
      forgeHome,
      now: () => new Date(openedAt),
      randomId: ids("11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222"),
    });
    await Promise.all([service.saveIdea(projectId, "First idea"), service.saveIdea(projectId, "Second idea")]);
    assert.deepEqual((await service.loadWorld(projectId)).ideaSeeds.map((seed) => seed.idea), ["First idea", "Second idea"]);
  });
});

test("stale selection repairs only in memory and broken joins or moved paths fail closed", async () => {
  await withFixture(async ({ forgeHome, projectId, projectPath }) => {
    const statePath = path.join(projectPath, ".forge", "project-state.json");
    const state = JSON.parse(await readFile(statePath, "utf8")) as Record<string, unknown>;
    state.selectedQuestId = "stale-quest";
    await writeFile(statePath, JSON.stringify(state, null, 2), "utf8");
    const before = await digest(statePath);
    const service = new GeneratedProjectWorldService({ forgeHome });
    const repaired = await service.loadWorld(projectId);
    assert.match(repaired.state.repairNotice ?? "", /focused the first roadmap quest in memory/i);
    assert.equal(await digest(statePath), before);

    const manifestPath = path.join(projectPath, ".forge", "project-manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as { artifacts: { roadmap: string } };
    manifest.artifacts.roadmap = "../outside.json";
    await writeFile(manifestPath, JSON.stringify(manifest), "utf8");
    await assert.rejects(service.loadWorld(projectId), GeneratedProjectWorldConflictError);

    const moved = `${projectPath}-moved`;
    await rename(projectPath, moved);
    await assert.rejects(service.loadWorld(projectId), /missing or moved/i);
  });
});

test("Godot launch uses only pinned executable and canonical registered project path", async () => {
  await withFixture(async ({ forgeHome, projectId, projectPath }) => {
    const launches: GeneratedWorldLaunchRequest[] = [];
    const service = new GeneratedProjectWorldService({
      forgeHome,
      resolveGodot: async () => ({ executable: "C:\\Pinned\\Godot.exe", version: "4.7.stable.test", source: "cache" }),
      launchGodot: (request) => launches.push(request),
    });
    assert.equal((await service.launch(projectId)).launched, true);
    assert.deepEqual(launches[0]?.args, ["--path", await realpath(projectPath)]);
    assert.equal(launches[0]?.cwd, await realpath(projectPath));
    await assert.rejects(service.launch(projectId), /already launching/i);
    launches[0]?.onExit();
    await service.launch(projectId);
  });
});

test("host keeps GET read-only and requires same origin plus exact bodies for generated-world mutations", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "forge-generated-world-host-test-"));
  const calls: string[] = [];
  const worldStub = {
    loadWorld: async (projectId: string) => { calls.push(`get:${projectId}`); return { projectId }; },
    openWorld: async (projectId: string) => { calls.push(`open:${projectId}`); return { projectId }; },
    saveState: async (projectId: string) => { calls.push(`state:${projectId}`); return { projectId }; },
    saveIdea: async (projectId: string) => { calls.push(`idea:${projectId}`); return { projectId }; },
    launch: async (projectId: string) => { calls.push(`launch:${projectId}`); return { launched: true }; },
  } as unknown as GeneratedProjectWorldService;
  const server = createForgeDashboardServer({} as ForgeDashboardService, root, undefined, undefined, worldStub);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    assert.equal((await fetch(`${base}/api/projects/pulse-arena-12345678/world`)).status, 200);
    assert.deepEqual(calls, ["get:pulse-arena-12345678"]);
    assert.equal((await fetch(`${base}/api/projects/pulse-arena-12345678/open`, { method: "POST", body: "{}", headers: { "content-type": "application/json" } })).status, 400);
    assert.deepEqual(calls, ["get:pulse-arena-12345678"]);
    assert.equal((await fetch(`${base}/api/projects/pulse-arena-12345678/open`, { method: "POST", body: JSON.stringify({ currentView: "quest_brief" }), headers: { "content-type": "application/json", origin: base } })).status, 400);
    assert.equal((await fetch(`${base}/api/projects/pulse-arena-12345678/open`, { method: "POST", body: "{}", headers: { "content-type": "application/json", origin: base } })).status, 200);
    assert.equal((await fetch(`${base}/api/projects/pulse-arena-12345678/state`, { method: "POST", body: JSON.stringify({ currentView: "quest_brief", selectedQuestId: "q1-build" }), headers: { "content-type": "application/json", origin: base } })).status, 200);
    assert.equal((await fetch(`${base}/api/projects/pulse-arena-12345678/ideas`, { method: "POST", body: JSON.stringify({ idea: "Keep a ring" }), headers: { "content-type": "application/json", origin: base } })).status, 201);
    assert.equal((await fetch(`${base}/api/projects/pulse-arena-12345678/launch`, { method: "POST", body: "{}", headers: { "content-type": "application/json", origin: base } })).status, 202);
    assert.deepEqual(calls, ["get:pulse-arena-12345678", "open:pulse-arena-12345678", "state:pulse-arena-12345678", "idea:pulse-arena-12345678", "launch:pulse-arena-12345678"]);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await rm(root, { recursive: true, force: true });
  }
});
