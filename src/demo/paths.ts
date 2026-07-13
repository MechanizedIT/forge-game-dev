import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));

export const repositoryRoot = path.resolve(sourceDirectory, "..", "..");
export const baselineFixturePath = path.join(repositoryRoot, "fixtures", "godot", "baseline");

export function resolveForgeHome(
  environment: NodeJS.ProcessEnv = process.env,
  homeDirectory: string = os.homedir(),
): string {
  const override = environment.FORGE_HOME?.trim();
  if (override) {
    return path.resolve(override);
  }

  const localAppData = environment.LOCALAPPDATA?.trim();
  return localAppData ? path.join(localAppData, "Forge") : path.join(homeDirectory, ".forge");
}

export function resolveDemoWorkspace(forgeHome: string): string {
  return path.join(path.resolve(forgeHome), "demo-workspace");
}
