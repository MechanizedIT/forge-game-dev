import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";

import { repositoryRoot } from "../demo/paths.js";

const baseUrl = process.env.FORGE_REVIEW_URL ?? "http://127.0.0.1:4173";
const evidenceRoot = path.join(
  repositoryRoot,
  "docs",
  "evidence",
  "2026-07-14-v0.2-browser-review",
);
const resetRequested = process.argv.includes("--reset") || process.argv.includes("reset");
const liveRequested = process.argv.includes("--live") || process.argv.includes("live");
const mode = liveRequested ? "live" : resetRequested ? "reset" : "current";
const npmVersion = process.env.npm_config_user_agent?.match(/npm\/([^ ]+)/)?.[1] ?? "unknown";

interface ReviewIssue {
  kind: "console" | "exception" | "network" | "layout" | "action" | "navigation";
  message: string;
  state?: string;
}

interface ReviewReport {
  date: string;
  mode: string;
  baseUrl: string;
  environment: {
    node: string;
    npm: string;
    playwright: string;
    browser: string;
    browserVersion: string;
    channel: string;
  };
  host: "connected" | "started";
  realStates: string[];
  visualStateFixtures: string[];
  screenshots: string[];
  viewports: Array<{ name: string; width: number; height: number }>;
  reducedMotion: { checked: boolean; animationDurations: string[] };
  ignoredExpectedNoise: string[];
  issues: ReviewIssue[];
  result: "PASS" | "FAIL";
}

const report: ReviewReport = {
  date: "2026-07-14",
  mode,
  baseUrl,
  environment: {
    node: process.version,
    npm: npmVersion,
    playwright: "1.61.1",
    browser: "",
    browserVersion: "",
    channel: "",
  },
  host: "connected",
  realStates: [],
  visualStateFixtures: [],
  screenshots: [],
  viewports: [
    { name: "desktop", width: 1440, height: 900 },
    { name: "tablet", width: 768, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ],
  reducedMotion: { checked: false, animationDurations: [] },
  ignoredExpectedNoise: [],
  issues: [],
  result: "PASS",
};

let ownedHost: ChildProcess | null = null;

async function reachable(): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/state`);
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureHost(): Promise<void> {
  if (await reachable()) return;
  const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
  ownedHost = spawn(npmExecutable, ["run", "dashboard:host", "--", "--v0.2"], {
    cwd: repositoryRoot,
    env: { ...process.env, FORGE_NO_OPEN: "1" },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  report.host = "started";
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (await reachable()) return;
    if (ownedHost.exitCode !== null) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  const stderr = await new Promise<string>((resolve) => {
    let output = "";
    ownedHost?.stderr?.on("data", (chunk) => { output += String(chunk); });
    setTimeout(() => resolve(output), 100);
  });
  throw new Error(`Forge v0.2 host could not be reached at ${baseUrl}. ${stderr}`.trim());
}

async function launchBrowser(): Promise<Browser> {
  const candidates: Array<{ channel?: "msedge" | "chrome"; label: string }> = [
    { channel: "msedge", label: "Microsoft Edge" },
    { channel: "chrome", label: "Google Chrome" },
    { label: "Playwright-managed Chromium" },
  ];
  const failures: string[] = [];
  for (const candidate of candidates) {
    try {
      const browser = await chromium.launch({
        headless: true,
        ...(candidate.channel ? { channel: candidate.channel } : {}),
      });
      report.environment.browser = candidate.label;
      report.environment.channel = candidate.channel ?? "chromium";
      report.environment.browserVersion = browser.version();
      return browser;
    } catch (error) {
      failures.push(`${candidate.label}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(`No Playwright browser could launch. ${failures.join(" | ")}`);
}

function sameOrigin(value: string): boolean {
  return new URL(value).origin === new URL(baseUrl).origin;
}

function observe(page: Page): void {
  page.on("console", (message) => {
    if (message.type() === "warning" || message.type() === "error") {
      const location = message.location().url;
      report.issues.push({
        kind: "console",
        message: `${message.type()}: ${message.text()}${location ? ` (${location})` : ""}`,
      });
    }
  });
  page.on("pageerror", (error) => {
    report.issues.push({ kind: "exception", message: error.message });
  });
  page.on("response", (response) => {
    if (sameOrigin(response.url()) && response.status() >= 400) {
      report.issues.push({
        kind: "network",
        message: `${response.status()} ${response.request().method()} ${response.url()}`,
      });
    }
  });
  page.on("requestfailed", (request) => {
    if (!sameOrigin(request.url())) return;
    const message = `${request.method()} ${request.url()}: ${request.failure()?.errorText ?? "failed"}`;
    if (message.includes("ERR_ABORTED") && request.url().endsWith("/api/events")) {
      report.ignoredExpectedNoise.push(`SSE closed with page: ${message}`);
      return;
    }
    report.issues.push({ kind: "network", message });
  });
}

async function screenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({
    path: path.join(evidenceRoot, `${name}.png`),
    fullPage: true,
  });
  report.screenshots.push(`${name}.png`);
  report.realStates.push(name);
}

async function assertPage(page: Page, state: string, primaryAction?: string): Promise<void> {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  if (metrics.scrollWidth > metrics.clientWidth + 1) {
    report.issues.push({
      kind: "layout",
      state,
      message: `Horizontal overflow: ${metrics.scrollWidth}px content in ${metrics.clientWidth}px viewport.`,
    });
  }
  if (primaryAction) {
    const action = page.getByRole("button", { name: primaryAction, exact: false }).first();
    if (!(await action.isVisible().catch(() => false))) {
      report.issues.push({ kind: "action", state, message: `Missing visible action: ${primaryAction}` });
    }
  }
}

async function openLaunchpad(page: Page): Promise<void> {
  await page.goto(`${baseUrl}/v0.2.html`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "What would you like to build?" }).waitFor();
}

async function openSample(page: Page): Promise<void> {
  await openLaunchpad(page);
  const launchAction = page.getByRole("button", { name: "Explore sample world" });
  await launchAction.click();
  await launchAction.waitFor({ state: "hidden" });
}

async function snapshotCurrentRealState(page: Page): Promise<"complete" | "world" | "playtest" | "confirmation" | "build"> {
  if (await page.getByRole("heading", { name: /Enemy Targeting is online/ }).isVisible().catch(() => false)) return "complete";
  if (await page.getByRole("heading", { name: /Codex finished/ }).isVisible().catch(() => false)) {
    if (await page.getByRole("heading", { name: "Did you see it work?" }).isVisible().catch(() => false)) return "confirmation";
    return "playtest";
  }
  if (await page.getByText("Live run through the official Codex SDK").isVisible().catch(() => false)) return "build";
  return "world";
}

async function captureCompleted(page: Page): Promise<void> {
  await assertPage(page, "quest-complete", "Return to World");
  await screenshot(page, "real-quest-complete-desktop");
  await page.getByRole("button", { name: "Return to World" }).click();
  await page.getByRole("heading", { name: "Your game is taking shape." }).waitFor();
  await assertPage(page, "reloaded-completed-world", "View completed proof");
  await screenshot(page, "real-project-world-reloaded-desktop");
  await page.getByRole("button", { name: "Proof", exact: true }).click();
  await page.getByRole("heading", { name: "Enemy Targeting evidence" }).waitFor();
  await assertPage(page, "completed-proof");
  await screenshot(page, "real-proof-completed-desktop");
}

async function resetWorkspace(page: Page): Promise<void> {
  const response = await page.request.post(`${baseUrl}/api/demo/reset`, {
    data: { action: "CONFIRM RESET" },
  });
  if (!response.ok()) throw new Error(`Explicit demo reset failed with ${response.status()}.`);
}

async function captureFreshAt(page: Page, width: number, height: number, suffix: string): Promise<void> {
  await page.setViewportSize({ width, height });
  await openSample(page);
  await page.getByRole("heading", { name: "Your game is taking shape." }).waitFor();
  await assertPage(page, `project-world-${suffix}`, "Review Enemy Targeting");
  await screenshot(page, `real-project-world-${suffix}`);
}

async function captureFreshAndQuest(page: Page): Promise<void> {
  await captureFreshAt(page, 1440, 900, "desktop");
  await page.getByRole("button", { name: "Review Enemy Targeting" }).click();
  await page.getByRole("heading", { name: "Enemy Targeting", exact: true }).waitFor();
  await assertPage(page, "quest-forge-desktop", "Approve & build with Codex");
  await screenshot(page, "real-quest-forge-desktop");

  await captureFreshAt(page, 768, 900, "tablet");
  const tabletDockPosition = await page.locator(".workflow-dock").first().evaluate((element) => getComputedStyle(element).position).catch(() => "not-present");
  if (tabletDockPosition !== "not-present" && tabletDockPosition !== "static") {
    report.issues.push({ kind: "layout", state: "tablet", message: `Action dock position is ${tabletDockPosition}, expected static.` });
  }

  await captureFreshAt(page, 390, 844, "mobile");
  const mobileOrder = await page.locator(".quest-module h3").allTextContents();
  const expectedOrder = ["Player Movement", "Enemy Targeting", "Game Feel", "Polish"];
  if (JSON.stringify(mobileOrder) !== JSON.stringify(expectedOrder)) {
    report.issues.push({ kind: "layout", state: "mobile", message: `Roadmap order was ${mobileOrder.join(" → ")}.` });
  }

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "What would you like to build?" }).waitFor();
  await page.getByRole("button", { name: "Explore sample world" }).click();
  await page.getByRole("heading", { name: "Your game is taking shape." }).waitFor();
  const durations = await page.locator(".companion-core, .module-active").evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element).animationDuration),
  );
  report.reducedMotion = { checked: true, animationDurations: durations };
  const invalidDuration = durations.find((duration) => {
    const milliseconds = duration.endsWith("ms") ? Number.parseFloat(duration) : Number.parseFloat(duration) * 1_000;
    return !Number.isFinite(milliseconds) || milliseconds > 1;
  });
  if (invalidDuration) {
    report.issues.push({ kind: "layout", state: "reduced-motion", message: `Animated duration remained ${invalidDuration}.` });
  }
  await screenshot(page, "real-project-world-mobile-reduced-motion");
  await page.emulateMedia({ reducedMotion: "no-preference" });
}

async function captureLiveRun(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);
  let state = await snapshotCurrentRealState(page);
  if (state === "world") {
    await page.getByRole("button", { name: "Review Enemy Targeting" }).click();
    await page.getByRole("button", { name: "Approve & build with Codex" }).click();
    await page.getByText("Live run through the official Codex SDK").waitFor({ timeout: 60_000 });
    state = "build";
  }
  if (state === "build") {
    await assertPage(page, "active-build");
    await screenshot(page, "real-active-build-desktop");
    await page.getByRole("heading", { name: /Codex finished/ }).waitFor({ timeout: 15 * 60_000 });
    state = await snapshotCurrentRealState(page);
  }
  if (state === "playtest") {
    await assertPage(page, "playtest-gate", "Play the result");
    await screenshot(page, "real-playtest-gate-desktop");
    console.log("Playtest Gate captured. Launching Godot; close the game after testing it.");
    await page.getByRole("button", { name: "Play the result" }).click({ noWaitAfter: true });
    await page.getByRole("heading", { name: "Did you see it work?" }).waitFor({ timeout: 20 * 60_000 });
    state = "confirmation";
  }
  if (state !== "confirmation") {
    throw new Error(`Live review cannot continue from the current state: ${state}.`);
  }
  await screenshot(page, "real-creator-confirmation-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await assertPage(page, "creator-confirmation-mobile", "I saw it work");
  await screenshot(page, "real-creator-confirmation-mobile");
  console.log("Creator confirmation captured. No outcome was selected.");
}

async function main(): Promise<void> {
  await mkdir(evidenceRoot, { recursive: true });
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  try {
    await ensureHost();
    browser = await launchBrowser();
    context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    observe(page);
    await openLaunchpad(page);
    await assertPage(page, "launchpad", "Explore sample world");
    await screenshot(page, "real-launchpad-desktop");
    if (liveRequested) {
      await captureLiveRun(page);
    } else {
      await openSample(page);
      const initialState = await snapshotCurrentRealState(page);
      if (initialState === "complete") await captureCompleted(page);
      else if (initialState === "playtest") {
        await assertPage(page, "playtest-gate", "Play the result");
        await screenshot(page, "real-playtest-gate-desktop");
      } else if (initialState === "confirmation") {
        await screenshot(page, "real-creator-confirmation-desktop");
      } else if (initialState === "build") {
        await screenshot(page, "real-active-build-desktop");
      }
      if (resetRequested) {
        await resetWorkspace(page);
        await captureFreshAndQuest(page);
      }
    }
  } catch (error) {
    report.issues.push({
      kind: "exception",
      message: `Harness failure: ${error instanceof Error ? error.message : String(error)}`,
    });
  } finally {
    await context?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
    ownedHost?.kill();
  }
  report.result = report.issues.length === 0 ? "PASS" : "FAIL";
  await writeFile(
    path.join(evidenceRoot, `browser-review-${mode}.json`),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  console.log(`${report.result}: ${report.screenshots.length} screenshots with ${report.issues.length} issue(s).`);
  console.log(`Browser: ${report.environment.browser} ${report.environment.browserVersion}`);
  console.log(`Report: ${path.join(evidenceRoot, `browser-review-${mode}.json`)}`);
  if (report.issues.length > 0) {
    for (const issue of report.issues) console.error(`${issue.kind}: ${issue.state ?? "runtime"}: ${issue.message}`);
    process.exitCode = 1;
  }
}

await main();
