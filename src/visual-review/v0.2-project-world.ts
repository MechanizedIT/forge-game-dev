import { once } from "node:events";
import { cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";

import { chromium, type Browser, type Page } from "@playwright/test";

import { BlueprintPlanningService } from "../blueprint-planner/service.js";
import { createForgeDashboardServer } from "../dashboard-host/server.js";
import { ForgeDashboardService } from "../dashboard-host/service.js";
import { repositoryRoot, resolveForgeHome } from "../demo/paths.js";
import {
  GeneratedProjectWorldConflictError,
  GeneratedProjectWorldService,
} from "../generated-project-world/service.js";
import type { GeneratedIdeaSaveResponse, GeneratedLaunchResponse } from "../generated-project-world/shared.js";
import { ProjectCreationService } from "../project-creation/service.js";

const projectId = "last-moment-pulse-6631032087";
const evidenceRoot = path.join(repositoryRoot, "docs", "evidence", "2026-07-14-v0.2-task-6-browser-review");

interface Issue { kind: "console" | "exception" | "network" | "layout" | "action" | "focus" | "accessibility"; state: string; message: string }
const report = {
  date: "2026-07-14", browser: "", browserVersion: "", channel: "", states: [] as string[], screenshots: [] as string[],
  focusChecks: [] as string[], reducedMotionDurations: [] as string[],
  visualStateSource: "temporary copy of the real registered Last-Moment Pulse Task 5 project; injected launch/folder process boundaries",
  issues: [] as Issue[], result: "PASS" as "PASS" | "FAIL",
};

async function launchBrowser(): Promise<Browser> {
  for (const candidate of [{ channel: "msedge" as const, label: "Microsoft Edge" }, { channel: "chrome" as const, label: "Google Chrome" }]) {
    try { const browser = await chromium.launch({ channel: candidate.channel, headless: true }); report.browser = candidate.label; report.browserVersion = browser.version(); report.channel = candidate.channel; return browser; } catch {}
  }
  const browser = await chromium.launch({ headless: true }); report.browser = "Playwright-managed Chromium"; report.browserVersion = browser.version(); report.channel = "chromium"; return browser;
}

async function prepareForgeHome(root: string, suffix: string): Promise<{ forgeHome: string; projectPath: string }> {
  const sourceHome = resolveForgeHome();
  const sourceProject = path.join(sourceHome, "projects", projectId);
  const forgeHome = path.join(root, suffix);
  const projectPath = path.join(forgeHome, "projects", projectId);
  await mkdir(path.dirname(projectPath), { recursive: true });
  await cp(sourceProject, projectPath, { recursive: true });
  const sourceRegistry = JSON.parse(await readFile(path.join(sourceHome, "project-registry.json"), "utf8")) as { projects: Array<Record<string, unknown>> };
  const sourceEntry = sourceRegistry.projects.find((entry) => entry.projectId === projectId);
  if (!sourceEntry) throw new Error(`Real Task 5 project ${projectId} is not registered.`);
  await writeFile(path.join(forgeHome, "project-registry.json"), `${JSON.stringify({ schemaVersion: 1, projects: [{ ...sourceEntry, canonicalPath: projectPath }] }, null, 2)}\n`, "utf8");
  return { forgeHome, projectPath };
}

class FailureWorldService extends GeneratedProjectWorldService {
  constructor(options: ConstructorParameters<typeof GeneratedProjectWorldService>[0], private readonly failure: "idea" | "launch") { super(options); }
  override async saveIdea(id: string, idea: string): Promise<GeneratedIdeaSaveResponse> {
    if (this.failure === "idea") throw new GeneratedProjectWorldConflictError("Controlled idea persistence failure for browser review.");
    return super.saveIdea(id, idea);
  }
  override async launch(id: string): Promise<GeneratedLaunchResponse> {
    if (this.failure === "launch") throw new GeneratedProjectWorldConflictError("Controlled Godot launch failure for browser review.");
    return super.launch(id);
  }
}

async function startServer(forgeHome: string, failure?: "idea" | "launch") {
  const sample = new ForgeDashboardService({ forgeHome, codexExecutor: { start: async () => { throw new Error("Sample run outside generated-world review."); } }, gameLauncher: async () => { throw new Error("Sample launch outside generated-world review."); } });
  const planning = new BlueprintPlanningService({ start: () => ({ run: async () => { throw new Error("Planning outside generated-world review."); } }) });
  const creation = new ProjectCreationService({ forgeHome, openFolder: () => {} });
  const options = { forgeHome, resolveGodot: async () => ({ executable: "C:\\Pinned\\Godot.exe", version: "4.7.stable.visual-review", source: "cache" as const }), launchGodot: ({ onExit }: { onExit: () => void }) => setTimeout(onExit, 50) };
  const world = failure ? new FailureWorldService(options, failure) : new GeneratedProjectWorldService(options);
  const server = createForgeDashboardServer(sample, path.join(repositoryRoot, "dist", "dashboard"), planning, creation, world);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  server.unref();
  return { server, baseUrl: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
}

function observe(page: Page, baseUrl: string, scenario: string, expectedFailures: string[] = []): void {
  page.on("console", (message) => { if (["warning", "error"].includes(message.type()) && !(expectedFailures.length > 0 && message.text().includes("Failed to load resource"))) report.issues.push({ kind: "console", state: scenario, message: message.text() }); });
  page.on("pageerror", (error) => report.issues.push({ kind: "exception", state: scenario, message: error.message }));
  page.on("response", (response) => { if (response.url().startsWith(baseUrl) && response.status() >= 400 && !expectedFailures.some((part) => response.url().includes(part))) report.issues.push({ kind: "network", state: scenario, message: `${response.status()} ${response.url()}` }); });
  page.on("requestfailed", (request) => { if (!request.url().startsWith(baseUrl) || ["/api/planning/events", "/api/projects/events"].some((suffix) => request.url().endsWith(suffix))) return; report.issues.push({ kind: "network", state: scenario, message: `${request.method()} ${request.url()}: ${request.failure()?.errorText}` }); });
}

async function audit(page: Page, state: string, action: string): Promise<void> {
  const dimensions = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  if (dimensions.scroll > dimensions.client + 1) report.issues.push({ kind: "layout", state, message: `Horizontal overflow: ${dimensions.scroll}px in ${dimensions.client}px.` });
  if (!(await page.getByRole("button", { name: action, exact: false }).first().isVisible().catch(() => false))) report.issues.push({ kind: "action", state, message: `Primary action not visible: ${action}` });
  const smallTargets = await page.locator("button:visible").evaluateAll((buttons) => buttons.map((button) => ({ label: button.textContent?.trim() ?? "button", box: button.getBoundingClientRect() })).filter(({ box }) => box.width < 40 || box.height < 40).map(({ label, box }) => `${label} (${Math.round(box.width)}×${Math.round(box.height)})`));
  if (smallTargets.length) report.issues.push({ kind: "accessibility", state, message: `Small control targets: ${smallTargets.join(", ")}` });
  const unlabeled = await page.locator("button:visible").evaluateAll((buttons) => buttons.filter((button) => !(button.textContent?.trim() || button.getAttribute("aria-label"))).length);
  if (unlabeled) report.issues.push({ kind: "accessibility", state, message: `${unlabeled} visible buttons lack accessible names.` });
}

async function capture(page: Page, state: string): Promise<void> {
  const file = `${state}.png`; await page.screenshot({ path: path.join(evidenceRoot, file), fullPage: true }); report.states.push(state); report.screenshots.push(file);
}

async function openWorld(page: Page, baseUrl: string): Promise<void> {
  await page.goto(`${baseUrl}/v0.2.html`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Recent projects" }).waitFor();
  await page.getByRole("button", { name: "Open Project World" }).click();
  await page.locator(".generated-project-world").waitFor();
  if (await page.locator(".generated-quest-brief").isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "World", exact: true }).click();
    await page.locator(".generated-roadmap").waitFor();
  }
}

async function main(): Promise<void> {
  await mkdir(evidenceRoot, { recursive: true });
  const root = await mkdtemp(path.join(os.tmpdir(), "forge-task6-visual-"));
  let browser: Browser | null = null;
  try {
    browser = await launchBrowser();
    const successFixture = await prepareForgeHome(root, "success");
    const success = await startServer(successFixture.forgeHome);
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage(); observe(page, success.baseUrl, "success"); await openWorld(page, success.baseUrl);
    await audit(page, "project-world-desktop", "Launch in Godot"); await capture(page, "project-world-desktop");
    const firstQuest = page.locator(".generated-quest-node").first(); await firstQuest.focus(); await firstQuest.click();
    await page.getByText("Quest planned · Codex implementation not enabled yet").waitFor(); await audit(page, "quest-brief-desktop", "Project World"); await capture(page, "quest-brief-desktop");
    await page.getByRole("button", { name: "Project World" }).click();
    if (!(await firstQuest.evaluate((button) => button === document.activeElement))) report.issues.push({ kind: "focus", state: "quest-close", message: "Focus did not return to the triggering roadmap node." }); else report.focusChecks.push("quest-close: focus returned to roadmap node");
    await page.getByRole("button", { name: "Chronicle", exact: true }).click(); await page.getByRole("heading", { name: "Chronicle and activity" }).waitFor(); await capture(page, "chronicle-desktop");
    await page.getByRole("button", { name: "Documents" }).click(); await page.getByRole("heading", { name: "Project documents" }).waitFor(); await capture(page, "documents-desktop");
    await page.getByRole("button", { name: "World", exact: true }).click();
    const ideaInput = page.getByLabel("Save an idea for future planning"); await ideaInput.fill("Leave a fading ring after each pulse."); await page.getByRole("button", { name: "Save idea seed" }).click(); await page.getByRole("status").filter({ hasText: "Idea saved for future planning" }).waitFor();
    const focusedStatus = await page.getByRole("status").filter({ hasText: "Idea saved for future planning" }).evaluate((element) => element === document.activeElement); if (!focusedStatus) report.issues.push({ kind: "focus", state: "idea-saved", message: "Saved idea status did not receive focus." }); else report.focusChecks.push("idea-saved: persisted status focused");
    await page.setViewportSize({ width: 768, height: 900 }); await audit(page, "project-world-tablet", "Launch in Godot"); await capture(page, "project-world-tablet");
    await page.setViewportSize({ width: 390, height: 844 }); await audit(page, "project-world-mobile", "Launch in Godot"); await capture(page, "project-world-mobile");
    await page.emulateMedia({ reducedMotion: "reduce" }); report.reducedMotionDurations = await page.locator(".generated-project-world .companion-orbit").evaluateAll((elements) => elements.map((element) => getComputedStyle(element).animationDuration)); if (report.reducedMotionDurations.some((duration) => Number.parseFloat(duration) > .001)) report.issues.push({ kind: "layout", state: "mobile-reduced-motion", message: `Animation durations remained: ${report.reducedMotionDurations.join(", ")}` }); await capture(page, "project-world-mobile-reduced-motion");
    await context.close(); await new Promise<void>((resolve) => success.server.close(() => resolve()));

    for (const failure of ["idea", "launch"] as const) {
      const fixture = await prepareForgeHome(root, failure);
      const running = await startServer(fixture.forgeHome, failure);
      const failureContext = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const failurePage = await failureContext.newPage(); observe(failurePage, running.baseUrl, failure, [failure === "idea" ? "/ideas" : "/launch"]); await openWorld(failurePage, running.baseUrl);
      if (failure === "idea") { await failurePage.getByLabel("Save an idea for future planning").fill("Controlled failed save"); await failurePage.getByRole("button", { name: "Save idea seed" }).click(); await failurePage.getByText(/Controlled idea persistence failure/).waitFor(); await capture(failurePage, "idea-save-failure"); }
      else { await failurePage.getByRole("button", { name: "Launch in Godot" }).click(); await failurePage.getByText(/Controlled Godot launch failure/).waitFor(); await capture(failurePage, "godot-launch-failure"); }
      await failureContext.close(); await new Promise<void>((resolve) => running.server.close(() => resolve()));
    }

    const invalidFixture = await prepareForgeHome(root, "invalid"); await writeFile(path.join(invalidFixture.projectPath, ".forge", "roadmap.json"), "{}\n", "utf8"); const invalid = await startServer(invalidFixture.forgeHome); const invalidContext = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const invalidPage = await invalidContext.newPage(); observe(invalidPage, invalid.baseUrl, "invalid", ["/open"]); await invalidPage.goto(`${invalid.baseUrl}/v0.2.html`); await invalidPage.getByRole("button", { name: "Open Project World" }).click(); await invalidPage.getByRole("heading", { name: "Forge could not open this Project World." }).waitFor(); await capture(invalidPage, "invalid-project-world"); await invalidContext.close(); await new Promise<void>((resolve) => invalid.server.close(() => resolve()));

    const missingFixture = await prepareForgeHome(root, "missing"); await rename(missingFixture.projectPath, `${missingFixture.projectPath}-moved`); const missing = await startServer(missingFixture.forgeHome); const missingContext = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const missingPage = await missingContext.newPage(); observe(missingPage, missing.baseUrl, "missing"); await missingPage.goto(`${missing.baseUrl}/v0.2.html`); await missingPage.getByText(/Missing locally · registry entry preserved/).waitFor(); await capture(missingPage, "missing-project-launchpad"); await missingContext.close(); await new Promise<void>((resolve) => missing.server.close(() => resolve()));
  } catch (error) { report.issues.push({ kind: "exception", state: "harness", message: error instanceof Error ? error.message : String(error) }); }
  finally { await browser?.close().catch(() => undefined); await rm(root, { recursive: true, force: true }); }
  report.result = report.issues.length === 0 ? "PASS" : "FAIL"; await writeFile(path.join(evidenceRoot, "browser-review.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"); console.log(`${report.result}: ${report.screenshots.length} screenshots with ${report.issues.length} issue(s).`); for (const issue of report.issues) console.error(`${issue.kind}: ${issue.state}: ${issue.message}`); if (report.issues.length) process.exitCode = 1;
}

await main();
