import { createReadStream } from "node:fs";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import path from "node:path";

import type { ClarificationTopic } from "../contracts/index.js";
import type { RoadmapEdit } from "../blueprint-planner/starter-catalog.js";
import {
  BlueprintPlanningConflictError,
  BlueprintPlanningService,
} from "../blueprint-planner/service.js";
import {
  SystemRoadmapPlanningConflictError,
  SystemRoadmapPlanningService,
} from "../blueprint-planner/system-roadmap.js";
import {
  SystemQuestPlanningConflictError,
  SystemQuestPlanningService,
} from "../blueprint-planner/system-quest.js";
import type { CreatorConfirmation, DashboardEvent } from "../dashboard/shared.js";
import { DashboardConflictError, ForgeDashboardService } from "./service.js";
import {
  ProjectCreationConflictError,
  ProjectCreationService,
} from "../project-creation/service.js";
import {
  GeneratedProjectWorldConflictError,
  GeneratedProjectWorldNotFoundError,
  GeneratedProjectWorldService,
} from "../generated-project-world/service.js";
import type { ForgePresentationMutation, GeneratedWorldStateInput, GeneratedWorldView } from "../generated-project-world/shared.js";
import {
  GeneratedQuestRunConflictError,
  GeneratedQuestRunNotFoundError,
} from "../generated-quest-runner/service.js";
import type { GeneratedQuestRunnerService } from "../generated-quest-runner/service.js";
import type { GeneratedQuestRunEvent } from "../generated-quest-runner/shared.js";

type GeneratedQuestRunnerHost = Pick<GeneratedQuestRunnerService,
  "getSummary" | "adjust" | "defer" | "prepare" | "approve" | "start" | "cancel" | "play" | "confirm" | "rollback" | "subscribe"
>;

const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
  });
  response.end(body);
}

async function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 16_384) throw new Error("Dashboard request body is too large.");
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Dashboard request body must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

async function serveDashboardAsset(
  requestPath: string,
  response: ServerResponse,
  staticRoot: string,
): Promise<void> {
  const decoded = decodeURIComponent(requestPath);
  const requested = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const candidate = path.resolve(staticRoot, requested);
  const relative = path.relative(staticRoot, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  let filePath = candidate;
  let file = await stat(filePath).catch(() => null);
  if (!file?.isFile() && path.extname(requested) === "") {
    filePath = path.join(staticRoot, "index.html");
    file = await stat(filePath).catch(() => null);
  }
  if (!file?.isFile()) {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  response.writeHead(200, {
    "content-type": contentTypes[path.extname(filePath)] ?? "application/octet-stream",
    "content-length": file.size,
    "cache-control": path.extname(filePath) === ".html" ? "no-store" : "public, max-age=3600",
  });
  createReadStream(filePath).pipe(response);
}

function openEventStream(
  request: IncomingMessage,
  response: ServerResponse,
  service: ForgeDashboardService,
): void {
  response.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
  });
  response.write(`data: ${JSON.stringify({ type: "refresh" } satisfies DashboardEvent)}\n\n`);
  const unsubscribe = service.subscribe((event) => {
    response.write(`data: ${JSON.stringify(event)}\n\n`);
  });
  const heartbeat = setInterval(() => response.write(": keep-alive\n\n"), 15_000);
  request.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
}

function openPlanningEventStream(
  request: IncomingMessage,
  response: ServerResponse,
  planningService: BlueprintPlanningService,
): void {
  response.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
  });
  response.write(`data: ${JSON.stringify({ type: "refresh" })}\n\n`);
  const unsubscribe = planningService.subscribe((event) => {
    response.write(`data: ${JSON.stringify(event)}\n\n`);
  });
  const heartbeat = setInterval(() => response.write(": keep-alive\n\n"), 15_000);
  request.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
}

function openProjectCreationEventStream(
  request: IncomingMessage,
  response: ServerResponse,
  creationService: ProjectCreationService,
): void {
  response.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
  });
  response.write(`data: ${JSON.stringify({ type: "refresh" })}\n\n`);
  const unsubscribe = creationService.subscribe((event) => response.write(`data: ${JSON.stringify(event)}\n\n`));
  const heartbeat = setInterval(() => response.write(": keep-alive\n\n"), 15_000);
  request.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
}

async function readBinaryBody(request: IncomingMessage, maximum = 5_000_000): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maximum) throw new Error("Uploaded image is too large.");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

function openSystemRoadmapEventStream(
  request: IncomingMessage,
  response: ServerResponse,
  planningService: SystemRoadmapPlanningService,
): void {
  response.writeHead(200, {
    "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive",
  });
  response.write(`data: ${JSON.stringify({ type: "refresh" })}\n\n`);
  const unsubscribe = planningService.subscribe((event) => response.write(`data: ${JSON.stringify(event)}\n\n`));
  const heartbeat = setInterval(() => response.write(": keep-alive\n\n"), 15_000);
  request.on("close", () => { clearInterval(heartbeat); unsubscribe(); });
}

function openSystemQuestEventStream(
  request: IncomingMessage,
  response: ServerResponse,
  planningService: SystemQuestPlanningService,
): void {
  response.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive" });
  response.write(`data: ${JSON.stringify({ type: "refresh" })}\n\n`);
  const unsubscribe = planningService.subscribe((event) => response.write(`data: ${JSON.stringify(event)}\n\n`));
  const heartbeat = setInterval(() => response.write(": keep-alive\n\n"), 15_000);
  request.on("close", () => { clearInterval(heartbeat); unsubscribe(); });
}

function openGeneratedRunEventStream(
  request: IncomingMessage,
  response: ServerResponse,
  generatedRunner: GeneratedQuestRunnerHost,
  projectId: string,
  questId: string,
): void {
  response.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
  });
  response.write(`data: ${JSON.stringify({ type: "refresh", projectId, questId } satisfies GeneratedQuestRunEvent)}\n\n`);
  const unsubscribe = generatedRunner.subscribe((event) => {
    if (event.projectId === projectId && event.questId === questId) response.write(`data: ${JSON.stringify(event)}\n\n`);
  });
  const heartbeat = setInterval(() => response.write(": keep-alive\n\n"), 15_000);
  request.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
}

function safePathId(value: string | undefined, label: string): string {
  const decoded = decodeURIComponent(value ?? "");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(decoded)) throw new Error(`A safe ${label} is required.`);
  return decoded;
}

function requireExactKeys(body: Record<string, unknown>, keys: string[], message: string): void {
  const actual = Object.keys(body).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(message);
}

function requireSameOrigin(request: IncomingMessage): void {
  const origin = request.headers.origin;
  const host = request.headers.host;
  if (!origin || !host) throw new Error("Creation mutations require a same-origin request.");
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    throw new Error("Creation mutations require a valid same-origin request.");
  }
  if (parsed.protocol !== "http:" || parsed.host !== host || !["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname)) {
    throw new Error("Creation mutations require the current loopback Forge origin.");
  }
}

function tokensMatch(received: string | undefined, expected: string): boolean {
  if (!received) return false;
  const left = Buffer.from(received, "utf8");
  const right = Buffer.from(expected, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createForgeDashboardServer(
  service: ForgeDashboardService,
  staticRoot: string,
  planningService?: BlueprintPlanningService,
  creationService?: ProjectCreationService,
  generatedWorldService?: GeneratedProjectWorldService,
  generatedRunner?: GeneratedQuestRunnerHost,
  systemRoadmapPlanningService?: SystemRoadmapPlanningService,
  systemQuestPlanningService?: SystemQuestPlanningService,
): Server {
  const resolvedStaticRoot = path.resolve(staticRoot);
  const projectMutationTails = new Map<string, Promise<void>>();
  const withProjectMutation = async <T>(projectId: string, mutation: () => Promise<T>): Promise<T> => {
    const previous = projectMutationTails.get(projectId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => { release = resolve; });
    const tail = previous.then(() => current);
    projectMutationTails.set(projectId, tail);
    await previous;
    try {
      return await mutation();
    } finally {
      release();
      if (projectMutationTails.get(projectId) === tail) projectMutationTails.delete(projectId);
    }
  };
  let creationMutationToken = randomBytes(32).toString("hex");
  const creationState = async () => ({
    creation: creationService?.getSnapshot(),
    recentProjects: creationService ? await creationService.listRecentProjects() : [],
    mutationToken: creationMutationToken,
  });
  const consumeCreationToken = (request: IncomingMessage): void => {
    requireSameOrigin(request);
    const received = request.headers["x-forge-mutation-token"];
    if (Array.isArray(received) || !tokensMatch(received, creationMutationToken)) {
      throw new Error("The creation mutation token is missing, invalid, or already used. Refresh Forge before retrying.");
    }
    creationMutationToken = randomBytes(32).toString("hex");
  };
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      if (request.method === "GET" && url.pathname === "/api/state") {
        sendJson(response, 200, await service.getSnapshot());
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/events") {
        openEventStream(request, response, service);
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/planning/state" && planningService) {
        sendJson(response, 200, planningService.getSnapshot());
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/planning/events" && planningService) {
        openPlanningEventStream(request, response, planningService);
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/projects/state" && creationService) {
        sendJson(response, 200, await creationState());
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/projects/events" && creationService) {
        openProjectCreationEventStream(request, response, creationService);
        return;
      }
      const generatedQuestRoute = url.pathname.match(/^\/api\/projects\/([^/]+)\/quests\/([^/]+)\/(adjust|defer|prepare|approve|start|run|events|cancel|play|confirm|rollback)$/u);
      if (generatedQuestRoute && generatedRunner) {
        const projectId = safePathId(generatedQuestRoute[1], "project ID");
        const questId = safePathId(generatedQuestRoute[2], "quest ID");
        const action = generatedQuestRoute[3]!;
        if (request.method === "GET" && action === "run") {
          const summary = await generatedRunner.getSummary(projectId, questId);
          if (!summary.run) throw new GeneratedQuestRunNotFoundError("No generated run exists for this quest.");
          sendJson(response, 200, summary.run);
          return;
        }
        if (request.method === "GET" && action === "events") {
          openGeneratedRunEventStream(request, response, generatedRunner, projectId, questId);
          return;
        }
        if (request.method !== "POST") {
          sendJson(response, 404, { error: "Not found" });
          return;
        }
        requireSameOrigin(request);
        const body = await readJsonBody(request);
        if (action === "adjust") {
          requireExactKeys(body, ["expectedRevision", "visibleOutcome", "includedScope"], "Adjust accepts only expectedRevision, visibleOutcome, and includedScope.");
          if (!Number.isInteger(body.expectedRevision) || typeof body.visibleOutcome !== "string" || !Array.isArray(body.includedScope) || body.includedScope.some((item) => typeof item !== "string")) throw new Error("Adjust requires a revision, visible outcome, and string scope list.");
          sendJson(response, 200, await generatedRunner.adjust(projectId, questId, {
            expectedRevision: body.expectedRevision as number,
            visibleOutcome: body.visibleOutcome,
            includedScope: body.includedScope as string[],
          }));
          return;
        }
        if (action === "defer") {
          requireExactKeys(body, ["expectedRevision"], "Defer accepts only expectedRevision.");
          if (!Number.isInteger(body.expectedRevision)) throw new Error("Defer requires the current quest revision.");
          sendJson(response, 200, await generatedRunner.defer(projectId, questId, body.expectedRevision as number));
          return;
        }
        if (action === "prepare") {
          requireExactKeys(body, [], "Prepare accepts no browser-supplied authority values.");
          sendJson(response, 201, await withProjectMutation(projectId, () => generatedRunner.prepare(projectId, questId)));
          return;
        }
        if (action === "approve") {
          requireExactKeys(body, ["fingerprint", "decision"], "Approve accepts only the reviewed fingerprint and decision.");
          if (typeof body.fingerprint !== "string" || body.decision !== "APPROVE") throw new Error("Approve requires the exact contract fingerprint and APPROVE decision.");
          sendJson(response, 200, await generatedRunner.approve(projectId, questId, body.fingerprint, "APPROVE"));
          return;
        }
        if (action === "start") {
          requireExactKeys(body, [], "Start accepts no browser-supplied path, model, command, verifier, or Git values.");
          sendJson(response, 202, await generatedRunner.start(projectId, questId));
          return;
        }
        if (action === "cancel") {
          requireExactKeys(body, ["decision"], "Cancel accepts only the exact decision.");
          if (body.decision !== "CANCEL") throw new Error("Cancel requires the exact CANCEL decision.");
          sendJson(response, 200, await generatedRunner.cancel(projectId, questId, "CANCEL"));
          return;
        }
        if (action === "play") {
          requireExactKeys(body, [], "Play accepts no caller-supplied path or process arguments.");
          sendJson(response, 202, await generatedRunner.play(projectId, questId));
          return;
        }
        if (action === "confirm") {
          requireExactKeys(body, ["result"], "Confirm accepts only the creator result.");
          sendJson(response, 200, await generatedRunner.confirm(projectId, questId, body.result));
          return;
        }
        if (action === "rollback") {
          requireExactKeys(body, ["confirmation"], "Rollback accepts only the exact reviewed confirmation.");
          if (body.confirmation !== "ROLL BACK REVIEWED CHANGES") throw new Error("Rollback requires the exact reviewed confirmation.");
          sendJson(response, 200, await generatedRunner.rollback(projectId, questId, "ROLL BACK REVIEWED CHANGES"));
          return;
        }
      }
      const generatedAssetMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/assets\/content$/u);
      if ((request.method === "GET" || request.method === "HEAD") && generatedAssetMatch && generatedWorldService) {
        const projectId = safePathId(generatedAssetMatch[1], "project ID");
        const relativePath = url.searchParams.get("path");
        if (!relativePath) throw new Error("Choose a project asset.");
        const asset = await generatedWorldService.resolveAsset(projectId, relativePath);
        response.writeHead(200, { "content-type": asset.contentType, "content-length": asset.size, "cache-control": "no-store" });
        if (request.method === "HEAD") response.end();
        else createReadStream(asset.filePath).pipe(response);
        return;
      }
      const generatedPresentationMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/presentation$/u);
      if (request.method === "POST" && generatedPresentationMatch && generatedWorldService) {
        requireSameOrigin(request);
        const projectId = safePathId(generatedPresentationMatch[1], "project ID");
        const body = await readJsonBody(request);
        if (typeof body.action !== "string") throw new Error("Choose a Forge presentation action.");
        const keysByAction: Record<string, string[]> = {
          edit_entity: ["acceptanceCriteria", "action", "description", "entityId", "name", "outcome"],
          choose_image: ["action", "entityId", "relativePath"],
          restore_image: ["action", "entityId"],
          record_feedback: ["action", "entityId", "note", "relatedFiles", "result"],
          save_tunable: ["action", "tunable"],
          reset_tunable: ["action", "tunableId"],
        };
        const expected = keysByAction[body.action];
        if (!expected || Object.keys(body).sort().join(",") !== [...expected].sort().join(",")) throw new Error("Forge presentation data contains unsupported fields.");
        sendJson(response, 200, await generatedWorldService.mutatePresentation(projectId, body as unknown as ForgePresentationMutation));
        return;
      }
      const generatedPresentationImageMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/presentation\/image$/u);
      if (request.method === "POST" && generatedPresentationImageMatch && generatedWorldService) {
        requireSameOrigin(request);
        const projectId = safePathId(generatedPresentationImageMatch[1], "project ID");
        const entityId = safePathId(typeof request.headers["x-forge-entity-id"] === "string" ? request.headers["x-forge-entity-id"] : undefined, "entity ID");
        const extension = typeof request.headers["x-forge-image-extension"] === "string" ? request.headers["x-forge-image-extension"] : "png";
        sendJson(response, 201, await generatedWorldService.uploadPresentationImage(projectId, entityId, await readBinaryBody(request), extension));
        return;
      }
      const generatedWorldMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/world$/u);
      if (request.method === "GET" && generatedWorldMatch && generatedWorldService) {
        const projectId = decodeURIComponent(generatedWorldMatch[1]!);
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(projectId)) throw new Error("A safe project ID is required.");
        sendJson(response, 200, await generatedWorldService.loadWorld(projectId));
        return;
      }
      const generatedOpenMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/open$/u);
      if (request.method === "POST" && generatedOpenMatch && generatedWorldService) {
        requireSameOrigin(request);
        const projectId = decodeURIComponent(generatedOpenMatch[1]!);
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(projectId)) throw new Error("A safe project ID is required.");
        const body = await readJsonBody(request);
        if (Object.keys(body).length !== 0) throw new Error("Opening Project World accepts only the registered project ID from the request path.");
        sendJson(response, 200, await generatedWorldService.openWorld(projectId));
        return;
      }
      const generatedStateMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/state$/u);
      if (request.method === "POST" && generatedStateMatch && generatedWorldService) {
        requireSameOrigin(request);
        const projectId = decodeURIComponent(generatedStateMatch[1]!);
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(projectId)) throw new Error("A safe project ID is required.");
        const body = await readJsonBody(request);
        if (Object.keys(body).some((key) => key !== "currentView" && key !== "selectedQuestId")) throw new Error("Project state accepts only currentView and selectedQuestId.");
        if (typeof body.currentView !== "string" || (body.selectedQuestId !== null && typeof body.selectedQuestId !== "string")) throw new Error("A Project World view and optional selected quest are required.");
        sendJson(response, 200, await generatedWorldService.saveState(projectId, {
          currentView: body.currentView as GeneratedWorldView,
          selectedQuestId: body.selectedQuestId as string | null,
        } satisfies GeneratedWorldStateInput));
        return;
      }
      const generatedIdeaMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/ideas$/u);
      if (request.method === "POST" && generatedIdeaMatch && generatedWorldService) {
        requireSameOrigin(request);
        const projectId = decodeURIComponent(generatedIdeaMatch[1]!);
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(projectId)) throw new Error("A safe project ID is required.");
        const body = await readJsonBody(request);
        if (Object.keys(body).some((key) => key !== "idea") || typeof body.idea !== "string") throw new Error("Idea saving accepts only creator idea text.");
        sendJson(response, 201, await generatedWorldService.saveIdea(projectId, body.idea));
        return;
      }
      const generatedLaunchMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/launch$/u);
      if (request.method === "POST" && generatedLaunchMatch && generatedWorldService) {
        requireSameOrigin(request);
        const projectId = decodeURIComponent(generatedLaunchMatch[1]!);
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(projectId)) throw new Error("A safe project ID is required.");
        const body = await readJsonBody(request);
        if (Object.keys(body).length !== 0) throw new Error("Godot launch accepts only the registered project ID from the request path.");
        sendJson(response, 202, await generatedWorldService.launch(projectId));
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/projects/create" && creationService && planningService) {
        consumeCreationToken(request);
        const body = await readJsonBody(request);
        if (body.confirmation !== "CONFIRM CREATE") throw new Error("Project creation requires the exact final confirmation.");
        const approved = planningService.getApprovedBlueprint();
        if (!approved) throw new ProjectCreationConflictError("A validated approved blueprint is required before project creation.");
        creationService.beginCreation(approved);
        sendJson(response, 202, await creationState());
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/projects/create/cancel" && creationService) {
        consumeCreationToken(request);
        const body = await readJsonBody(request);
        if (body.action !== "CANCEL CREATE") throw new Error("Project creation cancellation requires the exact action.");
        creationService.cancelCreation();
        sendJson(response, 202, await creationState());
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/projects/create-open" && creationService) {
        consumeCreationToken(request);
        const body = await readJsonBody(request);
        requireExactKeys(body, ["displayName"], "Open project creation accepts only the project name.");
        if (typeof body.displayName !== "string") throw new Error("A project name is required.");
        creationService.beginOpenCreation(body.displayName);
        sendJson(response, 202, await creationState());
        return;
      }
      const systemQuestRoute = url.pathname.match(/^\/api\/projects\/([^/]+)\/systems\/([^/]+)\/quest-planning\/(state|events|files|start|answers|revise|retry|accept-quests|review-work-order|accept-work-order|cancel)$/u);
      if (systemQuestRoute && systemQuestPlanningService && generatedWorldService) {
        const projectId = safePathId(systemQuestRoute[1], "project ID");
        const systemId = safePathId(systemQuestRoute[2], "system ID");
        const action = systemQuestRoute[3]!;
        const active = systemQuestPlanningService.getSnapshot();
        const planningIsWritingOrRunning = ["planning", "revising", "accepting_quests", "accepting_work_order"].includes(active.phase);
        if (active.projectId && (active.projectId !== projectId || active.systemId !== systemId) && planningIsWritingOrRunning) {
          throw new SystemQuestPlanningConflictError("Quest planning is open for another system.");
        }
        if (request.method === "GET" && action === "state") {
          const world = await generatedWorldService.loadWorld(projectId);
          const targetQuestId = url.searchParams.has("questId") ? safePathId(url.searchParams.get("questId") ?? undefined, "quest ID") : undefined;
          sendJson(response, 200, systemQuestPlanningService.getSnapshotFor(projectId, systemId, world.systemQuestPlan, targetQuestId));
          return;
        }
        if (request.method === "GET" && action === "events") {
          openSystemQuestEventStream(request, response, systemQuestPlanningService);
          return;
        }
        if (request.method === "GET" && action === "files") {
          sendJson(response, 200, await generatedWorldService.listSystemQuestFiles(projectId, systemId));
          return;
        }
        if (request.method !== "POST") { sendJson(response, 404, { error: "Not found" }); return; }
        requireSameOrigin(request);
        const body = await readJsonBody(request);
        if (action === "start") {
          requireExactKeys(body, ["description"], "Quest refinement accepts only the creator description.");
          if (typeof body.description !== "string") throw new Error("A system description is required.");
          const world = await generatedWorldService.loadWorld(projectId);
          systemQuestPlanningService.begin(world.projectModel, systemId, body.description);
          sendJson(response, 202, systemQuestPlanningService.getSnapshot());
          return;
        }
        if (action === "answers") {
          requireExactKeys(body, ["answers"], "Quest-planning answers accept only the shown answers.");
          if (!Array.isArray(body.answers) || body.answers.some((answer) => !answer || typeof answer !== "object" || Array.isArray(answer) || Object.keys(answer).sort().join(",") !== "answer,questionId" || typeof (answer as Record<string, unknown>).questionId !== "string" || typeof (answer as Record<string, unknown>).answer !== "string")) throw new Error("Quest-planning answers must match the shown questions.");
          systemQuestPlanningService.submitAnswers(body.answers as Array<{ questionId: string; answer: string }>);
          sendJson(response, 202, systemQuestPlanningService.getSnapshot());
          return;
        }
        if (action === "revise") {
          requireExactKeys(body, ["request"], "Quest revision accepts only the creator request.");
          if (typeof body.request !== "string") throw new Error("A revision request is required.");
          systemQuestPlanningService.revise(body.request);
          sendJson(response, 202, systemQuestPlanningService.getSnapshot());
          return;
        }
        if (action === "retry") {
          requireExactKeys(body, [], "Quest-planning retry accepts no authority values.");
          systemQuestPlanningService.retry();
          sendJson(response, 202, systemQuestPlanningService.getSnapshot());
          return;
        }
        if (action === "accept-quests") {
          requireExactKeys(body, ["decision", "fingerprint"], "Quest acceptance accepts only the exact decision and fingerprint.");
          if (body.decision !== "ACCEPT SYSTEM QUESTS" || typeof body.fingerprint !== "string") throw new Error("Quest acceptance requires the exact decision and current fingerprint.");
          await withProjectMutation(projectId, async () => {
            const world = await generatedWorldService.loadWorld(projectId);
            await systemQuestPlanningService.acceptQuests("ACCEPT SYSTEM QUESTS", body.fingerprint as string, world.projectModel, world.systemQuestPlan, (batch) => generatedWorldService.saveSystemQuestBatch(projectId, batch));
          });
          sendJson(response, 200, systemQuestPlanningService.getSnapshot());
          return;
        }
        if (action === "review-work-order") {
          requireExactKeys(body, "questId" in body ? ["existingFiles", "newFiles", "questId"] : ["existingFiles", "newFiles"], "Work-order review accepts only the selected quest and exact existing and new file lists.");
          if (!Array.isArray(body.existingFiles) || !Array.isArray(body.newFiles) || [...body.existingFiles, ...body.newFiles].some((item) => typeof item !== "string")) throw new Error("Work-order files must be exact path lists.");
          const world = await generatedWorldService.loadWorld(projectId);
          const targetQuestId = "questId" in body ? safePathId(typeof body.questId === "string" ? body.questId : undefined, "quest ID") : undefined;
          systemQuestPlanningService.restorePersisted(projectId, systemId, world.systemQuestPlan, targetQuestId);
          const snapshot = systemQuestPlanningService.getSnapshot();
          if (!snapshot.firstQuestId) throw new SystemQuestPlanningConflictError("Accept quests before reviewing a work order.");
          const review = await generatedWorldService.reviewSystemQuestWorkOrder(projectId, systemId, snapshot.firstQuestId, { existingFiles: body.existingFiles as string[], newFiles: body.newFiles as string[] });
          systemQuestPlanningService.setWorkOrderReview(review);
          sendJson(response, 200, systemQuestPlanningService.getSnapshot());
          return;
        }
        if (action === "accept-work-order") {
          requireExactKeys(body, ["decision", "fingerprint"], "Work-order acceptance accepts only the exact decision and fingerprint.");
          if (body.decision !== "ACCEPT QUEST WORK ORDER" || typeof body.fingerprint !== "string") throw new Error("Work-order acceptance requires the exact decision and current fingerprint.");
          await withProjectMutation(projectId, async () => {
            const snapshot = systemQuestPlanningService.getSnapshot();
            const draft = snapshot.workOrder;
            if (!draft || snapshot.projectId !== projectId || snapshot.systemId !== systemId) throw new SystemQuestPlanningConflictError("Review the exact work order before accepting it.");
            await systemQuestPlanningService.acceptWorkOrder("ACCEPT QUEST WORK ORDER", body.fingerprint as string, () => generatedWorldService.saveSystemQuestWorkOrder(projectId, systemId, draft.questId, { existingFiles: draft.existingFiles, newFiles: draft.newFiles }, draft.fingerprint));
          });
          sendJson(response, 200, systemQuestPlanningService.getSnapshot());
          return;
        }
        if (action === "cancel") {
          requireExactKeys(body, ["decision"], "Quest-planning cancellation accepts only the exact decision.");
          if (body.decision !== "CANCEL QUEST PLANNING") throw new Error("Quest-planning cancellation requires the exact decision.");
          const world = await generatedWorldService.loadWorld(projectId);
          if (world.systemQuestPlan?.systems.some((system) => system.systemId === systemId)) systemQuestPlanningService.restorePersisted(projectId, systemId, world.systemQuestPlan);
          systemQuestPlanningService.cancel("CANCEL QUEST PLANNING", world.systemQuestPlan);
          sendJson(response, 200, systemQuestPlanningService.getSnapshotFor(projectId, systemId, world.systemQuestPlan));
          return;
        }
      }
      const systemPlanningRoute = url.pathname.match(/^\/api\/projects\/([^/]+)\/system-planning\/(state|events|start|answers|revise|retry|accept|cancel)$/u);
      if (systemPlanningRoute && systemRoadmapPlanningService && generatedWorldService) {
        const projectId = safePathId(systemPlanningRoute[1], "project ID");
        const action = systemPlanningRoute[2]!;
        const planningSnapshot = systemRoadmapPlanningService.getSnapshot();
        const planningProjectId = planningSnapshot.projectId;
        if (planningProjectId && planningProjectId !== projectId && !["accepted", "cancelled"].includes(planningSnapshot.phase)) {
          throw new SystemRoadmapPlanningConflictError("System planning is open for another project.");
        }
        if (request.method === "GET" && action === "state") {
          sendJson(response, 200, systemRoadmapPlanningService.getSnapshotForProject(projectId));
          return;
        }
        if (request.method === "GET" && action === "events") {
          openSystemRoadmapEventStream(request, response, systemRoadmapPlanningService);
          return;
        }
        if (request.method !== "POST") { sendJson(response, 404, { error: "Not found" }); return; }
        requireSameOrigin(request);
        const body = await readJsonBody(request);
        if (action === "start") {
          requireExactKeys(body, ["idea"], "System planning accepts only the creator idea.");
          if (typeof body.idea !== "string") throw new Error("A creator idea is required.");
          const world = await generatedWorldService.loadWorld(projectId);
          systemRoadmapPlanningService.begin(world.projectModel, body.idea);
          sendJson(response, 202, systemRoadmapPlanningService.getSnapshot());
          return;
        }
        if (action === "answers") {
          requireExactKeys(body, ["answers"], "System planning answers accept only the shown answers.");
          if (!Array.isArray(body.answers) || body.answers.some((answer) => !answer || typeof answer !== "object" || Array.isArray(answer) || Object.keys(answer).sort().join(",") !== "answer,questionId" || typeof (answer as Record<string, unknown>).questionId !== "string" || typeof (answer as Record<string, unknown>).answer !== "string")) {
            throw new Error("System planning answers must match the shown questions.");
          }
          systemRoadmapPlanningService.submitAnswers(body.answers as Array<{ questionId: string; answer: string }>);
          sendJson(response, 202, systemRoadmapPlanningService.getSnapshot());
          return;
        }
        if (action === "revise") {
          requireExactKeys(body, ["request"], "System roadmap revision accepts only the creator request.");
          if (typeof body.request !== "string") throw new Error("A revision request is required.");
          systemRoadmapPlanningService.revise(body.request);
          sendJson(response, 202, systemRoadmapPlanningService.getSnapshot());
          return;
        }
        if (action === "retry") {
          requireExactKeys(body, [], "System planning retry accepts no authority values.");
          systemRoadmapPlanningService.retry();
          sendJson(response, 202, systemRoadmapPlanningService.getSnapshot());
          return;
        }
        if (action === "accept") {
          requireExactKeys(body, ["decision", "fingerprint"], "System roadmap acceptance accepts only the exact decision and fingerprint.");
          if (body.decision !== "ACCEPT SYSTEM ROADMAP" || typeof body.fingerprint !== "string") throw new Error("System roadmap acceptance requires the exact decision and current fingerprint.");
          const fingerprint = body.fingerprint;
          await withProjectMutation(projectId, async () => {
            const current = await generatedWorldService.loadWorld(projectId);
            await systemRoadmapPlanningService.accept("ACCEPT SYSTEM ROADMAP", fingerprint, current.projectModel, (roadmap) => generatedWorldService.saveSystemRoadmap(projectId, roadmap));
          });
          sendJson(response, 200, systemRoadmapPlanningService.getSnapshot());
          return;
        }
        if (action === "cancel") {
          requireExactKeys(body, ["decision"], "System planning cancellation accepts only the exact decision.");
          if (body.decision !== "CANCEL SYSTEM PLANNING") throw new Error("System planning cancellation requires the exact decision.");
          systemRoadmapPlanningService.cancel("CANCEL SYSTEM PLANNING");
          sendJson(response, 200, systemRoadmapPlanningService.getSnapshot());
          return;
        }
      }
      if (request.method === "POST" && url.pathname === "/api/projects/create/reset" && creationService) {
        consumeCreationToken(request);
        const body = await readJsonBody(request);
        requireExactKeys(body, ["action"], "Failed creation reset accepts only the exact action.");
        if (body.action !== "RESET FAILED CREATION") throw new Error("Failed creation reset requires RESET FAILED CREATION.");
        creationService.resetFailure();
        sendJson(response, 200, await creationState());
        return;
      }
      if (request.method === "GET" && url.pathname.startsWith("/api/projects/") && creationService) {
        const projectId = decodeURIComponent(url.pathname.slice("/api/projects/".length));
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(projectId)) throw new Error("A safe project ID is required.");
        sendJson(response, 200, await creationService.getCreatedProject(projectId));
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/projects/open-folder" && creationService) {
        requireSameOrigin(request);
        const body = await readJsonBody(request);
        if (Object.keys(body).some((key) => key !== "projectId") || typeof body.projectId !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(body.projectId)) throw new Error("Folder opening accepts only a safe registered project ID.");
        await creationService.openProjectFolder(body.projectId);
        sendJson(response, 200, { opened: true });
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/planning/start" && planningService) {
        const body = await readJsonBody(request);
        requireExactKeys(body, ["idea"], "Planning intake accepts only the creator idea.");
        if (typeof body.idea !== "string") throw new Error("A game idea is required.");
        planningService.beginIdea(body.idea);
        sendJson(response, 202, planningService.getSnapshot());
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/planning/answers" && planningService) {
        const body = await readJsonBody(request);
        requireExactKeys(body, ["answers"], "Clarification accepts only the answers object.");
        if (!body.answers || typeof body.answers !== "object" || Array.isArray(body.answers)) {
          throw new Error("Clarification answers must be a JSON object.");
        }
        planningService.submitAnswers(body.answers as Partial<Record<ClarificationTopic, string>>);
        sendJson(response, 202, planningService.getSnapshot());
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/planning/revise" && planningService) {
        const body = await readJsonBody(request);
        requireExactKeys(body, ["action"], "Planning revision accepts only the exact action.");
        if (body.action !== "REVISE") throw new Error("Planning revision requires REVISE.");
        planningService.reviseIdea();
        sendJson(response, 200, planningService.getSnapshot());
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/planning/cancel" && planningService) {
        const body = await readJsonBody(request);
        requireExactKeys(body, ["action"], "Planning cancellation accepts only the exact action.");
        if (body.action !== "CANCEL") throw new Error("Planning cancellation requires CANCEL.");
        planningService.cancel();
        sendJson(response, 200, planningService.getSnapshot());
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/planning/approve" && planningService) {
        const body = await readJsonBody(request);
        requireExactKeys(body, ["decision"], "Interpretation approval accepts only the exact decision.");
        if (body.decision !== "ACCEPT INTERPRETATION") throw new Error("Interpretation approval requires ACCEPT INTERPRETATION.");
        planningService.approveBlueprint();
        sendJson(response, 200, planningService.getSnapshot());
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/planning/roadmap/edit" && planningService) {
        const body = await readJsonBody(request);
        const kind = body.kind;
        if (kind === "quest_title_changed") requireExactKeys(body, ["kind", "reference", "title"], "Title edits accept only kind, reference, and title.");
        else if (kind === "quest_outcome_changed") requireExactKeys(body, ["kind", "reference", "visibleOutcome"], "Outcome edits accept only kind, reference, and visibleOutcome.");
        else if (kind === "quest_removed") requireExactKeys(body, ["kind", "reference"], "Removal accepts only kind and reference.");
        else if (kind === "quest_reordered") requireExactKeys(body, ["kind", "references"], "Reorder accepts only kind and references.");
        else if (kind === "optional_delta_added") requireExactKeys(body, ["kind", "deltaId"], "Optional additions accept only kind and deltaId.");
        else throw new Error("Unknown roadmap edit kind.");
        planningService.reviseRoadmap(body as unknown as RoadmapEdit);
        sendJson(response, 200, planningService.getSnapshot());
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/planning/roadmap/accept" && planningService) {
        const body = await readJsonBody(request);
        requireExactKeys(body, ["decision", "fingerprint"], "Roadmap acceptance accepts only the decision and current fingerprint.");
        if (body.decision !== "ACCEPT ROADMAP" || typeof body.fingerprint !== "string") throw new Error("Roadmap acceptance requires ACCEPT ROADMAP and its current fingerprint.");
        planningService.acceptRoadmap(body.fingerprint);
        sendJson(response, 200, planningService.getSnapshot());
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/planning/reject" && planningService) {
        const body = await readJsonBody(request);
        requireExactKeys(body, ["decision"], "Plan rejection accepts only the exact decision.");
        if (body.decision !== "REJECT PLAN") throw new Error("Plan rejection requires REJECT PLAN.");
        planningService.cancel();
        sendJson(response, 200, planningService.getSnapshot());
        return;
      }
      if (
        request.method === "POST" &&
        url.pathname === "/api/quests/enemy-targeting/run"
      ) {
        const body = await readJsonBody(request);
        if (body.approval !== "APPROVE" && body.approval !== "CANCEL") {
          throw new Error("Approval must be APPROVE or CANCEL.");
        }
        service.beginRun(body.approval);
        sendJson(response, body.approval === "APPROVE" ? 202 : 200, {
          accepted: body.approval === "APPROVE",
        });
        return;
      }
      if (
        request.method === "POST" &&
        url.pathname === "/api/quests/enemy-targeting/play"
      ) {
        await service.beginLaunch();
        sendJson(response, 200, await service.getSnapshot());
        return;
      }
      if (
        request.method === "POST" &&
        url.pathname === "/api/quests/enemy-targeting/confirm"
      ) {
        const body = await readJsonBody(request);
        const responseValue = body.response;
        if (
          responseValue !== "I SAW IT WORK" &&
          responseValue !== "IT DID NOT WORK" &&
          responseValue !== "CANCEL"
        ) {
          throw new Error("Creator response must be one of the three exact confirmation values.");
        }
        await service.confirmCreatorResult(responseValue as CreatorConfirmation);
        sendJson(response, 200, await service.getSnapshot());
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/demo/reset") {
        const body = await readJsonBody(request);
        if (body.action !== "CONFIRM RESET" && body.action !== "CANCEL") {
          throw new Error("Demo reset action must be CONFIRM RESET or CANCEL.");
        }
        await service.resetDemo(body.action);
        sendJson(response, 200, await service.getSnapshot());
        return;
      }
      if (request.method === "GET" || request.method === "HEAD") {
        await serveDashboardAsset(url.pathname, response, resolvedStaticRoot);
        return;
      }
      sendJson(response, 404, { error: "Not found" });
    } catch (error) {
      const status = error instanceof GeneratedProjectWorldNotFoundError || error instanceof GeneratedQuestRunNotFoundError
        ? 404
        : error instanceof DashboardConflictError || error instanceof BlueprintPlanningConflictError || error instanceof SystemRoadmapPlanningConflictError || error instanceof SystemQuestPlanningConflictError || error instanceof ProjectCreationConflictError || error instanceof GeneratedProjectWorldConflictError || error instanceof GeneratedQuestRunConflictError
          ? 409
          : 400;
      sendJson(response, status, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}
