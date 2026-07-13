import { z } from "zod";

import {
  commandSchema,
  nonEmptyStringSchema,
  referenceIdSchema,
  relativePathSchema,
  schemaVersionSchema,
  slugSchema,
} from "./shared.js";

const acceptanceCriterionSchema = z
  .object({
    id: referenceIdSchema,
    text: nonEmptyStringSchema,
  })
  .strict();

const commandVerificationSchema = z
  .object({
    id: referenceIdSchema,
    kind: z.literal("command"),
    argv: commandSchema,
  })
  .strict();

const playVerificationSchema = z
  .object({
    id: referenceIdSchema,
    kind: z.literal("play"),
    instruction: nonEmptyStringSchema,
  })
  .strict();

export const questSchema = z
  .object({
    schemaVersion: schemaVersionSchema,
    questId: slugSchema,
    title: nonEmptyStringSchema,
    summary: nonEmptyStringSchema,
    playerOutcome: nonEmptyStringSchema,
    whyItMatters: nonEmptyStringSchema,
    baselineBehavior: nonEmptyStringSchema,
    expectedBehavior: nonEmptyStringSchema,
    scope: z
      .object({
        included: z.array(nonEmptyStringSchema).min(1),
        excluded: z.array(nonEmptyStringSchema),
      })
      .strict(),
    contextFiles: z.array(relativePathSchema).min(1),
    acceptanceCriteria: z.array(acceptanceCriterionSchema).min(1),
    verification: z
      .array(z.discriminatedUnion("kind", [commandVerificationSchema, playVerificationSchema]))
      .min(1),
    preparedPlan: relativePathSchema,
  })
  .strict()
  .superRefine((quest, context) => {
    const criterionIds = quest.acceptanceCriteria.map((criterion) => criterion.id);
    if (new Set(criterionIds).size !== criterionIds.length) {
      context.addIssue({
        code: "custom",
        path: ["acceptanceCriteria"],
        message: "Acceptance criterion IDs must be unique",
      });
    }

    const verificationIds = quest.verification.map((verification) => verification.id);
    if (new Set(verificationIds).size !== verificationIds.length) {
      context.addIssue({
        code: "custom",
        path: ["verification"],
        message: "Verification IDs must be unique",
      });
    }
  });

export type Quest = z.infer<typeof questSchema>;
