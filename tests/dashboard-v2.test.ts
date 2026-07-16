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
// @ts-expect-error The base test config omits JSX; the tsx test runner compiles this UI module.
import { friendlyQuestPlanningError, recommendQuestFiles } from "../src/dashboard-v2/SystemQuestRefinement.js";
// @ts-expect-error The base test config omits JSX; the tsx test runner compiles this UI module.
import { friendlySystemPlanningError } from "../src/dashboard-v2/SystemRoadmapPlanning.js";
import { buildSampleWorkflowPresentation } from "../src/dashboard-v2/sample-workflow.js";
import { returnToLaunchpad, viewForLaunchChoice } from "../src/dashboard-v2/state.js";

test("quest file recommendations use validated game files without another planning turn", () => {
  const recommendation = recommendQuestFiles({
    title: "Random obstacle appearances",
    playerVisibleOutcome: "Obstacles appear at varied times and positions ahead of the robot.",
    doneWhen: ["The robot sees more than one obstacle pattern."],
  }, [
    { relativePath: "scenes/main.tscn", size: 10, sha256: "a".repeat(64) },
    { relativePath: "scripts/robot.gd", size: 10, sha256: "b".repeat(64) },
    { relativePath: "scripts/obstacle_controller.gd", size: 10, sha256: "c".repeat(64) },
    { relativePath: "scripts/verify_project.gd", size: 10, sha256: "d".repeat(64) },
  ]);
  assert.deepEqual(recommendation.existingFiles, ["scripts/obstacle_controller.gd", "scripts/robot.gd"]);
  assert.equal(recommendation.suggestedNewFile, "scripts/random_obstacle_appearances.gd");
});

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("live planning schema failures use friendly retry words", () => {
  const raw = '{"type":"error","error":{"type":"invalid_request_error","code":"invalid_json_schema","message":"Invalid schema for response_format codex_output_schema: oneOf is not permitted.","param":"text.format.schema"},"status":400}';
  const systemMessage = friendlySystemPlanningError(raw);
  const questMessage = friendlyQuestPlanningError(raw);
  assert.equal(systemMessage, "Forge could not suggest Experiences this time. Your idea is still here, so you can try again safely.");
  assert.equal(questMessage, "Forge could not suggest Steps this time. Your description is still here, so you can try again safely.");
  assert.doesNotMatch(`${systemMessage} ${questMessage}`, /invalid_json_schema|response_format|oneOf|text\.format\.schema/iu);
});

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

test("default Forge launch targets v0.2 while v0.1 remains directly available", async () => {
  const packageJson = await readJson("package.json") as { scripts: Record<string, string> };
  assert.equal(
    packageJson.scripts.forge,
    "npm run dashboard:build && npm run dashboard:host -- --v0.2",
  );
  assert.equal(
    packageJson.scripts["forge:v0.1"],
    "npm run dashboard:build && npm run dashboard:host -- --legacy",
  );
  assert.equal(packageJson.scripts.forge, packageJson.scripts["forge:v0.2"]);
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
  const [app, newGame, generatedWorld, systemPlanning, generatedShared, planningShared, adapter, styles, html, packageJsonText, visualReview, blueprintVisualReview, generatedQuestVisualReview, systemRoadmapVisualReview, planningSdk, planningService, server] = await Promise.all([
    readFile(path.join(repositoryRoot, "src", "dashboard-v2", "App.tsx"), "utf8"),
    readFile(path.join(repositoryRoot, "src", "dashboard-v2", "NewGameFlow.tsx"), "utf8"),
    readFile(path.join(repositoryRoot, "src", "dashboard-v2", "GeneratedProjectWorld.tsx"), "utf8"),
    readFile(path.join(repositoryRoot, "src", "dashboard-v2", "SystemRoadmapPlanning.tsx"), "utf8"),
    readFile(path.join(repositoryRoot, "src", "generated-project-world", "shared.ts"), "utf8"),
    readFile(path.join(repositoryRoot, "src", "blueprint-planner", "shared.ts"), "utf8"),
    readFile(path.join(repositoryRoot, "src", "dashboard-v2", "sample-workflow.ts"), "utf8"),
    readFile(path.join(repositoryRoot, "src", "dashboard-v2", "styles.css"), "utf8"),
    readFile(path.join(repositoryRoot, "v0.2.html"), "utf8"),
    readFile(path.join(repositoryRoot, "package.json"), "utf8"),
    readFile(path.join(repositoryRoot, "src", "visual-review", "v0.2.ts"), "utf8"),
    readFile(path.join(repositoryRoot, "src", "visual-review", "v0.2-blueprint.ts"), "utf8"),
    readFile(path.join(repositoryRoot, "src", "visual-review", "v0.2-generated-quest.ts"), "utf8"),
    readFile(path.join(repositoryRoot, "src", "visual-review", "v0.2-system-roadmap.ts"), "utf8"),
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
  assert.match(newGame, /Create the Godot project/);
  assert.match(newGame, /Confirm and create project/);
  assert.match(newGame, /projectCreationStages/);
  assert.match(newGame, /Your Godot project is ready\./);
  assert.match(newGame, /Enter Project World/);
  assert.match(generatedWorld, /buildGeneratedWorkspacePresentation/);
  assert.match(generatedWorld, /System map/);
  assert.match(generatedWorld, /Project Workspace/);
  assert.match(generatedWorld, /Quest details/);
  assert.match(generatedWorld, /Workbench/);
  assert.match(generatedWorld, /Toolbox/);
  assert.match(generatedWorld, /Play Game/);
  assert.match(generatedWorld, /Open Folder/);
  assert.match(generatedWorld, /No quests yet/);
  assert.match(generatedWorld, /Shape systems/);
  assert.match(systemPlanning, /What should this game become\?/);
  assert.match(systemPlanning, /A few answers will help/);
  assert.match(systemPlanning, /Revise roadmap/);
  assert.match(systemPlanning, /Accept Experiences/);
  assert.match(systemPlanning, /No game file is changing/);
  assert.doesNotMatch(systemPlanning, /capability|supported game type|verification profile/i);
  assert.doesNotMatch(generatedWorld, /Blender|GIMP|Unity|capability/i);
  assert.match(generatedShared, /Generated intended outcome/);
  assert.match(generatedShared, /GeneratedQuestRunSnapshot/);
  assert.match(generatedShared, /generatedQuestImplementation: boolean/);
  assert.match(generatedShared, /Idea activity · derived from saved seed/);
  assert.match(generatedWorld, /Adjust outcome/);
  assert.match(generatedWorld, /Build with Forge/);
  assert.match(generatedWorld, /Approve exact contract/);
  assert.match(generatedWorld, /Boundary/);
  assert.match(generatedWorld, /Project health/);
  assert.match(generatedWorld, /Mechanic/);
  assert.match(generatedWorld, /Your playtest/);
  assert.match(generatedWorld, /Play the real game/);
  assert.match(generatedWorld, />Worked</);
  assert.match(generatedWorld, /Did not work/);
  assert.match(generatedWorld, /Not ready/);
  assert.match(generatedWorld, /Roll back reviewed changes/);
  assert.match(generatedWorld, /Forge recommendation/);
  assert.match(generatedWorld, /aria-current/);
  assert.match(generatedWorld, /role="status"/);
  assert.match(generatedWorld, /role="alert"/);
  assert.doesNotMatch(generatedWorld, /fetch\(/);
  assert.match(app, /Recent projects/);
  assert.match(app, /project\.stateLabel/);
  assert.match(planningSdk, /model: "gpt-5\.6"/);
  assert.match(planningSdk, /modelReasoningEffort: "high"/);
  assert.match(planningSdk, /sandboxMode: "read-only"/);
  assert.match(planningSdk, /networkAccessEnabled: false/);
  assert.match(planningSdk, /webSearchMode: "disabled"/);
  assert.match(planningService, /buildRepairPrompt/);
  assert.match(server, /\/api\/planning\/approve/);
  assert.match(server, /\/api\/projects\/create/);
  assert.match(server, /x-forge-mutation-token/);
  assert.match(server, /\/world/);
  assert.match(server, /Object\.keys\(body\)\.length !== 0/);
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
  assert.match(generatedQuestVisualReview, /generated-contract-mobile/);
  assert.match(generatedQuestVisualReview, /generated-progress-desktop/);
  assert.match(generatedQuestVisualReview, /generated-proof-playtest-desktop/);
  assert.match(generatedQuestVisualReview, /generated-complete-desktop/);
  assert.match(generatedQuestVisualReview, /generated-safe-rollback-desktop/);
  assert.match(systemRoadmapVisualReview, /channel: "msedge"/);
  assert.match(systemRoadmapVisualReview, /clarification-tablet/);
  assert.match(systemRoadmapVisualReview, /failure-retry-desktop/);
  assert.match(systemRoadmapVisualReview, /system-roadmap\.json/);

  const packageJson = JSON.parse(packageJsonText) as {
    scripts: Record<string, string>;
    devDependencies: Record<string, string>;
  };
  assert.equal(packageJson.scripts.forge, "npm run dashboard:build && npm run dashboard:host -- --v0.2");
  assert.equal(packageJson.scripts["forge:v0.1"], "npm run dashboard:build && npm run dashboard:host -- --legacy");
  assert.equal(packageJson.scripts["forge:v0.2"], "npm run dashboard:build && npm run dashboard:host -- --v0.2");
  assert.equal(packageJson.scripts["visual:review:v0.2"], "npm run dashboard:build && tsx src/visual-review/v0.2.ts");
  assert.equal(packageJson.scripts["visual:review:v0.2:blueprint"], "npm run dashboard:build && tsx src/visual-review/v0.2-blueprint.ts");
  assert.equal(packageJson.scripts["visual:review:alpha:generated-quest"], "npm run dashboard:build && tsx src/visual-review/v0.2-generated-quest.ts");
  assert.equal(packageJson.scripts["visual:review:alpha:system-roadmap"], "npm run dashboard:build && tsx src/visual-review/v0.2-system-roadmap.ts");
  assert.match(visualReview, /spawn\(process\.execPath, \[tsxCli, "src\/dashboard-host\/cli\.ts", "--v0\.2"\]/);
  assert.match(visualReview, /FORGE_REVIEW_EVIDENCE_ROOT/);
  assert.equal(packageJson.devDependencies["@playwright/test"], "1.61.1");
});
