import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ThreadEvent } from "@openai/codex-sdk";

import {
  gameBlueprintSchema,
  generatedQuestArtifactAnySchema,
  generatedQuestArtifactV2Schema,
  generatedRoadmapV2Schema,
  roadmapSchema,
  godotVerificationResultSchema,
  type GameBlueprint,
} from "../../src/contracts/index.js";
import { fingerprintBlueprint } from "../../src/blueprint-planner/service.js";
import { acceptRoadmap, buildBlueprintProposal, createSignalSweepRoadmap } from "../../src/blueprint-planner/starter-catalog.js";
import { ProjectCreationService } from "../../src/project-creation/service.js";
import type { ApprovedBlueprintEnvelope } from "../../src/project-creation/shared.js";
import type { CodexExecutor, CodexRunRequest, CodexRunSession } from "../../src/quest-runner/types.js";
import { runGit } from "../../src/generated-quest-runner/boundary.js";
import { normalizeGeneratedQuest, normalizeGeneratedRoadmap } from "../../src/generated-quest-runner/contract.js";

export const fixtureTime = "2026-07-14T20:00:00.000Z";

function blueprint(): GameBlueprint {
  return gameBlueprintSchema.parse({
    projectName: "Gravity Tap Arena",
    vision: "A compact top-down arena where one readable gravity orb anchors a future pulse mechanic.",
    foundation: "top_down_arena",
    inputMode: "keyboard",
    coreAction: "Move through the arena and prepare to tap gravity.",
    funTarget: "Read one gravity orb clearly before adding interaction.",
    smallestPlayableResult: "One player can move in a bounded arena containing one visible orb.",
    firstPlayableMilestone: "Move in a bounded arena, see one gravity orb, then later pulse and pull it.",
    quests: [
      { reference: "Q1", title: "Enter the Arena", visibleOutcome: "A code-native arena appears with one player and one orb.", dependencies: [] },
      { reference: "Q2", title: "Move Into Position", visibleOutcome: "The player moves in four directions.", dependencies: ["Q1"] },
      { reference: "Q3", title: "Create the Gravity Well", visibleOutcome: "Space produces a future gravity pulse.", dependencies: ["Q2"] },
      { reference: "Q4", title: "Pull the Orb", visibleOutcome: "A future pulse pulls the orb.", dependencies: ["Q3"] },
    ],
    includedScope: ["One bounded arena", "One player", "One orb", "Keyboard movement"],
    excludedScope: ["New files", "External assets", "Combat", "Scoring", "Multiple orbs"],
    acceptanceCriteria: [
      { reference: "AC-1", questReference: "Q1", criterion: "One orb is visible.", verificationReferences: ["V-1"] },
      { reference: "AC-2", questReference: "Q2", criterion: "Movement responds.", verificationReferences: ["V-2"] },
      { reference: "AC-3", questReference: "Q3", criterion: "The pulse is visible.", verificationReferences: ["V-3"] },
      { reference: "AC-4", questReference: "Q4", criterion: "The orb is pulled.", verificationReferences: ["V-4"] },
    ],
    verificationIdeas: [
      { reference: "V-1", questReference: "Q1", idea: "Count the visible orb." },
      { reference: "V-2", questReference: "Q2", idea: "Exercise movement." },
      { reference: "V-3", questReference: "Q3", idea: "Observe the pulse." },
      { reference: "V-4", questReference: "Q4", idea: "Observe the pull." },
    ],
    projectDocumentationSummary: "A controlled Gravity Tap starter project.",
    initialChronicleSummary: "Forge created the verified Gravity Tap foundation.",
  });
}

function envelope(): ApprovedBlueprintEnvelope {
  const value = blueprint();
  return {
    blueprint: value,
    blueprintSha256: fingerprintBlueprint(value),
    approvedAt: fixtureTime,
    provenance: {
      model: "gpt-5.6",
      reasoningEffort: "high",
      sandbox: "read-only",
      network: "disabled",
      threadId: "generated-quest-test-thread",
      attempts: 1,
      latencyMs: 10,
      usage: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 1, reasoningOutputTokens: 0 },
    },
  };
}

function signalEnvelope(): ApprovedBlueprintEnvelope {
  const value = gameBlueprintSchema.parse({
    ...blueprint(),
    projectName: "Signal Sweep",
    vision: "A compact top-down arena where the player activates one signal relay.",
    coreAction: "Move into the existing relay to activate it.",
    smallestPlayableResult: "The player moves into one relay and sees a clear activation response.",
    firstPlayableMilestone: "Activate one relay and read its response in the bounded arena.",
  });
  const blueprintSha256 = fingerprintBlueprint(value);
  const proposal = buildBlueprintProposal("A top-down Signal Sweep arena where the player activates one relay.", value);
  const draft = createSignalSweepRoadmap(blueprintSha256, value);
  const acceptedRoadmap = acceptRoadmap(draft, draft.fingerprint, fixtureTime);
  return { ...envelope(), blueprint: value, blueprintSha256, proposal, acceptedRoadmap, acceptedRoadmapSha256: acceptedRoadmap.fingerprint };
}

function ids(...values: string[]): () => string {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)]!;
}

export interface GeneratedQuestFixture {
  root: string;
  forgeHome: string;
  projectId: string;
  projectPath: string;
  cleanup: () => Promise<void>;
}

export async function createGeneratedQuestFixture(): Promise<GeneratedQuestFixture> {
  const root = await mkdtemp(path.join(os.tmpdir(), "forge-generated-quest-test-"));
  const forgeHome = path.join(root, "Forge");
  const service = new ProjectCreationService({
    allowLegacyPlanningEnvelopes: true,
    forgeHome,
    now: () => new Date(fixtureTime),
    randomId: ids(
      "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      "cccccccc-cccc-cccc-cccc-cccccccccccc",
    ),
    verifyGodot: async ({ projectId, verifiedAt }) => godotVerificationResultSchema.parse({
      schemaVersion: 1,
      projectId,
      status: "passed",
      godotVersion: "4.7.stable.test",
      arguments: ["--headless", "--path", ".", "--script", "res://scripts/verify_project.gd"],
      successMarker: "FORGE_TOP_DOWN_ARENA_VERIFY_OK",
      output: "FORGE_TOP_DOWN_ARENA_VERIFY_OK main=pass player=pass input=pass movement=pass objective=pass scripts=pass external=none",
      verifiedAt,
    }),
  });
  service.beginCreation(envelope());
  await service.waitForIdle();
  const created = service.getSnapshot().createdProject;
  assert.ok(created, service.getSnapshot().error ?? "Generated quest fixture creation failed.");
  return {
    root,
    forgeHome,
    projectId: created.projectId,
    projectPath: created.projectLocation,
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
}

export async function createSignalSweepFixture(): Promise<GeneratedQuestFixture> {
  const root = await mkdtemp(path.join(os.tmpdir(), "forge-signal-sweep-test-"));
  const forgeHome = path.join(root, "Forge");
  const service = new ProjectCreationService({
    forgeHome,
    now: () => new Date(fixtureTime),
    randomId: ids("dddddddd-dddd-dddd-dddd-dddddddddddd", "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"),
    verifyGodot: async ({ projectId, verifiedAt }) => godotVerificationResultSchema.parse({
      schemaVersion: 1, projectId, status: "passed", godotVersion: "4.7.stable.test",
      arguments: ["--headless", "--path", ".", "--script", "res://scripts/verify_project.gd"],
      successMarker: "FORGE_TOP_DOWN_ARENA_VERIFY_OK",
      output: "FORGE_TOP_DOWN_ARENA_VERIFY_OK main=pass player=pass input=pass movement=pass objective=pass scripts=pass external=none",
      verifiedAt,
    }),
  });
  service.beginCreation(signalEnvelope());
  await service.waitForIdle();
  const created = service.getSnapshot().createdProject;
  assert.ok(created, service.getSnapshot().error ?? "Signal Sweep fixture creation failed.");
  return { root, forgeHome, projectId: created.projectId, projectPath: created.projectLocation, cleanup: () => rm(root, { recursive: true, force: true }) };
}

export const passingProofDependencies = {
  projectHealth: async () => ({
    output: "FORGE_TOP_DOWN_ARENA_VERIFY_OK main=pass player=pass movement=pass",
    godotVersion: "4.7.stable.test",
  }),
  mechanic: async () => ({
    output: "FORGE_GRAVITY_ORB_PRESENCE_V1_OK count=1 role=gravity_orb",
    godotVersion: "4.7.stable.test",
  }),
};

export class MutatingCodexExecutor implements CodexExecutor {
  constructor(
    private readonly mutate: (request: CodexRunRequest) => Promise<void>,
    private readonly failAfterMutation = false,
    private readonly agentMessage: string | null = null,
  ) {}

  async start(request: CodexRunRequest): Promise<CodexRunSession> {
    const mutate = this.mutate;
    const fail = this.failAfterMutation;
    const agentMessage = this.agentMessage;
    return {
      events: (async function* () {
        yield { type: "thread.started", thread_id: "thread-generated-test" } as ThreadEvent;
        yield { type: "turn.started" } as ThreadEvent;
        await mutate(request);
        yield { type: "item.completed", item: { id: "change-1", type: "file_change", changes: [] } } as unknown as ThreadEvent;
        if (fail) {
          yield { type: "turn.failed", error: { message: "Injected SDK failure after an allowed edit" } } as ThreadEvent;
          return;
        }
        if (agentMessage) {
          yield { type: "item.completed", item: { id: "message-1", type: "agent_message", text: agentMessage } } as unknown as ThreadEvent;
        }
        yield {
          type: "turn.completed",
          usage: { input_tokens: 10, cached_input_tokens: 0, output_tokens: 5 },
        } as ThreadEvent;
      })(),
      getThreadId: () => "thread-generated-test",
    };
  }
}

export async function applyOrbChange(request: CodexRunRequest): Promise<void> {
  const scenePath = path.join(request.workspacePath, "scenes", "main.tscn");
  const scene = await readFile(scenePath, "utf8");
  const changed = scene
    .replace('[node name="ObjectiveMarker" type="Area2D" parent="."]', '[node name="ObjectiveMarker" type="Area2D" parent="."]\nmetadata/forge_role = "gravity_orb"')
    .replace("OBJECTIVE · Reach the signal relay", "OBJECTIVE · Find the gravity orb");
  assert.notEqual(changed, scene);
  await writeFile(scenePath, changed, "utf8");
}

export async function configureWelcomeBeaconQuest(fixture: GeneratedQuestFixture): Promise<void> {
  const questPath = path.join(fixture.projectPath, ".forge", "quests", "q1-enter-the-arena.json");
  const roadmapPath = path.join(fixture.projectPath, ".forge", "roadmap.json");
  const questAny = generatedQuestArtifactAnySchema.parse(JSON.parse(await readFile(questPath, "utf8")) as unknown);
  const quest = normalizeGeneratedQuest(questAny, "available");
  const welcomeQuest = generatedQuestArtifactV2Schema.parse({
    ...quest,
    title: "Show the welcome beacon",
    visibleOutcome: "A bright welcome beacon appears when the opening arena starts.",
    whyItMatters: "The creator can immediately see that Forge added one new mechanic safely.",
    scope: { included: ["One code-native welcome beacon"], excluded: ["New assets", "Project settings", "Unapproved files"] },
    acceptanceCriteria: [{ id: "AC-1", criterion: "The opening arena shows one welcome beacon.", verificationIds: ["V-1"] }],
    verificationIdeas: [{ id: "V-1", idea: "Launch the real game and confirm the welcome beacon is visible." }],
    editableFileRoles: [],
    verificationProfile: null,
    workOrder: { existingFiles: ["scenes/main.tscn"], newFiles: ["scripts/welcome_beacon.gd"] },
  });
  const roadmapValue = JSON.parse(await readFile(roadmapPath, "utf8")) as unknown;
  const roadmap = normalizeGeneratedRoadmap(generatedRoadmapV2Schema.safeParse(roadmapValue).success ? generatedRoadmapV2Schema.parse(roadmapValue) : roadmapSchema.parse(roadmapValue));
  const welcomeRoadmap = generatedRoadmapV2Schema.parse({
    ...roadmap,
    quests: roadmap.quests.map((node) => node.questId === welcomeQuest.questId ? { ...node, title: welcomeQuest.title, summary: welcomeQuest.visibleOutcome } : node),
  });
  await writeFile(questPath, `${JSON.stringify(welcomeQuest, null, 2)}\n`, "utf8");
  await writeFile(roadmapPath, `${JSON.stringify(welcomeRoadmap, null, 2)}\n`, "utf8");
  runGit(fixture.projectPath, ["add", "--", ".forge/quests/q1-enter-the-arena.json", ".forge/roadmap.json"]);
  runGit(fixture.projectPath, ["commit", "-m", "test: configure welcome beacon quest"]);
}

export async function applyWelcomeBeaconChange(request: CodexRunRequest): Promise<void> {
  const scenePath = path.join(request.workspacePath, "scenes", "main.tscn");
  const scriptPath = path.join(request.workspacePath, "scripts", "welcome_beacon.gd");
  const scene = await readFile(scenePath, "utf8");
  const changed = scene
    .replace("[gd_scene load_steps=5 format=3]", "[gd_scene load_steps=6 format=3]")
    .replace('[ext_resource type="Script" path="res://scripts/objective_marker.gd" id="3_objective"]', '[ext_resource type="Script" path="res://scripts/objective_marker.gd" id="3_objective"]\n[ext_resource type="Script" path="res://scripts/welcome_beacon.gd" id="4_welcome"]')
    .replace('[node name="Title" type="Label" parent="."]', '[node name="WelcomeBeacon" type="Node2D" parent="."]\nscript = ExtResource("4_welcome")\n\n[node name="Title" type="Label" parent="."]');
  assert.notEqual(changed, scene);
  await writeFile(scenePath, changed, "utf8");
  await writeFile(scriptPath, "extends Node2D\n\nfunc _draw() -> void:\n\tdraw_circle(Vector2(480, 180), 28.0, Color(0.4, 0.9, 1.0))\n", "utf8");
}

export const approvedAdjustment = {
  visibleOutcome: "A clearly identifiable gravity orb is present in the opening arena.",
  includedScope: [
    "One clearly identifiable gravity orb",
    "Existing code-native arena visuals",
    "Existing ObjectiveMarker node and script",
  ],
};
