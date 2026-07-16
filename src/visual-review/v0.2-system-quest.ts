import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { once } from "node:events";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";

import { chromium, type Browser, type Page } from "@playwright/test";

import { BlueprintPlanningService } from "../blueprint-planner/service.js";
import { SystemRoadmapPlanningService, fingerprintProjectStructure } from "../blueprint-planner/system-roadmap.js";
import { SystemQuestPlanningService } from "../blueprint-planner/system-quest.js";
import type { BlueprintModelExecutor, BlueprintModelSession, BlueprintModelTurn } from "../blueprint-planner/types.js";
import { createForgeDashboardServer } from "../dashboard-host/server.js";
import { ForgeDashboardService } from "../dashboard-host/service.js";
import { repositoryRoot, resolveForgeHome } from "../demo/paths.js";
import { GeneratedProjectWorldService } from "../generated-project-world/service.js";
import { ProjectCreationService } from "../project-creation/service.js";

const projectId = "last-moment-pulse-6631032087";
const evidenceRoot = path.join(repositoryRoot, "docs", "evidence", "2026-07-15-alpha-pivot-system-quest-refinement");
const report = { date: "2026-07-15", browser: "", channel: "", states: [] as string[], screenshots: [] as string[], unchangedProjectFiles: 0, gitStatusBefore: [] as string[], gitStatusAfter: [] as string[], issues: [] as string[], result: "PASS" as "PASS" | "FAIL" };

class QueueExecutor implements BlueprintModelExecutor {
  constructor(private readonly responses: string[]) {}
  start(): BlueprintModelSession { return { run: async (): Promise<BlueprintModelTurn> => {
    const finalResponse = this.responses.shift();
    if (finalResponse === undefined) throw new Error("No visual-review response remains.");
    return { finalResponse, threadId: "system-quest-visual", usage: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 1, reasoningOutputTokens: 0 } };
  } }; }
}

function proposal(): string {
  return JSON.stringify({ resultType: "proposal", quests: [
    { title: "Welcome the Player", playerVisibleOutcome: "A warm harbor beacon greets the player with one clear pulse.", whyItMatters: "The first response makes the harbor feel alive and understandable.", doneWhen: ["A warm pulse is visible when the system begins."], excludedScope: ["No weather or scoring system."], dependencyIndexes: [] },
    { title: "Answer the Beacon", playerVisibleOutcome: "A small harbor light answers after the welcome pulse.", whyItMatters: "The answer makes the world feel connected to the beacon.", doneWhen: ["The answer follows the first pulse."], excludedScope: ["No new level or inventory."], dependencyIndexes: [0] },
  ] });
}

async function launchBrowser(): Promise<Browser> {
  for (const item of [{ channel: "msedge" as const, name: "Microsoft Edge" }, { channel: "chrome" as const, name: "Google Chrome" }]) {
    try { const value = await chromium.launch({ channel: item.channel, headless: true }); report.browser = item.name; report.channel = item.channel; return value; } catch {}
  }
  const value = await chromium.launch({ headless: true }); report.browser = "Playwright Chromium"; report.channel = "chromium"; return value;
}

async function fixture(root: string) {
  const sourceHome = resolveForgeHome();
  const forgeHome = path.join(root, "Forge");
  const projectPath = path.join(forgeHome, "projects", projectId);
  await mkdir(path.dirname(projectPath), { recursive: true });
  await cp(path.join(sourceHome, "projects", projectId), projectPath, { recursive: true });
  await rm(path.join(projectPath, ".forge", "system-roadmap.json"), { force: true });
  await rm(path.join(projectPath, ".forge", "system-quests.json"), { force: true });
  const sourceRegistry = JSON.parse(await readFile(path.join(sourceHome, "project-registry.json"), "utf8")) as { projects: Array<Record<string, unknown>> };
  const entry = sourceRegistry.projects.find((item) => item.projectId === projectId);
  if (!entry) throw new Error(`Registered source project missing: ${projectId}`);
  await writeFile(path.join(forgeHome, "project-registry.json"), `${JSON.stringify({ schemaVersion: 1, projects: [{ ...entry, canonicalPath: projectPath }] }, null, 2)}\n`, "utf8");
  const world = new GeneratedProjectWorldService({ forgeHome });
  const current = await world.loadWorld(projectId);
  const original = current.projectModel.systems[0]!;
  await world.saveSystemRoadmap(projectId, {
    schemaVersion: 1, projectId,
    creatorIdea: "A harbor game where a warm beacon welcomes the player before storms arrive.",
    sourceFingerprint: fingerprintProjectStructure(current.projectModel), proposalFingerprint: "a".repeat(64), acceptedAt: "2026-07-15T20:00:00.000Z",
    systems: [
      { systemId: original.systemId, title: original.title, outcome: original.outcome, questIds: original.questIds },
      { systemId: "system-harbor-response", title: "Harbor Response", outcome: "The harbor visibly answers the player's beacon.", questIds: [] },
      { systemId: "system-storm-rhythm", title: "Storm Rhythm", outcome: "Readable weather changes the harbor's rhythm.", questIds: [] },
    ],
  });
  return { forgeHome, projectPath };
}

async function digest(file: string): Promise<string> { return createHash("sha256").update(await readFile(file)).digest("hex"); }
async function projectHashes(projectPath: string, relativeDirectory = ""): Promise<Record<string, string>> {
  const values: Record<string, string> = {};
  for (const entry of (await readdir(path.join(projectPath, relativeDirectory), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = path.join(relativeDirectory, entry.name).replaceAll("\\", "/");
    if (relative === ".git" || relative.startsWith(".git/") || relative === ".forge/system-roadmap.json" || relative === ".forge/system-quests.json") continue;
    if (entry.isSymbolicLink()) throw new Error(`Unexpected temporary link: ${relative}`);
    if (entry.isDirectory()) Object.assign(values, await projectHashes(projectPath, relative));
    else if (entry.isFile()) values[relative] = await digest(path.join(projectPath, relative));
  }
  return values;
}

function gitStatus(projectPath: string): string[] {
  const result = spawnSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], { cwd: projectPath, encoding: "utf8", windowsHide: true });
  if ((result.status ?? 1) !== 0) throw new Error(`Git status failed: ${result.stderr.trim()}`);
  return result.stdout.split(/\r?\n/u).filter(Boolean);
}

async function start(forgeHome: string) {
  const sample = new ForgeDashboardService({ forgeHome, codexExecutor: { start: async () => { throw new Error("Runner is outside this review."); } }, gameLauncher: async () => { throw new Error("Play is outside this review."); } });
  const oldPlanning = new BlueprintPlanningService({ start: () => ({ run: async () => { throw new Error("Old intake is outside this review."); } }) });
  const creation = new ProjectCreationService({ forgeHome, openFolder: () => {} });
  const world = new GeneratedProjectWorldService({ forgeHome, now: () => new Date("2026-07-15T21:30:00.000Z"), resolveGodot: async () => ({ executable: "C:\\Pinned\\Godot.exe", version: "4.7.visual", source: "cache" as const }), launchGodot: ({ onExit }) => onExit() });
  const roadmapPlanning = new SystemRoadmapPlanningService(new QueueExecutor([]));
  const questPlanning = new SystemQuestPlanningService(new QueueExecutor([proposal()]), (() => { let now = Date.parse("2026-07-15T21:00:00.000Z"); return () => now++; })());
  const server = createForgeDashboardServer(sample, path.join(repositoryRoot, "dist", "dashboard"), oldPlanning, creation, world, undefined, roadmapPlanning, questPlanning);
  server.listen(0, "127.0.0.1"); await once(server, "listening"); server.unref();
  return { server, base: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
}

function observe(page: Page, base: string): void {
  page.on("pageerror", (error) => report.issues.push(`pageerror: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("Failed to load resource")) report.issues.push(`console: ${message.text()}`); });
  page.on("response", (response) => { if (response.url().startsWith(base) && response.status() >= 400) report.issues.push(`network ${response.status()} ${response.url()}`); });
}

async function capture(page: Page, name: string): Promise<void> {
  const width = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  if (width.scroll > width.client + 1) report.issues.push(`${name}: horizontal overflow ${width.scroll}/${width.client}`);
  const file = `${name}.png`;
  await page.screenshot({ path: path.join(evidenceRoot, file), fullPage: true });
  report.states.push(name); report.screenshots.push(file);
}

async function openWorld(page: Page, base: string): Promise<void> {
  await page.goto(`${base}/v0.2.html`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Recent projects" }).waitFor();
  await page.getByRole("button", { name: "Open Project World" }).click();
  await page.locator(".generated-project-world").waitFor();
  if (!(await page.getByRole("button", { name: /Harbor Response/ }).isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "Roadmap", exact: true }).click();
  }
  await page.getByRole("button", { name: /Harbor Response/ }).click();
}

async function close(server: ReturnType<typeof createForgeDashboardServer>): Promise<void> { await new Promise((resolve) => server.close(() => resolve(undefined))); }

async function main() {
  await mkdir(evidenceRoot, { recursive: true });
  const root = await mkdtemp(path.join(os.tmpdir(), "forge-system-quest-visual-"));
  let browser: Browser | null = null;
  try {
    const copy = await fixture(root);
    const running = await start(copy.forgeHome);
    browser = await launchBrowser();
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage(); observe(page, running.base); await openWorld(page, running.base);
    const before = await projectHashes(copy.projectPath);
    report.gitStatusBefore = gitStatus(copy.projectPath);
    const registryBefore = await digest(path.join(copy.forgeHome, "project-registry.json"));
    await page.getByRole("button", { name: "Refine into quests" }).last().click();
    await page.getByRole("heading", { name: "Harbor Response" }).waitFor();
    await capture(page, "description-desktop");
    await page.getByLabel("What should the player experience here?").fill("Let the harbor welcome the player with one warm pulse and one small answer.");
    await page.getByRole("button", { name: "Suggest small quests" }).click();
    await page.getByRole("heading", { name: "Check the new quests" }).waitFor();
    await capture(page, "proposal-desktop");
    await page.setViewportSize({ width: 390, height: 844 }); await capture(page, "proposal-mobile");
    await page.emulateMedia({ reducedMotion: "reduce" }); await capture(page, "proposal-mobile-reduced-motion");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole("button", { name: "Confirm quests" }).click();
    await page.getByRole("heading", { name: "Choose files for the first quest" }).waitFor();
    await capture(page, "file-choice-desktop");
    const firstFile = page.locator(".system-quest-file input").first();
    await firstFile.check();
    await page.getByLabel("New files").fill("scripts/welcome_beacon.gd");
    await page.getByRole("button", { name: "Check chosen files" }).click();
    await page.getByRole("heading", { name: "Files Codex may change" }).waitFor();
    await capture(page, "work-order-review-desktop");
    await page.getByRole("button", { name: "Confirm this plan" }).click();
    await page.getByText("Work plan saved.").waitFor();
    await capture(page, "ready-desktop");
    await page.reload(); await openWorld(page, running.base);
    await page.getByRole("button", { name: "Refine into quests" }).first().click();
    await page.getByText("Work plan saved.").waitFor();
    await capture(page, "reloaded-ready-desktop");
    await context.close(); await close(running.server);
    const after = await projectHashes(copy.projectPath);
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
    const changed = keys.filter((key) => before[key] !== after[key]);
    report.unchangedProjectFiles = keys.length - changed.length;
    if (changed.length) report.issues.push(`Unexpected project bytes changed: ${changed.join(", ")}`);
    if (await digest(path.join(copy.forgeHome, "project-registry.json")) !== registryBefore) report.issues.push("Temporary registry changed.");
    report.gitStatusAfter = gitStatus(copy.projectPath);
    if (!report.gitStatusAfter.includes("?? .forge/system-quests.json")) report.issues.push(`Missing fixed quest record in Git status: ${JSON.stringify(report.gitStatusAfter)}`);
    if (!await readFile(path.join(copy.projectPath, ".forge/system-quests.json"), "utf8").then((text) => text.includes("scripts/welcome_beacon.gd"))) report.issues.push("Saved work order was missing its exact expected-new path.");
    await readFile(path.join(copy.projectPath, "scripts/welcome_beacon.gd")).then(() => report.issues.push("Expected-new Godot file was created during planning."), () => {});
  } catch (error) { report.issues.push(error instanceof Error ? error.stack ?? error.message : String(error)); }
  finally { await browser?.close().catch(() => undefined); await rm(root, { recursive: true, force: true }); }
  report.result = report.issues.length ? "FAIL" : "PASS";
  await writeFile(path.join(evidenceRoot, "browser-review.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`${report.result}: ${report.screenshots.length} screenshots, ${report.issues.length} issues.`);
  for (const issue of report.issues) console.error(issue);
  if (report.issues.length) process.exitCode = 1;
}

await main();
