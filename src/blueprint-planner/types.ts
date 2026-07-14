import type { BlueprintUsage } from "./shared.js";

export interface BlueprintModelTurn {
  finalResponse: string;
  threadId: string | null;
  usage: BlueprintUsage | null;
}

export interface BlueprintModelSession {
  run: (prompt: string, outputSchema: unknown, signal?: AbortSignal) => Promise<BlueprintModelTurn>;
}

export interface BlueprintModelExecutor {
  start: () => BlueprintModelSession;
}
