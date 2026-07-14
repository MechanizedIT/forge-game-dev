import { lstat, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  topDownArenaStarterManifestSchema,
  type TopDownArenaStarterManifest,
} from "../contracts/index.js";
import { repositoryRoot } from "../demo/paths.js";

export const topDownArenaStarterPath = path.join(repositoryRoot, "fixtures", "godot", "top-down-arena");

export async function loadTopDownArenaStarterManifest(
  starterPath: string = topDownArenaStarterPath,
): Promise<TopDownArenaStarterManifest> {
  const value = JSON.parse(await readFile(path.join(starterPath, "starter-manifest.json"), "utf8")) as unknown;
  return topDownArenaStarterManifestSchema.parse(value);
}

function escapeGodotString(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("\r", " ").replaceAll("\n", " ");
}

export async function assembleControlledStarter(
  destination: string,
  displayName: string,
  starterPath: string = topDownArenaStarterPath,
): Promise<TopDownArenaStarterManifest> {
  const manifest = await loadTopDownArenaStarterManifest(starterPath);
  const copied = new Set<string>();
  for (const relativeFile of manifest.files) {
    const source = path.join(starterPath, relativeFile);
    const sourceStats = await lstat(source);
    if (sourceStats.isSymbolicLink() || !sourceStats.isFile()) {
      throw new Error(`Controlled starter entry is not a regular file: ${relativeFile}`);
    }
    const target = path.join(destination, relativeFile);
    await mkdir(path.dirname(target), { recursive: true });
    let contents = await readFile(source, "utf8");
    const substitutions = manifest.substitutions.filter((item) => item.file === relativeFile);
    for (const substitution of substitutions) {
      const occurrences = contents.split(substitution.token).length - 1;
      if (occurrences !== 1) throw new Error(`Controlled starter token count is invalid: ${substitution.token}`);
      contents = contents.replace(substitution.token, escapeGodotString(displayName));
    }
    await writeFile(target, contents, { encoding: "utf8", flag: "wx" });
    copied.add(relativeFile.replaceAll("\\", "/"));
  }
  if (copied.size !== manifest.files.length) throw new Error("Controlled starter inventory did not copy exactly.");
  return manifest;
}

async function walkFiles(root: string, current = root): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const target = path.join(current, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Generated project contains an unexpected link: ${target}`);
    if (entry.isDirectory()) result.push(...await walkFiles(root, target));
    else if (entry.isFile()) result.push(path.relative(root, target).replaceAll("\\", "/"));
  }
  return result.sort();
}

export async function assertStarterInventory(
  projectPath: string,
  manifest: TopDownArenaStarterManifest,
): Promise<void> {
  const files = await walkFiles(projectPath);
  const starterFiles = files.filter((file) => !file.startsWith(".forge/"));
  if (JSON.stringify(starterFiles) !== JSON.stringify([...manifest.files].sort())) {
    throw new Error(`Controlled starter inventory changed: ${starterFiles.join(", ")}`);
  }
}
