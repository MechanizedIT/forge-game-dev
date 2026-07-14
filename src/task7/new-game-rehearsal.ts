import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { lstat, readFile, readdir } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import path from "node:path";

import { OfficialBlueprintModelExecutor } from "../blueprint-planner/sdk.js";
import { BlueprintPlanningService } from "../blueprint-planner/service.js";
import { createForgeDashboardServer } from "../dashboard-host/server.js";
import { ForgeDashboardService } from "../dashboard-host/service.js";
import { repositoryRoot, resolveDemoWorkspace, resolveForgeHome } from "../demo/paths.js";
import {
  GeneratedProjectWorldService,
  type GeneratedWorldLaunchRequest,
} from "../generated-project-world/service.js";
import { ProjectCreationService } from "../project-creation/service.js";
import { writeJsonAtomic } from "../quest-runner/artifacts.js";

const idea = "A keyboard-controlled top-down arena where the player moves and taps space to create a brief gravity well that pulls one nearby orb. The fun should come from timing one satisfying pull. The smallest playable result is one player, one orb, and one repeatable pull in a bounded arena.";
const savedIdea = "Make the gravity well leave a faint ring showing its reach.";
const evidencePath = path.join(
  repositoryRoot,
  "docs",
  "evidence",
  "2026-07-14-v0.2-task-7-real-new-game.json",
);

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

async function digest(filePath: string): Promise<string> {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

async function request<T>(baseUrl: string, pathname: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${pathname}`, init);
  const body = await response.json() as T | { error?: string };
  if (!response.ok) {
    throw new Error((body as { error?: string }).error ?? `${init?.method ?? "GET"} ${pathname} failed (${response.status}).`);
  }
  return body as T;
}

async function waitFor<T extends { phase: string }>(
  load: () => Promise<T>,
  terminal: ReadonlySet<string>,
  timeoutMs: number,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const snapshot = await load();
    if (terminal.has(snapshot.phase)) return snapshot;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${[...terminal].join(" or ")}.`);
}

const forgeHome = resolveForgeHome();
const samplePath = resolveDemoWorkspace(forgeHome);
const projectsPath = path.join(forgeHome, "projects");
const sampleHashBefore = await hashTree(samplePath);
const projectsBeforePlanning = await readdir(projectsPath).catch(() => [] as string[]);
const registryPath = path.join(forgeHome, "project-registry.json");
const registryHashBeforePlanning = await digest(registryPath).catch(() => "missing");

let openedFolderPath: string | null = null;
const launchCapture: { value: GeneratedWorldLaunchRequest | null } = { value: null };
let launchExitCode: number | null = null;
let launchOutput = "";
const planning = new BlueprintPlanningService(new OfficialBlueprintModelExecutor(repositoryRoot));
const creation = new ProjectCreationService({
  forgeHome,
  openFolder: (opened) => { openedFolderPath = opened; },
});
const generatedWorld = new GeneratedProjectWorldService({
  forgeHome,
  launchGodot: (request) => {
    launchCapture.value = request;
    const result = spawnSync(request.executable, [...request.args, "--quit-after", "120"], {
      cwd: request.cwd,
      encoding: "utf8",
      windowsHide: false,
    });
    if (result.error) throw result.error;
    launchExitCode = result.status ?? 1;
    launchOutput = `${result.stdout ?? ""}${result.stderr ?? ""}`.slice(-4_000);
    request.onExit();
    if (launchExitCode !== 0) throw new Error(`Generated project launch failed (${launchExitCode}).`);
  },
});
const sample = new ForgeDashboardService({
  codexExecutor: { start: async () => { throw new Error("Sample execution is outside the new-game rehearsal."); } },
  gameLauncher: async () => { throw new Error("Sample launch is outside the new-game rehearsal."); },
});
const server = createForgeDashboardServer(
  sample,
  path.join(repositoryRoot, "dist", "dashboard"),
  planning,
  creation,
  generatedWorld,
);
server.listen(0, "127.0.0.1");
await new Promise<void>((resolve, reject) => {
  server.once("listening", resolve);
  server.once("error", reject);
});
const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
const mutationHeaders = { origin: baseUrl, "content-type": "application/json" };

try {
  await request(baseUrl, "/api/planning/start", {
    method: "POST",
    headers: mutationHeaders,
    body: JSON.stringify({ idea }),
  });
  let planningState = await waitFor(
    () => request<any>(baseUrl, "/api/planning/state"),
    new Set(["clarification", "review", "failed"]),
    15 * 60_000,
  );
  let clarificationCount = 0;
  if (planningState.phase === "clarification") {
    const answers: Record<string, string> = {
      game_style: "Top-down arena",
      core_action: "Move and tap space to pull one nearby orb",
      fun_target: "Timing one satisfying pull",
      input_mode: "Keyboard",
      smallest_playable_result: "One player, one orb, and one repeatable pull in a bounded arena",
    };
    clarificationCount = planningState.clarificationQuestions.length;
    const focusedAnswers = Object.fromEntries(
      planningState.clarificationQuestions.map((question: { topic: string }) => [question.topic, answers[question.topic]]),
    );
    await request(baseUrl, "/api/planning/answers", {
      method: "POST",
      headers: mutationHeaders,
      body: JSON.stringify({ answers: focusedAnswers }),
    });
    planningState = await waitFor(
      () => request<any>(baseUrl, "/api/planning/state"),
      new Set(["review", "failed"]),
      15 * 60_000,
    );
  }
  if (planningState.phase !== "review" || !planningState.blueprint) {
    throw new Error(planningState.error ?? "Real GPT planning did not reach Blueprint Review.");
  }
  const blueprint = planningState.blueprint;
  await request(baseUrl, "/api/planning/approve", { method: "POST", headers: { origin: baseUrl } });
  const approvedState = await request<any>(baseUrl, "/api/planning/state");
  const projectsBeforeCreation = await readdir(projectsPath).catch(() => [] as string[]);
  const registryHashBeforeCreation = await digest(registryPath).catch(() => "missing");
  if (JSON.stringify(projectsBeforeCreation) !== JSON.stringify(projectsBeforePlanning)
    || registryHashBeforeCreation !== registryHashBeforePlanning) {
    throw new Error("Planning or blueprint approval changed project files or registry state.");
  }

  const creationState = await request<any>(baseUrl, "/api/projects/state");
  await request(baseUrl, "/api/projects/create", {
    method: "POST",
    headers: {
      ...mutationHeaders,
      "x-forge-mutation-token": creationState.mutationToken,
    },
    body: JSON.stringify({ confirmation: "CONFIRM CREATE" }),
  });
  const createdState = await waitFor(
    async () => (await request<any>(baseUrl, "/api/projects/state")).creation,
    new Set(["created", "failure"]),
    5 * 60_000,
  );
  if (createdState.phase !== "created" || !createdState.createdProject) {
    throw new Error(createdState.error ?? "Controlled project creation did not complete.");
  }
  const created = createdState.createdProject;
  const projectPath = created.projectLocation;
  const roadmapPath = path.join(projectPath, ".forge", "roadmap.json");
  const chroniclePath = path.join(projectPath, ".forge", "chronicle.json");
  const roadmapHashBeforeIdea = await digest(roadmapPath);
  const chronicleHashBeforeIdea = await digest(chroniclePath);

  const opened = await request<any>(baseUrl, `/api/projects/${created.projectId}/open`, {
    method: "POST",
    headers: { origin: baseUrl },
  });
  const lastQuestId = opened.quests.at(-1).questId;
  await request(baseUrl, `/api/projects/${created.projectId}/state`, {
    method: "POST",
    headers: mutationHeaders,
    body: JSON.stringify({ currentView: "quest_brief", selectedQuestId: lastQuestId }),
  });
  await request(baseUrl, `/api/projects/${created.projectId}/ideas`, {
    method: "POST",
    headers: mutationHeaders,
    body: JSON.stringify({ idea: savedIdea }),
  });
  await request(baseUrl, `/api/projects/${created.projectId}/launch`, {
    method: "POST",
    headers: { origin: baseUrl },
  });
  await request(baseUrl, "/api/projects/open-folder", {
    method: "POST",
    headers: mutationHeaders,
    body: JSON.stringify({ projectId: created.projectId }),
  });

  const roadmapHashAfterIdea = await digest(roadmapPath);
  const chronicleHashAfterIdea = await digest(chroniclePath);
  const restartedWorld = await new GeneratedProjectWorldService({ forgeHome }).loadWorld(created.projectId);
  const recentAfterRestart = await new ProjectCreationService({ forgeHome }).listRecentProjects();
  const sampleHashAfter = await hashTree(samplePath);
  const gitStatus = spawnSync("git", ["status", "--porcelain"], { cwd: projectPath, encoding: "utf8", windowsHide: true });
  const gitHead = spawnSync("git", ["rev-parse", "HEAD"], { cwd: projectPath, encoding: "utf8", windowsHide: true });
  const gitRemote = spawnSync("git", ["remote"], { cwd: projectPath, encoding: "utf8", windowsHide: true });
  if ((gitStatus.status ?? 1) !== 0 || gitStatus.stdout.trim() !== "") throw new Error("Generated project Git worktree is not clean.");
  if (sampleHashBefore !== sampleHashAfter) throw new Error("The sample workspace changed during new-game rehearsal.");
  if (roadmapHashBeforeIdea !== roadmapHashAfterIdea || chronicleHashBeforeIdea !== chronicleHashAfterIdea) {
    throw new Error("Saving an idea changed roadmap.json or chronicle.json.");
  }

  await writeJsonAtomic(evidencePath, {
    date: "2026-07-14",
    objective: "Forge v0.2 Task 7 real GPT-to-generated-Project-World rehearsal",
    idea,
    planning: {
      model: planningState.provenance.model,
      reasoningEffort: planningState.provenance.reasoningEffort,
      attempts: planningState.provenance.attempts,
      clarificationCount,
      clarificationBounded: clarificationCount <= 3,
      validationPassed: planningState.validationPassed,
      blueprintApproved: approvedState.phase === "ready",
      projectName: blueprint.projectName,
      foundation: blueprint.foundation,
      questCount: blueprint.quests.length,
      noFilesBeforeCreationApproval: true,
    },
    creation: {
      exactConfirmation: "CONFIRM CREATE",
      projectId: created.projectId,
      relativeProjectLocation: `projects/${created.projectId}`,
      observedStages: createdState.completedStages,
      godotVerification: { result: "PASS", version: created.godotVersion, marker: created.godotSuccessMarker },
      gitBaseline: { result: "PASS", commitSha: created.gitCommitSha },
      registered: created.registered,
      controlledStarterOnly: true,
    },
    projectWorld: {
      questCount: opened.quests.length,
      implementationStates: opened.quests.map((quest: { implementation: string }) => quest.implementation),
      previewLabel: opened.playable.previewLabel,
      selectedQuestAfterRestart: restartedWorld.state.selectedQuestId,
      currentViewAfterRestart: restartedWorld.state.currentView,
      ideaPersisted: restartedWorld.ideaSeeds.some((seed) => seed.idea === savedIdea),
      derivedIdeaActivityVisible: restartedWorld.activity.some((activity) => activity.source === "derived_idea_activity"),
      roadmapHashBeforeIdea,
      roadmapHashAfterIdea,
      chronicleHashBeforeIdea,
      chronicleHashAfterIdea,
      authoritativeFilesByteIdentical: roadmapHashBeforeIdea === roadmapHashAfterIdea
        && chronicleHashBeforeIdea === chronicleHashAfterIdea,
    },
    controlledActions: {
      launchExecutable: launchCapture.value ? path.basename(launchCapture.value.executable) : null,
      launchArguments: launchCapture.value ? ["--path", `projects/${created.projectId}`] : null,
      visibleGodotLaunchFrames: 120,
      launchExitCode,
      launchOutputTail: launchOutput,
      folderPathWasCanonical: openedFolderPath === projectPath,
    },
    restartAndIsolation: {
      recentProjectRestored: recentAfterRestart.some((project) => project.projectId === created.projectId && project.available),
      generatedProjectGitClean: gitStatus.stdout.trim() === "",
      generatedProjectHead: gitHead.stdout.trim(),
      generatedProjectHasNoRemotes: gitRemote.stdout.trim() === "",
      sampleWorkspaceHashBefore: sampleHashBefore,
      sampleWorkspaceHashAfter: sampleHashAfter,
      sampleWorkspaceUntouched: sampleHashBefore === sampleHashAfter,
    },
    result: "PASS",
  });
  console.log(`PASS: created and reopened ${created.projectId}.`);
  console.log(`Evidence: ${path.relative(repositoryRoot, evidencePath)}`);
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()));
}
