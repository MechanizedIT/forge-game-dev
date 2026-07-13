import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { resolveForgeHome } from "../demo/paths.js";
import { findGodotExecutable } from "./find-executable.js";
import {
  isApprovedGodotVersion,
  pinnedGodotBuild,
  pinnedGodotCacheMarker,
} from "./pinned-build.js";
import { readGodotVersion } from "./process.js";
import { extractZipSafely } from "./safe-extract.js";

interface CacheMarker {
  artifact: string;
  executable: string;
  godotVersion: string;
  sha256: string;
  version: string;
}

export interface GodotBootstrapResult {
  executable: string;
  source: "cache" | "download" | "override" | "detected";
  version: string;
}

export type DownloadArchive = (url: string, destination: string) => Promise<void>;
export type ReadVersion = (executable: string) => string;
export type ExtractArchive = (archivePath: string, destination: string) => Promise<void>;

export interface GodotBootstrapOptions {
  allowDownload?: boolean;
  downloadArchive?: DownloadArchive;
  environment?: NodeJS.ProcessEnv;
  extractArchive?: ExtractArchive;
  forgeHome?: string;
  platform?: NodeJS.Platform;
  readVersion?: ReadVersion;
  workingDirectory?: string;
}

export function resolveGodotInstallDirectory(forgeHome: string): string {
  return path.join(
    path.resolve(forgeHome),
    "tools",
    "godot",
    pinnedGodotBuild.version,
    `${pinnedGodotBuild.platform}-${pinnedGodotBuild.architecture}`,
  );
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk as Buffer);
  }
  return hash.digest("hex");
}

function assertApprovedVersion(executable: string, readVersion: ReadVersion): string {
  const version = readVersion(executable);
  if (!isApprovedGodotVersion(version)) {
    throw new Error(`Forge requires Godot 4.7; ${executable} reports ${version || "unknown"}`);
  }
  return version;
}

async function readVerifiedCache(
  installDirectory: string,
  readVersion: ReadVersion,
): Promise<GodotBootstrapResult | null> {
  const markerPath = path.join(installDirectory, pinnedGodotCacheMarker);
  const marker = await readFile(markerPath, "utf8")
    .then((value) => JSON.parse(value) as Partial<CacheMarker>)
    .catch(() => null);

  if (
    marker?.artifact !== pinnedGodotBuild.artifact ||
    marker.executable !== pinnedGodotBuild.executable ||
    marker.sha256 !== pinnedGodotBuild.sha256 ||
    marker.version !== pinnedGodotBuild.version
  ) {
    return null;
  }

  const executable = path.join(installDirectory, pinnedGodotBuild.executable);
  if (!(await pathExists(executable))) {
    return null;
  }

  try {
    const version = assertApprovedVersion(executable, readVersion);
    return { executable, source: "cache", version };
  } catch {
    return null;
  }
}

export async function downloadOfficialArchive(url: string, destination: string): Promise<void> {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok || !response.body) {
    throw new Error(`Godot download failed (${response.status} ${response.statusText})`);
  }

  const file = await open(destination, "wx");
  try {
    for await (const chunk of response.body) {
      await file.write(chunk);
    }
  } finally {
    await file.close();
  }
}

async function detectExistingGodot(
  options: GodotBootstrapOptions,
  readVersion: ReadVersion,
): Promise<GodotBootstrapResult | null> {
  const environment = options.environment ?? process.env;
  try {
    const executable = await findGodotExecutable({
      environment,
      platform: options.platform ?? process.platform,
      ...(options.workingDirectory === undefined
        ? {}
        : { workingDirectory: options.workingDirectory }),
    });
    const version = assertApprovedVersion(executable, readVersion);
    return {
      executable,
      source: environment.GODOT_BIN?.trim() ? "override" : "detected",
      version,
    };
  } catch (error) {
    if (environment.GODOT_BIN?.trim()) {
      throw error;
    }
    return null;
  }
}

export async function ensurePinnedGodot(
  options: GodotBootstrapOptions = {},
): Promise<GodotBootstrapResult> {
  const environment = options.environment ?? process.env;
  const platform = options.platform ?? process.platform;
  if (platform !== "win32") {
    throw new Error("The Forge Build Week bootstrap supports Windows x86_64 only.");
  }

  const readVersion = options.readVersion ?? readGodotVersion;
  if (environment.GODOT_BIN?.trim()) {
    const overridden = await detectExistingGodot(options, readVersion);
    if (!overridden) throw new Error("GODOT_BIN could not be resolved.");
    return overridden;
  }

  const forgeHome = path.resolve(options.forgeHome ?? resolveForgeHome(environment));
  const installDirectory = resolveGodotInstallDirectory(forgeHome);
  const cached = await readVerifiedCache(installDirectory, readVersion);
  if (cached) return cached;

  const detected = await detectExistingGodot(options, readVersion);
  if (detected) return detected;

  if (!options.allowDownload) {
    throw new Error(
      `Godot 4.7 is not available. Re-run with confirm-download to download the pinned ${Math.round(pinnedGodotBuild.archiveBytes / 1_000_000)} MB portable build, or set GODOT_BIN.`,
    );
  }

  const toolsDirectory = path.dirname(installDirectory);
  await mkdir(toolsDirectory, { recursive: true });
  const suffix = `${process.pid}-${randomUUID()}`;
  const archivePath = path.join(toolsDirectory, `${pinnedGodotBuild.artifact}.${suffix}.tmp`);
  const extractionPath = `${installDirectory}.extracting-${suffix}`;
  const downloadArchive = options.downloadArchive ?? downloadOfficialArchive;
  const extractArchive = options.extractArchive ?? extractZipSafely;

  try {
    await downloadArchive(pinnedGodotBuild.downloadUrl, archivePath);
    const actualSha256 = await sha256File(archivePath);
    if (actualSha256 !== pinnedGodotBuild.sha256) {
      throw new Error(
        `Godot archive checksum mismatch: expected ${pinnedGodotBuild.sha256}, received ${actualSha256}. Refusing extraction.`,
      );
    }

    await extractArchive(archivePath, extractionPath);
    const executable = path.join(extractionPath, pinnedGodotBuild.executable);
    if (!(await pathExists(executable))) {
      throw new Error(`Verified Godot archive is missing ${pinnedGodotBuild.executable}`);
    }
    const version = assertApprovedVersion(executable, readVersion);
    const marker: CacheMarker = {
      artifact: pinnedGodotBuild.artifact,
      executable: pinnedGodotBuild.executable,
      godotVersion: version,
      sha256: pinnedGodotBuild.sha256,
      version: pinnedGodotBuild.version,
    };
    await writeFile(
      path.join(extractionPath, pinnedGodotCacheMarker),
      `${JSON.stringify(marker, null, 2)}\n`,
      { encoding: "utf8", flag: "wx" },
    );

    await rm(installDirectory, { recursive: true, force: true });
    await rename(extractionPath, installDirectory);
    return {
      executable: path.join(installDirectory, pinnedGodotBuild.executable),
      source: "download",
      version,
    };
  } finally {
    await rm(archivePath, { force: true });
    await rm(extractionPath, { recursive: true, force: true });
  }
}
