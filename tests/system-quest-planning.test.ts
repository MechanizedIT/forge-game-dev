import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import path from "node:path";
import test from "node:test";
import { z } from "zod";

import {
  acceptedSystemQuestPlanSchema,
  projectModelSchema,
  systemQuestModelOutputSchema,
  systemQuestPlanningResultSchema,
  type AcceptedSystemQuestPlan,
  type ProjectModel,
} from "../src/contracts/index.js";
import {
  SystemQuestPlanningService,
  fingerprintSystemQuestStructure,
} from "../src/blueprint-planner/system-quest.js";
import { fingerprintProjectStructure } from "../src/blueprint-planner/system-roadmap.js";
import type { BlueprintModelExecutor, BlueprintModelSession, BlueprintModelTurn } from "../src/blueprint-planner/types.js";
import { GeneratedProjectWorldService } from "../src/generated-project-world/service.js";
import { applyAcceptedSystemQuests } from "../src/generated-project-world/system-quest-plan.js";
import { GeneratedQuestRunnerService } from "../src/generated-quest-runner/service.js";
import { createForgeDashboardServer } from "../src/dashboard-host/server.js";
import type { ForgeDashboardService } from "../src/dashboard-host/service.js";
import { createSignalSweepFixture } from "./helpers/generated-quest-fixture.js";

function model(): ProjectModel {
  return projectModelSchema.parse({
    modelVersion: 1,
    project: { projectId: "welcome-beacon", name: "Welcome Beacon", vision: "A small beacon game.", engine: { kind: "godot", version: "4.7", projectFile: "project.godot", mainScene: "res://main.tscn" }, systemIds: ["system-first-playable"] },
    systems: [{ systemId: "system-first-playable", projectId: "welcome-beacon", title: "Beacon Care", outcome: "Keep a useful beacon bright.", status: "active", questIds: ["light-the-beacon"] }],
    quests: [{ questId: "light-the-beacon", systemId: "system-first-playable", title: "Light the Beacon", playerVisibleOutcome: "A bright beacon appears.", doneWhen: ["The beacon is visible."], status: "available", dependsOn: [], workSessionIds: [], latestWorkSessionId: null, extraProof: null }],
    workSessions: [], results: [],
    history: [{ historyEntryId: "project-created", kind: "project_created", occurredAt: "2026-07-15T12:00:00.000Z", summary: "Created the project.", questId: null, workSessionId: null }],
    focus: { selectedSystemId: "system-first-playable", selectedQuestId: "light-the-beacon", nextRecommendedQuestId: "light-the-beacon" },
  });
}

function proposal(): string {
  return JSON.stringify({ resultType: "proposal", quests: [
    { title: "Welcome the Player", playerVisibleOutcome: "The beacon greets the player with a clear warm pulse.", whyItMatters: "The first moment teaches the player why the beacon matters.", doneWhen: ["The first pulse is visible."], excludedScope: ["No weather system."], dependencyIndexes: [] },
    { title: "Answer the Pulse", playerVisibleOutcome: "The harbor answers after the welcome pulse finishes.", whyItMatters: "A visible answer makes the world feel responsive.", doneWhen: ["The answer appears after the pulse."], excludedScope: ["No scoring system."], dependencyIndexes: [0] },
  ] });
}

class QueueExecutor implements BlueprintModelExecutor {
  readonly prompts: string[] = [];
  constructor(private readonly responses: string[]) {}
  start(): BlueprintModelSession {
    return { run: async (prompt): Promise<BlueprintModelTurn> => {
      this.prompts.push(prompt);
      const finalResponse = this.responses.shift();
      if (finalResponse === undefined) throw new Error("No response remains.");
      return { finalResponse, threadId: "system-quest-thread", usage: { inputTokens: 10, cachedInputTokens: 0, outputTokens: 5, reasoningOutputTokens: 1 } };
    } };
  }
}

function persistedPlan(batch: Parameters<Parameters<SystemQuestPlanningService["acceptQuests"]>[4]>[0]): AcceptedSystemQuestPlan {
  return acceptedSystemQuestPlanSchema.parse({ schemaVersion: 1, projectId: "welcome-beacon", systems: [batch] });
}

async function digest(filePath: string): Promise<string> {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

test("quest proposal contract is open and rejects capability, profile, starter, and file authority fields", () => {
  const parsed = systemQuestPlanningResultSchema.parse(JSON.parse(proposal()));
  assert.equal(parsed.resultType, "proposal");
  const unsafe = JSON.parse(proposal()) as { quests: Array<Record<string, unknown>> };
  unsafe.quests[0]!.capability = "beacon";
  assert.equal(systemQuestPlanningResultSchema.safeParse(unsafe).success, false);
  unsafe.quests[0]!.capability = undefined;
  unsafe.quests[0]!.existingFiles = ["scripts/beacon.gd"];
  assert.equal(systemQuestPlanningResultSchema.safeParse(unsafe).success, false);
});

test("live quest suggestions use one required envelope without a top-level union", async () => {
  const schema = z.toJSONSchema(systemQuestModelOutputSchema, { target: "draft-07", reused: "inline" }) as Record<string, unknown>;
  assert.equal(Object.hasOwn(schema, "oneOf"), false);
  assert.deepEqual(schema.required, ["resultType", "clarificationQuestions", "quests"]);
  const executor = new QueueExecutor([JSON.stringify({ ...JSON.parse(proposal()), clarificationQuestions: [] })]);
  const service = new SystemQuestPlanningService(executor);
  service.begin(model(), "system-first-playable", "Make the beacon welcome the player with one warm pulse.");
  await service.waitForIdle();
  assert.equal(service.getSnapshot().phase, "review");

  const clarification = new SystemQuestPlanningService(new QueueExecutor([JSON.stringify({
    resultType: "clarification",
    clarificationQuestions: [{ questionId: "beacon-color", question: "Should the beacon always stay warm?", whyItMatters: "This changes the first visible quest." }],
    quests: [],
  })]));
  clarification.begin(model(), "system-first-playable", "Make the beacon welcome the player with one warm pulse.");
  await clarification.waitForIdle();
  assert.equal(clarification.getSnapshot().phase, "clarification");

  const validQuests = (JSON.parse(proposal()) as { quests: unknown[] }).quests;
  const invalidEnvelopes = [
    { resultType: "proposal", clarificationQuestions: [{ questionId: "beacon-color", question: "Should the beacon always stay warm?", whyItMatters: "This changes the first visible quest." }], quests: validQuests },
    { resultType: "proposal", clarificationQuestions: [], quests: [] },
    { resultType: "proposal", clarificationQuestions: [], quests: validQuests.map((quest, index) => index === 0 ? { ...(quest as Record<string, unknown>), existingFiles: ["scripts/beacon.gd"] } : quest) },
  ];
  for (const invalid of invalidEnvelopes) {
    const rejected = new SystemQuestPlanningService(new QueueExecutor([JSON.stringify(invalid), JSON.stringify(invalid)]));
    rejected.begin(model(), "system-first-playable", "Make the beacon welcome the player with one warm pulse.");
    await rejected.waitForIdle();
    assert.equal(rejected.getSnapshot().phase, "failed");
  }
});

test("ordinary-language refinement accepts an exact short proposal and stops before runner preparation", async () => {
  const source = model();
  const executor = new QueueExecutor([proposal()]);
  const service = new SystemQuestPlanningService(executor, () => Date.parse("2026-07-15T20:00:00.000Z"));
  service.begin(source, "system-first-playable", "Make the beacon welcome the player and let the harbor answer it.");
  await service.waitForIdle();
  const review = service.getSnapshot();
  assert.equal(review.phase, "review");
  assert.equal(review.proposal?.length, 2);
  assert.equal(review.sourceFingerprint, fingerprintSystemQuestStructure(source, "system-first-playable"));
  assert.doesNotMatch(executor.prompts[0]!, /top_down_arena|verification profile|supported game type/iu);
  let saved: AcceptedSystemQuestPlan | null = null;
  await service.acceptQuests("ACCEPT SYSTEM QUESTS", review.proposalFingerprint!, source, null, async (batch) => {
    saved = persistedPlan(batch);
    return saved;
  });
  assert.equal(service.getSnapshot().phase, "quests_accepted");
  assert.equal(saved!.systems[0]!.quests[0]!.workOrder, undefined);
  assert.equal(service.getSnapshot().firstQuestId, saved!.systems[0]!.quests[0]!.questId);
  assert.notEqual(service.getSnapshot().firstQuestId, "light-the-beacon");
  assert.deepEqual(service.getSnapshot().effects, { planningRecordsWritten: 1, gameFilesWritten: 0, commandsRun: 0 });
});

test("an Experience with five saved Steps can plan more in another bounded batch", async () => {
  const expanded = structuredClone(model());
  for (let index = 2; index <= 5; index += 1) {
    const questId = `existing-step-${index}`;
    expanded.systems[0]!.questIds.push(questId);
    expanded.quests.push({ questId, systemId: "system-first-playable", title: `Existing Step ${index}`, playerVisibleOutcome: `The beacon already shows visible result ${index}.`, doneWhen: [`Visible result ${index} remains clear.`], status: "available", dependsOn: [], workSessionIds: [], latestWorkSessionId: null, extraProof: null });
  }
  const source = projectModelSchema.parse(expanded);
  const service = new SystemQuestPlanningService(new QueueExecutor([proposal()]));
  service.begin(source, "system-first-playable", "Add another small response after the existing beacon Steps.");
  await service.waitForIdle();
  const review = service.getSnapshot();
  assert.equal(review.phase, "review");
  let saved!: AcceptedSystemQuestPlan;
  await service.acceptQuests("ACCEPT SYSTEM QUESTS", review.proposalFingerprint!, source, null, async (batch) => (saved = persistedPlan(batch)));
  assert.equal(saved.systems[0]!.baseQuestIds.length, 5);
  assert.equal(saved.systems[0]!.quests.length, 2);
});

test("proposal acceptance rejects changed prompt-driving system or quest wording", async () => {
  for (const change of ["system", "quest"] as const) {
    const source = model();
    const service = new SystemQuestPlanningService(new QueueExecutor([proposal()]));
    service.begin(source, "system-first-playable", "Make the beacon welcome the player and let the harbor answer it.");
    await service.waitForIdle();
    const review = service.getSnapshot();
    const stale = structuredClone(source);
    if (change === "system") stale.systems[0]!.outcome = "The beacon now warns the player about a different danger.";
    else stale.quests[0]!.playerVisibleOutcome = "The beacon now opens a gate instead of welcoming the player.";
    await assert.rejects(() => service.acceptQuests("ACCEPT SYSTEM QUESTS", review.proposalFingerprint!, projectModelSchema.parse(stale), null, async () => { throw new Error("must not save"); }), /changed while these quests were open/);
  }
});

test("cancel before acceptance writes nothing; cancel after acceptance releases transient ownership and reloads saved quests", async () => {
  const source = model();
  const first = new SystemQuestPlanningService(new QueueExecutor([proposal()]));
  first.begin(source, "system-first-playable", "Make the beacon welcome the player and let the harbor answer it.");
  await first.waitForIdle();
  first.cancel("CANCEL QUEST PLANNING", null);
  assert.equal(first.getSnapshot().phase, "cancelled");

  const service = new SystemQuestPlanningService(new QueueExecutor([proposal()]));
  service.begin(source, "system-first-playable", "Make the beacon welcome the player and let the harbor answer it.");
  await service.waitForIdle();
  const review = service.getSnapshot();
  let saved!: AcceptedSystemQuestPlan;
  await service.acceptQuests("ACCEPT SYSTEM QUESTS", review.proposalFingerprint!, source, null, async (batch) => (saved = persistedPlan(batch)));
  service.setWorkOrderReview({ questId: saved.systems[0]!.quests[0]!.questId, existingFiles: ["scripts/beacon.gd"], newFiles: [], fingerprint: "a".repeat(64) });
  service.cancel("CANCEL QUEST PLANNING", saved);
  assert.equal(service.getSnapshot().phase, "cancelled");
  assert.equal(service.getSnapshot().workOrder, null);
  assert.equal(service.getSnapshotFor("welcome-beacon", "system-first-playable", saved).phase, "quests_accepted");
});

test("fixed native quest record overlays after the roadmap and later roadmap reshape strips native IDs", async () => {
  const fixture = await createSignalSweepFixture();
  try {
    const service = new GeneratedProjectWorldService({ forgeHome: fixture.forgeHome });
    const before = await service.loadWorld(fixture.projectId);
    const system = before.projectModel.systems[0]!;
    const batch = {
      systemId: system.systemId,
      baseQuestIds: system.questIds,
      creatorDescription: "Let the signal relay greet the player before the wider station responds.",
      sourceFingerprint: fingerprintSystemQuestStructure(before.projectModel, system.systemId),
      proposalFingerprint: "b".repeat(64), acceptedAt: "2026-07-15T20:00:00.000Z",
      quests: [
        { questId: "quest-welcome-signal", title: "Welcome Signal", playerVisibleOutcome: "A warm signal greets the player at the relay.", whyItMatters: "The first response makes the relay feel useful and alive.", doneWhen: ["A warm signal is visible."], excludedScope: ["No scoring system."], dependsOn: [] },
        { questId: "quest-station-answer", title: "Station Answer", playerVisibleOutcome: "The station answers after the welcome signal.", whyItMatters: "The answer makes the station feel connected to the relay.", doneWhen: ["The answer follows the signal."], excludedScope: ["No new level."], dependsOn: ["quest-welcome-signal"] },
      ],
    };
    await service.saveSystemQuestBatch(fixture.projectId, batch);
    const afterQuests = await service.loadWorld(fixture.projectId);
    assert.deepEqual(afterQuests.projectModel.systems[0]!.questIds.slice(-2), ["quest-welcome-signal", "quest-station-answer"]);
    assert.equal(afterQuests.projectModel.quests.at(-2)!.extraProof, null);
    assert.equal(afterQuests.projectModel.quests.at(-2)!.workSessionIds.length, 0);
    assert.equal(afterQuests.projectModel.quests.at(-1)!.status, "blocked");
    const beforeSessions = structuredClone(afterQuests.projectModel.workSessions);
    const beforeResults = structuredClone(afterQuests.projectModel.results);
    const beforeHistory = structuredClone(afterQuests.projectModel.history);
    await service.saveSystemRoadmap(fixture.projectId, {
      schemaVersion: 1, projectId: fixture.projectId,
      creatorIdea: "A free-form station game where a welcoming relay wakes a connected harbor.",
      sourceFingerprint: fingerprintProjectStructure(afterQuests.projectModel), proposalFingerprint: "c".repeat(64), acceptedAt: "2026-07-15T20:05:00.000Z",
      systems: [
        { systemId: system.systemId, title: "Welcoming Relay", outcome: "The relay greets the player and wakes the station.", questIds: afterQuests.projectModel.systems[0]!.questIds },
        { systemId: "system-harbor-response", title: "Harbor Response", outcome: "The harbor visibly answers the station.", questIds: [] },
        { systemId: "system-storm-rhythm", title: "Storm Rhythm", outcome: "Readable weather changes the station rhythm.", questIds: [] },
      ],
    });
    const roadmapPath = path.join(fixture.projectPath, ".forge/system-roadmap.json");
    const questPlanPath = path.join(fixture.projectPath, ".forge/system-quests.json");
    const roadmapText = await readFile(roadmapPath, "utf8");
    assert.doesNotMatch(roadmapText, /quest-welcome-signal|quest-station-answer/);
    const fixedHashes = [await digest(roadmapPath), await digest(questPlanPath)];
    const reloaded = await service.loadWorld(fixture.projectId);
    await new GeneratedProjectWorldService({ forgeHome: fixture.forgeHome }).loadWorld(fixture.projectId);
    assert.deepEqual(reloaded.projectModel.systems[0]!.questIds.slice(-2), ["quest-welcome-signal", "quest-station-answer"]);
    assert.deepEqual(reloaded.projectModel.workSessions, beforeSessions);
    assert.deepEqual(reloaded.projectModel.results, beforeResults);
    assert.deepEqual(reloaded.projectModel.history, beforeHistory);
    assert.deepEqual([await digest(roadmapPath), await digest(questPlanPath)], fixedHashes, "reads must not rewrite either owned record");
  } finally { await fixture.cleanup(); }
});

test("generated World persistence keeps a sixth Step in the same Experience", async () => {
  const fixture = await createSignalSweepFixture();
  try {
    const service = new GeneratedProjectWorldService({ forgeHome: fixture.forgeHome });
    const before = await service.loadWorld(fixture.projectId);
    const system = before.projectModel.systems[0]!;
    const baseCount = system.questIds.length;
    const quest = (index: number) => ({
      questId: `quest-open-step-${index}`,
      title: `Open Step ${index}`,
      playerVisibleOutcome: `The relay shows another clear playable response number ${index}.`,
      whyItMatters: `This response lets the creator continue expanding the relay Experience number ${index}.`,
      doneWhen: [`The additional response number ${index} is visible.`],
      excludedScope: ["No unrelated level changes."],
      dependsOn: [] as string[],
    });
    await service.saveSystemQuestBatch(fixture.projectId, {
      systemId: system.systemId,
      baseQuestIds: system.questIds,
      creatorDescription: "Add several small relay responses without imposing a total Step ceiling.",
      sourceFingerprint: fingerprintSystemQuestStructure(before.projectModel, system.systemId),
      proposalFingerprint: "6".repeat(64),
      acceptedAt: "2026-07-15T20:00:00.000Z",
      quests: [quest(1), quest(2), quest(3), quest(4)],
    });
    const five = await service.loadWorld(fixture.projectId);
    assert.equal(five.projectModel.systems[0]!.questIds.length, baseCount + 4);
    assert.ok(five.projectModel.systems[0]!.questIds.length > 5);
    await service.saveSystemQuestBatch(fixture.projectId, {
      systemId: system.systemId,
      baseQuestIds: system.questIds,
      creatorDescription: "Add one more small relay response after the first planning batch.",
      sourceFingerprint: fingerprintSystemQuestStructure(five.projectModel, system.systemId),
      proposalFingerprint: "7".repeat(64),
      acceptedAt: "2026-07-15T20:05:00.000Z",
      quests: [quest(5)],
    });
    const six = await service.loadWorld(fixture.projectId);
    assert.equal(six.projectModel.systems[0]!.questIds.length, baseCount + 5);
    assert.equal(six.projectModel.systems[0]!.questIds.at(-1), "quest-open-step-5");
    assert.equal(six.systemQuestPlan?.systems[0]!.quests.length, 5);
  } finally { await fixture.cleanup(); }
});

test("bounded file review accepts exact safe paths, persists readiness, and never changes Godot bytes", async () => {
  const fixture = await createSignalSweepFixture();
  try {
    const service = new GeneratedProjectWorldService({ forgeHome: fixture.forgeHome, now: () => new Date("2026-07-15T21:00:00.000Z") });
    const before = await service.loadWorld(fixture.projectId);
    const system = before.projectModel.systems[0]!;
    await service.saveSystemQuestBatch(fixture.projectId, {
      systemId: system.systemId, baseQuestIds: system.questIds,
      creatorDescription: "Let the relay welcome the player with one small visible response.",
      sourceFingerprint: fingerprintSystemQuestStructure(before.projectModel, system.systemId), proposalFingerprint: "d".repeat(64), acceptedAt: "2026-07-15T20:30:00.000Z",
      quests: [{ questId: "quest-welcome-signal", title: "Welcome Signal", playerVisibleOutcome: "A warm signal greets the player at the relay.", whyItMatters: "The first response makes the relay feel useful and alive.", doneWhen: ["A warm signal is visible."], excludedScope: ["No scoring system."], dependsOn: [] }],
    });
    const projectGodot = path.join(fixture.projectPath, "project.godot");
    const registry = path.join(fixture.forgeHome, "project-registry.json");
    const bytesBefore = [await digest(projectGodot), await digest(registry)];
    const candidates = await service.listSystemQuestFiles(fixture.projectId, system.systemId);
    assert.ok(candidates.length > 0);
    assert.ok(candidates.length <= 64);
    assert.ok(candidates.every((file) => file.relativePath.startsWith("scenes/") || file.relativePath.startsWith("scripts/")));
    const review = await service.reviewSystemQuestWorkOrder(fixture.projectId, system.systemId, "quest-welcome-signal", { existingFiles: [candidates[0]!.relativePath], newFiles: ["scripts/welcome_beacon.gd"] });
    const saved = await service.saveSystemQuestWorkOrder(fixture.projectId, system.systemId, "quest-welcome-signal", { existingFiles: review.existingFiles, newFiles: review.newFiles }, review.fingerprint);
    assert.equal(saved.systems[0]!.quests[0]!.workOrder?.fingerprint, review.fingerprint);
    assert.deepEqual([await digest(projectGodot), await digest(registry)], bytesBefore);
    await assert.rejects(() => service.reviewSystemQuestWorkOrder(fixture.projectId, system.systemId, "quest-welcome-signal", { existingFiles: [], newFiles: ["addons/unsafe.gd"] }), /scenes\/ or scripts/);
    await assert.rejects(() => service.reviewSystemQuestWorkOrder(fixture.projectId, system.systemId, "quest-welcome-signal", { existingFiles: [], newFiles: ["scripts/./welcome_beacon.gd"] }), /scenes\/ or scripts/);
    await assert.rejects(() => readFile(path.join(fixture.projectPath, "scripts/welcome_beacon.gd")), { code: "ENOENT" });
    const resumed = new SystemQuestPlanningService(new QueueExecutor([])).getSnapshotFor(fixture.projectId, system.systemId, saved);
    assert.equal(resumed.phase, "ready");
    assert.equal(resumed.workOrder?.fingerprint, review.fingerprint);
  } finally { await fixture.cleanup(); }
});

test("a completed native quest unlocks a separate confirmed work plan for the next quest", async () => {
  const fixture = await createSignalSweepFixture();
  try {
    const service = new GeneratedProjectWorldService({ forgeHome: fixture.forgeHome, now: () => new Date("2026-07-15T22:00:00.000Z") });
    const before = await service.loadWorld(fixture.projectId);
    const system = before.projectModel.systems[0]!;
    const firstId = "quest-welcome-signal";
    const secondId = "quest-answer-signal";
    const completedPlan = acceptedSystemQuestPlanSchema.parse({ schemaVersion: 1, projectId: fixture.projectId, systems: [{
      systemId: system.systemId,
      baseQuestIds: system.questIds,
      creatorDescription: "Let the relay greet the player, then let the harbor answer it.",
      sourceFingerprint: fingerprintSystemQuestStructure(before.projectModel, system.systemId),
      proposalFingerprint: "a".repeat(64),
      acceptedAt: "2026-07-15T20:30:00.000Z",
      quests: [
        {
          questId: firstId,
          title: "Welcome Signal",
          playerVisibleOutcome: "A warm signal greets the player at the relay.",
          whyItMatters: "The first response makes the relay feel useful and alive.",
          doneWhen: ["A warm signal is visible."],
          excludedScope: ["No scoring system."],
          dependsOn: [],
          workOrder: { existingFiles: ["scripts/main.gd"], newFiles: [], fingerprint: "b".repeat(64), acceptedAt: "2026-07-15T20:31:00.000Z" },
          implementation: { status: "completed", runId: "run-welcome-signal", completedAt: "2026-07-15T20:32:00.000Z", changedFiles: ["scripts/main.gd"], verificationProfile: null, contractFingerprint: "c".repeat(64), creatorConfirmation: "worked" },
        },
        {
          questId: secondId,
          title: "Answer Signal",
          playerVisibleOutcome: "The harbor answers after the welcome pulse finishes.",
          whyItMatters: "The reply makes the small world feel responsive.",
          doneWhen: ["The answer appears after the pulse."],
          excludedScope: ["No scoring system."],
          dependsOn: [firstId],
        },
      ],
    }] });
    const unlockedModel = applyAcceptedSystemQuests(before.projectModel, completedPlan);
    assert.equal(unlockedModel.quests.find((quest) => quest.questId === secondId)?.status, "available");
    const openPlan = structuredClone(completedPlan);
    delete openPlan.systems[0]!.quests[0]!.workOrder;
    delete openPlan.systems[0]!.quests[0]!.implementation;
    openPlan.systems[0]!.quests[1]!.dependsOn = [];
    await service.saveSystemQuestBatch(fixture.projectId, openPlan.systems[0]!);
    const candidates = await service.listSystemQuestFiles(fixture.projectId, system.systemId);
    const review = await service.reviewSystemQuestWorkOrder(fixture.projectId, system.systemId, secondId, { existingFiles: [candidates[0]!.relativePath], newFiles: [] });
    const saved = await service.saveSystemQuestWorkOrder(fixture.projectId, system.systemId, secondId, { existingFiles: review.existingFiles, newFiles: [] }, review.fingerprint);
    assert.equal(saved.systems[0]!.quests[1]!.workOrder?.fingerprint, review.fingerprint);
    assert.equal(saved.systems[0]!.quests[0]!.workOrder, undefined);
    const resumed = new SystemQuestPlanningService(new QueueExecutor([])).getSnapshotFor(fixture.projectId, system.systemId, saved, secondId);
    assert.equal(resumed.phase, "ready");
    assert.equal(resumed.workOrder?.questId, secondId);
  } finally { await fixture.cleanup(); }
});

test("work-order save rechecks active runner work and leaves the fixed record byte-identical", async () => {
  const fixture = await createSignalSweepFixture();
  try {
    const runner = new GeneratedQuestRunnerService({ forgeHome: fixture.forgeHome });
    const service = new GeneratedProjectWorldService({ forgeHome: fixture.forgeHome, generatedRunner: runner });
    const before = await service.loadWorld(fixture.projectId);
    const system = before.projectModel.systems[0]!;
    await service.saveSystemQuestBatch(fixture.projectId, {
      systemId: system.systemId, baseQuestIds: system.questIds,
      creatorDescription: "Let the relay welcome the player with one small visible response.",
      sourceFingerprint: fingerprintSystemQuestStructure(before.projectModel, system.systemId), proposalFingerprint: "f".repeat(64), acceptedAt: "2026-07-15T20:30:00.000Z",
      quests: [{ questId: "quest-welcome-signal", title: "Welcome Signal", playerVisibleOutcome: "A warm signal greets the player at the relay.", whyItMatters: "The first response makes the relay feel useful and alive.", doneWhen: ["A warm signal is visible."], excludedScope: ["No scoring system."], dependsOn: [] }],
    });
    const planned = await service.loadWorld(fixture.projectId);
    await service.saveSystemRoadmap(fixture.projectId, {
      schemaVersion: 1, projectId: fixture.projectId,
      creatorIdea: "A small station game where a welcoming relay wakes the harbor.",
      sourceFingerprint: fingerprintProjectStructure(planned.projectModel), proposalFingerprint: "e".repeat(64), acceptedAt: "2026-07-15T20:31:00.000Z",
      systems: [
        { systemId: system.systemId, title: "Welcoming Relay", outcome: "The relay greets the player and wakes the station.", questIds: planned.projectModel.systems[0]!.questIds },
        { systemId: "system-harbor-response", title: "Harbor Response", outcome: "The harbor answers the station.", questIds: [] },
        { systemId: "system-storm-rhythm", title: "Storm Rhythm", outcome: "Weather changes the station rhythm.", questIds: [] },
      ],
    });
    const recordPath = path.join(fixture.projectPath, ".forge/system-quests.json");
    for (const args of [["add", ".forge/system-quests.json", ".forge/system-roadmap.json"], ["commit", "-m", "Test planning records"]]) {
      const result = spawnSync("git", args, { cwd: fixture.projectPath, encoding: "utf8", windowsHide: true });
      assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
    }
    const candidates = await service.listSystemQuestFiles(fixture.projectId, system.systemId);
    const choice = { existingFiles: [candidates[0]!.relativePath], newFiles: ["scripts/welcome_beacon.gd"] };
    const review = await service.reviewSystemQuestWorkOrder(fixture.projectId, system.systemId, "quest-welcome-signal", choice);
    await runner.prepare(fixture.projectId, before.quests[0]!.questId);
    const recordBefore = await digest(recordPath);
    await assert.rejects(() => service.saveSystemQuestWorkOrder(fixture.projectId, system.systemId, "quest-welcome-signal", choice, review.fingerprint), /active work session/);
    assert.equal(await digest(recordPath), recordBefore);
  } finally { await fixture.cleanup(); }
});

test("system quest host routes require same origin, exact bodies, and both exact accept decisions", async () => {
  const source = model();
  const planner = new SystemQuestPlanningService(new QueueExecutor([proposal()]), () => Date.parse("2026-07-15T22:00:00.000Z"));
  let saved: AcceptedSystemQuestPlan | null = null;
  let workOrderSaves = 0;
  const world = {
    loadWorld: async () => ({ projectModel: source, systemQuestPlan: saved }),
    saveSystemQuestBatch: async (_projectId: string, batch: Parameters<Parameters<SystemQuestPlanningService["acceptQuests"]>[4]>[0]) => (saved = persistedPlan(batch)),
    listSystemQuestFiles: async () => [{ relativePath: "scripts/beacon.gd", size: 10, sha256: "a".repeat(64) }],
    reviewSystemQuestWorkOrder: async (_projectId: string, _systemId: string, questId: string, choice: { existingFiles: string[]; newFiles: string[] }) => ({ questId, title: "Welcome the Player", playerVisibleOutcome: "A warm beacon greets the player.", doneWhen: ["The pulse is visible."], excludedScope: ["No weather."], ...choice, fingerprint: "e".repeat(64) }),
    saveSystemQuestWorkOrder: async () => { workOrderSaves += 1; return saved!; },
  } as unknown as GeneratedProjectWorldService;
  const server = createForgeDashboardServer({} as ForgeDashboardService, path.resolve("dist", "dashboard"), undefined, undefined, world, undefined, undefined, planner);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const base = `${origin}/api/projects/welcome-beacon/systems/system-first-playable/quest-planning`;
  try {
    assert.equal((await fetch(`${base}/start`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ description: "Make the beacon welcome the player with one warm pulse." }) })).status, 400);
    assert.equal((await fetch(`${base}/start`, { method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify({ description: "Make the beacon welcome the player with one warm pulse." }) })).status, 202);
    await planner.waitForIdle();
    const review = planner.getSnapshot();
    assert.equal((await fetch(`${base}/accept-quests`, { method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify({ decision: "APPROVE", fingerprint: review.proposalFingerprint }) })).status, 400);
    assert.equal((await fetch(`${base}/accept-quests`, { method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify({ decision: "ACCEPT SYSTEM QUESTS", fingerprint: review.proposalFingerprint }) })).status, 200);
    assert.ok(saved);
    assert.equal((await fetch(`${base}/cancel`, { method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify({ decision: "CANCEL QUEST PLANNING" }) })).status, 200);
    assert.equal((await fetch(`${origin}/api/projects/welcome-beacon/systems/system-another-piece/quest-planning/state`)).status, 200, "leaving saved quests must release the old system");
    assert.equal((await fetch(`${base}/state`)).status, 200, "saved quests must reconstruct after leaving");
    assert.equal((await fetch(`${base}/review-work-order`, { method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify({ existingFiles: ["scripts/beacon.gd"], newFiles: [], extra: "hidden" }) })).status, 400);
    assert.equal((await fetch(`${base}/review-work-order`, { method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify({ existingFiles: ["scripts/beacon.gd"], newFiles: [] }) })).status, 200);
    assert.equal((await fetch(`${base}/accept-work-order`, { method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify({ decision: "ACCEPT QUEST WORK ORDER", fingerprint: "e".repeat(64) }) })).status, 200);
    assert.equal(workOrderSaves, 1);
    assert.equal(planner.getSnapshot().phase, "ready");
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("a fresh host resumes accepted quests through exact scope review and reloads ready", async () => {
  const source = model();
  let saved = acceptedSystemQuestPlanSchema.parse({
    schemaVersion: 1, projectId: "welcome-beacon", systems: [{
      systemId: "system-first-playable", baseQuestIds: ["light-the-beacon"],
      creatorDescription: "Make the beacon welcome the player with one warm pulse.",
      sourceFingerprint: fingerprintSystemQuestStructure(source, "system-first-playable"), proposalFingerprint: "b".repeat(64), acceptedAt: "2026-07-15T22:00:00.000Z",
      quests: [{ questId: "quest-welcome-player", title: "Welcome the Player", playerVisibleOutcome: "A warm beacon greets the player at the start.", whyItMatters: "The welcome makes the beacon feel useful and alive.", doneWhen: ["A warm pulse is visible."], excludedScope: ["No weather."], dependsOn: [] }],
    }],
  });
  const world = {
    loadWorld: async () => ({ projectModel: source, systemQuestPlan: saved }),
    reviewSystemQuestWorkOrder: async (_projectId: string, _systemId: string, questId: string, choice: { existingFiles: string[]; newFiles: string[] }) => ({ questId, title: "Welcome the Player", playerVisibleOutcome: "A warm beacon greets the player.", doneWhen: ["The pulse is visible."], excludedScope: ["No weather."], ...choice, fingerprint: "e".repeat(64) }),
    saveSystemQuestWorkOrder: async (_projectId: string, systemId: string, questId: string, choice: { existingFiles: string[]; newFiles: string[] }, fingerprint: string) => {
      saved = acceptedSystemQuestPlanSchema.parse({ ...saved, systems: saved.systems.map((system) => system.systemId !== systemId ? system : { ...system, quests: system.quests.map((quest) => quest.questId !== questId ? quest : { ...quest, workOrder: { ...choice, fingerprint, acceptedAt: "2026-07-15T22:05:00.000Z" } }) }) });
      return saved;
    },
  } as unknown as GeneratedProjectWorldService;
  const routeFor = (origin: string) => `${origin}/api/projects/welcome-beacon/systems/system-first-playable/quest-planning`;
  const firstPlanner = new SystemQuestPlanningService(new QueueExecutor([]));
  const first = createForgeDashboardServer({} as ForgeDashboardService, path.resolve("dist", "dashboard"), undefined, undefined, world, undefined, undefined, firstPlanner);
  first.listen(0, "127.0.0.1"); await once(first, "listening");
  const firstOrigin = `http://127.0.0.1:${(first.address() as AddressInfo).port}`;
  try {
    const state = await fetch(`${routeFor(firstOrigin)}/state`).then((response) => response.json()) as { phase: string };
    assert.equal(state.phase, "quests_accepted");
    assert.equal((await fetch(`${routeFor(firstOrigin)}/review-work-order`, { method: "POST", headers: { "content-type": "application/json", origin: firstOrigin }, body: JSON.stringify({ existingFiles: ["scripts/beacon.gd"], newFiles: [] }) })).status, 200);
    assert.equal((await fetch(`${routeFor(firstOrigin)}/accept-work-order`, { method: "POST", headers: { "content-type": "application/json", origin: firstOrigin }, body: JSON.stringify({ decision: "ACCEPT QUEST WORK ORDER", fingerprint: "e".repeat(64) }) })).status, 200);
  } finally { first.close(); await once(first, "close"); }

  const secondPlanner = new SystemQuestPlanningService(new QueueExecutor([]));
  const second = createForgeDashboardServer({} as ForgeDashboardService, path.resolve("dist", "dashboard"), undefined, undefined, world, undefined, undefined, secondPlanner);
  second.listen(0, "127.0.0.1"); await once(second, "listening");
  const secondOrigin = `http://127.0.0.1:${(second.address() as AddressInfo).port}`;
  try {
    const state = await fetch(`${routeFor(secondOrigin)}/state`).then((response) => response.json()) as { phase: string };
    assert.equal(state.phase, "ready");
  } finally { second.close(); await once(second, "close"); }
});
