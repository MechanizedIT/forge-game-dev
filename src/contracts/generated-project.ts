import { z } from "zod";

import {
  nonEmptyStringSchema,
  relativePathSchema,
  schemaVersionSchema,
  slugSchema,
  timestampSchema,
} from "./shared.js";
import { acceptedRoadmapSchema, foundationFitSchema } from "./starter-aware-planning.js";

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
    acceptedRoadmap: relativePathSchema.optional(),
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

export const GENERATED_QUEST_PLAN_STATES = [
  "planned",
  "available",
  "blocked",
  "deferred",
  "completed",
] as const;

export const generatedQuestPlanStateSchema = z.enum(GENERATED_QUEST_PLAN_STATES);
export const generatedEditableFileRoleSchema = z.enum(["main_scene", "main_script", "objective_visual"]);
export const generatedVerificationProfileSchema = z.enum(["gravity_orb_presence_v1", "relay_activation_v1"]);

export const generatedQuestCompletionSchema = z.object({
  status: z.literal("completed"),
  runId: slugSchema,
  completedAt: timestampSchema,
  changedFiles: z.array(relativePathSchema).min(1).max(4),
  verificationProfile: generatedVerificationProfileSchema.nullable(),
  contractFingerprint: sha256Schema,
  creatorConfirmation: z.literal("worked"),
}).strict();

export const generatedQuestImplementationSchema = z.union([
  z.literal("not_enabled"),
  generatedQuestCompletionSchema,
]);

export const generatedQuestArtifactV2Schema = z.object({
  schemaVersion: z.literal(2),
  projectId: slugSchema,
  questId: slugSchema,
  revision: z.number().int().positive(),
  sequence: z.number().int().positive().max(5),
  title: nonEmptyStringSchema,
  visibleOutcome: z.string().trim().min(10).max(280),
  whyItMatters: z.string().trim().min(10).max(500),
  currentPlayableFacts: z.array(z.string().trim().min(1).max(240)).min(1).max(12),
  dependsOn: z.array(slugSchema).max(4),
  state: generatedQuestPlanStateSchema,
  scope: z.object({
    included: z.array(z.string().trim().min(1).max(240)).min(1).max(12),
    excluded: z.array(z.string().trim().min(1).max(240)).min(1).max(12),
  }).strict(),
  acceptanceCriteria: z.array(z.object({
    id: z.string().regex(/^AC-[1-9][0-9]*$/u),
    criterion: nonEmptyStringSchema,
    verificationIds: z.array(z.string().regex(/^V-[1-9][0-9]*$/u)).min(1),
  }).strict()).min(1).max(8),
  verificationIdeas: z.array(z.object({
    id: z.string().regex(/^V-[1-9][0-9]*$/u),
    idea: nonEmptyStringSchema,
  }).strict()).min(1).max(8),
  editableFileRoles: z.array(generatedEditableFileRoleSchema).max(4),
  verificationProfile: generatedVerificationProfileSchema.nullable(),
  workOrder: z.object({
    existingFiles: z.array(relativePathSchema).max(4),
    newFiles: z.array(relativePathSchema).max(4),
  }).strict().superRefine((workOrder, context) => {
    const files = [...workOrder.existingFiles, ...workOrder.newFiles];
    if (files.length < 1 || files.length > 4) {
      context.addIssue({ code: "custom", message: "A work order must approve one to four files" });
    }
    if (new Set(files).size !== files.length) {
      context.addIssue({ code: "custom", message: "Work-order files must be unique" });
    }
  }).optional(),
  implementation: generatedQuestImplementationSchema,
}).strict().superRefine((quest, context) => {
  if (!quest.workOrder && (quest.verificationProfile === null) !== (quest.editableFileRoles.length === 0)) {
    context.addIssue({ code: "custom", message: "A registered verification profile and editable roles must be assigned together", path: ["verificationProfile"] });
  }
  if (quest.implementation !== "not_enabled" && quest.verificationProfile !== quest.implementation.verificationProfile) {
    context.addIssue({ code: "custom", message: "Completion provenance must match the quest verification profile", path: ["implementation", "verificationProfile"] });
  }
});

export const generatedQuestArtifactAnySchema = z.union([
  generatedQuestArtifactV2Schema,
  generatedQuestArtifactSchema,
]);

export const generatedRoadmapQuestV2Schema = z.object({
  questId: slugSchema,
  revision: z.number().int().positive(),
  title: nonEmptyStringSchema,
  summary: nonEmptyStringSchema,
  state: generatedQuestPlanStateSchema,
  dependsOn: z.array(slugSchema),
  position: z.object({
    column: z.number().int().nonnegative(),
    row: z.number().int().nonnegative(),
  }).strict(),
}).strict();

export const generatedRoadmapV2Schema = z.object({
  schemaVersion: z.literal(2),
  projectId: slugSchema,
  updatedAt: timestampSchema,
  quests: z.array(generatedRoadmapQuestV2Schema).min(1).max(5),
}).strict();

export const generatedProjectStateSchema = z.object({
  schemaVersion: schemaVersionSchema,
  projectId: slugSchema,
  currentView: z.enum(["project_created", "project_world", "quest_brief", "chronicle", "documents"]),
  selectedQuestId: slugSchema.nullable(),
  lastOpenedAt: timestampSchema,
}).strict();

export const generatedProjectStateV2Schema = z.object({
  schemaVersion: z.literal(2),
  projectId: slugSchema,
  currentView: z.enum(["project_created", "project_world", "quest_brief", "chronicle", "documents"]),
  selectedQuestId: slugSchema.nullable(),
  nextRecommendedQuestId: slugSchema.nullable(),
  lastOpenedAt: timestampSchema,
}).strict();

export const generatedProjectStateAnySchema = z.union([
  generatedProjectStateV2Schema,
  generatedProjectStateSchema,
]);

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

const projectCreatedChronicleEntryV2Schema = z.object({
  entryId: slugSchema,
  type: z.literal("project_created"),
  occurredAt: timestampSchema,
  summary: nonEmptyStringSchema,
}).strict();

const questCompletedChronicleEntrySchema = z.object({
  entryId: slugSchema,
  type: z.literal("quest_completed"),
  occurredAt: timestampSchema,
  summary: nonEmptyStringSchema,
  questId: slugSchema,
  runId: slugSchema,
  visibleOutcome: nonEmptyStringSchema,
}).strict();

export const chronicleV2Schema = z.object({
  schemaVersion: z.literal(2),
  projectId: slugSchema,
  entries: z.array(z.union([
    projectCreatedChronicleEntryV2Schema,
    questCompletedChronicleEntrySchema,
  ])).min(1),
}).strict();

export const chronicleAnySchema = z.union([chronicleV2Schema, chronicleSchema]);

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
  // One planning request may need one repair, then one clarification response may
  // also need one repair. All four turns remain inside the same bounded session.
  attempts: z.number().int().min(1).max(4),
  blueprintSha256: sha256Schema,
  approvedAt: timestampSchema,
  originalIdea: z.string().trim().min(1).max(1_500).optional(),
  recommendedInterpretation: nonEmptyStringSchema.optional(),
  foundationFit: foundationFitSchema.optional(),
}).strict();

export const acceptedRoadmapProvenanceSchema = z.object({
  schemaVersion: z.literal(1),
  projectId: slugSchema,
  acceptedRoadmap: acceptedRoadmapSchema,
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
  acceptedRoadmapSha256: sha256Schema.optional(),
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
export type GeneratedQuestArtifactV2 = z.infer<typeof generatedQuestArtifactV2Schema>;
export type GeneratedQuestArtifactAny = z.infer<typeof generatedQuestArtifactAnySchema>;
export type GeneratedQuestPlanState = z.infer<typeof generatedQuestPlanStateSchema>;
export type GeneratedVerificationProfile = z.infer<typeof generatedVerificationProfileSchema>;
export type GeneratedRoadmapV2 = z.infer<typeof generatedRoadmapV2Schema>;
export type GeneratedProjectState = z.infer<typeof generatedProjectStateSchema>;
export type GeneratedProjectStateV2 = z.infer<typeof generatedProjectStateV2Schema>;
export type GeneratedProjectStateAny = z.infer<typeof generatedProjectStateAnySchema>;
export type Chronicle = z.infer<typeof chronicleSchema>;
export type ChronicleV2 = z.infer<typeof chronicleV2Schema>;
export type ChronicleAny = z.infer<typeof chronicleAnySchema>;
export type IdeaSeed = z.infer<typeof ideaSeedSchema>;
export type IdeaSeeds = z.infer<typeof ideaSeedsSchema>;
export type ProjectRegistry = z.infer<typeof projectRegistrySchema>;
export type ProjectRegistryEntry = z.infer<typeof projectRegistryEntrySchema>;
export type GodotVerificationResult = z.infer<typeof godotVerificationResultSchema>;
export type GitBaselineResult = z.infer<typeof gitBaselineResultSchema>;
export type CreationProvenance = z.infer<typeof creationProvenanceSchema>;
