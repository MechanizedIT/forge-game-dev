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
  "verifying",
  "failed",
  "waiting_for_playtest",
  "completion_pending",
  "completed",
  "cancelled",
  "interrupted",
] as const;

export const generatedRunPhaseSchema = z.enum(GENERATED_RUN_PHASES);
export const generatedCreatorResultSchema = z.enum([
  "worked",
  "did_not_work",
  "not_ready",
  "retry",
  "cancel",
]);
export const generatedProofReferenceSchema = z.enum(["boundary", "project_health", "mechanic", "creator"]);

export const generatedAllowedFileSchema = z.object({
  role: generatedEditableFileRoleSchema,
  relativePath: relativePathSchema,
  preSha256: sha256DigestSchema,
}).strict();

export const generatedQuestImplementationContractSchema = z.object({
  schemaVersion: schemaVersionSchema,
  projectId: slugSchema,
  questId: slugSchema,
  questRevision: z.number().int().positive(),
  visibleOutcome: z.string().trim().min(10).max(280),
  whyItMatters: z.string().trim().min(10).max(500),
  currentPlayableFacts: z.array(z.string().trim().min(1).max(240)).min(1).max(12),
  steps: z.array(z.object({
    id: z.string().regex(/^STEP-[1-9][0-9]*$/u),
    summary: z.string().trim().min(5).max(280),
    fileRoles: z.array(generatedEditableFileRoleSchema).min(1).max(4),
  }).strict()).min(1).max(6),
  allowedFiles: z.array(generatedAllowedFileSchema).min(1).max(4),
  excludedScope: z.array(z.string().trim().min(1).max(240)).min(1).max(12),
  acceptanceCriteria: z.array(z.object({
    id: z.string().regex(/^AC-[1-9][0-9]*$/u),
    criterion: nonEmptyStringSchema,
    proofReferences: z.array(generatedProofReferenceSchema).min(1),
  }).strict()).min(1).max(8),
  verificationProfile: generatedVerificationProfileSchema,
  creatorPlaySteps: z.array(z.string().trim().min(1).max(240)).min(1).max(8),
  risksAndAssumptions: z.array(z.string().trim().min(1).max(280)).max(8),
  fingerprint: sha256DigestSchema,
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

export const generatedInventoryEntrySchema = z.object({
  relativePath: relativePathSchema,
  sha256: sha256DigestSchema,
  size: z.number().int().nonnegative(),
}).strict();

export const generatedProofLayerSchema = z.object({
  result: z.enum(["pending", "passed", "failed"]),
  summary: nonEmptyStringSchema,
  evidence: z.array(z.string().trim().min(1).max(2_000)).max(12),
  verifiedAt: timestampSchema.nullable(),
}).strict();

export const generatedQuestProofSchema = z.object({
  boundary: generatedProofLayerSchema,
  projectHealth: generatedProofLayerSchema,
  mechanic: generatedProofLayerSchema,
  creator: generatedProofLayerSchema,
}).strict();

export const generatedQuestRunJournalSchema = z.object({
  schemaVersion: schemaVersionSchema,
  runId: slugSchema,
  projectId: slugSchema,
  questId: slugSchema,
  questRevision: z.number().int().positive(),
  phase: generatedRunPhaseSchema,
  canonicalProjectPath: nonEmptyStringSchema,
  baselineHead: generatedGitShaSchema,
  startHead: generatedGitShaSchema,
  contractFingerprint: sha256DigestSchema,
  allowedFiles: z.array(generatedAllowedFileSchema).min(1).max(4),
  startInventory: z.array(generatedInventoryEntrySchema),
  observedPostHashes: z.record(relativePathSchema, sha256DigestSchema),
  changedFiles: z.array(relativePathSchema).max(4),
  progress: z.array(z.string().trim().min(1).max(240)).max(24),
  proofs: generatedQuestProofSchema,
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
}).strict();

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
export type GeneratedQuestImplementationContract = z.infer<typeof generatedQuestImplementationContractSchema>;
export type GeneratedQuestProof = z.infer<typeof generatedQuestProofSchema>;
export type GeneratedQuestRunJournal = z.infer<typeof generatedQuestRunJournalSchema>;
export type GeneratedCompletionReceipt = z.infer<typeof generatedCompletionReceiptSchema>;
export type GeneratedCreatorResult = z.infer<typeof generatedCreatorResultSchema>;
export type GeneratedRunPhase = z.infer<typeof generatedRunPhaseSchema>;
