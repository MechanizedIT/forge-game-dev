import path from "node:path";

import {
  godotVerificationResultSchema,
  type GodotVerificationResult,
} from "../contracts/index.js";
import { ensurePinnedGodot } from "../godot/bootstrap.js";
import { runProjectProcess, type ProjectProcessRunner } from "./process.js";

export const topDownArenaVerificationArguments = [
  "--headless",
  "--path",
  ".",
  "--script",
  "res://scripts/verify_project.gd",
] as const;

export type TopDownArenaVerifier = (options: {
  projectPath: string;
  projectId: string;
  forgeHome: string;
  verifiedAt: string;
}) => Promise<GodotVerificationResult>;
export type OpenGodotVerifier = TopDownArenaVerifier;

function sanitizeOutput(output: string, projectPath: string): string {
  const escaped = path.resolve(projectPath).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return output.replace(new RegExp(escaped, "giu"), ".").slice(-8_000).trim();
}

export function createTopDownArenaVerifier(
  processRunner: ProjectProcessRunner = runProjectProcess,
  resolveGodot: typeof ensurePinnedGodot = ensurePinnedGodot,
): TopDownArenaVerifier {
  return async ({ projectPath, projectId, forgeHome, verifiedAt }) => {
    const godot = await resolveGodot({ forgeHome });
    const actualArguments = [
      "--headless",
      "--path",
      path.resolve(projectPath),
      "--script",
      "res://scripts/verify_project.gd",
    ];
    const result = processRunner({ executable: godot.executable, args: actualArguments, cwd: projectPath });
    const output = sanitizeOutput(result.output, projectPath);
    const successMarker = "FORGE_TOP_DOWN_ARENA_VERIFY_OK" as const;
    const fatalOutput = /(?:SCRIPT ERROR|PARSE ERROR|Failed loading resource|Failed to load script|No loader found|ERROR:)/iu.test(output);
    if (result.status !== 0 || !output.includes(successMarker) || fatalOutput) {
      throw new Error(`Godot Top-down Arena verification failed (${result.status}): ${output || "no output"}`);
    }
    return godotVerificationResultSchema.parse({
      schemaVersion: 1,
      projectId,
      status: "passed",
      godotVersion: godot.version,
      arguments: topDownArenaVerificationArguments,
      successMarker,
      output,
      verifiedAt,
    });
  };
}

export function createOpenGodotVerifier(
  processRunner: ProjectProcessRunner = runProjectProcess,
  resolveGodot: typeof ensurePinnedGodot = ensurePinnedGodot,
): OpenGodotVerifier {
  return async ({ projectPath, projectId, forgeHome, verifiedAt }) => {
    const godot = await resolveGodot({ forgeHome });
    const actualArguments = ["--headless", "--path", path.resolve(projectPath), "--script", "res://scripts/verify_project.gd"];
    const result = processRunner({ executable: godot.executable, args: actualArguments, cwd: projectPath });
    const output = sanitizeOutput(result.output, projectPath);
    const successMarker = "FORGE_OPEN_GODOT_VERIFY_OK" as const;
    const fatalOutput = /(?:SCRIPT ERROR|PARSE ERROR|Failed loading resource|Failed to load script|No loader found|ERROR:)/iu.test(output);
    if (result.status !== 0 || !output.includes(successMarker) || fatalOutput) {
      throw new Error(`Godot open-project verification failed (${result.status}): ${output || "no output"}`);
    }
    return godotVerificationResultSchema.parse({
      schemaVersion: 1, projectId, status: "passed", godotVersion: godot.version,
      arguments: topDownArenaVerificationArguments, successMarker, output, verifiedAt,
    });
  };
}
