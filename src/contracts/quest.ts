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
  .strict();

export type Quest = z.infer<typeof questSchema>;
