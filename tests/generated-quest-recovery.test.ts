import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  captureControlledInventory,
  readContainedUtf8File,
  sha256,
} from "../src/generated-quest-runner/boundary.js";
import { GeneratedQuestRunConflictError, GeneratedQuestRunnerService } from "../src/generated-quest-runner/service.js";
import {
  applyOrbChange,
  approvedAdjustment,
  createGeneratedQuestFixture,
  fixtureTime,
  MutatingCodexExecutor,
} from "./helpers/generated-quest-fixture.js";

async function prepareFailedRun(service: GeneratedQuestRunnerService, projectId: string) {
  const adjusted = await service.adjust(projectId, "q1-enter-the-arena", { expectedRevision: 1, ...approvedAdjustment });
  assert.equal(adjusted.revision, 2);
  const prepared = await service.prepare(projectId, "q1-enter-the-arena");
  await service.approve(projectId, "q1-enter-the-arena", prepared.contract.fingerprint, "APPROVE");
  await service.start(projectId, "q1-enter-the-arena");
  return service.waitForRun(projectId, "q1-enter-the-arena");
}

test("controlled inventory rejects path escape and junction traversal", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "forge-generated-boundary-test-"));
  try {
    const projectPath = path.join(root, "project");
    const outsidePath = path.join(root, "outside");
    await mkdir(projectPath, { recursive: true });
    await mkdir(outsidePath, { recursive: true });
    await writeFile(path.join(outsidePath, "secret.gd"), "extends Node\n", "utf8");
    await assert.rejects(
      readContainedUtf8File(projectPath, "../outside/secret.gd"),
      /escapes the project/i,
    );
    await symlink(outsidePath, path.join(projectPath, "linked-outside"), "junction");
    await assert.rejects(
      captureControlledInventory(projectPath),
      /unsafe link/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("SDK failure offers exact rollback and restores only the reviewed preimage", async () => {
  const fixture = await createGeneratedQuestFixture();
  try {
    const scenePath = path.join(fixture.projectPath, "scenes", "main.tscn");
    const before = sha256(await readFile(scenePath));
    const service = new GeneratedQuestRunnerService({
      forgeHome: fixture.forgeHome,
      now: () => new Date(fixtureTime),
      randomId: () => "22222222-2222-2222-2222-222222222222",
      codexExecutor: new MutatingCodexExecutor(applyOrbChange, true),
    });
    const failed = await prepareFailedRun(service, fixture.projectId);
    assert.equal(failed.phase, "failed");
    assert.equal(failed.recovery.action, "rollback");
    assert.notEqual(sha256(await readFile(scenePath)), before);
    const rolledBack = await service.rollback(fixture.projectId, "q1-enter-the-arena", "ROLL BACK REVIEWED CHANGES");
    assert.equal(rolledBack.phase, "cancelled");
    assert.equal(sha256(await readFile(scenePath)), before);
  } finally {
    await fixture.cleanup();
  }
});

test("concurrent edits refuse rollback before any preimage write", async () => {
  const fixture = await createGeneratedQuestFixture();
  try {
    const scenePath = path.join(fixture.projectPath, "scenes", "main.tscn");
    const service = new GeneratedQuestRunnerService({
      forgeHome: fixture.forgeHome,
      now: () => new Date(fixtureTime),
      randomId: () => "33333333-3333-3333-3333-333333333333",
      codexExecutor: new MutatingCodexExecutor(applyOrbChange, true),
    });
    const failed = await prepareFailedRun(service, fixture.projectId);
    assert.equal(failed.recovery.action, "rollback");
    const concurrent = `${await readFile(scenePath, "utf8")}\n# creator concurrent edit\n`;
    await writeFile(scenePath, concurrent, "utf8");
    await assert.rejects(
      service.rollback(fixture.projectId, "q1-enter-the-arena", "ROLL BACK REVIEWED CHANGES"),
      GeneratedQuestRunConflictError,
    );
    assert.equal(await readFile(scenePath, "utf8"), concurrent);
    const summary = await service.getSummary(fixture.projectId, "q1-enter-the-arena");
    assert.equal(summary.run?.recovery.action, "manual");
    assert.deepEqual(summary.run?.recovery.concurrentPaths, ["scenes/main.tscn"]);
  } finally {
    await fixture.cleanup();
  }
});

test("an untracked new file fails closed and is never automatically deleted", async () => {
  const fixture = await createGeneratedQuestFixture();
  try {
    const evilPath = path.join(fixture.projectPath, "scripts", "unexpected.gd");
    const service = new GeneratedQuestRunnerService({
      forgeHome: fixture.forgeHome,
      now: () => new Date(fixtureTime),
      randomId: () => "44444444-4444-4444-4444-444444444444",
      codexExecutor: new MutatingCodexExecutor(async () => writeFile(evilPath, "extends Node\n", "utf8")),
    });
    const failed = await prepareFailedRun(service, fixture.projectId);
    assert.equal(failed.phase, "failed");
    assert.equal(failed.recovery.action, "manual");
    assert.equal(failed.actions.rollback, false);
    assert.equal(await readFile(evilPath, "utf8"), "extends Node\n");
  } finally {
    await fixture.cleanup();
  }
});
