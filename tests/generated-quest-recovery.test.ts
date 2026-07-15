import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  captureControlledInventory,
  readContainedUtf8File,
  sha256,
  validateExpectedAbsentWorkFile,
} from "../src/generated-quest-runner/boundary.js";
import { GeneratedQuestRunConflictError, GeneratedQuestRunnerService } from "../src/generated-quest-runner/service.js";
import {
  applyOrbChange,
  applyWelcomeBeaconChange,
  approvedAdjustment,
  createGeneratedQuestFixture,
  configureWelcomeBeaconQuest,
  fixtureTime,
  MutatingCodexExecutor,
} from "./helpers/generated-quest-fixture.js";

test("profile-free rollback restores the scene and deletes only the unchanged approved new file", async () => {
  const fixture = await createGeneratedQuestFixture();
  try {
    await configureWelcomeBeaconQuest(fixture);
    const scenePath = path.join(fixture.projectPath, "scenes", "main.tscn");
    const scriptPath = path.join(fixture.projectPath, "scripts", "welcome_beacon.gd");
    const before = sha256(await readFile(scenePath));
    const service = new GeneratedQuestRunnerService({
      forgeHome: fixture.forgeHome,
      now: () => new Date(fixtureTime),
      randomId: () => "77777777-7777-7777-7777-777777777777",
      codexExecutor: new MutatingCodexExecutor(applyWelcomeBeaconChange, true),
    });
    const prepared = await service.prepare(fixture.projectId, "q1-enter-the-arena");
    await service.approve(fixture.projectId, "q1-enter-the-arena", prepared.contract.fingerprint, "APPROVE");
    await service.start(fixture.projectId, "q1-enter-the-arena");
    const failed = await service.waitForRun(fixture.projectId, "q1-enter-the-arena");
    assert.equal(failed.recovery.action, "rollback");
    const rolledBack = await service.rollback(fixture.projectId, "q1-enter-the-arena", "ROLL BACK REVIEWED CHANGES");
    assert.equal(rolledBack.phase, "cancelled");
    assert.equal(sha256(await readFile(scenePath)), before);
    await assert.rejects(readFile(scriptPath), /ENOENT/u);
  } finally { await fixture.cleanup(); }
});

test("a strict scope request pauses without expanding authority", async () => {
  const fixture = await createGeneratedQuestFixture();
  try {
    await configureWelcomeBeaconQuest(fixture);
    const marker = 'FORGE_SCOPE_REQUEST {"paths":["scripts/beacon_label.gd"],"reason":"The beacon label needs its own small script."}';
    const service = new GeneratedQuestRunnerService({
      forgeHome: fixture.forgeHome,
      now: () => new Date(fixtureTime),
      randomId: () => "88888888-8888-8888-8888-888888888888",
      codexExecutor: new MutatingCodexExecutor(async () => {}, false, marker),
    });
    const prepared = await service.prepare(fixture.projectId, "q1-enter-the-arena");
    await service.approve(fixture.projectId, "q1-enter-the-arena", prepared.contract.fingerprint, "APPROVE");
    await service.start(fixture.projectId, "q1-enter-the-arena");
    const paused = await service.waitForRun(fixture.projectId, "q1-enter-the-arena");
    assert.equal(paused.phase, "scope_review");
    assert.deepEqual(paused.scopeRequest?.paths, ["scripts/beacon_label.gd"]);
    assert.deepEqual(paused.contract.allowedFiles.map((file) => file.relativePath), ["scenes/main.tscn", "scripts/welcome_beacon.gd"]);
    assert.deepEqual(paused.changedFiles, []);
    const cancelled = await service.cancel(fixture.projectId, "q1-enter-the-arena", "CANCEL");
    assert.equal(cancelled.phase, "cancelled");
  } finally { await fixture.cleanup(); }
});

test("a scope request after approved edits keeps the lock and offers exact rollback", async () => {
  const fixture = await createGeneratedQuestFixture();
  try {
    await configureWelcomeBeaconQuest(fixture);
    const scenePath = path.join(fixture.projectPath, "scenes", "main.tscn");
    const scriptPath = path.join(fixture.projectPath, "scripts", "welcome_beacon.gd");
    const before = sha256(await readFile(scenePath));
    const marker = 'FORGE_SCOPE_REQUEST {"paths":["scripts/beacon_label.gd"],"reason":"A separate label script would improve the result."}';
    const service = new GeneratedQuestRunnerService({
      forgeHome: fixture.forgeHome,
      now: () => new Date(fixtureTime),
      randomId: () => "99999999-9999-9999-9999-999999999999",
      codexExecutor: new MutatingCodexExecutor(applyWelcomeBeaconChange, false, marker),
    });
    const prepared = await service.prepare(fixture.projectId, "q1-enter-the-arena");
    await service.approve(fixture.projectId, "q1-enter-the-arena", prepared.contract.fingerprint, "APPROVE");
    await service.start(fixture.projectId, "q1-enter-the-arena");
    const paused = await service.waitForRun(fixture.projectId, "q1-enter-the-arena");
    assert.equal(paused.phase, "scope_review");
    assert.equal(paused.recovery.action, "rollback");
    assert.deepEqual(paused.changedFiles, ["scenes/main.tscn", "scripts/welcome_beacon.gd"]);
    const rolledBack = await service.rollback(fixture.projectId, "q1-enter-the-arena", "ROLL BACK REVIEWED CHANGES");
    assert.equal(rolledBack.phase, "cancelled");
    assert.equal(sha256(await readFile(scenePath)), before);
    await assert.rejects(readFile(scriptPath), /ENOENT/u);
  } finally { await fixture.cleanup(); }
});

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
    await mkdir(path.join(projectPath, "scripts"));
    await validateExpectedAbsentWorkFile(projectPath, "scripts/new_script.gd");
    await writeFile(path.join(projectPath, "scripts", "already.gd"), "extends Node\n", "utf8");
    await assert.rejects(validateExpectedAbsentWorkFile(projectPath, "scripts/already.gd"), /already exists/i);
    await assert.rejects(validateExpectedAbsentWorkFile(projectPath, ".forge/new.gd"), /protected/i);
    await assert.rejects(validateExpectedAbsentWorkFile(projectPath, "scripts/verification.gd"), /verifier code/i);
    await assert.rejects(validateExpectedAbsentWorkFile(projectPath, "scripts/new.txt"), /supported Godot text/i);
    await assert.rejects(validateExpectedAbsentWorkFile(projectPath, "missing/new.gd"), /missing or unsafe parent/i);
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
