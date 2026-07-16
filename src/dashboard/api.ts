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
import type { RoadmapEdit } from "../blueprint-planner/starter-catalog.js";
import type {
  SystemRoadmapPlanningEvent,
  SystemRoadmapPlanningSnapshot,
} from "../blueprint-planner/system-roadmap.js";
import type {
  SystemQuestPlanningEvent,
  SystemQuestPlanningSnapshot,
} from "../blueprint-planner/system-quest.js";
import type {
  CreatedProjectSummary,
  ProjectCreationEvent,
  ProjectCreationStateResponse,
} from "../project-creation/shared.js";
import type {
  GeneratedIdeaSaveResponse,
  GeneratedLaunchResponse,
  GeneratedProjectWorldSnapshot,
  GeneratedWorldStateInput,
  SystemQuestFileCandidate,
} from "../generated-project-world/shared.js";
import type {
  GeneratedQuestAdjustmentInput,
  GeneratedQuestPlanMutationResult,
  GeneratedQuestRunEvent,
  GeneratedQuestRunSnapshot,
} from "../generated-quest-runner/shared.js";
import type { GeneratedCreatorResult } from "../contracts/index.js";

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
  return request<BlueprintPlanningSnapshot>("/api/planning/revise", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "REVISE" }) });
}

export function cancelBlueprintPlanning(): Promise<BlueprintPlanningSnapshot> {
  return request<BlueprintPlanningSnapshot>("/api/planning/cancel", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "CANCEL" }) });
}

export function approveBlueprint(): Promise<BlueprintPlanningSnapshot> {
  return request<BlueprintPlanningSnapshot>("/api/planning/approve", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision: "ACCEPT INTERPRETATION" }),
  });
}

export function reviseAcceptedRoadmap(edit: RoadmapEdit): Promise<BlueprintPlanningSnapshot> {
  return request<BlueprintPlanningSnapshot>("/api/planning/roadmap/edit", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(edit),
  });
}

export function acceptBlueprintRoadmap(fingerprint: string): Promise<BlueprintPlanningSnapshot> {
  return request<BlueprintPlanningSnapshot>("/api/planning/roadmap/accept", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision: "ACCEPT ROADMAP", fingerprint }),
  });
}

export function rejectBlueprintPlan(): Promise<BlueprintPlanningSnapshot> {
  return request<BlueprintPlanningSnapshot>("/api/planning/reject", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision: "REJECT PLAN" }),
  });
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

export function createOpenProject(displayName: string, mutationToken: string): Promise<ProjectCreationStateResponse> {
  return request<ProjectCreationStateResponse>("/api/projects/create-open", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forge-mutation-token": mutationToken,
    },
    body: JSON.stringify({ displayName }),
  });
}

export function resetFailedProjectCreation(mutationToken: string): Promise<ProjectCreationStateResponse> {
  return request<ProjectCreationStateResponse>("/api/projects/create/reset", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forge-mutation-token": mutationToken,
    },
    body: JSON.stringify({ action: "RESET FAILED CREATION" }),
  });
}

export function loadCreatedProject(projectId: string): Promise<CreatedProjectSummary> {
  return request<CreatedProjectSummary>(`/api/projects/${encodeURIComponent(projectId)}`);
}

export function loadGeneratedProjectWorld(projectId: string): Promise<GeneratedProjectWorldSnapshot> {
  return request<GeneratedProjectWorldSnapshot>(`/api/projects/${encodeURIComponent(projectId)}/world`);
}

export function openGeneratedProjectWorld(projectId: string): Promise<GeneratedProjectWorldSnapshot> {
  return request<GeneratedProjectWorldSnapshot>(`/api/projects/${encodeURIComponent(projectId)}/open`, {
    method: "POST",
  });
}

export function saveGeneratedProjectState(
  projectId: string,
  state: GeneratedWorldStateInput,
): Promise<GeneratedProjectWorldSnapshot> {
  return request<GeneratedProjectWorldSnapshot>(`/api/projects/${encodeURIComponent(projectId)}/state`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(state),
  });
}

export function saveGeneratedIdea(projectId: string, idea: string): Promise<GeneratedIdeaSaveResponse> {
  return request<GeneratedIdeaSaveResponse>(`/api/projects/${encodeURIComponent(projectId)}/ideas`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idea }),
  });
}

export function launchGeneratedProject(projectId: string): Promise<GeneratedLaunchResponse> {
  return request<GeneratedLaunchResponse>(`/api/projects/${encodeURIComponent(projectId)}/launch`, {
    method: "POST",
  });
}

export function openCreatedProjectFolder(projectId: string): Promise<{ opened: true }> {
  return request<{ opened: true }>("/api/projects/open-folder", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ projectId }),
  });
}

function systemPlanningUrl(projectId: string, action: string): string {
  return `/api/projects/${encodeURIComponent(projectId)}/system-planning/${action}`;
}

export function loadSystemRoadmapPlanning(projectId: string): Promise<SystemRoadmapPlanningSnapshot> {
  return request(systemPlanningUrl(projectId, "state"));
}

export function startSystemRoadmapPlanning(projectId: string, idea: string): Promise<SystemRoadmapPlanningSnapshot> {
  return request(systemPlanningUrl(projectId, "start"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idea }) });
}

export function answerSystemRoadmapPlanning(projectId: string, answers: Array<{ questionId: string; answer: string }>): Promise<SystemRoadmapPlanningSnapshot> {
  return request(systemPlanningUrl(projectId, "answers"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ answers }) });
}

export function reviseSystemRoadmapPlanning(projectId: string, revision: string): Promise<SystemRoadmapPlanningSnapshot> {
  return request(systemPlanningUrl(projectId, "revise"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ request: revision }) });
}

export function retrySystemRoadmapPlanning(projectId: string): Promise<SystemRoadmapPlanningSnapshot> {
  return request(systemPlanningUrl(projectId, "retry"), { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
}

export function acceptSystemRoadmapPlanning(projectId: string, fingerprint: string): Promise<SystemRoadmapPlanningSnapshot> {
  return request(systemPlanningUrl(projectId, "accept"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision: "ACCEPT SYSTEM ROADMAP", fingerprint }) });
}

export function cancelSystemRoadmapPlanning(projectId: string): Promise<SystemRoadmapPlanningSnapshot> {
  return request(systemPlanningUrl(projectId, "cancel"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision: "CANCEL SYSTEM PLANNING" }) });
}

export function subscribeToSystemRoadmapPlanning(
  projectId: string,
  onEvent: (event: SystemRoadmapPlanningEvent) => void,
  onDisconnect: () => void,
): () => void {
  const stream = new EventSource(systemPlanningUrl(projectId, "events"));
  stream.onmessage = (message) => onEvent(JSON.parse(message.data) as SystemRoadmapPlanningEvent);
  stream.onerror = onDisconnect;
  return () => stream.close();
}

function systemQuestPlanningUrl(projectId: string, systemId: string, action: string): string {
  return `/api/projects/${encodeURIComponent(projectId)}/systems/${encodeURIComponent(systemId)}/quest-planning/${action}`;
}

export function loadSystemQuestPlanning(projectId: string, systemId: string, questId?: string): Promise<SystemQuestPlanningSnapshot> {
  const suffix = questId ? `?questId=${encodeURIComponent(questId)}` : "";
  return request(`${systemQuestPlanningUrl(projectId, systemId, "state")}${suffix}`);
}

export function listSystemQuestFiles(projectId: string, systemId: string): Promise<SystemQuestFileCandidate[]> {
  return request(systemQuestPlanningUrl(projectId, systemId, "files"));
}

export function startSystemQuestPlanning(projectId: string, systemId: string, description: string): Promise<SystemQuestPlanningSnapshot> {
  return request(systemQuestPlanningUrl(projectId, systemId, "start"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ description }) });
}

export function answerSystemQuestPlanning(projectId: string, systemId: string, answers: Array<{ questionId: string; answer: string }>): Promise<SystemQuestPlanningSnapshot> {
  return request(systemQuestPlanningUrl(projectId, systemId, "answers"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ answers }) });
}

export function reviseSystemQuestPlanning(projectId: string, systemId: string, revision: string): Promise<SystemQuestPlanningSnapshot> {
  return request(systemQuestPlanningUrl(projectId, systemId, "revise"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ request: revision }) });
}

export function retrySystemQuestPlanning(projectId: string, systemId: string): Promise<SystemQuestPlanningSnapshot> {
  return request(systemQuestPlanningUrl(projectId, systemId, "retry"), { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
}

export function acceptSystemQuestPlanning(projectId: string, systemId: string, fingerprint: string): Promise<SystemQuestPlanningSnapshot> {
  return request(systemQuestPlanningUrl(projectId, systemId, "accept-quests"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision: "ACCEPT SYSTEM QUESTS", fingerprint }) });
}

export function reviewSystemQuestWorkOrder(projectId: string, systemId: string, existingFiles: string[], newFiles: string[], questId?: string): Promise<SystemQuestPlanningSnapshot> {
  return request(systemQuestPlanningUrl(projectId, systemId, "review-work-order"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ existingFiles, newFiles, ...(questId ? { questId } : {}) }) });
}

export function acceptSystemQuestWorkOrder(projectId: string, systemId: string, fingerprint: string): Promise<SystemQuestPlanningSnapshot> {
  return request(systemQuestPlanningUrl(projectId, systemId, "accept-work-order"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision: "ACCEPT QUEST WORK ORDER", fingerprint }) });
}

export function cancelSystemQuestPlanning(projectId: string, systemId: string): Promise<SystemQuestPlanningSnapshot> {
  return request(systemQuestPlanningUrl(projectId, systemId, "cancel"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision: "CANCEL QUEST PLANNING" }) });
}

export function subscribeToSystemQuestPlanning(projectId: string, systemId: string, onEvent: (event: SystemQuestPlanningEvent) => void, onDisconnect: () => void): () => void {
  const stream = new EventSource(systemQuestPlanningUrl(projectId, systemId, "events"));
  stream.onmessage = (message) => onEvent(JSON.parse(message.data) as SystemQuestPlanningEvent);
  stream.onerror = onDisconnect;
  return () => stream.close();
}

function generatedQuestUrl(projectId: string, questId: string, action: string): string {
  return `/api/projects/${encodeURIComponent(projectId)}/quests/${encodeURIComponent(questId)}/${action}`;
}

export function adjustGeneratedQuest(
  projectId: string,
  questId: string,
  input: GeneratedQuestAdjustmentInput,
): Promise<GeneratedQuestPlanMutationResult> {
  return request(generatedQuestUrl(projectId, questId, "adjust"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function deferGeneratedQuest(
  projectId: string,
  questId: string,
  expectedRevision: number,
): Promise<GeneratedQuestPlanMutationResult> {
  return request(generatedQuestUrl(projectId, questId, "defer"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ expectedRevision }),
  });
}

export function prepareGeneratedQuest(projectId: string, questId: string): Promise<GeneratedQuestRunSnapshot> {
  return request(generatedQuestUrl(projectId, questId, "prepare"), { method: "POST" });
}

export function approveGeneratedQuest(
  projectId: string,
  questId: string,
  fingerprint: string,
): Promise<GeneratedQuestRunSnapshot> {
  return request(generatedQuestUrl(projectId, questId, "approve"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ fingerprint, decision: "APPROVE" }),
  });
}

export function startGeneratedQuest(projectId: string, questId: string): Promise<GeneratedQuestRunSnapshot> {
  return request(generatedQuestUrl(projectId, questId, "start"), { method: "POST" });
}

export function loadGeneratedQuestRun(projectId: string, questId: string): Promise<GeneratedQuestRunSnapshot> {
  return request(generatedQuestUrl(projectId, questId, "run"));
}

export function cancelGeneratedQuest(projectId: string, questId: string): Promise<GeneratedQuestRunSnapshot> {
  return request(generatedQuestUrl(projectId, questId, "cancel"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ decision: "CANCEL" }),
  });
}

export function playGeneratedQuest(projectId: string, questId: string): Promise<GeneratedLaunchResponse> {
  return request(generatedQuestUrl(projectId, questId, "play"), { method: "POST" });
}

export function confirmGeneratedQuest(
  projectId: string,
  questId: string,
  result: GeneratedCreatorResult,
): Promise<GeneratedQuestRunSnapshot> {
  return request(generatedQuestUrl(projectId, questId, "confirm"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ result }),
  });
}

export function rollbackGeneratedQuest(projectId: string, questId: string): Promise<GeneratedQuestRunSnapshot> {
  return request(generatedQuestUrl(projectId, questId, "rollback"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ confirmation: "ROLL BACK REVIEWED CHANGES" }),
  });
}

export function subscribeToGeneratedQuest(
  projectId: string,
  questId: string,
  onEvent: (event: GeneratedQuestRunEvent) => void,
  onDisconnect: () => void,
): () => void {
  const stream = new EventSource(generatedQuestUrl(projectId, questId, "events"));
  stream.onmessage = (message) => onEvent(JSON.parse(message.data) as GeneratedQuestRunEvent);
  stream.onerror = onDisconnect;
  return () => stream.close();
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
