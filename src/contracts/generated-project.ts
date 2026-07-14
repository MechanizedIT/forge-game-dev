import { z } from "zod";

import {
  nonEmptyStringSchema,
  relativePathSchema,
  schemaVersionSchema,
  slugSchema,
  timestampSchema,
} from "./shared.js";

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u, "Expected a SHA-256 digest");
const gitShaSchema = z.string().regex(/^[a-f0-9]{40,64}$/u, "Expected a Git commit SHA");

export const topDownArenaStarterManifestSchema = z.object({
  schemaVersion: schemaVersionSchema,
  starterId: z.literal("top-down-arena"),
  version: z.string().regex(/^1\.[0-9]+\.[0-9]+$/u),
  foundation: z.literal("top_down_arena"),
  projectFile: z.literal("project.godot"),
  mainScene: z.literal("res://scenes/main.tscn"),
  verificationScript: z.literal("res://scripts/verify_project.gd"),
  successMarker: z.literal("FORGE_TOP_DOWN_ARENA_VERIFY_OK"),
  requiredNodes: z.array(nonEmptyStringSchema).min(3),
  requiredInputActions: z.array(nonEmptyStringSchema).min(4),
  files: z.array(relativePathSchema).min(1),
  substitutions: z.array(z.object({
    file: relativePathSchema,
    token: nonEmptyStringSchema,
    owner: z.literal("forge"),
  }).strict()),
}).strict().superRefine((manifest, context) => {
  if (new Set(manifest.files).size !== manifest.files.length) {
    context.addIssue({ code: "custom", message: "Starter files must be unique", path: ["files"] });
  }
  for (const substitution of manifest.substitutions) {
    if (!manifest.files.includes(substitution.file)) {
      context.addIssue({ code: "custom", message: "Substitution file must be in the starter inventory", path: ["substitutions"] });
    }
  }
});

export const generatedProjectManifestSchema = z.object({
  schemaVersion: schemaVersionSchema,
  projectId: slugSchema,
  displayName: nonEmptyStringSchema,
  foundation: z.literal("top_down_arena"),
  createdAt: timestampSchema,
  engine: z.object({
    kind: z.literal("godot"),
    version: z.literal("4.7"),
    dimension: z.literal("2D"),
    language: z.literal("GDScript"),
    projectFile: z.literal("project.godot"),
    mainScene: z.literal("res://scenes/main.tscn"),
  }).strict(),
  starter: z.object({
    id: z.literal("top-down-arena"),
    version: nonEmptyStringSchema,
    manifest: relativePathSchema,
  }).strict(),
  artifacts: z.object({
    approvedBlueprint: relativePathSchema,
    vision: relativePathSchema,
    firstPlayable: relativePathSchema,
    roadmap: relativePathSchema,
    questsDirectory: relativePathSchema,
    projectState: relativePathSchema,
    chronicle: relativePathSchema,
    planningProvenance: relativePathSchema,
    localCreationProvenance: relativePathSchema,
    localGodotVerification: relativePathSchema,
    localGitBaseline: relativePathSchema,
  }).strict(),
}).strict();

export const gameVisionSchema = z.object({
  schemaVersion: schemaVersionSchema,
  projectId: slugSchema,
  vision: nonEmptyStringSchema,
  coreAction: nonEmptyStringSchema,
  funTarget: nonEmptyStringSchema,
  inputMode: z.enum(["keyboard", "controller", "keyboard_and_controller"]),
  smallestPlayableResult: nonEmptyStringSchema,
}).strict();

export const firstPlayableMilestoneSchema = z.object({
  schemaVersion: schemaVersionSchema,
  projectId: slugSchema,
  title: z.literal("First Playable"),
  outcome: nonEmptyStringSchema,
  questIds: z.array(slugSchema).min(3).max(5),
}).strict();

export const generatedQuestArtifactSchema = z.object({
  schemaVersion: schemaVersionSchema,
  projectId: slugSchema,
  questId: slugSchema,
  sequence: z.number().int().positive().max(5),
  title: nonEmptyStringSchema,
  visibleOutcome: nonEmptyStringSchema,
  dependsOn: z.array(slugSchema).max(4),
  scope: z.object({
    included: z.array(nonEmptyStringSchema).min(1),
    excluded: z.array(nonEmptyStringSchema).min(1),
  }).strict(),
  acceptanceCriteria: z.array(z.object({
    id: z.string().regex(/^AC-[1-9][0-9]*$/u),
    criterion: nonEmptyStringSchema,
    verificationIds: z.array(z.string().regex(/^V-[1-9][0-9]*$/u)).min(1),
  }).strict()).min(1),
  verificationIdeas: z.array(z.object({
    id: z.string().regex(/^V-[1-9][0-9]*$/u),
    idea: nonEmptyStringSchema,
  }).strict()).min(1),
  implementation: z.literal("not_enabled"),
}).strict();

export const generatedProjectStateSchema = z.object({
  schemaVersion: schemaVersionSchema,
  projectId: slugSchema,
  currentView: z.enum(["project_created", "project_world", "quest_brief", "chronicle", "documents"]),
  selectedQuestId: slugSchema.nullable(),
  lastOpenedAt: timestampSchema,
}).strict();

export const chronicleSchema = z.object({
  schemaVersion: schemaVersionSchema,
  projectId: slugSchema,
  entries: z.array(z.object({
    entryId: slugSchema,
    type: z.literal("project_created"),
    occurredAt: timestampSchema,
    summary: nonEmptyStringSchema,
  }).strict()).min(1),
}).strict();

export const ideaSeedSchema = z.object({
  ideaSeedId: slugSchema,
  idea: z.string().trim().min(1).max(500),
  createdAt: timestampSchema,
  activityNote: nonEmptyStringSchema,
}).strict();

export const ideaSeedsSchema = z.object({
  schemaVersion: schemaVersionSchema,
  projectId: slugSchema,
  seeds: z.array(ideaSeedSchema).max(100),
}).strict().superRefine((value, context) => {
  const ids = value.seeds.map((seed) => seed.ideaSeedId);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: "custom", message: "Idea seed IDs must be unique", path: ["seeds"] });
  }
});

export const planningProvenanceSchema = z.object({
  schemaVersion: schemaVersionSchema,
  projectId: slugSchema,
  model: z.literal("gpt-5.6"),
  reasoningEffort: z.literal("high"),
  sandbox: z.literal("read-only"),
  network: z.literal("disabled"),
  sanitizedThreadId: z.string().nullable(),
  attempts: z.number().int().min(1).max(2),
  blueprintSha256: sha256Schema,
  approvedAt: timestampSchema,
}).strict();

export const godotVerificationResultSchema = z.object({
  schemaVersion: schemaVersionSchema,
  projectId: slugSchema,
  status: z.literal("passed"),
  godotVersion: nonEmptyStringSchema,
  arguments: z.tuple([
    z.literal("--headless"),
    z.literal("--path"),
    z.literal("."),
    z.literal("--script"),
    z.literal("res://scripts/verify_project.gd"),
  ]),
  successMarker: z.literal("FORGE_TOP_DOWN_ARENA_VERIFY_OK"),
  output: nonEmptyStringSchema,
  verifiedAt: timestampSchema,
}).strict();

export const gitBaselineResultSchema = z.object({
  schemaVersion: schemaVersionSchema,
  projectId: slugSchema,
  status: z.literal("passed"),
  commitSha: gitShaSchema,
  commitMessage: z.literal("Forge project baseline"),
  cleanWorktree: z.literal(true),
  remoteCount: z.literal(0),
  committedAt: timestampSchema,
}).strict();

export const creationProvenanceSchema = z.object({
  schemaVersion: schemaVersionSchema,
  projectId: slugSchema,
  transactionId: slugSchema,
  blueprintSha256: sha256Schema,
  starterId: z.literal("top-down-arena"),
  starterVersion: nonEmptyStringSchema,
  createdAt: timestampSchema,
  completedAt: timestampSchema,
  godotSuccessMarker: z.literal("FORGE_TOP_DOWN_ARENA_VERIFY_OK"),
  gitCommitSha: gitShaSchema,
  registryState: z.literal("registered"),
  modelCommandsExecuted: z.literal(0),
  modelSourceFilesExecuted: z.literal(0),
}).strict();

export const projectRegistryEntrySchema = z.object({
  projectId: slugSchema,
  displayName: nonEmptyStringSchema,
  canonicalPath: nonEmptyStringSchema,
  foundation: z.literal("top_down_arena"),
  createdAt: timestampSchema,
  lastOpenedAt: timestampSchema,
  creationState: z.literal("created"),
  starterVersion: nonEmptyStringSchema,
}).strict();

export const projectRegistrySchema = z.object({
  schemaVersion: schemaVersionSchema,
  projects: z.array(projectRegistryEntrySchema),
}).strict().superRefine((registry, context) => {
  const ids = registry.projects.map((project) => project.projectId);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: "custom", message: "Project registry IDs must be unique", path: ["projects"] });
  }
});

export const creationFailureRecordSchema = z.object({
  schemaVersion: schemaVersionSchema,
  transactionId: slugSchema,
  projectId: slugSchema.nullable(),
  blueprintSha256: sha256Schema,
  stage: nonEmptyStringSchema,
  failedAt: timestampSchema,
  message: nonEmptyStringSchema,
  registered: z.literal(false),
  stagingRemoved: z.boolean(),
}).strict();

export type TopDownArenaStarterManifest = z.infer<typeof topDownArenaStarterManifestSchema>;
export type GeneratedProjectManifest = z.infer<typeof generatedProjectManifestSchema>;
export type GeneratedQuestArtifact = z.infer<typeof generatedQuestArtifactSchema>;
export type GeneratedProjectState = z.infer<typeof generatedProjectStateSchema>;
export type Chronicle = z.infer<typeof chronicleSchema>;
export type IdeaSeed = z.infer<typeof ideaSeedSchema>;
export type IdeaSeeds = z.infer<typeof ideaSeedsSchema>;
export type ProjectRegistry = z.infer<typeof projectRegistrySchema>;
export type ProjectRegistryEntry = z.infer<typeof projectRegistryEntrySchema>;
export type GodotVerificationResult = z.infer<typeof godotVerificationResultSchema>;
export type GitBaselineResult = z.infer<typeof gitBaselineResultSchema>;
export type CreationProvenance = z.infer<typeof creationProvenanceSchema>;
