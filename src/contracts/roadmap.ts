import { z } from "zod";

import {
  nonEmptyStringSchema,
  schemaVersionSchema,
  slugSchema,
  timestampSchema,
} from "./shared.js";
import { roadmapQuestStateSchema } from "./workflow.js";

export const roadmapQuestSchema = z
  .object({
    questId: slugSchema,
    title: nonEmptyStringSchema,
    summary: nonEmptyStringSchema,
    state: roadmapQuestStateSchema,
    dependsOn: z.array(slugSchema),
    position: z
      .object({
        column: z.number().int().nonnegative(),
        row: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();

export const roadmapSchema = z
  .object({
    schemaVersion: schemaVersionSchema,
    projectId: slugSchema,
    updatedAt: timestampSchema,
    quests: z.array(roadmapQuestSchema).min(1),
  })
  .strict();

export type RoadmapQuest = z.infer<typeof roadmapQuestSchema>;
export type Roadmap = z.infer<typeof roadmapSchema>;
