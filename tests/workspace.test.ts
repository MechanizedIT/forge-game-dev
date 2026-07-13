import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { baselineFixturePath } from "../src/demo/paths.js";
import { prepareDemoWorkspace, resetDemoWorkspace } from "../src/demo/workspace.js";

async function withTemporaryForgeHome(
  run: (forgeHome: string) => Promise<void>,
): Promise<void> {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "forge-workspace-test-"));
  try {
    await run(path.join(temporaryRoot, "Forge"));
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

test("prepare creates the demo workspace from the immutable fixture", async () => {
  await withTemporaryForgeHome(async (forgeHome) => {
    const result = await prepareDemoWorkspace({ forgeHome });
    const sourceProject = await readFile(path.join(baselineFixturePath, "project.godot"), "utf8");
    const copiedProject = await readFile(path.join(result.workspacePath, "project.godot"), "utf8");

    assert.equal(result.status, "created");
    assert.equal(copiedProject, sourceProject);
  });
});

test("prepare preserves an existing workspace and user changes", async () => {
  await withTemporaryForgeHome(async (forgeHome) => {
    const first = await prepareDemoWorkspace({ forgeHome });
    const marker = path.join(first.workspacePath, "user-change.txt");
    await writeFile(marker, "keep me", "utf8");

    const second = await prepareDemoWorkspace({ forgeHome });

    assert.equal(second.status, "preserved");
    assert.equal(await readFile(marker, "utf8"), "keep me");
  });
});

test("reset cancellation leaves the workspace unchanged", async () => {
  await withTemporaryForgeHome(async (forgeHome) => {
    const prepared = await prepareDemoWorkspace({ forgeHome });
    const marker = path.join(prepared.workspacePath, "user-change.txt");
    await writeFile(marker, "still here", "utf8");

    const result = await resetDemoWorkspace(false, { forgeHome });

    assert.equal(result.status, "cancelled");
    assert.equal(await readFile(marker, "utf8"), "still here");
  });
});

test("confirmed reset restores the original fixture", async () => {
  await withTemporaryForgeHome(async (forgeHome) => {
    const prepared = await prepareDemoWorkspace({ forgeHome });
    const projectFile = path.join(prepared.workspacePath, "project.godot");
    const marker = path.join(prepared.workspacePath, "user-change.txt");
    await writeFile(projectFile, "modified", "utf8");
    await writeFile(marker, "remove me", "utf8");

    const result = await resetDemoWorkspace(true, { forgeHome });
    const sourceProject = await readFile(path.join(baselineFixturePath, "project.godot"), "utf8");

    assert.equal(result.status, "reset");
    assert.equal(await readFile(projectFile, "utf8"), sourceProject);
    await assert.rejects(readFile(marker, "utf8"));
  });
});
