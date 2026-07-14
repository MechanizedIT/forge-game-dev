import { once } from "node:events";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";

import { chromium, type Browser, type Page } from "@playwright/test";

import { BlueprintPlanningService } from "../blueprint-planner/service.js";
import type { BlueprintModelExecutor } from "../blueprint-planner/types.js";
import {
  gitBaselineResultSchema,
  godotVerificationResultSchema,
} from "../contracts/index.js";
import { createForgeDashboardServer } from "../dashboard-host/server.js";
import { ForgeDashboardService } from "../dashboard-host/service.js";
import { repositoryRoot } from "../demo/paths.js";
import { ProjectCreationService } from "../project-creation/service.js";

const evidenceRoot = process.env.FORGE_REVIEW_EVIDENCE_ROOT
  ? path.resolve(process.env.FORGE_REVIEW_EVIDENCE_ROOT)
  : path.join(repositoryRoot, "docs", "evidence", "2026-07-14-v0.2-task-5-browser-review");
const blueprint = JSON.stringify({
  resultType: "blueprint",
  clarificationQuestions: [],
  blueprint: {
    projectName: "Kinetic Bloom",
    vision: "A compact arena game where careful movement turns unstable energy into space and momentum.",
    foundation: "top_down_arena",
    inputMode: "keyboard",
    coreAction: "Move through the arena and release a pulse that pushes nearby energy forms away.",
    funTarget: "The pulse should feel immediate, weighty, and satisfying when it creates a safe opening.",
    smallestPlayableResult: "The player can move, release a pulse, and visibly push one approaching energy form away.",
    firstPlayableMilestone: "A repeatable arena loop with movement, one pulse interaction, one energy form, and a clear reset.",
    quests: [
      { reference: "Q1", title: "Shape the Arena", visibleOutcome: "The player moves cleanly inside a readable bounded arena.", dependencies: [] },
      { reference: "Q2", title: "Release the Pulse", visibleOutcome: "A nearby energy form is pushed visibly away from the player.", dependencies: ["Q1"] },
      { reference: "Q3", title: "Build the Pressure Loop", visibleOutcome: "The energy form returns so the player can repeatedly create space.", dependencies: ["Q2"] },
    ],
    includedScope: ["One bounded arena", "Keyboard movement", "One pulse action", "One simple energy form"],
    excludedScope: ["Menus", "External art", "Multiple levels", "Generated quest implementation"],
    acceptanceCriteria: [
      { reference: "AC-1", questReference: "Q1", criterion: "Keyboard input moves the player in four directions and arena bounds contain movement.", verificationReferences: ["V-1"] },
      { reference: "AC-2", questReference: "Q2", criterion: "Using the pulse near the energy form moves it visibly away from the player.", verificationReferences: ["V-2"] },
      { reference: "AC-3", questReference: "Q3", criterion: "The energy form returns after displacement so the interaction can repeat.", verificationReferences: ["V-3"] },
    ],
    verificationIdeas: [
      { reference: "V-1", questReference: "Q1", idea: "Check directional movement and arena containment in a focused play pass." },
      { reference: "V-2", questReference: "Q2", idea: "Observe that the energy form changes position away from the player after a pulse." },
      { reference: "V-3", questReference: "Q3", idea: "Observe two approach, pulse, and return cycles without resetting." },
    ],
    projectDocumentationSummary: "Kinetic Bloom is a keyboard-controlled top-down prototype focused on making room with a kinetic pulse.",
    initialChronicleSummary: "The first blueprint established movement, a kinetic pulse, and a repeatable arena pressure loop.",
  },
});

interface Issue { kind: "console" | "exception" | "network" | "layout" | "action" | "focus"; state: string; message: string }
const report = {
  date: "2026-07-14",
  browser: "",
  browserVersion: "",
  channel: "",
  states: [] as string[],
  screenshots: [] as string[],
  focusChecks: [] as string[],
  reducedMotionDurations: [] as string[],
  visualStateSource: "deterministic mocked Godot/Git process boundary; real creation rehearsal recorded separately",
  issues: [] as Issue[],
  result: "PASS" as "PASS" | "FAIL",
};

function fakePlanningExecutor(): BlueprintModelExecutor {
  return { start: () => ({ run: async () => {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return { finalResponse: blueprint, threadId: "creation-visual-thread", usage: { inputTokens: 900, cachedInputTokens: 0, outputTokens: 600, reasoningOutputTokens: 120 } };
  } }) };
}

async function launchBrowser(): Promise<Browser> {
  for (const candidate of [{ channel: "msedge" as const, label: "Microsoft Edge" }, { channel: "chrome" as const, label: "Google Chrome" }]) {
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

function observe(page: Page, baseUrl: string, scenario: string): void {
  page.on("console", (message) => {
    if (["warning", "error"].includes(message.type())) report.issues.push({ kind: "console", state: scenario, message: message.text() });
  });
  page.on("pageerror", (error) => report.issues.push({ kind: "exception", state: scenario, message: error.message }));
  page.on("response", (response) => {
    if (response.url().startsWith(baseUrl) && response.status() >= 400) report.issues.push({ kind: "network", state: scenario, message: `${response.status()} ${response.url()}` });
  });
  page.on("requestfailed", (request) => {
    if (!request.url().startsWith(baseUrl) || (["/api/planning/events", "/api/projects/events"].some((suffix) => request.url().endsWith(suffix)) && request.failure()?.errorText.includes("ERR_ABORTED"))) return;
    report.issues.push({ kind: "network", state: scenario, message: `${request.method()} ${request.url()}: ${request.failure()?.errorText}` });
  });
}

async function audit(page: Page, state: string, action: string): Promise<void> {
  const dimensions = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  if (dimensions.scroll > dimensions.client + 1) report.issues.push({ kind: "layout", state, message: `Horizontal overflow: ${dimensions.scroll}px in ${dimensions.client}px.` });
  const button = page.getByRole("button", { name: action, exact: false }).first();
  if (!(await button.isVisible().catch(() => false))) report.issues.push({ kind: "action", state, message: `Primary action not visible: ${action}` });
  const overlaps = await page.locator("button:visible").evaluateAll((buttons) => {
    const rectangles = buttons.map((button) => ({ label: button.textContent?.trim() ?? "button", box: button.getBoundingClientRect() }));
    const pairs: string[] = [];
    for (let left = 0; left < rectangles.length; left += 1) for (let right = left + 1; right < rectangles.length; right += 1) {
      const a = rectangles[left]!; const b = rectangles[right]!;
      if (a.box.width && a.box.height && b.box.width && b.box.height && a.box.left < b.box.right && a.box.right > b.box.left && a.box.top < b.box.bottom && a.box.bottom > b.box.top) pairs.push(`${a.label} <> ${b.label}`);
    }
    return pairs;
  });
  if (overlaps.length) report.issues.push({ kind: "layout", state, message: `Overlapping controls: ${overlaps.join(", ")}` });
}

async function capture(page: Page, state: string): Promise<void> {
  const name = `${state}.png`;
  await page.screenshot({ path: path.join(evidenceRoot, name), fullPage: true });
  report.states.push(state);
  report.screenshots.push(name);
}

async function driveToReady(page: Page, baseUrl: string): Promise<void> {
  await page.goto(`${baseUrl}/v0.2.html`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Start a new game" }).click();
  await page.getByLabel("Your game idea").fill("A keyboard-controlled top-down arena with a pulse that pushes one enemy away at the last moment; the smallest playable result is one repeatable push.");
  await page.getByRole("button", { name: "Shape my game" }).click();
  await page.getByRole("heading", { name: "Kinetic Bloom" }).waitFor({ timeout: 10_000 });
  await page.getByRole("button", { name: "Approve blueprint" }).click();
  await page.getByRole("heading", { name: "Your game blueprint is ready." }).waitFor();
}

async function startServer(options: { forgeHome: string; failGodot: boolean; gateGodot: boolean }) {
  let releaseGodot = () => {};
  let startedGodot = () => {};
  const godotStarted = new Promise<void>((resolve) => { startedGodot = resolve; });
  const godotGate = new Promise<void>((resolve) => { releaseGodot = resolve; });
  const sampleService = new ForgeDashboardService({
    forgeHome: options.forgeHome,
    codexExecutor: { start: async () => { throw new Error("Sample execution is outside creation visual review."); } },
    gameLauncher: async () => { throw new Error("Sample launch is outside creation visual review."); },
  });
  const planningService = new BlueprintPlanningService(fakePlanningExecutor());
  const creationService = new ProjectCreationService({
    forgeHome: options.forgeHome,
    verifyGodot: async ({ projectId, verifiedAt }) => {
      startedGodot();
      if (options.gateGodot) await godotGate;
      else await new Promise((resolve) => setTimeout(resolve, 300));
      if (options.failGodot) throw new Error("Controlled visual-review Godot smoke failure.");
      return godotVerificationResultSchema.parse({
        schemaVersion: 1, projectId, status: "passed", godotVersion: "4.7.stable.visual-review",
        arguments: ["--headless", "--path", ".", "--script", "res://scripts/verify_project.gd"],
        successMarker: "FORGE_TOP_DOWN_ARENA_VERIFY_OK",
        output: "FORGE_TOP_DOWN_ARENA_VERIFY_OK main=pass player=pass input=pass movement=pass objective=pass scripts=pass external=none",
        verifiedAt,
      });
    },
    createGitBaseline: async ({ projectId, committedAt }) => gitBaselineResultSchema.parse({
      schemaVersion: 1, projectId, status: "passed", commitSha: "b".repeat(40), commitMessage: "Forge project baseline",
      cleanWorktree: true, remoteCount: 0, committedAt,
    }),
    requireCleanGit: () => {},
  });
  const server = createForgeDashboardServer(sampleService, path.join(repositoryRoot, "dist", "dashboard"), planningService, creationService);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { server, baseUrl, godotStarted, releaseGodot };
}

async function main(): Promise<void> {
  await mkdir(evidenceRoot, { recursive: true });
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "forge-creation-visual-"));
  let browser: Browser | null = null;
  let successServer: Awaited<ReturnType<typeof startServer>> | null = null;
  let failureServer: Awaited<ReturnType<typeof startServer>> | null = null;
  try {
    browser = await launchBrowser();
    successServer = await startServer({ forgeHome: path.join(temporaryRoot, "success"), failGodot: false, gateGodot: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    observe(page, successServer.baseUrl, "success");
    await driveToReady(page, successServer.baseUrl);
    await page.getByRole("button", { name: "Create the Godot project" }).click();
    await page.getByRole("heading", { name: "Create Kinetic Bloom?" }).waitFor();
    const confirmationAction = page.getByRole("button", { name: "Confirm and create project" });
    await confirmationAction.focus();
    if (!(await confirmationAction.evaluate((button) => button === document.activeElement))) report.issues.push({ kind: "focus", state: "creation-confirmation-desktop", message: "Primary confirmation did not retain keyboard focus." });
    else report.focusChecks.push("creation-confirmation-desktop: primary action focused");
    await audit(page, "creation-confirmation-desktop", "Confirm and create project");
    await capture(page, "creation-confirmation-desktop");
    await confirmationAction.click();
    await successServer.godotStarted;
    await page.getByRole("heading", { name: "Checking the Godot project" }).waitFor();
    await audit(page, "creation-progress-desktop", "Cancel before promotion");
    await capture(page, "creation-progress-desktop");
    await capture(page, "godot-verification-desktop");
    successServer.releaseGodot();
    await page.getByRole("heading", { name: "Your Godot project is ready." }).waitFor({ timeout: 10_000 });
    await audit(page, "project-created-desktop", "Open project folder");
    await capture(page, "project-created-desktop");
    await page.setViewportSize({ width: 768, height: 900 });
    await audit(page, "project-created-tablet", "Open project folder");
    await capture(page, "project-created-tablet");
    await page.setViewportSize({ width: 390, height: 844 });
    await audit(page, "project-created-mobile", "Open project folder");
    await capture(page, "project-created-mobile");
    await page.emulateMedia({ reducedMotion: "reduce" });
    report.reducedMotionDurations = await page.locator(".new-game-shell .companion-core, .new-game-shell .companion-orbit, .creation-stage-list .stage-active > span").evaluateAll((elements) => elements.map((element) => getComputedStyle(element).animationDuration));
    if (report.reducedMotionDurations.some((duration) => Number.parseFloat(duration) > 0.001)) report.issues.push({ kind: "layout", state: "project-created-mobile-reduced-motion", message: `Animation durations remained: ${report.reducedMotionDurations.join(", ")}` });
    await capture(page, "project-created-mobile-reduced-motion");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole("button", { name: "Return to Launchpad" }).click();
    await page.getByRole("heading", { name: "Recent projects" }).waitFor();
    await audit(page, "launchpad-recent-project", "Open Project World");
    await capture(page, "launchpad-recent-project");
    await context.close();
    const completedSuccessServer = successServer;
    await new Promise<void>((resolve) => completedSuccessServer.server.close(() => resolve()));
    successServer = null;

    failureServer = await startServer({ forgeHome: path.join(temporaryRoot, "failure"), failGodot: true, gateGodot: false });
    const failureContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const failurePage = await failureContext.newPage();
    observe(failurePage, failureServer.baseUrl, "failure");
    await driveToReady(failurePage, failureServer.baseUrl);
    await failurePage.getByRole("button", { name: "Create the Godot project" }).click();
    await failurePage.getByRole("button", { name: "Confirm and create project" }).click();
    await failurePage.getByRole("heading", { name: "The project was not created." }).waitFor({ timeout: 10_000 });
    await audit(failurePage, "creation-failure-controlled", "Review and retry creation");
    await capture(failurePage, "creation-failure-controlled");
    await failureContext.close();
    const completedFailureServer = failureServer;
    await new Promise<void>((resolve) => completedFailureServer.server.close(() => resolve()));
    failureServer = null;
  } catch (error) {
    report.issues.push({ kind: "exception", state: "harness", message: error instanceof Error ? error.message : String(error) });
  } finally {
    await browser?.close().catch(() => undefined);
    for (const running of [successServer, failureServer]) {
      if (running?.server.listening) {
        await new Promise<void>((resolve) => running.server.close(() => resolve()));
      }
    }
    await rm(temporaryRoot, { recursive: true, force: true });
  }
  report.result = report.issues.length === 0 ? "PASS" : "FAIL";
  await writeFile(path.join(evidenceRoot, "browser-review.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`${report.result}: ${report.screenshots.length} screenshots with ${report.issues.length} issue(s).`);
  for (const issue of report.issues) console.error(`${issue.kind}: ${issue.state}: ${issue.message}`);
  if (report.issues.length) process.exitCode = 1;
}

await main();
