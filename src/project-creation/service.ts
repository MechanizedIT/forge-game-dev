import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { lstat, mkdir, readFile, realpath, rename, stat } from "node:fs/promises";
import path from "node:path";

import {
  creationFailureRecordSchema,
  creationProvenanceSchema,
  gameBlueprintSchema,
  gitBaselineResultSchema,
  godotVerificationResultSchema,
  roadmapSchema,
  generatedRoadmapV2Schema,
  type CreationProvenance,
  type GitBaselineResult,
  type GodotVerificationResult,
} from "../contracts/index.js";
import { resolveForgeHome } from "../demo/paths.js";
import { writeJsonAtomic } from "../quest-runner/artifacts.js";
import { fingerprintBlueprint } from "../blueprint-planner/service.js";
import { validateAcceptedRoadmap } from "../blueprint-planner/starter-catalog.js";
import {
  assertNoAbsolutePathsInPortableArtifacts,
  expectedBaselineFiles,
  writeGeneratedProjectArtifacts,
} from "./artifacts.js";
import {
  assertDirectChild,
  idSuffix,
  prepareProjectRoots,
  safeRemoveOwnedDirectory,
  sanitizeProjectSlug,
  type ProjectRoots,
} from "./filesystem.js";
import {
  createGitBaselineCreator,
  requireCleanGeneratedProjectGit,
  type GitBaselineCreator,
} from "./git-baseline.js";
import {
  createOpenGodotVerifier,
  createTopDownArenaVerifier,
  type OpenGodotVerifier,
  type TopDownArenaVerifier,
} from "./godot-verifier.js";
import { ProjectRegistryStore } from "./registry.js";
import {
  assembleOpenGodotFoundation,
  assembleControlledStarter,
  assertStarterInventory,
  openGodotFoundationPath,
  topDownArenaStarterPath,
} from "./starter.js";
import {
  projectCreationStages,
  type ApprovedBlueprintEnvelope,
  type CreatedProjectSummary,
  type ProjectCreationEvent,
  type ProjectCreationSnapshot,
  type ProjectCreationStage,
  type RecentProjectSummary,
} from "./shared.js";

type Subscriber = (event: ProjectCreationEvent) => void;

const stageExplanations: Record<ProjectCreationStage, string> = {
  "Validating the blueprint": "Forge is rechecking the approved blueprint and confirming that it has not changed.",
  "Preparing the workspace": "Forge is allocating a collision-safe project identifier inside its local workspace.",
  "Assembling the starter": "Forge is copying the controlled Top-down Arena starter and applying Forge-owned metadata.",
  "Writing project records": "Forge is saving and reloading the blueprint, roadmap, quests, documentation, state, and Chronicle.",
  "Checking the Godot project": "Godot 4.7 is loading the main scene and exercising the fixed starter smoke check.",
  "Creating the baseline": "Forge is creating one local Git baseline and proving that the worktree is clean.",
  "Registering the project": "Forge is promoting the verified project and adding it to recent projects for restart discovery.",
};

function blankSnapshot(): ProjectCreationSnapshot {
  return {
    phase: "idle",
    stage: null,
    completedStages: [],
    startedAt: null,
    displayName: null,
    foundation: null,
    projectId: null,
    relativeProjectIdentifier: null,
    questCount: null,
    explanation: null,
    createdProject: null,
    error: null,
    failureEvidence: null,
  };
}

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function exists(target: string): Promise<boolean> {
  return lstat(target).then(() => true).catch(() => false);
}

export class ProjectCreationConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectCreationConflictError";
  }
}

export class ProjectCreationCancelledError extends Error {
  constructor() {
    super("Project creation was cancelled before promotion.");
    this.name = "ProjectCreationCancelledError";
  }
}

export interface ProjectCreationServiceOptions {
  forgeHome?: string;
  starterPath?: string;
  openFoundationPath?: string;
  now?: () => Date;
  randomId?: () => string;
  verifyGodot?: TopDownArenaVerifier;
  verifyOpenGodot?: OpenGodotVerifier;
  createGitBaseline?: GitBaselineCreator;
  openFolder?: (projectPath: string) => void;
  requireCleanGit?: (projectPath: string) => void;
  allowLegacyPlanningEnvelopes?: boolean;
}

export class ProjectCreationService {
  private snapshot = blankSnapshot();
  private readonly subscribers = new Set<Subscriber>();
  private activeCreation: Promise<void> | null = null;
  private cancellationRequested = false;
  private readonly forgeHome: string;
  private readonly starterPath: string;
  private readonly openFoundationPath: string;
  private readonly now: () => Date;
  private readonly randomId: () => string;
  private readonly verifyGodot: TopDownArenaVerifier;
  private readonly verifyOpenGodot: OpenGodotVerifier;
  private readonly createGitBaseline: GitBaselineCreator;
  private readonly registry: ProjectRegistryStore;
  private readonly openFolder: (projectPath: string) => void;
  private readonly requireCleanGit: (projectPath: string) => void;
  private readonly allowLegacyPlanningEnvelopes: boolean;

  constructor(options: ProjectCreationServiceOptions = {}) {
    this.forgeHome = path.resolve(options.forgeHome ?? resolveForgeHome());
    this.starterPath = path.resolve(options.starterPath ?? topDownArenaStarterPath);
    this.openFoundationPath = path.resolve(options.openFoundationPath ?? openGodotFoundationPath);
    this.now = options.now ?? (() => new Date());
    this.randomId = options.randomId ?? randomUUID;
    this.verifyGodot = options.verifyGodot ?? createTopDownArenaVerifier();
    this.verifyOpenGodot = options.verifyOpenGodot ?? createOpenGodotVerifier();
    this.createGitBaseline = options.createGitBaseline ?? createGitBaselineCreator();
    this.openFolder = options.openFolder ?? ((projectPath) => {
      const command = process.platform === "win32"
        ? { executable: "explorer.exe", args: [projectPath] }
        : process.platform === "darwin"
          ? { executable: "open", args: [projectPath] }
          : { executable: "xdg-open", args: [projectPath] };
      const child = spawn(command.executable, command.args, {
        detached: true,
        stdio: "ignore",
        windowsHide: false,
      });
      child.on("error", () => {});
      child.unref();
    });
    this.registry = new ProjectRegistryStore(this.forgeHome, this.now);
    this.requireCleanGit = options.requireCleanGit ?? requireCleanGeneratedProjectGit;
    this.allowLegacyPlanningEnvelopes = options.allowLegacyPlanningEnvelopes ?? false;
  }

  getSnapshot(): ProjectCreationSnapshot {
    return structuredClone(this.snapshot);
  }

  subscribe(subscriber: Subscriber): () => void {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  }

  private emit(): void {
    for (const subscriber of this.subscribers) subscriber({ type: "refresh" });
  }

  private setStage(stage: ProjectCreationStage): void {
    const position = projectCreationStages.indexOf(stage);
    this.snapshot = {
      ...this.snapshot,
      stage,
      completedStages: projectCreationStages.slice(0, position),
      explanation: stageExplanations[stage],
    };
    this.emit();
  }

  private requireNotCancelled(): void {
    if (this.cancellationRequested) throw new ProjectCreationCancelledError();
  }

  beginCreation(envelopeValue: ApprovedBlueprintEnvelope): void {
    if (this.activeCreation) throw new ProjectCreationConflictError("A project creation transaction is already running.");
    if (this.snapshot.phase === "created") throw new ProjectCreationConflictError("This approved blueprint already created a project.");
    const envelope = structuredClone(envelopeValue);
    this.cancellationRequested = false;
    this.snapshot = {
      ...blankSnapshot(),
      phase: "creating",
      startedAt: this.now().toISOString(),
      displayName: envelope.blueprint.projectName,
      foundation: "top_down_arena",
      questCount: envelope.blueprint.quests.length,
    };
    const operation = this.runTransaction(envelope);
    this.activeCreation = operation.finally(() => {
      this.activeCreation = null;
    });
    this.emit();
  }

  beginOpenCreation(displayNameValue: string): void {
    if (this.activeCreation) throw new ProjectCreationConflictError("A project creation transaction is already running.");
    const displayName = displayNameValue.trim();
    const blueprint = gameBlueprintSchema.parse({
      projectName: displayName,
      vision: "A new Godot project whose game idea will be shaped inside Forge.",
      foundation: "top_down_arena",
      inputMode: "keyboard",
      coreAction: "The creator will define the game's core action in Forge.",
      funTarget: "The creator will define what makes the game fun in Forge.",
      smallestPlayableResult: "The creator will choose the smallest playable result after opening the project.",
      firstPlayableMilestone: "Shape the game into systems and small quests inside Forge.",
      quests: [
        { reference: "Q1", title: "Shape the Game", visibleOutcome: "The creator describes the game as broad systems.", dependencies: [] },
        { reference: "Q2", title: "Choose a System", visibleOutcome: "The creator selects one system to refine.", dependencies: ["Q1"] },
        { reference: "Q3", title: "Plan a Quest", visibleOutcome: "The creator approves one small playable quest.", dependencies: ["Q2"] },
      ],
      includedScope: ["One Forge-owned Godot workspace"],
      excludedScope: ["A predetermined game type", "Unapproved game-file changes"],
      acceptanceCriteria: [
        { reference: "AC-1", questReference: "Q1", criterion: "The creator can shape broad systems.", verificationReferences: ["V-1"] },
        { reference: "AC-2", questReference: "Q2", criterion: "The creator can refine one system.", verificationReferences: ["V-2"] },
        { reference: "AC-3", questReference: "Q3", criterion: "The creator can approve one small quest.", verificationReferences: ["V-3"] },
      ],
      verificationIdeas: [
        { reference: "V-1", questReference: "Q1", idea: "Inspect the accepted system roadmap." },
        { reference: "V-2", questReference: "Q2", idea: "Inspect the accepted system quest plan." },
        { reference: "V-3", questReference: "Q3", idea: "Review the exact creator-approved files." },
      ],
      projectDocumentationSummary: "A neutral Forge-owned Godot project ready for the creator's idea.",
      initialChronicleSummary: "Forge created a neutral Godot project without choosing the game type.",
    });
    const envelope: ApprovedBlueprintEnvelope = {
      creationMode: "open",
      blueprint,
      blueprintSha256: fingerprintBlueprint(blueprint),
      approvedAt: this.now().toISOString(),
      provenance: {
        model: "gpt-5.6", reasoningEffort: "high", sandbox: "read-only", network: "disabled",
        threadId: null, attempts: 1, latencyMs: 0,
        usage: { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, reasoningOutputTokens: 0 },
      },
    };
    this.cancellationRequested = false;
    this.snapshot = { ...blankSnapshot(), phase: "creating", startedAt: this.now().toISOString(), displayName, foundation: "open_godot", questCount: 0 };
    const operation = this.runTransaction(envelope);
    this.activeCreation = operation.finally(() => { this.activeCreation = null; });
    this.emit();
  }

  cancelCreation(): void {
    if (!this.activeCreation || this.snapshot.phase !== "creating") {
      throw new ProjectCreationConflictError("There is no active project creation to cancel.");
    }
    if (this.snapshot.stage === "Registering the project") {
      throw new ProjectCreationConflictError("Project promotion has started and can no longer be cancelled safely.");
    }
    this.cancellationRequested = true;
  }

  resetFailure(): void {
    if (this.activeCreation || this.snapshot.phase !== "failed") {
      throw new ProjectCreationConflictError("Only a finished failed project creation can be reset.");
    }
    this.snapshot = blankSnapshot();
    this.emit();
  }

  async waitForIdle(): Promise<void> {
    await this.activeCreation;
  }

  async listRecentProjects(): Promise<RecentProjectSummary[]> {
    return this.registry.listRecent();
  }

  private async rejectPersistedDuplicate(blueprintSha256: string): Promise<void> {
    for (const project of (await this.registry.load()).projects) {
      try {
        const value = creationProvenanceSchema.parse(JSON.parse(
          await readFile(path.join(project.canonicalPath, ".forge", "local", "creation-provenance.json"), "utf8"),
        ) as unknown);
        if (value.blueprintSha256 === blueprintSha256) {
          throw new ProjectCreationConflictError(`This approved blueprint already created project ${project.projectId}.`);
        }
      } catch (error) {
        if (error instanceof ProjectCreationConflictError) throw error;
      }
    }
  }

  private async allocateProject(
    roots: ProjectRoots,
    displayName: string,
  ): Promise<{ projectId: string; finalPath: string }> {
    const slug = sanitizeProjectSlug(displayName);
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const projectId = `${slug}-${idSuffix(this.randomId())}`;
      const finalPath = path.join(roots.projectsRoot, projectId);
      assertDirectChild(roots.projectsRoot, finalPath);
      if (!(await exists(finalPath))) return { projectId, finalPath };
    }
    throw new Error("Forge could not allocate a collision-safe project directory.");
  }

  private async loadCreatedSummary(projectId: string): Promise<CreatedProjectSummary> {
    const entry = await this.registry.find(projectId);
    if (!entry) throw new Error(`Project ${projectId} is not registered.`);
    const projectFile = await stat(path.join(entry.canonicalPath, "project.godot")).catch(() => null);
    if (!projectFile?.isFile()) throw new Error(`Project ${projectId} is missing locally.`);
    const roadmap = roadmapSchema.or(generatedRoadmapV2Schema).parse(JSON.parse(await readFile(path.join(entry.canonicalPath, ".forge", "roadmap.json"), "utf8")) as unknown);
    const godot = godotVerificationResultSchema.parse(JSON.parse(await readFile(path.join(entry.canonicalPath, ".forge", "local", "godot-verification.json"), "utf8")) as unknown);
    const git = gitBaselineResultSchema.parse(JSON.parse(await readFile(path.join(entry.canonicalPath, ".forge", "local", "git-baseline.json"), "utf8")) as unknown);
    return {
      projectId: entry.projectId,
      displayName: entry.displayName,
      foundation: entry.foundation,
      projectLocation: entry.canonicalPath,
      createdAt: entry.createdAt,
      questCount: roadmap.quests.length,
      starterVersion: entry.starterVersion,
      godotVersion: godot.godotVersion,
      godotSuccessMarker: godot.successMarker,
      gitCommitSha: git.commitSha,
      documentationSaved: true,
      chronicleInitialized: true,
      registered: true,
    };
  }

  async getCreatedProject(projectId: string): Promise<CreatedProjectSummary> {
    return this.loadCreatedSummary(projectId);
  }

  async openProjectFolder(projectId: string): Promise<void> {
    const entry = await this.registry.resolveRegisteredProject(projectId);
    this.openFolder(entry.canonicalPath);
  }

  private async writeFailureEvidence(options: {
    roots: ProjectRoots | null;
    envelope: ApprovedBlueprintEnvelope;
    transactionId: string;
    projectId: string | null;
    stage: string;
    error: unknown;
    stagingRemoved: boolean;
  }): Promise<string | null> {
    try {
      const roots = options.roots ?? await prepareProjectRoots(this.forgeHome);
      const relative = path.join("evidence", "creation-failures", `${options.transactionId}.json`).replaceAll("\\", "/");
      const record = creationFailureRecordSchema.parse({
        schemaVersion: 1,
        transactionId: options.transactionId,
        projectId: options.projectId,
        blueprintSha256: /^[a-f0-9]{64}$/u.test(options.envelope.blueprintSha256)
          ? options.envelope.blueprintSha256
          : fingerprintBlueprint(options.envelope.blueprint),
        stage: options.stage,
        failedAt: this.now().toISOString(),
        message: messageFrom(options.error).slice(0, 1_000),
        registered: false,
        stagingRemoved: options.stagingRemoved,
      });
      await writeJsonAtomic(path.join(roots.failureRoot, `${options.transactionId}.json`), record);
      return relative;
    } catch {
      return null;
    }
  }

  private async runTransaction(envelope: ApprovedBlueprintEnvelope): Promise<void> {
    const transactionId = `create-${idSuffix(this.randomId())}`;
    const ownedPaths = new Set<string>();
    let roots: ProjectRoots | null = null;
    let stagingPath: string | null = null;
    let finalPath: string | null = null;
    let projectId: string | null = null;
    let promoted = false;
    let registered = false;
    try {
      this.setStage("Validating the blueprint");
      const blueprint = gameBlueprintSchema.parse(envelope.blueprint);
      const openCreation = envelope.creationMode === "open";
      if (fingerprintBlueprint(blueprint) !== envelope.blueprintSha256) {
        throw new Error("The approved blueprint changed after creator approval. Review and approve it again.");
      }
      if (!openCreation && (!envelope.proposal || !envelope.acceptedRoadmap || !envelope.acceptedRoadmapSha256)) {
        if (!this.allowLegacyPlanningEnvelopes) throw new Error("Project creation requires the current approved blueprint and accepted-roadmap fingerprints.");
      } else if (!openCreation) {
        const proposal = envelope.proposal!;
        const acceptedRoadmap = validateAcceptedRoadmap(envelope.acceptedRoadmap!, envelope.blueprintSha256);
        if (!acceptedRoadmap.acceptedAt || acceptedRoadmap.fingerprint !== envelope.acceptedRoadmapSha256) {
          throw new Error("The accepted roadmap changed after creator approval. Review and accept it again.");
        }
        if (proposal.blueprint.projectName !== blueprint.projectName || fingerprintBlueprint(proposal.blueprint) !== envelope.blueprintSha256) {
          throw new Error("The immutable planning proposal no longer matches the approved blueprint.");
        }
      }
      if (!openCreation) await this.rejectPersistedDuplicate(envelope.blueprintSha256);
      this.requireNotCancelled();

      this.setStage("Preparing the workspace");
      roots = await prepareProjectRoots(this.forgeHome);
      const allocation = await this.allocateProject(roots, blueprint.projectName);
      projectId = allocation.projectId;
      finalPath = allocation.finalPath;
      const transactionPath = path.join(roots.stagingRoot, transactionId);
      assertDirectChild(roots.stagingRoot, transactionPath);
      if (await exists(transactionPath)) throw new Error("The allocated staging directory already exists.");
      await mkdir(transactionPath);
      stagingPath = await realpath(transactionPath);
      assertDirectChild(roots.stagingRoot, stagingPath);
      ownedPaths.add(stagingPath);
      this.snapshot = {
        ...this.snapshot,
        projectId,
        relativeProjectIdentifier: `projects/${projectId}`,
      };
      this.emit();
      this.requireNotCancelled();

      this.setStage("Assembling the starter");
      const starter = openCreation
        ? await assembleOpenGodotFoundation(stagingPath, blueprint.projectName, this.openFoundationPath)
        : await assembleControlledStarter(stagingPath, blueprint.projectName, this.starterPath);
      await assertStarterInventory(stagingPath, starter);
      this.requireNotCancelled();

      const createdAt = this.now().toISOString();
      this.setStage("Writing project records");
      await writeGeneratedProjectArtifacts({ projectPath: stagingPath, projectId, envelope, starter, createdAt });
      await assertNoAbsolutePathsInPortableArtifacts(stagingPath, roots.forgeHome);
      this.requireNotCancelled();

      this.setStage("Checking the Godot project");
      const verifier = openCreation ? this.verifyOpenGodot : this.verifyGodot;
      const godot: GodotVerificationResult = await verifier({
        projectPath: stagingPath,
        projectId,
        forgeHome: roots.forgeHome,
        verifiedAt: this.now().toISOString(),
      });
      this.requireNotCancelled();

      this.setStage("Creating the baseline");
      const baselineFiles = await expectedBaselineFiles(stagingPath);
      const git: GitBaselineResult = await this.createGitBaseline({
        projectPath: stagingPath,
        projectId,
        expectedFiles: baselineFiles,
        committedAt: this.now().toISOString(),
      });
      const completedAt = this.now().toISOString();
      const provenance: CreationProvenance = creationProvenanceSchema.parse({
        schemaVersion: 1,
        projectId,
        transactionId,
        blueprintSha256: envelope.blueprintSha256,
        ...(envelope.acceptedRoadmapSha256 ? { acceptedRoadmapSha256: envelope.acceptedRoadmapSha256 } : {}),
        starterId: starter.starterId,
        starterVersion: starter.version,
        createdAt,
        completedAt,
        godotSuccessMarker: godot.successMarker,
        gitCommitSha: git.commitSha,
        registryState: "registered",
        modelCommandsExecuted: 0,
        modelSourceFilesExecuted: 0,
      });
      await writeJsonAtomic(path.join(stagingPath, ".forge", "local", "godot-verification.json"), godot);
      await writeJsonAtomic(path.join(stagingPath, ".forge", "local", "git-baseline.json"), git);
      await writeJsonAtomic(path.join(stagingPath, ".forge", "local", "creation-provenance.json"), provenance);
      godotVerificationResultSchema.parse(JSON.parse(await readFile(path.join(stagingPath, ".forge", "local", "godot-verification.json"), "utf8")) as unknown);
      gitBaselineResultSchema.parse(JSON.parse(await readFile(path.join(stagingPath, ".forge", "local", "git-baseline.json"), "utf8")) as unknown);
      creationProvenanceSchema.parse(JSON.parse(await readFile(path.join(stagingPath, ".forge", "local", "creation-provenance.json"), "utf8")) as unknown);
      this.requireCleanGit(stagingPath);
      this.requireNotCancelled();

      this.setStage("Registering the project");
      if (await exists(finalPath)) throw new Error("The final project destination became occupied before promotion.");
      await rename(stagingPath, finalPath);
      ownedPaths.delete(stagingPath);
      stagingPath = null;
      finalPath = await realpath(finalPath);
      assertDirectChild(roots.projectsRoot, finalPath);
      ownedPaths.add(finalPath);
      promoted = true;
      await this.registry.add({
        projectId,
        displayName: blueprint.projectName,
        canonicalPath: finalPath,
        foundation: starter.foundation,
        createdAt,
        lastOpenedAt: completedAt,
        creationState: "created",
        starterVersion: starter.version,
      });
      registered = true;
      const createdProject = await this.loadCreatedSummary(projectId);
      this.snapshot = {
        ...this.snapshot,
        phase: "created",
        stage: null,
        completedStages: [...projectCreationStages],
        explanation: "Every required creation step passed and the project is registered for reopening.",
        createdProject,
        error: null,
        failureEvidence: null,
      };
    } catch (error) {
      let stagingRemoved = false;
      try {
        if (registered && projectId && finalPath) {
          await this.registry.removeOwned(projectId, finalPath);
          registered = false;
        }
        if (roots && stagingPath) stagingRemoved = await safeRemoveOwnedDirectory(roots.stagingRoot, stagingPath, ownedPaths);
        if (roots && promoted && finalPath) stagingRemoved = await safeRemoveOwnedDirectory(roots.projectsRoot, finalPath, ownedPaths);
      } catch (cleanupError) {
        error = new Error(`${messageFrom(error)} Cleanup also stopped safely: ${messageFrom(cleanupError)}`);
      }
      const failureEvidence = await this.writeFailureEvidence({
        roots,
        envelope,
        transactionId,
        projectId,
        stage: this.snapshot.stage ?? "Before creation",
        error,
        stagingRemoved,
      });
      this.snapshot = {
        ...this.snapshot,
        phase: "failed",
        stage: this.snapshot.stage,
        explanation: "Forge stopped at the failing stage. The project was not registered and no unrelated project was changed.",
        createdProject: null,
        error: messageFrom(error),
        failureEvidence,
      };
    } finally {
      this.cancellationRequested = false;
      this.emit();
    }
  }
}
