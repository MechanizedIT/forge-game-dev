import { Codex } from "@openai/codex-sdk";

import type { CodexExecutor, CodexRunRequest, CodexRunSession } from "./types.js";

export class OfficialCodexExecutor implements CodexExecutor {
  private readonly codex = new Codex();

  async start(request: CodexRunRequest): Promise<CodexRunSession> {
    const thread = this.codex.startThread({
      workingDirectory: request.workspacePath,
      sandboxMode: "workspace-write",
      approvalPolicy: "never",
      networkAccessEnabled: false,
      skipGitRepoCheck: false,
      additionalDirectories: [],
    });
    const streamed = await thread.runStreamed(request.prompt);
    return {
      events: streamed.events,
      getThreadId: () => thread.id,
    };
  }
}
