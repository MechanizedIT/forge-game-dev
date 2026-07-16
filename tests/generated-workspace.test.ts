import assert from "node:assert/strict";
import test from "node:test";

import type { GeneratedProjectWorldSnapshot } from "../src/generated-project-world/shared.js";
import { buildGeneratedWorkspacePresentation } from "../src/dashboard-v2/generated-workspace.js";

function snapshot(): GeneratedProjectWorldSnapshot {
  const questBrief = {
    questId: "q1-activate-relay",
    title: "Activate the Signal Relay",
    visibleOutcome: "The relay activates once with a clear response.",
    eligibility: { eligible: true, reason: "The creator-approved work order is ready." },
    run: null,
  };
  return {
    projectModel: {
      modelVersion: 1,
      project: {
        projectId: "signal-sweep",
        name: "Signal Sweep",
        vision: "Activate a relay in a small arena.",
        engine: { kind: "godot", version: "4.7", projectFile: "project.godot", mainScene: "scenes/main.tscn" },
        systemIds: ["first-playable", "camera-feel"],
      },
      systems: [
        { systemId: "first-playable", projectId: "signal-sweep", title: "First Playable", outcome: "Activate one relay.", status: "active", questIds: ["q1-activate-relay"] },
        { systemId: "camera-feel", projectId: "signal-sweep", title: "Camera Feel", outcome: "Make the camera feel calm.", status: "planned", questIds: [] },
      ],
      quests: [{
        questId: "q1-activate-relay",
        systemId: "first-playable",
        title: "Activate the Signal Relay",
        playerVisibleOutcome: "The relay activates once with a clear response.",
        doneWhen: ["The relay visibly activates."],
        status: "available",
        dependsOn: [],
        workSessionIds: [],
        latestWorkSessionId: null,
        extraProof: null,
      }],
      workSessions: [],
      results: [],
      history: [{ historyEntryId: "created", kind: "project_created", occurredAt: "2026-07-15T00:00:00.000Z", summary: "Created.", questId: null, workSessionId: null }],
      focus: { selectedSystemId: "first-playable", selectedQuestId: "q1-activate-relay", nextRecommendedQuestId: "q1-activate-relay" },
    },
    quests: [questBrief],
    state: { currentView: "project_world", selectedQuestId: "q1-activate-relay", nextRecommendedQuestId: "q1-activate-relay", repairNotice: null },
  } as unknown as GeneratedProjectWorldSnapshot;
}

test("workspace presentation uses systems and quests from the open Project Model", () => {
  const presentation = buildGeneratedWorkspacePresentation(snapshot());
  assert.deepEqual(presentation.systems.map((system) => system.title), ["First Playable", "Camera Feel"]);
  assert.equal(presentation.selectedSystem.systemId, "first-playable");
  assert.equal(presentation.selectedQuest?.questId, "q1-activate-relay");
  assert.equal(presentation.dock.status, null);
  assert.equal(presentation.selectedQuest?.recommended, true);
  assert.equal(presentation.context.primaryActionLabel, "Open quest");
  assert.equal(presentation.dock.playEnabled, true);
});

test("an empty system is selectable and offers the bounded refinement action without inventing a quest", () => {
  const presentation = buildGeneratedWorkspacePresentation(snapshot(), "camera-feel");
  assert.equal(presentation.selectedSystem.systemId, "camera-feel");
  assert.deepEqual(presentation.selectedSystem.quests, []);
  assert.equal(presentation.selectedQuest, null);
  assert.equal(presentation.context.kind, "system");
  assert.equal(presentation.context.primaryActionLabel, "Refine into quests");
  assert.match(presentation.context.recommendation, /suggest a few small/i);
});

test("an active work session disables Play but keeps safe folder and Toolbox access", () => {
  const value = snapshot();
  value.quests[0]!.run = {
    phase: "implementing",
    contract: { visibleOutcome: "The relay activates." },
  } as NonNullable<(typeof value.quests)[number]["run"]>;
  const presentation = buildGeneratedWorkspacePresentation(value);
  assert.equal(presentation.locked, true);
  assert.equal(presentation.dock.playEnabled, false);
  assert.equal(presentation.dock.openFolderEnabled, true);
  assert.equal(presentation.dock.toolboxEnabled, true);
  assert.equal(presentation.dock.status, "Codex working");
  assert.equal(presentation.context.primaryActionLabel, "View progress");
});

test("work on another quest locks the whole project workspace", () => {
  const value = snapshot();
  value.projectModel.quests.push({
    ...value.projectModel.quests[0]!,
    questId: "q2-carry-signal",
    title: "Carry the Signal",
    playerVisibleOutcome: "The signal crosses the arena.",
  });
  value.projectModel.systems[0]!.questIds.push("q2-carry-signal");
  value.quests.push({
    ...value.quests[0]!,
    questId: "q2-carry-signal",
    title: "Carry the Signal",
    visibleOutcome: "The signal crosses the arena.",
    run: {
      phase: "implementing",
      contract: { visibleOutcome: "The signal crosses the arena." },
    } as NonNullable<(typeof value.quests)[number]["run"]>,
  });
  const presentation = buildGeneratedWorkspacePresentation(value);
  assert.equal(presentation.selectedQuest?.questId, "q2-carry-signal");
  assert.equal(presentation.context.status, "Codex working");
  assert.equal(presentation.dock.status, "Codex working");
  assert.equal(presentation.locked, true);
  assert.equal(presentation.dock.playEnabled, false);
});

test("the context panel does not offer a duplicate action inside a quest screen", () => {
  const value = snapshot();
  value.state.currentView = "quest_brief";
  const presentation = buildGeneratedWorkspacePresentation(value);
  assert.equal(presentation.context.primaryActionLabel, null);
});

test("work-plan review stays separate from approval and starting work", () => {
  const value = snapshot();
  value.quests[0]!.run = {
    phase: "contract_review",
    contract: { visibleOutcome: "The relay activates." },
  } as NonNullable<(typeof value.quests)[number]["run"]>;
  const presentation = buildGeneratedWorkspacePresentation(value);
  assert.equal(presentation.locked, true);
  assert.equal(presentation.context.primaryActionLabel, "Check work plan");
  assert.match(presentation.context.recommendation, /Confirming it will not start Codex/i);
});
