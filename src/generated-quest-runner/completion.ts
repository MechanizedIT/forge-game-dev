import { createHash } from "node:crypto";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  chronicleAnySchema,
  chronicleV2Schema,
  acceptedSystemQuestPlanSchema,
  acceptedSystemRoadmapSchema,
  firstPlayableMilestoneSchema,
  gameVisionSchema,
  generatedCompletionReceiptSchema,
  generatedProjectManifestSchema,
  generatedProjectStateAnySchema,
  generatedProjectStateV2Schema,
  generatedQuestCompletionSchema,
  generatedQuestArtifactAnySchema,
  generatedQuestArtifactV2Schema,
  generatedRoadmapV2Schema,
  type ChronicleV2,
  type GeneratedCompletionReceipt,
  type GeneratedProjectManifest,
  type GeneratedQuestImplementationContract,
  type GeneratedQuestRunJournal,
  type GeneratedRoadmapV2,
} from "../contracts/index.js";
import { roadmapSchema } from "../contracts/roadmap.js";
import { writeJsonAtomic, writeTextAtomic } from "../quest-runner/artifacts.js";
import { normalizeGeneratedQuest, normalizeGeneratedRoadmap } from "./contract.js";
import { runGit } from "./boundary.js";
import { nativeWorkOrderFingerprint } from "./native-quest.js";

export type GeneratedCompletionFault = "after_artifact_write" | "before_commit" | "after_commit_before_receipt";

export class GeneratedReceiptPendingError extends Error {
  constructor(readonly commitSha: string) {
    super(`Completion commit ${commitSha} succeeded, but its ignored receipt still needs repair.`);
    this.name = "GeneratedReceiptPendingError";
  }
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function digest(contents: Buffer): string {
  return createHash("sha256").update(contents).digest("hex");
}

export function renderGeneratedQuestMarkdown(quest: ReturnType<typeof generatedQuestArtifactV2Schema.parse>): string {
  const implementation = quest.implementation === "not_enabled"
    ? "Implementation is ready for a reviewed Forge contract."
    : `Completed by run \`${quest.implementation.runId}\` at ${quest.implementation.completedAt}.`;
  return `# ${quest.title}\n\n${quest.visibleOutcome}\n\n## Scope\n\nIncluded:\n${quest.scope.included.map((item) => `- ${item}`).join("\n")}\n\nExcluded:\n${quest.scope.excluded.map((item) => `- ${item}`).join("\n")}\n\n## Acceptance and proof\n\n${quest.acceptanceCriteria.map((criterion) => `- **${criterion.id}:** ${criterion.criterion}\n  - Proof: ${criterion.verificationIds.join(", ")}`).join("\n")}\n\n## Forge implementation\n\n${implementation}\n`;
}

export function renderGeneratedRoadmapMarkdown(roadmap: GeneratedRoadmapV2): string {
  return `# Roadmap\n\n${roadmap.quests.map((quest, index) => `${index + 1}. **${quest.title}** · ${quest.state} — ${quest.summary}`).join("\n")}\n`;
}

export function renderGeneratedChronicleMarkdown(chronicle: ChronicleV2): string {
  return `# Chronicle\n\n${chronicle.entries.map((entry) => `- ${entry.occurredAt} — ${entry.summary}${entry.type === "quest_completed" ? ` (run ${entry.runId})` : ""}`).join("\n")}\n`;
}

async function readParsed<T>(filePath: string, schema: { parse: (value: unknown) => T }): Promise<T> {
  return schema.parse(JSON.parse(await readFile(filePath, "utf8")) as unknown);
}

async function writeBufferAtomic(filePath: string, contents: Buffer): Promise<void> {
  const temporaryPath = `${filePath}.${process.pid}-${Date.now()}.tmp`;
  try {
    await writeFile(temporaryPath, contents, { flag: "wx" });
    await rename(temporaryPath, filePath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

function questPath(manifest: GeneratedProjectManifest, questId: string): string {
  return path.posix.join(manifest.artifacts.questsDirectory.replaceAll("\\", "/"), `${questId}.json`);
}

export async function completeGeneratedQuestTransaction(options: {
  journal: GeneratedQuestRunJournal;
  contract: GeneratedQuestImplementationContract;
  completedAt: string;
  fault?: GeneratedCompletionFault;
}): Promise<GeneratedCompletionReceipt> {
  const { journal, contract } = options;
  const root = journal.canonicalProjectPath;
  const manifest = await readParsed(path.join(root, ".forge", "project-manifest.json"), generatedProjectManifestSchema);
  const questRelative = questPath(manifest, contract.questId);
  const questAny = await readParsed(path.join(root, questRelative), generatedQuestArtifactAnySchema);
  const roadmapAnyValue = JSON.parse(await readFile(path.join(root, manifest.artifacts.roadmap), "utf8")) as unknown;
  const roadmapAny = generatedRoadmapV2Schema.safeParse(roadmapAnyValue).success
    ? generatedRoadmapV2Schema.parse(roadmapAnyValue)
    : roadmapSchema.parse(roadmapAnyValue);
  const chronicleAny = await readParsed(path.join(root, manifest.artifacts.chronicle), chronicleAnySchema);
  const stateAny = await readParsed(path.join(root, manifest.artifacts.projectState), generatedProjectStateAnySchema);
  const vision = await readParsed(path.join(root, manifest.artifacts.vision), gameVisionSchema);
  const firstPlayable = await readParsed(path.join(root, manifest.artifacts.firstPlayable), firstPlayableMilestoneSchema);
  const roadmap = normalizeGeneratedRoadmap(roadmapAny);
  const node = roadmap.quests.find((item) => item.questId === contract.questId);
  if (!node) throw new Error("Completion quest is missing from the generated roadmap.");
  const quest = normalizeGeneratedQuest(questAny, node.state);
  if (quest.revision !== contract.questRevision || quest.state !== "available") throw new Error("Quest revision or state changed after contract approval.");
  if (journal.changedFiles.length === 0) throw new Error("Completion requires at least one reviewed source change.");

  const completedQuest = generatedQuestArtifactV2Schema.parse({
    ...quest,
    state: "completed",
    implementation: {
      status: "completed",
      runId: journal.runId,
      completedAt: options.completedAt,
      changedFiles: journal.changedFiles,
      verificationProfile: contract.verificationProfile,
      contractFingerprint: contract.fingerprint,
      creatorConfirmation: "worked",
    },
  });
  const completedIds = new Set(roadmap.quests.filter((item) => item.state === "completed").map((item) => item.questId));
  completedIds.add(contract.questId);
  const completedRoadmap = generatedRoadmapV2Schema.parse({
    ...roadmap,
    updatedAt: options.completedAt,
    quests: roadmap.quests.map((item) => {
      if (item.questId === contract.questId) return { ...item, revision: completedQuest.revision, state: "completed" as const, summary: completedQuest.visibleOutcome };
      if (item.state === "deferred" || item.state === "completed") return item;
      return { ...item, state: item.dependsOn.every((dependency) => completedIds.has(dependency)) ? "available" as const : "blocked" as const };
    }),
  });
  const next = completedRoadmap.quests.find((item) => item.state === "available")?.questId ?? null;
  const chronicleEntries = chronicleAny.entries.map((entry) => ({ ...entry }));
  const completedChronicle = chronicleV2Schema.parse({
    schemaVersion: 2,
    projectId: journal.projectId,
    entries: [...chronicleEntries, {
      entryId: `quest-completed-${journal.runId}`,
      type: "quest_completed",
      occurredAt: options.completedAt,
      summary: `Completed ${completedQuest.title}: ${completedQuest.visibleOutcome}`,
      questId: contract.questId,
      runId: journal.runId,
      visibleOutcome: completedQuest.visibleOutcome,
    }],
  });
  const completedState = generatedProjectStateV2Schema.parse({
    ...stateAny,
    schemaVersion: 2,
    selectedQuestId: contract.questId,
    nextRecommendedQuestId: next,
  });
  const projectMarkdown = `# ${manifest.displayName}\n\n${vision.vision}\n\n## First playable\n\n${firstPlayable.outcome}\n\n## Foundation\n\nGodot 4 · 2D · GDScript · Top-down Arena · code-native visuals\n\n## Completed quests\n\n- **${completedQuest.title}** — ${completedQuest.visibleOutcome} (run \`${journal.runId}\`)\n`;
  const artifacts = new Map<string, string>([
    [questRelative, json(completedQuest)],
    [manifest.artifacts.roadmap, json(completedRoadmap)],
    [manifest.artifacts.chronicle, json(completedChronicle)],
    [manifest.artifacts.projectState, json(completedState)],
    [`.forge/docs/quests/${contract.questId}.md`, renderGeneratedQuestMarkdown(completedQuest)],
    [".forge/docs/roadmap.md", renderGeneratedRoadmapMarkdown(completedRoadmap)],
    [".forge/docs/chronicle.md", renderGeneratedChronicleMarkdown(completedChronicle)],
    ["PROJECT.md", projectMarkdown],
  ]);
  const artifactPreimages = new Map<string, Buffer>();
  for (const relativePath of artifacts.keys()) artifactPreimages.set(relativePath, await readFile(path.join(root, relativePath)));
  const artifactNames = [...artifacts.keys()].sort();
  const exactManifest = [...new Set([...journal.changedFiles, ...artifactNames])].sort();
  const stateRelative = manifest.artifacts.projectState.replaceAll("\\", "/");
  const stateFlag = runGit(root, ["ls-files", "-v", "--", stateRelative], true);
  const hadSkipWorktree = /^[Ss]/u.test(stateFlag);
  let committed = false;
  try {
    for (const [relativePath, contents] of artifacts) {
      await writeTextAtomic(path.join(root, relativePath), contents);
    }
    await readParsed(path.join(root, questRelative), generatedQuestArtifactV2Schema);
    await readParsed(path.join(root, manifest.artifacts.roadmap), generatedRoadmapV2Schema);
    await readParsed(path.join(root, manifest.artifacts.chronicle), chronicleV2Schema);
    await readParsed(path.join(root, manifest.artifacts.projectState), generatedProjectStateV2Schema);
    if (options.fault === "after_artifact_write") throw new Error("Injected completion failure after artifact write.");
    if (hadSkipWorktree) runGit(root, ["update-index", "--no-skip-worktree", "--", stateRelative]);
    runGit(root, ["add", "--", ...exactManifest]);
    const staged = runGit(root, ["diff", "--cached", "--name-only", "--"]).split(/\r?\n/u).filter(Boolean).sort();
    if (JSON.stringify(staged) !== JSON.stringify(exactManifest)) {
      throw new Error(`Completion staged manifest mismatch. Expected ${exactManifest.join(", ")}; received ${staged.join(", ")}.`);
    }
    if (options.fault === "before_commit") throw new Error("Injected completion failure before commit.");
    runGit(root, ["commit", "-m", `forge: complete ${contract.questId} [run:${journal.runId}]`]);
    committed = true;
    const commitSha = runGit(root, ["rev-parse", "HEAD"]);
    if (options.fault === "after_commit_before_receipt") throw new GeneratedReceiptPendingError(commitSha);
    const receipt = generatedCompletionReceiptSchema.parse({
      schemaVersion: 1,
      projectId: journal.projectId,
      questId: contract.questId,
      runId: journal.runId,
      commitSha,
      treeSha: runGit(root, ["rev-parse", "HEAD^{tree}"]),
      committedAt: runGit(root, ["show", "-s", "--format=%cI", "HEAD"]),
    });
    await writeJsonAtomic(path.join(root, ".forge", "local", "runs", journal.runId, "commit.json"), receipt);
    return receipt;
  } catch (error) {
    if (committed || error instanceof GeneratedReceiptPendingError) throw error;
    runGit(root, ["restore", "--staged", "--", ...exactManifest], true);
    for (const [relativePath, contents] of artifactPreimages) await writeBufferAtomic(path.join(root, relativePath), contents);
    throw error;
  } finally {
    if (hadSkipWorktree) runGit(root, ["update-index", "--skip-worktree", "--", stateRelative], true);
  }
}

function renderNativeQuestMarkdown(quest: ReturnType<typeof acceptedSystemQuestPlanSchema.parse>["systems"][number]["quests"][number]): string {
  return `# ${quest.title}\n\n${quest.playerVisibleOutcome}\n\n## Done when\n\n${quest.doneWhen.map((item) => `- ${item}`).join("\n")}\n\n## Not included\n\n${quest.excludedScope.map((item) => `- ${item}`).join("\n")}\n\n## Forge work\n\n${quest.implementation ? `Completed by run \`${quest.implementation.runId}\` at ${quest.implementation.completedAt}.` : "Ready for a creator-confirmed work plan."}\n`;
}

function renderNativeRoadmapMarkdown(
  roadmap: ReturnType<typeof acceptedSystemRoadmapSchema.parse>,
  plan: ReturnType<typeof acceptedSystemQuestPlanSchema.parse>,
  legacyRoadmap: GeneratedRoadmapV2,
): string {
  const batches = new Map(plan.systems.map((system) => [system.systemId, system]));
  const legacyById = new Map(legacyRoadmap.quests.map((quest) => [quest.questId, quest]));
  return `# Roadmap\n\n${roadmap.systems.map((system) => {
    const legacyLines = system.questIds.map((questId) => legacyById.get(questId)).filter((quest): quest is GeneratedRoadmapV2["quests"][number] => quest !== undefined)
      .map((quest) => `- **${quest.title}** · ${quest.state} — ${quest.summary}`);
    const nativeLines = (batches.get(system.systemId)?.quests ?? []).map((quest) => `- **${quest.title}** · ${quest.implementation ? "completed" : "planned"} — ${quest.playerVisibleOutcome}`);
    const lines = [...legacyLines, ...nativeLines];
    const questLines = lines.length === 0 ? "- No creator-planned quests yet." : lines.join("\n");
    return `## ${system.title}\n\n${system.outcome}\n\n${questLines}`;
  }).join("\n\n")}\n`;
}

export async function completeNativeQuestTransaction(options: {
  journal: GeneratedQuestRunJournal;
  contract: GeneratedQuestImplementationContract;
  completedAt: string;
  fault?: GeneratedCompletionFault;
}): Promise<GeneratedCompletionReceipt> {
  const { journal, contract } = options;
  const root = journal.canonicalProjectPath;
  if (contract.schemaVersion !== 2 || contract.verificationProfile !== null) throw new Error("Native quest completion requires the profile-free work-session contract.");
  const manifest = await readParsed(path.join(root, ".forge", "project-manifest.json"), generatedProjectManifestSchema);
  const systemRoadmapPath = ".forge/system-roadmap.json";
  const systemQuestPath = ".forge/system-quests.json";
  const systemRoadmapBytes = await readFile(path.join(root, systemRoadmapPath));
  const systemQuestBytes = await readFile(path.join(root, systemQuestPath));
  const systemRoadmap = acceptedSystemRoadmapSchema.parse(JSON.parse(systemRoadmapBytes.toString("utf8")) as unknown);
  const systemQuestPlan = acceptedSystemQuestPlanSchema.parse(JSON.parse(systemQuestBytes.toString("utf8")) as unknown);
  const startHashes = new Map(journal.startInventory.map((entry) => [entry.relativePath, entry.sha256]));
  if (startHashes.get(systemRoadmapPath) !== digest(systemRoadmapBytes) || startHashes.get(systemQuestPath) !== digest(systemQuestBytes)) throw new Error("The saved Forge planning files changed after the work plan was confirmed.");
  if (systemRoadmap.projectId !== journal.projectId || systemQuestPlan.projectId !== journal.projectId) throw new Error("Native completion planning records belong to another project.");
  const matches = systemQuestPlan.systems.flatMap((system) => system.quests.map((quest) => ({ system, quest }))).filter((item) => item.quest.questId === contract.questId);
  if (matches.length !== 1) throw new Error("Native completion quest is missing or ambiguous.");
  const match = matches[0]!;
  const quest = match.quest;
  if (!quest.workOrder || quest.implementation) throw new Error("Native completion requires one incomplete creator-confirmed quest plan.");
  if (nativeWorkOrderFingerprint(quest) !== quest.workOrder.fingerprint) throw new Error("Native completion work plan no longer matches its confirmed fingerprint.");
  const expectedFiles = [...quest.workOrder.existingFiles, ...quest.workOrder.newFiles];
  if (JSON.stringify(contract.allowedFiles.map((file) => file.relativePath)) !== JSON.stringify(expectedFiles)) throw new Error("Native completion files no longer match the confirmed work plan.");
  if (contract.questRevision !== 1 || contract.visibleOutcome !== quest.playerVisibleOutcome || journal.changedFiles.length === 0) throw new Error("Native completion contract no longer matches the accepted quest.");

  const completion = generatedQuestCompletionSchema.parse({
    status: "completed",
    runId: journal.runId,
    completedAt: options.completedAt,
    changedFiles: journal.changedFiles,
    verificationProfile: null,
    contractFingerprint: contract.fingerprint,
    creatorConfirmation: "worked",
  });
  const completedPlan = acceptedSystemQuestPlanSchema.parse({
    ...systemQuestPlan,
    systems: systemQuestPlan.systems.map((system) => ({
      ...system,
      quests: system.quests.map((candidate) => candidate.questId === quest.questId ? { ...candidate, implementation: completion } : candidate),
    })),
  });
  const completedIds = new Set<string>();
  const legacyRoadmapAny = JSON.parse(await readFile(path.join(root, manifest.artifacts.roadmap), "utf8")) as unknown;
  const legacyRoadmap = normalizeGeneratedRoadmap(generatedRoadmapV2Schema.safeParse(legacyRoadmapAny).success ? generatedRoadmapV2Schema.parse(legacyRoadmapAny) : roadmapSchema.parse(legacyRoadmapAny));
  for (const item of legacyRoadmap.quests) if (item.state === "completed") completedIds.add(item.questId);
  for (const system of completedPlan.systems) for (const item of system.quests) if (item.implementation) completedIds.add(item.questId);
  const next = completedPlan.systems.flatMap((system) => system.quests).find((item) => !item.implementation && item.dependsOn.every((dependency) => completedIds.has(dependency)))?.questId
    ?? legacyRoadmap.quests.find((item) => item.state === "available")?.questId
    ?? null;

  const chronicleAny = await readParsed(path.join(root, manifest.artifacts.chronicle), chronicleAnySchema);
  const completedChronicle = chronicleV2Schema.parse({
    schemaVersion: 2,
    projectId: journal.projectId,
    entries: [...chronicleAny.entries.map((entry) => ({ ...entry })), {
      entryId: `quest-completed-${journal.runId}`,
      type: "quest_completed",
      occurredAt: options.completedAt,
      summary: `Completed ${quest.title}: ${quest.playerVisibleOutcome}`,
      questId: quest.questId,
      runId: journal.runId,
      visibleOutcome: quest.playerVisibleOutcome,
    }],
  });
  const stateAny = await readParsed(path.join(root, manifest.artifacts.projectState), generatedProjectStateAnySchema);
  const completedState = generatedProjectStateV2Schema.parse({ ...stateAny, schemaVersion: 2, selectedQuestId: quest.questId, nextRecommendedQuestId: next });
  const vision = await readParsed(path.join(root, manifest.artifacts.vision), gameVisionSchema);
  const firstPlayable = await readParsed(path.join(root, manifest.artifacts.firstPlayable), firstPlayableMilestoneSchema);
  const completedLines = [
    ...legacyRoadmap.quests.filter((item) => item.state === "completed").map((item) => `- **${item.title}** — ${item.summary}`),
    ...completedPlan.systems.flatMap((system) => system.quests).filter((item) => item.implementation).map((item) => `- **${item.title}** — ${item.playerVisibleOutcome} (run \`${item.implementation!.runId}\`)`),
  ];
  const projectMarkdown = `# ${manifest.displayName}\n\n${vision.vision}\n\n## First playable\n\n${firstPlayable.outcome}\n\n## Foundation\n\nGodot 4 · 2D · GDScript · Top-down Arena · code-native visuals\n\n## Completed quests\n\n${completedLines.join("\n")}\n`;
  const completedQuest = completedPlan.systems.flatMap((system) => system.quests).find((item) => item.questId === quest.questId)!;
  const artifacts = new Map<string, string>([
    [systemQuestPath, json(completedPlan)],
    [manifest.artifacts.chronicle, json(completedChronicle)],
    [manifest.artifacts.projectState, json(completedState)],
    [`.forge/docs/quests/${quest.questId}.md`, renderNativeQuestMarkdown(completedQuest)],
    [".forge/docs/roadmap.md", renderNativeRoadmapMarkdown(systemRoadmap, completedPlan, legacyRoadmap)],
    [".forge/docs/chronicle.md", renderGeneratedChronicleMarkdown(completedChronicle)],
    ["PROJECT.md", projectMarkdown],
  ]);
  const preimages = new Map<string, Buffer | null>();
  const expectedArtifactChanges: string[] = [];
  for (const [relativePath, contents] of artifacts) {
    const previous = await readFile(path.join(root, relativePath)).catch((error: NodeJS.ErrnoException) => error.code === "ENOENT" ? null : Promise.reject(error));
    preimages.set(relativePath, previous);
    if (previous === null || previous.toString("utf8") !== contents) expectedArtifactChanges.push(relativePath);
  }
  const planningRoadmapDirty = runGit(root, ["status", "--porcelain", "--untracked-files=all", "--", systemRoadmapPath], true) !== "";
  const stageCandidates = [...new Set([...journal.changedFiles, ...artifacts.keys(), systemRoadmapPath])].sort();
  const exactManifest = [...new Set([...journal.changedFiles, ...expectedArtifactChanges, ...(planningRoadmapDirty ? [systemRoadmapPath] : [])])].sort();
  const stateRelative = manifest.artifacts.projectState.replaceAll("\\", "/");
  const hadSkipWorktree = /^[Ss]/u.test(runGit(root, ["ls-files", "-v", "--", stateRelative], true));
  let committed = false;
  try {
    for (const [relativePath, contents] of artifacts) await writeTextAtomic(path.join(root, relativePath), contents);
    await readParsed(path.join(root, systemQuestPath), acceptedSystemQuestPlanSchema);
    await readParsed(path.join(root, manifest.artifacts.chronicle), chronicleV2Schema);
    await readParsed(path.join(root, manifest.artifacts.projectState), generatedProjectStateV2Schema);
    if (digest(await readFile(path.join(root, systemRoadmapPath))) !== startHashes.get(systemRoadmapPath)) throw new Error("The saved system roadmap changed during completion.");
    for (const [relativePath, contents] of artifacts) if (await readFile(path.join(root, relativePath), "utf8") !== contents) throw new Error(`A completion record changed unexpectedly: ${relativePath}`);
    if (options.fault === "after_artifact_write") throw new Error("Injected completion failure after artifact write.");
    if (hadSkipWorktree) runGit(root, ["update-index", "--no-skip-worktree", "--", stateRelative]);
    runGit(root, ["add", "--", ...stageCandidates]);
    const staged = runGit(root, ["diff", "--cached", "--name-only", "--"]).split(/\r?\n/u).filter(Boolean).sort();
    if (JSON.stringify(staged) !== JSON.stringify(exactManifest)) throw new Error(`Native completion staged manifest mismatch. Expected ${exactManifest.join(", ")}; received ${staged.join(", ")}.`);
    if (digest(await readFile(path.join(root, systemRoadmapPath))) !== startHashes.get(systemRoadmapPath)) throw new Error("The saved system roadmap changed before the completion commit.");
    for (const [relativePath, contents] of artifacts) if (await readFile(path.join(root, relativePath), "utf8") !== contents) throw new Error(`A staged completion record changed unexpectedly: ${relativePath}`);
    if (options.fault === "before_commit") throw new Error("Injected completion failure before commit.");
    runGit(root, ["commit", "-m", `forge: complete ${contract.questId} [run:${journal.runId}]`]);
    committed = true;
    const commitSha = runGit(root, ["rev-parse", "HEAD"]);
    if (options.fault === "after_commit_before_receipt") throw new GeneratedReceiptPendingError(commitSha);
    const receipt = generatedCompletionReceiptSchema.parse({
      schemaVersion: 1,
      projectId: journal.projectId,
      questId: contract.questId,
      runId: journal.runId,
      commitSha,
      treeSha: runGit(root, ["rev-parse", "HEAD^{tree}"]),
      committedAt: runGit(root, ["show", "-s", "--format=%cI", "HEAD"]),
    });
    await writeJsonAtomic(path.join(root, ".forge", "local", "runs", journal.runId, "commit.json"), receipt);
    return receipt;
  } catch (error) {
    if (committed || error instanceof GeneratedReceiptPendingError) throw error;
    runGit(root, ["restore", "--staged", "--", ...stageCandidates], true);
    for (const [relativePath, contents] of preimages) {
      if (contents === null) await rm(path.join(root, relativePath), { force: true });
      else await writeBufferAtomic(path.join(root, relativePath), contents);
    }
    throw error;
  } finally {
    if (hadSkipWorktree) runGit(root, ["update-index", "--skip-worktree", "--", stateRelative], true);
  }
}

export async function repairGeneratedCompletionReceipt(options: {
  journal: GeneratedQuestRunJournal;
  contract: GeneratedQuestImplementationContract;
}): Promise<GeneratedCompletionReceipt | null> {
  const root = options.journal.canonicalProjectPath;
  const subject = `forge: complete ${options.contract.questId} [run:${options.journal.runId}]`;
  const matches = runGit(root, ["log", "--format=%H", "--fixed-strings", `--grep=${subject}`], true).split(/\r?\n/u).filter(Boolean);
  if (matches.length !== 1) return null;
  const commitSha = matches[0]!;
  const receipt = generatedCompletionReceiptSchema.parse({
    schemaVersion: 1,
    projectId: options.journal.projectId,
    questId: options.contract.questId,
    runId: options.journal.runId,
    commitSha,
    treeSha: runGit(root, ["rev-parse", `${commitSha}^{tree}`]),
    committedAt: runGit(root, ["show", "-s", "--format=%cI", commitSha]),
  });
  await writeJsonAtomic(path.join(root, ".forge", "local", "runs", options.journal.runId, "commit.json"), receipt);
  return receipt;
}
