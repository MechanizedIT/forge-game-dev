import { z } from "zod";

import {
  nonEmptyStringSchema,
  referenceIdSchema,
  relativePathSchema,
  schemaVersionSchema,
  slugSchema,
} from "./shared.js";

const implementationStepSchema = z
  .object({
    id: referenceIdSchema,
    description: nonEmptyStringSchema,
    files: z.array(relativePathSchema),
    criteria: z.array(referenceIdSchema).min(1),
  })
  .strict();

export const implementationPlanSchema = z
  .object({
    schemaVersion: schemaVersionSchema,
    runId: slugSchema,
    questId: slugSchema,
    revision: z.number().int().positive(),
    stage: z.literal("APPROVE"),
    summary: nonEmptyStringSchema,
    assumptions: z.array(nonEmptyStringSchema),
    steps: z.array(implementationStepSchema).min(1),
    verification: z.array(referenceIdSchema).min(1),
    excluded: z.array(nonEmptyStringSchema),
    openDecisions: z.array(nonEmptyStringSchema),
  })
  .strict();

export type ImplementationPlan = z.infer<typeof implementationPlanSchema>;
