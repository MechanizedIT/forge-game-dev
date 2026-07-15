import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
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
  generatedRoadmapV2Schema,
  gitBaselineResultSchema,
  roadmapSchema,
  topDownArenaStarterManifestSchema,
  type GeneratedQuestArtifactV2,
  type GeneratedQuestImplementationContract,
  type GeneratedQuestRunJournal,
  type GeneratedRoadmapV2,
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

const activeLockSchema = z.object({
  schemaVersion: z.literal(1),
  projectId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  questId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  runId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  createdAt: z.string().datetime({ offset: true }),
}).strict();

interface LoadedProject {
  projectPath: string;
  manifest: z.infer<typeof generatedProjectManifestSchema>;
  starter: z.infer<typeof topDownArenaStarterManifestSchema>;
  baselineHead: string;
  roadmap: GeneratedRoadmapV2;
  quest: GeneratedQuestArtifactV2;
  questRelativePath: string;
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
}

function activeLockPath(projectPath: string): string {
  return path.join(projectPath, ".forge", "local", "active-generated-run.json");
}

function runDirectory(projectPath: string, runId: string): string {
  return path.join(projectPath, ".forge", "local", "runs", runId);
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

async function defaultLaunchGame(input: {
  projectId: string;
  projectPath: string;
  forgeHome: string;
}): Promise<GeneratedGameLaunchResult> {
  const godot = await ensurePinnedGodot({ forgeHome: input.forgeHome });
  const child = spawn(godot.executable, ["--path", input.projectPath], {
    cwd: input.projectPath,
    detached: true,
    stdio: "ignore",
    windowsHide: false,
  });
  child.unref();
  return { launched: true, version: godot.version, message: `Launched ${input.projectId} with pinned Godot ${godot.version}.` };
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
    const starter = topDownArenaStarterManifestSchema.parse(await readUnknown(path.join(projectPath, manifest.starter.manifest)));
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
    const node = roadmap.quests.find((item) => item.questId === questId);
    if (!node) throw new GeneratedQuestRunNotFoundError(`Quest ${questId} is not in project ${projectId}.`);
    const relativeQuestPath = questRelativePath(manifest.artifacts.questsDirectory, questId);
    const questAny = generatedQuestArtifactAnySchema.parse(await readUnknown(path.join(projectPath, relativeQuestPath)));
    const quest = normalizeGeneratedQuest(questAny, node.state);
    if (quest.projectId !== projectId || quest.questId !== questId || quest.revision !== node.revision) {
      throw new GeneratedQuestRunConflictError("Generated quest and roadmap revision identity do not match.");
    }
    return {
      projectPath,
      manifest,
      starter,
      baselineHead: baseline.commitSha,
      roadmap,
      quest,
      questRelativePath: relativeQuestPath,
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
    if (contract.fingerprint !== journal.contractFingerprint || contract.projectId !== journal.projectId || contract.questId !== journal.questId) {
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
      projectId: journal.projectId,
      questId: journal.questId,
      phase: journal.phase,
      contract,
      progress: journal.progress,
      proofs: journal.proofs,
      changedFiles: journal.changedFiles,
      creatorResult: journal.creatorResult,
      error: journal.error,
      recovery: journal.recovery,
      receipt,
      actions: {
        approve: journal.phase === "contract_review",
        start: journal.phase === "approved",
        play: journal.phase === "waiting_for_playtest",
        confirm: journal.phase === "waiting_for_playtest",
        retry: journal.phase === "failed" && journal.changedFiles.length === 0,
        cancel: ["contract_review", "approved", "implementing", "waiting_for_playtest"].includes(journal.phase),
        rollback: safeRollback,
      },
    };
  }

  private async writeJournal(journal: GeneratedQuestRunJournal): Promise<GeneratedQuestRunJournal> {
    const parsed = generatedQuestRunJournalSchema.parse({ ...journal, updatedAt: this.now().toISOString() });
    await writeJsonAtomic(path.join(runDirectory(parsed.canonicalProjectPath, parsed.runId), "journal.json"), parsed);
    this.emit({ type: "refresh", projectId: parsed.projectId, questId: parsed.questId, phase: parsed.phase });
    return parsed;
  }

  private progress(journal: GeneratedQuestRunJournal, message: string): GeneratedQuestRunJournal {
    const progress = journal.progress.at(-1) === message ? journal.progress : [...journal.progress, message].slice(-24);
    this.emit({ type: "progress", projectId: journal.projectId, questId: journal.questId, phase: journal.phase, message });
    return { ...journal, progress };
  }

  async getSummary(projectId: string, questId: string): Promise<GeneratedQuestRunnerSummary> {
    const project = await this.loadProject(projectId, questId);
    const lock = await this.readLock(project.projectPath);
    let reason: string | null = null;
    if (project.quest.questId !== "q1-enter-the-arena") reason = "Task A supports only the prepared first generated quest.";
    else if (project.quest.revision < 2) reason = "Adjust this outcome to the bounded gravity-orb quest before Build.";
    else if (project.quest.implementation !== "not_enabled") reason = "This quest is already completed.";
    else if (project.quest.state !== "available") reason = `This quest is ${project.quest.state}.`;
    else if (lock && lock.questId !== questId) reason = "Another generated quest run owns the project lock.";
    const eligibility = { eligible: reason === null, reason, revision: project.quest.revision, state: project.quest.state };
    let runId = lock?.questId === questId ? lock.runId : null;
    if (!runId && project.quest.implementation !== "not_enabled") runId = project.quest.implementation.runId;
    const run = runId ? await this.loadRun(project.projectPath, runId) : null;
    return { eligibility, run: run ? this.snapshot(run.contract, run.journal, run.receipt) : null };
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
    if (await this.readLock(project.projectPath)) throw new GeneratedQuestRunConflictError("Adjust is unavailable while a generated run owns the project lock.");
    inspectCleanGitStart(project.projectPath, project.baselineHead);
    if (questId !== "q1-enter-the-arena" || project.quest.sequence !== 1) throw new GeneratedQuestRunConflictError("Task A adjustment supports only the first Gravity Tap quest.");
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

  async prepare(projectId: string, questId: string): Promise<GeneratedQuestRunSnapshot> {
    const project = await this.loadProject(projectId, questId);
    if (await this.readLock(project.projectPath)) throw new GeneratedQuestRunConflictError("This project already has an active generated quest run.");
    if (project.quest.revision < 2) throw new GeneratedQuestRunConflictError("Adjust and accept the bounded gravity-orb outcome before Build.");
    const git = inspectCleanGitStart(project.projectPath, project.baselineHead);
    const startInventory = await captureControlledInventory(project.projectPath);
    const contract = await buildGeneratedQuestContract({
      projectPath: project.projectPath,
      starterId: project.starter.starterId,
      starterVersion: project.starter.version,
      quest: project.quest,
      dependencyStates: new Map(project.roadmap.quests.map((node) => [node.questId, node.state])),
    });
    const context = await buildGeneratedQuestContext(project.projectPath, contract);
    const suffix = this.randomId().toLowerCase().replace(/[^a-f0-9]/gu, "").slice(0, 12);
    if (suffix.length < 8) throw new GeneratedQuestRunConflictError("Forge could not allocate a generated run ID.");
    const runId = `run-${questId}-${this.now().getTime()}-${suffix}`;
    const createdAt = this.now().toISOString();
    const journal = generatedQuestRunJournalSchema.parse({
      schemaVersion: 1,
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
      startInventory,
      observedPostHashes: {},
      changedFiles: [],
      progress: ["Prepared the bounded quest contract for creator review."],
      proofs: createPendingGeneratedProof(),
      creatorResult: null,
      codexThreadId: null,
      error: null,
      recovery: { action: "resume", message: "Review and approve the exact contract to continue.", concurrentPaths: [] },
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
      recovery: { action: "resume", message: "The exact contract is approved and ready to start.", concurrentPaths: [] },
    }, "Creator approved the exact existing-file implementation contract."));
    return this.snapshot(run.contract, journal, run.receipt);
  }

  async start(projectId: string, questId: string): Promise<GeneratedQuestRunSnapshot> {
    if (!this.codexExecutor) throw new GeneratedQuestRunConflictError("The official Codex executor is unavailable.");
    const project = await this.loadProject(projectId, questId);
    const lock = await this.readLock(project.projectPath);
    if (!lock || lock.questId !== questId) throw new GeneratedQuestRunNotFoundError("No approved generated run is active for this quest.");
    const run = await this.loadRun(project.projectPath, lock.runId);
    if (run.journal.phase !== "approved") throw new GeneratedQuestRunConflictError("Only an approved generated contract can start.");
    const git = inspectCleanGitStart(project.projectPath, project.baselineHead);
    const inventory = await captureControlledInventory(project.projectPath);
    if (git.startHead !== run.journal.startHead || !sameInventory(inventory, run.journal.startInventory) || project.quest.revision !== run.journal.questRevision) {
      throw new GeneratedQuestRunConflictError("Project HEAD, inventory, or quest revision changed after contract approval.");
    }
    const context = await buildGeneratedQuestContext(project.projectPath, run.contract);
    let journal = await this.writeJournal(this.progress({
      ...run.journal,
      phase: "implementing",
      recovery: { action: "none", message: "Codex is running inside the approved workspace boundary.", concurrentPaths: [] },
    }, "Codex is updating only the approved existing game files."));
    const execution = this.execute(journal, run.contract, context.prompt).finally(() => this.executions.delete(journal.runId));
    this.executions.set(journal.runId, execution);
    return this.snapshot(run.contract, journal, run.receipt);
  }

  private async execute(initial: GeneratedQuestRunJournal, contract: GeneratedQuestImplementationContract, prompt: string): Promise<void> {
    const events: Record<string, unknown>[] = [];
    let journal = initial;
    let codexError: string | null = null;
    let turnCompleted = false;
    try {
      const session = await this.codexExecutor!.start({ prompt, workspacePath: journal.canonicalProjectPath });
      for await (const event of session.events) {
        events.push(eventRecord(event));
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
    const boundary = await reviewBoundary({
      projectPath: journal.canonicalProjectPath,
      startHead: journal.startHead,
      startInventory: journal.startInventory,
      allowedFiles: journal.allowedFiles,
    });
    journal = {
      ...journal,
      phase: "verifying",
      changedFiles: boundary.changedFiles,
      observedPostHashes: boundary.observedPostHashes,
    };
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
      ...(this.proofDependencies ? { dependencies: this.proofDependencies } : {}),
    });
    const verifiedBoundary = await reviewBoundary({
      projectPath: journal.canonicalProjectPath,
      startHead: journal.startHead,
      startInventory: journal.startInventory,
      allowedFiles: journal.allowedFiles,
    });
    const passed = automatedProofPassed(proofs);
    const recovery = passed
      ? { action: "resume" as const, message: "Automated proof passed; launch and play the real game.", concurrentPaths: [] }
      : verifiedBoundary.problems.some((problem) => /(?:New file|deleted|Unapproved|Git reported|HEAD changed)/u.test(problem))
        ? { action: "manual" as const, message: "Verification found changes outside the safe rollback boundary.", concurrentPaths: [] }
        : await assessGeneratedRecovery({ ...journal, proofs, phase: "failed", changedFiles: verifiedBoundary.changedFiles, observedPostHashes: verifiedBoundary.observedPostHashes });
    await this.writeJournal(this.progress({
      ...journal,
      proofs,
      changedFiles: verifiedBoundary.changedFiles,
      observedPostHashes: verifiedBoundary.observedPostHashes,
      phase: passed ? "waiting_for_playtest" : "failed",
      error: passed ? null : "One or more independent automated proof layers failed.",
      recovery,
    }, passed ? "Automated proof passed. The creator must play the real game next." : "Automated proof failed; the quest remains incomplete."));
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
      throw new GeneratedQuestRunConflictError("All three automated proof layers must pass before the real playtest.");
    }
    const result = await this.launchGame({ projectId, projectPath: project.projectPath, forgeHome: this.forgeHome });
    await this.writeJournal(this.progress(run.journal, "The real game launched; creator confirmation is still required."));
    return result;
  }

  async confirm(projectId: string, questId: string, resultValue: unknown): Promise<GeneratedQuestRunSnapshot> {
    const result = generatedCreatorResultSchema.parse(resultValue);
    const project = await this.loadProject(projectId, questId);
    const lock = await this.readLock(project.projectPath);
    if (!lock || lock.questId !== questId) throw new GeneratedQuestRunNotFoundError("No generated playtest is active for this quest.");
    const run = await this.loadRun(project.projectPath, lock.runId);
    if (run.journal.phase !== "waiting_for_playtest") throw new GeneratedQuestRunConflictError("Creator confirmation is available only after automated proof and play launch.");
    const confirmedAt = this.now().toISOString();
    if (result !== "worked") {
      const phase = result === "cancel" ? "cancelled" as const : result === "did_not_work" ? "failed" as const : "waiting_for_playtest" as const;
      const recovery = phase === "waiting_for_playtest"
        ? { action: "resume" as const, message: "The quest remains ready for another real playtest; it is not complete.", concurrentPaths: [] }
        : await assessGeneratedRecovery({ ...run.journal, phase, creatorResult: result });
      const journal = await this.writeJournal(this.progress({
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
      return this.snapshot(run.contract, journal, run.receipt);
    }

    let journal = await this.writeJournal(this.progress({
      ...run.journal,
      phase: "completion_pending",
      creatorResult: "worked",
      proofs: {
        ...run.journal.proofs,
        creator: { result: "passed", summary: "The creator confirmed the visible gravity orb in the real game.", evidence: [`Creator chose worked at ${confirmedAt}.`], verifiedAt: confirmedAt },
      },
      recovery: { action: "none", message: "Forge is rerunning proof before the atomic completion transaction.", concurrentPaths: [] },
    }, "Creator confirmed the visible result. Forge is rerunning all automated proof."));
    const rerun = await runGeneratedAutomatedProof({
      journal,
      forgeHome: this.forgeHome,
      now: this.now,
      ...(this.proofDependencies ? { dependencies: this.proofDependencies } : {}),
    });
    rerun.creator = journal.proofs.creator;
    if (!automatedProofPassed(rerun)) {
      journal = await this.writeJournal({
        ...journal,
        phase: "failed",
        proofs: rerun,
        error: "Final automated proof failed after creator confirmation; no completion commit was created.",
        recovery: await assessGeneratedRecovery({ ...journal, phase: "failed", proofs: rerun }),
      });
      return this.snapshot(run.contract, journal, null);
    }
    journal = await this.writeJournal({ ...journal, proofs: rerun });
    try {
      const fault = this.completionFault?.();
      const receipt = await completeGeneratedQuestTransaction({
        journal,
        contract: run.contract,
        completedAt: confirmedAt,
        ...(fault ? { fault } : {}),
      });
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
