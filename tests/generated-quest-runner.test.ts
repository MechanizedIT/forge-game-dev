import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  chronicleV2Schema,
  generatedQuestArtifactV2Schema,
  generatedRoadmapV2Schema,
} from "../src/contracts/index.js";
import { runGit } from "../src/generated-quest-runner/boundary.js";
import {
  GeneratedQuestRunConflictError,
  GeneratedQuestRunnerService,
} from "../src/generated-quest-runner/service.js";
import { ProjectRegistryStore } from "../src/project-creation/registry.js";
import {
  applyOrbChange,
  approvedAdjustment,
  createGeneratedQuestFixture,
  fixtureTime,
  MutatingCodexExecutor,
  passingProofDependencies,
} from "./helpers/generated-quest-fixture.js";

test("one adjusted generated quest completes through contract, SDK, proof, creator play, Git, and fresh reload", async () => {
  const fixture = await createGeneratedQuestFixture();
  try {
    let launches = 0;
    const service = new GeneratedQuestRunnerService({
      forgeHome: fixture.forgeHome,
      now: () => new Date(fixtureTime),
      randomId: () => "11111111-1111-1111-1111-111111111111",
      codexExecutor: new MutatingCodexExecutor(applyOrbChange),
      proofDependencies: passingProofDependencies,
      launchGame: async () => {
        launches += 1;
        return { launched: true, version: "4.7.stable.test", message: "Visible Gravity Tap playtest launched." };
      },
    });
    const initial = await service.getSummary(fixture.projectId, "q1-enter-the-arena");
    assert.equal(initial.eligibility.eligible, false);
    assert.equal(initial.eligibility.revision, 1);
    assert.match(initial.eligibility.reason ?? "", /Adjust/i);

    await assert.rejects(
      service.adjust(fixture.projectId, "q1-enter-the-arena", {
        expectedRevision: 1,
        visibleOutcome: "Add an orb and a gravity pulse that pulls it.",
        includedScope: ["New file and interaction"],
      }),
      GeneratedQuestRunConflictError,
    );
    const adjusted = await service.adjust(fixture.projectId, "q1-enter-the-arena", {
      expectedRevision: 1,
      ...approvedAdjustment,
    });
    assert.equal(adjusted.revision, 2);
    assert.match(runGit(fixture.projectPath, ["show", "-s", "--format=%s", "HEAD"]), /^forge: adjust q1-enter-the-arena/);
    assert.equal(runGit(fixture.projectPath, ["status", "--porcelain"]), "");

    const prepared = await service.prepare(fixture.projectId, "q1-enter-the-arena");
    assert.equal(prepared.phase, "contract_review");
    assert.deepEqual(prepared.contract.allowedFiles.map((item) => item.relativePath), [
      "scenes/main.tscn",
      "scripts/objective_marker.gd",
    ]);
    assert.ok(prepared.contract.allowedFiles.every((item) => !path.isAbsolute(item.relativePath)));
    await assert.rejects(
      service.approve(fixture.projectId, "q1-enter-the-arena", "0".repeat(64), "APPROVE"),
      GeneratedQuestRunConflictError,
    );
    const approved = await service.approve(
      fixture.projectId,
      "q1-enter-the-arena",
      prepared.contract.fingerprint,
      "APPROVE",
    );
    assert.equal(approved.phase, "approved");
    await service.start(fixture.projectId, "q1-enter-the-arena");
    const verified = await service.waitForRun(fixture.projectId, "q1-enter-the-arena");
    assert.equal(verified.phase, "waiting_for_playtest");
    assert.deepEqual(verified.changedFiles, ["scenes/main.tscn"]);
    assert.equal(verified.proofs.boundary.result, "passed");
    assert.equal(verified.proofs.projectHealth.result, "passed");
    assert.equal(verified.proofs.mechanic.result, "passed");
    assert.equal(verified.proofs.creator.result, "pending");

    await service.play(fixture.projectId, "q1-enter-the-arena");
    assert.equal(launches, 1);
    const notReady = await service.confirm(fixture.projectId, "q1-enter-the-arena", "not_ready");
    assert.equal(notReady.phase, "waiting_for_playtest");
    assert.equal(notReady.proofs.creator.result, "pending");
    await service.play(fixture.projectId, "q1-enter-the-arena");
    const completed = await service.confirm(fixture.projectId, "q1-enter-the-arena", "worked");
    assert.equal(completed.phase, "completed", completed.error ?? "");
    assert.equal(completed.proofs.creator.result, "passed");
    assert.ok(completed.receipt);
    assert.equal(runGit(fixture.projectPath, ["show", "-s", "--format=%s", "HEAD"]), `forge: complete q1-enter-the-arena [run:${completed.receipt!.runId}]`);
    assert.equal(runGit(fixture.projectPath, ["status", "--porcelain"]), "");

    const quest = generatedQuestArtifactV2Schema.parse(JSON.parse(await readFile(path.join(fixture.projectPath, ".forge", "quests", "q1-enter-the-arena.json"), "utf8")) as unknown);
    assert.notEqual(quest.implementation, "not_enabled");
    assert.equal(quest.state, "completed");
    const roadmap = generatedRoadmapV2Schema.parse(JSON.parse(await readFile(path.join(fixture.projectPath, ".forge", "roadmap.json"), "utf8")) as unknown);
    assert.deepEqual(roadmap.quests.slice(0, 2).map((item) => item.state), ["completed", "available"]);
    const chronicle = chronicleV2Schema.parse(JSON.parse(await readFile(path.join(fixture.projectPath, ".forge", "chronicle.json"), "utf8")) as unknown);
    assert.equal(chronicle.entries.at(-1)?.type, "quest_completed");

    const fresh = new GeneratedQuestRunnerService({ forgeHome: fixture.forgeHome });
    const restored = await fresh.getSummary(fixture.projectId, "q1-enter-the-arena");
    assert.equal(restored.run?.phase, "completed");
    assert.equal(restored.run?.receipt?.commitSha, completed.receipt?.commitSha);
    assert.equal(restored.eligibility.eligible, false);
    assert.match(restored.eligibility.reason ?? "", /already completed/i);
    const recent = await new ProjectRegistryStore(fixture.forgeHome).listRecent();
    assert.equal(recent.find((project) => project.projectId === fixture.projectId)?.questCount, 4);
  } finally {
    await fixture.cleanup();
  }
});

test("invalid revision and dirty project state fail before any SDK invocation", async () => {
  const fixture = await createGeneratedQuestFixture();
  try {
    let starts = 0;
    const service = new GeneratedQuestRunnerService({
      forgeHome: fixture.forgeHome,
      codexExecutor: { start: async () => { starts += 1; throw new Error("must not start"); } },
    });
    await assert.rejects(service.adjust(fixture.projectId, "q1-enter-the-arena", { expectedRevision: 9, ...approvedAdjustment }), /revision changed/i);
    await readFile(path.join(fixture.projectPath, "scripts", "main.gd"), "utf8").then(async (value) => {
      const { writeFile } = await import("node:fs/promises");
      await writeFile(path.join(fixture.projectPath, "scripts", "main.gd"), `${value}\n# external dirty edit\n`, "utf8");
    });
    await assert.rejects(service.adjust(fixture.projectId, "q1-enter-the-arena", { expectedRevision: 1, ...approvedAdjustment }), /clean tracked index and worktree/i);
    assert.equal(starts, 0);
  } finally {
    await fixture.cleanup();
  }
});
