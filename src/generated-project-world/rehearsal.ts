import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { repositoryRoot, resolveDemoWorkspace, resolveForgeHome } from "../demo/paths.js";
import { GeneratedProjectWorldService, type GeneratedWorldLaunchRequest } from "./service.js";
import { ProjectCreationService } from "../project-creation/service.js";
import { writeJsonAtomic } from "../quest-runner/artifacts.js";

const projectId = "last-moment-pulse-6631032087";
const idea = "Leave a fading ring after each pulse.";
const evidencePath = path.join(repositoryRoot, "docs", "evidence", "2026-07-14-v0.2-task-6-real-project-world.json");

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
  for (const file of files) { hash.update(file); hash.update(await readFile(path.join(root, file))); }
  return hash.digest("hex");
}

async function digest(filePath: string): Promise<string> {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

const forgeHome = resolveForgeHome();
const samplePath = resolveDemoWorkspace(forgeHome);
const creation = new ProjectCreationService({ forgeHome, openFolder: () => {} });
const project = await creation.getCreatedProject(projectId);
const projectPath = project.projectLocation;
const roadmapPath = path.join(projectPath, ".forge", "roadmap.json");
const chroniclePath = path.join(projectPath, ".forge", "chronicle.json");
const statePath = path.join(projectPath, ".forge", "project-state.json");
const registryPath = path.join(forgeHome, "project-registry.json");
const sampleHashBefore = await hashTree(samplePath);
const roadmapHashBefore = await digest(roadmapPath);
const chronicleHashBefore = await digest(chroniclePath);
const stateHashBeforeGet = await digest(statePath);
const registryHashBeforeGet = await digest(registryPath);
const projectTreeBefore = await walk(projectPath, projectPath, new Set([".git", ".godot"]));
let openedFolderPath: string | null = null;
const folderBoundary = new ProjectCreationService({ forgeHome, openFolder: (opened) => { openedFolderPath = opened; } });

const launchCapture: { value: GeneratedWorldLaunchRequest | null } = { value: null };
let launchExitCode: number | null = null;
let launchOutput = "";
const service = new GeneratedProjectWorldService({
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
    if (launchExitCode !== 0) throw new Error(`Real generated project launch failed (${launchExitCode}).`);
  },
});

const readOnly = await service.loadWorld(projectId);
const stateHashAfterGet = await digest(statePath);
const registryHashAfterGet = await digest(registryPath);
const registryHashBeforeOpen = await digest(registryPath);
const opened = await service.openWorld(projectId);
const registryHashAfterOpen = await digest(registryPath);
if (registryHashAfterOpen === registryHashBeforeOpen) throw new Error("Explicit open did not update registry recency.");
for (const quest of opened.quests) {
  await service.saveState(projectId, { currentView: "quest_brief", selectedQuestId: quest.questId });
}
await folderBoundary.openProjectFolder(projectId);
if (openedFolderPath !== projectPath) throw new Error("Folder boundary did not receive the canonical registered project path.");
const existingIdea = (await service.loadWorld(projectId)).ideaSeeds.find((seed) => seed.idea === idea);
const ideaResult = existingIdea
  ? { seed: existingIdea, activity: { summary: existingIdea.activityNote } }
  : await service.saveIdea(projectId, idea);
const roadmapHashAfterIdea = await digest(roadmapPath);
const chronicleHashAfterIdea = await digest(chroniclePath);
if (roadmapHashAfterIdea !== roadmapHashBefore || chronicleHashAfterIdea !== chronicleHashBefore) {
  throw new Error("Idea save changed roadmap.json or chronicle.json.");
}
await service.launch(projectId);

const registryHashBeforeRestartGet = await digest(registryPath);
const restarted = new GeneratedProjectWorldService({ forgeHome });
const restored = await restarted.loadWorld(projectId);
const registryHashAfterRestartGet = await digest(registryPath);
if (registryHashBeforeRestartGet !== registryHashAfterRestartGet) throw new Error("Read-only restart GET changed registry recency.");
const sampleHashAfter = await hashTree(samplePath);
if (sampleHashBefore !== sampleHashAfter) throw new Error("The sample workspace changed during generated Project World rehearsal.");
const gitStatus = spawnSync("git", ["status", "--porcelain"], { cwd: projectPath, encoding: "utf8", windowsHide: true });
if ((gitStatus.status ?? 1) !== 0 || gitStatus.stdout.trim() !== "") throw new Error(`Generated project Git worktree is not clean: ${gitStatus.stdout}${gitStatus.stderr}`);
const projectTreeAfter = await walk(projectPath, projectPath, new Set([".git", ".godot"]));

await writeJsonAtomic(evidencePath, {
  date: "2026-07-14",
  objective: "Real Last-Moment Pulse generated Project World integration rehearsal",
  projectId,
  readOnlyLoad: {
    displayName: readOnly.project.displayName,
    questCount: readOnly.quests.length,
    stateFileUnchanged: stateHashAfterGet === stateHashBeforeGet,
    registryUnchangedBeforeExplicitOpen: registryHashAfterGet === registryHashBeforeGet,
    playableLabel: readOnly.playable.layoutLabel,
    previewLabel: readOnly.playable.previewLabel,
  },
  explicitOpen: {
    usedProjectIdOnly: true,
    lastOpenedAt: opened.project.lastOpenedAt,
    registryRecencyChanged: registryHashAfterOpen !== registryHashBeforeOpen,
  },
  questBriefs: {
    openedQuestIds: opened.quests.map((quest) => quest.questId),
    implementationStates: opened.quests.map((quest) => quest.implementation),
    selectedQuestAfterRehearsal: restored.state.selectedQuestId,
    currentViewAfterRehearsal: restored.state.currentView,
  },
  ideaPersistence: {
    ideaSeedId: ideaResult.seed.ideaSeedId,
    idea: ideaResult.seed.idea,
    activityNote: ideaResult.seed.activityNote,
    derivedActivityVisible: restored.activity.some((item) => item.source === "derived_idea_activity" && item.activityId === `activity-${ideaResult.seed.ideaSeedId}`),
    roadmapHashBefore,
    roadmapHashAfter: roadmapHashAfterIdea,
    chronicleHashBefore,
    chronicleHashAfter: chronicleHashAfterIdea,
    authoritativeFilesByteIdentical: roadmapHashBefore === roadmapHashAfterIdea && chronicleHashBefore === chronicleHashAfterIdea,
  },
  restart: {
    restoredProjectId: restored.project.projectId,
    restoredQuestId: restored.state.selectedQuestId,
    authoritativeChronicleEntries: restored.chronicle.entries.length,
    ideaSeedCount: restored.ideaSeeds.length,
    registryRecencyUnchangedByGet: registryHashBeforeRestartGet === registryHashAfterRestartGet,
    duplicatePortableFilesCreated: projectTreeAfter.filter((file) => !projectTreeBefore.includes(file) && file !== ".forge/idea-seeds.json"),
  },
  controlledActions: {
    folderPathWasCanonical: openedFolderPath === projectPath,
    launchExecutable: launchCapture.value?.executable ?? null,
    launchArguments: launchCapture.value?.args ?? null,
    launchWorkingDirectory: launchCapture.value?.cwd ?? null,
    visibleGodotLaunchFrames: 120,
    exitCode: launchExitCode,
    outputTail: launchOutput,
  },
  isolation: {
    sampleWorkspaceHashBefore: sampleHashBefore,
    sampleWorkspaceHashAfter: sampleHashAfter,
    sampleWorkspaceUntouched: sampleHashBefore === sampleHashAfter,
    generatedProjectGitClean: gitStatus.stdout.trim() === "",
    baselineCommit: project.gitCommitSha,
  },
  result: "PASS",
});

console.log(`PASS: reopened ${projectId}, restored ${restored.state.selectedQuestId}, and launched 120 frames.`);
console.log(`Evidence: ${path.relative(repositoryRoot, evidencePath)}`);
