import { z } from "zod";

export const WORKFLOW_STAGES = [
  "PLAN",
  "APPROVE",
  "IMPLEMENT",
  "REVIEW",
  "DOCUMENT",
  "COMPLETE",
] as const;

export const ROADMAP_QUEST_STATES = [
  "locked",
  "available",
  "active",
  "completed",
] as const;

export const workflowStageSchema = z.enum(WORKFLOW_STAGES);
export const roadmapQuestStateSchema = z.enum(ROADMAP_QUEST_STATES);

export type WorkflowStage = z.infer<typeof workflowStageSchema>;
export type RoadmapQuestState = z.infer<typeof roadmapQuestStateSchema>;

const allowedWorkflowTransitions: Readonly<Record<WorkflowStage, readonly WorkflowStage[]>> = {
  PLAN: ["APPROVE"],
  APPROVE: ["PLAN", "IMPLEMENT"],
  IMPLEMENT: ["REVIEW"],
  REVIEW: ["REVIEW", "IMPLEMENT", "DOCUMENT"],
  DOCUMENT: ["COMPLETE"],
  COMPLETE: [],
};

export function canTransitionWorkflow(from: WorkflowStage, to: WorkflowStage): boolean {
  return allowedWorkflowTransitions[from].includes(to);
}

export function assertWorkflowTransition(from: unknown, to: unknown): void {
  const parsedFrom = workflowStageSchema.parse(from);
  const parsedTo = workflowStageSchema.parse(to);

  if (!canTransitionWorkflow(parsedFrom, parsedTo)) {
    throw new Error(`Invalid Forge workflow transition: ${parsedFrom} -> ${parsedTo}`);
  }
}
