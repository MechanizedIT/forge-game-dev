import assert from "node:assert/strict";
import { createWriteStream } from "node:fs";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { finished } from "node:stream/promises";
import test from "node:test";
import { ZipFile } from "yazl";

import {
  ensurePinnedGodot,
  resolveGodotInstallDirectory,
} from "../src/godot/bootstrap.js";
import {
  pinnedGodotBuild,
  pinnedGodotCacheMarker,
} from "../src/godot/pinned-build.js";
import { extractZipSafely } from "../src/godot/safe-extract.js";

async function withTemporaryRoot(run: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "forge-godot-bootstrap-test-"));
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function writeZip(
  archivePath: string,
  entries: ReadonlyArray<{ name: string; value: string }>,
): Promise<void> {
  const zip = new ZipFile();
  for (const entry of entries) {
    zip.addBuffer(Buffer.from(entry.value), entry.name);
  }
  zip.end();
  const output = createWriteStream(archivePath);
  zip.outputStream.pipe(output);
  await finished(output);
}

test("a verified versioned cache is reused without downloading", async () => {
  await withTemporaryRoot(async (forgeHome) => {
    const installDirectory = resolveGodotInstallDirectory(forgeHome);
    const executable = path.join(installDirectory, pinnedGodotBuild.executable);
    await mkdir(installDirectory, { recursive: true });
    await writeFile(executable, "controlled executable", "utf8");
    await writeFile(
      path.join(installDirectory, pinnedGodotCacheMarker),
      JSON.stringify({
        artifact: pinnedGodotBuild.artifact,
        executable: pinnedGodotBuild.executable,
        godotVersion: "4.7.stable.test",
        sha256: pinnedGodotBuild.sha256,
        version: pinnedGodotBuild.version,
      }),
      "utf8",
    );

    let downloads = 0;
    const result = await ensurePinnedGodot({
      allowDownload: true,
      downloadArchive: async () => {
        downloads += 1;
      },
      environment: { PATH: "" },
      forgeHome,
      platform: "win32",
      readVersion: () => "4.7.stable.test",
      workingDirectory: path.join(forgeHome, "empty-working-directory"),
    });

    assert.equal(result.source, "cache");
    assert.equal(result.executable, executable);
    assert.equal(downloads, 0);
  });
});

test("an absent engine requires explicit download confirmation", async () => {
  await withTemporaryRoot(async (forgeHome) => {
    let downloads = 0;
    await assert.rejects(
      ensurePinnedGodot({
        downloadArchive: async () => {
          downloads += 1;
        },
        environment: { PATH: "" },
        forgeHome,
        platform: "win32",
        readVersion: () => "4.7.stable.test",
        workingDirectory: path.join(forgeHome, "empty-working-directory"),
      }),
      /confirm-download.*84 MB/,
    );
    assert.equal(downloads, 0);
  });
});

test("a checksum mismatch blocks extraction and removes temporary files", async () => {
  await withTemporaryRoot(async (forgeHome) => {
    let extractionAttempts = 0;
    let versionAttempts = 0;

    await assert.rejects(
      ensurePinnedGodot({
        allowDownload: true,
        downloadArchive: async (_url, destination) => {
          await writeFile(destination, "not the approved Godot archive", "utf8");
        },
        environment: { PATH: "" },
        extractArchive: async () => {
          extractionAttempts += 1;
        },
        forgeHome,
        platform: "win32",
        readVersion: () => {
          versionAttempts += 1;
          return "4.7.stable.test";
        },
        workingDirectory: path.join(forgeHome, "empty-working-directory"),
      }),
      /checksum mismatch.*Refusing extraction/i,
    );

    assert.equal(extractionAttempts, 0);
    assert.equal(versionAttempts, 0);
    await assert.rejects(access(resolveGodotInstallDirectory(forgeHome)));
    const versionDirectory = path.dirname(resolveGodotInstallDirectory(forgeHome));
    const leftovers = await readdir(versionDirectory).catch(() => []);
    assert.deepEqual(leftovers, []);
  });
});

test("safe extraction writes normal entries inside its destination", async () => {
  await withTemporaryRoot(async (root) => {
    const archivePath = path.join(root, "fixture.zip");
    const destination = path.join(root, "extracted");
    await writeZip(archivePath, [
      { name: "folder/project.godot", value: "[application]" },
      { name: "Godot_v4.7-stable_win64.exe", value: "controlled executable" },
    ]);

    await extractZipSafely(archivePath, destination);

    assert.equal(
      await readFile(path.join(destination, "folder", "project.godot"), "utf8"),
      "[application]",
    );
    assert.equal(
      await readFile(path.join(destination, pinnedGodotBuild.executable), "utf8"),
      "controlled executable",
    );
  });
});

test("safe extraction rejects traversal and writes nothing outside its destination", async () => {
  await withTemporaryRoot(async (root) => {
    const archivePath = path.join(root, "traversal.zip");
    const destination = path.join(root, "extracted");
    await writeZip(archivePath, [{ name: "aa/evil.txt", value: "blocked" }]);

    const archive = await readFile(archivePath);
    const safeName = Buffer.from("aa/evil.txt");
    const unsafeName = Buffer.from("../evil.txt");
    let replacements = 0;
    for (let offset = archive.indexOf(safeName); offset >= 0; offset = archive.indexOf(safeName, offset + 1)) {
      unsafeName.copy(archive, offset);
      replacements += 1;
    }
    assert.ok(replacements >= 1);
    await writeFile(archivePath, archive);

    await assert.rejects(
      extractZipSafely(archivePath, destination),
      /(Unsafe ZIP entry path|invalid relative path)/,
    );
    await assert.rejects(access(path.join(root, "evil.txt")));
  });
});
