import { z } from "zod";

import { sha256DigestSchema } from "./generated-quest-run.js";
import { nonEmptyStringSchema, slugSchema, timestampSchema } from "./shared.js";

const focusedTextSchema = z.string().trim().min(1).max(240);

export const systemRoadmapQuestionSchema = z.object({
  questionId: slugSchema,
  question: focusedTextSchema,
  whyItMatters: focusedTextSchema,
}).strict();

export const systemRoadmapProposalSystemSchema = z.object({
  existingSystemId: slugSchema.nullable(),
  title: z.string().trim().min(1).max(80),
  outcome: z.string().trim().min(1).max(240),
}).strict();

export const systemRoadmapPlanningResultSchema = z.discriminatedUnion("resultType", [
  z.object({
    resultType: z.literal("clarification"),
    clarificationQuestions: z.array(systemRoadmapQuestionSchema).min(1).max(3),
  }).strict(),
  z.object({
    resultType: z.literal("proposal"),
    systems: z.array(systemRoadmapProposalSystemSchema).min(1).max(6),
  }).strict(),
]);

// The live structured-output API does not accept a top-level `oneOf`. Keep the
// strict saved-result union above, but ask the model for one required envelope
// whose unused list is empty. The planner normalizes and validates it afterward.
export const systemRoadmapModelOutputSchema = z.object({
  resultType: z.enum(["clarification", "proposal"]),
  clarificationQuestions: z.array(systemRoadmapQuestionSchema).max(3),
  systems: z.array(systemRoadmapProposalSystemSchema).max(6),
}).strict();

export const acceptedSystemRoadmapSystemSchema = z.object({
  systemId: slugSchema,
  title: z.string().trim().min(1).max(80),
  outcome: z.string().trim().min(1).max(240),
  questIds: z.array(slugSchema),
}).strict();

export const acceptedSystemRoadmapSchema = z.object({
  schemaVersion: z.literal(1),
  projectId: slugSchema,
  creatorIdea: z.string().trim().min(12).max(1_500),
  sourceFingerprint: sha256DigestSchema,
  proposalFingerprint: sha256DigestSchema,
  acceptedAt: timestampSchema,
  systems: z.array(acceptedSystemRoadmapSystemSchema).min(1).max(6),
}).strict().superRefine((roadmap, context) => {
  const systemIds = roadmap.systems.map((system) => system.systemId);
  if (new Set(systemIds).size !== systemIds.length) {
    context.addIssue({ code: "custom", message: "Accepted system IDs must be unique", path: ["systems"] });
  }
  const questIds = roadmap.systems.flatMap((system) => system.questIds);
  if (new Set(questIds).size !== questIds.length) {
    context.addIssue({ code: "custom", message: "Accepted quests must occur exactly once", path: ["systems"] });
  }
});

export type SystemRoadmapQuestion = z.infer<typeof systemRoadmapQuestionSchema>;
export type SystemRoadmapProposalSystem = z.infer<typeof systemRoadmapProposalSystemSchema>;
export type SystemRoadmapPlanningResult = z.infer<typeof systemRoadmapPlanningResultSchema>;
export type AcceptedSystemRoadmap = z.infer<typeof acceptedSystemRoadmapSchema>;
