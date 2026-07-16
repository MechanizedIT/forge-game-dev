import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { fingerprintProjectStructure } from "../src/blueprint-planner/system-roadmap.js";
import { fingerprintSystemQuestStructure } from "../src/blueprint-planner/system-quest.js";
import { acceptedSystemQuestPlanSchema } from "../src/contracts/index.js";
import { GeneratedProjectWorldService } from "../src/generated-project-world/service.js";
import { runGit } from "../src/generated-quest-runner/boundary.js";
import { GeneratedQuestRunnerService } from "../src/generated-quest-runner/service.js";
import {
  applyWelcomeBeaconChange,
  createSignalSweepFixture,
  fixtureTime,
  MutatingCodexExecutor,
  passingProofDependencies,
} from "./helpers/generated-quest-fixture.js";

async function prepareNativeQuest(
  fixture: Awaited<ReturnType<typeof createSignalSweepFixture>>,
  runner: GeneratedQuestRunnerService,
) {
  const world = new GeneratedProjectWorldService({ forgeHome: fixture.forgeHome, generatedRunner: runner, now: () => new Date(fixtureTime) });
  const initial = await world.loadWorld(fixture.projectId);
  const system = initial.projectModel.systems[0]!;
  await world.saveSystemRoadmap(fixture.projectId, {
    schemaVersion: 1,
    projectId: fixture.projectId,
    creatorIdea: "A small station game where a warm relay welcomes the player before the harbor answers.",
    sourceFingerprint: fingerprintProjectStructure(initial.projectModel),
    proposalFingerprint: "a".repeat(64),
    acceptedAt: fixtureTime,
    systems: [
      { systemId: system.systemId, title: "Welcome Relay", outcome: "The relay greets the player and wakes the station.", questIds: system.questIds },
      { systemId: "system-harbor-answer", title: "Harbor Answer", outcome: "The harbor visibly answers the relay.", questIds: [] },
      { systemId: "system-storm-rhythm", title: "Storm Rhythm", outcome: "Readable weather changes the station rhythm.", questIds: [] },
    ],
  });
  const roadmapped = await world.loadWorld(fixture.projectId);
  const selected = roadmapped.projectModel.systems.find((candidate) => candidate.systemId === system.systemId)!;
  await world.saveSystemQuestBatch(fixture.projectId, {
    systemId: selected.systemId,
    baseQuestIds: selected.questIds,
    creatorDescription: "Welcome the player with one warm visible beacon when the station begins.",
    sourceFingerprint: fingerprintSystemQuestStructure(roadmapped.projectModel, selected.systemId),
    proposalFingerprint: "b".repeat(64),
    acceptedAt: fixtureTime,
    quests: [{
      questId: "quest-welcome-player",
      title: "Welcome the Player",
      playerVisibleOutcome: "A warm welcome beacon appears when the station begins.",
      whyItMatters: "The first response makes the station feel alive and easy to understand.",
      doneWhen: ["A warm beacon is clearly visible when play begins."],
      excludedScope: ["No scoring, weather, or new level."],
      dependsOn: [],
    }],
  });
  const choice = { existingFiles: ["scenes/main.tscn"], newFiles: ["scripts/welcome_beacon.gd"] };
  const review = await world.reviewSystemQuestWorkOrder(fixture.projectId, selected.systemId, "quest-welcome-player", choice);
  await world.saveSystemQuestWorkOrder(fixture.projectId, selected.systemId, "quest-welcome-player", choice, review.fingerprint);
  return { world, questId: "quest-welcome-player", recordPath: path.join(fixture.projectPath, ".forge", "system-quests.json") };
}

async function advanceToPlayGate(runner: GeneratedQuestRunnerService, projectId: string, questId: string) {
  const prepared = await runner.prepare(projectId, questId);
  await runner.approve(projectId, questId, prepared.contract.fingerprint, "APPROVE");
  await runner.start(projectId, questId);
  const waiting = await runner.waitForRun(projectId, questId);
  assert.equal(waiting.phase, "waiting_for_playtest", waiting.error ?? "");
  return waiting;
}

test("a native quest completes through the plain five-stage creator rehearsal and reloads", async () => {
  const fixture = await createSignalSweepFixture();
  try {
    let launches = 0;
    const runner = new GeneratedQuestRunnerService({
      forgeHome: fixture.forgeHome,
      now: () => new Date(fixtureTime),
      randomId: () => "77777777-7777-7777-7777-777777777777",
      codexExecutor: new MutatingCodexExecutor(applyWelcomeBeaconChange, false, "The welcome beacon is ready to play."),
      proofDependencies: passingProofDependencies,
      launchGame: async () => { launches += 1; return { launched: true, version: "4.7.test", message: "Temporary game launched." }; },
    });
    const { world, questId } = await prepareNativeQuest(fixture, runner);
    const beforeHead = runGit(fixture.projectPath, ["rev-parse", "HEAD"]);
    const summary = await runner.getSummary(fixture.projectId, questId);
    assert.equal(summary.eligibility.eligible, true, summary.eligibility.reason ?? "");
    const prepared = await runner.prepare(fixture.projectId, questId);
    assert.equal(prepared.contract.schemaVersion, 2);
    assert.equal(prepared.contract.verificationProfile, null);
    assert.deepEqual(prepared.contract.allowedFiles.map((file) => file.relativePath), ["scenes/main.tscn", "scripts/welcome_beacon.gd"]);
    await runner.approve(fixture.projectId, questId, prepared.contract.fingerprint, "APPROVE");
    await runner.start(fixture.projectId, questId);
    const waiting = await runner.waitForRun(fixture.projectId, questId);
    assert.equal(waiting.phase, "waiting_for_playtest", waiting.error ?? "");
    assert.deepEqual(waiting.changedFiles, ["scenes/main.tscn", "scripts/welcome_beacon.gd"]);
    assert.equal(waiting.proofs.boundary.result, "passed");
    assert.equal(waiting.proofs.projectHealth.result, "passed");
    assert.equal(waiting.proofs.mechanic.result, "not_run");
    await runner.play(fixture.projectId, questId);
    assert.equal(launches, 1);
    const completed = await runner.confirm(fixture.projectId, questId, "worked");
    assert.equal(completed.phase, "completed", completed.error ?? "");
    assert.notEqual(runGit(fixture.projectPath, ["rev-parse", "HEAD"]), beforeHead);
    assert.equal(runGit(fixture.projectPath, ["status", "--porcelain"]), "");
    const committed = runGit(fixture.projectPath, ["show", "--format=", "--name-only", "HEAD"]).split(/\r?\n/u).filter(Boolean);
    assert.ok(committed.includes(".forge/system-roadmap.json"));
    assert.ok(committed.includes(".forge/system-quests.json"));
    assert.ok(committed.includes("scenes/main.tscn"));
    assert.ok(committed.includes("scripts/welcome_beacon.gd"));
    const reloaded = await new GeneratedProjectWorldService({ forgeHome: fixture.forgeHome }).loadWorld(fixture.projectId);
    const quest = reloaded.projectModel.quests.find((candidate) => candidate.questId === questId)!;
    assert.equal(quest.status, "completed");
    assert.equal(quest.workSessionIds.length, 1);
    assert.equal(reloaded.projectModel.results.some((result) => result.questId === questId), true);
    assert.equal(reloaded.projectModel.history.some((entry) => entry.questId === questId && entry.kind === "quest_completed"), true);
    const saved = acceptedSystemQuestPlanSchema.parse(JSON.parse(await readFile(path.join(fixture.projectPath, ".forge", "system-quests.json"), "utf8")) as unknown);
    const implementation = saved.systems[0]!.quests[0]!.implementation;
    assert.ok(implementation);
    assert.equal(implementation.verificationProfile, null);
    assert.equal(implementation.creatorConfirmation, "worked");
    assert.equal(completed.receipt?.commitSha, runGit(fixture.projectPath, ["rev-parse", "HEAD"]));
    const roadmapDocument = await readFile(path.join(fixture.projectPath, ".forge", "docs", "roadmap.md"), "utf8");
    assert.match(roadmapDocument, /Activate the Signal Relay/);
    assert.match(roadmapDocument, /Welcome the Player/);
    assert.match(await readFile(path.join(fixture.projectPath, "PROJECT.md"), "utf8"), /## Foundation[\s\S]*Welcome the Player/);
    await world.loadWorld(fixture.projectId);
  } finally {
    await fixture.cleanup();
  }
});

test("creator confirmation requires a successful game launch", async () => {
  const fixture = await createSignalSweepFixture();
  try {
    const runner = new GeneratedQuestRunnerService({
      forgeHome: fixture.forgeHome,
      randomId: () => "99999999-9999-9999-9999-999999999999",
      codexExecutor: new MutatingCodexExecutor(applyWelcomeBeaconChange),
      proofDependencies: passingProofDependencies,
      launchGame: async () => { throw new Error("Injected temporary launch failure."); },
    });
    const { questId, recordPath } = await prepareNativeQuest(fixture, runner);
    const head = runGit(fixture.projectPath, ["rev-parse", "HEAD"]);
    await advanceToPlayGate(runner, fixture.projectId, questId);
    await assert.rejects(() => runner.confirm(fixture.projectId, questId, "worked"), /Play the real game successfully/i);
    await assert.rejects(() => runner.play(fixture.projectId, questId), /Injected temporary launch failure/i);
    await assert.rejects(() => runner.confirm(fixture.projectId, questId, "worked"), /Play the real game successfully/i);
    assert.equal(runGit(fixture.projectPath, ["rev-parse", "HEAD"]), head);
    const saved = acceptedSystemQuestPlanSchema.parse(JSON.parse(await readFile(recordPath, "utf8")) as unknown);
    assert.equal(saved.systems[0]!.quests[0]!.implementation, undefined);
  } finally { await fixture.cleanup(); }
});

for (const fault of ["after_artifact_write", "before_commit"] as const) {
  test(`native ${fault} failure restores records and allows exact undo`, async () => {
    const fixture = await createSignalSweepFixture();
    try {
      const runner = new GeneratedQuestRunnerService({
        forgeHome: fixture.forgeHome,
        randomId: () => fault === "after_artifact_write" ? "aaaaaaaa-1111-1111-1111-111111111111" : "bbbbbbbb-1111-1111-1111-111111111111",
        codexExecutor: new MutatingCodexExecutor(applyWelcomeBeaconChange),
        proofDependencies: passingProofDependencies,
        launchGame: async () => ({ launched: true, version: "4.7.test", message: "Temporary game launched." }),
        completionFault: () => fault,
      });
      const { questId, recordPath } = await prepareNativeQuest(fixture, runner);
      const scenePath = path.join(fixture.projectPath, "scenes", "main.tscn");
      const originalScene = await readFile(scenePath, "utf8");
      const head = runGit(fixture.projectPath, ["rev-parse", "HEAD"]);
      await advanceToPlayGate(runner, fixture.projectId, questId);
      await runner.play(fixture.projectId, questId);
      const failed = await runner.confirm(fixture.projectId, questId, "worked");
      assert.equal(failed.phase, "failed");
      assert.equal(failed.recovery.action, "rollback");
      assert.equal(runGit(fixture.projectPath, ["rev-parse", "HEAD"]), head);
      assert.equal(runGit(fixture.projectPath, ["diff", "--cached", "--name-only"]), "");
      const saved = acceptedSystemQuestPlanSchema.parse(JSON.parse(await readFile(recordPath, "utf8")) as unknown);
      assert.equal(saved.systems[0]!.quests[0]!.implementation, undefined);
      const rolledBack = await runner.rollback(fixture.projectId, questId, "ROLL BACK REVIEWED CHANGES");
      assert.equal(rolledBack.phase, "cancelled");
      assert.equal(await readFile(scenePath, "utf8"), originalScene);
      await assert.rejects(() => readFile(path.join(fixture.projectPath, "scripts", "welcome_beacon.gd")), { code: "ENOENT" });
    } finally { await fixture.cleanup(); }
  });
}

test("native receipt repair reuses the one completion commit after restart", async () => {
  const fixture = await createSignalSweepFixture();
  try {
    const runner = new GeneratedQuestRunnerService({
      forgeHome: fixture.forgeHome,
      randomId: () => "cccccccc-1111-1111-1111-111111111111",
      codexExecutor: new MutatingCodexExecutor(applyWelcomeBeaconChange),
      proofDependencies: passingProofDependencies,
      launchGame: async () => ({ launched: true, version: "4.7.test", message: "Temporary game launched." }),
      completionFault: () => "after_commit_before_receipt",
    });
    const { questId } = await prepareNativeQuest(fixture, runner);
    await advanceToPlayGate(runner, fixture.projectId, questId);
    await runner.play(fixture.projectId, questId);
    const pending = await runner.confirm(fixture.projectId, questId, "worked");
    assert.equal(pending.phase, "completion_pending");
    const head = runGit(fixture.projectPath, ["rev-parse", "HEAD"]);
    const count = runGit(fixture.projectPath, ["rev-list", "--count", "HEAD"]);
    const fresh = new GeneratedQuestRunnerService({ forgeHome: fixture.forgeHome });
    await fresh.recoverActiveRuns();
    const restored = await fresh.getSummary(fixture.projectId, questId);
    assert.equal(restored.run?.phase, "completed");
    assert.equal(restored.run?.receipt?.commitSha, head);
    assert.equal(runGit(fixture.projectPath, ["rev-list", "--count", "HEAD"]), count);
  } finally { await fixture.cleanup(); }
});

test("native planning permits exact unstaged tracked records and rejects a post-review byte change", async () => {
  const fixture = await createSignalSweepFixture();
  try {
    const runner = new GeneratedQuestRunnerService({
      forgeHome: fixture.forgeHome,
      codexExecutor: new MutatingCodexExecutor(applyWelcomeBeaconChange),
      proofDependencies: passingProofDependencies,
    });
    const { questId, recordPath } = await prepareNativeQuest(fixture, runner);
    runGit(fixture.projectPath, ["add", "--", ".forge/system-roadmap.json", ".forge/system-quests.json"]);
    runGit(fixture.projectPath, ["commit", "-m", "test: save native planning records"]);
    const saved = acceptedSystemQuestPlanSchema.parse(JSON.parse(await readFile(recordPath, "utf8")) as unknown);
    await writeFile(recordPath, `${JSON.stringify({ ...saved, systems: saved.systems.map((system) => ({ ...system, creatorDescription: `${system.creatorDescription} Keep it small.` })) }, null, 2)}\n`, "utf8");
    const prepared = await runner.prepare(fixture.projectId, questId);
    assert.equal(prepared.phase, "contract_review");
    await runner.approve(fixture.projectId, questId, prepared.contract.fingerprint, "APPROVE");
    const changedAgain = acceptedSystemQuestPlanSchema.parse(JSON.parse(await readFile(recordPath, "utf8")) as unknown);
    await writeFile(recordPath, `${JSON.stringify({ ...changedAgain, systems: changedAgain.systems.map((system) => ({ ...system, creatorDescription: `${system.creatorDescription} Changed after review.` })) }, null, 2)}\n`, "utf8");
    await assert.rejects(() => runner.start(fixture.projectId, questId), /inventory|changed after/i);
  } finally { await fixture.cleanup(); }
});

test("native preparation rejects a changed work plan and staged planning files", async () => {
  const fixture = await createSignalSweepFixture();
  try {
    const runner = new GeneratedQuestRunnerService({ forgeHome: fixture.forgeHome });
    const { questId, recordPath } = await prepareNativeQuest(fixture, runner);
    const original = acceptedSystemQuestPlanSchema.parse(JSON.parse(await readFile(recordPath, "utf8")) as unknown);
    const changed = { ...original, systems: original.systems.map((system) => ({ ...system, quests: system.quests.map((quest) => ({ ...quest, title: `${quest.title} changed` })) })) };
    await writeFile(recordPath, `${JSON.stringify(changed, null, 2)}\n`, "utf8");
    await assert.rejects(() => runner.prepare(fixture.projectId, questId), /no longer matches its confirmed fingerprint/i);
    await writeFile(recordPath, `${JSON.stringify(original, null, 2)}\n`, "utf8");
    const staged = spawnSync("git", ["add", ".forge/system-roadmap.json", ".forge/system-quests.json"], { cwd: fixture.projectPath, encoding: "utf8", windowsHide: true });
    assert.equal(staged.status, 0, `${staged.stdout}${staged.stderr}`);
    await assert.rejects(() => runner.prepare(fixture.projectId, questId), /unapproved local changes/i);
    runGit(fixture.projectPath, ["rm", "--cached", "--", ".forge/system-roadmap.json", ".forge/system-quests.json"]);
    runGit(fixture.projectPath, ["remote", "add", "origin", "https://example.invalid/temporary.git"]);
    await assert.rejects(() => runner.prepare(fixture.projectId, questId), /no Git remotes/i);
  } finally {
    await fixture.cleanup();
  }
});
