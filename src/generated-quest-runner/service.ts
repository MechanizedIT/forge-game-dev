import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { lstat, mkdir, readFile, readdir, realpath, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ThreadEvent } from "@openai/codex-sdk";
import { z } from "zod";

import {
  generatedCompletionReceiptSchema,
  generatedCreatorResultSchema,
  generatedProjectManifestSchema,
  generatedQuestArtifactAnySchema,
  generatedQuestArtifactV2Schema,
  generatedQuestImplementationContractSchema,
  generatedQuestRunJournalSchema,
  generatedScopeRequestSchema,
  generatedRoadmapV2Schema,
  gitBaselineResultSchema,
  roadmapSchema,
  starterManifestSchema,
  type GeneratedQuestArtifactV2,
  type GeneratedQuestImplementationContract,
  type GeneratedQuestRunJournal,
  type GeneratedRoadmapV2,
  type StarterManifest,
} from "../contracts/index.js";
import { resolveForgeHome } from "../demo/paths.js";
import { ensurePinnedGodot } from "../godot/bootstrap.js";
import { ProjectRegistryStore } from "../project-creation/registry.js";
import { writeJsonAtomic, writeJsonLinesAtomic, writeTextAtomic } from "../quest-runner/artifacts.js";
import type { CodexExecutor } from "../quest-runner/types.js";
import {
  captureControlledInventory,
  inspectCleanGitStart,
  reviewBoundary,
  runGit,
} from "./boundary.js";
import {
  completeGeneratedQuestTransaction,
  completeNativeQuestTransaction,
  GeneratedReceiptPendingError,
  repairGeneratedCompletionReceipt,
  renderGeneratedQuestMarkdown,
  renderGeneratedRoadmapMarkdown,
  type GeneratedCompletionFault,
} from "./completion.js";
import {
  buildGeneratedQuestContract,
  normalizeGeneratedQuest,
  normalizeGeneratedRoadmap,
  verifyContractFingerprint,
} from "./contract.js";
import { buildGeneratedQuestContext } from "./context.js";
import {
  assessGeneratedRecovery,
  captureGeneratedPreimages,
  exactRollbackGeneratedRun,
  GeneratedConcurrentEditError,
  type GeneratedPreimageBundle,
} from "./recovery.js";
import type {
  GeneratedQuestAdjustmentInput,
  GeneratedQuestPlanMutationResult,
  GeneratedQuestRunnerSummary,
  GeneratedQuestRunEvent,
  GeneratedQuestRunSnapshot,
} from "./shared.js";
import {
  automatedProofPassed,
  createPendingGeneratedProof,
  runGeneratedAutomatedProof,
  type GeneratedProofDependencies,
} from "./verification.js";
import { generatedProfileCatalog } from "./profiles.js";
import { loadNativeQuest, type NativePlanningRecord } from "./native-quest.js";
import { ArchitectureService } from "../project-architecture/service.js";

const successfulPlayLaunchProgress = "The real game launched successfully; creator confirmation is still required.";

function assertPlanningRecordsMatchInventory(planningRecords: readonly NativePlanningRecord[], inventory: Array<{ relativePath: string; sha256: string }>): void {
  const hashes = new Map(inventory.map((entry) => [entry.relativePath, entry.sha256]));
  for (const record of planningRecords) {
    if (hashes.get(record.relativePath) !== record.sha256) throw new GeneratedQuestRunConflictError("The saved Forge planning files changed while the work plan was being prepared.");
  }
}

const activeLockSchema = z.object({
  schemaVersion: z.literal(1),
  projectId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  questId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  runId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  createdAt: z.string().datetime({ offset: true }),
}).strict();

interface LoadedProject {
  source: "legacy" | "native";
  projectPath: string;
  manifest: z.infer<typeof generatedProjectManifestSchema>;
  starter: StarterManifest;
  baselineHead: string;
  roadmap: GeneratedRoadmapV2;
  quest: GeneratedQuestArtifactV2;
  questRelativePath: string | null;
  dependencyStates: Map<string, GeneratedQuestArtifactV2["state"]>;
  planningRecords: NativePlanningRecord[];
}

export class GeneratedQuestRunConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeneratedQuestRunConflictError";
  }
}

export class GeneratedQuestRunNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeneratedQuestRunNotFoundError";
  }
}

export interface GeneratedGameLaunchResult {
  launched: true;
  version: string;
  message: string;
}

export type GeneratedGameLauncher = (input: {
  projectId: string;
  projectPath: string;
  forgeHome: string;
}) => Promise<GeneratedGameLaunchResult>;

export interface GeneratedQuestRunnerServiceOptions {
  forgeHome?: string;
  now?: () => Date;
  randomId?: () => string;
  registry?: ProjectRegistryStore;
  codexExecutor?: CodexExecutor;
  proofDependencies?: GeneratedProofDependencies;
  launchGame?: GeneratedGameLauncher;
  completionFault?: () => GeneratedCompletionFault | undefined;
  architectureService?: ArchitectureService;
}

function activeLockPath(projectPath: string): string {
  return path.join(projectPath, ".forge", "local", "active-generated-run.json");
}

function runDirectory(projectPath: string, runId: string): string {
  return path.join(projectPath, ".forge", "local", "runs", runId);
}

function isContained(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function questRelativePath(questsDirectory: string, questId: string): string {
  return path.posix.join(questsDirectory.replaceAll("\\", "/"), `${questId}.json`);
}

async function readUnknown(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf8")) as unknown;
}

async function readOptionalUnknown(filePath: string): Promise<unknown | null> {
  try {
    return await readUnknown(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function eventRecord(event: ThreadEvent): Record<string, unknown> {
  if (event.type === "thread.started") return { type: event.type, threadId: event.thread_id };
  if (event.type === "turn.completed") return { type: event.type, usage: event.usage };
  if (event.type === "turn.failed" || event.type === "error") return { type: event.type, failed: true };
  if (event.type === "item.started" || event.type === "item.updated" || event.type === "item.completed") {
    return { type: event.type, itemType: event.item.type };
  }
  return { type: event.type };
}

function scopeRequestFromEvent(event: ThreadEvent): z.infer<typeof generatedScopeRequestSchema> | null {
  if (event.type !== "item.completed") return null;
  const item = event.item as unknown as Record<string, unknown>;
  if (item.type !== "agent_message" || typeof item.text !== "string" || !item.text.includes("FORGE_SCOPE_REQUEST")) return null;
  const matches = [...item.text.matchAll(/(?:^|\r?\n)FORGE_SCOPE_REQUEST (\{[^\r\n]+\})$/gu)];
  if (matches.length !== 1) throw new Error("Codex emitted an invalid Forge scope request marker.");
  return generatedScopeRequestSchema.parse(JSON.parse(matches[0]![1]!) as unknown);
}

async function defaultLaunchGame(input: {
  projectId: string;
  projectPath: string;
  forgeHome: string;
}): Promise<GeneratedGameLaunchResult> {
  const godot = await ensurePinnedGodot({ forgeHome: input.forgeHome });
  await new Promise<void>((resolve, reject) => {
    const child = spawn(godot.executable, ["--path", input.projectPath], {
      cwd: input.projectPath,
      stdio: "ignore",
      windowsHide: false,
    });
    child.once("error", reject);
    child.once("exit", () => resolve());
  });
  return { launched: true, version: godot.version, message: `Godot closed after the ${input.projectId} playtest.` };
}

function sameInventory(
  left: Awaited<ReturnType<typeof captureControlledInventory>>,
  right: Awaited<ReturnType<typeof captureControlledInventory>>,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export class GeneratedQuestRunnerService {
  private readonly forgeHome: string;
  private readonly now: () => Date;
  private readonly randomId: () => string;
  private readonly registry: ProjectRegistryStore;
  private readonly codexExecutor: CodexExecutor | undefined;
  private readonly proofDependencies: GeneratedProofDependencies | undefined;
  private readonly launchGame: GeneratedGameLauncher;
  private readonly completionFault: (() => GeneratedCompletionFault | undefined) | undefined;
  private readonly architectureService: ArchitectureService;
  private readonly listeners = new Set<(event: GeneratedQuestRunEvent) => void>();
  private readonly executions = new Map<string, Promise<void>>();
  private readonly cancellationRequests = new Set<string>();

  constructor(options: GeneratedQuestRunnerServiceOptions = {}) {
    this.forgeHome = path.resolve(options.forgeHome ?? resolveForgeHome());
    this.now = options.now ?? (() => new Date());
    this.randomId = options.randomId ?? randomUUID;
    this.registry = options.registry ?? new ProjectRegistryStore(this.forgeHome, this.now);
    this.codexExecutor = options.codexExecutor;
    this.proofDependencies = options.proofDependencies;
    this.launchGame = options.launchGame ?? defaultLaunchGame;
    this.completionFault = options.completionFault;
    this.architectureService = options.architectureService ?? new ArchitectureService({ now: this.now });
  }

  private async syncArchitecture(journal: GeneratedQuestRunJournal, verificationOutcome: "pending" | "passed" | "failed", playtestOutcome: "worked" | "did_not_work" | "not_ready" | "retry" | "cancel" | "not_run"): Promise<string | null> {
    const architecture = await this.architectureService.load(journal.canonicalProjectPath, journal.projectId).catch(() => null);
    if (!architecture) return null;
    const linkedIds = new Set(architecture.gameAreas.filter((area) => area.relatedStepIds.includes(journal.questId)).map((area) => area.id));
    const crossAreaNames = architecture.gameAreas
      .filter((area) => !linkedIds.has(area.id) && journal.changedFiles.some((file) => area.relatedFilePaths.includes(file)))
      .map((area) => area.name);
    await this.architectureService.recordResult(journal.canonicalProjectPath, journal.projectId, {
      stepId: journal.questId,
      workSessionId: journal.runId,
      summary: journal.error ?? journal.progress.at(-1) ?? `Step ${journal.questId} ${journal.phase}.`,
      changedFiles: journal.changedFiles,
      verificationOutcome,
      playtestOutcome,
      creatorFeedback: journal.creatorResult ? `Creator chose ${journal.creatorResult}.` : "",
    });
    return crossAreaNames.length ? `This Step also changed a file associated with ${crossAreaNames.join(" and ")}.` : "Forge updated the related Game Areas with this result.";
  }

  subscribe(listener: (event: GeneratedQuestRunEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: GeneratedQuestRunEvent): void {
    for (const listener of this.listeners) listener(event);
  }

  private async loadProject(projectId: string, questId: string): Promise<LoadedProject> {
    let entry;
    try {
      entry = await this.registry.resolveRegisteredProject(projectId);
    } catch (error) {
      throw new GeneratedQuestRunNotFoundError(error instanceof Error ? error.message : String(error));
    }
    const projectPath = entry.canonicalPath;
    const manifest = generatedProjectManifestSchema.parse(await readUnknown(path.join(projectPath, ".forge", "project-manifest.json")));
    const starter = starterManifestSchema.parse(await readUnknown(path.join(projectPath, manifest.starter.manifest)));
    const baseline = gitBaselineResultSchema.parse(await readUnknown(path.join(projectPath, manifest.artifacts.localGitBaseline)));
    if (manifest.projectId !== projectId || entry.starterVersion !== starter.version || manifest.starter.version !== starter.version) {
      throw new GeneratedQuestRunConflictError("Registry, manifest, and controlled starter identity do not match.");
    }
    const roadmapValue = await readUnknown(path.join(projectPath, manifest.artifacts.roadmap));
    const roadmap = normalizeGeneratedRoadmap(
      generatedRoadmapV2Schema.safeParse(roadmapValue).success
        ? generatedRoadmapV2Schema.parse(roadmapValue)
        : roadmapSchema.parse(roadmapValue),
    );
    const native = await loadNativeQuest({ projectPath, projectId, questId, legacyRoadmap: roadmap });
    const node = roadmap.quests.find((item) => item.questId === questId);
    if (!node) {
      if (!native) throw new GeneratedQuestRunNotFoundError(`Quest ${questId} is not in project ${projectId}.`);
      return {
        source: "native",
        projectPath,
        manifest,
        starter,
        baselineHead: baseline.commitSha,
        roadmap,
        quest: native.quest,
        questRelativePath: null,
        dependencyStates: native.dependencyStates,
        planningRecords: native.planningRecords,
      };
    }
    const relativeQuestPath = questRelativePath(manifest.artifacts.questsDirectory, questId);
    const questAny = generatedQuestArtifactAnySchema.parse(await readUnknown(path.join(projectPath, relativeQuestPath)));
    const quest = normalizeGeneratedQuest(questAny, node.state);
    if (quest.projectId !== projectId || quest.questId !== questId || quest.revision !== node.revision) {
      throw new GeneratedQuestRunConflictError("Generated quest and roadmap revision identity do not match.");
    }
    return {
      source: "legacy",
      projectPath,
      manifest,
      starter,
      baselineHead: baseline.commitSha,
      roadmap,
      quest,
      questRelativePath: relativeQuestPath,
      dependencyStates: new Map(roadmap.quests.map((item) => [item.questId, item.state])),
      planningRecords: [],
    };
  }

  private async readLock(projectPath: string): Promise<z.infer<typeof activeLockSchema> | null> {
    const value = await readOptionalUnknown(activeLockPath(projectPath));
    return value === null ? null : activeLockSchema.parse(value);
  }

  private async loadRun(projectPath: string, runId: string): Promise<{
    contract: GeneratedQuestImplementationContract;
    journal: GeneratedQuestRunJournal;
    receipt: z.infer<typeof generatedCompletionReceiptSchema> | null;
  }> {
    const directory = runDirectory(projectPath, runId);
    const contract = generatedQuestImplementationContractSchema.parse(await readUnknown(path.join(directory, "contract.json")));
    const journal = generatedQuestRunJournalSchema.parse(await readUnknown(path.join(directory, "journal.json")));
    const receiptValue = await readOptionalUnknown(path.join(directory, "commit.json"));
    const receipt = receiptValue === null ? null : generatedCompletionReceiptSchema.parse(receiptValue);
    if (
      journal.runId !== runId
      || journal.canonicalProjectPath !== projectPath
      || contract.schemaVersion !== journal.schemaVersion
      || contract.fingerprint !== journal.contractFingerprint
      || contract.projectId !== journal.projectId
      || contract.questId !== journal.questId
      || (receipt !== null && (
        receipt.runId !== journal.runId
        || receipt.projectId !== journal.projectId
        || receipt.questId !== journal.questId
      ))
    ) {
      throw new GeneratedQuestRunConflictError("Generated run contract and journal do not match.");
    }
    verifyContractFingerprint(contract);
    return { contract, journal, receipt };
  }

  private snapshot(
    contract: GeneratedQuestImplementationContract,
    journal: GeneratedQuestRunJournal,
    receipt: z.infer<typeof generatedCompletionReceiptSchema> | null,
  ): GeneratedQuestRunSnapshot {
    const safeRollback = journal.recovery.action === "rollback";
    return {
      runId: journal.runId,
      projectId: journal.projectId,
      questId: journal.questId,
      phase: journal.phase,
      createdAt: journal.createdAt,
      updatedAt: journal.updatedAt,
      contract,
      progress: journal.progress,
      proofs: journal.proofs,
      changedFiles: journal.changedFiles,
      contextSummary: journal.contextSummary ?? null,
      creatorResult: journal.creatorResult,
      error: journal.error,
      scopeRequest: journal.schemaVersion === 2 ? journal.scopeRequest : null,
      recovery: journal.recovery,
      receipt,
      actions: {
        approve: journal.phase === "contract_review",
        start: journal.phase === "approved",
        play: journal.phase === "waiting_for_playtest",
        confirm: journal.phase === "waiting_for_playtest",
        retry: journal.phase === "failed" && journal.changedFiles.length === 0,
        cancel: ["contract_review", "approved", "implementing", "scope_review", "waiting_for_playtest"].includes(journal.phase),
        rollback: safeRollback,
      },
    };
  }

  private async writeJournal(journal: unknown): Promise<GeneratedQuestRunJournal> {
    const parsedInput = generatedQuestRunJournalSchema.parse(journal);
    const parsed = generatedQuestRunJournalSchema.parse({ ...parsedInput, updatedAt: this.now().toISOString() });
    await writeJsonAtomic(path.join(runDirectory(parsed.canonicalProjectPath, parsed.runId), "journal.json"), parsed);
    this.emit({ type: "refresh", projectId: parsed.projectId, questId: parsed.questId, phase: parsed.phase });
    return parsed;
  }

  private progress(journal: unknown, message: string): GeneratedQuestRunJournal {
    const parsed = generatedQuestRunJournalSchema.parse(journal);
    const progress = parsed.progress.at(-1) === message ? parsed.progress : [...parsed.progress, message].slice(-24);
    this.emit({ type: "progress", projectId: parsed.projectId, questId: parsed.questId, phase: parsed.phase, message });
    return generatedQuestRunJournalSchema.parse({ ...parsed, progress });
  }

  async getSummary(projectId: string, questId: string): Promise<GeneratedQuestRunnerSummary> {
    const project = await this.loadProject(projectId, questId);
    const lock = await this.readLock(project.projectPath);
    let reason: string | null = null;
    const registered = project.quest.workOrder ? null : project.quest.verificationProfile ? generatedProfileCatalog[project.quest.verificationProfile] : null;
    if (!project.quest.workOrder && !registered) reason = "This quest is planned, but Forge has no registered existing-file verifier for it.";
    else if (!project.quest.workOrder && registered && ((registered.preparedQuestId !== null && project.quest.questId !== registered.preparedQuestId) || project.quest.sequence !== 1)) reason = "This quest does not match its Forge-owned prepared profile.";
    else if (!project.quest.workOrder && registered && project.quest.revision < registered.minimumRevision) reason = "Adjust this outcome to the bounded gravity-orb quest before Build.";
    else if (project.quest.implementation !== "not_enabled") reason = "This quest is already completed.";
    else if (project.quest.state !== "available") reason = `This quest is ${project.quest.state}.`;
    else if (lock && lock.questId !== questId) reason = "Another generated quest run owns the project lock.";
    const eligibility = { eligible: reason === null, reason, revision: project.quest.revision, state: project.quest.state };
    let runId = lock?.questId === questId ? lock.runId : null;
    if (!runId && project.quest.implementation !== "not_enabled") runId = project.quest.implementation.runId;
    const run = runId ? await this.loadRun(project.projectPath, runId) : null;
    return { eligibility, run: run ? this.snapshot(run.contract, run.journal, run.receipt) : null };
  }

  async listProjectSessions(projectId: string): Promise<GeneratedQuestRunSnapshot[]> {
    let entry;
    try {
      entry = await this.registry.resolveRegisteredProject(projectId);
    } catch (error) {
      throw new GeneratedQuestRunNotFoundError(error instanceof Error ? error.message : String(error));
    }
    const projectPath = entry.canonicalPath;
    const runsRoot = path.join(projectPath, ".forge", "local", "runs");
    const rootInfo = await lstat(runsRoot).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (rootInfo === null) return [];
    if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) {
      throw new GeneratedQuestRunConflictError("Generated run storage is missing or unsafe.");
    }
    const canonicalRunsRoot = await realpath(runsRoot);
    if (!isContained(projectPath, canonicalRunsRoot) || canonicalRunsRoot !== runsRoot) {
      throw new GeneratedQuestRunConflictError("Generated run storage moved outside its registered project.");
    }
    const entries = await readdir(canonicalRunsRoot, { withFileTypes: true });
    const snapshots: GeneratedQuestRunSnapshot[] = [];
    for (const runEntry of entries) {
      if (!runEntry.isDirectory() || runEntry.isSymbolicLink()) {
        throw new GeneratedQuestRunConflictError(`Generated run entry is not an owned directory: ${runEntry.name}`);
      }
      const run = await this.loadRun(projectPath, runEntry.name);
      if (run.journal.projectId !== projectId) {
        throw new GeneratedQuestRunConflictError(`Generated run belongs to another project: ${runEntry.name}`);
      }
      snapshots.push(this.snapshot(run.contract, run.journal, run.receipt));
    }
    return snapshots.sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.runId.localeCompare(right.runId));
  }

  private async commitPlanArtifacts(projectPath: string, artifacts: Map<string, string>, message: string): Promise<string> {
    const names = [...artifacts.keys()].sort();
    const preimages = new Map<string, Buffer>();
    for (const relativePath of names) preimages.set(relativePath, await readFile(path.join(projectPath, relativePath)));
    try {
      for (const [relativePath, contents] of artifacts) await writeTextAtomic(path.join(projectPath, relativePath), contents);
      runGit(projectPath, ["add", "--", ...names]);
      const staged = runGit(projectPath, ["diff", "--cached", "--name-only", "--"]).split(/\r?\n/u).filter(Boolean).sort();
      if (JSON.stringify(staged) !== JSON.stringify(names)) throw new Error("Generated plan mutation staged an unexpected path set.");
      runGit(projectPath, ["commit", "-m", message]);
      return runGit(projectPath, ["rev-parse", "HEAD"]);
    } catch (error) {
      runGit(projectPath, ["restore", "--staged", "--", ...names], true);
      for (const [relativePath, contents] of preimages) await writeFile(path.join(projectPath, relativePath), contents);
      throw error;
    }
  }

  async adjust(projectId: string, questId: string, input: GeneratedQuestAdjustmentInput): Promise<GeneratedQuestPlanMutationResult> {
    const project = await this.loadProject(projectId, questId);
    if (project.source !== "legacy" || project.questRelativePath === null) throw new GeneratedQuestRunConflictError("Edit the native quest in its game-system plan.");
    if (await this.readLock(project.projectPath)) throw new GeneratedQuestRunConflictError("Adjust is unavailable while a generated run owns the project lock.");
    inspectCleanGitStart(project.projectPath, project.baselineHead);
    if (project.quest.verificationProfile !== "gravity_orb_presence_v1" || questId !== "q1-enter-the-arena" || project.quest.sequence !== 1) throw new GeneratedQuestRunConflictError("Adjustment remains the protected Gravity Tap revision ceremony; accepted relay roadmaps do not use it.");
    if (project.quest.revision !== input.expectedRevision) throw new GeneratedQuestRunConflictError("The quest revision changed; reopen the brief before adjusting it.");
    const visibleOutcome = z.string().trim().min(20).max(280).parse(input.visibleOutcome);
    const includedScope = z.array(z.string().trim().min(3).max(180)).min(1).max(4).parse(input.includedScope);
    if (!/\borb\b/iu.test(visibleOutcome) || /(?:pull|pulse|combat|score|new file|asset|dependency)/iu.test(`${visibleOutcome} ${includedScope.join(" ")}`)) {
      throw new GeneratedQuestRunConflictError("Task A adjustment must stay on one visible gravity orb and cannot expand into interaction, files, assets, or dependencies.");
    }
    const adjustedAt = this.now().toISOString();
    const adjustedQuest = generatedQuestArtifactV2Schema.parse({
      ...project.quest,
      schemaVersion: 2,
      revision: project.quest.revision + 1,
      visibleOutcome,
      whyItMatters: "A clearly identifiable gravity orb makes the arena's first objective honest before interaction mechanics are added.",
      currentPlayableFacts: [
        "The controlled Top-down Arena project and main scene load successfully.",
        "The arena, player, ObjectiveMarker, camera, and keyboard movement already pass starter proof.",
        "The current ObjectiveMarker is code-native but is not yet identified as the accepted gravity orb.",
      ],
      state: "available",
      scope: { included: includedScope, excluded: project.quest.scope.excluded },
      acceptanceCriteria: [
        { id: "AC-1", criterion: "The opening arena contains exactly one clearly identifiable gravity orb.", verificationIds: ["V-1"] },
        { id: "AC-2", criterion: "The controlled starter project, player, movement, and arena remain healthy.", verificationIds: ["V-2"] },
      ],
      verificationIdeas: [
        { id: "V-1", idea: "Use the Forge-owned gravity_orb_presence_v1 profile, then confirm the orb in the real game." },
        { id: "V-2", idea: "Run the controlled Top-down Arena verifier without allowing Codex to edit it." },
      ],
      editableFileRoles: ["main_scene", "objective_visual"],
      verificationProfile: "gravity_orb_presence_v1",
      implementation: "not_enabled",
    });
    const adjustedRoadmap = generatedRoadmapV2Schema.parse({
      ...project.roadmap,
      updatedAt: adjustedAt,
      quests: project.roadmap.quests.map((node) => node.questId === questId
        ? { ...node, revision: adjustedQuest.revision, state: "available", summary: visibleOutcome }
        : node),
    });
    const commitSha = await this.commitPlanArtifacts(project.projectPath, new Map([
      [project.questRelativePath, `${JSON.stringify(adjustedQuest, null, 2)}\n`],
      [project.manifest.artifacts.roadmap, `${JSON.stringify(adjustedRoadmap, null, 2)}\n`],
      [`.forge/docs/quests/${questId}.md`, renderGeneratedQuestMarkdown(adjustedQuest)],
      [".forge/docs/roadmap.md", renderGeneratedRoadmapMarkdown(adjustedRoadmap)],
    ]), `forge: adjust ${questId} [revision:${adjustedQuest.revision}]`);
    return { projectId, questId, revision: adjustedQuest.revision, state: adjustedQuest.state, visibleOutcome, commitSha };
  }

  async defer(projectId: string, questId: string, expectedRevision: number): Promise<GeneratedQuestPlanMutationResult> {
    const project = await this.loadProject(projectId, questId);
    if (project.source !== "legacy" || project.questRelativePath === null) throw new GeneratedQuestRunConflictError("Edit the native quest in its game-system plan.");
    if (await this.readLock(project.projectPath)) throw new GeneratedQuestRunConflictError("Defer is unavailable while a generated run owns the project lock.");
    inspectCleanGitStart(project.projectPath, project.baselineHead);
    if (project.quest.revision !== expectedRevision) throw new GeneratedQuestRunConflictError("The quest revision changed; reopen the brief before deferring it.");
    const deferredQuest = generatedQuestArtifactV2Schema.parse({ ...project.quest, revision: project.quest.revision + 1, state: "deferred" });
    const deferredRoadmap = generatedRoadmapV2Schema.parse({
      ...project.roadmap,
      updatedAt: this.now().toISOString(),
      quests: project.roadmap.quests.map((node) => node.questId === questId
        ? { ...node, revision: deferredQuest.revision, state: "deferred" }
        : node),
    });
    const commitSha = await this.commitPlanArtifacts(project.projectPath, new Map([
      [project.questRelativePath, `${JSON.stringify(deferredQuest, null, 2)}\n`],
      [project.manifest.artifacts.roadmap, `${JSON.stringify(deferredRoadmap, null, 2)}\n`],
      [`.forge/docs/quests/${questId}.md`, renderGeneratedQuestMarkdown(deferredQuest)],
      [".forge/docs/roadmap.md", renderGeneratedRoadmapMarkdown(deferredRoadmap)],
    ]), `forge: defer ${questId} [revision:${deferredQuest.revision}]`);
    return { projectId, questId, revision: deferredQuest.revision, state: deferredQuest.state, visibleOutcome: deferredQuest.visibleOutcome, commitSha };
  }

  async prepare(projectId: string, questId: string, options: { repairRequest?: string } = {}): Promise<GeneratedQuestRunSnapshot> {
    const project = await this.loadProject(projectId, questId);
    if (await this.readLock(project.projectPath)) throw new GeneratedQuestRunConflictError("This project already has an active generated quest run.");
    const git = inspectCleanGitStart(project.projectPath, project.baselineHead, project.planningRecords);
    const startInventory = await captureControlledInventory(project.projectPath);
    assertPlanningRecordsMatchInventory(project.planningRecords, startInventory);
    const contract = await buildGeneratedQuestContract({
      projectPath: project.projectPath,
      starterId: project.starter.starterId,
      starterVersion: project.starter.version,
      quest: project.quest,
      dependencyStates: project.dependencyStates,
      ...(options.repairRequest ? { repairRequest: options.repairRequest } : {}),
    });
    const context = await buildGeneratedQuestContext(project.projectPath, contract);
    const suffix = this.randomId().toLowerCase().replace(/[^a-f0-9]/gu, "").slice(0, 12);
    if (suffix.length < 8) throw new GeneratedQuestRunConflictError("Forge could not allocate a generated run ID.");
    const runId = `run-${questId}-${this.now().getTime()}-${suffix}`;
    const createdAt = this.now().toISOString();
    const journal = generatedQuestRunJournalSchema.parse({
      schemaVersion: contract.schemaVersion,
      runId,
      projectId,
      questId,
      questRevision: project.quest.revision,
      phase: "contract_review",
      canonicalProjectPath: project.projectPath,
      baselineHead: project.baselineHead,
      startHead: git.startHead,
      contractFingerprint: contract.fingerprint,
      allowedFiles: contract.allowedFiles,
      ...(contract.schemaVersion === 2 ? { scopeRequest: null } : {}),
      startInventory,
      observedPostHashes: {},
      changedFiles: [],
      progress: [contract.schemaVersion === 2 ? "Prepared the creator-confirmed work plan for review." : "Prepared the bounded quest contract for creator review."],
      contextSummary: context.contextSummary,
      proofs: createPendingGeneratedProof(contract.verificationProfile),
      creatorResult: null,
      codexThreadId: null,
      error: null,
      recovery: { action: "resume", message: contract.schemaVersion === 2 ? "Check and confirm the work plan to continue." : "Review and approve the exact contract to continue.", concurrentPaths: [] },
      createdAt,
      updatedAt: createdAt,
    });
    const directory = runDirectory(project.projectPath, runId);
    await mkdir(directory, { recursive: true });
    try {
      await writeFile(activeLockPath(project.projectPath), `${JSON.stringify(activeLockSchema.parse({ schemaVersion: 1, projectId, questId, runId, createdAt }), null, 2)}\n`, { encoding: "utf8", flag: "wx" });
      await writeJsonAtomic(path.join(directory, "contract.json"), contract);
      await writeJsonAtomic(path.join(directory, "inventory.json"), startInventory);
      await writeJsonAtomic(path.join(directory, "preimages.json"), await captureGeneratedPreimages(project.projectPath, runId, contract.allowedFiles));
      await writeJsonAtomic(path.join(directory, "context-manifest.json"), {
        schemaVersion: 1,
        runId,
        characterCount: context.characterCount,
        files: context.files,
        sceneNodes: context.sceneNodes,
        architectureContext: context.architectureContext,
        contextSummary: context.contextSummary,
        network: "disabled",
        sandbox: "workspace-write",
      });
      await writeJsonAtomic(path.join(directory, "journal.json"), journal);
    } catch (error) {
      await unlink(activeLockPath(project.projectPath)).catch(() => {});
      await rm(directory, { recursive: true, force: true });
      throw error;
    }
    return this.snapshot(contract, journal, null);
  }

  async approve(projectId: string, questId: string, fingerprint: string, decision: "APPROVE"): Promise<GeneratedQuestRunSnapshot> {
    if (decision !== "APPROVE") throw new GeneratedQuestRunConflictError("Generated quest approval requires the exact APPROVE decision.");
    const project = await this.loadProject(projectId, questId);
    const lock = await this.readLock(project.projectPath);
    if (!lock || lock.questId !== questId) throw new GeneratedQuestRunNotFoundError("No reviewed generated contract is active for this quest.");
    const run = await this.loadRun(project.projectPath, lock.runId);
    if (run.journal.phase !== "contract_review" || fingerprint !== run.contract.fingerprint) {
      throw new GeneratedQuestRunConflictError("Approval does not match the current reviewed contract fingerprint.");
    }
    const journal = await this.writeJournal(this.progress({
      ...run.journal,
      phase: "approved",
      error: null,
      recovery: { action: "resume", message: run.contract.schemaVersion === 2 ? "The work plan is confirmed and ready to send to Codex." : "The exact contract is approved and ready to start.", concurrentPaths: [] },
    }, run.contract.schemaVersion === 2 ? "Creator confirmed the work plan. Codex has not started." : "Creator approved the exact existing-file implementation contract."));
    return this.snapshot(run.contract, journal, run.receipt);
  }

  async start(projectId: string, questId: string): Promise<GeneratedQuestRunSnapshot> {
    if (!this.codexExecutor) throw new GeneratedQuestRunConflictError("The official Codex executor is unavailable.");
    const project = await this.loadProject(projectId, questId);
    const lock = await this.readLock(project.projectPath);
    if (!lock || lock.questId !== questId) throw new GeneratedQuestRunNotFoundError("No approved generated run is active for this quest.");
    const run = await this.loadRun(project.projectPath, lock.runId);
    if (run.journal.phase !== "approved") throw new GeneratedQuestRunConflictError("Only an approved generated contract can start.");
    const git = inspectCleanGitStart(project.projectPath, project.baselineHead, project.planningRecords);
    const inventory = await captureControlledInventory(project.projectPath);
    assertPlanningRecordsMatchInventory(project.planningRecords, inventory);
    const currentContract = await buildGeneratedQuestContract({
      projectPath: project.projectPath,
      starterId: project.starter.starterId,
      starterVersion: project.starter.version,
      quest: project.quest,
      dependencyStates: project.dependencyStates,
      ...(run.contract.repairRequest ? { repairRequest: run.contract.repairRequest } : {}),
    });
    if (git.startHead !== run.journal.startHead || !sameInventory(inventory, run.journal.startInventory) || project.quest.revision !== run.journal.questRevision || currentContract.fingerprint !== run.contract.fingerprint) {
      throw new GeneratedQuestRunConflictError("Project HEAD, inventory, or quest revision changed after contract approval.");
    }
    const context = await buildGeneratedQuestContext(project.projectPath, run.contract);
    let journal = await this.writeJournal(this.progress({
      ...run.journal,
      phase: "implementing",
      recovery: { action: "none", message: "Codex is running inside the approved workspace boundary.", concurrentPaths: [] },
    }, run.contract.schemaVersion === 2 ? "Codex is updating only the creator-approved game files." : "Codex is updating only the approved existing game files."));
    const execution = this.execute(journal, run.contract, context.prompt).finally(() => this.executions.delete(journal.runId));
    this.executions.set(journal.runId, execution);
    return this.snapshot(run.contract, journal, run.receipt);
  }

  private async execute(initial: GeneratedQuestRunJournal, contract: GeneratedQuestImplementationContract, prompt: string): Promise<void> {
    const events: Record<string, unknown>[] = [];
    let journal = initial;
    let codexError: string | null = null;
    let turnCompleted = false;
    let scopeRequest: z.infer<typeof generatedScopeRequestSchema> | null = null;
    try {
      const session = await this.codexExecutor!.start({ prompt, workspacePath: journal.canonicalProjectPath });
      for await (const event of session.events) {
        events.push(eventRecord(event));
        const requested = contract.schemaVersion === 2 ? scopeRequestFromEvent(event) : null;
        if (requested) {
          if (contract.schemaVersion !== 2 || scopeRequest) throw new Error("Codex emitted an unexpected or repeated Forge scope request.");
          scopeRequest = requested;
        }
        if (event.type === "thread.started" || event.type === "turn.started") journal = this.progress(journal, "Codex inspected the approved context and files.");
        if ((event.type === "item.started" || event.type === "item.updated" || event.type === "item.completed") && event.item.type === "file_change") {
          journal = this.progress(journal, "Codex is applying the bounded game change.");
        }
        if (event.type === "turn.failed") throw new Error(event.error.message);
        if (event.type === "error") throw new Error(event.message);
        if (event.type === "turn.completed") turnCompleted = true;
      }
      journal = { ...journal, codexThreadId: session.getThreadId() ?? "missing-thread-id" };
      if (!turnCompleted) throw new Error("Codex event stream ended without turn.completed.");
    } catch (error) {
      codexError = (error instanceof Error ? error.message : String(error)).replaceAll(journal.canonicalProjectPath, "<generated-project>").slice(0, 2_000);
    }
    await writeJsonLinesAtomic(path.join(runDirectory(journal.canonicalProjectPath, journal.runId), "events.jsonl"), events.slice(-500));
    let boundary;
    try {
      boundary = await reviewBoundary({
        projectPath: journal.canonicalProjectPath,
        startHead: journal.startHead,
        startInventory: journal.startInventory,
        allowedFiles: journal.allowedFiles,
      });
    } catch (error) {
      const message = (error instanceof Error ? error.message : String(error)).replaceAll(journal.canonicalProjectPath, "<generated-project>").slice(0, 2_000);
      await this.writeJournal(this.progress({
        ...journal,
        phase: "failed",
        error: message,
        recovery: { action: "manual", message: "Forge found an unsafe filesystem change and preserved the project for manual recovery.", concurrentPaths: [] },
      }, "Forge stopped because the project boundary could not be inspected safely."));
      return;
    }
    journal = {
      ...journal,
      phase: "verifying",
      changedFiles: boundary.changedFiles,
      observedPostHashes: boundary.observedPostHashes,
    };
    const authorityProblems = boundary.problems.filter((problem) => problem !== "Codex completed without changing an approved file.");
    if (scopeRequest && !codexError && authorityProblems.length === 0) {
      const scopedJournal = generatedQuestRunJournalSchema.parse({ ...journal, phase: "scope_review", scopeRequest });
      const recovery = scopedJournal.changedFiles.length === 0
        ? { action: "retry" as const, message: "Codex asked for more scope without changing the project. The request did not grant permission.", concurrentPaths: [] }
        : await assessGeneratedRecovery(scopedJournal);
      await this.writeJournal(this.progress({ ...scopedJournal, recovery }, "Codex paused and asked the creator to review more file scope. No authority was added."));
      return;
    }
    if (codexError || this.cancellationRequests.has(journal.runId)) {
      this.cancellationRequests.delete(journal.runId);
      const recovery = boundary.problems.some((problem) => /(?:New file|deleted|Unapproved|Git reported|HEAD changed)/u.test(problem))
        ? { action: "manual" as const, message: "The failed run left changes outside the exact rollback boundary; Forge preserved the project.", concurrentPaths: [] }
        : await assessGeneratedRecovery({ ...journal, phase: codexError ? "failed" : "cancelled" });
      journal = await this.writeJournal(this.progress({
        ...journal,
        phase: codexError ? "failed" : "cancelled",
        error: codexError,
        recovery,
      }, codexError ? "Codex stopped; Forge reviewed the actual project state." : "Cancellation was recorded after Codex stopped safely."));
      return;
    }
    journal = await this.writeJournal(this.progress(journal, "Forge is running independent boundary, project-health, and mechanic proof."));
    const proofs = await runGeneratedAutomatedProof({
      journal,
      forgeHome: this.forgeHome,
      now: this.now,
      verificationProfile: contract.verificationProfile,
      ...(this.proofDependencies ? { dependencies: this.proofDependencies } : {}),
    });
    let verifiedBoundary;
    try {
      verifiedBoundary = await reviewBoundary({
        projectPath: journal.canonicalProjectPath,
        startHead: journal.startHead,
        startInventory: journal.startInventory,
        allowedFiles: journal.allowedFiles,
      });
    } catch (error) {
      const message = (error instanceof Error ? error.message : String(error)).replaceAll(journal.canonicalProjectPath, "<generated-project>").slice(0, 2_000);
      await this.writeJournal(this.progress({
        ...journal,
        phase: "failed",
        error: message,
        recovery: { action: "manual", message: "Forge found an unsafe filesystem change during verification and preserved the project.", concurrentPaths: [] },
      }, "Verification stopped because the project boundary was unsafe."));
      return;
    }
    const passed = automatedProofPassed(proofs);
    const recovery = passed
      ? { action: "resume" as const, message: "Automated proof passed; launch and play the real game.", concurrentPaths: [] }
      : verifiedBoundary.problems.some((problem) => /(?:New file|deleted|Unapproved|Git reported|HEAD changed)/u.test(problem))
        ? { action: "manual" as const, message: "Verification found changes outside the safe rollback boundary.", concurrentPaths: [] }
        : await assessGeneratedRecovery(generatedQuestRunJournalSchema.parse({ ...journal, proofs, phase: "failed", changedFiles: verifiedBoundary.changedFiles, observedPostHashes: verifiedBoundary.observedPostHashes }));
    let finished = await this.writeJournal(this.progress({
      ...journal,
      proofs,
      changedFiles: verifiedBoundary.changedFiles,
      observedPostHashes: verifiedBoundary.observedPostHashes,
      phase: passed ? "waiting_for_playtest" : "failed",
      error: passed ? null : "One or more independent automated proof layers failed.",
      recovery,
    }, passed ? "Automated proof passed. The creator must play the real game next." : "Automated proof failed; the quest remains incomplete."));
    if (!passed) {
      const architectureNote = await this.syncArchitecture(finished, "failed", "not_run").catch(() => null);
      if (architectureNote) finished = await this.writeJournal(this.progress(finished, architectureNote));
    }
  }

  async waitForRun(projectId: string, questId: string): Promise<GeneratedQuestRunSnapshot> {
    const project = await this.loadProject(projectId, questId);
    const lock = await this.readLock(project.projectPath);
    if (lock) await this.executions.get(lock.runId);
    const summary = await this.getSummary(projectId, questId);
    if (!summary.run) throw new GeneratedQuestRunNotFoundError("Generated run evidence is unavailable.");
    return summary.run;
  }

  async play(projectId: string, questId: string): Promise<GeneratedGameLaunchResult> {
    const project = await this.loadProject(projectId, questId);
    const lock = await this.readLock(project.projectPath);
    if (!lock || lock.questId !== questId) throw new GeneratedQuestRunNotFoundError("No generated playtest is active for this quest.");
    const run = await this.loadRun(project.projectPath, lock.runId);
    if (run.journal.phase !== "waiting_for_playtest" || !automatedProofPassed(run.journal.proofs)) {
      throw new GeneratedQuestRunConflictError(run.contract.schemaVersion === 1
        ? "All three automated proof layers must pass before the real playtest."
        : "Boundary and project health must pass before the real playtest.");
    }
    const result = await this.launchGame({ projectId, projectPath: project.projectPath, forgeHome: this.forgeHome });
    await this.writeJournal(this.progress(run.journal, successfulPlayLaunchProgress));
    return result;
  }

  async confirm(projectId: string, questId: string, resultValue: unknown): Promise<GeneratedQuestRunSnapshot> {
    const result = generatedCreatorResultSchema.parse(resultValue);
    const project = await this.loadProject(projectId, questId);
    const lock = await this.readLock(project.projectPath);
    if (!lock || lock.questId !== questId) throw new GeneratedQuestRunNotFoundError("No generated playtest is active for this quest.");
    const run = await this.loadRun(project.projectPath, lock.runId);
    if (run.journal.phase !== "waiting_for_playtest") throw new GeneratedQuestRunConflictError("Creator confirmation is available only after automated proof and play launch.");
    if (!run.journal.progress.includes(successfulPlayLaunchProgress)) throw new GeneratedQuestRunConflictError("Play the real game successfully before choosing a result.");
    const confirmedAt = this.now().toISOString();
    if (result !== "worked") {
      const phase = result === "cancel" ? "cancelled" as const : result === "did_not_work" ? "failed" as const : "waiting_for_playtest" as const;
      const recovery = phase === "waiting_for_playtest"
        ? { action: "resume" as const, message: "The quest remains ready for another real playtest; it is not complete.", concurrentPaths: [] }
        : await assessGeneratedRecovery(generatedQuestRunJournalSchema.parse({ ...run.journal, phase, creatorResult: result }));
      let journal = await this.writeJournal(this.progress({
        ...run.journal,
        phase,
        creatorResult: result,
        proofs: {
          ...run.journal.proofs,
          creator: {
            result: result === "did_not_work" ? "failed" : "pending",
            summary: result === "did_not_work" ? "The creator reported that the visible result did not work." : "Creator confirmation remains pending.",
            evidence: [`Creator chose ${result} at ${confirmedAt}.`],
            verifiedAt: confirmedAt,
          },
        },
        error: result === "did_not_work" ? "The creator reported that the visible result did not work." : null,
        recovery,
      }, phase === "waiting_for_playtest" ? "The quest remains incomplete and ready for another playtest." : "Creator confirmation did not authorize completion."));
      if (phase !== "waiting_for_playtest") {
        const architectureNote = await this.syncArchitecture(journal, "passed", result).catch(() => null);
        if (architectureNote) journal = await this.writeJournal(this.progress(journal, architectureNote));
      }
      return this.snapshot(run.contract, journal, run.receipt);
    }

    let journal = await this.writeJournal(this.progress({
      ...run.journal,
      phase: "completion_pending",
      creatorResult: "worked",
      proofs: {
        ...run.journal.proofs,
        creator: {
          result: "passed",
          summary: run.contract.verificationProfile
            ? generatedProfileCatalog[run.contract.verificationProfile].creatorSuccessSummary
            : "The creator confirmed that the approved visible result worked in the real game.",
          evidence: [`Creator chose worked at ${confirmedAt}.`],
          verifiedAt: confirmedAt,
        },
      },
      recovery: { action: "none", message: "Forge is rerunning proof before the atomic completion transaction.", concurrentPaths: [] },
    }, "Creator confirmed the visible result. Forge is rerunning all automated proof."));
    const rerun = await runGeneratedAutomatedProof({
      journal,
      forgeHome: this.forgeHome,
      now: this.now,
      verificationProfile: run.contract.verificationProfile,
      ...(this.proofDependencies ? { dependencies: this.proofDependencies } : {}),
    });
    rerun.creator = journal.proofs.creator;
    if (!automatedProofPassed(rerun)) {
      journal = await this.writeJournal({
        ...journal,
        phase: "failed",
        proofs: rerun,
        error: "Final automated proof failed after creator confirmation; no completion commit was created.",
        recovery: await assessGeneratedRecovery(generatedQuestRunJournalSchema.parse({ ...journal, phase: "failed", proofs: rerun })),
      });
      const architectureNote = await this.syncArchitecture(journal, "failed", "worked").catch(() => null);
      if (architectureNote) journal = await this.writeJournal(this.progress(journal, architectureNote));
      return this.snapshot(run.contract, journal, null);
    }
    journal = await this.writeJournal({ ...journal, proofs: rerun });
    try {
      const fault = this.completionFault?.();
      const receipt = project.source === "native"
        ? await completeNativeQuestTransaction({ journal, contract: run.contract, completedAt: confirmedAt, ...(fault ? { fault } : {}) })
        : await completeGeneratedQuestTransaction({ journal, contract: run.contract, completedAt: confirmedAt, ...(fault ? { fault } : {}) });
      journal = await this.writeJournal(this.progress({
        ...journal,
        phase: "completed",
        error: null,
        recovery: { action: "none", message: "Quest, records, local Git, and receipt completed atomically.", concurrentPaths: [] },
      }, `Quest completed in local commit ${receipt.commitSha.slice(0, 8)}.`));
      await unlink(activeLockPath(project.projectPath));
      const freshProject = await this.loadProject(projectId, questId);
      if (freshProject.quest.implementation === "not_enabled" || freshProject.quest.implementation.runId !== journal.runId || runGit(project.projectPath, ["rev-parse", "HEAD"]) !== receipt.commitSha) {
        throw new GeneratedQuestRunConflictError("Fresh reload did not validate generated quest completion linkage.");
      }
      const architectureNote = await this.syncArchitecture(journal, "passed", "worked").catch(() => null);
      if (architectureNote) journal = await this.writeJournal(this.progress(journal, architectureNote));
      return this.snapshot(run.contract, journal, receipt);
    } catch (error) {
      if (error instanceof GeneratedReceiptPendingError) {
        journal = await this.writeJournal({
          ...journal,
          phase: "completion_pending",
          error: error.message,
          recovery: { action: "resume", message: "The unique completion commit exists; Forge can repair its ignored receipt without another commit.", concurrentPaths: [] },
        });
        return this.snapshot(run.contract, journal, null);
      }
      journal = await this.writeJournal({
        ...journal,
        phase: "failed",
        error: error instanceof Error ? error.message.slice(0, 2_000) : String(error).slice(0, 2_000),
        recovery: await assessGeneratedRecovery({ ...journal, phase: "failed" }),
      });
      return this.snapshot(run.contract, journal, null);
    }
  }

  async cancel(projectId: string, questId: string, decision: "CANCEL"): Promise<GeneratedQuestRunSnapshot> {
    if (decision !== "CANCEL") throw new GeneratedQuestRunConflictError("Generated run cancellation requires the exact CANCEL decision.");
    const project = await this.loadProject(projectId, questId);
    const lock = await this.readLock(project.projectPath);
    if (!lock || lock.questId !== questId) throw new GeneratedQuestRunNotFoundError("No generated run is active for this quest.");
    const run = await this.loadRun(project.projectPath, lock.runId);
    if (run.journal.phase === "implementing" || run.journal.phase === "verifying") {
      this.cancellationRequests.add(run.journal.runId);
      const journal = await this.writeJournal(this.progress(run.journal, "Cancellation requested; Forge will inspect the actual project state before offering recovery."));
      return this.snapshot(run.contract, journal, run.receipt);
    }
    const recovery = await assessGeneratedRecovery({ ...run.journal, phase: "cancelled" });
    const journal = await this.writeJournal({ ...run.journal, phase: "cancelled", creatorResult: "cancel", recovery });
    if (journal.changedFiles.length === 0) await unlink(activeLockPath(project.projectPath));
    return this.snapshot(run.contract, journal, run.receipt);
  }

  async prepareRepair(projectId: string, questId: string, repairRequestValue: string): Promise<GeneratedQuestRunSnapshot> {
    const repairRequest = z.string().trim().min(3).max(2_000).parse(repairRequestValue);
    const project = await this.loadProject(projectId, questId);
    const lock = await this.readLock(project.projectPath);
    if (lock && lock.questId !== questId) throw new GeneratedQuestRunConflictError("Another Step is still using this project. Finish or stop it safely first.");
    if (lock) {
      const run = await this.loadRun(project.projectPath, lock.runId);
      if (run.journal.recovery.action === "rollback") {
        await this.rollback(projectId, questId, "ROLL BACK REVIEWED CHANGES");
      } else if (run.journal.phase === "failed" && run.journal.changedFiles.length === 0) {
        await this.cancel(projectId, questId, "CANCEL");
      } else {
        throw new GeneratedQuestRunConflictError("This failed work cannot be repaired automatically until its current changes are stopped safely.");
      }
    }
    return this.prepare(projectId, questId, { repairRequest });
  }

  async rollback(projectId: string, questId: string, confirmation: "ROLL BACK REVIEWED CHANGES"): Promise<GeneratedQuestRunSnapshot> {
    if (confirmation !== "ROLL BACK REVIEWED CHANGES") throw new GeneratedQuestRunConflictError("Rollback requires the exact reviewed confirmation.");
    const project = await this.loadProject(projectId, questId);
    const lock = await this.readLock(project.projectPath);
    if (!lock || lock.questId !== questId) throw new GeneratedQuestRunNotFoundError("No generated run is active for rollback.");
    const run = await this.loadRun(project.projectPath, lock.runId);
    if (run.journal.recovery.action !== "rollback") throw new GeneratedQuestRunConflictError("Automatic rollback is not currently safe for this run.");
    const preimages = await readUnknown(path.join(runDirectory(project.projectPath, run.journal.runId), "preimages.json")) as GeneratedPreimageBundle;
    try {
      const restored = await exactRollbackGeneratedRun({ journal: run.journal, preimages });
      const journal = await this.writeJournal(this.progress({
        ...run.journal,
        phase: "cancelled",
        recovery: { action: "none", message: `Restored exact preimages for ${restored.join(", ")}.`, concurrentPaths: [] },
      }, "Forge restored only the reviewed run-owned game-file preimages."));
      await unlink(activeLockPath(project.projectPath));
      return this.snapshot(run.contract, journal, null);
    } catch (error) {
      if (error instanceof GeneratedConcurrentEditError) {
        const journal = await this.writeJournal({
          ...run.journal,
          recovery: { action: "manual", message: error.message, concurrentPaths: error.paths },
        });
        throw new GeneratedQuestRunConflictError(journal.recovery.message);
      }
      throw error;
    }
  }

  async recoverActiveRuns(): Promise<void> {
    const registry = await this.registry.load();
    for (const entry of registry.projects) {
      const projectPath = entry.canonicalPath;
      const lockValue = await readOptionalUnknown(activeLockPath(projectPath)).catch(() => null);
      if (lockValue === null) continue;
      const lock = activeLockSchema.parse(lockValue);
      const run = await this.loadRun(projectPath, lock.runId);
      let journal = run.journal;
      if (journal.phase === "completion_pending") {
        const receipt = await repairGeneratedCompletionReceipt({ journal, contract: run.contract });
        if (receipt) {
          journal = await this.writeJournal({
            ...journal,
            phase: "completed",
            error: null,
            recovery: { action: "none", message: `Repaired ignored receipt for ${receipt.commitSha.slice(0, 8)} without another commit.`, concurrentPaths: [] },
          });
          const architectureNote = await this.syncArchitecture(journal, "passed", "worked").catch(() => null);
          if (architectureNote) journal = await this.writeJournal(this.progress(journal, architectureNote));
          await unlink(activeLockPath(projectPath));
          continue;
        }
      }
      if (journal.phase === "implementing" || journal.phase === "verifying") {
        const boundary = await reviewBoundary({ projectPath, startHead: journal.startHead, startInventory: journal.startInventory, allowedFiles: journal.allowedFiles });
        journal = { ...journal, phase: "interrupted", changedFiles: boundary.changedFiles, observedPostHashes: boundary.observedPostHashes, error: "Forge restarted while this run was active." };
      }
      journal = await this.writeJournal({ ...journal, recovery: await assessGeneratedRecovery(journal) });
    }
  }
}
