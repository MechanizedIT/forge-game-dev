import assert from "node:assert/strict";
import test from "node:test";

import {
  loadPreparedEnemyTargeting,
  validatePreparedQuestBundle,
} from "../src/quests/prepared-enemy-targeting.js";

test("the prepared Enemy Targeting quest and plan load successfully", async () => {
  const bundle = await loadPreparedEnemyTargeting();

  assert.equal(bundle.quest.questId, "enemy-targeting");
  assert.equal(bundle.plan.questId, bundle.quest.questId);
  assert.equal(bundle.plan.stage, "APPROVE");
  assert.equal(bundle.quest.acceptanceCriteria.length, 6);
  assert.deepEqual(bundle.plan.openDecisions, []);
});

test("invalid acceptance and workflow state data is rejected", async () => {
  const bundle = await loadPreparedEnemyTargeting();
  const invalidAcceptance = structuredClone(bundle);
  invalidAcceptance.plan.steps[0]!.criteria = ["AC-999"];
  const duplicateAcceptance = structuredClone(bundle);
  duplicateAcceptance.quest.acceptanceCriteria[1]!.id =
    duplicateAcceptance.quest.acceptanceCriteria[0]!.id;

  assert.throws(
    () => validatePreparedQuestBundle(invalidAcceptance),
    /unknown criterion AC-999/,
  );
  assert.throws(
    () => validatePreparedQuestBundle(duplicateAcceptance),
    /Acceptance criterion IDs must be unique/,
  );
  assert.throws(() =>
    validatePreparedQuestBundle({
      ...bundle,
      plan: { ...bundle.plan, stage: "IMPLEMENT" },
    }),
  );
  assert.throws(() =>
    validatePreparedQuestBundle({
      ...bundle,
      roadmap: {
        ...bundle.roadmap,
        quests: [{ ...bundle.roadmap.quests[0]!, state: "prepared" }],
      },
    }),
  );
});

test("the prepared roadmap references a real available quest", async () => {
  const bundle = await loadPreparedEnemyTargeting();
  const roadmapQuest = bundle.roadmap.quests.find(
    (entry) => entry.questId === bundle.quest.questId,
  );

  assert.ok(roadmapQuest);
  assert.equal(roadmapQuest.state, "available");

  assert.throws(
    () =>
      validatePreparedQuestBundle({
        ...bundle,
        roadmap: {
          ...bundle.roadmap,
          quests: [{ ...roadmapQuest, questId: "missing-quest" }],
        },
      }),
    /Roadmap does not reference the real quest enemy-targeting/,
  );
});
