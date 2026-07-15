import path from "node:path";

import { ensurePinnedGodot } from "./bootstrap.js";
import { runCaptured, type CapturedProcessResult } from "./process.js";

function sanitizeOutput(output: string, projectPath: string): string {
  const variants = new Set([projectPath, projectPath.replaceAll("\\", "/"), projectPath.replaceAll("/", "\\")]);
  let sanitized = output;
  for (const variant of variants) {
    const escaped = variant.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    sanitized = sanitized.replace(new RegExp(escaped, "giu"), ".");
  }
  return sanitized.slice(-8_000).trim();
}

export async function verifyGodotProjectHealth(options: {
  projectPath: string;
  forgeHome: string;
  resolveGodot?: typeof ensurePinnedGodot;
  run?: (executable: string, args: string[]) => CapturedProcessResult;
}): Promise<{ output: string; godotVersion: string }> {
  const projectPath = path.resolve(options.projectPath);
  const godot = await (options.resolveGodot ?? ensurePinnedGodot)({ forgeHome: options.forgeHome });
  const result = (options.run ?? runCaptured)(godot.executable, [
    "--headless",
    "--path",
    projectPath,
    "--quit-after",
    "1",
  ]);
  const output = sanitizeOutput(result.output, projectPath);
  const fatal = /(?:SCRIPT ERROR|PARSE ERROR|Failed loading resource|Failed to load script|No loader found|ERROR:)/iu.test(output);
  if (result.status !== 0 || fatal) {
    throw new Error(`Godot project health failed (${result.status}): ${output || "no output"}`);
  }
  return { output: output || "Pinned Godot loaded and started the project without a reported error.", godotVersion: godot.version };
}
