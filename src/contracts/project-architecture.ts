import { z } from "zod";

import { relativePathSchema, slugSchema, timestampSchema } from "./shared.js";

const conciseTextSchema = z.string().trim().min(1).max(500);

export const gameAreaCategorySchema = z.enum([
  "gameplay",
  "presentation",
  "world",
  "data",
  "platform",
  "other",
]);

export const architectureChangeSchema = z.object({
  changeId: slugSchema,
  stepId: slugSchema,
  workSessionId: slugSchema.nullable(),
  summary: conciseTextSchema,
  changedFiles: z.array(relativePathSchema).max(12),
  unexpectedFiles: z.array(relativePathSchema).max(12),
  verificationOutcome: z.enum(["pending", "passed", "failed"]),
  playtestOutcome: z.enum(["worked", "did_not_work", "not_ready", "retry", "cancel", "not_run"]),
  creatorFeedback: z.string().trim().max(1_000),
  occurredAt: timestampSchema,
}).strict();

export const gameAreaSchema = z.object({
  id: slugSchema,
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(500),
  category: gameAreaCategorySchema,
  relatedFilePaths: z.array(relativePathSchema).max(80),
  dependencyIds: z.array(slugSchema).max(20),
  relatedExperienceIds: z.array(slugSchema).max(40),
  relatedStepIds: z.array(slugSchema).max(120),
  constraints: z.array(conciseTextSchema).max(12),
  recentChanges: z.array(architectureChangeSchema).max(20),
  updatedAt: timestampSchema,
}).strict();

export const projectArchitectureSchema = z.object({
  schemaVersion: z.literal(1),
  projectId: slugSchema,
  gameAreas: z.array(gameAreaSchema).max(80),
  projectConstraints: z.array(conciseTextSchema).max(20),
  updatedAt: timestampSchema,
}).strict().superRefine((architecture, context) => {
  const ids = architecture.gameAreas.map((area) => area.id);
  const known = new Set(ids);
  if (known.size !== ids.length) context.addIssue({ code: "custom", message: "Game Area IDs must be unique", path: ["gameAreas"] });
  architecture.gameAreas.forEach((area, index) => {
    if (new Set(area.dependencyIds).size !== area.dependencyIds.length || area.dependencyIds.some((id) => id === area.id || !known.has(id))) {
      context.addIssue({ code: "custom", message: "Game Area dependencies must be unique references to other Game Areas", path: ["gameAreas", index, "dependencyIds"] });
    }
  });
});

export const gameAreaMutationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("edit"), areaId: slugSchema, name: z.string().trim().min(1).max(80), description: z.string().trim().min(1).max(500) }).strict(),
  z.object({ action: z.literal("set_files"), areaId: slugSchema, relatedFilePaths: z.array(relativePathSchema).max(80) }).strict(),
  z.object({ action: z.literal("set_dependencies"), areaId: slugSchema, dependencyIds: z.array(slugSchema).max(20) }).strict(),
  z.object({ action: z.literal("merge"), areaId: slugSchema, duplicateAreaId: slugSchema }).strict(),
]);

export type ArchitectureChange = z.infer<typeof architectureChangeSchema>;
export type GameArea = z.infer<typeof gameAreaSchema>;
export type GameAreaCategory = z.infer<typeof gameAreaCategorySchema>;
export type GameAreaMutation = z.infer<typeof gameAreaMutationSchema>;
export type ProjectArchitecture = z.infer<typeof projectArchitectureSchema>;
