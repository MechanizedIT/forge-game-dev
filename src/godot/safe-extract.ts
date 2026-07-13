import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import yauzl, { type Entry, type ZipFile } from "yauzl";

function openZip(archivePath: string): Promise<ZipFile> {
  return new Promise((resolve, reject) => {
    yauzl.open(archivePath, { lazyEntries: true }, (error, zipFile) => {
      if (error || !zipFile) {
        reject(error ?? new Error(`Unable to open ZIP archive: ${archivePath}`));
      } else {
        resolve(zipFile);
      }
    });
  });
}

function openEntry(zipFile: ZipFile, entry: Entry): Promise<NodeJS.ReadableStream> {
  return new Promise((resolve, reject) => {
    zipFile.openReadStream(entry, (error, stream) => {
      if (error || !stream) {
        reject(error ?? new Error(`Unable to read ZIP entry: ${entry.fileName}`));
      } else {
        resolve(stream);
      }
    });
  });
}

function resolveSafeEntry(root: string, entryName: string): string {
  if (
    entryName.includes("\0") ||
    entryName.startsWith("/") ||
    entryName.startsWith("\\") ||
    /^[a-zA-Z]:/.test(entryName)
  ) {
    throw new Error(`Unsafe ZIP entry path: ${entryName}`);
  }

  const normalized = entryName.replaceAll("\\", "/");
  const segments = normalized.split("/").filter(Boolean);
  if (segments.some((segment) => segment === "..")) {
    throw new Error(`Unsafe ZIP entry path: ${entryName}`);
  }

  const target = path.resolve(root, ...segments);
  const relative = path.relative(root, target);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Unsafe ZIP entry path: ${entryName}`);
  }
  return target;
}

function isSymbolicLink(entry: Entry): boolean {
  const unixMode = entry.externalFileAttributes >>> 16;
  return (unixMode & 0o170000) === 0o120000;
}

export async function extractZipSafely(archivePath: string, destination: string): Promise<void> {
  const root = path.resolve(destination);
  await mkdir(root, { recursive: true });
  const zipFile = await openZip(archivePath);

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const fail = (error: unknown): void => {
      if (settled) return;
      settled = true;
      zipFile.close();
      reject(error);
    };

    zipFile.on("error", fail);
    zipFile.on("end", () => {
      if (settled) return;
      settled = true;
      resolve();
    });
    zipFile.on("entry", (entry: Entry) => {
      void (async () => {
        if (isSymbolicLink(entry)) {
          throw new Error(`Refusing symbolic link in ZIP archive: ${entry.fileName}`);
        }

        const target = resolveSafeEntry(root, entry.fileName);
        if (entry.fileName.endsWith("/")) {
          await mkdir(target, { recursive: true });
        } else {
          await mkdir(path.dirname(target), { recursive: true });
          const input = await openEntry(zipFile, entry);
          await pipeline(input, createWriteStream(target, { flags: "wx" }));
        }
        zipFile.readEntry();
      })().catch(fail);
    });

    zipFile.readEntry();
  });
}
