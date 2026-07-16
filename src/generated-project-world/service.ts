import { createHash, randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { lstat, mkdir, readFile, readdir, realpath, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import {
  chronicleAnySchema,
  acceptedRoadmapProvenanceSchema,
  acceptedSystemRoadmapSchema,
  acceptedSystemQuestPlanSchema,
  acceptedSystemQuestBatchSchema,
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
  starterManifestSchema,
  type GeneratedProjectStateAny,
  type GeneratedQuestArtifactV2,
  type IdeaSeed,
  type AcceptedSystemRoadmap,
  type AcceptedSystemQuestBatch,
  type AcceptedSystemQuestPlan,
  type SystemQuestFileChoice,
  systemQuestFileChoiceSchema,
  projectModelSchema,
} from "../contracts/index.js";
import { resolveForgeHome } from "../demo/paths.js";
import { fingerprintSystemQuestStructure } from "../blueprint-planner/system-quest.js";
import { ensurePinnedGodot } from "../godot/bootstrap.js";
import { ProjectRegistryStore } from "../project-creation/registry.js";
import { writeJsonAtomic, writeTextAtomic } from "../quest-runner/artifacts.js";
import { normalizeGeneratedQuest, normalizeGeneratedRoadmap } from "../generated-quest-runner/contract.js";
import { GeneratedQuestRunnerService } from "../generated-quest-runner/service.js";
import { readContainedUtf8File, validateExpectedAbsentWorkFile } from "../generated-quest-runner/boundary.js";
import { createNativeQuestArtifact } from "../generated-quest-runner/native-quest.js";
import type {
  GeneratedActivity,
  GeneratedIdeaSaveResponse,
  GeneratedLaunchResponse,
  GeneratedProjectWorldSnapshot,
  GeneratedQuestBrief,
  SystemQuestFileCandidate,
  SystemQuestWorkOrderReview,
  GeneratedWorldStateInput,
  GeneratedWorldView,
  ForgePresentationMutation,
  ForgePresentationState,
  ForgeProjectAsset,
} from "./shared.js";

const creatorRunPhaseLabels: Record<string, string> = {
  contract_review: "work plan ready",
  approved: "plan confirmed",
  implementing: "Codex working",
  scope_review: "file request",
  verifying: "checking",
  waiting_for_playtest: "ready to play",
  completion_pending: "saving result",
  completed: "completed",
  failed: "stopped",
  cancelled: "cancelled",
  interrupted: "interrupted",
};
import { applyAcceptedSystemRoadmap, buildLegacyProjectModel } from "./project-model.js";
import { applyAcceptedSystemQuests, nativeQuestIds } from "./system-quest-plan.js";

const ideaRelativePath = ".forge/idea-seeds.json";
const systemRoadmapRelativePath = ".forge/system-roadmap.json";
const systemQuestRelativePath = ".forge/system-quests.json";
const presentationRelativePath = ".forge/presentation.json";
const presentationAssetsRelativePath = ".forge/presentation-assets";
const generatedViews = new Set<GeneratedWorldView>(["project_world", "quest_brief", "chronicle", "documents"]);

const entityOverrideSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().min(1).max(1_500).optional(),
  outcome: z.string().trim().min(1).max(500).optional(),
  acceptanceCriteria: z.array(z.string().trim().min(1).max(240)).max(8).optional(),
  imageRef: z.string().trim().min(1).max(500).optional(),
}).strict();
const tunableSchema = z.object({
  tunableId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  entityId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  label: z.string().trim().min(1).max(80),
  filePath: z.string().trim().min(1).max(240),
  propertyName: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/u),
  valueType: z.enum(["number", "boolean"]),
  value: z.union([z.number().finite(), z.boolean()]),
  defaultValue: z.union([z.number().finite(), z.boolean()]),
  minimum: z.number().finite().optional(),
  maximum: z.number().finite().optional(),
}).strict().superRefine((value, context) => {
  if ((value.valueType === "number") !== (typeof value.value === "number") || (value.valueType === "number") !== (typeof value.defaultValue === "number")) context.addIssue({ code: "custom", message: "Tunable values must match their type" });
  if (typeof value.value === "number" && (value.minimum !== undefined && value.value < value.minimum || value.maximum !== undefined && value.value > value.maximum)) context.addIssue({ code: "custom", message: "Tunable value is outside its range" });
});
const historySchema = z.object({
  entryId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  occurredAt: z.string().datetime(),
  entityId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  type: z.enum(["playtest", "change_request", "repair", "tuning", "image", "edit"]),
  summary: z.string().trim().min(1).max(1_000),
  result: z.enum(["worked", "needs_change", "broken", "not_sure"]).optional(),
  relatedFiles: z.array(z.string().trim().min(1).max(240)).max(8),
}).strict();
const presentationSchema = z.object({
  schemaVersion: z.literal(1),
  projectId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  entities: z.record(z.string(), entityOverrideSchema),
  tunables: z.array(tunableSchema).max(40),
  history: z.array(historySchema).max(200),
}).strict();

const assetCategoryByExtension = new Map<string, ForgeProjectAsset["category"]>([
  [".png", "images"], [".jpg", "images"], [".jpeg", "images"], [".webp", "images"], [".svg", "images"],
  [".wav", "audio"], [".ogg", "audio"], [".mp3", "audio"],
  [".tscn", "scenes"], [".scn", "scenes"], [".gd", "scripts"], [".gdshader", "scripts"],
]);

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

function hasUnresolvedGeneratedWork(snapshot: GeneratedProjectWorldSnapshot): boolean {
  return snapshot.projectModel.workSessions.some((session) =>
    ["contract_review", "approved", "implementing", "scope_review", "verifying", "waiting_for_playtest", "completion_pending", "failed", "interrupted"].includes(session.phase)
    || (session.phase === "cancelled" && (session.recovery.action === "rollback" || session.recovery.action === "manual")));
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

  private async optionalSystemQuestPlan(projectPath: string, projectId: string): Promise<AcceptedSystemQuestPlan | null> {
    const target = path.join(projectPath, systemQuestRelativePath);
    const info = await lstat(target).catch(() => null);
    if (!info) return null;
    const artifact = await readValidated(await this.ownedPath(projectPath, systemQuestRelativePath), acceptedSystemQuestPlanSchema);
    if (artifact.projectId !== projectId) throw new Error("The system quest plan belongs to another project.");
    return artifact;
  }

  private blankPresentation(projectId: string): ForgePresentationState {
    return { schemaVersion: 1, projectId, entities: {}, tunables: [], history: [] };
  }

  private async optionalPresentation(projectPath: string, projectId: string): Promise<ForgePresentationState> {
    const target = path.join(projectPath, presentationRelativePath);
    const info = await lstat(target).catch(() => null);
    if (!info) return this.blankPresentation(projectId);
    const presentation = await readValidated(await this.ownedPath(projectPath, presentationRelativePath), presentationSchema);
    if (presentation.projectId !== projectId) throw new Error("Forge presentation data belongs to another project.");
    return presentation;
  }

  private async ensurePresentationIgnored(projectPath: string): Promise<void> {
    const gitDirectory = path.join(projectPath, ".git");
    const gitStats = await stat(gitDirectory).catch(() => null);
    if (!gitStats?.isDirectory()) return;
    const excludePath = path.join(gitDirectory, "info", "exclude");
    const contents = await readFile(excludePath, "utf8").catch(() => "");
    const lines = new Set(contents.split(/\r?\n/u));
    const additions = [presentationRelativePath, `${presentationAssetsRelativePath}/`].filter((entry) => !lines.has(entry));
    if (!additions.length) return;
    const separator = contents.length === 0 || contents.endsWith("\n") ? "" : "\n";
    await writeFile(excludePath, `${contents}${separator}${additions.join("\n")}\n`, "utf8");
  }

  private async writePresentation(projectPath: string, value: ForgePresentationState): Promise<ForgePresentationState> {
    const presentation = presentationSchema.parse(value);
    await this.ensurePresentationIgnored(projectPath);
    await this.ownedPath(projectPath, ".forge", "directory");
    const target = path.join(projectPath, presentationRelativePath);
    const existing = await lstat(target).catch(() => null);
    if (existing && (existing.isSymbolicLink() || !existing.isFile())) throw new GeneratedProjectWorldConflictError("Forge presentation data is unsafe.");
    await writeJsonAtomic(target, presentation);
    return presentation;
  }

  private async listAssets(projectPath: string, projectId: string): Promise<ForgeProjectAsset[]> {
    const assets: ForgeProjectAsset[] = [];
    const walk = async (relativeDirectory: string): Promise<void> => {
      if (assets.length >= 300) return;
      const absolute = path.join(projectPath, relativeDirectory);
      const entries = await readdir(absolute, { withFileTypes: true }).catch(() => []);
      for (const entry of entries) {
        if (assets.length >= 300 || entry.isSymbolicLink()) break;
        const relativePath = path.posix.join(relativeDirectory.replaceAll("\\", "/"), entry.name).replace(/^\.\//u, "");
        if (entry.isDirectory()) {
          if (relativePath === ".git" || relativePath === "node_modules" || (relativePath.startsWith(".forge/") && relativePath !== presentationAssetsRelativePath && !relativePath.startsWith(`${presentationAssetsRelativePath}/`))) continue;
          await walk(relativePath);
          continue;
        }
        if (!entry.isFile() || (relativePath.startsWith(".forge/") && !relativePath.startsWith(`${presentationAssetsRelativePath}/`))) continue;
        const extension = path.extname(entry.name).toLowerCase();
        const category = assetCategoryByExtension.get(extension) ?? "other";
        if (category === "other" && ![".tres", ".cfg", ".json", ".md", ".txt"].includes(extension)) continue;
        const file = await stat(path.join(projectPath, relativePath)).catch(() => null);
        if (!file?.isFile() || file.size > 12_000_000) continue;
        const previewUrl = category === "images" ? `/api/projects/${encodeURIComponent(projectId)}/assets/content?path=${encodeURIComponent(relativePath)}` : null;
        assets.push({ relativePath, name: entry.name, category, size: file.size, previewUrl });
      }
    };
    await walk("");
    return assets.sort((left, right) => left.category.localeCompare(right.category) || left.relativePath.localeCompare(right.relativePath));
  }

  async resolveAsset(projectId: string, relativePath: string): Promise<{ filePath: string; size: number; contentType: string }> {
    const normalized = relativePath.replaceAll("\\", "/");
    if (!normalized || normalized.startsWith("/") || normalized.split("/").some((part) => part === ".." || part === "")) throw new GeneratedProjectWorldConflictError("Choose a safe project asset.");
    const extension = path.extname(normalized).toLowerCase();
    const category = assetCategoryByExtension.get(extension);
    if (!category) throw new GeneratedProjectWorldConflictError("This file type cannot be opened from Assets.");
    const { projectPath } = await this.resolveProject(projectId);
    const filePath = await this.ownedPath(projectPath, normalized);
    const file = await stat(filePath);
    const contentType = ({ ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".wav": "audio/wav", ".ogg": "audio/ogg", ".mp3": "audio/mpeg" } as Record<string, string>)[extension] ?? "application/octet-stream";
    return { filePath, size: file.size, contentType };
  }

  async uploadPresentationImage(projectId: string, entityId: string, bytes: Buffer, extensionValue: string): Promise<GeneratedProjectWorldSnapshot> {
    const current = await this.loadWorld(projectId);
    if (!current.projectModel.systems.some((system) => system.systemId === entityId) && current.project.projectId !== entityId && !current.projectModel.quests.some((quest) => quest.questId === entityId)) throw new GeneratedProjectWorldConflictError("Choose a World, Experience, or Step from this project.");
    const extension = extensionValue.toLowerCase() === "jpg" || extensionValue.toLowerCase() === "jpeg" ? ".jpg" : extensionValue.toLowerCase() === "webp" ? ".webp" : ".png";
    if (bytes.length < 16 || bytes.length > 5_000_000) throw new GeneratedProjectWorldConflictError("Choose an image smaller than 5 MB.");
    const valid = extension === ".png" ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : extension === ".jpg" ? bytes[0] === 0xff && bytes[1] === 0xd8
        : bytes.subarray(8, 12).toString("ascii") === "WEBP";
    if (!valid) throw new GeneratedProjectWorldConflictError("The uploaded image contents do not match its file type.");
    const { projectPath } = await this.resolveProject(projectId);
    await this.ensurePresentationIgnored(projectPath);
    const root = path.join(projectPath, presentationAssetsRelativePath);
    await mkdir(root, { recursive: true });
    const relativePath = `${presentationAssetsRelativePath}/${this.randomId()}${extension}`;
    await writeFile(path.join(projectPath, relativePath), bytes, { flag: "wx" });
    const presentation = current.presentation;
    await this.writePresentation(projectPath, { ...presentation, entities: { ...presentation.entities, [entityId]: { ...presentation.entities[entityId], imageRef: `project:${relativePath}` } }, history: [...presentation.history, { entryId: `image-${this.randomId()}`.toLowerCase(), occurredAt: this.now().toISOString(), entityId, type: "image" as const, summary: "Replaced the hierarchy image.", relatedFiles: [] }].slice(-200) });
    return this.loadWorld(projectId);
  }

  async mutatePresentation(projectId: string, mutationValue: ForgePresentationMutation): Promise<GeneratedProjectWorldSnapshot> {
    const current = await this.loadWorld(projectId);
    const entityIds = new Set([projectId, ...current.projectModel.systems.map((item) => item.systemId), ...current.projectModel.quests.map((item) => item.questId)]);
    const mutation = mutationValue;
    const entityId = mutation.action === "save_tunable" ? mutation.tunable.entityId : mutation.action === "reset_tunable" ? null : mutation.entityId;
    if (entityId !== null && !entityIds.has(entityId)) throw new GeneratedProjectWorldConflictError("Choose a World, Experience, or Step from this project.");
    let next = structuredClone(current.presentation);
    const history = (type: ForgePresentationState["history"][number]["type"], targetId: string, summary: string, relatedFiles: string[] = [], result?: ForgePresentationState["history"][number]["result"]) => {
      next.history = [...next.history, { entryId: `${type.replaceAll("_", "-")}-${this.randomId()}`.toLowerCase(), occurredAt: this.now().toISOString(), entityId: targetId, type, summary, ...(result ? { result } : {}), relatedFiles }].slice(-200);
    };
    if (mutation.action === "edit_entity") {
      const parsed = entityOverrideSchema.parse({ name: mutation.name, description: mutation.description, outcome: mutation.outcome, acceptanceCriteria: mutation.acceptanceCriteria });
      next.entities[mutation.entityId] = { ...next.entities[mutation.entityId], ...parsed };
      history("edit", mutation.entityId, `Updated the creator-facing ${mutation.entityId} details.`);
    } else if (mutation.action === "choose_image") {
      const asset = current.assets.find((item) => item.relativePath === mutation.relativePath && item.category === "images");
      if (!asset) throw new GeneratedProjectWorldConflictError("Choose an image from this project's Assets view.");
      next.entities[mutation.entityId] = { ...next.entities[mutation.entityId], imageRef: `project:${asset.relativePath}` };
      history("image", mutation.entityId, `Selected ${asset.name} as the hierarchy image.`);
    } else if (mutation.action === "restore_image") {
      const override = { ...next.entities[mutation.entityId] };
      delete override.imageRef;
      next.entities[mutation.entityId] = override;
      history("image", mutation.entityId, "Restored the default hierarchy image.");
    } else if (mutation.action === "record_feedback") {
      const note = z.string().trim().max(1_000).parse(mutation.note);
      const files = z.array(z.string().trim().min(1).max(240)).max(8).parse(mutation.relatedFiles);
      history(mutation.result === "needs_change" ? "change_request" : mutation.result === "broken" ? "repair" : "playtest", mutation.entityId, note || mutation.result.replaceAll("_", " "), files, mutation.result);
    } else if (mutation.action === "save_tunable") {
      const tunable = tunableSchema.parse(mutation.tunable);
      if (!entityIds.has(tunable.entityId)) throw new GeneratedProjectWorldConflictError("Choose an Experience or Step for this tuning value.");
      const index = next.tunables.findIndex((item) => item.tunableId === tunable.tunableId);
      if (index >= 0) next.tunables[index] = tunable;
      else next.tunables.push(tunable);
      history("tuning", tunable.entityId, `Saved ${tunable.label}: ${String(tunable.value)}.`, [tunable.filePath]);
    } else {
      const tunable = next.tunables.find((item) => item.tunableId === mutation.tunableId);
      if (!tunable) throw new GeneratedProjectWorldConflictError("This tuning value no longer exists.");
      tunable.value = tunable.defaultValue;
      history("tuning", tunable.entityId, `Reset ${tunable.label} to ${String(tunable.defaultValue)}.`, [tunable.filePath]);
    }
    const { projectPath } = await this.resolveProject(projectId);
    await this.writePresentation(projectPath, next);
    return this.loadWorld(projectId);
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
      const starter = await readValidated(await this.ownedPath(projectPath, manifest.starter.manifest), starterManifestSchema);
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
      if (approvedBlueprint.projectName !== manifest.displayName || (manifest.foundation !== "open_godot" && approvedBlueprint.foundation !== manifest.foundation)) throw new Error("Approved blueprint identity does not match the project manifest.");
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
      const acceptedSystemRoadmap = await this.optionalSystemRoadmap(projectPath, projectId);
      const acceptedSystemQuestPlan = await this.optionalSystemQuestPlan(projectPath, projectId);
      const legacyQuestIds = new Set(quests.map((quest) => quest.questId));
      const acceptedNativeIds = nativeQuestIds(acceptedSystemQuestPlan);
      const unknownSession = sessions.find((session) => !legacyQuestIds.has(session.questId) && !acceptedNativeIds.has(session.questId));
      if (unknownSession) throw new Error(`Work session ${unknownSession.runId} references an unknown quest.`);
      const legacySessions = sessions.filter((session) => legacyQuestIds.has(session.questId));
      const nativeSessions = sessions.filter((session) => acceptedNativeIds.has(session.questId));
      const nativeHistoryEntries = chronicle.entries.filter((entry) => entry.type === "quest_completed" && acceptedNativeIds.has(entry.questId));
      const legacyChronicle = chronicleV2Schema.parse({
        ...chronicle,
        entries: chronicle.entries.filter((entry) => entry.type !== "quest_completed" || !acceptedNativeIds.has(entry.questId)),
      });
      const legacyProjectModel = buildLegacyProjectModel({
        manifest,
        vision,
        firstPlayable,
        roadmap,
        quests,
        state,
        chronicle: legacyChronicle,
        sessions: legacySessions,
      });
      const roadmapProjectModel = acceptedSystemRoadmap
        ? applyAcceptedSystemRoadmap(legacyProjectModel, acceptedSystemRoadmap)
        : legacyProjectModel;
      let projectModel = acceptedSystemQuestPlan
        ? applyAcceptedSystemQuests(roadmapProjectModel, acceptedSystemQuestPlan, nativeSessions, nativeHistoryEntries)
        : roadmapProjectModel;

      const ideaSeeds = await this.optionalIdeaSeeds(projectPath, projectId);
      const presentation = await this.optionalPresentation(projectPath, projectId);
      const assets = await this.listAssets(projectPath, projectId);
      const combinedQuestIds = projectModel.quests.map((quest) => quest.questId);
      const selectedIsValid = state.selectedQuestId !== null && combinedQuestIds.includes(state.selectedQuestId);
      const selectedQuestId = selectedIsValid ? state.selectedQuestId! : combinedQuestIds[0] ?? null;
      const selectedSystemId = projectModel.quests.find((quest) => quest.questId === selectedQuestId)?.systemId ?? projectModel.systems[0]!.systemId;
      const savedNext = state.schemaVersion === 2 ? state.nextRecommendedQuestId : null;
      const nextRecommendedQuestId = savedNext !== null && combinedQuestIds.includes(savedNext) ? savedNext : projectModel.focus.nextRecommendedQuestId;
      projectModel = projectModelSchema.parse({ ...projectModel, focus: { ...projectModel.focus, selectedSystemId, selectedQuestId, nextRecommendedQuestId } });
      const repairNotice = selectedIsValid || combinedQuestIds.length === 0 ? null : "The saved quest selection was unavailable. Forge focused the first roadmap quest in memory; choose a quest to persist the repair.";
      const nativeArtifacts = new Map<string, GeneratedQuestArtifactV2>();
      for (const savedSystem of acceptedSystemQuestPlan?.systems ?? []) {
        for (const [index, savedQuest] of savedSystem.quests.entries()) {
          const modelQuest = projectModel.quests.find((quest) => quest.questId === savedQuest.questId);
          if (!modelQuest) throw new Error(`Saved native quest ${savedQuest.questId} could not be projected.`);
          nativeArtifacts.set(savedQuest.questId, createNativeQuestArtifact({
            projectId,
            savedQuest,
            sequence: savedSystem.baseQuestIds.length + index + 1,
            state: modelQuest.status === "active" ? "available" : modelQuest.status,
          }));
        }
      }
      const artifactById = new Map<string, GeneratedQuestArtifactV2>(quests.map((quest) => [quest.questId, quest]));
      for (const [questId, quest] of nativeArtifacts) artifactById.set(questId, quest);
      const questBriefs: GeneratedQuestBrief[] = await Promise.all(projectModel.quests.map(async (modelQuest) => {
        const quest = artifactById.get(modelQuest.questId);
        if (!quest) throw new Error(`Project quest ${modelQuest.questId} has no strict brief source.`);
        const summary = this.generatedRunner
          ? await this.generatedRunner.getSummary(projectId, quest.questId).catch((error) => ({
              eligibility: {
                eligible: false,
                reason: error instanceof Error ? error.message : String(error),
                revision: quest.revision,
                state: quest.state,
              },
              run: null,
            }))
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
            ? `Codex work · ${creatorRunPhaseLabels[summary.run.phase] ?? summary.run.phase.replaceAll("_", " ")}`
            : summary.eligibility.eligible
              ? "Ready to check the work plan"
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

      const completedNativeArtifacts = [...nativeArtifacts.values()].filter((quest) => quest.implementation !== "not_enabled");
      const documentCandidates: Array<readonly [string, string, string]> = [
        ["Project overview", "PROJECT.md", "Deterministic project record"],
        ["Game vision", ".forge/docs/game-vision.md", "game-vision.json"],
        ["First playable", ".forge/docs/first-playable.md", "first-playable.json"],
        ["Roadmap", ".forge/docs/roadmap.md", "roadmap.json"],
        ["Chronicle", ".forge/docs/chronicle.md", "chronicle.json"],
        ...quests.map((quest) => [`Quest · ${quest.title}`, `.forge/docs/quests/${quest.questId}.md`, `quests/${quest.questId}.json`] as const),
        ...completedNativeArtifacts.map((quest) => [`Quest · ${quest.title}`, `.forge/docs/quests/${quest.questId}.md`, "system-quests.json"] as const),
      ];
      for (const [, relative] of documentCandidates) await this.ownedPath(projectPath, relative);

      return {
        project: {
          projectId,
          displayName: manifest.displayName,
          foundation: manifest.foundation,
          foundationLabel: manifest.foundation === "open_godot" ? "Open Godot project" : "Top-down Arena",
          engineLabel: `Godot ${manifest.engine.version} · ${manifest.engine.dimension} · ${manifest.engine.language}`,
          starterVersion: manifest.starter.version,
          createdAt: manifest.createdAt,
          lastOpenedAt: entry.lastOpenedAt,
        },
        projectModel,
        systemQuestPlan: acceptedSystemQuestPlan,
        vision,
        starterAwarePlanning: {
          accepted: acceptedRoadmapProvenance !== null,
          acceptedRoadmapFingerprint: acceptedRoadmapProvenance?.acceptedRoadmap.fingerprint ?? null,
          alreadyPlayable: acceptedRoadmapProvenance?.acceptedRoadmap.alreadyPlayable.map((fact) => fact.statement) ?? [],
        },
        playable: manifest.foundation === "open_godot" ? {
          previewLabel: "Playable-state preview",
          layoutLabel: "Verified starter layout",
          summary: "The verified Godot project opens to a small Forge starting screen, ready for the creator's idea.",
          facts: [
            "The main scene and script load successfully.",
            "The project opens with pinned Godot.",
          ],
          plannedNotPlayable: acceptedSystemRoadmap
            ? acceptedSystemRoadmap.systems.map((system) => `${system.title}: ${system.outcome}`)
            : ["The creator has not shaped the game systems yet."],
          godotVersion: godot.godotVersion,
          verifiedAt: godot.verifiedAt,
          successMarker: godot.successMarker,
        } : {
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
        presentation,
        assets,
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
    if (hasUnresolvedGeneratedWork(current)) {
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
    const ownedNativeQuestIds = nativeQuestIds(await this.optionalSystemQuestPlan(projectPath, projectId));
    const canonicalRoadmap = acceptedSystemRoadmapSchema.parse({
      ...roadmap,
      systems: roadmap.systems.map((system) => ({
        ...system,
        questIds: system.questIds.filter((questId) => !ownedNativeQuestIds.has(questId)),
      })),
    });
    const forgeDirectory = await this.ownedPath(projectPath, ".forge", "directory");
    const target = path.join(forgeDirectory, "system-roadmap.json");
    const info = await lstat(target).catch(() => null);
    if (info && (info.isSymbolicLink() || !info.isFile())) {
      throw new GeneratedProjectWorldConflictError("The system roadmap target is unsafe.");
    }
    if (info) await this.ownedPath(projectPath, systemRoadmapRelativePath);
    await writeJsonAtomic(target, canonicalRoadmap);
  }

  async saveSystemQuestBatch(projectId: string, batchValue: AcceptedSystemQuestBatch): Promise<AcceptedSystemQuestPlan> {
    const batch = acceptedSystemQuestBatchSchema.parse(batchValue);
    const current = await this.loadWorld(projectId);
    if (current.projectModel.project.projectId !== projectId) throw new GeneratedProjectWorldConflictError("The system quest plan belongs to another project.");
    if (hasUnresolvedGeneratedWork(current)) throw new GeneratedProjectWorldConflictError("Finish or safely close the active work session before saving quests.");
    if (batch.sourceFingerprint !== fingerprintSystemQuestStructure(current.projectModel, batch.systemId)) {
      throw new GeneratedProjectWorldConflictError("The project plan changed before these quests could be saved.");
    }
    const system = current.projectModel.systems.find((candidate) => candidate.systemId === batch.systemId);
    if (!system) throw new GeneratedProjectWorldConflictError("The selected system is no longer available.");
    const { projectPath } = await this.resolveProject(projectId);
    const previous = await this.optionalSystemQuestPlan(projectPath, projectId);
    const previousIds = nativeQuestIds(previous);
    const baseQuestIds = system.questIds.filter((questId) => !previousIds.has(questId));
    if (!sameList(baseQuestIds, batch.baseQuestIds)) throw new GeneratedProjectWorldConflictError("The selected system's base quests changed before this save.");
    if (system.questIds.length + batch.quests.length > 5) throw new GeneratedProjectWorldConflictError("A system may contain at most five quests in this alpha.");
    if (batch.quests.some((quest) => current.projectModel.quests.some((existing) => existing.questId === quest.questId))) throw new GeneratedProjectWorldConflictError("A proposed quest ID already exists.");
    const existingSystem = previous?.systems.find((candidate) => candidate.systemId === batch.systemId) ?? null;
    const mergedBatch = existingSystem
      ? { ...batch, baseQuestIds: existingSystem.baseQuestIds, quests: [...existingSystem.quests, ...batch.quests] }
      : batch;
    const next = acceptedSystemQuestPlanSchema.parse({
      schemaVersion: 1,
      projectId,
      systems: previous
        ? [...previous.systems.filter((candidate) => candidate.systemId !== batch.systemId), mergedBatch]
        : [mergedBatch],
    });
    const forgeDirectory = await this.ownedPath(projectPath, ".forge", "directory");
    const target = path.join(forgeDirectory, "system-quests.json");
    const info = await lstat(target).catch(() => null);
    if (info && (info.isSymbolicLink() || !info.isFile())) throw new GeneratedProjectWorldConflictError("The system quest target is unsafe.");
    if (info) await this.ownedPath(projectPath, systemQuestRelativePath);
    await writeJsonAtomic(target, next);
    return next;
  }

  private async validateWorkPath(projectPath: string, relativePath: string, kind: "existing" | "new"): Promise<void> {
    const normalized = relativePath.replaceAll("\\", "/");
    if (normalized !== relativePath || path.posix.normalize(normalized) !== normalized || normalized.split("/").includes(".") || (!normalized.startsWith("scenes/") && !normalized.startsWith("scripts/"))) {
      throw new GeneratedProjectWorldConflictError("Quest work files must stay inside scenes/ or scripts/.");
    }
    try {
      if (kind === "existing") await readContainedUtf8File(projectPath, relativePath);
      else await validateExpectedAbsentWorkFile(projectPath, relativePath);
    } catch (error) {
      throw new GeneratedProjectWorldConflictError(error instanceof Error ? error.message : String(error));
    }
  }

  async listSystemQuestFiles(projectId: string, systemId: string): Promise<SystemQuestFileCandidate[]> {
    const current = await this.loadWorld(projectId);
    if (!current.projectModel.systems.some((system) => system.systemId === systemId)) throw new GeneratedProjectWorldConflictError("Choose a system from the current project plan.");
    const { projectPath } = await this.resolveProject(projectId);
    const paths: string[] = [];
    let visited = 0;
    const walk = async (relativeDirectory: string): Promise<void> => {
      const directory = path.join(projectPath, relativeDirectory);
      const info = await lstat(directory).catch(() => null);
      if (!info) return;
      if (!info.isDirectory() || info.isSymbolicLink() || await realpath(directory) !== directory) throw new GeneratedProjectWorldConflictError(`The ${relativeDirectory} folder is unsafe.`);
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        visited += 1;
        if (visited > 256) throw new GeneratedProjectWorldConflictError("This alpha file chooser found too many entries under scenes/ and scripts/.");
        const relativePath = `${relativeDirectory}/${entry.name}`.replaceAll("\\", "/");
        if (entry.isSymbolicLink()) throw new GeneratedProjectWorldConflictError(`The file chooser found an unsafe link: ${relativePath}`);
        if (entry.isDirectory()) await walk(relativePath);
        else if (entry.isFile() && /\.(?:gd|tscn|tres|gdshader|gdshaderinc)$/u.test(relativePath)) paths.push(relativePath);
      }
    };
    await walk("scenes");
    await walk("scripts");
    const candidates: SystemQuestFileCandidate[] = [];
    for (const relativePath of paths.sort((left, right) => left.localeCompare(right))) {
      try {
        const file = await readContainedUtf8File(projectPath, relativePath);
        candidates.push({ relativePath, size: file.size, sha256: file.sha256 });
        if (candidates.length === 64) break;
      } catch {
        // Unsafe, binary, verifier, oversized, or otherwise ineligible files stay hidden.
      }
    }
    return candidates;
  }

  async reviewSystemQuestWorkOrder(projectId: string, systemId: string, questId: string, choiceValue: SystemQuestFileChoice): Promise<SystemQuestWorkOrderReview> {
    const choice = systemQuestFileChoiceSchema.parse(choiceValue);
    const current = await this.loadWorld(projectId);
    const savedSystem = current.systemQuestPlan?.systems.find((system) => system.systemId === systemId);
    const quest = savedSystem?.quests.find((candidate) => candidate.questId === questId);
    const modelQuest = current.projectModel.quests.find((candidate) => candidate.questId === questId && candidate.systemId === systemId);
    if (!quest || !modelQuest) throw new GeneratedProjectWorldConflictError("Choose a saved quest from this game system.");
    if (quest.implementation || modelQuest.status !== "available") throw new GeneratedProjectWorldConflictError("Choose an available incomplete quest before reviewing its files.");
    const { projectPath } = await this.resolveProject(projectId);
    for (const relativePath of choice.existingFiles) await this.validateWorkPath(projectPath, relativePath, "existing");
    for (const relativePath of choice.newFiles) await this.validateWorkPath(projectPath, relativePath, "new");
    if (quest.workOrder) throw new GeneratedProjectWorldConflictError("This quest already has a confirmed work plan.");
    const review = {
      questId, title: quest.title, playerVisibleOutcome: quest.playerVisibleOutcome,
      doneWhen: quest.doneWhen, excludedScope: quest.excludedScope,
      existingFiles: choice.existingFiles, newFiles: choice.newFiles,
    };
    return { ...review, fingerprint: createHash("sha256").update(JSON.stringify(review), "utf8").digest("hex") };
  }

  async saveSystemQuestWorkOrder(projectId: string, systemId: string, questId: string, choice: SystemQuestFileChoice, fingerprint: string): Promise<AcceptedSystemQuestPlan> {
    const review = await this.reviewSystemQuestWorkOrder(projectId, systemId, questId, choice);
    if (review.fingerprint !== fingerprint) throw new GeneratedProjectWorldConflictError("The exact work order changed before it could be saved.");
    const latest = await this.loadWorld(projectId);
    if (hasUnresolvedGeneratedWork(latest)) throw new GeneratedProjectWorldConflictError("Finish or safely close the active work session before saving a work order.");
    const { projectPath } = await this.resolveProject(projectId);
    const previous = await this.optionalSystemQuestPlan(projectPath, projectId);
    if (!previous) throw new GeneratedProjectWorldConflictError("Accept quests before accepting a work order.");
    const next = acceptedSystemQuestPlanSchema.parse({
      ...previous,
      systems: previous.systems.map((system) => system.systemId !== systemId ? system : {
        ...system,
        quests: system.quests.map((quest) => quest.questId !== questId ? quest : {
          ...quest,
          workOrder: { existingFiles: review.existingFiles, newFiles: review.newFiles, fingerprint, acceptedAt: this.now().toISOString() },
        }),
      }),
    });
    const target = path.join(await this.ownedPath(projectPath, ".forge", "directory"), "system-quests.json");
    const info = await lstat(target).catch(() => null);
    if (!info?.isFile() || info.isSymbolicLink()) throw new GeneratedProjectWorldConflictError("The system quest target is missing or unsafe.");
    await this.ownedPath(projectPath, systemQuestRelativePath);
    await writeJsonAtomic(target, next);
    return next;
  }

  async saveState(projectId: string, input: GeneratedWorldStateInput): Promise<GeneratedProjectWorldSnapshot> {
    if (!generatedViews.has(input.currentView)) throw new GeneratedProjectWorldConflictError("A valid generated Project World view is required.");
    const snapshot = await this.loadWorld(projectId);
    if (input.selectedQuestId === null ? snapshot.projectModel.quests.length > 0 : !snapshot.projectModel.quests.some((quest) => quest.questId === input.selectedQuestId)) {
      throw new GeneratedProjectWorldConflictError("The selected quest does not belong to this project plan.");
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
