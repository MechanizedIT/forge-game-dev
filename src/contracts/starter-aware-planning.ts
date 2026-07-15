import { z } from "zod";

import { gameBlueprintSchema } from "./game-blueprint.js";
import { nonEmptyStringSchema, timestampSchema } from "./shared.js";

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u, "Expected a SHA-256 digest");
const safeTextSchema = nonEmptyStringSchema.max(600).refine((value) =>
  !/(?:[A-Za-z]:[\\/]|\\\\|\/(?:Users|home|tmp|var|etc|opt|workspace|mnt)\/)|(?:^|\s)(?:npm|npx|pnpm|yarn|git|godot|powershell|cmd|bash|sh)\s+(?:run|exec|install|add|init|clone|checkout|reset|build|test|--?\w+)/iu.test(value),
"Paths and commands are not allowed");
const questReferenceSchema = z.string().regex(/^Q[1-5]$/u);
const deltaIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);

export const foundationFitSchema = z.object({
  level: z.enum(["strong", "partial", "poor"]),
  explanation: safeTextSchema.max(300),
}).strict();

export const blueprintAlternativeSchema = z.object({
  id: deltaIdSchema,
  title: safeTextSchema.max(100),
  interpretation: safeTextSchema.max(300),
  consequence: safeTextSchema.max(240),
}).strict();

export const blueprintProposalSchema = z.object({
  schemaVersion: z.literal(1),
  originalIdea: safeTextSchema.max(1_500),
  recommendedInterpretation: safeTextSchema.max(400),
  foundationFit: foundationFitSchema,
  tradeoffs: z.array(safeTextSchema.max(240)).min(1).max(3),
  alternatives: z.array(blueprintAlternativeSchema).min(2).max(3),
  blueprint: gameBlueprintSchema,
}).strict().superRefine((value, context) => {
  if (new Set(value.alternatives.map((item) => item.id)).size !== value.alternatives.length) {
    context.addIssue({ code: "custom", message: "Alternative IDs must be unique", path: ["alternatives"] });
  }
});

export const creatorRevisionKindSchema = z.enum([
  "interpretation_revised",
  "alternative_selected",
  "quest_title_changed",
  "quest_outcome_changed",
  "quest_removed",
  "quest_reordered",
  "optional_delta_added",
]);

export const creatorRevisionEventSchema = z.object({
  kind: creatorRevisionKindSchema,
  target: nonEmptyStringSchema.max(120),
  priorFingerprint: sha256Schema,
  newFingerprint: sha256Schema,
  occurredAt: timestampSchema,
  actor: z.literal("creator"),
}).strict();

export const acceptedRoadmapQuestSchema = z.object({
  reference: questReferenceSchema,
  catalogDeltaId: deltaIdSchema,
  title: safeTextSchema.max(180),
  visibleOutcome: safeTextSchema.min(10).max(280),
  whyItMatters: safeTextSchema.min(10).max(500),
  currentPlayableFacts: z.array(safeTextSchema.max(240)).min(1).max(12),
  dependsOn: z.array(questReferenceSchema).max(4),
  scope: z.object({
    included: z.array(safeTextSchema.max(240)).min(1).max(12),
    excluded: z.array(safeTextSchema.max(240)).min(1).max(12),
  }).strict(),
  acceptanceCriteria: z.array(z.object({
    id: z.string().regex(/^AC-[1-9][0-9]*$/u),
    criterion: safeTextSchema,
    verificationIds: z.array(z.string().regex(/^V-[1-9][0-9]*$/u)).min(1).max(4),
  }).strict()).min(1).max(8),
  verificationIdeas: z.array(z.object({
    id: z.string().regex(/^V-[1-9][0-9]*$/u),
    idea: safeTextSchema,
  }).strict()).min(1).max(8),
  editableFileRoles: z.array(z.enum(["main_scene", "main_script", "objective_visual"])).max(3),
  verificationProfile: z.enum(["gravity_orb_presence_v1", "relay_activation_v1"]).nullable(),
  implementationReadiness: z.enum(["registered_existing_files", "planned_unverified"]),
}).strict().superRefine((quest, context) => {
  if (quest.dependsOn.includes(quest.reference)) {
    context.addIssue({ code: "custom", message: "A quest cannot depend on itself", path: ["dependsOn"] });
  }
  const registered = quest.implementationReadiness === "registered_existing_files";
  if (registered !== (quest.verificationProfile !== null && quest.editableFileRoles.length > 0)) {
    context.addIssue({ code: "custom", message: "Registered readiness requires a profile and editable roles", path: ["implementationReadiness"] });
  }
});

export const acceptedRoadmapSchema = z.object({
  schemaVersion: z.literal(1),
  approvedBlueprintSha256: sha256Schema,
  starter: z.object({ id: z.literal("top-down-arena"), version: z.literal("1.0.0") }).strict(),
  alreadyPlayable: z.array(z.object({
    factId: deltaIdSchema,
    statement: safeTextSchema.max(240),
  }).strict()).min(3).max(8),
  quests: z.array(acceptedRoadmapQuestSchema).min(3).max(5),
  optionalDeltaIds: z.array(deltaIdSchema).max(3),
  revision: z.number().int().positive().max(4),
  revisionEvents: z.array(creatorRevisionEventSchema).max(3),
  fingerprint: sha256Schema,
  acceptedAt: timestampSchema.nullable(),
}).strict().superRefine((roadmap, context) => {
  const references = roadmap.quests.map((quest) => quest.reference);
  const referenceSet = new Set(references);
  if (referenceSet.size !== references.length) {
    context.addIssue({ code: "custom", message: "Quest references must be unique", path: ["quests"] });
  }
  if (new Set(roadmap.quests.map((quest) => quest.catalogDeltaId)).size !== roadmap.quests.length) {
    context.addIssue({ code: "custom", message: "Catalog deltas must be unique", path: ["quests"] });
  }
  if (new Set(roadmap.alreadyPlayable.map((fact) => fact.factId)).size !== roadmap.alreadyPlayable.length) {
    context.addIssue({ code: "custom", message: "Starter facts must be unique", path: ["alreadyPlayable"] });
  }
  roadmap.quests.forEach((quest, index) => {
    for (const dependency of quest.dependsOn) {
      const dependencyIndex = references.indexOf(dependency);
      if (!referenceSet.has(dependency)) {
        context.addIssue({ code: "custom", message: `Missing dependency ${dependency}`, path: ["quests", index, "dependsOn"] });
      } else if (dependencyIndex >= index) {
        context.addIssue({ code: "custom", message: `Dependency ${dependency} must be ordered before its consumer`, path: ["quests", index, "dependsOn"] });
      }
    }
  });
  const first = roadmap.quests[0];
  if (!first || first.implementationReadiness !== "registered_existing_files" || first.verificationProfile !== "relay_activation_v1") {
    context.addIssue({ code: "custom", message: "The first accepted quest needs the registered relay existing-file contract", path: ["quests", 0] });
  }
  if (roadmap.revision !== roadmap.revisionEvents.length + 1) {
    context.addIssue({ code: "custom", message: "Revision must match the bounded creator event history", path: ["revision"] });
  }
});

export type BlueprintProposal = z.infer<typeof blueprintProposalSchema>;
export type FoundationFit = z.infer<typeof foundationFitSchema>;
export type CreatorRevisionEvent = z.infer<typeof creatorRevisionEventSchema>;
export type AcceptedRoadmapQuest = z.infer<typeof acceptedRoadmapQuestSchema>;
export type AcceptedRoadmap = z.infer<typeof acceptedRoadmapSchema>;
