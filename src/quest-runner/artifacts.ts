import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

interface AtomicWriteOptions {
  renameFile?: (from: string, to: string) => Promise<void>;
  wait?: (milliseconds: number) => Promise<void>;
}

const transientReplacementCodes = new Set(["EACCES", "EBUSY", "EPERM"]);
const replacementRetryDelays = [25, 75, 150] as const;

async function replaceWithBoundedRetry(
  temporaryPath: string,
  filePath: string,
  options: AtomicWriteOptions,
): Promise<void> {
  const renameFile = options.renameFile ?? rename;
  const wait = options.wait ?? ((milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  for (let attempt = 0; ; attempt += 1) {
    try {
      await renameFile(temporaryPath, filePath);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      const delay = replacementRetryDelays[attempt];
      if (!delay || !code || !transientReplacementCodes.has(code)) throw error;
      await wait(delay);
    }
  }
}

export async function writeJsonAtomic(filePath: string, value: unknown, options: AtomicWriteOptions = {}): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}-${Date.now()}.tmp`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await replaceWithBoundedRetry(temporaryPath, filePath, options);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

export async function writeJsonLinesAtomic(filePath: string, values: unknown[], options: AtomicWriteOptions = {}): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}-${Date.now()}.tmp`;
  try {
    const contents = values.map((value) => JSON.stringify(value)).join("\n");
    await writeFile(temporaryPath, contents ? `${contents}\n` : "", "utf8");
    await replaceWithBoundedRetry(temporaryPath, filePath, options);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

export async function writeTextAtomic(filePath: string, contents: string, options: AtomicWriteOptions = {}): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}-${Date.now()}.tmp`;
  try {
    await writeFile(temporaryPath, contents.endsWith("\n") ? contents : `${contents}\n`, "utf8");
    await replaceWithBoundedRetry(temporaryPath, filePath, options);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}
