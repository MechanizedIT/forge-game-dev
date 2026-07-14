import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export async function writeJsonAtomic(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}-${Date.now()}.tmp`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await rename(temporaryPath, filePath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

export async function writeJsonLinesAtomic(filePath: string, values: unknown[]): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}-${Date.now()}.tmp`;
  try {
    const contents = values.map((value) => JSON.stringify(value)).join("\n");
    await writeFile(temporaryPath, contents ? `${contents}\n` : "", "utf8");
    await rename(temporaryPath, filePath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

export async function writeTextAtomic(filePath: string, contents: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}-${Date.now()}.tmp`;
  try {
    await writeFile(temporaryPath, contents.endsWith("\n") ? contents : `${contents}\n`, "utf8");
    await rename(temporaryPath, filePath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}
