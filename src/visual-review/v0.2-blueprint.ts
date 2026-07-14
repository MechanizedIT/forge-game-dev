import { once } from "node:events";
import { mkdir, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import path from "node:path";

import { chromium, type Browser, type Page } from "@playwright/test";

import { BlueprintPlanningService } from "../blueprint-planner/service.js";
import type { BlueprintModelExecutor } from "../blueprint-planner/types.js";
import { createForgeDashboardServer } from "../dashboard-host/server.js";
import { ForgeDashboardService } from "../dashboard-host/service.js";
import { repositoryRoot } from "../demo/paths.js";

const evidenceRoot = path.join(repositoryRoot, "docs", "evidence", "2026-07-14-v0.2-task-4a-browser-review");

const clarification = JSON.stringify({
  resultType: "clarification",
  clarificationQuestions: [
    { topic: "core_action", prompt: "What should the player do most often?", answerType: "short_text", choices: [] },
    { topic: "fun_target", prompt: "What should feel most satisfying?", answerType: "short_text", choices: [] },
    { topic: "input_mode", prompt: "How would you like to control the game?", answerType: "single_choice", choices: ["Keyboard", "Controller", "Keyboard and controller"] },
  ],
  blueprint: null,
});

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
    excludedScope: ["Menus", "External art", "Multiple levels", "Generated project files"],
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

interface Issue { kind: "console" | "exception" | "network" | "layout" | "action"; state: string; message: string }
const report = {
  date: "2026-07-14",
  browser: "",
  browserVersion: "",
  channel: "",
  states: [] as string[],
  screenshots: [] as string[],
  reducedMotionDurations: [] as string[],
  visualStateSource: "deterministic mocked official-SDK boundary",
  issues: [] as Issue[],
  result: "PASS" as "PASS" | "FAIL",
};

function fakePlanningExecutor(): BlueprintModelExecutor {
  const responses = [clarification, blueprint];
  return {
    start: () => ({
      run: async () => {
        await new Promise((resolve) => setTimeout(resolve, 1_200));
        const finalResponse = responses.shift();
        if (!finalResponse) throw new Error("Visual-review planning response queue is empty.");
        return {
          finalResponse,
          threadId: "visual-review-thread-sanitized",
          usage: { inputTokens: 900, cachedInputTokens: 0, outputTokens: 600, reasoningOutputTokens: 180 },
        };
      },
    }),
  };
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

function observe(page: Page, baseUrl: string): void {
  page.on("console", (message) => {
    if (["warning", "error"].includes(message.type())) report.issues.push({ kind: "console", state: "runtime", message: message.text() });
  });
  page.on("pageerror", (error) => report.issues.push({ kind: "exception", state: "runtime", message: error.message }));
  page.on("response", (response) => {
    if (response.url().startsWith(baseUrl) && response.status() >= 400) report.issues.push({ kind: "network", state: "runtime", message: `${response.status()} ${response.url()}` });
  });
  page.on("requestfailed", (request) => {
    if (!request.url().startsWith(baseUrl) || (request.url().endsWith("/api/planning/events") && request.failure()?.errorText.includes("ERR_ABORTED"))) return;
    report.issues.push({ kind: "network", state: "runtime", message: `${request.method()} ${request.url()}: ${request.failure()?.errorText}` });
  });
}

async function assertPage(page: Page, state: string, action: string): Promise<void> {
  const dimensions = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  if (dimensions.scroll > dimensions.client + 1) report.issues.push({ kind: "layout", state, message: `Horizontal overflow: ${dimensions.scroll}px in ${dimensions.client}px.` });
  if (!(await page.getByRole("button", { name: action, exact: false }).first().isVisible().catch(() => false))) report.issues.push({ kind: "action", state, message: `Primary action not visible: ${action}` });
}

async function capture(page: Page, state: string): Promise<void> {
  const name = `${state}.png`;
  await page.screenshot({ path: path.join(evidenceRoot, name), fullPage: true });
  report.states.push(state);
  report.screenshots.push(name);
}

async function main(): Promise<void> {
  await mkdir(evidenceRoot, { recursive: true });
  const sampleService = new ForgeDashboardService({
    codexExecutor: { start: async () => { throw new Error("Sample execution is outside blueprint visual review."); } },
    gameLauncher: async () => { throw new Error("Godot launch is outside blueprint visual review."); },
  });
  const planningService = new BlueprintPlanningService(fakePlanningExecutor());
  const server = createForgeDashboardServer(sampleService, path.join(repositoryRoot, "dist", "dashboard"), planningService);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  let browser: Browser | null = null;
  try {
    browser = await launchBrowser();
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    observe(page, baseUrl);
    await page.goto(`${baseUrl}/v0.2.html`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Start a new game" }).click();
    await page.getByRole("heading", { name: "What kind of game would you like to make?" }).waitFor();
    await assertPage(page, "intake-desktop", "Shape my game");
    await capture(page, "intake-desktop");

    await page.setViewportSize({ width: 768, height: 900 });
    await assertPage(page, "intake-tablet", "Shape my game");
    await capture(page, "intake-tablet");
    await page.setViewportSize({ width: 390, height: 844 });
    await assertPage(page, "intake-mobile", "Shape my game");
    await capture(page, "intake-mobile");

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByLabel("Your game idea").fill("A small game about mysterious energy.");
    await page.getByRole("button", { name: "Shape my game" }).click();
    await page.getByRole("heading", { name: "Assembling your game blueprint." }).waitFor();
    await assertPage(page, "planning-desktop", "Cancel planning");
    await capture(page, "planning-desktop");
    await page.getByRole("heading", { name: "A few choices will keep the first build focused." }).waitFor({ timeout: 10_000 });
    await assertPage(page, "clarification-desktop", "Continue with these answers");
    await capture(page, "clarification-desktop");

    const textInputs = page.locator(".clarification-questions input[type=text]");
    await textInputs.nth(0).fill("Release a pulse that pushes energy forms away");
    await textInputs.nth(1).fill("Creating space with a weighty pulse");
    await page.getByText("Keyboard", { exact: true }).click();
    await page.getByRole("button", { name: "Continue with these answers" }).click();
    await page.getByRole("heading", { name: "Kinetic Bloom" }).waitFor({ timeout: 10_000 });
    await assertPage(page, "blueprint-review-desktop", "Approve blueprint");
    await capture(page, "blueprint-review-desktop");

    await page.setViewportSize({ width: 768, height: 900 });
    await assertPage(page, "blueprint-review-tablet", "Approve blueprint");
    await capture(page, "blueprint-review-tablet");
    await page.setViewportSize({ width: 390, height: 844 });
    await assertPage(page, "blueprint-review-mobile", "Approve blueprint");
    const roadmapOrder = await page.locator(".blueprint-quest-step h3").allTextContents();
    if (roadmapOrder.join("|") !== "Shape the Arena|Release the Pulse|Build the Pressure Loop") report.issues.push({ kind: "layout", state: "blueprint-review-mobile", message: `Roadmap order: ${roadmapOrder.join(" → ")}` });
    await capture(page, "blueprint-review-mobile");

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Start a new game" }).click();
    await page.getByRole("heading", { name: "Kinetic Bloom" }).waitFor();
    report.reducedMotionDurations = await page.locator(".new-game-shell .companion-core, .new-game-shell .companion-orbit, .planning-pulse").evaluateAll((elements) => elements.map((element) => getComputedStyle(element).animationDuration));
    if (report.reducedMotionDurations.some((duration) => Number.parseFloat(duration) > 0.001)) report.issues.push({ kind: "layout", state: "reduced-motion", message: `Animation durations remained: ${report.reducedMotionDurations.join(", ")}` });
    await capture(page, "blueprint-review-mobile-reduced-motion");
    await page.emulateMedia({ reducedMotion: "no-preference" });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole("button", { name: "Approve blueprint" }).click();
    await page.getByRole("heading", { name: "Your game blueprint is ready." }).waitFor();
    await assertPage(page, "blueprint-ready-desktop", "Create the Godot project");
    await capture(page, "blueprint-ready-desktop");
    await context.close();
  } catch (error) {
    report.issues.push({ kind: "exception", state: "harness", message: error instanceof Error ? error.message : String(error) });
  } finally {
    await browser?.close().catch(() => undefined);
    server.close();
  }
  report.result = report.issues.length === 0 ? "PASS" : "FAIL";
  await writeFile(path.join(evidenceRoot, "browser-review.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`${report.result}: ${report.screenshots.length} screenshots with ${report.issues.length} issue(s).`);
  if (report.issues.length > 0) {
    report.issues.forEach((issue) => console.error(`${issue.kind}: ${issue.state}: ${issue.message}`));
    process.exitCode = 1;
  }
}

await main();
