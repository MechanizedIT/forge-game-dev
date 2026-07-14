import assert from "node:assert/strict";
import test from "node:test";

import {
  gameBlueprintPlanningResultSchema,
  gameBlueprintSchema,
  type ClarificationTopic,
  type GameBlueprint,
} from "../src/contracts/index.js";
import { BlueprintPlanningService } from "../src/blueprint-planner/service.js";
import type {
  BlueprintModelExecutor,
  BlueprintModelSession,
  BlueprintModelTurn,
} from "../src/blueprint-planner/types.js";

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

  const approved = new BlueprintPlanningService(new QueueExecutor([blueprintResponse()]));
  approved.beginIdea("A compact top-down arena about pushing one enemy away.");
  await approved.waitForIdle();
  approved.approveBlueprint();
  const snapshot = approved.getSnapshot();
  assert.equal(snapshot.phase, "ready");
  assert.equal(snapshot.validationPassed, true);
  assert.deepEqual(snapshot.effects, { projectFilesWritten: 0, commandsRun: 0, godotProcessesStarted: 0 });
});
