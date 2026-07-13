import { access, readFile } from "node:fs/promises";
import path from "node:path";

import {
  implementationPlanSchema,
  questSchema,
  roadmapSchema,
  type ImplementationPlan,
  type Quest,
  type Roadmap,
} from "../contracts/index.js";
import { baselineFixturePath } from "../demo/paths.js";

export interface PreparedQuestBundle {
  plan: ImplementationPlan;
  quest: Quest;
  roadmap: Roadmap;
}

export interface PreparedQuestValidationOptions {
  allowCompleted?: boolean;
}

export const enemyTargetingArtifactPaths = {
  plan: ".forge/plans/enemy-targeting.json",
  quest: ".forge/quests/enemy-targeting.json",
  roadmap: ".forge/roadmap.json",
} as const;

export function validatePreparedQuestBundle(
  input: {
    plan: unknown;
    quest: unknown;
    roadmap: unknown;
  },
  options: PreparedQuestValidationOptions = {},
): PreparedQuestBundle {
  const quest = questSchema.parse(input.quest);
  const plan = implementationPlanSchema.parse(input.plan);
  const roadmap = roadmapSchema.parse(input.roadmap);

  if (plan.questId !== quest.questId) {
    throw new Error(`Prepared plan references ${plan.questId}, expected ${quest.questId}`);
  }
  if (quest.preparedPlan !== enemyTargetingArtifactPaths.plan) {
    throw new Error(`Quest preparedPlan must reference ${enemyTargetingArtifactPaths.plan}`);
  }

  const roadmapQuest = roadmap.quests.find((entry) => entry.questId === quest.questId);
  if (!roadmapQuest) {
    throw new Error(`Roadmap does not reference the real quest ${quest.questId}`);
  }
  const allowedState =
    roadmapQuest.state === "available" ||
    (options.allowCompleted === true && roadmapQuest.state === "completed");
  if (!allowedState) {
    throw new Error(`Prepared quest must begin available; found ${roadmapQuest.state}`);
  }

  const criterionIds = new Set(quest.acceptanceCriteria.map((criterion) => criterion.id));
  const referencedCriteria = new Set<string>();
  for (const step of plan.steps) {
    for (const criterionId of step.criteria) {
      if (!criterionIds.has(criterionId)) {
        throw new Error(`Plan step ${step.id} references unknown criterion ${criterionId}`);
      }
      referencedCriteria.add(criterionId);
    }
  }
  for (const criterionId of criterionIds) {
    if (!referencedCriteria.has(criterionId)) {
      throw new Error(`Prepared plan does not cover criterion ${criterionId}`);
    }
  }

  const verificationIds = new Set(quest.verification.map((verification) => verification.id));
  const referencedVerifications = new Set(plan.verification);
  for (const verificationId of plan.verification) {
    if (!verificationIds.has(verificationId)) {
      throw new Error(`Plan references unknown verification ${verificationId}`);
    }
  }
  for (const verificationId of verificationIds) {
    if (!referencedVerifications.has(verificationId)) {
      throw new Error(`Prepared plan does not include verification ${verificationId}`);
    }
  }

  return { plan, quest, roadmap };
}

async function loadJson(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf8")) as unknown;
}

export async function loadPreparedEnemyTargeting(
  projectRoot: string = baselineFixturePath,
  options: PreparedQuestValidationOptions = {},
): Promise<PreparedQuestBundle> {
  const [plan, quest, roadmap] = await Promise.all([
    loadJson(path.join(projectRoot, enemyTargetingArtifactPaths.plan)),
    loadJson(path.join(projectRoot, enemyTargetingArtifactPaths.quest)),
    loadJson(path.join(projectRoot, enemyTargetingArtifactPaths.roadmap)),
  ]);
  const bundle = validatePreparedQuestBundle({ plan, quest, roadmap }, options);

  await Promise.all(
    bundle.quest.contextFiles.map(async (contextFile) => {
      await access(path.join(projectRoot, contextFile)).catch(() => {
        throw new Error(`Quest context file does not exist: ${contextFile}`);
      });
    }),
  );

  return bundle;
}
