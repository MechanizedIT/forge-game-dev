import { z } from "zod";

import {
  commandSchema,
  nonEmptyStringSchema,
  relativePathSchema,
  schemaVersionSchema,
  slugSchema,
} from "./shared.js";

export const projectManifestSchema = z
  .object({
    schemaVersion: schemaVersionSchema,
    projectId: slugSchema,
    displayName: nonEmptyStringSchema,
    engine: z
      .object({
        kind: z.literal("godot"),
        version: nonEmptyStringSchema,
        projectFile: relativePathSchema,
      })
      .strict(),
    artifacts: z
      .object({
        roadmap: relativePathSchema,
        state: relativePathSchema,
        quests: relativePathSchema,
        plans: relativePathSchema,
        runs: relativePathSchema,
      })
      .strict(),
    commands: z
      .object({
        verify: commandSchema,
        play: commandSchema,
      })
      .strict(),
  })
  .strict();

export type ProjectManifest = z.infer<typeof projectManifestSchema>;
