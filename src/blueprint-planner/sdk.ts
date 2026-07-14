import { Codex } from "@openai/codex-sdk";

import type { BlueprintModelExecutor, BlueprintModelSession } from "./types.js";

export class OfficialBlueprintModelExecutor implements BlueprintModelExecutor {
  private readonly codex: Codex;

  constructor(
    private readonly workingDirectory: string,
    apiKey: string | undefined = process.env.OPENAI_API_KEY,
  ) {
    this.codex = new Codex(apiKey ? { apiKey } : undefined);
  }

  start(): BlueprintModelSession {
    const thread = this.codex.startThread({
      model: "gpt-5.6",
      modelReasoningEffort: "high",
      workingDirectory: this.workingDirectory,
      sandboxMode: "read-only",
      approvalPolicy: "never",
      networkAccessEnabled: false,
      webSearchMode: "disabled",
      skipGitRepoCheck: false,
      additionalDirectories: [],
    });
    return {
      run: async (prompt, outputSchema, signal) => {
        const turn = await thread.run(prompt, { outputSchema, ...(signal ? { signal } : {}) });
        return {
          finalResponse: turn.finalResponse,
          threadId: thread.id,
          usage: turn.usage
            ? {
                inputTokens: turn.usage.input_tokens,
                cachedInputTokens: turn.usage.cached_input_tokens,
                outputTokens: turn.usage.output_tokens,
                reasoningOutputTokens: turn.usage.reasoning_output_tokens,
              }
            : null,
        };
      },
    };
  }
}
