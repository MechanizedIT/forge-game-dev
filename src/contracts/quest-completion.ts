import { z } from "zod";

import {
  nonEmptyStringSchema,
  relativePathSchema,
  schemaVersionSchema,
  slugSchema,
  timestampSchema,
} from "./shared.js";

export const creatorPlayResponseSchema = z.enum([
  "I SAW IT WORK",
  "IT DID NOT WORK",
  "CANCEL",
]);

export const questCompletionSchema = z
  .object({
    schemaVersion: schemaVersionSchema,
    runId: slugSchema,
    questId: slugSchema,
    workflowState: z.literal("COMPLETE"),
    roadmapState: z.literal("completed"),
    automatedReview: z
      .object({
        verdict: z.enum(["PASS", "CONDITIONAL PASS"]),
        artifact: relativePathSchema,
      })
      .strict(),
    finalReview: relativePathSchema,
    gameLaunch: z
      .object({
        result: z.literal("passed"),
        godotVersion: nonEmptyStringSchema,
      })
      .strict(),
    creatorConfirmation: z
      .object({
        response: z.literal("I SAW IT WORK"),
        confirmedAt: timestampSchema,
      })
      .strict(),
    completedAt: timestampSchema,
    summary: nonEmptyStringSchema,
  })
  .strict();

export type CreatorPlayResponse = z.infer<typeof creatorPlayResponseSchema>;
export type QuestCompletion = z.infer<typeof questCompletionSchema>;
