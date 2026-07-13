import { spawnSync } from "node:child_process";

import type { Quest } from "../contracts/index.js";
import type { CommandRunner } from "./types.js";

export interface VerificationEvidence {
  verificationId: string;
  command: string[];
  exitCode: number;
  evidence: string;
}

const approvedCommands = new Map([
  ["VERIFY-1", ["npm", "run", "check"]],
  ["VERIFY-2", ["npm", "run", "godot:verify"]],
]);

function equalArgv(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function assertApprovedVerificationCommands(quest: Quest): void {
  const commands = quest.verification.filter((verification) => verification.kind === "command");
  if (commands.length !== approvedCommands.size) {
    throw new Error("Enemy Targeting must contain exactly the two approved verification commands");
  }
  for (const verification of commands) {
    const approved = approvedCommands.get(verification.id);
    if (!approved || !equalArgv(verification.argv, approved)) {
      throw new Error(`Unapproved verification command for ${verification.id}`);
    }
  }
}

export const runCommand: CommandRunner = (argv, cwd) => {
  let executable = argv[0];
  let commandArgs = argv.slice(1);
  if (process.platform === "win32" && executable === "npm") {
    const npmCli = process.env.npm_execpath;
    if (!npmCli) {
      return { exitCode: 1, output: "npm_execpath is unavailable for safe Windows execution" };
    }
    executable = process.execPath;
    commandArgs = [npmCli, ...commandArgs];
  }
  if (!executable) return { exitCode: 1, output: "Missing command executable" };
  const result = spawnSync(executable, commandArgs, {
    cwd,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.error) return { exitCode: 1, output: result.error.message };
  return {
    exitCode: result.status ?? 1,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim(),
  };
};

function conciseEvidence(output: string): string {
  const normalized = output.trim();
  return normalized.length > 2_000 ? `${normalized.slice(0, 2_000)}\n[truncated]` : normalized;
}

export function runApprovedVerifications(
  quest: Quest,
  repositoryRoot: string,
  runner: CommandRunner = runCommand,
): VerificationEvidence[] {
  assertApprovedVerificationCommands(quest);
  return quest.verification
    .filter((verification) => verification.kind === "command")
    .map((verification) => {
      const result = runner(verification.argv, repositoryRoot);
      const missingTargetToken =
        verification.id === "VERIFY-2" &&
        result.exitCode === 0 &&
        !result.output.includes("FORGE_ENEMY_TARGETING_VERIFY_OK");
      return {
        verificationId: verification.id,
        command: verification.argv,
        exitCode: missingTargetToken ? 1 : result.exitCode,
        evidence: missingTargetToken
          ? "Godot exited successfully but did not emit FORGE_ENEMY_TARGETING_VERIFY_OK."
          : conciseEvidence(result.output) || `Command exited ${result.exitCode}.`,
      };
    });
}
