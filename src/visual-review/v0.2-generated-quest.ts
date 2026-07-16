import { spawnSync } from "node:child_process";
import { once } from "node:events";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";

import type { ThreadEvent } from "@openai/codex-sdk";
import { chromium, type Browser, type Page } from "@playwright/test";

import { BlueprintPlanningService } from "../blueprint-planner/service.js";
import { createForgeDashboardServer } from "../dashboard-host/server.js";
import { ForgeDashboardService } from "../dashboard-host/service.js";
import { repositoryRoot, resolveForgeHome } from "../demo/paths.js";
import { GeneratedProjectWorldService } from "../generated-project-world/service.js";
import { GeneratedQuestRunnerService } from "../generated-quest-runner/service.js";
import { ProjectCreationService } from "../project-creation/service.js";
import type { CodexExecutor, CodexRunRequest, CodexRunSession } from "../quest-runner/types.js";

const projectId = "gravity-tap-arena-6cbe7b2a54";
const questId = "q1-enter-the-arena";
const evidenceRoot = process.env.FORGE_REVIEW_EVIDENCE_ROOT
  ? path.resolve(process.env.FORGE_REVIEW_EVIDENCE_ROOT)
  : path.join(repositoryRoot, "docs", "evidence", "2026-07-14-alpha-task-a-browser-review");

interface Issue {
  kind: "console" | "exception" | "network" | "layout" | "action" | "accessibility";
  state: string;
  message: string;
}

const report = {
  date: "2026-07-14",
  browser: "",
  browserVersion: "",
  channel: "",
  states: [] as string[],
  screenshots: [] as string[],
  visualStateSource: "Temporary isolated Git checkout of the registered Gravity Tap Arena verified baseline.",
  injectedBoundaries: [
    "Deterministic fake Codex event stream editing the same Forge-approved existing scene file.",
    "Deterministic passing project-health and gravity-orb profile outputs.",
    "No-op visible-game launcher for browser-only UI review.",
  ],
  issues: [] as Issue[],
  result: "PASS" as "PASS" | "FAIL",
};

function runGit(cwd: string, args: string[]): string {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", windowsHide: true });
  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0) throw new Error(`Git ${args[0] ?? "command"} failed: ${(result.stderr || result.stdout).trim()}`);
  return result.stdout.trim();
}

async function launchBrowser(): Promise<Browser> {
  for (const candidate of [
    { channel: "msedge" as const, label: "Microsoft Edge" },
    { channel: "chrome" as const, label: "Google Chrome" },
  ]) {
    try {
      const browser = await chromium.launch({ channel: candidate.channel, headless: true });
      report.browser = candidate.label;
      report.browserVersion = browser.version();
      report.channel = candidate.channel;
      return browser;
    } catch {}
  }
  const browser = await chromium.launch({ headless: true });
  report.browser = "Playwright-managed Chromium";
  report.browserVersion = browser.version();
  report.channel = "chromium";
  return browser;
}

async function prepareForgeHome(root: string, scenario: string): Promise<string> {
  const sourceHome = resolveForgeHome();
  const sourceProject = path.join(sourceHome, "projects", projectId);
  const sourceRegistry = JSON.parse(await readFile(path.join(sourceHome, "project-registry.json"), "utf8")) as {
    projects: Array<Record<string, unknown>>;
  };
  const sourceEntry = sourceRegistry.projects.find((entry) => entry.projectId === projectId);
  if (!sourceEntry) throw new Error(`Registered browser-review project ${projectId} is unavailable.`);
  const baseline = JSON.parse(await readFile(path.join(sourceProject, ".forge", "local", "git-baseline.json"), "utf8")) as {
    commitSha: string;
  };
  const forgeHome = path.join(root, scenario, "Forge");
  const projectPath = path.join(forgeHome, "projects", projectId);
  await mkdir(path.dirname(projectPath), { recursive: true });
  const clone = spawnSync("git", ["clone", "--no-local", sourceProject, projectPath], { encoding: "utf8", windowsHide: true });
  if (clone.error) throw clone.error;
  if ((clone.status ?? 1) !== 0) throw new Error(`Temporary Gravity Tap clone failed: ${(clone.stderr || clone.stdout).trim()}`);
  runGit(projectPath, ["checkout", "--detach", baseline.commitSha]);
  runGit(projectPath, ["remote", "remove", "origin"]);
  runGit(projectPath, ["update-index", "--skip-worktree", ".forge/project-state.json"]);
  const localDirectory = path.join(projectPath, ".forge", "local");
  await mkdir(localDirectory, { recursive: true });
  for (const file of ["creation-provenance.json", "git-baseline.json", "godot-verification.json"]) {
    await copyFile(path.join(sourceProject, ".forge", "local", file), path.join(localDirectory, file));
  }
  await mkdir(forgeHome, { recursive: true });
  await writeFile(path.join(forgeHome, "project-registry.json"), `${JSON.stringify({
    schemaVersion: 1,
    projects: [{ ...sourceEntry, canonicalPath: projectPath }],
  }, null, 2)}\n`, "utf8");
  return forgeHome;
}

async function applyOrbChange(request: CodexRunRequest): Promise<void> {
  const scenePath = path.join(request.workspacePath, "scenes", "main.tscn");
  const scene = await readFile(scenePath, "utf8");
  const changed = scene
    .replace(
      '[node name="ObjectiveMarker" type="Area2D" parent="."]',
      '[node name="ObjectiveMarker" type="Area2D" parent="."]\nmetadata/forge_role = "gravity_orb"',
    )
    .replace("OBJECTIVE · Reach the signal relay", "OBJECTIVE · Find the gravity orb");
  if (changed === scene) throw new Error("Browser-review executor could not apply the approved orb change.");
  await writeFile(scenePath, changed, "utf8");
}

class VisualCodexExecutor implements CodexExecutor {
  constructor(
    private readonly gate: Promise<void> | null,
    private readonly failAfterMutation: boolean,
  ) {}

  async start(request: CodexRunRequest): Promise<CodexRunSession> {
    const gate = this.gate;
    const fail = this.failAfterMutation;
    return {
      events: (async function* () {
        yield { type: "thread.started", thread_id: "thread-generated-visual-review" } as ThreadEvent;
        yield { type: "turn.started" } as ThreadEvent;
        if (gate) await gate;
        await applyOrbChange(request);
        yield {
          type: "item.completed",
          item: { id: "visual-change", type: "file_change", changes: [] },
        } as unknown as ThreadEvent;
        if (fail) {
          yield {
            type: "turn.failed",
            error: { message: "Controlled SDK failure after the approved scene edit." },
          } as ThreadEvent;
          return;
        }
        yield {
          type: "turn.completed",
          usage: { input_tokens: 10, cached_input_tokens: 0, output_tokens: 5 },
        } as ThreadEvent;
      })(),
      getThreadId: () => "thread-generated-visual-review",
    };
  }
}

const passingProof = {
  projectHealth: async () => ({
    output: "FORGE_TOP_DOWN_ARENA_VERIFY_OK main=pass player=pass input=pass movement=pass objective=pass scripts=pass external=none",
    godotVersion: "4.7.stable.visual-review",
  }),
  mechanic: async () => ({
    output: "FORGE_GRAVITY_ORB_PRESENCE_V1_OK count=1 role=gravity_orb",
    godotVersion: "4.7.stable.visual-review",
  }),
};

async function startServer(forgeHome: string, executor: CodexExecutor) {
  const runner = new GeneratedQuestRunnerService({
    forgeHome,
    now: () => new Date("2026-07-14T22:00:00.000Z"),
    randomId: () => "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    codexExecutor: executor,
    proofDependencies: passingProof,
    launchGame: async () => ({
      launched: true,
      version: "4.7.stable.visual-review",
      message: "Visible Gravity Tap browser-review playtest launched.",
    }),
  });
  const sample = new ForgeDashboardService({
    forgeHome,
    codexExecutor: { start: async () => { throw new Error("Sample run is outside generated-quest browser review."); } },
    gameLauncher: async () => { throw new Error("Sample launch is outside generated-quest browser review."); },
  });
  const planning = new BlueprintPlanningService({
    start: () => ({ run: async () => { throw new Error("Planning is outside generated-quest browser review."); } }),
  });
  const creation = new ProjectCreationService({ forgeHome, openFolder: () => {} });
  const world = new GeneratedProjectWorldService({
    forgeHome,
    generatedRunner: runner,
    resolveGodot: async () => ({
      executable: "C:\\Pinned\\Godot.exe",
      version: "4.7.stable.visual-review",
      source: "cache" as const,
    }),
    launchGodot: ({ onExit }: { onExit: () => void }) => setTimeout(onExit, 10),
  });
  const server = createForgeDashboardServer(
    sample,
    path.join(repositoryRoot, "dist", "dashboard"),
    planning,
    creation,
    world,
    runner,
  );
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  server.unref();
  return { server, baseUrl: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
}

function observe(page: Page, baseUrl: string, scenario: string): void {
  page.on("console", (message) => {
    if (["warning", "error"].includes(message.type())) report.issues.push({ kind: "console", state: scenario, message: message.text() });
  });
  page.on("pageerror", (error) => report.issues.push({ kind: "exception", state: scenario, message: error.message }));
  page.on("response", (response) => {
    if (response.url().startsWith(baseUrl) && response.status() >= 400) {
      report.issues.push({ kind: "network", state: scenario, message: `${response.status()} ${response.url()}` });
    }
  });
  page.on("requestfailed", (request) => {
    if (!request.url().startsWith(baseUrl) || request.url().endsWith("/events")) return;
    report.issues.push({ kind: "network", state: scenario, message: `${request.method()} ${request.url()}: ${request.failure()?.errorText}` });
  });
}

async function audit(page: Page, state: string, action: string): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  if (dimensions.scroll > dimensions.client + 1) {
    report.issues.push({ kind: "layout", state, message: `Horizontal overflow: ${dimensions.scroll}px in ${dimensions.client}px.` });
  }
  if (!(await page.getByRole("button", { name: action, exact: false }).first().isVisible().catch(() => false))) {
    report.issues.push({ kind: "action", state, message: `Primary action not visible: ${action}` });
  }
  const unnamed = await page.locator("button:visible").evaluateAll((buttons) => buttons.filter((button) => !(button.textContent?.trim() || button.getAttribute("aria-label"))).length);
  if (unnamed > 0) report.issues.push({ kind: "accessibility", state, message: `${unnamed} visible buttons lack accessible names.` });
}

async function capture(page: Page, state: string): Promise<void> {
  const file = `${state}.png`;
  await page.screenshot({ path: path.join(evidenceRoot, file), fullPage: true });
  report.states.push(state);
  report.screenshots.push(file);
}

async function openWorld(page: Page, baseUrl: string): Promise<void> {
  await page.goto(`${baseUrl}/v0.2.html`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Recent projects" }).waitFor();
  await page.getByRole("button", { name: "Open Project World" }).click();
  await page.locator(".generated-project-world").waitFor();
  if (await page.locator(".generated-quest-brief").isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "World", exact: true }).click();
  }
  await page.locator(".generated-roadmap").waitFor();
}

async function openQuest(page: Page): Promise<void> {
  await page.locator(".generated-quest-node").first().click();
  await page.getByRole("heading", { name: "Enter the Arena" }).waitFor();
}

async function adjustAndPrepare(page: Page): Promise<void> {
  await page.getByLabel("Player-visible outcome").fill("A clearly identifiable gravity orb is present in the opening arena.");
  await page.getByRole("button", { name: "Edit result" }).click();
  await page.getByText(/Outcome adjusted and saved in local plan history/).waitFor();
  await page.getByRole("button", { name: "Check work plan" }).click();
  await page.getByRole("button", { name: "Confirm this plan" }).waitFor();
}

async function main(): Promise<void> {
  await mkdir(evidenceRoot, { recursive: true });
  const root = await mkdtemp(path.join(os.tmpdir(), "forge-generated-quest-visual-"));
  let browser: Browser | null = null;
  try {
    browser = await launchBrowser();

    let releaseImplementation!: () => void;
    const implementationGate = new Promise<void>((resolve) => { releaseImplementation = resolve; });
    const successHome = await prepareForgeHome(root, "success");
    const success = await startServer(successHome, new VisualCodexExecutor(implementationGate, false));
    const successContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await successContext.newPage();
    observe(page, success.baseUrl, "success");
    await openWorld(page, success.baseUrl);
    await openQuest(page);
    await audit(page, "generated-outcome-desktop", "Check work plan");
    await capture(page, "generated-outcome-desktop");
    await page.getByLabel("Player-visible outcome").fill("A clearly identifiable gravity orb is present in the opening arena.");
    await page.getByRole("button", { name: "Edit result" }).click();
    await page.getByText(/Outcome adjusted and saved in local plan history/).waitFor();
    await capture(page, "generated-outcome-adjusted-desktop");
    await page.getByRole("button", { name: "Check work plan" }).click();
    await page.getByRole("button", { name: "Confirm this plan" }).waitFor();
    await audit(page, "generated-contract-desktop", "Confirm this plan");
    await capture(page, "generated-contract-desktop");
    await page.setViewportSize({ width: 390, height: 844 });
    await audit(page, "generated-contract-mobile", "Confirm this plan");
    await capture(page, "generated-contract-mobile");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole("button", { name: "Confirm this plan" }).click();
    await page.getByRole("button", { name: "Send to Codex" }).waitFor();
    await capture(page, "generated-approved-desktop");
    await page.getByRole("button", { name: "Send to Codex" }).click();
    await page.getByRole("heading", { name: "Forge is making the confirmed change" }).waitFor();
    await audit(page, "generated-progress-desktop", "Cancel safely");
    await capture(page, "generated-progress-desktop");
    releaseImplementation();
    await page.getByRole("button", { name: "Play the real game" }).waitFor({ timeout: 30_000 });
    await audit(page, "generated-proof-playtest-desktop", "Play the real game");
    await capture(page, "generated-proof-playtest-desktop");
    await page.getByRole("button", { name: "Play the real game" }).click();
    await page.getByText(/Visible Gravity Tap browser-review playtest launched/).waitFor();
    await page.getByRole("button", { name: "Not ready" }).click();
    await page.getByRole("button", { name: "Play the real game" }).waitFor();
    await capture(page, "generated-not-ready-desktop");
    await page.getByRole("button", { name: "Play the real game" }).click();
    await page.waitForFunction(() => {
      const button = [...document.querySelectorAll("button")].find((item) => item.textContent?.trim() === "Worked");
      return button instanceof HTMLButtonElement && !button.disabled;
    }).catch((error: unknown) => { throw new Error(`Worked did not re-enable after the second launch: ${String(error)}`); });
    await page.getByRole("button", { name: "Worked" }).click();
    await page.waitForFunction(() => {
      return document.querySelector(".generated-completion-card") !== null || document.querySelector('[role="alert"]') !== null;
    }, undefined, { timeout: 30_000 }).catch(async (error: unknown) => {
      const text = (await page.locator("body").innerText()).slice(-2_000);
      throw new Error(`Completion did not settle: ${String(error)}\nVisible tail:\n${text}`);
    });
    const completionError = await page.getByRole("alert").last().textContent().catch(() => null);
    if (completionError) throw new Error(`Temporary completion state failed: ${completionError}`);
    await audit(page, "generated-complete-desktop", "Return to Project World");
    await capture(page, "generated-complete-desktop");
    await page.getByRole("button", { name: "Return to Project World" }).click();
    await page.locator(".generated-roadmap").waitFor();
    await audit(page, "generated-roadmap-complete-desktop", "Launch in Godot");
    await capture(page, "generated-roadmap-complete-desktop");
    await successContext.close();
    await new Promise<void>((resolve) => success.server.close(() => resolve()));

    const failureHome = await prepareForgeHome(root, "failure");
    const failure = await startServer(failureHome, new VisualCodexExecutor(null, true));
    const failureContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const failurePage = await failureContext.newPage();
    observe(failurePage, failure.baseUrl, "failure");
    await openWorld(failurePage, failure.baseUrl);
    await openQuest(failurePage);
    await adjustAndPrepare(failurePage);
    await failurePage.getByRole("button", { name: "Confirm this plan" }).click();
    await failurePage.getByRole("button", { name: "Send to Codex" }).click();
    await failurePage.getByRole("button", { name: "Undo chosen file changes" }).waitFor({ timeout: 30_000 });
    await audit(failurePage, "generated-safe-rollback-desktop", "Undo chosen file changes");
    await capture(failurePage, "generated-safe-rollback-desktop");
    await failurePage.getByRole("button", { name: "Undo chosen file changes" }).click();
    await failurePage.getByRole("button", { name: "Check work plan" }).waitFor();
    await capture(failurePage, "generated-rollback-complete-desktop");
    await failureContext.close();
    await new Promise<void>((resolve) => failure.server.close(() => resolve()));
  } catch (error) {
    report.issues.push({ kind: "exception", state: "harness", message: error instanceof Error ? error.message : String(error) });
  } finally {
    await browser?.close().catch(() => undefined);
    await rm(root, { recursive: true, force: true });
  }
  report.result = report.issues.length === 0 ? "PASS" : "FAIL";
  await writeFile(path.join(evidenceRoot, "browser-review.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`${report.result}: ${report.screenshots.length} screenshots with ${report.issues.length} issue(s).`);
  for (const issue of report.issues) console.error(`${issue.kind}: ${issue.state}: ${issue.message}`);
  if (report.issues.length > 0) process.exitCode = 1;
}

await main();
