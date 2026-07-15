import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  chronicleV2Schema,
  generatedQuestArtifactV2Schema,
  generatedQuestRunJournalSchema,
  generatedRoadmapV2Schema,
} from "../src/contracts/index.js";
import { runGit } from "../src/generated-quest-runner/boundary.js";
import {
  GeneratedQuestRunConflictError,
  GeneratedQuestRunnerService,
} from "../src/generated-quest-runner/service.js";
import { ProjectRegistryStore } from "../src/project-creation/registry.js";
import { verifyRelayActivation } from "../src/godot/generated-quest-verification.js";
import { verifyGodotProjectHealth } from "../src/godot/project-health.js";
import {
  applyOrbChange,
  applyWelcomeBeaconChange,
  approvedAdjustment,
  createGeneratedQuestFixture,
  createSignalSweepFixture,
  fixtureTime,
  configureWelcomeBeaconQuest,
  MutatingCodexExecutor,
  passingProofDependencies,
} from "./helpers/generated-quest-fixture.js";

test("profile-free welcome beacon completes with approved existing and new files", async () => {
  const fixture = await createGeneratedQuestFixture();
  try {
    await configureWelcomeBeaconQuest(fixture);
    let launches = 0;
    const service = new GeneratedQuestRunnerService({
      forgeHome: fixture.forgeHome,
      now: () => new Date(fixtureTime),
      randomId: () => "66666666-6666-6666-6666-666666666666",
      codexExecutor: new MutatingCodexExecutor(applyWelcomeBeaconChange),
      proofDependencies: passingProofDependencies,
      launchGame: async () => { launches += 1; return { launched: true, version: "4.7.test", message: "Welcome beacon launched." }; },
    });
    const summary = await service.getSummary(fixture.projectId, "q1-enter-the-arena");
    assert.equal(summary.eligibility.eligible, true, summary.eligibility.reason ?? "");
    const prepared = await service.prepare(fixture.projectId, "q1-enter-the-arena");
    assert.equal(prepared.contract.schemaVersion, 2);
    assert.equal(prepared.contract.verificationProfile, null);
    assert.deepEqual(prepared.contract.allowedFiles, [
      { kind: "existing", relativePath: "scenes/main.tscn", preSha256: prepared.contract.allowedFiles[0] && "preSha256" in prepared.contract.allowedFiles[0] ? prepared.contract.allowedFiles[0].preSha256 : "" },
      { kind: "new", relativePath: "scripts/welcome_beacon.gd", encoding: "utf-8" },
    ]);
    await service.approve(fixture.projectId, "q1-enter-the-arena", prepared.contract.fingerprint, "APPROVE");
    await service.start(fixture.projectId, "q1-enter-the-arena");
    const ready = await service.waitForRun(fixture.projectId, "q1-enter-the-arena");
    assert.equal(ready.phase, "waiting_for_playtest", ready.error ?? "");
    assert.deepEqual(ready.changedFiles, ["scenes/main.tscn", "scripts/welcome_beacon.gd"]);
    assert.equal(ready.proofs.boundary.result, "passed");
    assert.equal(ready.proofs.projectHealth.result, "passed");
    assert.equal(ready.proofs.mechanic.result, "not_run");
    await service.play(fixture.projectId, "q1-enter-the-arena");
    assert.equal(launches, 1);
    const completed = await service.confirm(fixture.projectId, "q1-enter-the-arena", "worked");
    assert.equal(completed.phase, "completed", completed.error ?? "");
    assert.equal(completed.proofs.mechanic.result, "not_run");
    const committed = runGit(fixture.projectPath, ["show", "--format=", "--name-only", "HEAD"]).split(/\r?\n/u).filter(Boolean);
    assert.ok(committed.includes("scenes/main.tscn"));
    assert.ok(committed.includes("scripts/welcome_beacon.gd"));
    assert.equal(runGit(fixture.projectPath, ["status", "--porcelain"]), "");
    const fresh = new GeneratedQuestRunnerService({ forgeHome: fixture.forgeHome });
    const restored = await fresh.getSummary(fixture.projectId, "q1-enter-the-arena");
    assert.equal(restored.run?.phase, "completed");
    assert.equal(restored.run?.contract.schemaVersion, 2);
  } finally { await fixture.cleanup(); }
});

test("relay verifier owns the Godot script and exact success marker", async () => {
  let args: string[] = [];
  const result = await verifyRelayActivation({
    projectPath: path.resolve("controlled-signal-project"),
    forgeHome: path.resolve("controlled-forge-home"),
    resolveGodot: async () => ({ executable: "godot-test", version: "4.7.stable.test", source: "cache" as const }),
    run: (_executable, received) => { args = received; return { status: 0, output: "FORGE_RELAY_ACTIVATION_V1_OK count=1 role=signal_relay before=inactive after=activated" }; },
  });
  assert.equal(result.profile, "relay_activation_v1");
  assert.match(args.at(-1)!, /relay_activation_v1\.gd$/u);
  assert.deepEqual(args.slice(0, 4), ["--headless", "--path", path.resolve("controlled-signal-project"), "--script"]);
});

test("profile-free project health uses one fixed pinned-Godot launch check", async () => {
  let args: string[] = [];
  const projectPath = path.resolve("controlled-welcome-project");
  const result = await verifyGodotProjectHealth({
    projectPath,
    forgeHome: path.resolve("controlled-forge-home"),
    resolveGodot: async () => ({ executable: "godot-test", version: "4.7.stable.test", source: "cache" as const }),
    run: (_executable, received) => { args = received; return { status: 0, output: `Godot Engine v4.7.stable.test\nLoaded ${projectPath.toUpperCase().replaceAll("\\", "/")}` }; },
  });
  assert.deepEqual(args, ["--headless", "--path", projectPath, "--quit-after", "1"]);
  assert.equal(result.godotVersion, "4.7.stable.test");
  assert.doesNotMatch(result.output, /controlled-welcome-project/iu);
});

test("accepted Signal Sweep Quest 1 prepares the relay profile without adjustment or SDK execution", async () => {
  const fixture = await createSignalSweepFixture();
  try {
    const service = new GeneratedQuestRunnerService({ forgeHome: fixture.forgeHome, now: () => new Date(fixtureTime), randomId: () => "22222222-2222-2222-2222-222222222222" });
    const firstQuestId = "q1-activate-the-signal-relay";
    const summary = await service.getSummary(fixture.projectId, firstQuestId);
    assert.equal(summary.eligibility.eligible, true, summary.eligibility.reason ?? "");
    assert.equal(summary.eligibility.revision, 1);
    const prepared = await service.prepare(fixture.projectId, firstQuestId);
    assert.match(prepared.runId, /^run-q1-activate-the-signal-relay-/u);
    assert.equal(prepared.createdAt, fixtureTime);
    assert.equal(prepared.updatedAt, fixtureTime);
    assert.equal(prepared.phase, "contract_review");
    assert.equal(prepared.contract.verificationProfile, "relay_activation_v1");
    assert.deepEqual(prepared.contract.allowedFiles.map((item) => item.relativePath), ["scenes/main.tscn", "scripts/main.gd", "scripts/objective_marker.gd"]);
    assert.match(prepared.contract.creatorPlaySteps.join(" "), /signal relay/i);
    assert.match(prepared.contract.risksAndAssumptions.join(" "), /No new relay/i);
    assert.equal(runGit(fixture.projectPath, ["status", "--porcelain"]), "");

    const later = await service.getSummary(fixture.projectId, "q2-carry-the-signal-response");
    assert.equal(later.eligibility.eligible, false);
    assert.match(later.eligibility.reason ?? "", /no registered existing-file verifier/i);
  } finally { await fixture.cleanup(); }
});

test("project session listing returns every validated run in stable order and rejects malformed run directories", async () => {
  const fixture = await createSignalSweepFixture();
  try {
    let currentTime = fixtureTime;
    const runIds = [
      "11111111-1111-1111-1111-111111111111",
      "22222222-2222-2222-2222-222222222222",
    ];
    let idIndex = 0;
    const service = new GeneratedQuestRunnerService({
      forgeHome: fixture.forgeHome,
      now: () => new Date(currentTime),
      randomId: () => runIds[idIndex++]!,
    });
    const first = await service.prepare(fixture.projectId, "q1-activate-the-signal-relay");
    const cancelled = await service.cancel(fixture.projectId, "q1-activate-the-signal-relay", "CANCEL");
    assert.equal(cancelled.runId, first.runId);
    currentTime = "2026-07-14T21:00:00.000Z";
    const second = await service.prepare(fixture.projectId, "q1-activate-the-signal-relay");

    const sessions = await service.listProjectSessions(fixture.projectId);
    assert.deepEqual(sessions.map((session) => session.runId), [first.runId, second.runId]);
    assert.deepEqual(sessions.map((session) => session.phase), ["cancelled", "contract_review"]);
    assert.deepEqual(sessions.map((session) => session.createdAt), [fixtureTime, currentTime]);

    await mkdir(path.join(fixture.projectPath, ".forge", "local", "runs", "run-malformed"));
    await assert.rejects(service.listProjectSessions(fixture.projectId));
  } finally { await fixture.cleanup(); }
});

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
    assert.equal(prepared.contract.schemaVersion, 1);
    assert.equal(prepared.contract.fingerprint, "2f90b794bdea0a224ba2ef64aef7ec2275de9f18cf8e5c37579d7e7082f0b572");
    const v1JournalValue = JSON.parse(await readFile(path.join(fixture.projectPath, ".forge", "local", "runs", prepared.runId, "journal.json"), "utf8")) as Record<string, unknown>;
    assert.equal(generatedQuestRunJournalSchema.safeParse(v1JournalValue).success, true);
    assert.equal(generatedQuestRunJournalSchema.safeParse({ ...v1JournalValue, phase: "scope_review" }).success, false);
    const v1Proofs = v1JournalValue.proofs as Record<string, unknown>;
    assert.equal(generatedQuestRunJournalSchema.safeParse({ ...v1JournalValue, proofs: { ...v1Proofs, mechanic: { ...(v1Proofs.mechanic as object), result: "not_run" } } }).success, false);
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
