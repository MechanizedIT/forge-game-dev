import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, realpath, rm, stat, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { AddressInfo } from "node:net";

import {
  creationProvenanceSchema,
  gameBlueprintSchema,
  generatedProjectManifestSchema,
  gitBaselineResultSchema,
  godotVerificationResultSchema,
  projectRegistrySchema,
  roadmapSchema,
  type GameBlueprint,
} from "../src/contracts/index.js";
import { fingerprintBlueprint } from "../src/blueprint-planner/service.js";
import type { BlueprintPlanningService } from "../src/blueprint-planner/service.js";
import { createForgeDashboardServer } from "../src/dashboard-host/server.js";
import type { ForgeDashboardService } from "../src/dashboard-host/service.js";
import {
  assertNoAbsolutePathsInPortableArtifacts,
  expectedBaselineFiles,
} from "../src/project-creation/artifacts.js";
import {
  prepareProjectRoots,
  safeRemoveOwnedDirectory,
  sanitizeProjectSlug,
} from "../src/project-creation/filesystem.js";
import {
  createGitBaselineCreator,
  requireCleanGeneratedProjectGit,
} from "../src/project-creation/git-baseline.js";
import { createTopDownArenaVerifier } from "../src/project-creation/godot-verifier.js";
import { ProjectRegistryStore } from "../src/project-creation/registry.js";
import {
  ProjectCreationConflictError,
  ProjectCreationService,
} from "../src/project-creation/service.js";
import type {
  ApprovedBlueprintEnvelope,
  ProjectCreationSnapshot,
  ProjectCreationStage,
} from "../src/project-creation/shared.js";

const fixedTime = "2026-07-14T18:00:00.000Z";

function validBlueprint(overrides: Partial<GameBlueprint> = {}): GameBlueprint {
  return gameBlueprintSchema.parse({
    projectName: "Pulse Arena",
    vision: "A compact arena about reclaiming space with a kinetic pulse.",
    foundation: "top_down_arena",
    inputMode: "keyboard",
    coreAction: "Move through the arena and push nearby enemies away.",
    funTarget: "Create breathing room at the last possible moment.",
    smallestPlayableResult: "One player can move inside one bounded arena and reach a visible relay marker.",
    firstPlayableMilestone: "The player can move around a bounded arena and reach a clear objective marker.",
    quests: [
      { reference: "Q1", title: "Build the Arena", visibleOutcome: "A bounded arena and player are visible.", dependencies: [] },
      { reference: "Q2", title: "Tune Movement", visibleOutcome: "Movement feels responsive in four directions.", dependencies: ["Q1"] },
      { reference: "Q3", title: "Add the Pulse", visibleOutcome: "A pulse creates visible space around the player.", dependencies: ["Q2"] },
    ],
    includedScope: ["One arena", "Keyboard movement", "One visible objective"],
    excludedScope: ["External art", "Online services", "Generated quest implementation"],
    acceptanceCriteria: [
      { reference: "AC-1", questReference: "Q1", criterion: "The bounded arena and player appear.", verificationReferences: ["V-1"] },
      { reference: "AC-2", questReference: "Q2", criterion: "WASD and arrow keys move the player.", verificationReferences: ["V-2"] },
      { reference: "AC-3", questReference: "Q3", criterion: "The planned pulse outcome is documented.", verificationReferences: ["V-3"] },
    ],
    verificationIdeas: [
      { reference: "V-1", questReference: "Q1", idea: "Load the main scene and inspect required nodes." },
      { reference: "V-2", questReference: "Q2", idea: "Exercise arrow and WASD movement in Godot." },
      { reference: "V-3", questReference: "Q3", idea: "Review the bounded quest record before implementation." },
    ],
    projectDocumentationSummary: "Pulse Arena begins as a controlled movement arena with a visible objective.",
    initialChronicleSummary: "Forge created the verified Top-down Arena foundation and saved its first roadmap.",
    ...overrides,
  });
}

function envelope(blueprint = validBlueprint()): ApprovedBlueprintEnvelope {
  return {
    blueprint,
    blueprintSha256: fingerprintBlueprint(blueprint),
    approvedAt: fixedTime,
    provenance: {
      model: "gpt-5.6",
      reasoningEffort: "high",
      sandbox: "read-only",
      network: "disabled",
      threadId: "safe-thread-123456789",
      attempts: 1,
      latencyMs: 1200,
      usage: { inputTokens: 10, cachedInputTokens: 0, outputTokens: 5, reasoningOutputTokens: 1 },
    },
  };
}

function idQueue(...values: string[]): () => string {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)]!;
}

function mockGodot(fail = false) {
  return async ({ projectId, verifiedAt }: { projectId: string; verifiedAt: string }) => {
    if (fail) throw new Error("controlled Godot verification failure");
    return godotVerificationResultSchema.parse({
      schemaVersion: 1,
      projectId,
      status: "passed",
      godotVersion: "4.7.stable.test",
      arguments: ["--headless", "--path", ".", "--script", "res://scripts/verify_project.gd"],
      successMarker: "FORGE_TOP_DOWN_ARENA_VERIFY_OK",
      output: "FORGE_TOP_DOWN_ARENA_VERIFY_OK main=pass player=pass input=pass movement=pass objective=pass scripts=pass external=none",
      verifiedAt,
    });
  };
}

function mockGit(fail = false) {
  return async ({ projectId, expectedFiles, committedAt }: { projectId: string; expectedFiles: string[]; committedAt: string }) => {
    if (fail) throw new Error("controlled Git baseline failure");
    assert.ok(expectedFiles.includes("project.godot"));
    assert.ok(expectedFiles.includes(".forge/project-manifest.json"));
    return gitBaselineResultSchema.parse({
      schemaVersion: 1,
      projectId,
      status: "passed",
      commitSha: "a".repeat(40),
      commitMessage: "Forge project baseline",
      cleanWorktree: true,
      remoteCount: 0,
      committedAt,
    });
  };
}

async function withRoot(run: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "forge-project-creation-test-"));
  try { await run(root); } finally { await rm(root, { recursive: true, force: true }); }
}

function createService(forgeHome: string, overrides: ConstructorParameters<typeof ProjectCreationService>[0] = {}) {
  return new ProjectCreationService({
    forgeHome,
    now: () => new Date(fixedTime),
    randomId: idQueue("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "cccccccc-cccc-cccc-cccc-cccccccccccc"),
    verifyGodot: mockGodot(),
    createGitBaseline: mockGit(),
    requireCleanGit: () => {},
    ...overrides,
  });
}

test("a validated approved blueprint creates the controlled project tree and round-trips artifacts", async () => {
  await withRoot(async (root) => {
    const forgeHome = path.join(root, "Forge");
    const service = createService(forgeHome);
    const stages: ProjectCreationStage[] = [];
    service.subscribe(() => { const stage = service.getSnapshot().stage; if (stage && !stages.includes(stage)) stages.push(stage); });
    service.beginCreation(envelope());
    await service.waitForIdle();
    const snapshot = service.getSnapshot();
    assert.equal(snapshot.phase, "created", snapshot.error ?? "");
    assert.equal(snapshot.createdProject?.questCount, 3);
    assert.deepEqual(stages, [
      "Validating the blueprint", "Preparing the workspace", "Assembling the starter",
      "Writing project records", "Checking the Godot project", "Creating the baseline", "Registering the project",
    ]);
    const projectPath = snapshot.createdProject!.projectLocation;
    assert.ok((await stat(path.join(projectPath, "project.godot"))).isFile());
    assert.ok((await stat(path.join(projectPath, "scenes", "main.tscn"))).isFile());
    generatedProjectManifestSchema.parse(JSON.parse(await readFile(path.join(projectPath, ".forge", "project-manifest.json"), "utf8")) as unknown);
    const roadmap = roadmapSchema.parse(JSON.parse(await readFile(path.join(projectPath, ".forge", "roadmap.json"), "utf8")) as unknown);
    assert.deepEqual(roadmap.quests.map((quest) => quest.state), ["available", "locked", "locked"]);
    creationProvenanceSchema.parse(JSON.parse(await readFile(path.join(projectPath, ".forge", "local", "creation-provenance.json"), "utf8")) as unknown);
    await assertNoAbsolutePathsInPortableArtifacts(projectPath, forgeHome);
    const registry = projectRegistrySchema.parse(JSON.parse(await readFile(path.join(forgeHome, "project-registry.json"), "utf8")) as unknown);
    assert.equal(registry.projects[0]?.projectId, snapshot.projectId);
    assert.deepEqual(await readdir(path.join(forgeHome, "projects", ".staging")), []);
  });
});

test("stale blueprints fail before project allocation and never register", async () => {
  await withRoot(async (root) => {
    const approved = envelope();
    approved.blueprint = validBlueprint({ vision: "This changed after approval and must be rejected." });
    const service = createService(path.join(root, "Forge"));
    service.beginCreation(approved);
    await service.waitForIdle();
    assert.equal(service.getSnapshot().phase, "failed");
    assert.match(service.getSnapshot().error ?? "", /changed after creator approval/i);
    assert.equal((await service.listRecentProjects()).length, 0);
  });
});

test("project slugs safely handle reserved names, invalid characters, traversal, and excessive length", () => {
  assert.equal(sanitizeProjectSlug("CON"), "forge-con");
  assert.equal(sanitizeProjectSlug("..\\..\\Arena: *?"), "arena");
  assert.equal(sanitizeProjectSlug("A".repeat(200)).length, 32);
  assert.equal(sanitizeProjectSlug(". . ."), "game");
});

test("an occupied server-owned destination is never overwritten", async () => {
  await withRoot(async (root) => {
    const forgeHome = path.join(root, "Forge");
    const roots = await prepareProjectRoots(forgeHome);
    const occupied = path.join(roots.projectsRoot, "pulse-arena-bbbbbbbbbb");
    await mkdir(occupied);
    await writeFile(path.join(occupied, "keep.txt"), "unrelated", "utf8");
    const service = createService(forgeHome, {
      randomId: idQueue("aaaaaaaaaaaaaaaa", "bbbbbbbbbbbbbbbb"),
    });
    service.beginCreation(envelope());
    await service.waitForIdle();
    assert.equal(service.getSnapshot().phase, "failed");
    assert.equal(await readFile(path.join(occupied, "keep.txt"), "utf8"), "unrelated");
  });
});

test("duplicate and concurrent creation requests are rejected", async () => {
  await withRoot(async (root) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const service = createService(path.join(root, "Forge"), {
      verifyGodot: async (options) => { await gate; return mockGodot()(options); },
    });
    service.beginCreation(envelope());
    assert.throws(() => service.beginCreation(envelope()), ProjectCreationConflictError);
    release();
    await service.waitForIdle();
    assert.throws(() => service.beginCreation(envelope()), ProjectCreationConflictError);

    const restarted = createService(path.join(root, "Forge"));
    restarted.beginCreation(envelope());
    await restarted.waitForIdle();
    assert.equal(restarted.getSnapshot().phase, "failed");
    assert.match(restarted.getSnapshot().error ?? "", /already created project/i);
  });
});

test("Godot and Git failures roll back staging and never write the registry", async () => {
  for (const failure of ["godot", "git"] as const) {
    await withRoot(async (root) => {
      const forgeHome = path.join(root, "Forge");
      const service = createService(forgeHome, {
        verifyGodot: mockGodot(failure === "godot"),
        createGitBaseline: mockGit(failure === "git"),
      });
      service.beginCreation(envelope());
      await service.waitForIdle();
      assert.equal(service.getSnapshot().phase, "failed");
      assert.equal((await service.listRecentProjects()).length, 0);
      assert.deepEqual(await readdir(path.join(forgeHome, "projects", ".staging")), []);
      assert.ok(service.getSnapshot().failureEvidence);
    });
  }
});

test("cancellation before promotion uses the same safe cleanup path", async () => {
  await withRoot(async (root) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const forgeHome = path.join(root, "Forge");
    const service = createService(forgeHome, {
      verifyGodot: async (options) => { await gate; return mockGodot()(options); },
    });
    service.beginCreation(envelope());
    while (service.getSnapshot().stage !== "Checking the Godot project") await new Promise((resolve) => setTimeout(resolve, 1));
    service.cancelCreation();
    release();
    await service.waitForIdle();
    assert.equal(service.getSnapshot().phase, "failed");
    assert.match(service.getSnapshot().error ?? "", /cancelled before promotion/i);
    assert.deepEqual(await readdir(path.join(forgeHome, "projects", ".staging")), []);

    const finishing = createService(path.join(root, "FinishingForge"));
    let lateCancellation: unknown;
    const unsubscribe = finishing.subscribe(() => {
      if (finishing.getSnapshot().stage !== "Registering the project" || lateCancellation) return;
      try {
        finishing.cancelCreation();
      } catch (error) {
        lateCancellation = error;
      }
    });
    finishing.beginCreation(envelope());
    await finishing.waitForIdle();
    unsubscribe();
    assert.ok(lateCancellation instanceof ProjectCreationConflictError);
    assert.match((lateCancellation as Error).message, /can no longer be cancelled safely/i);
    assert.equal(finishing.getSnapshot().phase, "created");
  });
});

test("cleanup refuses unowned and out-of-root directories", async () => {
  await withRoot(async (root) => {
    const ownedRoot = path.join(root, "owned");
    const unowned = path.join(ownedRoot, "unowned");
    const outside = path.join(root, "outside");
    await mkdir(unowned, { recursive: true });
    await mkdir(outside);
    await assert.rejects(safeRemoveOwnedDirectory(ownedRoot, unowned, new Set()), /unowned path/i);
    await assert.rejects(safeRemoveOwnedDirectory(ownedRoot, outside, new Set([outside])), /out-of-root/i);
    assert.ok((await stat(unowned)).isDirectory());
    assert.ok((await stat(outside)).isDirectory());
  });
});

test("project roots reject a symlink or junction escape where supported", async (context) => {
  await withRoot(async (root) => {
    const forgeHome = path.join(root, "Forge");
    const outside = path.join(root, "outside");
    await mkdir(forgeHome);
    await mkdir(outside);
    try {
      await symlink(outside, path.join(forgeHome, "projects"), process.platform === "win32" ? "junction" : "dir");
    } catch (error) {
      context.skip(`Links are unavailable in this environment: ${String(error)}`);
      return;
    }
    await assert.rejects(prepareProjectRoots(forgeHome), /link or junction/i);
  });
});

test("the registry reloads, reports missing projects, and recovers malformed JSON without deleting projects", async () => {
  await withRoot(async (root) => {
    const forgeHome = path.join(root, "Forge");
    await mkdir(forgeHome);
    const projectPath = path.join(root, "project");
    await mkdir(projectPath);
    await writeFile(path.join(projectPath, "project.godot"), "config_version=5\n", "utf8");
    const canonicalPath = await realpath(projectPath);
    await writeFile(path.join(forgeHome, "project-registry.json"), "{malformed", "utf8");
    const store = new ProjectRegistryStore(forgeHome, () => new Date(fixedTime));
    assert.equal((await store.listRecent()).length, 0);
    assert.ok((await stat(projectPath)).isDirectory());
    await store.add({
      projectId: "pulse-arena-12345678", displayName: "Pulse Arena", canonicalPath,
      foundation: "top_down_arena", createdAt: fixedTime, lastOpenedAt: fixedTime,
      creationState: "created", starterVersion: "1.0.0",
    });
    assert.equal((await new ProjectRegistryStore(forgeHome).listRecent())[0]?.available, true);
    await rm(path.join(projectPath, "project.godot"));
    assert.equal((await store.listRecent())[0]?.stateLabel, "Missing locally · registry entry preserved");
    assert.ok((await readdir(forgeHome)).some((name) => name.startsWith("project-registry.malformed-")));
  });
});

test("the fixed Godot verifier owns arguments and sanitizes the real staging path", async () => {
  await withRoot(async (root) => {
    const captured: Array<{ args: string[]; cwd: string }> = [];
    const verifier = createTopDownArenaVerifier(
      ({ args, cwd }) => {
        captured.push({ args, cwd });
        return { status: 0, output: `${cwd}\nFORGE_TOP_DOWN_ARENA_VERIFY_OK main=pass external=none` };
      },
      async () => ({ executable: path.join(root, "Godot.exe"), source: "cache", version: "4.7.stable.test" }),
    );
    const result = await verifier({ projectPath: root, projectId: "pulse-arena-12345678", forgeHome: root, verifiedAt: fixedTime });
    assert.deepEqual(captured[0]?.args, ["--headless", "--path", path.resolve(root), "--script", "res://scripts/verify_project.gd"]);
    assert.equal(captured[0]?.cwd, root);
    assert.doesNotMatch(result.output, new RegExp(root.replaceAll("\\", "\\\\"), "iu"));
    assert.deepEqual(result.arguments, ["--headless", "--path", ".", "--script", "res://scripts/verify_project.gd"]);
  });
});

test("the real local Git baseline commits only expected files, has no remote, and remains clean with local Forge records", async () => {
  await withRoot(async (root) => {
    await writeFile(path.join(root, ".gitignore"), ".forge/local/\n.godot/\n", "utf8");
    await writeFile(path.join(root, "project.godot"), "config_version=5\n", "utf8");
    const expected = await expectedBaselineFiles(root);
    const result = await createGitBaselineCreator()({ projectPath: root, projectId: "pulse-arena-12345678", expectedFiles: expected, committedAt: fixedTime });
    assert.equal(result.cleanWorktree, true);
    await mkdir(path.join(root, ".forge", "local"), { recursive: true });
    await writeFile(path.join(root, ".forge", "local", "git-baseline.json"), JSON.stringify(result), "utf8");
    requireCleanGeneratedProjectGit(root);
  });
});

test("generated-project creation remains isolated from the sample workspace", async () => {
  await withRoot(async (root) => {
    const forgeHome = path.join(root, "Forge");
    const sample = path.join(forgeHome, "demo-workspace", "keep.txt");
    await mkdir(path.dirname(sample), { recursive: true });
    await writeFile(sample, "sample untouched", "utf8");
    const service = createService(forgeHome);
    service.beginCreation(envelope());
    await service.waitForIdle();
    assert.equal(service.getSnapshot().phase, "created");
    assert.equal(await readFile(sample, "utf8"), "sample untouched");
  });
});

test("the creation endpoint requires same-origin, exact confirmation, and a one-time per-launch nonce before starting writes", async () => {
  await withRoot(async (root) => {
    let starts = 0;
    const creationSnapshot: ProjectCreationSnapshot = {
      phase: "idle", stage: null, completedStages: [], startedAt: null, displayName: null,
      foundation: null, projectId: null, relativeProjectIdentifier: null, questCount: null,
      explanation: null, createdProject: null, error: null, failureEvidence: null,
    };
    const creationStub = {
      getSnapshot: () => creationSnapshot,
      listRecentProjects: async () => [],
      beginCreation: () => { starts += 1; },
      subscribe: () => () => {},
    } as unknown as ProjectCreationService;
    const planningStub = {
      getApprovedBlueprint: () => envelope(),
    } as unknown as BlueprintPlanningService;
    const server = createForgeDashboardServer(
      {} as ForgeDashboardService,
      root,
      planningStub,
      creationStub,
    );
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const address = server.address() as AddressInfo;
      const base = `http://127.0.0.1:${address.port}`;
      const initial = await (await fetch(`${base}/api/projects/state`)).json() as { mutationToken: string };
      const missingOrigin = await fetch(`${base}/api/projects/create`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-forge-mutation-token": initial.mutationToken },
        body: JSON.stringify({ confirmation: "CONFIRM CREATE" }),
      });
      assert.equal(missingOrigin.status, 400);
      assert.equal(starts, 0);

      const invalidConfirmation = await fetch(`${base}/api/projects/create`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: base, "x-forge-mutation-token": initial.mutationToken },
        body: JSON.stringify({ confirmation: "CREATE" }),
      });
      assert.equal(invalidConfirmation.status, 400);
      assert.equal(starts, 0);

      const refreshed = await (await fetch(`${base}/api/projects/state`)).json() as { mutationToken: string };
      assert.notEqual(refreshed.mutationToken, initial.mutationToken);
      const accepted = await fetch(`${base}/api/projects/create`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: base, "x-forge-mutation-token": refreshed.mutationToken },
        body: JSON.stringify({ confirmation: "CONFIRM CREATE" }),
      });
      assert.equal(accepted.status, 202);
      assert.equal(starts, 1);

      const replay = await fetch(`${base}/api/projects/create`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: base, "x-forge-mutation-token": refreshed.mutationToken },
        body: JSON.stringify({ confirmation: "CONFIRM CREATE" }),
      });
      assert.equal(replay.status, 400);
      assert.equal(starts, 1);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
