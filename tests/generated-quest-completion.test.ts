import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { generatedQuestArtifactV2Schema } from "../src/contracts/index.js";
import { runGit } from "../src/generated-quest-runner/boundary.js";
import { GeneratedQuestRunnerService } from "../src/generated-quest-runner/service.js";
import {
  applyOrbChange,
  approvedAdjustment,
  createGeneratedQuestFixture,
  fixtureTime,
  MutatingCodexExecutor,
  passingProofDependencies,
} from "./helpers/generated-quest-fixture.js";

async function readyService(fixture: Awaited<ReturnType<typeof createGeneratedQuestFixture>>, fault?: () => "before_commit" | "after_commit_before_receipt") {
  const service = new GeneratedQuestRunnerService({
    forgeHome: fixture.forgeHome,
    now: () => new Date(fixtureTime),
    randomId: () => "55555555-5555-5555-5555-555555555555",
    codexExecutor: new MutatingCodexExecutor(applyOrbChange),
    proofDependencies: passingProofDependencies,
    launchGame: async () => ({ launched: true, version: "4.7.test", message: "launched" }),
    ...(fault ? { completionFault: fault } : {}),
  });
  await service.adjust(fixture.projectId, "q1-enter-the-arena", { expectedRevision: 1, ...approvedAdjustment });
  const prepared = await service.prepare(fixture.projectId, "q1-enter-the-arena");
  await service.approve(fixture.projectId, "q1-enter-the-arena", prepared.contract.fingerprint, "APPROVE");
  await service.start(fixture.projectId, "q1-enter-the-arena");
  const ready = await service.waitForRun(fixture.projectId, "q1-enter-the-arena");
  assert.equal(ready.phase, "waiting_for_playtest");
  await service.play(fixture.projectId, "q1-enter-the-arena");
  return service;
}

test("pre-commit completion failure restores records, unstages the manifest, and retains reviewed source for rollback", async () => {
  const fixture = await createGeneratedQuestFixture();
  try {
    const service = await readyService(fixture, () => "before_commit");
    const planHead = runGit(fixture.projectPath, ["rev-parse", "HEAD"]);
    const failed = await service.confirm(fixture.projectId, "q1-enter-the-arena", "worked");
    assert.equal(failed.phase, "failed");
    assert.match(failed.error ?? "", /before commit/i);
    assert.equal(runGit(fixture.projectPath, ["rev-parse", "HEAD"]), planHead);
    assert.equal(runGit(fixture.projectPath, ["diff", "--cached", "--name-only"]), "");
    assert.deepEqual(runGit(fixture.projectPath, ["diff", "--name-only"]).split(/\r?\n/u).filter(Boolean), ["scenes/main.tscn"]);
    const quest = generatedQuestArtifactV2Schema.parse(JSON.parse(await readFile(path.join(fixture.projectPath, ".forge", "quests", "q1-enter-the-arena.json"), "utf8")) as unknown);
    assert.equal(quest.implementation, "not_enabled");
    assert.equal(failed.recovery.action, "rollback");
  } finally {
    await fixture.cleanup();
  }
});

test("receipt failure recovers the unique run commit after restart without a second commit", async () => {
  const fixture = await createGeneratedQuestFixture();
  try {
    const service = await readyService(fixture, () => "after_commit_before_receipt");
    const pending = await service.confirm(fixture.projectId, "q1-enter-the-arena", "worked");
    assert.equal(pending.phase, "completion_pending");
    assert.match(pending.error ?? "", /receipt/i);
    const commitHead = runGit(fixture.projectPath, ["rev-parse", "HEAD"]);
    const countBefore = Number(runGit(fixture.projectPath, ["rev-list", "--count", "HEAD"]));
    const fresh = new GeneratedQuestRunnerService({ forgeHome: fixture.forgeHome });
    await fresh.recoverActiveRuns();
    const restored = await fresh.getSummary(fixture.projectId, "q1-enter-the-arena");
    assert.equal(restored.run?.phase, "completed");
    assert.equal(restored.run?.receipt?.commitSha, commitHead);
    assert.equal(Number(runGit(fixture.projectPath, ["rev-list", "--count", "HEAD"])), countBefore);
  } finally {
    await fixture.cleanup();
  }
});
