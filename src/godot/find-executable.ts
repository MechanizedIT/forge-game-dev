import { stat } from "node:fs/promises";
import path from "node:path";

import { repositoryRoot } from "../demo/paths.js";

export interface FindGodotOptions {
  environment?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  workingDirectory?: string;
}

async function isFile(target: string): Promise<boolean> {
  try {
    return (await stat(target)).isFile();
  } catch {
    return false;
  }
}

export async function findGodotExecutable(options: FindGodotOptions = {}): Promise<string> {
  const environment = options.environment ?? process.env;
  const platform = options.platform ?? process.platform;
  const workingDirectory = path.resolve(options.workingDirectory ?? repositoryRoot);
  const configured = environment.GODOT_BIN?.trim();

  if (configured) {
    const configuredPath = path.resolve(workingDirectory, configured);
    if (!(await isFile(configuredPath))) {
      throw new Error(`GODOT_BIN does not point to a readable executable: ${configuredPath}`);
    }
    return configuredPath;
  }

  const executableNames =
    platform === "win32"
      ? [
          "Godot_v4.7-stable_win64_console.exe",
          "Godot_v4.7-stable_win64.exe",
          "godot4.exe",
          "godot.exe",
        ]
      : ["godot4", "godot"];
  const projectDirectories = [workingDirectory, path.join(workingDirectory, ".tools", "godot")];
  const pathDirectories = (environment.PATH ?? "").split(path.delimiter).filter(Boolean);

  for (const directory of [...projectDirectories, ...pathDirectories]) {
    for (const name of executableNames) {
      const candidate = path.join(directory, name);
      if (await isFile(candidate)) {
        return candidate;
      }
    }
  }

  throw new Error(
    "Godot 4.7 was not found. Set GODOT_BIN to the Standard Godot executable or add it to PATH.",
  );
}
