import type { ThreadEvent } from "@openai/codex-sdk";

export interface CodexRunRequest {
  prompt: string;
  workspacePath: string;
}

export interface CodexRunSession {
  events: AsyncIterable<ThreadEvent>;
  getThreadId: () => string | null;
}

export interface CodexExecutor {
  start: (request: CodexRunRequest) => Promise<CodexRunSession>;
}

export interface CommandResult {
  exitCode: number;
  output: string;
}

export type CommandRunner = (argv: string[], cwd: string) => CommandResult;
