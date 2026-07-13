import { z } from "zod";

import {
  commandSchema,
  nonEmptyStringSchema,
  referenceIdSchema,
  relativePathSchema,
  schemaVersionSchema,
  slugSchema,
} from "./shared.js";

const fileChangeSchema = z
  .object({
    path: relativePathSchema,
    summary: nonEmptyStringSchema,
  })
  .strict();

const verificationRunSchema = z
  .object({
    verificationId: referenceIdSchema,
    command: commandSchema,
    exitCode: z.number().int(),
    evidence: nonEmptyStringSchema,
  })
  .strict();

export const implementationHandoffSchema = z
  .object({
    schemaVersion: schemaVersionSchema,
    runId: slugSchema,
    questId: slugSchema,
    stage: z.literal("REVIEW"),
    approvedPlan: relativePathSchema,
    codexThreadId: nonEmptyStringSchema,
    summary: nonEmptyStringSchema,
    status: z.enum(["succeeded", "failed", "partial"]),
    changes: z.array(fileChangeSchema),
    verificationRuns: z.array(verificationRunSchema),
    deviations: z.array(nonEmptyStringSchema),
    remainingRisks: z.array(nonEmptyStringSchema),
  })
  .strict();

export type ImplementationHandoff = z.infer<typeof implementationHandoffSchema>;
