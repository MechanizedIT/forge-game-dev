import type { ThreadEvent } from "@openai/codex-sdk";

export const PROGRESS_MESSAGES = {
  understanding: "Inspecting approved files",
  inspecting: "Preparing the change",
  building: "Updating the game",
  testing: "Running verification",
  reviewing: "Preparing the result",
} as const;

export type ProgressStage = keyof typeof PROGRESS_MESSAGES;

const progressOrder: ProgressStage[] = [
  "understanding",
  "inspecting",
  "building",
  "testing",
  "reviewing",
];

export function mapSdkEventToProgress(event: ThreadEvent): ProgressStage | null {
  if (event.type === "thread.started" || event.type === "turn.started") return "inspecting";
  if (event.type === "turn.failed" || event.type === "error") {
    return "reviewing";
  }
  if (event.type === "item.started" || event.type === "item.updated" || event.type === "item.completed") {
    if (event.item.type === "file_change") return "building";
    if (
      event.item.type === "command_execution" &&
      /(?:godot|\btest\b|npm\s+run\s+check)/i.test(event.item.command)
    ) {
      return "testing";
    }
  }
  return null;
}

export class ProgressReporter {
  private lastStage: ProgressStage | null = null;

  constructor(private readonly report: (message: string) => void) {}

  emit(stage: ProgressStage): void {
    if (
      this.lastStage &&
      progressOrder.indexOf(stage) <= progressOrder.indexOf(this.lastStage)
    ) {
      return;
    }
    this.lastStage = stage;
    this.report(PROGRESS_MESSAGES[stage]);
  }
}
