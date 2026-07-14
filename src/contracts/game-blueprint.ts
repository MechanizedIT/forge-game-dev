import { z } from "zod";

import { nonEmptyStringSchema } from "./shared.js";

export const clarificationTopics = [
  "game_style",
  "core_action",
  "fun_target",
  "input_mode",
  "smallest_playable_result",
] as const;

export type ClarificationTopic = (typeof clarificationTopics)[number];

const creatorTextSchema = nonEmptyStringSchema.max(600);
const shortCreatorTextSchema = nonEmptyStringSchema.max(180);
const questReferenceSchema = z.string().regex(/^Q[1-5]$/, "Expected a temporary quest reference such as Q1");
const criterionReferenceSchema = z.string().regex(/^AC-[1-9][0-9]*$/, "Expected a criterion reference such as AC-1");
const verificationReferenceSchema = z.string().regex(/^V-[1-9][0-9]*$/, "Expected a verification reference such as V-1");

export const blueprintQuestSchema = z.object({
  reference: questReferenceSchema,
  title: shortCreatorTextSchema,
  visibleOutcome: creatorTextSchema,
  dependencies: z.array(questReferenceSchema).max(4),
}).strict();

export const blueprintAcceptanceCriterionSchema = z.object({
  reference: criterionReferenceSchema,
  questReference: questReferenceSchema,
  criterion: creatorTextSchema,
  verificationReferences: z.array(verificationReferenceSchema).min(1).max(4),
}).strict();

export const blueprintVerificationIdeaSchema = z.object({
  reference: verificationReferenceSchema,
  questReference: questReferenceSchema,
  idea: creatorTextSchema,
}).strict();

const unsafeCreatorContent = [
  { pattern: /(?:^|\s)(?:[A-Za-z]:[\\/]|\\\\|\/(?:Users|home|tmp|var|etc|opt|workspace|mnt)\/|\/[A-Za-z0-9._-]+\/[A-Za-z0-9._/-]+)/u, message: "Absolute paths are not allowed" },
  { pattern: /(?:^|\s)(?:npm|npx|pnpm|yarn|git|godot|powershell|cmd(?:\.exe)?|bash|sh)\s+(?:run|exec|install|add|init|clone|checkout|reset|build|test|--?\w+)/iu, message: "Shell or project commands are not allowed" },
  { pattern: /(?:^|\s)(?:package\.json|node_modules|requirements\.txt|Cargo\.toml|pyproject\.toml)(?:\s|$)/iu, message: "Packages and dependency manifests are not allowed" },
  { pattern: /(?:^|\s)[\w.-]+\.(?:gd|ts|tsx|js|jsx|py|cs|cpp|h|json|toml|yml|yaml|tscn|tres)(?=$|[\s.,;:)])/iu, message: "Arbitrary source files are not allowed" },
  { pattern: /^(?:PLAN|APPROVE|IMPLEMENT|REVIEW|DOCUMENT|COMPLETE)$/u, message: "Workflow-state claims are not allowed" },
  { pattern: /\bworkflow(?:[- ]state)?\b|\b(?:state|status)\s*:\s*(?:plan|approve|implement|review|document|complete)\b/iu, message: "Workflow-state claims are not allowed" },
] as const;

function addSafetyIssues(value: unknown, context: z.RefinementCtx, path: PropertyKey[] = []): void {
  if (typeof value === "string") {
    for (const rule of unsafeCreatorContent) {
      if (rule.pattern.test(value)) {
        context.addIssue({ code: "custom", message: rule.message, path });
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => addSafetyIssues(item, context, [...path, index]));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) addSafetyIssues(item, context, [...path, key]);
  }
}

function addBlueprintReferenceIssues(
  value: z.infer<typeof gameBlueprintShapeSchema>,
  context: z.RefinementCtx,
): void {
  const questReferences = new Set(value.quests.map((quest) => quest.reference));
  if (questReferences.size !== value.quests.length) {
    context.addIssue({ code: "custom", message: "Quest references must be unique", path: ["quests"] });
  }

  const questByReference = new Map(value.quests.map((quest) => [quest.reference, quest]));
  value.quests.forEach((quest, index) => {
    if (quest.dependencies.includes(quest.reference)) {
      context.addIssue({ code: "custom", message: "A quest cannot depend on itself", path: ["quests", index, "dependencies"] });
    }
    quest.dependencies.forEach((dependency) => {
      if (!questReferences.has(dependency)) {
        context.addIssue({ code: "custom", message: `Unknown quest dependency ${dependency}`, path: ["quests", index, "dependencies"] });
      }
    });
  });

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const hasCycle = (reference: string): boolean => {
    if (visiting.has(reference)) return true;
    if (visited.has(reference)) return false;
    visiting.add(reference);
    const quest = questByReference.get(reference);
    const cyclic = quest?.dependencies.some((dependency) => hasCycle(dependency)) ?? false;
    visiting.delete(reference);
    visited.add(reference);
    return cyclic;
  };
  if (value.quests.some((quest) => hasCycle(quest.reference))) {
    context.addIssue({ code: "custom", message: "Quest dependencies must be acyclic", path: ["quests"] });
  }

  const verificationByReference = new Map(value.verificationIdeas.map((verification) => [verification.reference, verification]));
  if (verificationByReference.size !== value.verificationIdeas.length) {
    context.addIssue({ code: "custom", message: "Verification references must be unique", path: ["verificationIdeas"] });
  }
  const criterionReferences = new Set(value.acceptanceCriteria.map((criterion) => criterion.reference));
  if (criterionReferences.size !== value.acceptanceCriteria.length) {
    context.addIssue({ code: "custom", message: "Acceptance-criterion references must be unique", path: ["acceptanceCriteria"] });
  }

  value.verificationIdeas.forEach((verification, index) => {
    if (!questReferences.has(verification.questReference)) {
      context.addIssue({ code: "custom", message: `Unknown verification quest ${verification.questReference}`, path: ["verificationIdeas", index, "questReference"] });
    }
  });
  const usedVerificationReferences = new Set<string>();
  value.acceptanceCriteria.forEach((criterion, index) => {
    if (!questReferences.has(criterion.questReference)) {
      context.addIssue({ code: "custom", message: `Unknown criterion quest ${criterion.questReference}`, path: ["acceptanceCriteria", index, "questReference"] });
    }
    criterion.verificationReferences.forEach((reference) => {
      const verification = verificationByReference.get(reference);
      if (!verification) {
        context.addIssue({ code: "custom", message: `Unknown verification reference ${reference}`, path: ["acceptanceCriteria", index, "verificationReferences"] });
      } else if (verification.questReference !== criterion.questReference) {
        context.addIssue({ code: "custom", message: `${reference} belongs to a different quest`, path: ["acceptanceCriteria", index, "verificationReferences"] });
      }
      usedVerificationReferences.add(reference);
    });
  });

  value.quests.forEach((quest) => {
    if (!value.acceptanceCriteria.some((criterion) => criterion.questReference === quest.reference)) {
      context.addIssue({ code: "custom", message: `${quest.reference} needs acceptance criteria`, path: ["acceptanceCriteria"] });
    }
    if (!value.verificationIdeas.some((verification) => verification.questReference === quest.reference)) {
      context.addIssue({ code: "custom", message: `${quest.reference} needs a verification idea`, path: ["verificationIdeas"] });
    }
  });
  value.verificationIdeas.forEach((verification, index) => {
    if (!usedVerificationReferences.has(verification.reference)) {
      context.addIssue({ code: "custom", message: `${verification.reference} is not linked to an acceptance criterion`, path: ["verificationIdeas", index] });
    }
  });
}

const gameBlueprintShapeSchema = z.object({
  projectName: z.string().trim().min(2).max(48).regex(/^[A-Za-z0-9][A-Za-z0-9 '&-]*$/, "Use a safe display name without path characters"),
  vision: creatorTextSchema.max(260),
  foundation: z.literal("top_down_arena"),
  inputMode: z.enum(["keyboard", "controller", "keyboard_and_controller"]),
  coreAction: creatorTextSchema.max(240),
  funTarget: creatorTextSchema.max(240),
  smallestPlayableResult: creatorTextSchema.max(360),
  firstPlayableMilestone: creatorTextSchema.max(360),
  quests: z.array(blueprintQuestSchema).min(3).max(5),
  includedScope: z.array(shortCreatorTextSchema).min(1).max(10),
  excludedScope: z.array(shortCreatorTextSchema).min(1).max(10),
  acceptanceCriteria: z.array(blueprintAcceptanceCriterionSchema).min(3).max(20),
  verificationIdeas: z.array(blueprintVerificationIdeaSchema).min(3).max(20),
  projectDocumentationSummary: creatorTextSchema.max(700),
  initialChronicleSummary: creatorTextSchema.max(400),
}).strict();

export const gameBlueprintSchema = gameBlueprintShapeSchema.superRefine((value, context) => {
  addSafetyIssues(value, context);
  addBlueprintReferenceIssues(value, context);
});

export const clarificationQuestionSchema = z.object({
  topic: z.enum(clarificationTopics),
  prompt: shortCreatorTextSchema,
  answerType: z.enum(["single_choice", "short_text"]),
  choices: z.array(shortCreatorTextSchema).max(4),
}).strict().superRefine((value, context) => {
  if (value.answerType === "single_choice" && value.choices.length < 2) {
    context.addIssue({ code: "custom", message: "Controlled questions need two to four choices", path: ["choices"] });
  }
  if (value.answerType === "short_text" && value.choices.length !== 0) {
    context.addIssue({ code: "custom", message: "Short-text questions cannot include choices", path: ["choices"] });
  }
  if (value.topic === "input_mode" && value.answerType !== "single_choice") {
    context.addIssue({ code: "custom", message: "Input mode must use controlled choices", path: ["answerType"] });
  }
});

export const gameBlueprintPlanningResultSchema = z.object({
  resultType: z.enum(["clarification", "blueprint"]),
  clarificationQuestions: z.array(clarificationQuestionSchema).max(3),
  blueprint: gameBlueprintSchema.nullable(),
}).strict().superRefine((value, context) => {
  if (value.resultType === "clarification") {
    if (value.clarificationQuestions.length === 0) {
      context.addIssue({ code: "custom", message: "Clarification needs at least one question", path: ["clarificationQuestions"] });
    }
    if (value.blueprint !== null) {
      context.addIssue({ code: "custom", message: "Clarification cannot include a blueprint", path: ["blueprint"] });
    }
  } else {
    if (value.clarificationQuestions.length !== 0) {
      context.addIssue({ code: "custom", message: "A complete blueprint cannot include clarification questions", path: ["clarificationQuestions"] });
    }
    if (value.blueprint === null) {
      context.addIssue({ code: "custom", message: "Blueprint result must include the complete blueprint", path: ["blueprint"] });
    }
  }
});

export type GameBlueprint = z.infer<typeof gameBlueprintSchema>;
export type ClarificationQuestion = z.infer<typeof clarificationQuestionSchema>;
export type GameBlueprintPlanningResult = z.infer<typeof gameBlueprintPlanningResultSchema>;
