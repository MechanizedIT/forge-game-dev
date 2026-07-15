import assert from "node:assert/strict";
import test from "node:test";

import { acceptedSystemRoadmapSchema, projectModelSchema } from "../src/contracts/index.js";
import { applyAcceptedSystemRoadmap, deriveLegacyQuestStatus, deriveProjectSystemStatus } from "../src/generated-project-world/project-model.js";
import { GeneratedProjectWorldService } from "../src/generated-project-world/service.js";
import { GeneratedQuestRunnerService } from "../src/generated-quest-runner/service.js";
import {
  applyOrbChange,
  approvedAdjustment,
  createGeneratedQuestFixture,
  createSignalSweepFixture,
  fixtureTime,
  MutatingCodexExecutor,
  passingProofDependencies,
} from "./helpers/generated-quest-fixture.js";

function openMechanicModel(): unknown {
  return {
    modelVersion: 1,
    project: {
      projectId: "branching-dialogue-game",
      name: "Branching Dialogue Game",
      vision: "A small Godot story where choices change the next conversation.",
      engine: { kind: "godot", version: "4.7", projectFile: "project.godot", mainScene: "res://dialogue/main.tscn" },
      systemIds: ["dialogue-system"],
    },
    systems: [{
      systemId: "dialogue-system",
      projectId: "branching-dialogue-game",
      title: "Branching Dialogue",
      outcome: "The player chooses a reply and sees a different next line.",
      status: "active",
      questIds: ["choose-a-reply"],
    }],
    quests: [{
      questId: "choose-a-reply",
      systemId: "dialogue-system",
      title: "Choose a Reply",
      playerVisibleOutcome: "Two replies lead to two different follow-up lines.",
      doneWhen: ["Both replies can be selected and each shows its matching follow-up line."],
      status: "available",
      dependsOn: [],
      workSessionIds: [],
      latestWorkSessionId: null,
      extraProof: null,
    }],
    workSessions: [],
    results: [],
    history: [{
      historyEntryId: "project-created",
      kind: "project_created",
      occurredAt: fixtureTime,
      summary: "Created the dialogue project.",
      questId: null,
      workSessionId: null,
    }],
    focus: { selectedSystemId: "dialogue-system", selectedQuestId: "choose-a-reply", nextRecommendedQuestId: "choose-a-reply" },
  };
}

test("the open Project Model represents arbitrary Godot mechanics without capability or profile permission", () => {
  const withoutExtraProof = projectModelSchema.parse(openMechanicModel());
  const withExtraProofValue = structuredClone(openMechanicModel()) as { quests: Array<Record<string, unknown>> };
  withExtraProofValue.quests[0]!.extraProof = { profileId: "dialogue-branch-walkthrough" };
  const withExtraProof = projectModelSchema.parse(withExtraProofValue);
  assert.equal(withoutExtraProof.quests[0]?.status, "available");
  assert.equal(withExtraProof.quests[0]?.status, "available");
  assert.equal(withExtraProof.systems[0]?.status, withoutExtraProof.systems[0]?.status);

  const capabilityGated = structuredClone(openMechanicModel()) as { quests: Array<Record<string, unknown>> };
  capabilityGated.quests[0]!.capability = "dialogue";
  assert.equal(projectModelSchema.safeParse(capabilityGated).success, false);
});

test("the Project Model fails closed on broken ownership, focus, and ordered links", () => {
  const brokenQuestOrder = structuredClone(openMechanicModel()) as { systems: Array<{ questIds: string[] }> };
  brokenQuestOrder.systems[0]!.questIds = ["missing-quest"];
  assert.equal(projectModelSchema.safeParse(brokenQuestOrder).success, false);

  const brokenFocus = structuredClone(openMechanicModel()) as { focus: { selectedQuestId: string } };
  brokenFocus.focus.selectedQuestId = "missing-quest";
  assert.equal(projectModelSchema.safeParse(brokenFocus).success, false);

  const mismatchedFocus = structuredClone(openMechanicModel()) as {
    project: { systemIds: string[] };
    systems: Array<Record<string, unknown>>;
    focus: { selectedSystemId: string };
  };
  mismatchedFocus.project.systemIds.push("camera-system");
  mismatchedFocus.systems.push({
    systemId: "camera-system",
    projectId: "branching-dialogue-game",
    title: "Camera",
    outcome: "The camera follows the player.",
    status: "planned",
    questIds: [],
  });
  mismatchedFocus.focus.selectedSystemId = "camera-system";
  assert.equal(projectModelSchema.safeParse(mismatchedFocus).success, false);
});

test("planned systems can wait for refinement with system-only focus and no quests", () => {
  const multiSystem = structuredClone(openMechanicModel()) as {
    project: { systemIds: string[] };
    systems: Array<Record<string, unknown>>;
    focus: { selectedSystemId: string; selectedQuestId: string | null; nextRecommendedQuestId: string | null };
  };
  multiSystem.project.systemIds.push("camera-system");
  multiSystem.systems.push({
    systemId: "camera-system",
    projectId: "branching-dialogue-game",
    title: "Camera",
    outcome: "The camera follows the player.",
    status: "planned",
    questIds: [],
  });
  multiSystem.focus = { selectedSystemId: "camera-system", selectedQuestId: null, nextRecommendedQuestId: null };
  const parsedMultiSystem = projectModelSchema.parse(multiSystem);
  assert.equal(parsedMultiSystem.systems[1]?.status, "planned");
  assert.deepEqual(parsedMultiSystem.systems[1]?.questIds, []);
  assert.equal(parsedMultiSystem.focus.selectedQuestId, null);

  const unrefinedProject = structuredClone(multiSystem) as unknown as {
    project: { systemIds: string[] };
    systems: Array<Record<string, unknown>>;
    quests: unknown[];
    focus: { selectedSystemId: string; selectedQuestId: string | null; nextRecommendedQuestId: string | null };
  };
  unrefinedProject.project.systemIds = ["camera-system"];
  unrefinedProject.systems = [multiSystem.systems[1]!];
  unrefinedProject.quests = [];
  const parsedUnrefined = projectModelSchema.parse(unrefinedProject);
  assert.deepEqual(parsedUnrefined.quests, []);
  assert.equal(parsedUnrefined.systems[0]?.status, "planned");
  assert.deepEqual(parsedUnrefined.focus, {
    selectedSystemId: "camera-system",
    selectedQuestId: null,
    nextRecommendedQuestId: null,
  });
});

test("an accepted open roadmap adds empty systems without changing quests, sessions, results, or history", () => {
  const source = projectModelSchema.parse(openMechanicModel());
  const accepted = acceptedSystemRoadmapSchema.parse({
    schemaVersion: 1, projectId: source.project.projectId,
    creatorIdea: "A branching story where each reply changes who trusts the player next.",
    sourceFingerprint: "a".repeat(64), proposalFingerprint: "b".repeat(64), acceptedAt: fixtureTime,
    systems: [
      { systemId: "dialogue-system", title: "Living Dialogue", outcome: "Replies change the next conversation.", questIds: ["choose-a-reply"] },
      { systemId: "trust-system", title: "Character Trust", outcome: "Characters remember how the player treats them.", questIds: [] },
      { systemId: "story-rhythm", title: "Story Rhythm", outcome: "Quiet and tense moments alternate clearly.", questIds: [] },
    ],
  });
  const next = applyAcceptedSystemRoadmap(source, accepted);
  assert.deepEqual(next.systems.map((system) => system.systemId), ["dialogue-system", "trust-system", "story-rhythm"]);
  assert.deepEqual(next.quests, source.quests);
  assert.deepEqual(next.workSessions, source.workSessions);
  assert.deepEqual(next.results, source.results);
  assert.deepEqual(next.history, source.history);
});

test("an accepted roadmap preserves global quest order and cannot reorder populated system groups", () => {
  const first = projectModelSchema.parse(openMechanicModel());
  const source = projectModelSchema.parse({
    ...first,
    project: { ...first.project, systemIds: [first.systems[0]!.systemId, "ending-system"] },
    systems: [...first.systems, { systemId: "ending-system", projectId: first.project.projectId, title: "Ending", outcome: "The story reaches a visible ending.", status: "active", questIds: ["reach-the-ending"] }],
    quests: [...first.quests, { questId: "reach-the-ending", systemId: "ending-system", title: "Reach the Ending", playerVisibleOutcome: "The ending appears.", doneWhen: ["The ending is visible."], status: "available", dependsOn: [], workSessionIds: [], latestWorkSessionId: null, extraProof: null }],
  });
  const accepted = acceptedSystemRoadmapSchema.parse({
    schemaVersion: 1, projectId: source.project.projectId, creatorIdea: "A branching story with one clear ending.",
    sourceFingerprint: "a".repeat(64), proposalFingerprint: "b".repeat(64), acceptedAt: fixtureTime,
    systems: [
      { systemId: "ending-system", title: "Ending", outcome: "The story reaches a visible ending.", questIds: ["reach-the-ending"] },
      { systemId: source.systems[0]!.systemId, title: source.systems[0]!.title, outcome: source.systems[0]!.outcome, questIds: source.systems[0]!.questIds },
      { systemId: "empty-system", title: "World Mood", outcome: "The world reflects the story mood.", questIds: [] },
    ],
  });
  assert.throws(() => applyAcceptedSystemRoadmap(source, accepted), /reordered existing quest groups/);
  const safe = applyAcceptedSystemRoadmap(source, { ...accepted, systems: [accepted.systems[1]!, accepted.systems[2]!, accepted.systems[0]!] });
  assert.deepEqual(safe.quests, source.quests);
});

test("legacy quest and system statuses follow the exact compatibility truth table", () => {
  for (const persisted of ["planned", "available", "blocked", "deferred", "completed"] as const) {
    assert.equal(deriveLegacyQuestStatus(persisted, undefined), persisted);
    assert.equal(deriveLegacyQuestStatus(persisted, { phase: "contract_review" }), persisted);
    assert.equal(deriveLegacyQuestStatus(persisted, { phase: "failed" }), persisted);
    assert.equal(deriveLegacyQuestStatus(persisted, { phase: "cancelled" }), persisted);
    assert.equal(deriveLegacyQuestStatus(persisted, { phase: "interrupted" }), persisted);
  }
  for (const phase of ["approved", "implementing", "scope_review", "verifying", "waiting_for_playtest", "completion_pending"] as const) {
    assert.equal(deriveLegacyQuestStatus("available", { phase }), "active");
    assert.equal(deriveLegacyQuestStatus("completed", { phase }), "completed");
  }

  assert.equal(deriveProjectSystemStatus([]), "planned");
  assert.equal(deriveProjectSystemStatus(["completed", "completed"]), "completed");
  assert.equal(deriveProjectSystemStatus(["deferred", "deferred"]), "deferred");
  assert.equal(deriveProjectSystemStatus(["active", "blocked"]), "active");
  assert.equal(deriveProjectSystemStatus(["available", "blocked"]), "active");
  assert.equal(deriveProjectSystemStatus(["completed", "blocked"]), "active");
  assert.equal(deriveProjectSystemStatus(["blocked", "planned"]), "planned");
});

test("Gravity Tap migrates every quest, session, result, and Chronicle link one-for-one", async () => {
  const fixture = await createGeneratedQuestFixture();
  try {
    const runner = new GeneratedQuestRunnerService({
      forgeHome: fixture.forgeHome,
      now: () => new Date(fixtureTime),
      randomId: () => "11111111-1111-1111-1111-111111111111",
      codexExecutor: new MutatingCodexExecutor(applyOrbChange),
      proofDependencies: passingProofDependencies,
      launchGame: async () => ({ launched: true, version: "4.7.stable.test", message: "launched" }),
    });
    await runner.adjust(fixture.projectId, "q1-enter-the-arena", { expectedRevision: 1, ...approvedAdjustment });
    const prepared = await runner.prepare(fixture.projectId, "q1-enter-the-arena");
    await runner.approve(fixture.projectId, "q1-enter-the-arena", prepared.contract.fingerprint, "APPROVE");
    await runner.start(fixture.projectId, "q1-enter-the-arena");
    await runner.waitForRun(fixture.projectId, "q1-enter-the-arena");
    await runner.play(fixture.projectId, "q1-enter-the-arena");
    const completed = await runner.confirm(fixture.projectId, "q1-enter-the-arena", "worked");
    assert.ok(completed.receipt);

    const sourceSessions = await runner.listProjectSessions(fixture.projectId);
    const world = await new GeneratedProjectWorldService({ forgeHome: fixture.forgeHome, generatedRunner: runner }).loadWorld(fixture.projectId);
    const model = world.projectModel;
    assert.deepEqual(model.quests.map((quest) => quest.questId), world.roadmap.quests.map((quest) => quest.questId));
    assert.deepEqual(model.workSessions.map((session) => session.workSessionId), sourceSessions.map((session) => session.runId));
    assert.deepEqual(model.results.map((result) => result.resultId), sourceSessions.filter((session) => session.phase === "completed").map((session) => `result-${session.runId}`));
    assert.deepEqual(model.history.map((entry) => entry.historyEntryId), world.chronicle.entries.map((entry) => entry.entryId));
    assert.equal(model.quests[0]?.status, "completed");
    assert.equal(model.quests[1]?.status, "available");
    assert.equal(model.systems[0]?.status, "active");
    assert.equal(model.workSessions[0]?.resultId, model.results[0]?.resultId);
    assert.equal(model.history.at(-1)?.workSessionId, completed.runId);
    assert.equal(model.results[0]?.gitCommitSha, completed.receipt.commitSha);
    assert.equal(model.results[0]?.treeSha, completed.receipt.treeSha);
    assert.equal(model.focus.selectedSystemId, "system-first-playable");
    assert.equal(model.focus.selectedQuestId, "q1-enter-the-arena");
    assert.equal(model.focus.nextRecommendedQuestId, "q2-move-into-position");

    const withoutProofMetadata = structuredClone(model);
    for (const quest of withoutProofMetadata.quests) quest.extraProof = null;
    const reparsed = projectModelSchema.parse(withoutProofMetadata);
    assert.deepEqual(reparsed.quests.map((quest) => quest.status), model.quests.map((quest) => quest.status));
    assert.equal(reparsed.systems[0]?.status, model.systems[0]?.status);
  } finally {
    await fixture.cleanup();
  }
});

test("Signal Sweep keeps contract review descriptive while later quests remain dependency-blocked", async () => {
  const fixture = await createSignalSweepFixture();
  try {
    const runner = new GeneratedQuestRunnerService({
      forgeHome: fixture.forgeHome,
      now: () => new Date(fixtureTime),
      randomId: () => "22222222-2222-2222-2222-222222222222",
    });
    const prepared = await runner.prepare(fixture.projectId, "q1-activate-the-signal-relay");
    const world = await new GeneratedProjectWorldService({ forgeHome: fixture.forgeHome, generatedRunner: runner }).loadWorld(fixture.projectId);
    const model = world.projectModel;
    assert.deepEqual(model.quests.map((quest) => quest.status), ["available", "blocked", "blocked"]);
    assert.equal(model.systems[0]?.status, "active");
    assert.deepEqual(model.quests[0]?.workSessionIds, [prepared.runId]);
    assert.equal(model.quests[0]?.latestWorkSessionId, prepared.runId);
    assert.equal(model.workSessions[0]?.workSessionId, prepared.runId);
    assert.equal(model.workSessions[0]?.phase, "contract_review");
    assert.equal(model.workSessions[0]?.createdAt, prepared.createdAt);
    assert.equal(model.workSessions[0]?.updatedAt, prepared.updatedAt);
    assert.deepEqual(model.workSessions[0]?.changedFiles, []);
    assert.equal(model.workSessions[0]?.resultId, null);
    assert.deepEqual(model.results, []);
    assert.deepEqual(model.history.map((entry) => entry.historyEntryId), world.chronicle.entries.map((entry) => entry.entryId));
    assert.equal(model.focus.selectedSystemId, "system-first-playable");
    assert.equal(model.focus.selectedQuestId, "q1-activate-the-signal-relay");
  } finally {
    await fixture.cleanup();
  }
});
