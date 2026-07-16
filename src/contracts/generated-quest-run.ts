import { z } from "zod";

import {
  generatedEditableFileRoleSchema,
  generatedVerificationProfileSchema,
} from "./generated-project.js";
import {
  nonEmptyStringSchema,
  relativePathSchema,
  schemaVersionSchema,
  slugSchema,
  timestampSchema,
} from "./shared.js";

export const sha256DigestSchema = z.string().regex(/^[a-f0-9]{64}$/u, "Expected a SHA-256 digest");
export const generatedGitShaSchema = z.string().regex(/^[a-f0-9]{40,64}$/u, "Expected a Git commit SHA");

export const GENERATED_RUN_PHASES = [
  "contract_review",
  "approved",
  "implementing",
  "scope_review",
  "verifying",
  "failed",
  "waiting_for_playtest",
  "completion_pending",
  "completed",
  "cancelled",
  "interrupted",
] as const;

export const generatedRunPhaseSchema = z.enum(GENERATED_RUN_PHASES);
export const generatedRunPhaseV1Schema = z.enum([
  "contract_review",
  "approved",
  "implementing",
  "verifying",
  "failed",
  "waiting_for_playtest",
  "completion_pending",
  "completed",
  "cancelled",
  "interrupted",
]);
export const generatedCreatorResultSchema = z.enum([
  "worked",
  "did_not_work",
  "not_ready",
  "retry",
  "cancel",
]);
export const generatedProofReferenceSchema = z.enum(["boundary", "project_health", "mechanic", "creator"]);

export const generatedAllowedFileV1Schema = z.object({
  role: generatedEditableFileRoleSchema,
  relativePath: relativePathSchema,
  preSha256: sha256DigestSchema,
}).strict();

export const generatedApprovedWorkFileSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("existing"),
    relativePath: relativePathSchema,
    preSha256: sha256DigestSchema,
  }).strict(),
  z.object({
    kind: z.literal("new"),
    relativePath: relativePathSchema,
    encoding: z.literal("utf-8"),
  }).strict(),
]);

export const generatedAllowedFileSchema = z.union([
  generatedAllowedFileV1Schema,
  generatedApprovedWorkFileSchema,
]);

const contractBase = {
  projectId: slugSchema,
  questId: slugSchema,
  questRevision: z.number().int().positive(),
  visibleOutcome: z.string().trim().min(10).max(280),
  whyItMatters: z.string().trim().min(10).max(500),
  repairRequest: z.string().trim().min(3).max(2_000).optional(),
  currentPlayableFacts: z.array(z.string().trim().min(1).max(240)).min(1).max(12),
  excludedScope: z.array(z.string().trim().min(1).max(240)).min(1).max(12),
  acceptanceCriteria: z.array(z.object({
    id: z.string().regex(/^AC-[1-9][0-9]*$/u),
    criterion: nonEmptyStringSchema,
    proofReferences: z.array(generatedProofReferenceSchema).min(1),
  }).strict()).min(1).max(8),
  creatorPlaySteps: z.array(z.string().trim().min(1).max(240)).min(1).max(8),
  risksAndAssumptions: z.array(z.string().trim().min(1).max(280)).max(8),
  fingerprint: sha256DigestSchema,
};

export const generatedQuestImplementationContractV1Schema = z.object({
  schemaVersion: z.literal(1),
  ...contractBase,
  steps: z.array(z.object({
    id: z.string().regex(/^STEP-[1-9][0-9]*$/u),
    summary: z.string().trim().min(5).max(280),
    fileRoles: z.array(generatedEditableFileRoleSchema).min(1).max(4),
  }).strict()).min(1).max(6),
  allowedFiles: z.array(generatedAllowedFileV1Schema).min(1).max(4),
  verificationProfile: generatedVerificationProfileSchema,
}).strict().superRefine((contract, context) => {
  const roles = contract.allowedFiles.map((item) => item.role);
  const paths = contract.allowedFiles.map((item) => item.relativePath);
  if (new Set(roles).size !== roles.length) {
    context.addIssue({ code: "custom", message: "Allowed file roles must be unique", path: ["allowedFiles"] });
  }
  if (new Set(paths).size !== paths.length) {
    context.addIssue({ code: "custom", message: "Allowed file paths must be unique", path: ["allowedFiles"] });
  }
  const allowedRoles = new Set(roles);
  for (const [index, step] of contract.steps.entries()) {
    if (step.fileRoles.some((role) => !allowedRoles.has(role))) {
      context.addIssue({ code: "custom", message: "Step references a role outside allowedFiles", path: ["steps", index, "fileRoles"] });
    }
  }
});

export const generatedQuestImplementationContractV2Schema = z.object({
  schemaVersion: z.literal(2),
  ...contractBase,
  steps: z.array(z.object({
    id: z.string().regex(/^STEP-[1-9][0-9]*$/u),
    summary: z.string().trim().min(5).max(280),
    filePaths: z.array(relativePathSchema).min(1).max(4),
  }).strict()).min(1).max(6),
  allowedFiles: z.array(generatedApprovedWorkFileSchema).min(1).max(4),
  verificationProfile: generatedVerificationProfileSchema.nullable(),
}).strict().superRefine((contract, context) => {
  const paths = contract.allowedFiles.map((item) => item.relativePath);
  if (new Set(paths).size !== paths.length) {
    context.addIssue({ code: "custom", message: "Approved work paths must be unique", path: ["allowedFiles"] });
  }
  const allowedPaths = new Set(paths);
  for (const [index, step] of contract.steps.entries()) {
    if (step.filePaths.some((relativePath) => !allowedPaths.has(relativePath))) {
      context.addIssue({ code: "custom", message: "Step references a path outside allowedFiles", path: ["steps", index, "filePaths"] });
    }
  }
});

export const generatedQuestImplementationContractSchema = z.union([
  generatedQuestImplementationContractV2Schema,
  generatedQuestImplementationContractV1Schema,
]);

export const generatedInventoryEntrySchema = z.object({
  relativePath: relativePathSchema,
  sha256: sha256DigestSchema,
  size: z.number().int().nonnegative(),
}).strict();

export const generatedProofLayerV1Schema = z.object({
  result: z.enum(["pending", "passed", "failed"]),
  summary: nonEmptyStringSchema,
  evidence: z.array(z.string().trim().min(1).max(2_000)).max(12),
  verifiedAt: timestampSchema.nullable(),
}).strict();

export const generatedProofLayerSchema = z.object({
  result: z.enum(["pending", "passed", "failed", "not_run"]),
  summary: nonEmptyStringSchema,
  evidence: z.array(z.string().trim().min(1).max(2_000)).max(12),
  verifiedAt: timestampSchema.nullable(),
}).strict();

export const generatedQuestProofV1Schema = z.object({
  boundary: generatedProofLayerV1Schema,
  projectHealth: generatedProofLayerV1Schema,
  mechanic: generatedProofLayerV1Schema,
  creator: generatedProofLayerV1Schema,
}).strict();

export const generatedQuestProofV2Schema = z.object({
  boundary: generatedProofLayerSchema,
  projectHealth: generatedProofLayerSchema,
  mechanic: generatedProofLayerSchema,
  creator: generatedProofLayerSchema,
}).strict();

export const generatedQuestProofSchema = z.union([generatedQuestProofV2Schema, generatedQuestProofV1Schema]);

const journalBase = {
  runId: slugSchema,
  projectId: slugSchema,
  questId: slugSchema,
  questRevision: z.number().int().positive(),
  canonicalProjectPath: nonEmptyStringSchema,
  baselineHead: generatedGitShaSchema,
  startHead: generatedGitShaSchema,
  contractFingerprint: sha256DigestSchema,
  startInventory: z.array(generatedInventoryEntrySchema),
  observedPostHashes: z.record(relativePathSchema, sha256DigestSchema),
  changedFiles: z.array(relativePathSchema).max(4),
  progress: z.array(z.string().trim().min(1).max(240)).max(24),
  contextSummary: z.object({
    primaryArea: z.string().trim().min(1).max(80).nullable(),
    secondaryAreas: z.array(z.string().trim().min(1).max(80)).max(3),
    relatedPreviousSteps: z.array(slugSchema).max(5),
    selectedFiles: z.array(relativePathSchema).max(12),
    regressionChecks: z.array(z.string().trim().min(1).max(500)).max(8),
  }).strict().optional(),
  creatorResult: generatedCreatorResultSchema.nullable(),
  codexThreadId: z.string().trim().min(1).max(200).nullable(),
  error: z.string().trim().min(1).max(2_000).nullable(),
  recovery: z.object({
    action: z.enum(["none", "resume", "retry", "rollback", "manual"]),
    message: nonEmptyStringSchema,
    concurrentPaths: z.array(relativePathSchema),
  }).strict(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
};

export const generatedQuestRunJournalV1Schema = z.object({
  schemaVersion: z.literal(1),
  ...journalBase,
  phase: generatedRunPhaseV1Schema,
  allowedFiles: z.array(generatedAllowedFileV1Schema).min(1).max(4),
  proofs: generatedQuestProofV1Schema,
}).strict();

const generatedScopeRequestPathSchema = relativePathSchema
  .refine((value) => value.length <= 240 && !value.includes("\\") && !value.startsWith("./") && !value.includes("//"), "Requested paths must be short normalized project-relative paths")
  .refine((value) => /\.(?:gd|tscn|tres|gdshader|gdshaderinc)$/u.test(value), "Requested paths must be Godot text files");

export const generatedScopeRequestSchema = z.object({
  paths: z.array(generatedScopeRequestPathSchema).min(1).max(4),
  reason: z.string().trim().min(1).max(500),
}).strict().superRefine((request, context) => {
  if (new Set(request.paths).size !== request.paths.length) {
    context.addIssue({ code: "custom", message: "Requested paths must be unique", path: ["paths"] });
  }
});

export const generatedQuestRunJournalV2Schema = z.object({
  schemaVersion: z.literal(2),
  ...journalBase,
  phase: generatedRunPhaseSchema,
  allowedFiles: z.array(generatedApprovedWorkFileSchema).min(1).max(4),
  proofs: generatedQuestProofV2Schema,
  scopeRequest: generatedScopeRequestSchema.nullable(),
}).strict();

export const generatedQuestRunJournalSchema = z.union([
  generatedQuestRunJournalV2Schema,
  generatedQuestRunJournalV1Schema,
]);

export const generatedCompletionReceiptSchema = z.object({
  schemaVersion: schemaVersionSchema,
  projectId: slugSchema,
  questId: slugSchema,
  runId: slugSchema,
  commitSha: generatedGitShaSchema,
  treeSha: generatedGitShaSchema,
  committedAt: timestampSchema,
}).strict();

export type GeneratedAllowedFile = z.infer<typeof generatedAllowedFileSchema>;
export type GeneratedApprovedWorkFile = z.infer<typeof generatedApprovedWorkFileSchema>;
export type GeneratedQuestImplementationContract = z.infer<typeof generatedQuestImplementationContractSchema>;
export type GeneratedQuestProof = z.infer<typeof generatedQuestProofSchema>;
export type GeneratedQuestRunJournal = z.infer<typeof generatedQuestRunJournalSchema>;
export type GeneratedCompletionReceipt = z.infer<typeof generatedCompletionReceiptSchema>;
export type GeneratedCreatorResult = z.infer<typeof generatedCreatorResultSchema>;
export type GeneratedRunPhase = z.infer<typeof generatedRunPhaseSchema>;
