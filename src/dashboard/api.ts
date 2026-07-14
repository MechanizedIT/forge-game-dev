import type {
  CreatorConfirmation,
  DemoResetAction,
  DashboardEvent,
  DashboardSnapshot,
} from "./shared.js";
import type {
  BlueprintPlanningEvent,
  BlueprintPlanningSnapshot,
} from "../blueprint-planner/shared.js";
import type { ClarificationTopic } from "../contracts/index.js";
import type {
  CreatedProjectSummary,
  ProjectCreationEvent,
  ProjectCreationStateResponse,
} from "../project-creation/shared.js";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const value = (await response.json()) as T | { error?: string };
  if (!response.ok) {
    const message = "error" in (value as object) ? (value as { error?: string }).error : null;
    throw new Error(message ?? `Forge request failed with status ${response.status}.`);
  }
  return value as T;
}

export function loadDashboard(): Promise<DashboardSnapshot> {
  return request<DashboardSnapshot>("/api/state");
}

export async function approveQuest(): Promise<void> {
  await request("/api/quests/enemy-targeting/run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ approval: "APPROVE" }),
  });
}

export async function cancelQuestApproval(): Promise<void> {
  await request("/api/quests/enemy-targeting/run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ approval: "CANCEL" }),
  });
}

export function launchGame(): Promise<DashboardSnapshot> {
  return request<DashboardSnapshot>("/api/quests/enemy-targeting/play", {
    method: "POST",
  });
}

export function confirmCreatorResult(
  response: CreatorConfirmation,
): Promise<DashboardSnapshot> {
  return request<DashboardSnapshot>("/api/quests/enemy-targeting/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ response }),
  });
}

export function resetDemo(action: DemoResetAction): Promise<DashboardSnapshot> {
  return request<DashboardSnapshot>("/api/demo/reset", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action }),
  });
}

export function subscribeToDashboard(
  onEvent: (event: DashboardEvent) => void,
  onDisconnect: () => void,
): () => void {
  const stream = new EventSource("/api/events");
  stream.onmessage = (message) => {
    onEvent(JSON.parse(message.data) as DashboardEvent);
  };
  stream.onerror = onDisconnect;
  return () => stream.close();
}

export function loadBlueprintPlanning(): Promise<BlueprintPlanningSnapshot> {
  return request<BlueprintPlanningSnapshot>("/api/planning/state");
}

export function startBlueprintPlanning(idea: string): Promise<BlueprintPlanningSnapshot> {
  return request<BlueprintPlanningSnapshot>("/api/planning/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idea }),
  });
}

export function submitBlueprintAnswers(
  answers: Partial<Record<ClarificationTopic, string>>,
): Promise<BlueprintPlanningSnapshot> {
  return request<BlueprintPlanningSnapshot>("/api/planning/answers", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ answers }),
  });
}

export function reviseBlueprintIdea(): Promise<BlueprintPlanningSnapshot> {
  return request<BlueprintPlanningSnapshot>("/api/planning/revise", { method: "POST" });
}

export function cancelBlueprintPlanning(): Promise<BlueprintPlanningSnapshot> {
  return request<BlueprintPlanningSnapshot>("/api/planning/cancel", { method: "POST" });
}

export function approveBlueprint(): Promise<BlueprintPlanningSnapshot> {
  return request<BlueprintPlanningSnapshot>("/api/planning/approve", { method: "POST" });
}

export function subscribeToBlueprintPlanning(
  onEvent: (event: BlueprintPlanningEvent) => void,
  onDisconnect: () => void,
): () => void {
  const stream = new EventSource("/api/planning/events");
  stream.onmessage = (message) => onEvent(JSON.parse(message.data) as BlueprintPlanningEvent);
  stream.onerror = onDisconnect;
  return () => stream.close();
}

export function loadProjectCreationState(): Promise<ProjectCreationStateResponse> {
  return request<ProjectCreationStateResponse>("/api/projects/state");
}

export function createApprovedProject(mutationToken: string): Promise<ProjectCreationStateResponse> {
  return request<ProjectCreationStateResponse>("/api/projects/create", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forge-mutation-token": mutationToken,
    },
    body: JSON.stringify({ confirmation: "CONFIRM CREATE" }),
  });
}

export function cancelProjectCreation(mutationToken: string): Promise<ProjectCreationStateResponse> {
  return request<ProjectCreationStateResponse>("/api/projects/create/cancel", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forge-mutation-token": mutationToken,
    },
    body: JSON.stringify({ action: "CANCEL CREATE" }),
  });
}

export function loadCreatedProject(projectId: string): Promise<CreatedProjectSummary> {
  return request<CreatedProjectSummary>(`/api/projects/${encodeURIComponent(projectId)}`);
}

export function openCreatedProjectFolder(projectId: string): Promise<{ opened: true }> {
  return request<{ opened: true }>("/api/projects/open-folder", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ projectId }),
  });
}

export function subscribeToProjectCreation(
  onEvent: (event: ProjectCreationEvent) => void,
  onDisconnect: () => void,
): () => void {
  const stream = new EventSource("/api/projects/events");
  stream.onmessage = (message) => onEvent(JSON.parse(message.data) as ProjectCreationEvent);
  stream.onerror = onDisconnect;
  return () => stream.close();
}
