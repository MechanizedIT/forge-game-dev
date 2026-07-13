import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import path from "node:path";

import type { CreatorConfirmation, DashboardEvent } from "../dashboard/shared.js";
import { DashboardConflictError, ForgeDashboardService } from "./service.js";

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
    "cache-control": filePath.endsWith("index.html") ? "no-store" : "public, max-age=3600",
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

export function createForgeDashboardServer(
  service: ForgeDashboardService,
  staticRoot: string,
): Server {
  const resolvedStaticRoot = path.resolve(staticRoot);
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
      if (request.method === "GET" || request.method === "HEAD") {
        await serveDashboardAsset(url.pathname, response, resolvedStaticRoot);
        return;
      }
      sendJson(response, 404, { error: "Not found" });
    } catch (error) {
      const status = error instanceof DashboardConflictError ? 409 : 400;
      sendJson(response, status, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}
