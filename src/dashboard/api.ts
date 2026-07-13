import type {
  CreatorConfirmation,
  DashboardEvent,
  DashboardSnapshot,
} from "./shared.js";

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
