import { createHash } from "node:crypto";
import { once } from "node:events";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";

import type { ThreadEvent } from "@openai/codex-sdk";
import { chromium, type Browser, type Page } from "@playwright/test";

import { BlueprintPlanningService } from "../blueprint-planner/service.js";
import { SystemRoadmapPlanningService } from "../blueprint-planner/system-roadmap.js";
import { SystemQuestPlanningService } from "../blueprint-planner/system-quest.js";
import type { BlueprintModelExecutor, BlueprintModelSession, BlueprintModelTurn } from "../blueprint-planner/types.js";
import { createForgeDashboardServer } from "../dashboard-host/server.js";
import { ForgeDashboardService } from "../dashboard-host/service.js";
import { repositoryRoot, resolveForgeHome } from "../demo/paths.js";
import { GeneratedProjectWorldService } from "../generated-project-world/service.js";
import { GeneratedQuestRunnerService } from "../generated-quest-runner/service.js";
import { ProjectCreationService } from "../project-creation/service.js";
import type { CodexExecutor, CodexRunRequest, CodexRunSession } from "../quest-runner/types.js";

const projectId = "last-moment-pulse-6631032087";
const evidenceRoot = path.join(repositoryRoot, "docs", "evidence", "2026-07-15-alpha-pivot-creator-rehearsal");
const report = {
  date: "2026-07-15",
  browser: "",
  states: [] as string[],
  screenshots: [] as string[],
  sourceProjectUnchanged: false,
  automationStoppedBeforeCreatorConfirmation: true,
  note: "All file changes and the fake launch happened in a disposable project copy. The browser did not choose Worked for the owner.",
  issues: [] as string[],
  result: "PASS" as "PASS" | "FAIL",
};

class QueueExecutor implements BlueprintModelExecutor {
  constructor(private readonly responses: string[]) {}
  start(): BlueprintModelSession {
    return { run: async (): Promise<BlueprintModelTurn> => {
      const finalResponse = this.responses.shift();
      if (finalResponse === undefined) throw new Error("No visual-review planning response remains.");
      return { finalResponse, threadId: "creator-rehearsal-planning", usage: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 1, reasoningOutputTokens: 0 } };
    } };
  }
}

function roadmapProposal(): string {
  return JSON.stringify({ resultType: "proposal", systems: [
    { existingSystemId: "system-first-playable", title: "Welcome Relay", outcome: "The relay welcomes the player and wakes the station." },
    { existingSystemId: null, title: "Harbor Answer", outcome: "The harbor visibly answers the relay." },
    { existingSystemId: null, title: "Storm Rhythm", outcome: "Readable weather changes the station rhythm." },
  ] });
}

function questProposal(): string {
  return JSON.stringify({ resultType: "proposal", quests: [
    { title: "Welcome the Player", playerVisibleOutcome: "A warm welcome beacon appears when the station begins.", whyItMatters: "The first response makes the station feel alive and easy to understand.", doneWhen: ["A warm beacon is clearly visible when play begins."], excludedScope: ["No scoring, weather, or new level."], dependencyIndexes: [] },
    { title: "Answer the Beacon", playerVisibleOutcome: "A small station light answers after the welcome beacon.", whyItMatters: "The answer makes the station feel connected.", doneWhen: ["The answer follows the welcome beacon."], excludedScope: ["No inventory or new level."], dependencyIndexes: [0] },
  ] });
}

async function applyWelcomeBeacon(request: CodexRunRequest): Promise<void> {
  const scenePath = path.join(request.workspacePath, "scenes", "main.tscn");
  const scriptPath = path.join(request.workspacePath, "scripts", "welcome_beacon.gd");
  const scene = await readFile(scenePath, "utf8");
  const changed = scene
    .replace("[gd_scene load_steps=5 format=3]", "[gd_scene load_steps=6 format=3]")
    .replace('[ext_resource type="Script" path="res://scripts/objective_marker.gd" id="3_objective"]', '[ext_resource type="Script" path="res://scripts/objective_marker.gd" id="3_objective"]\n[ext_resource type="Script" path="res://scripts/welcome_beacon.gd" id="4_welcome"]')
    .replace('[node name="Title" type="Label" parent="."]', '[node name="WelcomeBeacon" type="Node2D" parent="."]\nscript = ExtResource("4_welcome")\n\n[node name="Title" type="Label" parent="."]');
  if (changed === scene) throw new Error("The temporary welcome-beacon change did not match its test-owned scene.");
  await writeFile(scenePath, changed, "utf8");
  await writeFile(scriptPath, "extends Node2D\n\nfunc _draw() -> void:\n\tdraw_circle(Vector2(480, 180), 28.0, Color(0.4, 0.9, 1.0))\n", "utf8");
}

class VisualCodexExecutor implements CodexExecutor {
  async start(request: CodexRunRequest): Promise<CodexRunSession> {
    return {
      events: (async function* () {
        yield { type: "thread.started", thread_id: "thread-creator-rehearsal-visual" } as ThreadEvent;
        yield { type: "turn.started" } as ThreadEvent;
        await applyWelcomeBeacon(request);
        yield { type: "item.completed", item: { id: "welcome-change", type: "file_change", changes: [] } } as unknown as ThreadEvent;
        yield { type: "item.completed", item: { id: "welcome-message", type: "agent_message", text: "The welcome beacon is ready for you to play." } } as unknown as ThreadEvent;
        yield { type: "turn.completed", usage: { input_tokens: 10, cached_input_tokens: 0, output_tokens: 5 } } as ThreadEvent;
      })(),
      getThreadId: () => "thread-creator-rehearsal-visual",
    };
  }
}

async function digest(file: string): Promise<string> {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

async function treeDigest(root: string, relativeDirectory = ""): Promise<string> {
  const hash = createHash("sha256");
  const entries = (await readdir(path.join(root, relativeDirectory), { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const relativePath = path.join(relativeDirectory, entry.name).replaceAll("\\", "/");
    if (entry.isSymbolicLink()) throw new Error(`The read-only project audit found a link: ${relativePath}`);
    hash.update(relativePath);
    hash.update(entry.isDirectory() ? await treeDigest(root, relativePath) : await readFile(path.join(root, relativePath)));
  }
  return hash.digest("hex");
}

async function makeFixture(root: string) {
  const sourceHome = resolveForgeHome();
  const sourceProject = path.join(sourceHome, "projects", projectId);
  const sourceRegistryPath = path.join(sourceHome, "project-registry.json");
  const sourceBefore = await treeDigest(sourceProject);
  const sourceRegistryBefore = await digest(sourceRegistryPath);
  const forgeHome = path.join(root, "Forge");
  const projectPath = path.join(forgeHome, "projects", projectId);
  await mkdir(path.dirname(projectPath), { recursive: true });
  await cp(sourceProject, projectPath, { recursive: true });
  await rm(path.join(projectPath, ".forge", "system-roadmap.json"), { force: true });
  await rm(path.join(projectPath, ".forge", "system-quests.json"), { force: true });
  const registry = JSON.parse(await readFile(sourceRegistryPath, "utf8")) as { projects: Array<Record<string, unknown>> };
  const entry = registry.projects.find((candidate) => candidate.projectId === projectId);
  if (!entry) throw new Error(`The read-only source project is not registered: ${projectId}`);
  await writeFile(path.join(forgeHome, "project-registry.json"), `${JSON.stringify({ schemaVersion: 1, projects: [{ ...entry, canonicalPath: projectPath }] }, null, 2)}\n`, "utf8");
  return { forgeHome, projectPath, verifySource: async () => {
    const sourceAfter = await treeDigest(sourceProject);
    const sourceRegistryAfter = await digest(sourceRegistryPath);
    report.sourceProjectUnchanged = sourceBefore === sourceAfter && sourceRegistryBefore === sourceRegistryAfter;
    if (!report.sourceProjectUnchanged) report.issues.push("The real registered project or registry changed during the temporary rehearsal.");
  } };
}

async function launchBrowser(): Promise<Browser> {
  for (const channel of ["msedge", "chrome"] as const) {
    try { const browser = await chromium.launch({ channel, headless: true }); report.browser = `${channel} ${browser.version()}`; return browser; } catch {}
  }
  const browser = await chromium.launch({ headless: true }); report.browser = `chromium ${browser.version()}`; return browser;
}

async function startServer(forgeHome: string) {
  const runner = new GeneratedQuestRunnerService({
    forgeHome,
    now: () => new Date("2026-07-15T22:30:00.000Z"),
    randomId: () => "88888888-8888-8888-8888-888888888888",
    codexExecutor: new VisualCodexExecutor(),
    proofDependencies: {
      projectHealth: async () => ({ output: "FORGE_TOP_DOWN_ARENA_VERIFY_OK main=pass player=pass movement=pass", godotVersion: "4.7.visual" }),
      mechanic: async () => ({ output: "unused", godotVersion: "4.7.visual" }),
    },
    launchGame: async () => ({ launched: true, version: "4.7.visual", message: "Disposable test game launched." }),
  });
  const sample = new ForgeDashboardService({ forgeHome, codexExecutor: { start: async () => { throw new Error("Legacy sample work is outside this review."); } }, gameLauncher: async () => { throw new Error("Legacy sample play is outside this review."); } });
  const oldPlanning = new BlueprintPlanningService({ start: () => ({ run: async () => { throw new Error("Old planning is outside this review."); } }) });
  const creation = new ProjectCreationService({ forgeHome, openFolder: () => {} });
  const world = new GeneratedProjectWorldService({ forgeHome, generatedRunner: runner, resolveGodot: async () => ({ executable: "C:\\Pinned\\Godot.exe", version: "4.7.visual", source: "cache" as const }), launchGodot: ({ onExit }) => onExit() });
  const roadmap = new SystemRoadmapPlanningService(new QueueExecutor([roadmapProposal()]));
  const quests = new SystemQuestPlanningService(new QueueExecutor([questProposal()]));
  const server = createForgeDashboardServer(sample, path.join(repositoryRoot, "dist", "dashboard"), oldPlanning, creation, world, runner, roadmap, quests);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  server.unref();
  return { server, base: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
}

function observe(page: Page, base: string): void {
  page.on("pageerror", (error) => report.issues.push(`page error: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("Failed to load resource")) report.issues.push(`console: ${message.text()}`); });
  page.on("response", (response) => { if (response.url().startsWith(base) && response.status() >= 400) report.issues.push(`network ${response.status()} ${response.url()}`); });
}

async function capture(page: Page, name: string): Promise<void> {
  const width = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  if (width.scroll > width.client + 1) report.issues.push(`${name}: horizontal overflow ${width.scroll}/${width.client}`);
  const unnamed = await page.locator("button:visible").evaluateAll((buttons) => buttons.filter((button) => !(button.textContent?.trim() || button.getAttribute("aria-label"))).length);
  if (unnamed) report.issues.push(`${name}: ${unnamed} visible button(s) lack a name.`);
  const file = `${name}.png`;
  await page.screenshot({ path: path.join(evidenceRoot, file), fullPage: true });
  report.states.push(name); report.screenshots.push(file);
}

async function main(): Promise<void> {
  await mkdir(evidenceRoot, { recursive: true });
  const root = await mkdtemp(path.join(os.tmpdir(), "forge-creator-rehearsal-visual-"));
  let browser: Browser | null = null;
  let closeServer: (() => Promise<void>) | null = null;
  try {
    const fixture = await makeFixture(root);
    const running = await startServer(fixture.forgeHome);
    closeServer = () => new Promise((resolve) => running.server.close(() => resolve()));
    browser = await launchBrowser();
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage(); observe(page, running.base);
    await page.goto(`${running.base}/v0.2.html`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Open Project World" }).click();
    await page.locator(".generated-project-world").waitFor();
    if (!(await page.getByRole("button", { name: "Edit these game systems" }).isVisible().catch(() => false))) await page.getByRole("button", { name: "Roadmap", exact: true }).click();
    await page.getByRole("button", { name: "Edit these game systems" }).click();
    await page.getByLabel("Game idea").fill("A lonely station uses warm signals to welcome travelers before readable storms arrive.");
    await capture(page, "01-free-idea");
    await page.getByRole("button", { name: "Suggest systems" }).click();
    await page.getByRole("heading", { name: "3 big pieces make this game." }).waitFor();
    await capture(page, "02-check-systems");
    await page.getByRole("button", { name: "Accept systems" }).click();
    await page.getByRole("heading", { name: "Your game has clear big pieces." }).waitFor();
    await page.getByRole("button", { name: "See system map" }).click();
    await page.getByRole("button", { name: /Harbor Answer/ }).click();
    await page.getByRole("button", { name: "Edit this game system" }).click();
    await page.getByLabel("What should the player experience here?").fill("Welcome the player with one warm visible beacon, then let the station answer.");
    await page.getByRole("button", { name: "Suggest small quests" }).click();
    await page.getByRole("heading", { name: "Check the new quests" }).waitFor({ timeout: 10_000 }).catch(async () => {
      throw new Error(`Quest suggestions did not appear. Visible page:\n${(await page.locator("body").innerText()).slice(-3_000)}`);
    });
    await capture(page, "03-check-quests");
    await page.getByRole("button", { name: "Confirm quests" }).click();
    await page.getByRole("heading", { name: /Quests saved for/ }).waitFor();
    await capture(page, "03-saved-quests");
    await page.getByRole("button", { name: "Prepare this quest" }).click();
    await page.getByRole("heading", { name: /Choose files for:/ }).waitFor();
    await page.locator(".system-quest-file", { hasText: "scenes/main.tscn" }).getByRole("checkbox").check();
    await page.getByLabel("New files").fill("scripts/welcome_beacon.gd");
    await page.getByRole("button", { name: "Check chosen files" }).click();
    await page.getByRole("heading", { name: "Files Codex may change" }).waitFor();
    await capture(page, "04-confirm-work-plan");
    await page.setViewportSize({ width: 390, height: 844 });
    await capture(page, "04-confirm-work-plan-mobile");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole("button", { name: "Confirm this plan" }).click();
    await page.getByRole("button", { name: "Open quest" }).click();
    await page.getByRole("button", { name: "Check work plan" }).click();
    await page.getByRole("button", { name: "Confirm this plan" }).click();
    await page.getByRole("button", { name: "Send to Codex" }).click();
    await page.getByRole("button", { name: "Play the real game" }).waitFor({ timeout: 30_000 });
    await capture(page, "05-owner-play-gate");
    await page.setViewportSize({ width: 390, height: 844 });
    await capture(page, "05-owner-play-gate-mobile");
    if (await page.getByText(/contract|boundary|scope review|project health/i).isVisible().catch(() => false)) report.issues.push("Creator-facing jargon remained visible in the rehearsal flow.");
    await context.close();
    await fixture.verifySource();
  } catch (error) {
    report.issues.push(error instanceof Error ? error.stack ?? error.message : String(error));
  } finally {
    await browser?.close().catch(() => undefined);
    await closeServer?.().catch(() => undefined);
    await rm(root, { recursive: true, force: true });
  }
  report.result = report.issues.length ? "FAIL" : "PASS";
  await writeFile(path.join(evidenceRoot, "browser-review.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`${report.result}: ${report.screenshots.length} screenshots, ${report.issues.length} issue(s).`);
  for (const issue of report.issues) console.error(issue);
  if (report.issues.length) process.exitCode = 1;
}

await main();
