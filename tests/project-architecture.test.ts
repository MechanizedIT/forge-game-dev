import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { acceptedSystemQuestPlanSchema, projectModelSchema } from "../src/contracts/index.js";
import { ARCHITECTURE_CONTEXT_LIMITS, ARCHITECTURE_RELATIVE_PATH, ArchitectureService } from "../src/project-architecture/service.js";

const now = new Date("2026-07-16T18:00:00.000Z");

function projectModel() {
  return projectModelSchema.parse({
    modelVersion: 1,
    project: { projectId: "architecture-test", name: "Architecture Test", vision: "Collect scrap and upgrade the robot's thrusters.", engine: { kind: "godot", version: "4.5", projectFile: "project.godot", mainScene: "scenes/main.tscn" }, systemIds: ["system-upgrade-run"] },
    systems: [{ systemId: "system-upgrade-run", projectId: "architecture-test", title: "Collect Scrap and Upgrade Thrusters", outcome: "The player collects scrap and spends it on stronger movement.", status: "active", questIds: ["quest-double-jump", "quest-air-jump"] }],
    quests: [
      { questId: "quest-double-jump", systemId: "system-upgrade-run", title: "Add Double Jump", playerVisibleOutcome: "The player can jump once more in the air.", doneWhen: ["A second jump works before landing."], status: "available", dependsOn: [], workSessionIds: [], latestWorkSessionId: null, extraProof: null },
      { questId: "quest-air-jump", systemId: "system-upgrade-run", title: "Polish Air Jump", playerVisibleOutcome: "The second jump has clear movement and audio feedback.", doneWhen: ["The air jump is clear."], status: "available", dependsOn: [], workSessionIds: [], latestWorkSessionId: null, extraProof: null },
    ],
    workSessions: [], results: [],
    history: [{ historyEntryId: "project-created", kind: "project_created", occurredAt: now.toISOString(), summary: "Project created.", questId: null, workSessionId: null }],
    focus: { selectedSystemId: "system-upgrade-run", selectedQuestId: "quest-double-jump", nextRecommendedQuestId: "quest-double-jump" },
  });
}

function questPlan() {
  return acceptedSystemQuestPlanSchema.parse({
    schemaVersion: 1,
    projectId: "architecture-test",
    systems: [{
      systemId: "system-upgrade-run",
      baseQuestIds: ["quest-double-jump"],
      creatorDescription: "Add a double jump while keeping the existing run and landing feel.",
      sourceFingerprint: "a".repeat(64),
      proposalFingerprint: "b".repeat(64),
      acceptedAt: now.toISOString(),
      quests: [{ questId: "quest-air-jump", title: "Polish Air Jump", playerVisibleOutcome: "The second jump has clear movement and audio feedback.", whyItMatters: "The player can understand and enjoy the extra jump.", doneWhen: ["The air jump is clear."], excludedScope: ["Do not change upgrades."], dependsOn: [], workOrder: { existingFiles: ["scripts/player_controller.gd", "scripts/player_audio.gd"], newFiles: [], fingerprint: "c".repeat(64), acceptedAt: now.toISOString() } }],
    }],
  });
}

test("architecture initializes, persists, links many-to-many context, and updates incrementally", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "forge-architecture-"));
  await mkdir(path.join(root, ".forge"));
  try {
    const service = new ArchitectureService({ now: () => now });
    let architecture = await service.ensure(root, "architecture-test", projectModel(), questPlan(), ["scenes/main.tscn", "scripts/player_controller.gd", "scripts/player_audio.gd", "scripts/upgrade_menu.gd"]);
    assert.equal(architecture.projectId, "architecture-test");
    assert.ok(architecture.gameAreas.some((area) => area.name === "Player Movement" && area.relatedExperienceIds.includes("system-upgrade-run")));
    assert.ok(architecture.gameAreas.some((area) => area.name === "Upgrades" && area.relatedExperienceIds.includes("system-upgrade-run")));
    assert.ok(architecture.gameAreas.some((area) => area.name === "Audio" && area.relatedStepIds.includes("quest-air-jump")));
    assert.deepEqual(JSON.parse(await readFile(path.join(root, ARCHITECTURE_RELATIVE_PATH), "utf8")), architecture);

    architecture = await service.save(root, { ...architecture, gameAreas: architecture.gameAreas.map((area) => area.name !== "Player Movement" ? area : { ...area, recentChanges: Array.from({ length: 7 }, (_, index) => ({ changeId: `change-previous-${index}`, stepId: `quest-previous-${index}`, workSessionId: `run-previous-${index}`, summary: `Previous movement change ${index}.`, changedFiles: ["scripts/player_controller.gd"], unexpectedFiles: [], verificationOutcome: "passed" as const, playtestOutcome: "worked" as const, creatorFeedback: "Worked.", occurredAt: new Date(now.getTime() + index).toISOString() })) }) });
    const selected = service.selectContext(architecture, "quest-air-jump", ["scripts/player_controller.gd", "scripts/player_audio.gd"]);
    assert.ok(["Player Movement", "Audio"].includes(selected.primaryArea?.name ?? ""));
    assert.ok(selected.secondaryAreas.length <= ARCHITECTURE_CONTEXT_LIMITS.secondaryAreas);
    assert.deepEqual(selected.selectedFiles, ["scripts/player_controller.gd", "scripts/player_audio.gd"]);
    assert.equal(selected.relatedPreviousSteps.length, ARCHITECTURE_CONTEXT_LIMITS.previousSteps);
    assert.ok(selected.relatedPreviousSteps.every((step) => step.stepId.startsWith("quest-previous-")));

    const updated = await service.recordResult(root, "architecture-test", { stepId: "quest-air-jump", workSessionId: "run-air-jump", summary: "Added the air jump and checked Godot.", changedFiles: ["scripts/player_controller.gd", "scripts/player_audio.gd"], verificationOutcome: "passed", playtestOutcome: "worked", creatorFeedback: "The jump feels clear." });
    assert.ok(updated?.gameAreas.some((area) => area.recentChanges.some((change) => change.workSessionId === "run-air-jump" && change.playtestOutcome === "worked")));
    assert.equal(updated?.gameAreas.find((area) => area.name === "Player Movement")?.recentChanges.at(-1)?.creatorFeedback, "The jump feels clear.");

    const feedbackUpdated = await service.recordCreatorFeedback(root, "architecture-test", { stepId: "quest-air-jump", summary: "Give the jump a little more lift.", relatedFiles: ["scripts/player_controller.gd"], playtestOutcome: "did_not_work" });
    assert.equal(feedbackUpdated?.gameAreas.find((area) => area.name === "Player Movement")?.recentChanges.at(-1)?.creatorFeedback, "Give the jump a little more lift.");
    assert.equal(feedbackUpdated?.gameAreas.find((area) => area.name === "Player Movement")?.recentChanges.at(-1)?.playtestOutcome, "did_not_work");

    const longFeedback = "Godot reported a detailed repair failure. ".repeat(24);
    const boundedFeedback = await service.recordCreatorFeedback(root, "architecture-test", { stepId: "quest-air-jump", summary: longFeedback, relatedFiles: ["scripts/player_controller.gd"], playtestOutcome: "did_not_work" });
    const boundedChange = boundedFeedback?.gameAreas.find((area) => area.name === "Player Movement")?.recentChanges.at(-1);
    assert.equal(boundedChange?.summary.length, 500);
    assert.ok((boundedChange?.creatorFeedback.length ?? 0) <= 1_000);
    assert.equal(boundedChange?.creatorFeedback.endsWith("…"), true);
    assert.equal(boundedChange?.summary.endsWith("…"), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("architecture warnings are advisory and manual edits stay behind the service boundary", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "forge-architecture-edit-"));
  await mkdir(path.join(root, ".forge"));
  try {
    const service = new ArchitectureService({ now: () => now });
    let architecture = await service.ensure(root, "architecture-test", projectModel(), questPlan(), ["scripts/player_controller.gd", "scripts/player_audio.gd"]);
    const movement = architecture.gameAreas.find((area) => area.name === "Player Movement")!;
    const audio = architecture.gameAreas.find((area) => area.name === "Audio")!;
    architecture = await service.mutate(root, "architecture-test", { action: "set_dependencies", areaId: movement.id, dependencyIds: [audio.id] });
    architecture = await service.mutate(root, "architecture-test", { action: "set_files", areaId: audio.id, relatedFilePaths: [...audio.relatedFilePaths, "scripts/player_controller.gd"] });
    const warnings = service.warnings(architecture, "quest-air-jump", ["scripts/player_controller.gd"]);
    assert.ok(warnings.some((warning) => warning.warningId === "shared-files"));
    assert.ok(warnings.some((warning) => warning.warningId === "dependencies"));
    assert.ok(warnings.every((warning) => warning.advisory));
    const renamed = await service.mutate(root, "architecture-test", { action: "edit", areaId: movement.id, name: "Movement and Jumping", description: "Player locomotion and jump rules." });
    assert.equal(renamed.gameAreas.find((area) => area.id === movement.id)?.name, "Movement and Jumping");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
