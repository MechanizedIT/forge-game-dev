import { z } from "zod";

import { sha256DigestSchema } from "./generated-quest-run.js";
import { relativePathSchema, slugSchema, timestampSchema } from "./shared.js";

const shortText = z.string().trim().min(1).max(240);

export const systemQuestQuestionSchema = z.object({
  questionId: slugSchema,
  question: shortText,
  whyItMatters: shortText,
}).strict();

export const systemQuestProposalItemSchema = z.object({
  title: z.string().trim().min(1).max(80),
  playerVisibleOutcome: z.string().trim().min(10).max(280),
  whyItMatters: z.string().trim().min(10).max(500),
  doneWhen: z.array(shortText).min(1).max(4),
  excludedScope: z.array(shortText).min(1).max(4),
  dependencyIndexes: z.array(z.number().int().nonnegative()).max(4),
}).strict();

export const systemQuestPlanningResultSchema = z.discriminatedUnion("resultType", [
  z.object({
    resultType: z.literal("clarification"),
    clarificationQuestions: z.array(systemQuestQuestionSchema).min(1).max(3),
  }).strict(),
  z.object({
    resultType: z.literal("proposal"),
    quests: z.array(systemQuestProposalItemSchema).min(1).max(4),
  }).strict(),
]);

export const approvedSystemQuestWorkOrderSchema = z.object({
  existingFiles: z.array(relativePathSchema).max(4),
  newFiles: z.array(relativePathSchema).max(4),
  fingerprint: sha256DigestSchema,
  acceptedAt: timestampSchema,
}).strict().superRefine((workOrder, context) => {
  const files = [...workOrder.existingFiles, ...workOrder.newFiles];
  if (files.length < 1 || files.length > 4) context.addIssue({ code: "custom", message: "A work order must contain one to four files" });
  if (new Set(files).size !== files.length) context.addIssue({ code: "custom", message: "Work-order files must be unique" });
});

export const acceptedNativeQuestSchema = z.object({
  questId: slugSchema,
  title: z.string().trim().min(1).max(80),
  playerVisibleOutcome: z.string().trim().min(10).max(280),
  whyItMatters: z.string().trim().min(10).max(500),
  doneWhen: z.array(shortText).min(1).max(4),
  excludedScope: z.array(shortText).min(1).max(4),
  dependsOn: z.array(slugSchema).max(4),
  workOrder: approvedSystemQuestWorkOrderSchema.optional(),
}).strict();

export const acceptedSystemQuestBatchSchema = z.object({
  systemId: slugSchema,
  baseQuestIds: z.array(slugSchema),
  creatorDescription: z.string().trim().min(12).max(1_500),
  sourceFingerprint: sha256DigestSchema,
  proposalFingerprint: sha256DigestSchema,
  acceptedAt: timestampSchema,
  quests: z.array(acceptedNativeQuestSchema).min(1).max(5),
}).strict();

export const acceptedSystemQuestPlanSchema = z.object({
  schemaVersion: z.literal(1),
  projectId: slugSchema,
  systems: z.array(acceptedSystemQuestBatchSchema).min(1).max(6),
}).strict().superRefine((plan, context) => {
  const systemIds = plan.systems.map((system) => system.systemId);
  if (new Set(systemIds).size !== systemIds.length) context.addIssue({ code: "custom", message: "System quest records must have unique system IDs", path: ["systems"] });
  const questIds = plan.systems.flatMap((system) => system.quests.map((quest) => quest.questId));
  if (new Set(questIds).size !== questIds.length) context.addIssue({ code: "custom", message: "Native quest IDs must be globally unique", path: ["systems"] });
  for (const system of plan.systems) {
    const allowedDependencies = new Set(system.baseQuestIds);
    system.quests.forEach((quest, index) => {
      for (const dependency of quest.dependsOn) {
        if (!allowedDependencies.has(dependency)) context.addIssue({ code: "custom", message: "Quest dependencies must point backward inside the same system", path: ["systems", plan.systems.indexOf(system), "quests", index, "dependsOn"] });
      }
      allowedDependencies.add(quest.questId);
      if (quest.workOrder && index !== 0) context.addIssue({ code: "custom", message: "Only the first new quest may carry this milestone's work order", path: ["systems", plan.systems.indexOf(system), "quests", index, "workOrder"] });
    });
  }
});

export const systemQuestFileChoiceSchema = z.object({
  existingFiles: z.array(relativePathSchema).max(4),
  newFiles: z.array(relativePathSchema).max(4),
}).strict().superRefine((choice, context) => {
  const files = [...choice.existingFiles, ...choice.newFiles];
  if (files.length < 1 || files.length > 4) context.addIssue({ code: "custom", message: "Choose one to four files" });
  if (new Set(files).size !== files.length) context.addIssue({ code: "custom", message: "Choose each file only once" });
});

export type SystemQuestQuestion = z.infer<typeof systemQuestQuestionSchema>;
export type SystemQuestProposalItem = z.infer<typeof systemQuestProposalItemSchema>;
export type SystemQuestPlanningResult = z.infer<typeof systemQuestPlanningResultSchema>;
export type AcceptedNativeQuest = z.infer<typeof acceptedNativeQuestSchema>;
export type AcceptedSystemQuestBatch = z.infer<typeof acceptedSystemQuestBatchSchema>;
export type AcceptedSystemQuestPlan = z.infer<typeof acceptedSystemQuestPlanSchema>;
export type SystemQuestFileChoice = z.infer<typeof systemQuestFileChoiceSchema>;
