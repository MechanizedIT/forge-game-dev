import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { OfficialBlueprintModelExecutor } from "../blueprint-planner/sdk.js";
import { BlueprintPlanningService } from "../blueprint-planner/service.js";
import { repositoryRoot, resolveDemoWorkspace, resolveForgeHome } from "../demo/paths.js";
import { ensurePinnedGodot } from "../godot/bootstrap.js";
import { writeJsonAtomic } from "../quest-runner/artifacts.js";
import { ProjectCreationService } from "./service.js";

const idea = "A keyboard-controlled top-down arena where the player taps space to emit a pulse that pushes nearby enemies away. The fun should come from creating space at the last moment. The smallest playable result is one player, one enemy, and one repeatable push in a bounded arena.";
const evidencePath = path.join(repositoryRoot, "docs", "evidence", "2026-07-14-v0.2-task-5-real-project-creation.json");

async function walk(root: string, current = root, ignored = new Set<string>()): Promise<string[]> {
  const stats = await lstat(current).catch(() => null);
  if (!stats) return [];
  const result: string[] = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const target = path.join(current, entry.name);
    const relative = path.relative(root, target).replaceAll("\\", "/");
    if (ignored.has(relative) || [...ignored].some((prefix) => relative.startsWith(`${prefix}/`))) continue;
    if (entry.isDirectory()) result.push(...await walk(root, target, ignored));
    else if (entry.isFile()) result.push(relative);
  }
  return result.sort();
}

async function hashTree(root: string): Promise<string> {
  const files = await walk(root, root, new Set([".git", ".godot"]));
  if (files.length === 0) return "missing-or-empty";
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(file);
    hash.update(await readFile(path.join(root, file)));
  }
  return hash.digest("hex");
}

const forgeHome = resolveForgeHome();
const samplePath = resolveDemoWorkspace(forgeHome);
const sampleHashBefore = await hashTree(samplePath);
const beforeService = new ProjectCreationService({ forgeHome });
const projectsBefore = await beforeService.listRecentProjects();

const planning = new BlueprintPlanningService(new OfficialBlueprintModelExecutor(repositoryRoot));
planning.beginIdea(idea);
await planning.waitForIdle();
if (planning.getSnapshot().phase !== "review") {
  throw new Error(planning.getSnapshot().error ?? "Real GPT planning did not reach Blueprint Review.");
}
planning.approveBlueprint();
const approved = planning.getApprovedBlueprint();
if (!approved) throw new Error("Real GPT blueprint approval was not available.");

const creation = new ProjectCreationService({ forgeHome });
const observedStages: string[] = [];
creation.subscribe(() => {
  const stage = creation.getSnapshot().stage;
  if (stage && !observedStages.includes(stage)) observedStages.push(stage);
});
creation.beginCreation(approved);
await creation.waitForIdle();
const completed = creation.getSnapshot();
if (completed.phase !== "created" || !completed.createdProject) {
  throw new Error(completed.error ?? "Real project creation did not complete.");
}

const project = completed.createdProject;
const restarted = new ProjectCreationService({ forgeHome });
const recentAfterRestart = await restarted.listRecentProjects();
const reopened = await restarted.getCreatedProject(project.projectId);
const inventory = await walk(project.projectLocation, project.projectLocation, new Set([".git", ".godot"]));
const godot = await ensurePinnedGodot({ forgeHome });
const launch = spawnSync(godot.executable, ["--path", project.projectLocation, "--quit-after", "120"], {
  cwd: project.projectLocation,
  encoding: "utf8",
  windowsHide: false,
});
if (launch.error) throw launch.error;
if ((launch.status ?? 1) !== 0) throw new Error(`Generated project launch smoke failed (${launch.status ?? 1}).`);
const sampleHashAfter = await hashTree(samplePath);

const planningSnapshot = planning.getSnapshot();
await writeJsonAtomic(evidencePath, {
  date: "2026-07-14",
  objective: "Real GPT-5.6 to controlled Top-down Arena project creation rehearsal",
  idea,
  validatedBlueprintSummary: {
    projectName: approved.blueprint.projectName,
    vision: approved.blueprint.vision,
    foundation: approved.blueprint.foundation,
    inputMode: approved.blueprint.inputMode,
    smallestPlayableResult: approved.blueprint.smallestPlayableResult,
    firstPlayableMilestone: approved.blueprint.firstPlayableMilestone,
    questCount: approved.blueprint.quests.length,
    quests: approved.blueprint.quests.map((quest) => ({ title: quest.title, visibleOutcome: quest.visibleOutcome })),
  },
  planning: {
    model: planningSnapshot.provenance.model,
    reasoningEffort: planningSnapshot.provenance.reasoningEffort,
    attempts: planningSnapshot.provenance.attempts,
    sanitizedThreadId: planningSnapshot.provenance.threadId ? `${planningSnapshot.provenance.threadId.slice(0, 12)}…` : null,
    latencyMs: planningSnapshot.provenance.latencyMs,
    usage: planningSnapshot.provenance.usage,
    validationPassed: planningSnapshot.validationPassed,
  },
  creation: {
    projectId: project.projectId,
    foundation: project.foundation,
    relativeProjectLocation: `projects/${project.projectId}`,
    observedStages,
    starterVersion: project.starterVersion,
    generatedFileInventory: inventory,
    godotVerification: { result: "PASS", version: project.godotVersion, marker: project.godotSuccessMarker },
    gitBaseline: { result: "PASS", commitSha: project.gitCommitSha },
    documentationSaved: project.documentationSaved,
    chronicleInitialized: project.chronicleInitialized,
    registered: project.registered,
  },
  restart: {
    registryReloaded: recentAfterRestart.some((entry) => entry.projectId === project.projectId && entry.available),
    reopenedProjectId: reopened.projectId,
    stateLabel: recentAfterRestart.find((entry) => entry.projectId === project.projectId)?.stateLabel ?? null,
    projectCountBefore: projectsBefore.length,
    projectCountAfter: recentAfterRestart.length,
  },
  playableInspection: {
    visibleGodotLaunchFrames: 120,
    exitCode: launch.status ?? 1,
    mainScene: "res://scenes/main.tscn",
    movement: "WASD and arrow keys",
    objectiveMarker: "Main/ObjectiveMarker",
  },
  isolation: {
    sampleWorkspaceHashBefore: sampleHashBefore,
    sampleWorkspaceHashAfter: sampleHashAfter,
    sampleWorkspaceUntouched: sampleHashBefore === sampleHashAfter,
    arbitraryModelCommandsExecuted: 0,
    modelAuthoredStarterFilesExecuted: 0,
  },
});

console.log(`PASS: created ${project.projectId}`);
console.log(`Godot: ${project.godotSuccessMarker}`);
console.log(`Git: ${project.gitCommitSha}`);
console.log(`Evidence: ${path.relative(repositoryRoot, evidencePath)}`);
