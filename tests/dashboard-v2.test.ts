import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  implementationPlanSchema,
  questCompletionSchema,
  questSchema,
  reviewResultSchema,
  roadmapSchema,
} from "../src/contracts/index.js";
import type { DashboardSnapshot } from "../src/dashboard/shared.js";
import { buildSampleWorkflowPresentation } from "../src/dashboard-v2/sample-workflow.js";
import { returnToLaunchpad, viewForLaunchChoice } from "../src/dashboard-v2/state.js";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readJson(relativePath: string): Promise<unknown> {
  return JSON.parse(await readFile(path.join(repositoryRoot, relativePath), "utf8")) as unknown;
}

async function sampleSnapshot(): Promise<DashboardSnapshot> {
  const [roadmap, quest, plan] = await Promise.all([
    readJson("fixtures/godot/baseline/.forge/roadmap.json").then((value) => roadmapSchema.parse(value)),
    readJson("fixtures/godot/baseline/.forge/quests/enemy-targeting.json").then((value) => questSchema.parse(value)),
    readJson("fixtures/godot/baseline/.forge/plans/enemy-targeting.json").then((value) => implementationPlanSchema.parse(value)),
  ]);
  return {
    project: { projectId: "sample-game", name: "Sample Game", engine: "Godot 4.7", workspaceStatus: "created" },
    phase: "world_ready",
    runStartedAt: null,
    roadmap,
    quest,
    plan,
    progress: [],
    handoff: null,
    review: null,
    completion: null,
    technicalEvents: [],
    notice: null,
    error: null,
  };
}

test("v0.2 launch choices route to the real sample path and New Game Intake", () => {
  assert.equal(viewForLaunchChoice("explore_sample"), "sample_world");
  assert.equal(viewForLaunchChoice("create_game"), "new_game_intake");
  assert.equal(returnToLaunchpad(), "launchpad");
});

test("real sample adapter distinguishes fresh, preserved, active, and completed workspace states", async () => {
  const fresh = await sampleSnapshot();
  const freshPresentation = buildSampleWorkflowPresentation(fresh);
  assert.equal(freshPresentation.workspaceState, "fresh");
  assert.equal(freshPresentation.nodes.find((node) => node.authoritative)?.state, "available");
  assert.equal(freshPresentation.proofAvailable, false);
  assert.equal(freshPresentation.chronicleAvailable, false);

  const preserved = buildSampleWorkflowPresentation({
    ...fresh,
    project: { ...fresh.project, workspaceStatus: "preserved" },
  });
  assert.equal(preserved.workspaceState, "preserved");

  const active = buildSampleWorkflowPresentation({
    ...fresh,
    phase: "implementation_running",
    runStartedAt: "2026-07-14T12:00:00.000Z",
    progress: ["Inspecting approved files", "Preparing the change"],
  });
  assert.equal(active.workspaceState, "in_progress");
  assert.equal(active.currentStage, "Preparing the change");
  assert.equal(active.nodes.find((node) => node.authoritative)?.state, "active");
  assert.equal(active.runLabel, null);
  assert.equal(active.resetEligible, false);

  const [completion, review] = await Promise.all([
    readJson("docs/templates/quest-completion.template.json").then((value) => questCompletionSchema.parse(value)),
    readJson("docs/templates/review-result.template.json").then((value) => reviewResultSchema.parse(value)),
  ]);
  const completedRoadmap = roadmapSchema.parse({
    ...fresh.roadmap,
    quests: fresh.roadmap.quests.map((quest) => ({ ...quest, state: "completed" })),
    updatedAt: completion.completedAt,
  });
  const completed = buildSampleWorkflowPresentation({
    ...fresh,
    phase: "quest_complete",
    roadmap: completedRoadmap,
    completion,
    review,
  });
  assert.equal(completed.workspaceState, "completed");
  assert.equal(completed.nodes.find((node) => node.authoritative)?.state, "completed");
  assert.equal(completed.proofAvailable, true);
  assert.equal(completed.chronicleAvailable, true);
  assert.equal(completed.runLabel, completion.runId);
});

test("v0.2 source connects the protected sample API and real blueprint planning", async () => {
  const [app, newGame, planningShared, adapter, styles, html, packageJsonText, visualReview, blueprintVisualReview, planningSdk, planningService, server] = await Promise.all([
    readFile(path.join(repositoryRoot, "src", "dashboard-v2", "App.tsx"), "utf8"),
    readFile(path.join(repositoryRoot, "src", "dashboard-v2", "NewGameFlow.tsx"), "utf8"),
    readFile(path.join(repositoryRoot, "src", "blueprint-planner", "shared.ts"), "utf8"),
    readFile(path.join(repositoryRoot, "src", "dashboard-v2", "sample-workflow.ts"), "utf8"),
    readFile(path.join(repositoryRoot, "src", "dashboard-v2", "styles.css"), "utf8"),
    readFile(path.join(repositoryRoot, "v0.2.html"), "utf8"),
    readFile(path.join(repositoryRoot, "package.json"), "utf8"),
    readFile(path.join(repositoryRoot, "src", "visual-review", "v0.2.ts"), "utf8"),
    readFile(path.join(repositoryRoot, "src", "visual-review", "v0.2-blueprint.ts"), "utf8"),
    readFile(path.join(repositoryRoot, "src", "blueprint-planner", "sdk.ts"), "utf8"),
    readFile(path.join(repositoryRoot, "src", "blueprint-planner", "service.ts"), "utf8"),
    readFile(path.join(repositoryRoot, "src", "dashboard-host", "server.ts"), "utf8"),
  ]);

  assert.match(app, /loadDashboard/);
  assert.match(app, /subscribeToDashboard/);
  assert.match(app, /approveQuest/);
  assert.match(app, /cancelQuestApproval/);
  assert.match(app, /launchGame/);
  assert.match(app, /confirmCreatorResult/);
  assert.match(app, /resetDemo/);
  assert.doesNotMatch(app, /sampleWorldFixture/);
  assert.match(adapter, /snapshot\.roadmap\.quests\.find/);
  assert.match(adapter, /snapshot\.completion/);
  assert.match(app, /What would you like to build\?/);
  assert.match(app, /What will change\?/);
  assert.match(app, /What may Codex change\?/);
  assert.match(app, /How will we prove it\?/);
  assert.match(app, /Approve & build with Codex/);
  assert.match(app, /Live run through the official Codex SDK/);
  assert.match(app, /Codex finished\. The code passed\. Now the game needs you\./);
  assert.match(app, /I saw it work/);
  assert.match(app, /It did not work/);
  assert.match(app, /Cancel \/ not ready/);
  assert.match(app, /What should we build next\?/);
  assert.match(app, /preview only/i);
  assert.match(app, /NewGameFlow/);
  assert.match(newGame, /What kind of game would you like to make\?/);
  assert.match(newGame, /Shape my game/);
  assert.match(newGame, /Continue with these answers/);
  assert.match(newGame, /blueprintPlanningStages/);
  assert.match(planningShared, /Understanding your idea/);
  assert.match(newGame, /Blueprint Review/);
  assert.match(newGame, /Approve blueprint/);
  assert.match(newGame, /Your game blueprint is ready\./);
  assert.match(newGame, /Create the Godot project — next task/);
  assert.match(newGame, /Project files written/);
  assert.match(newGame, /Commands run/);
  assert.match(planningSdk, /model: "gpt-5\.6"/);
  assert.match(planningSdk, /modelReasoningEffort: "high"/);
  assert.match(planningSdk, /sandboxMode: "read-only"/);
  assert.match(planningSdk, /networkAccessEnabled: false/);
  assert.match(planningSdk, /webSearchMode: "disabled"/);
  assert.match(planningService, /buildRepairPrompt/);
  assert.match(server, /\/api\/planning\/approve/);
  assert.match(styles, /\.complete-segment \{ width: 100%; background: var\(--mint\)/);
  assert.match(styles, /\.available-segment \{ background: var\(--ember\)/);
  assert.match(styles, /\.planned-segment \{ width: 100%; border-top: 2px dashed/);
  assert.match(styles, /@media \(max-width: 768px\)/);
  assert.match(styles, /@media \(max-width: 480px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(html, /src\/dashboard-v2\/main\.tsx/);
  assert.match(html, /rel="icon"/);
  assert.match(visualReview, /channel: "msedge"/);
  assert.match(visualReview, /channel: "chrome"/);
  assert.match(visualReview, /Horizontal overflow/);
  assert.match(visualReview, /prefers-reduced-motion|reducedMotion/);
  assert.match(visualReview, /pageerror/);
  assert.match(visualReview, /requestfailed/);
  assert.match(blueprintVisualReview, /intake-desktop/);
  assert.match(blueprintVisualReview, /clarification-desktop/);
  assert.match(blueprintVisualReview, /planning-desktop/);
  assert.match(blueprintVisualReview, /blueprint-review-mobile/);
  assert.match(blueprintVisualReview, /blueprint-ready-desktop/);

  const packageJson = JSON.parse(packageJsonText) as {
    scripts: Record<string, string>;
    devDependencies: Record<string, string>;
  };
  assert.equal(packageJson.scripts.forge, "npm run dashboard:build && npm run dashboard:host");
  assert.equal(packageJson.scripts["forge:v0.1"], "npm run dashboard:build && npm run dashboard:host -- --legacy");
  assert.equal(packageJson.scripts["forge:v0.2"], "npm run dashboard:build && npm run dashboard:host -- --v0.2");
  assert.equal(packageJson.scripts["visual:review:v0.2"], "tsx src/visual-review/v0.2.ts");
  assert.equal(packageJson.scripts["visual:review:v0.2:blueprint"], "tsx src/visual-review/v0.2-blueprint.ts");
  assert.equal(packageJson.devDependencies["@playwright/test"], "1.61.1");
});
