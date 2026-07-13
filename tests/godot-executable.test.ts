import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { findGodotExecutable } from "../src/godot/find-executable.js";

test("GODOT_BIN selects an explicit local executable", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "forge-godot-bin-test-"));
  try {
    const executable = path.join(temporaryRoot, "Godot_v4.7-stable_win64.exe");
    await writeFile(executable, "test", "utf8");

    const found = await findGodotExecutable({
      environment: { GODOT_BIN: executable, PATH: "" },
      platform: "win32",
      workingDirectory: temporaryRoot,
    });

    assert.equal(found, executable);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("PATH lookup finds a supported Godot executable name", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "forge-godot-path-test-"));
  try {
    const executable = path.join(temporaryRoot, "godot.exe");
    await writeFile(executable, "test", "utf8");

    const found = await findGodotExecutable({
      environment: { PATH: temporaryRoot },
      platform: "win32",
      workingDirectory: path.join(temporaryRoot, "project"),
    });

    assert.equal(found, executable);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("an invalid GODOT_BIN fails with a useful message", async () => {
  await assert.rejects(
    findGodotExecutable({
      environment: { GODOT_BIN: "missing-godot.exe", PATH: "" },
      platform: "win32",
      workingDirectory: process.cwd(),
    }),
    /GODOT_BIN does not point to a readable executable/,
  );
});
