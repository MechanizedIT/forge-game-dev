import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import path from "node:path";
import test from "node:test";

import {
  gameBlueprintPlanningResultSchema,
  gameBlueprintSchema,
  acceptedRoadmapSchema,
  blueprintProposalSchema,
  type ClarificationTopic,
  type GameBlueprint,
} from "../src/contracts/index.js";
import { BlueprintPlanningService } from "../src/blueprint-planner/service.js";
import { buildBlueprintProposal, createSignalSweepRoadmap } from "../src/blueprint-planner/starter-catalog.js";
import type {
  BlueprintModelExecutor,
  BlueprintModelSession,
  BlueprintModelTurn,
} from "../src/blueprint-planner/types.js";
import { createForgeDashboardServer } from "../src/dashboard-host/server.js";
import type { ForgeDashboardService } from "../src/dashboard-host/service.js";

function validBlueprint(overrides: Partial<GameBlueprint> = {}): GameBlueprint {
  return {
    projectName: "Pulse Arena",
    vision: "A compact arena game about redirecting pressure with kinetic pushes.",
    foundation: "top_down_arena",
    inputMode: "keyboard",
    coreAction: "Move through the arena and push nearby enemies away.",
    funTarget: "Each push should feel immediate, weighty, and tactically useful.",
    smallestPlayableResult: "The player can move, push one enemy, and see it slide away inside one arena.",
    firstPlayableMilestone: "A playable pressure loop with movement, one push interaction, one enemy, and a clear reset.",
    quests: [
      { reference: "Q1", title: "Arena Movement", visibleOutcome: "The player moves cleanly inside a bounded arena.", dependencies: [] },
      { reference: "Q2", title: "Kinetic Push", visibleOutcome: "A nearby enemy visibly moves away when the player pushes.", dependencies: ["Q1"] },
      { reference: "Q3", title: "Playable Pressure", visibleOutcome: "The enemy returns and the player can repeatedly create space.", dependencies: ["Q2"] },
    ],
    includedScope: ["One bounded arena", "One player push action", "One simple enemy"],
    excludedScope: ["Menus", "External art", "Multiple levels"],
    acceptanceCriteria: [
      { reference: "AC-1", questReference: "Q1", criterion: "Keyboard input moves the player in four directions within the arena.", verificationReferences: ["V-1"] },
      { reference: "AC-2", questReference: "Q2", criterion: "Using the push near the enemy moves it visibly away from the player.", verificationReferences: ["V-2"] },
      { reference: "AC-3", questReference: "Q3", criterion: "The enemy returns after displacement so the push loop can be repeated.", verificationReferences: ["V-3"] },
    ],
    verificationIdeas: [
      { reference: "V-1", questReference: "Q1", idea: "Check directional movement and arena bounds in a focused play pass." },
      { reference: "V-2", questReference: "Q2", idea: "Measure that the enemy position changes away from the player after a push." },
      { reference: "V-3", questReference: "Q3", idea: "Observe two complete approach, push, and return cycles." },
    ],
    projectDocumentationSummary: "Pulse Arena is a keyboard-controlled top-down prototype focused on creating space with a kinetic push.",
    initialChronicleSummary: "The first blueprint established movement, a kinetic push, and a repeatable arena pressure loop.",
    ...overrides,
  };
}

function blueprintResponse(blueprint = validBlueprint()): string {
  return JSON.stringify({ resultType: "blueprint", clarificationQuestions: [], blueprint });
}

function clarificationResponse(topics: ClarificationTopic[] = ["core_action"]): string {
  return JSON.stringify({
    resultType: "clarification",
    clarificationQuestions: topics.map((topic) => ({
      topic,
      prompt: topic === "input_mode" ? "How would you like to control the game?" : "What should the player do most often?",
      answerType: topic === "input_mode" ? "single_choice" : "short_text",
      choices: topic === "input_mode" ? ["Keyboard", "Controller"] : [],
    })),
    blueprint: null,
  });
}

class QueueExecutor implements BlueprintModelExecutor {
  readonly prompts: string[] = [];
  readonly schemas: unknown[] = [];
  starts = 0;

  constructor(private readonly responses: string[]) {}

  start(): BlueprintModelSession {
    this.starts += 1;
    return {
      run: async (prompt, schema): Promise<BlueprintModelTurn> => {
        this.prompts.push(prompt);
        this.schemas.push(schema);
        const finalResponse = this.responses.shift();
        if (finalResponse === undefined) throw new Error("No fake GPT response remains.");
        return {
          finalResponse,
          threadId: "planning-thread-safe-123456",
          usage: { inputTokens: 100, cachedInputTokens: 20, outputTokens: 50, reasoningOutputTokens: 10 },
        };
      },
    };
  }
}

test("strict GameBlueprint accepts the required Top-down arena plan", () => {
  const blueprint = gameBlueprintSchema.parse(validBlueprint());
  assert.equal(blueprint.foundation, "top_down_arena");
  assert.equal(blueprint.quests.length, 3);
});

test("planning result allows no more than three clarification questions", () => {
  assert.equal(gameBlueprintPlanningResultSchema.safeParse(JSON.parse(clarificationResponse(["game_style", "core_action", "fun_target"]))).success, true);
  const tooMany = JSON.parse(clarificationResponse(["game_style", "core_action", "fun_target", "input_mode"]));
  assert.equal(gameBlueprintPlanningResultSchema.safeParse(tooMany).success, false);
});

test("GameBlueprint rejects unsupported foundations and invalid quest counts", () => {
  assert.equal(gameBlueprintSchema.safeParse({ ...validBlueprint(), foundation: "side_scroller" }).success, false);
  assert.equal(gameBlueprintSchema.safeParse({ ...validBlueprint(), quests: validBlueprint().quests.slice(0, 2) }).success, false);
  const six = [...validBlueprint().quests, { reference: "Q4", title: "Four", visibleOutcome: "Fourth visible outcome.", dependencies: ["Q3"] }, { reference: "Q5", title: "Five", visibleOutcome: "Fifth visible outcome.", dependencies: ["Q4"] }, { reference: "Q5", title: "Six", visibleOutcome: "Sixth visible outcome.", dependencies: [] }];
  assert.equal(gameBlueprintSchema.safeParse({ ...validBlueprint(), quests: six }).success, false);
});

test("GameBlueprint rejects duplicate, missing, and cyclic quest references", () => {
  const duplicate = validBlueprint().quests.map((quest, index) => index === 1 ? { ...quest, reference: "Q1" as const } : quest);
  assert.equal(gameBlueprintSchema.safeParse({ ...validBlueprint(), quests: duplicate }).success, false);
  const missing = validBlueprint().quests.map((quest, index) => index === 2 ? { ...quest, dependencies: ["Q4" as const] } : quest);
  assert.equal(gameBlueprintSchema.safeParse({ ...validBlueprint(), quests: missing }).success, false);
  const cyclic = validBlueprint().quests.map((quest, index) => index === 0 ? { ...quest, dependencies: ["Q3" as const] } : quest);
  assert.equal(gameBlueprintSchema.safeParse({ ...validBlueprint(), quests: cyclic }).success, false);
});

test("GameBlueprint rejects invalid criterion and verification references", () => {
  const missingVerification = validBlueprint().acceptanceCriteria.map((criterion, index) => index === 0 ? { ...criterion, verificationReferences: ["V-9" as const] } : criterion);
  assert.equal(gameBlueprintSchema.safeParse({ ...validBlueprint(), acceptanceCriteria: missingVerification }).success, false);
  const wrongQuest = validBlueprint().verificationIdeas.map((verification, index) => index === 0 ? { ...verification, questReference: "Q2" as const } : verification);
  assert.equal(gameBlueprintSchema.safeParse({ ...validBlueprint(), verificationIdeas: wrongQuest }).success, false);
});

test("GameBlueprint rejects absolute paths, commands, packages, and source files", () => {
  for (const unsafe of [
    "Write the result to C:\\Games\\Pulse.",
    "Write the result under /game/projects/pulse.",
    "Then run npm run build.",
    "Add package.json for dependencies.",
    "Update player.gd. with the mechanic.",
    "Workflow state: COMPLETE",
  ]) {
    assert.equal(gameBlueprintSchema.safeParse({ ...validBlueprint(), projectDocumentationSummary: unsafe }).success, false, unsafe);
  }
});

test("proposal contract enforces fit, tradeoff, alternative, and unsafe-output limits", () => {
  const blueprint = validBlueprint({ projectName: "Signal Sweep", vision: "A top-down signal relay arena." });
  const proposal = buildBlueprintProposal("A platformer about jumping between rooftop signal relays.", blueprint);
  assert.equal(proposal.foundationFit.level, "partial");
  assert.equal(proposal.originalIdea, "A platformer about jumping between rooftop signal relays.");
  assert.equal(blueprintProposalSchema.safeParse({ ...proposal, foundationFit: { level: "native", explanation: "Unsupported claim" } }).success, false);
  assert.equal(blueprintProposalSchema.safeParse({ ...proposal, tradeoffs: [] }).success, false);
  assert.equal(blueprintProposalSchema.safeParse({ ...proposal, alternatives: proposal.alternatives.slice(0, 1) }).success, false);
  assert.equal(blueprintProposalSchema.safeParse({ ...proposal, recommendedInterpretation: "Run godot --path C:\\Games\\Signal" }).success, false);
});

test("accepted-roadmap contract rejects missing, cyclic, late, and duplicate deltas", () => {
  const blueprint = validBlueprint({ projectName: "Signal Sweep", vision: "A top-down signal relay arena." });
  const draft = createSignalSweepRoadmap("a".repeat(64), blueprint);
  assert.equal(acceptedRoadmapSchema.safeParse(draft).success, true);
  assert.equal(acceptedRoadmapSchema.safeParse({ ...draft, quests: draft.quests.slice(0, 2) }).success, false);
  const late = draft.quests.map((quest, index) => index === 0 ? { ...quest, dependsOn: ["Q2" as const] } : quest);
  assert.equal(acceptedRoadmapSchema.safeParse({ ...draft, quests: late }).success, false);
  const duplicate = draft.quests.map((quest, index) => index === 1 ? { ...quest, catalogDeltaId: draft.quests[0]!.catalogDeltaId } : quest);
  assert.equal(acceptedRoadmapSchema.safeParse({ ...draft, quests: duplicate }).success, false);
});

test("a specific idea can proceed directly to Blueprint Review", async () => {
  const executor = new QueueExecutor([blueprintResponse()]);
  const service = new BlueprintPlanningService(executor);
  service.beginIdea("A top-down arena where keyboard movement and a satisfying push keep enemies away; first playable means one enemy can be pushed.");
  await service.waitForIdle();
  const snapshot = service.getSnapshot();
  assert.equal(snapshot.phase, "review");
  assert.equal(snapshot.validationPassed, true);
  assert.equal(snapshot.provenance.attempts, 1);
  assert.equal(snapshot.provenance.usage?.inputTokens, 100);
  assert.equal(snapshot.effects.projectFilesWritten, 0);
});

test("planning preserves the exact trimmed idea in an honest starter recommendation", async () => {
  const executor = new QueueExecutor([blueprintResponse()]);
  const service = new BlueprintPlanningService(executor);
  service.beginIdea("  A side-view platformer where the player sweeps signals between rooftop relays.  ");
  await service.waitForIdle();
  const snapshot = service.getSnapshot();
  assert.equal(snapshot.proposal?.originalIdea, "A side-view platformer where the player sweeps signals between rooftop relays.");
  assert.equal(snapshot.proposal?.foundationFit.level, "partial");
  assert.equal(snapshot.proposal?.alternatives.length, 2);
  assert.equal(snapshot.effects.projectFilesWritten, 0);
});

test("an incomplete idea receives one focused clarification screen and then a blueprint", async () => {
  const executor = new QueueExecutor([clarificationResponse(["core_action", "input_mode"]), blueprintResponse()]);
  const service = new BlueprintPlanningService(executor);
  service.beginIdea("A tiny game about mysterious sparks.");
  await service.waitForIdle();
  assert.equal(service.getSnapshot().phase, "clarification");
  assert.equal(service.getSnapshot().clarificationQuestions.length, 2);
  service.submitAnswers({ core_action: "Push sparks into matching zones", input_mode: "Keyboard" });
  await service.waitForIdle();
  assert.equal(service.getSnapshot().phase, "review");
  assert.equal(executor.starts, 1, "clarification continues in the same SDK thread");
  assert.match(executor.prompts[1]!, /Clarification is complete/);
});

test("one repaired clarification plus creator answers records three valid planning turns", async () => {
  const signalBlueprint = validBlueprint({
    projectName: "Signal Sweep",
    vision: "A compact top-down arena where the player activates one signal relay.",
    coreAction: "Move into one signal relay to activate it.",
  });
  const executor = new QueueExecutor(["{not-json", clarificationResponse(["core_action"]), blueprintResponse(signalBlueprint)]);
  const service = new BlueprintPlanningService(executor);
  service.beginIdea("A tiny game about mysterious signal relays.");
  await service.waitForIdle();
  assert.equal(service.getSnapshot().phase, "clarification");
  assert.equal(service.getSnapshot().provenance.attempts, 2);

  service.submitAnswers({ core_action: "Move into one relay to activate it" });
  await service.waitForIdle();
  const snapshot = service.getSnapshot();
  assert.equal(snapshot.phase, "review");
  assert.equal(snapshot.provenance.attempts, 3);
  assert.equal(executor.starts, 1, "all three turns remain in one bounded planning session");
});

test("a question that repeats an answered idea topic triggers the single repair", async () => {
  const executor = new QueueExecutor([clarificationResponse(["input_mode"]), blueprintResponse()]);
  const service = new BlueprintPlanningService(executor);
  service.beginIdea("A small arena controlled with keyboard input where the player pushes glowing rivals.");
  await service.waitForIdle();
  assert.equal(service.getSnapshot().phase, "review");
  assert.equal(service.getSnapshot().provenance.attempts, 2);
  assert.match(executor.prompts[1]!, /input_mode is already answered by the idea/);
});

test("one invalid response may be repaired successfully without exposing the invalid output", async () => {
  const executor = new QueueExecutor(["{not-json", blueprintResponse()]);
  const service = new BlueprintPlanningService(executor);
  service.beginIdea("A compact top-down arena about pushing one enemy away.");
  await service.waitForIdle();
  assert.equal(service.getSnapshot().phase, "review");
  assert.equal(service.getSnapshot().provenance.attempts, 2);
  assert.match(executor.prompts[1]!, /GPT returned invalid JSON/);
  assert.doesNotMatch(executor.prompts[1]!, /\{not-json/);
});

test("two invalid model responses stop safely with no blueprint", async () => {
  const executor = new QueueExecutor(["not json", JSON.stringify({ resultType: "blueprint" })]);
  const service = new BlueprintPlanningService(executor);
  service.beginIdea("A compact top-down arena about pushing one enemy away.");
  await service.waitForIdle();
  const snapshot = service.getSnapshot();
  assert.equal(snapshot.phase, "failed");
  assert.equal(snapshot.blueprint, null);
  assert.equal(snapshot.provenance.attempts, 2);
  assert.equal(snapshot.effects.commandsRun, 0);
  assert.match(snapshot.error!, /sample game is still available/i);
});

test("clarification can be cancelled without changing the sample boundary", async () => {
  const service = new BlueprintPlanningService(new QueueExecutor([clarificationResponse()]));
  service.beginIdea("A tiny game about mysterious sparks.");
  await service.waitForIdle();
  service.cancel();
  const snapshot = service.getSnapshot();
  assert.equal(snapshot.phase, "cancelled");
  assert.equal(snapshot.blueprint, null);
  assert.deepEqual(snapshot.effects, { projectFilesWritten: 0, commandsRun: 0, godotProcessesStarted: 0 });
});

test("revise returns to intake and approval only marks the validated blueprint ready", async () => {
  const service = new BlueprintPlanningService(new QueueExecutor([blueprintResponse()]));
  service.beginIdea("A compact top-down arena about pushing one enemy away.");
  await service.waitForIdle();
  service.reviseIdea();
  assert.equal(service.getSnapshot().phase, "intake");
  assert.match(service.getSnapshot().idea, /compact top-down arena/);

  const signalBlueprint = validBlueprint({
    projectName: "Signal Sweep",
    vision: "A compact top-down arena about activating one signal relay.",
    coreAction: "Move through one signal relay to activate it.",
  });
  const approved = new BlueprintPlanningService(new QueueExecutor([blueprintResponse(signalBlueprint)]));
  approved.beginIdea("A compact top-down arena about activating one signal relay.");
  await approved.waitForIdle();
  approved.approveBlueprint();
  assert.equal(approved.getSnapshot().phase, "roadmap_review");
  const fingerprint = approved.getSnapshot().acceptedRoadmap!.fingerprint;
  approved.acceptRoadmap(fingerprint);
  const snapshot = approved.getSnapshot();
  assert.equal(snapshot.phase, "ready");
  assert.equal(snapshot.validationPassed, true);
  assert.equal(snapshot.acceptedRoadmap?.acceptedAt !== null, true);
  assert.ok(approved.getApprovedBlueprint()?.acceptedRoadmapSha256);
  assert.deepEqual(snapshot.effects, { projectFilesWritten: 0, commandsRun: 0, godotProcessesStarted: 0 });
});

test("roadmap edits are bounded, dependency-safe, and stale acceptance fails", async () => {
  const signalBlueprint = validBlueprint({ projectName: "Signal Sweep", vision: "Activate one signal relay in a compact arena.", coreAction: "Activate a signal relay." });
  const service = new BlueprintPlanningService(new QueueExecutor([blueprintResponse(signalBlueprint)]), () => Date.parse("2026-07-14T20:00:00.000Z"));
  service.beginIdea("A top-down Signal Sweep arena where the player activates one relay.");
  await service.waitForIdle();
  service.approveBlueprint();
  const stale = service.getSnapshot().acceptedRoadmap!.fingerprint;
  service.reviseRoadmap({ kind: "quest_title_changed", reference: "Q2", title: "Show the Relay Response" });
  assert.throws(() => service.acceptRoadmap(stale), /changed after review/i);
  assert.throws(() => service.reviseRoadmap({ kind: "quest_outcome_changed", reference: "Q1", visibleOutcome: "Keyboard movement is already verified by the controlled starter." }), /restate|catalog delta/i);
  assert.throws(() => service.reviseRoadmap({ kind: "quest_reordered", references: ["Q2", "Q1", "Q3"] }), /dependency/i);
  service.acceptRoadmap(service.getSnapshot().acceptedRoadmap!.fingerprint);
  assert.equal(service.getSnapshot().phase, "ready");
});

test("interpretation revisions preserve the original idea and share the three-event bound", async () => {
  const signalBlueprint = validBlueprint({ projectName: "Signal Sweep", vision: "Activate one signal relay in a compact arena." });
  const service = new BlueprintPlanningService(new QueueExecutor([
    blueprintResponse(signalBlueprint), blueprintResponse(signalBlueprint), blueprintResponse(signalBlueprint), blueprintResponse(signalBlueprint),
  ]), () => Date.parse("2026-07-14T20:00:00.000Z"));
  const original = "A platformer about sweeping signals between rooftop relays.";
  service.beginIdea(original);
  await service.waitForIdle();
  for (let index = 1; index <= 3; index += 1) {
    service.reviseIdea();
    service.beginIdea(`A top-down Signal Sweep revision ${index} with one relay.`);
    await service.waitForIdle();
  }
  assert.equal(service.getSnapshot().proposal?.originalIdea, original);
  assert.equal(service.getSnapshot().revisionEvents.length, 3);
  assert.ok(service.getSnapshot().revisionEvents.every((event) => event.kind === "interpretation_revised" && event.actor === "creator"));
  assert.throws(() => service.reviseIdea(), /three permitted/i);
});

test("planning host routes require exact interpretation, roadmap-edit, and roadmap-accept bodies", async () => {
  const signalBlueprint = validBlueprint({ projectName: "Signal Sweep", vision: "Activate one signal relay in a compact arena.", coreAction: "Activate one signal relay." });
  const planning = new BlueprintPlanningService(new QueueExecutor([blueprintResponse(signalBlueprint)]));
  const server = createForgeDashboardServer({} as ForgeDashboardService, path.resolve("dist/dashboard"), planning);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const post = (pathname: string, body: unknown) => fetch(`${baseUrl}${pathname}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    assert.equal((await post("/api/planning/start", { idea: "A top-down Signal Sweep arena with one relay.", extra: true })).status, 400);
    assert.equal((await post("/api/planning/start", { idea: "A top-down Signal Sweep arena with one relay." })).status, 202);
    await planning.waitForIdle();
    assert.equal((await post("/api/planning/approve", { decision: "ACCEPT INTERPRETATION", extra: true })).status, 400);
    assert.equal((await post("/api/planning/approve", { decision: "ACCEPT INTERPRETATION" })).status, 200);
    assert.equal((await post("/api/planning/roadmap/edit", { kind: "quest_title_changed", reference: "Q2", title: "Relay Response", extra: true })).status, 400);
    const fingerprint = planning.getSnapshot().acceptedRoadmap!.fingerprint;
    assert.equal((await post("/api/planning/roadmap/accept", { decision: "ACCEPT ROADMAP", fingerprint, extra: true })).status, 400);
    assert.equal((await post("/api/planning/roadmap/accept", { decision: "ACCEPT ROADMAP", fingerprint })).status, 200);
    assert.equal(planning.getSnapshot().phase, "ready");
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
});
