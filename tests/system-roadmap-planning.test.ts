import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import path from "node:path";
import test from "node:test";

import { projectModelSchema, systemRoadmapPlanningResultSchema, type AcceptedSystemRoadmap, type ProjectModel } from "../src/contracts/index.js";
import {
  SystemRoadmapPlanningConflictError,
  SystemRoadmapPlanningService,
  fingerprintProjectStructure,
  hasActiveSystemRoadmapWork,
} from "../src/blueprint-planner/system-roadmap.js";
import type { BlueprintModelExecutor, BlueprintModelSession, BlueprintModelTurn } from "../src/blueprint-planner/types.js";
import { createForgeDashboardServer } from "../src/dashboard-host/server.js";
import type { ForgeDashboardService } from "../src/dashboard-host/service.js";
import type { GeneratedProjectWorldService } from "../src/generated-project-world/service.js";

function model(): ProjectModel {
  return projectModelSchema.parse({
    modelVersion: 1,
    project: { projectId: "welcome-beacon", name: "Welcome Beacon", vision: "A small beacon game.", engine: { kind: "godot", version: "4.7", projectFile: "project.godot", mainScene: "res://main.tscn" }, systemIds: ["system-first-playable"] },
    systems: [{ systemId: "system-first-playable", projectId: "welcome-beacon", title: "First Playable", outcome: "The beacon can be seen.", status: "active", questIds: ["light-the-beacon"] }],
    quests: [{ questId: "light-the-beacon", systemId: "system-first-playable", title: "Light the Beacon", playerVisibleOutcome: "A bright beacon appears.", doneWhen: ["The beacon is visible."], status: "available", dependsOn: [], workSessionIds: [], latestWorkSessionId: null, extraProof: null }],
    workSessions: [], results: [],
    history: [{ historyEntryId: "project-created", kind: "project_created", occurredAt: "2026-07-15T12:00:00.000Z", summary: "Created the project.", questId: null, workSessionId: null }],
    focus: { selectedSystemId: "system-first-playable", selectedQuestId: "light-the-beacon", nextRecommendedQuestId: "light-the-beacon" },
  });
}

function proposal(title = "Beacon Care"): string {
  return JSON.stringify({ resultType: "proposal", systems: [
    { existingSystemId: "system-first-playable", title, outcome: "Keep the beacon bright through each night." },
    { existingSystemId: null, title: "Storm Pressure", outcome: "Weather creates readable danger around the beacon." },
    { existingSystemId: null, title: "Harbor Trust", outcome: "The harbor reacts to how safely each night ends." },
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
      return { finalResponse, threadId: "system-roadmap-thread", usage: { inputTokens: 10, cachedInputTokens: 0, outputTokens: 5, reasoningOutputTokens: 1 } };
    } };
  }
}

test("open system planning contract has no capability, profile, starter, or game-type permission fields", () => {
  const parsed = systemRoadmapPlanningResultSchema.parse(JSON.parse(proposal()));
  assert.equal(parsed.resultType, "proposal");
  const unsafe = JSON.parse(proposal()) as { systems: Array<Record<string, unknown>> };
  unsafe.systems[0]!.capability = "beacon";
  assert.equal(systemRoadmapPlanningResultSchema.safeParse(unsafe).success, false);
});

test("free-form planning proposes three systems and accepts one exact planning record", async () => {
  const executor = new QueueExecutor([proposal()]);
  const service = new SystemRoadmapPlanningService(executor, () => Date.parse("2026-07-15T13:00:00.000Z"));
  const source = model();
  service.begin(source, "A lighthouse keeper protects a harbor through dangerous but readable storms.");
  await service.waitForIdle();
  const review = service.getSnapshot();
  assert.equal(review.phase, "review");
  assert.equal(review.proposal?.length, 3);
  assert.equal(review.sourceFingerprint, fingerprintProjectStructure(source));
  assert.match(executor.prompts[0]!, /idea is eligible because they chose it/iu);
  assert.doesNotMatch(executor.prompts[0]!, /top_down_arena|gravity tap|signal sweep/iu);
  let savedSystems: AcceptedSystemRoadmap["systems"] = [];
  await service.accept("ACCEPT SYSTEM ROADMAP", review.proposalFingerprint!, source, async (roadmap) => { savedSystems = roadmap.systems; });
  assert.equal(service.getSnapshot().phase, "accepted");
  assert.equal(savedSystems[0]?.questIds[0], "light-the-beacon");
  assert.equal(savedSystems[1]?.questIds.length, 0);
  assert.equal(service.getSnapshot().effects.gameFilesWritten, 0);
});

test("one clarification round is followed by a complete proposal", async () => {
  const executor = new QueueExecutor([
    JSON.stringify({ resultType: "clarification", clarificationQuestions: [{ questionId: "night-length", question: "How long should one night feel?", whyItMatters: "This changes the rhythm of the broad systems." }] }),
    proposal(),
  ]);
  const service = new SystemRoadmapPlanningService(executor);
  service.begin(model(), "A lighthouse keeper game about dangerous storms and a worried harbor.");
  await service.waitForIdle();
  assert.equal(service.getSnapshot().phase, "clarification");
  service.submitAnswers([{ questionId: "night-length", answer: "About ten minutes." }]);
  await service.waitForIdle();
  assert.equal(service.getSnapshot().phase, "review");
});

test("invalid output gets one repair and repeatable revisions replace the whole proposal", async () => {
  const executor = new QueueExecutor(["not json", proposal(), proposal("Gentle Beacon Care")]);
  const service = new SystemRoadmapPlanningService(executor);
  service.begin(model(), "A lighthouse keeper game about protecting a harbor during storms.");
  await service.waitForIdle();
  assert.equal(service.getSnapshot().provenance.attempts, 2);
  service.revise("Make the beacon care feel gentler.");
  await service.waitForIdle();
  assert.equal(service.getSnapshot().proposal?.[0]?.title, "Gentle Beacon Care");
});

test("a failed revision retries the same creator request and cancellation stops only safe phases", async () => {
  const executor = new QueueExecutor([proposal(), "not json", "still not json", proposal("Gentle Beacon Care")]);
  const service = new SystemRoadmapPlanningService(executor);
  const source = model();
  service.begin(source, "A lighthouse keeper game about protecting a harbor during storms.");
  await service.waitForIdle();
  service.revise("Make the beacon care feel gentler.");
  await service.waitForIdle();
  assert.equal(service.getSnapshot().phase, "failed");
  service.retry();
  await service.waitForIdle();
  assert.equal(service.getSnapshot().proposal?.[0]?.title, "Gentle Beacon Care");
  assert.match(executor.prompts[3]!, /Make the beacon care feel gentler/);
  const review = service.getSnapshot();
  await service.accept("ACCEPT SYSTEM ROADMAP", review.proposalFingerprint!, source, async () => {});
  assert.throws(() => service.cancel("CANCEL SYSTEM PLANNING"), /cannot be cancelled/);
});

test("stale structure, active work, wrong decisions, and stale proposal fingerprints fail closed", async () => {
  const service = new SystemRoadmapPlanningService(new QueueExecutor([proposal()]));
  const source = model();
  service.begin(source, "A lighthouse keeper game about protecting a harbor during storms.");
  await service.waitForIdle();
  const review = service.getSnapshot();
  await assert.rejects(() => service.accept("ACCEPT SYSTEM ROADMAP", "f".repeat(64), source, async () => {}), SystemRoadmapPlanningConflictError);
  const stale = structuredClone(source);
  stale.systems[0]!.title = "Changed elsewhere";
  stale.systems[0]!.questIds = [];
  stale.quests = [];
  stale.focus.selectedQuestId = null;
  stale.focus.nextRecommendedQuestId = null;
  await assert.rejects(() => service.accept("ACCEPT SYSTEM ROADMAP", review.proposalFingerprint!, stale, async () => {}), /changed while this roadmap was open/);

  const active = structuredClone(source);
  active.workSessions.push({ workSessionId: "run-one", questId: "light-the-beacon", phase: "implementing", createdAt: "2026-07-15T12:01:00.000Z", updatedAt: "2026-07-15T12:02:00.000Z", contractFingerprint: "a".repeat(64), allowedFiles: ["main.gd"], progress: ["Working"], proofs: { boundary: { result: "pending", summary: "Pending", evidence: [], verifiedAt: null }, projectHealth: { result: "pending", summary: "Pending", evidence: [], verifiedAt: null }, mechanic: { result: "pending", summary: "Pending", evidence: [], verifiedAt: null }, creator: { result: "pending", summary: "Pending", evidence: [], verifiedAt: null } }, changedFiles: [], creatorResult: null, error: null, recovery: { action: "none", message: "No recovery needed.", concurrentPaths: [] }, resultId: null });
  active.quests[0]!.workSessionIds = ["run-one"];
  active.quests[0]!.latestWorkSessionId = "run-one";
  active.quests[0]!.status = "active";
  assert.throws(() => new SystemRoadmapPlanningService(new QueueExecutor([proposal()])).begin(projectModelSchema.parse(active), "A valid idea that is long enough."), /active work session/);
  for (const phase of ["contract_review", "failed", "interrupted"] as const) {
    const candidate = structuredClone(projectModelSchema.parse(active));
    candidate.workSessions[0]!.phase = phase;
    assert.equal(hasActiveSystemRoadmapWork(candidate), true, `${phase} must block roadmap replacement`);
  }
  for (const action of ["rollback", "manual"] as const) {
    const candidate = structuredClone(projectModelSchema.parse(active));
    candidate.workSessions[0]!.phase = "cancelled";
    candidate.workSessions[0]!.recovery = { action, message: "Recovery remains unresolved.", concurrentPaths: [] };
    assert.equal(hasActiveSystemRoadmapWork(candidate), true, `cancelled ${action} recovery must block roadmap replacement`);
  }
  assert.equal(hasActiveSystemRoadmapWork(source), false);
});

test("project-scoped host routes require same origin, exact bodies, and exact acceptance", async () => {
  const source = model();
  const planner = new SystemRoadmapPlanningService(new QueueExecutor([proposal(), proposal()]));
  let savedSystemCount = 0;
  const world = {
    loadWorld: async (projectId: string) => {
      if (projectId === source.project.projectId) return { projectModel: source };
      const other = structuredClone(source);
      other.project.projectId = projectId;
      other.project.name = "Other Beacon";
      other.systems = other.systems.map((system) => ({ ...system, projectId }));
      return { projectModel: projectModelSchema.parse(other) };
    },
    saveSystemRoadmap: async (_projectId: string, roadmap: AcceptedSystemRoadmap) => { savedSystemCount = roadmap.systems.length; },
  } as unknown as GeneratedProjectWorldService;
  const server = createForgeDashboardServer(
    {} as ForgeDashboardService,
    path.resolve("dist", "dashboard"),
    undefined, undefined, world, undefined, planner,
  );
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const noOrigin = await fetch(`${origin}/api/projects/welcome-beacon/system-planning/start`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idea: "A lighthouse game with dangerous storms and a worried harbor." }) });
    assert.equal(noOrigin.status, 400);
    const started = await fetch(`${origin}/api/projects/welcome-beacon/system-planning/start`, { method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify({ idea: "A lighthouse game with dangerous storms and a worried harbor." }) });
    assert.equal(started.status, 202);
    await planner.waitForIdle();
    const review = planner.getSnapshot();
    const extra = await fetch(`${origin}/api/projects/welcome-beacon/system-planning/revise`, { method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify({ request: "Gentler storms", file: "main.gd" }) });
    assert.equal(extra.status, 400);
    const wrong = await fetch(`${origin}/api/projects/welcome-beacon/system-planning/accept`, { method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify({ decision: "APPROVE", fingerprint: review.proposalFingerprint }) });
    assert.equal(wrong.status, 400);
    const accepted = await fetch(`${origin}/api/projects/welcome-beacon/system-planning/accept`, { method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify({ decision: "ACCEPT SYSTEM ROADMAP", fingerprint: review.proposalFingerprint }) });
    assert.equal(accepted.status, 200);
    assert.equal(savedSystemCount, 3);
    const otherState = await fetch(`${origin}/api/projects/other-beacon/system-planning/state`);
    assert.equal(otherState.status, 200);
    assert.deepEqual(await otherState.json(), { ...planner.getSnapshotForProject("other-beacon") });
    assert.equal(planner.getSnapshotForProject("other-beacon").phase, "idle");
    const otherStarted = await fetch(`${origin}/api/projects/other-beacon/system-planning/start`, { method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify({ idea: "A different lighthouse game with calm tides and visiting boats." }) });
    assert.equal(otherStarted.status, 202);
    await planner.waitForIdle();
    assert.equal(planner.getSnapshot().projectId, "other-beacon");
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("host serializes quest preparation with roadmap acceptance for the same project", async () => {
  const source = model();
  const active = structuredClone(source);
  active.workSessions.push({ workSessionId: "run-race", questId: "light-the-beacon", phase: "contract_review", createdAt: "2026-07-15T12:01:00.000Z", updatedAt: "2026-07-15T12:01:00.000Z", contractFingerprint: "a".repeat(64), allowedFiles: ["main.gd"], progress: ["Contract ready"], proofs: { boundary: { result: "pending", summary: "Pending", evidence: [], verifiedAt: null }, projectHealth: { result: "pending", summary: "Pending", evidence: [], verifiedAt: null }, mechanic: { result: "pending", summary: "Pending", evidence: [], verifiedAt: null }, creator: { result: "pending", summary: "Pending", evidence: [], verifiedAt: null } }, changedFiles: [], creatorResult: null, error: null, recovery: { action: "none", message: "No recovery needed.", concurrentPaths: [] }, resultId: null });
  active.quests[0]!.workSessionIds = ["run-race"];
  active.quests[0]!.latestWorkSessionId = "run-race";
  const activeModel = projectModelSchema.parse(active);
  let workStarted = false;
  let preparePending = false;
  let loadsWhilePreparePending = 0;
  let saved = 0;
  let releasePrepare!: () => void;
  let markPrepareStarted!: () => void;
  const prepareStarted = new Promise<void>((resolve) => { markPrepareStarted = resolve; });
  const prepareRelease = new Promise<void>((resolve) => { releasePrepare = resolve; });
  const runner = {
    prepare: async () => { preparePending = true; markPrepareStarted(); await prepareRelease; workStarted = true; preparePending = false; return { phase: "contract_review" }; },
    getSummary: async () => { throw new Error("Not used"); }, adjust: async () => { throw new Error("Not used"); }, defer: async () => { throw new Error("Not used"); }, approve: async () => { throw new Error("Not used"); }, start: async () => { throw new Error("Not used"); }, cancel: async () => { throw new Error("Not used"); }, play: async () => { throw new Error("Not used"); }, confirm: async () => { throw new Error("Not used"); }, rollback: async () => { throw new Error("Not used"); }, subscribe: () => () => {},
  };
  const world = {
    loadWorld: async () => { if (preparePending) loadsWhilePreparePending += 1; return { projectModel: workStarted ? activeModel : source }; },
    saveSystemRoadmap: async () => { saved += 1; },
  } as unknown as GeneratedProjectWorldService;
  const planner = new SystemRoadmapPlanningService(new QueueExecutor([proposal()]));
  planner.begin(source, "A lighthouse game with dangerous storms and a worried harbor.");
  await planner.waitForIdle();
  const fingerprint = planner.getSnapshot().proposalFingerprint;
  const server = createForgeDashboardServer({} as ForgeDashboardService, path.resolve("dist", "dashboard"), undefined, undefined, world, runner as never, planner);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const prepare = fetch(`${origin}/api/projects/welcome-beacon/quests/light-the-beacon/prepare`, { method: "POST", headers: { "content-type": "application/json", origin }, body: "{}" });
    await prepareStarted;
    const accept = fetch(`${origin}/api/projects/welcome-beacon/system-planning/accept`, { method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify({ decision: "ACCEPT SYSTEM ROADMAP", fingerprint }) });
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
    releasePrepare();
    assert.equal((await prepare).status, 201);
    assert.equal((await accept).status, 409);
    assert.equal(saved, 0);
    assert.equal(loadsWhilePreparePending, 0, "roadmap acceptance must wait for preparation to finish");
    assert.equal(planner.getSnapshot().phase, "review");
  } finally {
    releasePrepare();
    server.close();
    await once(server, "close");
  }
});
