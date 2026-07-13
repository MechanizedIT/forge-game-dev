import { z } from "zod";

import {
  nonEmptyStringSchema,
  referenceIdSchema,
  relativePathSchema,
  schemaVersionSchema,
  slugSchema,
} from "./shared.js";
import { canTransitionWorkflow, workflowStageSchema } from "./workflow.js";

const criterionResultSchema = z
  .object({
    criterionId: referenceIdSchema,
    result: z.enum(["passed", "failed"]),
    evidence: z.array(referenceIdSchema),
  })
  .strict();

export const reviewResultSchema = z
  .object({
    schemaVersion: schemaVersionSchema,
    runId: slugSchema,
    questId: slugSchema,
    stage: z.literal("REVIEW"),
    verdict: z.enum(["passed", "failed", "needs_play_check"]),
    criteria: z.array(criterionResultSchema).min(1),
    scope: z
      .object({
        result: z.enum(["passed", "failed"]),
        unexpectedFiles: z.array(relativePathSchema),
      })
      .strict(),
    playCheck: z
      .object({
        result: z.enum(["passed", "failed", "not_run"]),
        evidence: nonEmptyStringSchema,
      })
      .strict(),
    concerns: z.array(nonEmptyStringSchema),
    nextStage: workflowStageSchema,
  })
  .strict()
  .superRefine((result, context) => {
    if (!canTransitionWorkflow("REVIEW", result.nextStage)) {
      context.addIssue({
        code: "custom",
        path: ["nextStage"],
        message: `REVIEW cannot transition to ${result.nextStage}`,
      });
    }

    if (result.verdict === "needs_play_check" && result.nextStage !== "REVIEW") {
      context.addIssue({
        code: "custom",
        path: ["nextStage"],
        message: "A pending play check must remain in REVIEW",
      });
    }

    if (result.verdict === "needs_play_check" && result.playCheck.result !== "not_run") {
      context.addIssue({
        code: "custom",
        path: ["playCheck", "result"],
        message: "A pending play check must be recorded as not_run",
      });
    }

    if (result.verdict === "passed") {
      if (result.playCheck.result !== "passed") {
        context.addIssue({
          code: "custom",
          path: ["playCheck", "result"],
          message: "A passed review requires creator play confirmation",
        });
      }

      if (result.nextStage !== "DOCUMENT") {
        context.addIssue({
          code: "custom",
          path: ["nextStage"],
          message: "A passed review advances to DOCUMENT",
        });
      }
    }
  });

export type ReviewResult = z.infer<typeof reviewResultSchema>;
