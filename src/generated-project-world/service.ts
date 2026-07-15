import { createHash, randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { lstat, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import {
  chronicleAnySchema,
  acceptedRoadmapProvenanceSchema,
  acceptedSystemRoadmapSchema,
  chronicleV2Schema,
  creationProvenanceSchema,
  firstPlayableMilestoneSchema,
  gameBlueprintSchema,
  gameVisionSchema,
  generatedProjectManifestSchema,
  generatedProjectStateAnySchema,
  generatedProjectStateV2Schema,
  generatedQuestArtifactAnySchema,
  gitBaselineResultSchema,
  godotVerificationResultSchema,
  ideaSeedSchema,
  ideaSeedsSchema,
  planningProvenanceSchema,
  generatedRoadmapV2Schema,
  roadmapSchema,
  topDownArenaStarterManifestSchema,
  type GeneratedProjectStateAny,
  type GeneratedQuestArtifactV2,
  type IdeaSeed,
  type AcceptedSystemRoadmap,
} from "../contracts/index.js";
import { resolveForgeHome } from "../demo/paths.js";
import { ensurePinnedGodot } from "../godot/bootstrap.js";
import { ProjectRegistryStore } from "../project-creation/registry.js";
import { writeJsonAtomic, writeTextAtomic } from "../quest-runner/artifacts.js";
import { normalizeGeneratedQuest, normalizeGeneratedRoadmap } from "../generated-quest-runner/contract.js";
import { GeneratedQuestRunnerService } from "../generated-quest-runner/service.js";
import type {
  GeneratedActivity,
  GeneratedIdeaSaveResponse,
  GeneratedLaunchResponse,
  GeneratedProjectWorldSnapshot,
  GeneratedQuestBrief,
  GeneratedWorldStateInput,
  GeneratedWorldView,
} from "./shared.js";
import { applyAcceptedSystemRoadmap, buildLegacyProjectModel } from "./project-model.js";

const ideaRelativePath = ".forge/idea-seeds.json";
const systemRoadmapRelativePath = ".forge/system-roadmap.json";
const generatedViews = new Set<GeneratedWorldView>(["project_world", "quest_brief", "chronicle", "documents"]);

export class GeneratedProjectWorldNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeneratedProjectWorldNotFoundError";
  }
}

export class GeneratedProjectWorldConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeneratedProjectWorldConflictError";
  }
}

export interface GeneratedWorldLaunchRequest {
  executable: string;
  args: string[];
  cwd: string;
  onExit: () => void;
}

export type GeneratedWorldLauncher = (request: GeneratedWorldLaunchRequest) => void;

export interface GeneratedProjectWorldServiceOptions {
  forgeHome?: string;
  now?: () => Date;
  randomId?: () => string;
  registry?: ProjectRegistryStore;
  resolveGodot?: typeof ensurePinnedGodot;
  launchGodot?: GeneratedWorldLauncher;
  generatedRunner?: Pick<GeneratedQuestRunnerService, "getSummary" | "listProjectSessions">;
}

function defaultLauncher(request: GeneratedWorldLaunchRequest): void {
  const child = spawn(request.executable, request.args, {
    cwd: request.cwd,
    detached: true,
    stdio: "ignore",
    windowsHide: false,
  });
  child.once("exit", request.onExit);
  child.once("error", request.onExit);
  child.unref();
}

function isContained(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function sameList(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function worldView(value: GeneratedProjectStateAny["currentView"]): GeneratedWorldView {
  return value === "project_created" ? "project_world" : value;
}

function questWhyItMatters(quest: GeneratedQuestArtifactV2, milestone: string): string {
  if (quest.sequence === 1) return `This establishes the first dependable foundation for ${milestone}`;
  const dependency = quest.dependsOn.length === 1
    ? "the planned step before it"
    : `${quest.dependsOn.length} earlier planned steps`;
  return `This builds on ${dependency} and moves the project toward ${milestone}`;
}

function activityFromSeed(seed: IdeaSeed): Extract<GeneratedActivity, { source: "derived_idea_activity" }> {
  return {
    activityId: `activity-${seed.ideaSeedId}`,
    occurredAt: seed.createdAt,
    summary: seed.activityNote,
    source: "derived_idea_activity",
    label: "Idea activity · derived from saved seed",
    ideaSeedId: seed.ideaSeedId,
  };
}

async function readValidated<T>(filePath: string, schema: z.ZodType<T>): Promise<T> {
  return schema.parse(JSON.parse(await readFile(filePath, "utf8")) as unknown);
}

export class GeneratedProjectWorldService {
  private readonly forgeHome: string;
  private readonly now: () => Date;
  private readonly randomId: () => string;
  private readonly registry: ProjectRegistryStore;
  private readonly resolveGodot: typeof ensurePinnedGodot;
  private readonly launchGodotProcess: GeneratedWorldLauncher;
  private readonly generatedRunner: Pick<GeneratedQuestRunnerService, "getSummary" | "listProjectSessions"> | undefined;
  private readonly sessionReader: Pick<GeneratedQuestRunnerService, "listProjectSessions">;
  private readonly launching = new Set<string>();
  private readonly ideaQueues = new Map<string, Promise<unknown>>();

  constructor(options: GeneratedProjectWorldServiceOptions = {}) {
    this.forgeHome = path.resolve(options.forgeHome ?? resolveForgeHome());
    this.now = options.now ?? (() => new Date());
    this.randomId = options.randomId ?? randomUUID;
    this.registry = options.registry ?? new ProjectRegistryStore(this.forgeHome, this.now);
    this.resolveGodot = options.resolveGodot ?? ensurePinnedGodot;
    this.launchGodotProcess = options.launchGodot ?? defaultLauncher;
    this.generatedRunner = options.generatedRunner;
    this.sessionReader = options.generatedRunner ?? new GeneratedQuestRunnerService({ forgeHome: this.forgeHome, registry: this.registry });
  }

  private async resolveProject(projectId: string): Promise<{ projectPath: string; entry: Awaited<ReturnType<ProjectRegistryStore["resolveRegisteredProject"]>> }> {
    try {
      const entry = await this.registry.resolveRegisteredProject(projectId);
      return { projectPath: entry.canonicalPath, entry };
    } catch (error) {
      throw new GeneratedProjectWorldNotFoundError(error instanceof Error ? error.message : String(error));
    }
  }

  private async ownedPath(projectPath: string, relativePath: string, kind: "file" | "directory" = "file"): Promise<string> {
    const candidate = path.resolve(projectPath, relativePath);
    if (!isContained(projectPath, candidate) || candidate === projectPath) {
      throw new GeneratedProjectWorldConflictError(`Project artifact escaped its registered project: ${relativePath}`);
    }
    const info = await lstat(candidate).catch(() => null);
    if (!info || info.isSymbolicLink() || (kind === "file" ? !info.isFile() : !info.isDirectory())) {
      throw new GeneratedProjectWorldConflictError(`Project artifact is missing or unsafe: ${relativePath}`);
    }
    const canonical = await realpath(candidate).catch(() => null);
    if (!canonical || canonical !== candidate || !isContained(projectPath, canonical)) {
      throw new GeneratedProjectWorldConflictError(`Project artifact moved outside its owner: ${relativePath}`);
    }
    return canonical;
  }

  private async optionalIdeaSeeds(projectPath: string, projectId: string): Promise<IdeaSeed[]> {
    const target = path.join(projectPath, ideaRelativePath);
    const info = await lstat(target).catch(() => null);
    if (!info) return [];
    const canonical = await this.ownedPath(projectPath, ideaRelativePath);
    const artifact = await readValidated(canonical, ideaSeedsSchema);
    if (artifact.projectId !== projectId) throw new Error("Idea seeds belong to another project.");
    return artifact.seeds;
  }

  private async optionalSystemRoadmap(projectPath: string, projectId: string): Promise<AcceptedSystemRoadmap | null> {
    const target = path.join(projectPath, systemRoadmapRelativePath);
    const info = await lstat(target).catch(() => null);
    if (!info) return null;
    const artifact = await readValidated(await this.ownedPath(projectPath, systemRoadmapRelativePath), acceptedSystemRoadmapSchema);
    if (artifact.projectId !== projectId) throw new Error("The system roadmap belongs to another project.");
    return artifact;
  }

  async loadWorld(projectId: string): Promise<GeneratedProjectWorldSnapshot> {
    try {
      const { projectPath, entry } = await this.resolveProject(projectId);
      const manifest = await readValidated(
        await this.ownedPath(projectPath, ".forge/project-manifest.json"),
        generatedProjectManifestSchema,
      );
      if (manifest.projectId !== projectId || manifest.displayName !== entry.displayName || manifest.foundation !== entry.foundation) {
        throw new Error("Registry and project manifest identity do not match.");
      }
      const starter = await readValidated(await this.ownedPath(projectPath, manifest.starter.manifest), topDownArenaStarterManifestSchema);
      if (starter.version !== manifest.starter.version) throw new Error("Starter manifest version does not match the project manifest.");
      const approvedBlueprint = await readValidated(await this.ownedPath(projectPath, manifest.artifacts.approvedBlueprint), gameBlueprintSchema);
      const acceptedRoadmapProvenance = manifest.artifacts.acceptedRoadmap
        ? await readValidated(await this.ownedPath(projectPath, manifest.artifacts.acceptedRoadmap), acceptedRoadmapProvenanceSchema)
        : null;
      const vision = await readValidated(await this.ownedPath(projectPath, manifest.artifacts.vision), gameVisionSchema);
      const firstPlayable = await readValidated(await this.ownedPath(projectPath, manifest.artifacts.firstPlayable), firstPlayableMilestoneSchema);
      const roadmap = normalizeGeneratedRoadmap(await readValidated(
        await this.ownedPath(projectPath, manifest.artifacts.roadmap),
        z.union([generatedRoadmapV2Schema, roadmapSchema]),
      ));
      const state = await readValidated(
        await this.ownedPath(projectPath, manifest.artifacts.projectState),
        generatedProjectStateAnySchema,
      );
      const chronicleAny = await readValidated(
        await this.ownedPath(projectPath, manifest.artifacts.chronicle),
        chronicleAnySchema,
      );
      const chronicle = chronicleAny.schemaVersion === 2
        ? chronicleV2Schema.parse(chronicleAny)
        : chronicleV2Schema.parse({ ...chronicleAny, schemaVersion: 2 });
      const godot = await readValidated(await this.ownedPath(projectPath, manifest.artifacts.localGodotVerification), godotVerificationResultSchema);
      const planning = await readValidated(await this.ownedPath(projectPath, manifest.artifacts.planningProvenance), planningProvenanceSchema);
      const creation = await readValidated(await this.ownedPath(projectPath, manifest.artifacts.localCreationProvenance), creationProvenanceSchema);
      const git = await readValidated(await this.ownedPath(projectPath, manifest.artifacts.localGitBaseline), gitBaselineResultSchema);
      const questDirectory = await this.ownedPath(projectPath, manifest.artifacts.questsDirectory, "directory");
      const quests: GeneratedQuestArtifactV2[] = [];
      for (const roadmapQuest of roadmap.quests) {
        const questPath = await this.ownedPath(projectPath, path.join(path.relative(projectPath, questDirectory), `${roadmapQuest.questId}.json`));
        quests.push(normalizeGeneratedQuest(
          await readValidated(questPath, generatedQuestArtifactAnySchema),
          roadmapQuest.state,
        ));
      }

      const owned = [vision, firstPlayable, roadmap, state, chronicle, godot, planning, creation, git, ...quests];
      if (owned.some((artifact) => artifact.projectId !== projectId)) throw new Error("One or more Project World artifacts belong to another project.");
      if (approvedBlueprint.projectName !== manifest.displayName || approvedBlueprint.foundation !== manifest.foundation) throw new Error("Approved blueprint identity does not match the project manifest.");
      if (acceptedRoadmapProvenance && (acceptedRoadmapProvenance.projectId !== projectId || acceptedRoadmapProvenance.acceptedRoadmap.fingerprint !== creation.acceptedRoadmapSha256 || !acceptedRoadmapProvenance.acceptedRoadmap.acceptedAt)) throw new Error("Accepted-roadmap provenance does not match creation authority.");
      if (creation.starterVersion !== starter.version || creation.godotSuccessMarker !== godot.successMarker || creation.gitCommitSha !== git.commitSha) throw new Error("Creation evidence does not match the verified starter and Git baseline.");
      const roadmapIds = roadmap.quests.map((quest) => quest.questId);
      if (!sameList(firstPlayable.questIds, roadmapIds)) throw new Error("First Playable quest order does not match the roadmap.");
      if (quests.length !== roadmap.quests.length) throw new Error("The roadmap and quest artifact count do not match.");
      quests.forEach((quest, index) => {
        const node = roadmap.quests[index];
        if (!node || quest.questId !== node.questId || quest.revision !== node.revision || quest.sequence !== index + 1 || quest.title !== node.title || !sameList(quest.dependsOn, node.dependsOn)) {
          throw new Error(`Quest ${quest.questId} does not match its roadmap node.`);
        }
        for (const dependency of quest.dependsOn) {
          const dependencyIndex = roadmapIds.indexOf(dependency);
          if (dependencyIndex < 0 || dependencyIndex >= index) throw new Error(`Quest ${quest.questId} has an invalid dependency.`);
        }
      });

      const sessions = await this.sessionReader.listProjectSessions(projectId);
      const legacyProjectModel = buildLegacyProjectModel({
        manifest,
        vision,
        firstPlayable,
        roadmap,
        quests,
        state,
        chronicle,
        sessions,
      });
      const acceptedSystemRoadmap = await this.optionalSystemRoadmap(projectPath, projectId);
      const projectModel = acceptedSystemRoadmap
        ? applyAcceptedSystemRoadmap(legacyProjectModel, acceptedSystemRoadmap)
        : legacyProjectModel;

      const ideaSeeds = await this.optionalIdeaSeeds(projectPath, projectId);
      const selectedIsValid = state.selectedQuestId !== null && roadmapIds.includes(state.selectedQuestId);
      const selectedQuestId = selectedIsValid ? state.selectedQuestId! : roadmapIds[0]!;
      const repairNotice = selectedIsValid ? null : "The saved quest selection was unavailable. Forge focused the first roadmap quest in memory; choose a quest to persist the repair.";
      const questBriefs: GeneratedQuestBrief[] = await Promise.all(quests.map(async (quest) => {
        const summary = this.generatedRunner
          ? await this.generatedRunner.getSummary(projectId, quest.questId)
          : {
              eligibility: {
                eligible: false,
                reason: "Generated quest implementation is unavailable in this service composition.",
                revision: quest.revision,
                state: quest.state,
              },
              run: null,
            };
        const implementationLabel = quest.implementation !== "not_enabled"
          ? `Quest completed · run ${quest.implementation.runId}`
          : summary.run
            ? `Forge run · ${summary.run.phase.replaceAll("_", " ")}`
            : summary.eligibility.eligible
              ? "Ready for bounded Forge implementation"
              : `Forge recommendation · ${summary.eligibility.reason}`;
        return {
          ...quest,
          outcomeLabel: "Generated intended outcome",
          whyItMatters: quest.whyItMatters || questWhyItMatters(quest, firstPlayable.outcome),
          implementationLabel,
          eligibility: summary.eligibility,
          run: summary.run,
        };
      }));
      const authoritativeActivity: GeneratedActivity[] = chronicle.entries.map((item) => ({
        activityId: item.entryId,
        occurredAt: item.occurredAt,
        summary: item.summary,
        source: "authoritative_chronicle",
        label: "Chronicle event",
      }));
      const activity = [...authoritativeActivity, ...ideaSeeds.map(activityFromSeed)]
        .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));

      const documentCandidates: Array<readonly [string, string, string]> = [
        ["Project overview", "PROJECT.md", "Deterministic project record"],
        ["Game vision", ".forge/docs/game-vision.md", "game-vision.json"],
        ["First playable", ".forge/docs/first-playable.md", "first-playable.json"],
        ["Roadmap", ".forge/docs/roadmap.md", "roadmap.json"],
        ["Chronicle", ".forge/docs/chronicle.md", "chronicle.json"],
        ...quests.map((quest) => [`Quest · ${quest.title}`, `.forge/docs/quests/${quest.questId}.md`, `quests/${quest.questId}.json`] as const),
      ];
      for (const [, relative] of documentCandidates) await this.ownedPath(projectPath, relative);

      return {
        project: {
          projectId,
          displayName: manifest.displayName,
          foundation: manifest.foundation,
          foundationLabel: "Top-down Arena",
          engineLabel: `Godot ${manifest.engine.version} · ${manifest.engine.dimension} · ${manifest.engine.language}`,
          starterVersion: manifest.starter.version,
          createdAt: manifest.createdAt,
          lastOpenedAt: entry.lastOpenedAt,
        },
        projectModel,
        vision,
        starterAwarePlanning: {
          accepted: acceptedRoadmapProvenance !== null,
          acceptedRoadmapFingerprint: acceptedRoadmapProvenance?.acceptedRoadmap.fingerprint ?? null,
          alreadyPlayable: acceptedRoadmapProvenance?.acceptedRoadmap.alreadyPlayable.map((fact) => fact.statement) ?? [],
        },
        playable: {
          previewLabel: "Playable-state preview",
          layoutLabel: "Verified starter layout",
          summary: "The verified starter loads a bounded arena with a keyboard-controlled player and an objective relay.",
          facts: acceptedRoadmapProvenance?.acceptedRoadmap.alreadyPlayable.map((fact) => fact.statement) ?? [
            "Godot loaded the code-native project and main scene.",
            "The bounded arena, player, camera, and objective marker are present.",
            "WASD and arrow-key movement passed the starter smoke check.",
            "Required GDScript files loaded without external resources.",
          ],
          plannedNotPlayable: acceptedRoadmapProvenance
            ? acceptedRoadmapProvenance.acceptedRoadmap.quests.slice(1).map((quest) => `${quest.title}: ${quest.visibleOutcome}`)
            : ["Enemy approach remains planned.", "The Space-key push pulse remains planned."],
          godotVersion: godot.godotVersion,
          verifiedAt: godot.verifiedAt,
          successMarker: godot.successMarker,
        },
        firstPlayable,
        roadmap,
        quests: questBriefs,
        state: {
          currentView: worldView(state.currentView),
          selectedQuestId,
          nextRecommendedQuestId: projectModel.focus.nextRecommendedQuestId,
          repairNotice,
        },
        chronicle,
        ideaSeeds,
        activity,
        documents: documentCandidates.map(([label, relativePath, owner]) => ({ label, relativePath, owner })),
        actions: { launchGodot: true, openFolder: true, saveIdea: true, generatedQuestImplementation: this.generatedRunner !== undefined },
      };
    } catch (error) {
      if (error instanceof GeneratedProjectWorldNotFoundError || error instanceof GeneratedProjectWorldConflictError) throw error;
      throw new GeneratedProjectWorldConflictError(error instanceof Error ? error.message : String(error));
    }
  }

  async openWorld(projectId: string): Promise<GeneratedProjectWorldSnapshot> {
    const snapshot = await this.loadWorld(projectId);
    const opened = await this.registry.markOpened(projectId);
    return { ...snapshot, project: { ...snapshot.project, lastOpenedAt: opened.lastOpenedAt } };
  }

  async saveSystemRoadmap(projectId: string, roadmapValue: AcceptedSystemRoadmap): Promise<void> {
    const roadmap = acceptedSystemRoadmapSchema.parse(roadmapValue);
    if (roadmap.projectId !== projectId) throw new GeneratedProjectWorldConflictError("The system roadmap belongs to another project.");
    const current = await this.loadWorld(projectId);
    const unresolvedWork = current.projectModel.workSessions.some((session) =>
      ["contract_review", "approved", "implementing", "scope_review", "verifying", "waiting_for_playtest", "completion_pending", "failed", "interrupted"].includes(session.phase)
      || (session.phase === "cancelled" && (session.recovery.action === "rollback" || session.recovery.action === "manual")));
    if (unresolvedWork) {
      throw new GeneratedProjectWorldConflictError("Finish or safely close the active work session before saving systems.");
    }
    const structure = {
      projectId: current.projectModel.project.projectId,
      systems: current.projectModel.systems.map((system) => ({ systemId: system.systemId, questIds: system.questIds })),
    };
    const currentFingerprint = createHash("sha256").update(JSON.stringify(structure), "utf8").digest("hex");
    if (roadmap.sourceFingerprint !== currentFingerprint) {
      throw new GeneratedProjectWorldConflictError("The project plan changed before the system roadmap could be saved.");
    }
    const currentById = new Map(current.projectModel.systems.map((system) => [system.systemId, system.questIds]));
    for (const [systemId, questIds] of currentById) {
      const accepted = roadmap.systems.find((system) => system.systemId === systemId);
      if (!accepted || !sameList(accepted.questIds, questIds)) {
        throw new GeneratedProjectWorldConflictError("The system roadmap must preserve every existing system and its quests.");
      }
    }
    const currentPopulatedOrder = current.projectModel.systems.filter((system) => system.questIds.length > 0).map((system) => system.systemId);
    const acceptedPopulatedOrder = roadmap.systems.filter((system) => system.questIds.length > 0).map((system) => system.systemId);
    if (!sameList(currentPopulatedOrder, acceptedPopulatedOrder)) {
      throw new GeneratedProjectWorldConflictError("The system roadmap must preserve the order of existing quest groups.");
    }
    const currentQuestIds = current.projectModel.quests.map((quest) => quest.questId);
    const acceptedQuestIds = roadmap.systems.flatMap((system) => system.questIds);
    if (currentQuestIds.length !== acceptedQuestIds.length || currentQuestIds.some((questId) => !acceptedQuestIds.includes(questId)) || new Set(acceptedQuestIds).size !== acceptedQuestIds.length) {
      throw new GeneratedProjectWorldConflictError("The system roadmap must preserve every quest exactly once.");
    }
    const { projectPath } = await this.resolveProject(projectId);
    const forgeDirectory = await this.ownedPath(projectPath, ".forge", "directory");
    const target = path.join(forgeDirectory, "system-roadmap.json");
    const info = await lstat(target).catch(() => null);
    if (info && (info.isSymbolicLink() || !info.isFile())) {
      throw new GeneratedProjectWorldConflictError("The system roadmap target is unsafe.");
    }
    if (info) await this.ownedPath(projectPath, systemRoadmapRelativePath);
    await writeJsonAtomic(target, roadmap);
  }

  async saveState(projectId: string, input: GeneratedWorldStateInput): Promise<GeneratedProjectWorldSnapshot> {
    if (!generatedViews.has(input.currentView)) throw new GeneratedProjectWorldConflictError("A valid generated Project World view is required.");
    const snapshot = await this.loadWorld(projectId);
    if (!snapshot.roadmap.quests.some((quest) => quest.questId === input.selectedQuestId)) {
      throw new GeneratedProjectWorldConflictError("The selected quest does not belong to this roadmap.");
    }
    const { projectPath } = await this.resolveProject(projectId);
    const manifest = await readValidated(await this.ownedPath(projectPath, ".forge/project-manifest.json"), generatedProjectManifestSchema);
    const statePath = await this.ownedPath(projectPath, manifest.artifacts.projectState);
    const previous = await readValidated(statePath, generatedProjectStateAnySchema);
    const gitDirectory = await stat(path.join(projectPath, ".git")).catch(() => null);
    if (gitDirectory?.isDirectory()) {
      const relativeStatePath = path.relative(projectPath, statePath).replaceAll("\\", "/");
      const result = spawnSync("git", ["update-index", "--skip-worktree", "--", relativeStatePath], {
        cwd: projectPath,
        encoding: "utf8",
        windowsHide: true,
      });
      if ((result.status ?? 1) !== 0) {
        throw new GeneratedProjectWorldConflictError(`Forge could not protect mutable project state in the local Git baseline: ${result.stderr.trim()}`);
      }
    }
    const nextState = {
      ...previous,
      currentView: input.currentView,
      selectedQuestId: input.selectedQuestId,
    };
    await writeJsonAtomic(statePath, previous.schemaVersion === 2
      ? generatedProjectStateV2Schema.parse(nextState)
      : generatedProjectStateAnySchema.parse(nextState));
    return this.loadWorld(projectId);
  }

  private async ensureIdeaSeedsIgnored(projectPath: string): Promise<void> {
    const gitDirectory = path.join(projectPath, ".git");
    const gitStats = await stat(gitDirectory).catch(() => null);
    if (!gitStats?.isDirectory()) return;
    const excludePath = path.join(gitDirectory, "info", "exclude");
    const contents = await readFile(excludePath, "utf8").catch(() => "");
    if (contents.split(/\r?\n/u).includes(ideaRelativePath)) return;
    const separator = contents.length === 0 || contents.endsWith("\n") ? "" : "\n";
    await writeTextAtomic(excludePath, `${contents}${separator}${ideaRelativePath}\n`);
  }

  async saveIdea(projectId: string, ideaValue: string): Promise<GeneratedIdeaSaveResponse> {
    const operation = (this.ideaQueues.get(projectId) ?? Promise.resolve()).then(async () => {
      const idea = ideaValue.trim();
      if (/[^\t\n\r\x20-\uFFFF]/u.test(idea)) throw new GeneratedProjectWorldConflictError("The idea contains unsupported control characters.");
      ideaSeedSchema.shape.idea.parse(idea);
      await this.loadWorld(projectId);
      const { projectPath } = await this.resolveProject(projectId);
      const currentSeeds = await this.optionalIdeaSeeds(projectPath, projectId);
      const compactIdea = idea.replace(/\s+/gu, " ");
      const createdAt = this.now().toISOString();
      const suffix = this.randomId().toLowerCase().replace(/[^a-f0-9]/gu, "").slice(0, 12);
      if (suffix.length < 8) throw new GeneratedProjectWorldConflictError("Forge could not allocate an idea seed identifier.");
      const seed = ideaSeedSchema.parse({
        ideaSeedId: `idea-${suffix}`,
        idea,
        createdAt,
        activityNote: `Idea saved for future planning: ${compactIdea.slice(0, 180)}`,
      });
      const artifact = ideaSeedsSchema.parse({ schemaVersion: 1, projectId, seeds: [...currentSeeds, seed] });
      await this.ensureIdeaSeedsIgnored(projectPath);
      await writeJsonAtomic(path.join(projectPath, ideaRelativePath), artifact);
      return { seed, activity: activityFromSeed(seed) };
    });
    this.ideaQueues.set(projectId, operation);
    try {
      return await operation;
    } finally {
      if (this.ideaQueues.get(projectId) === operation) this.ideaQueues.delete(projectId);
    }
  }

  async launch(projectId: string): Promise<GeneratedLaunchResponse> {
    if (this.launching.has(projectId)) throw new GeneratedProjectWorldConflictError("Godot is already launching for this project.");
    await this.loadWorld(projectId);
    const { projectPath } = await this.resolveProject(projectId);
    const godot = await this.resolveGodot({ forgeHome: this.forgeHome });
    this.launching.add(projectId);
    try {
      this.launchGodotProcess({
        executable: godot.executable,
        args: ["--path", projectPath],
        cwd: projectPath,
        onExit: () => this.launching.delete(projectId),
      });
    } catch (error) {
      this.launching.delete(projectId);
      throw new GeneratedProjectWorldConflictError(error instanceof Error ? error.message : String(error));
    }
    return { launched: true, message: "Godot opened the verified starter project." };
  }
}
