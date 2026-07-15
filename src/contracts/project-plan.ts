import { z } from "zod";

import {
  generatedCreatorResultSchema,
  generatedGitShaSchema,
  generatedQuestProofSchema,
  generatedRunPhaseSchema,
  sha256DigestSchema,
} from "./generated-quest-run.js";
import {
  nonEmptyStringSchema,
  relativePathSchema,
  slugSchema,
  timestampSchema,
} from "./shared.js";

export const PROJECT_MODEL_VERSION = 1 as const;

export const projectModelProjectSchema = z.object({
  projectId: slugSchema,
  name: nonEmptyStringSchema,
  vision: nonEmptyStringSchema,
  engine: z.object({
    kind: z.literal("godot"),
    version: nonEmptyStringSchema,
    projectFile: relativePathSchema,
    mainScene: relativePathSchema,
  }).strict(),
  systemIds: z.array(slugSchema).min(1),
}).strict();

export const projectModelSystemStatusSchema = z.enum([
  "planned",
  "active",
  "completed",
  "deferred",
]);

export const projectModelSystemSchema = z.object({
  systemId: slugSchema,
  projectId: slugSchema,
  title: nonEmptyStringSchema,
  outcome: nonEmptyStringSchema,
  status: projectModelSystemStatusSchema,
  questIds: z.array(slugSchema),
}).strict();

export const projectModelQuestStatusSchema = z.enum([
  "planned",
  "available",
  "active",
  "blocked",
  "deferred",
  "completed",
]);

export const projectModelQuestSchema = z.object({
  questId: slugSchema,
  systemId: slugSchema,
  title: nonEmptyStringSchema,
  playerVisibleOutcome: nonEmptyStringSchema,
  doneWhen: z.array(nonEmptyStringSchema).min(1),
  status: projectModelQuestStatusSchema,
  dependsOn: z.array(slugSchema),
  workSessionIds: z.array(slugSchema),
  latestWorkSessionId: slugSchema.nullable(),
  extraProof: z.object({
    profileId: nonEmptyStringSchema,
  }).strict().nullable(),
}).strict();

export const projectModelWorkSessionSchema = z.object({
  workSessionId: slugSchema,
  questId: slugSchema,
  phase: generatedRunPhaseSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  contractFingerprint: sha256DigestSchema,
  allowedFiles: z.array(relativePathSchema),
  progress: z.array(nonEmptyStringSchema),
  proofs: generatedQuestProofSchema,
  changedFiles: z.array(relativePathSchema),
  creatorResult: generatedCreatorResultSchema.nullable(),
  error: nonEmptyStringSchema.nullable(),
  recovery: z.object({
    action: z.enum(["none", "resume", "retry", "rollback", "manual"]),
    message: nonEmptyStringSchema,
    concurrentPaths: z.array(relativePathSchema),
  }).strict(),
  resultId: slugSchema.nullable(),
}).strict();

export const projectModelResultStatusSchema = z.enum([
  "completed",
  "failed",
  "cancelled",
  "interrupted",
]);

export const projectModelResultSchema = z.object({
  resultId: slugSchema,
  workSessionId: slugSchema,
  questId: slugSchema,
  status: projectModelResultStatusSchema,
  summary: nonEmptyStringSchema,
  occurredAt: timestampSchema,
  changedFiles: z.array(relativePathSchema),
  creatorDecision: generatedCreatorResultSchema.nullable(),
  gitCommitSha: generatedGitShaSchema.nullable(),
  treeSha: generatedGitShaSchema.nullable(),
}).strict();

export const projectModelHistoryEntrySchema = z.object({
  historyEntryId: slugSchema,
  kind: z.enum(["project_created", "quest_completed"]),
  occurredAt: timestampSchema,
  summary: nonEmptyStringSchema,
  questId: slugSchema.nullable(),
  workSessionId: slugSchema.nullable(),
}).strict().superRefine((entry, context) => {
  if (entry.kind === "project_created" && (entry.questId !== null || entry.workSessionId !== null)) {
    context.addIssue({ code: "custom", message: "Project-created history cannot link a quest or work session" });
  }
  if (entry.kind === "quest_completed" && (entry.questId === null || entry.workSessionId === null)) {
    context.addIssue({ code: "custom", message: "Quest-completed history must link its quest and work session" });
  }
});

export const projectModelFocusSchema = z.object({
  selectedSystemId: slugSchema,
  selectedQuestId: slugSchema.nullable(),
  nextRecommendedQuestId: slugSchema.nullable(),
}).strict();

const terminalPhases = new Set(["completed", "failed", "cancelled", "interrupted"]);

function sameOrderedIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function expectedSystemStatus(statuses: ReadonlyArray<z.infer<typeof projectModelQuestStatusSchema>>): z.infer<typeof projectModelSystemStatusSchema> {
  if (statuses.length === 0) return "planned";
  if (statuses.every((status) => status === "completed")) return "completed";
  const unfinished = statuses.filter((status) => status !== "completed");
  if (unfinished.length > 0 && unfinished.every((status) => status === "deferred")) return "deferred";
  if (statuses.some((status) => status === "active" || status === "available" || status === "completed")) return "active";
  return "planned";
}

export const projectModelSchema = z.object({
  modelVersion: z.literal(PROJECT_MODEL_VERSION),
  project: projectModelProjectSchema,
  systems: z.array(projectModelSystemSchema).min(1),
  quests: z.array(projectModelQuestSchema),
  workSessions: z.array(projectModelWorkSessionSchema),
  results: z.array(projectModelResultSchema),
  history: z.array(projectModelHistoryEntrySchema).min(1),
  focus: projectModelFocusSchema,
}).strict().superRefine((model, context) => {
  const collections: Array<readonly [string, string[]]> = [
    ["systems", model.systems.map((system) => system.systemId)],
    ["quests", model.quests.map((quest) => quest.questId)],
    ["workSessions", model.workSessions.map((session) => session.workSessionId)],
    ["results", model.results.map((result) => result.resultId)],
    ["history", model.history.map((entry) => entry.historyEntryId)],
  ];
  for (const [name, ids] of collections) {
    if (new Set(ids).size !== ids.length) {
      context.addIssue({ code: "custom", message: `${name} IDs must be unique`, path: [name] });
    }
  }

  const systemIds = model.systems.map((system) => system.systemId);
  if (!sameOrderedIds(model.project.systemIds, systemIds)) {
    context.addIssue({ code: "custom", message: "Project system IDs must exactly match ordered systems", path: ["project", "systemIds"] });
  }

  const systemById = new Map(model.systems.map((system) => [system.systemId, system]));
  const questById = new Map(model.quests.map((quest) => [quest.questId, quest]));
  const sessionById = new Map(model.workSessions.map((session) => [session.workSessionId, session]));
  const resultById = new Map(model.results.map((result) => [result.resultId, result]));

  for (const [systemIndex, system] of model.systems.entries()) {
    if (system.projectId !== model.project.projectId) {
      context.addIssue({ code: "custom", message: "System belongs to another project", path: ["systems", systemIndex, "projectId"] });
    }
    const orderedQuestIds = model.quests.filter((quest) => quest.systemId === system.systemId).map((quest) => quest.questId);
    if (!sameOrderedIds(system.questIds, orderedQuestIds)) {
      context.addIssue({ code: "custom", message: "System quest IDs must exactly match ordered quests", path: ["systems", systemIndex, "questIds"] });
    }
    if (system.status !== expectedSystemStatus(orderedQuestIds.map((questId) => questById.get(questId)!.status))) {
      context.addIssue({ code: "custom", message: "System status does not match its quest statuses", path: ["systems", systemIndex, "status"] });
    }
  }

  const flattenedQuestIds = model.systems.flatMap((system) => system.questIds);
  if (!sameOrderedIds(flattenedQuestIds, model.quests.map((quest) => quest.questId))) {
    context.addIssue({ code: "custom", message: "Quest order must follow project system order", path: ["quests"] });
  }

  const expectedSessionOrder = [...model.workSessions]
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.workSessionId.localeCompare(right.workSessionId))
    .map((session) => session.workSessionId);
  if (!sameOrderedIds(expectedSessionOrder, model.workSessions.map((session) => session.workSessionId))) {
    context.addIssue({ code: "custom", message: "Work sessions must be ordered by createdAt then workSessionId", path: ["workSessions"] });
  }

  for (const [questIndex, quest] of model.quests.entries()) {
    const system = systemById.get(quest.systemId);
    if (!system) {
      context.addIssue({ code: "custom", message: "Quest references a missing system", path: ["quests", questIndex, "systemId"] });
      continue;
    }
    const questPosition = system.questIds.indexOf(quest.questId);
    if (new Set(quest.dependsOn).size !== quest.dependsOn.length) {
      context.addIssue({ code: "custom", message: "Quest dependencies must be unique", path: ["quests", questIndex, "dependsOn"] });
    }
    for (const [dependencyIndex, dependencyId] of quest.dependsOn.entries()) {
      const dependency = questById.get(dependencyId);
      if (!dependency || dependency.systemId !== quest.systemId || system.questIds.indexOf(dependencyId) >= questPosition) {
        context.addIssue({ code: "custom", message: "Quest dependency must be an earlier quest in the same system", path: ["quests", questIndex, "dependsOn", dependencyIndex] });
      }
    }
    const orderedSessionIds = model.workSessions.filter((session) => session.questId === quest.questId).map((session) => session.workSessionId);
    if (!sameOrderedIds(quest.workSessionIds, orderedSessionIds)) {
      context.addIssue({ code: "custom", message: "Quest work-session IDs must exactly match ordered sessions", path: ["quests", questIndex, "workSessionIds"] });
    }
    const expectedLatest = orderedSessionIds.at(-1) ?? null;
    if (quest.latestWorkSessionId !== expectedLatest) {
      context.addIssue({ code: "custom", message: "Quest latest work session must link its final ordered session", path: ["quests", questIndex, "latestWorkSessionId"] });
    }
  }

  for (const [sessionIndex, session] of model.workSessions.entries()) {
    if (!questById.has(session.questId)) {
      context.addIssue({ code: "custom", message: "Work session references a missing quest", path: ["workSessions", sessionIndex, "questId"] });
    }
    const isTerminal = terminalPhases.has(session.phase);
    if (isTerminal !== (session.resultId !== null)) {
      context.addIssue({ code: "custom", message: "Only terminal work sessions have one result", path: ["workSessions", sessionIndex, "resultId"] });
    }
    if (session.resultId !== null) {
      const result = resultById.get(session.resultId);
      if (!result || result.workSessionId !== session.workSessionId || result.questId !== session.questId || result.status !== session.phase) {
        context.addIssue({ code: "custom", message: "Work session result link is inconsistent", path: ["workSessions", sessionIndex, "resultId"] });
      }
    }
  }

  const terminalSessionIds = model.workSessions.filter((session) => terminalPhases.has(session.phase)).map((session) => session.workSessionId);
  if (!sameOrderedIds(terminalSessionIds, model.results.map((result) => result.workSessionId))) {
    context.addIssue({ code: "custom", message: "Results must match terminal work sessions one-for-one in order", path: ["results"] });
  }
  for (const [resultIndex, result] of model.results.entries()) {
    const session = sessionById.get(result.workSessionId);
    if (!session || session.resultId !== result.resultId || result.questId !== session.questId) {
      context.addIssue({ code: "custom", message: "Result references an inconsistent work session", path: ["results", resultIndex] });
    }
    if (result.status === "completed" && (result.gitCommitSha === null || result.treeSha === null)) {
      context.addIssue({ code: "custom", message: "Completed results require commit and tree provenance", path: ["results", resultIndex] });
    }
  }

  const completedHistorySessionIds: string[] = [];
  for (const [historyIndex, entry] of model.history.entries()) {
    if (entry.kind !== "quest_completed") continue;
    const session = entry.workSessionId ? sessionById.get(entry.workSessionId) : undefined;
    if (!session || session.questId !== entry.questId || session.phase !== "completed") {
      context.addIssue({ code: "custom", message: "Quest-completed history must link its completed work session", path: ["history", historyIndex] });
    } else {
      completedHistorySessionIds.push(session.workSessionId);
    }
  }
  const completedSessionIds = model.workSessions.filter((session) => session.phase === "completed").map((session) => session.workSessionId);
  if (!sameOrderedIds(completedHistorySessionIds, completedSessionIds)) {
    context.addIssue({ code: "custom", message: "Completed history must match completed work sessions one-for-one in order", path: ["history"] });
  }

  const selectedSystem = systemById.get(model.focus.selectedSystemId);
  if (!selectedSystem) {
    context.addIssue({ code: "custom", message: "Selected focus system does not exist", path: ["focus", "selectedSystemId"] });
  }
  if (model.focus.selectedQuestId !== null) {
    const selectedQuest = questById.get(model.focus.selectedQuestId);
    if (!selectedQuest) {
      context.addIssue({ code: "custom", message: "Selected focus quest does not exist", path: ["focus", "selectedQuestId"] });
    } else if (selectedQuest.systemId !== model.focus.selectedSystemId) {
      context.addIssue({ code: "custom", message: "Selected focus quest must belong to the selected system", path: ["focus", "selectedQuestId"] });
    }
  }
  if (model.focus.nextRecommendedQuestId !== null && !questById.has(model.focus.nextRecommendedQuestId)) {
    context.addIssue({ code: "custom", message: "Recommended focus quest does not exist", path: ["focus", "nextRecommendedQuestId"] });
  }
});

export type ProjectModelProject = z.infer<typeof projectModelProjectSchema>;
export type ProjectModelSystemStatus = z.infer<typeof projectModelSystemStatusSchema>;
export type ProjectModelSystem = z.infer<typeof projectModelSystemSchema>;
export type ProjectModelQuestStatus = z.infer<typeof projectModelQuestStatusSchema>;
export type ProjectModelQuest = z.infer<typeof projectModelQuestSchema>;
export type ProjectModelWorkSession = z.infer<typeof projectModelWorkSessionSchema>;
export type ProjectModelResult = z.infer<typeof projectModelResultSchema>;
export type ProjectModelHistoryEntry = z.infer<typeof projectModelHistoryEntrySchema>;
export type ProjectModel = z.infer<typeof projectModelSchema>;
