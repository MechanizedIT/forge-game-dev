import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  assertWorkflowTransition,
  implementationHandoffSchema,
  implementationPlanSchema,
  projectManifestSchema,
  questCompletionSchema,
  questSchema,
  reviewResultSchema,
  roadmapSchema,
  ROADMAP_QUEST_STATES,
  WORKFLOW_STAGES,
  workflowStageSchema,
} from "../src/contracts/index.js";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templatesDirectory = path.join(repositoryRoot, "docs", "templates");

async function loadTemplate(name: string): Promise<unknown> {
  const contents = await readFile(path.join(templatesDirectory, name), "utf8");
  return JSON.parse(contents) as unknown;
}

test("all committed JSON artifact examples pass strict validation", async () => {
  const projectManifest = projectManifestSchema.parse(
    await loadTemplate("project-manifest.template.json"),
  );
  const roadmap = roadmapSchema.parse(await loadTemplate("roadmap.template.json"));
  const quest = questSchema.parse(await loadTemplate("quest.template.json"));
  const implementationPlan = implementationPlanSchema.parse(
    await loadTemplate("implementation-plan.template.json"),
  );
  const implementationHandoff = implementationHandoffSchema.parse(
    await loadTemplate("implementation-handoff.template.json"),
  );
  const reviewResult = reviewResultSchema.parse(
    await loadTemplate("review-result.template.json"),
  );
  const questCompletion = questCompletionSchema.parse(
    await loadTemplate("quest-completion.template.json"),
  );

  assert.equal(projectManifest.projectId, roadmap.projectId);
  assert.equal(roadmap.quests[0]?.questId, "enemy-targeting");
  assert.equal(roadmap.quests[0]?.state, "available");
  assert.equal(quest.questId, implementationPlan.questId);
  assert.equal(implementationPlan.questId, implementationHandoff.questId);
  assert.equal(implementationHandoff.questId, reviewResult.questId);
  assert.equal(reviewResult.questId, questCompletion.questId);
  assert.equal(questCompletion.workflowState, "COMPLETE");
});

test("workflow and roadmap states are the exact approved sets", () => {
  assert.deepEqual(WORKFLOW_STAGES, [
    "PLAN",
    "APPROVE",
    "IMPLEMENT",
    "REVIEW",
    "DOCUMENT",
    "COMPLETE",
  ]);
  assert.deepEqual(ROADMAP_QUEST_STATES, ["locked", "available", "active", "completed"]);
  assert.throws(() => workflowStageSchema.parse("PAUSED"));
  assert.throws(() => assertWorkflowTransition("COMPLETE", "IMPLEMENT"));
});

test("unknown artifact status values are rejected", async () => {
  const roadmap = (await loadTemplate("roadmap.template.json")) as {
    quests: Array<Record<string, unknown>>;
  };
  const implementationHandoff = (await loadTemplate(
    "implementation-handoff.template.json",
  )) as Record<string, unknown>;

  const invalidRoadmap = structuredClone(roadmap);
  invalidRoadmap.quests[0] = { ...invalidRoadmap.quests[0], state: "paused" };

  assert.throws(() => roadmapSchema.parse(invalidRoadmap));
  assert.throws(() =>
    implementationHandoffSchema.parse({ ...implementationHandoff, status: "celebrating" }),
  );
});

test("strict schemas preserve single-owner state rules", async () => {
  const quest = await loadTemplate("quest.template.json");
  const roadmap = await loadTemplate("roadmap.template.json");

  assert.throws(() => questSchema.parse({ ...(quest as object), state: "available" }));
  assert.throws(() => roadmapSchema.parse({ ...(roadmap as object), stage: "PLAN" }));
});
