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
import type { GeneratedIdeaSaveResponse, GeneratedLaunchResponse, GeneratedProjectWorldSnapshot } from "../generated-project-world/shared.js";
import type { GeneratedQuestRunSnapshot } from "../generated-quest-runner/shared.js";
import { ProjectCreationService } from "../project-creation/service.js";

const projectId = "last-moment-pulse-6631032087";
const evidenceRoot = process.env.FORGE_REVIEW_EVIDENCE_ROOT
  ? path.resolve(process.env.FORGE_REVIEW_EVIDENCE_ROOT)
  : path.join(repositoryRoot, "docs", "evidence", "2026-07-14-v0.2-task-6-browser-review");

interface Issue { kind: "console" | "exception" | "network" | "layout" | "action" | "focus" | "accessibility"; state: string; message: string }
const report = {
  date: "2026-07-15", browser: "", browserVersion: "", channel: "", states: [] as string[], screenshots: [] as string[],
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

class ActiveWorldService extends GeneratedProjectWorldService {
  constructor(
    options: ConstructorParameters<typeof GeneratedProjectWorldService>[0],
    private readonly phase: "contract_review" | "implementing",
  ) { super(options); }

  private active(snapshot: GeneratedProjectWorldSnapshot): GeneratedProjectWorldSnapshot {
    const quest = snapshot.quests[0]!;
    const pending = { result: "pending" as const, summary: "Waiting for the approved work.", evidence: [], verifiedAt: null };
    const run: GeneratedQuestRunSnapshot = {
      runId: "workspace-shell-active-review",
      projectId: snapshot.project.projectId,
      questId: quest.questId,
      phase: this.phase,
      createdAt: "2026-07-15T12:00:00.000Z",
      updatedAt: "2026-07-15T12:01:00.000Z",
      contract: {
        schemaVersion: 2,
        projectId: snapshot.project.projectId,
        questId: quest.questId,
        questRevision: quest.revision,
        visibleOutcome: quest.visibleOutcome,
        whyItMatters: quest.whyItMatters,
        currentPlayableFacts: quest.currentPlayableFacts,
        excludedScope: quest.scope.excluded,
        acceptanceCriteria: [{ id: "AC-1", criterion: "The visible outcome matches the approved quest.", proofReferences: ["boundary"] }],
        creatorPlaySteps: ["Open the temporary game and check the visible outcome."],
        risksAndAssumptions: [],
        fingerprint: "0".repeat(64),
        steps: [{ id: "STEP-1", summary: "Make only the approved visible change.", filePaths: ["scenes/main.tscn"] }],
        allowedFiles: [{ kind: "existing", relativePath: "scenes/main.tscn", preSha256: "0".repeat(64) }],
        verificationProfile: null,
      },
      progress: this.phase === "contract_review"
        ? ["Exact work scope prepared", "Waiting for creator approval"]
        : ["Exact work scope approved", "Codex is changing only the approved file"],
      proofs: { boundary: pending, projectHealth: pending, mechanic: { ...pending, result: "not_run", summary: "No optional extra proof was requested." }, creator: pending },
      changedFiles: [], creatorResult: null, error: null, scopeRequest: null,
      recovery: { action: "resume", message: "The temporary work session remains active.", concurrentPaths: [] },
      receipt: null,
      actions: { approve: this.phase === "contract_review", start: false, play: false, confirm: false, retry: false, cancel: true, rollback: false },
    };
    return {
      ...snapshot,
      quests: snapshot.quests.map((item, index) => index === 0 ? { ...item, run, implementationLabel: `Forge run · ${this.phase.replaceAll("_", " ")}` } : item),
      state: { ...snapshot.state, selectedQuestId: quest.questId },
    };
  }

  override async loadWorld(id: string): Promise<GeneratedProjectWorldSnapshot> {
    return this.active(await super.loadWorld(id));
  }

  override async openWorld(id: string): Promise<GeneratedProjectWorldSnapshot> {
    const snapshot = await super.openWorld(id);
    return { ...snapshot, state: { ...snapshot.state, currentView: "project_world" } };
  }
}

async function startServer(forgeHome: string, failure?: "idea" | "launch" | "active" | "contract") {
  const sample = new ForgeDashboardService({ forgeHome, codexExecutor: { start: async () => { throw new Error("Sample run outside generated-world review."); } }, gameLauncher: async () => { throw new Error("Sample launch outside generated-world review."); } });
  const planning = new BlueprintPlanningService({ start: () => ({ run: async () => { throw new Error("Planning outside generated-world review."); } }) });
  const creation = new ProjectCreationService({ forgeHome, openFolder: () => {} });
  const options = { forgeHome, resolveGodot: async () => ({ executable: "C:\\Pinned\\Godot.exe", version: "4.7.stable.visual-review", source: "cache" as const }), launchGodot: ({ onExit }: { onExit: () => void }) => setTimeout(onExit, 50) };
  const world = failure === "active" || failure === "contract"
    ? new ActiveWorldService(options, failure === "contract" ? "contract_review" : "implementing")
    : failure
      ? new FailureWorldService(options, failure)
      : new GeneratedProjectWorldService(options);
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
    await page.getByRole("button", { name: "Roadmap", exact: true }).click();
    await page.locator(".generated-workspace-roadmap").waitFor();
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
    await audit(page, "project-world-desktop", "Play Game"); await capture(page, "project-world-desktop");
    const headerToolbox = page.getByRole("button", { name: "Toolbox", exact: true }).first();
    await headerToolbox.click(); await page.getByRole("complementary", { name: "Toolbox" }).waitFor(); await capture(page, "toolbox-desktop");
    await page.getByRole("button", { name: "Close Toolbox" }).click();
    if (!(await headerToolbox.evaluate((button) => button === document.activeElement))) report.issues.push({ kind: "focus", state: "toolbox-close", message: "Focus did not return to the Toolbox button." }); else report.focusChecks.push("toolbox-close: focus returned to Toolbox button");
    const dockToolbox = page.locator(".generated-workbench-dock").getByRole("button", { name: "Toolbox" });
    await dockToolbox.click(); await page.getByRole("button", { name: "Close Toolbox" }).click();
    if (!(await dockToolbox.evaluate((button) => button === document.activeElement))) report.issues.push({ kind: "focus", state: "dock-toolbox-close", message: "Focus did not return to the dock Toolbox button." }); else report.focusChecks.push("dock-toolbox-close: focus returned to dock Toolbox button");
    const firstQuest = page.locator(".workspace-quest-card").first(); await firstQuest.focus();
    await Promise.all([
      page.waitForResponse((response) => response.request().method() === "POST" && response.url().includes("/state")),
      firstQuest.click(),
    ]);
    await page.getByRole("button", { name: "Open quest" }).click();
    await page.locator(".generated-quest-brief").waitFor(); await audit(page, "quest-brief-desktop", "Project World"); await capture(page, "quest-brief-desktop");
    await page.getByRole("button", { name: "Project World" }).click();
    if (!(await firstQuest.evaluate((button) => button === document.activeElement))) report.issues.push({ kind: "focus", state: "quest-close", message: "Focus did not return to the triggering roadmap node." }); else report.focusChecks.push("quest-close: focus returned to roadmap node");
    await page.getByRole("button", { name: "History", exact: true }).click(); await page.getByRole("heading", { name: "Chronicle and activity" }).waitFor(); await capture(page, "chronicle-desktop");
    await page.getByRole("button", { name: "Project files" }).click(); await page.getByRole("heading", { name: "Project documents" }).waitFor(); await capture(page, "documents-desktop");
    await page.getByRole("button", { name: "Roadmap", exact: true }).click();
    await page.getByText("Save an idea for later", { exact: true }).click();
    const ideaInput = page.getByLabel("Project note"); await ideaInput.fill("Leave a fading ring after each pulse."); await page.getByRole("button", { name: "Save idea", exact: true }).click(); await page.getByRole("status").filter({ hasText: "Idea saved for future planning" }).waitFor();
    const focusedStatus = await page.getByRole("status").filter({ hasText: "Idea saved for future planning" }).evaluate((element) => element === document.activeElement); if (!focusedStatus) report.issues.push({ kind: "focus", state: "idea-saved", message: "Saved idea status did not receive focus." }); else report.focusChecks.push("idea-saved: persisted status focused");
    await page.setViewportSize({ width: 768, height: 900 }); await audit(page, "project-world-tablet", "Play Game"); await capture(page, "project-world-tablet");
    await page.getByRole("button", { name: "Quest details" }).click(); await page.getByRole("button", { name: "Close details" }).waitFor(); await capture(page, "quest-details-tablet"); await page.getByRole("button", { name: "Close details" }).click();
    await page.setViewportSize({ width: 390, height: 844 }); await audit(page, "project-world-mobile", "Play Game"); await capture(page, "project-world-mobile");
    await page.emulateMedia({ reducedMotion: "reduce" }); report.reducedMotionDurations = await page.locator(".generated-project-world .companion-orbit").evaluateAll((elements) => elements.map((element) => getComputedStyle(element).animationDuration)); if (report.reducedMotionDurations.some((duration) => Number.parseFloat(duration) > .001)) report.issues.push({ kind: "layout", state: "mobile-reduced-motion", message: `Animation durations remained: ${report.reducedMotionDurations.join(", ")}` }); await capture(page, "project-world-mobile-reduced-motion");
    await context.close(); await new Promise<void>((resolve) => success.server.close(() => resolve()));

    const activeFixture = await prepareForgeHome(root, "active");
    const active = await startServer(activeFixture.forgeHome, "active");
    const activeContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const activePage = await activeContext.newPage(); observe(activePage, active.baseUrl, "active-work", ["/events"]); await openWorld(activePage, active.baseUrl);
    const activePlay = activePage.locator(".generated-workbench-dock").getByRole("button", { name: "Play Game" });
    const activeHistory = activePage.getByRole("button", { name: "History", exact: true });
    const activeFolder = activePage.locator(".generated-workbench-dock").getByRole("button", { name: "Open Folder" });
    if (!(await activePlay.isDisabled())) report.issues.push({ kind: "action", state: "active-work", message: "Play remained enabled during active work." });
    if (!(await activeHistory.isDisabled())) report.issues.push({ kind: "action", state: "active-work", message: "Navigation remained enabled during active work." });
    if (await activeFolder.isDisabled()) report.issues.push({ kind: "action", state: "active-work", message: "Safe folder access was disabled during active work." });
    await activePage.getByRole("button", { name: "View progress" }).click();
    await activePage.getByRole("heading", { name: "Forge is making the confirmed change" }).waitFor();
    await activeFolder.click(); await activePage.getByRole("status").filter({ hasText: "Project folder opened" }).waitFor();
    await capture(activePage, "active-work-safety-desktop");
    await activeContext.close(); await new Promise<void>((resolve) => active.server.close(() => resolve()));

    const contractFixture = await prepareForgeHome(root, "contract");
    const contract = await startServer(contractFixture.forgeHome, "contract");
    const contractContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const contractPage = await contractContext.newPage(); observe(contractPage, contract.baseUrl, "contract-review", ["/events"]); await openWorld(contractPage, contract.baseUrl);
    await contractPage.getByRole("button", { name: "Check work plan" }).click();
    await contractPage.getByRole("button", { name: "Confirm this plan" }).waitFor();
    if (await contractPage.getByRole("button", { name: "Send to Codex" }).isVisible().catch(() => false)) report.issues.push({ kind: "action", state: "contract-review", message: "Send to Codex appeared before plan confirmation." });
    await capture(contractPage, "contract-review-before-approval-desktop");
    await contractContext.close(); await new Promise<void>((resolve) => contract.server.close(() => resolve()));

    for (const failure of ["idea", "launch"] as const) {
      const fixture = await prepareForgeHome(root, failure);
      const running = await startServer(fixture.forgeHome, failure);
      const failureContext = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const failurePage = await failureContext.newPage(); observe(failurePage, running.baseUrl, failure, [failure === "idea" ? "/ideas" : "/launch"]); await openWorld(failurePage, running.baseUrl);
      if (failure === "idea") { await failurePage.getByText("Save an idea for later", { exact: true }).click(); await failurePage.getByLabel("Project note").fill("Controlled failed save"); await failurePage.getByRole("button", { name: "Save idea", exact: true }).click(); await failurePage.getByText(/Controlled idea persistence failure/).waitFor(); await capture(failurePage, "idea-save-failure"); }
      else { await failurePage.getByRole("button", { name: "Play Game" }).first().click(); await failurePage.getByText(/Controlled Godot launch failure/).waitFor(); await capture(failurePage, "godot-launch-failure"); }
      await failureContext.close(); await new Promise<void>((resolve) => running.server.close(() => resolve()));
    }

    const invalidFixture = await prepareForgeHome(root, "invalid"); await writeFile(path.join(invalidFixture.projectPath, ".forge", "roadmap.json"), "{}\n", "utf8"); const invalid = await startServer(invalidFixture.forgeHome); const invalidContext = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const invalidPage = await invalidContext.newPage(); observe(invalidPage, invalid.baseUrl, "invalid", ["/open"]); await invalidPage.goto(`${invalid.baseUrl}/v0.2.html`); await invalidPage.getByRole("button", { name: "Open Project World" }).click(); await invalidPage.getByRole("heading", { name: "Forge could not open this Project World." }).waitFor(); await capture(invalidPage, "invalid-project-world"); await invalidContext.close(); await new Promise<void>((resolve) => invalid.server.close(() => resolve()));

    const missingFixture = await prepareForgeHome(root, "missing"); await rename(missingFixture.projectPath, `${missingFixture.projectPath}-moved`); const missing = await startServer(missingFixture.forgeHome); const missingContext = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const missingPage = await missingContext.newPage(); observe(missingPage, missing.baseUrl, "missing"); await missingPage.goto(`${missing.baseUrl}/v0.2.html`); await missingPage.getByText(/Missing locally · registry entry preserved/).waitFor(); await capture(missingPage, "missing-project-launchpad"); await missingContext.close(); await new Promise<void>((resolve) => missing.server.close(() => resolve()));
  } catch (error) { report.issues.push({ kind: "exception", state: "harness", message: error instanceof Error ? error.message : String(error) }); }
  finally { await browser?.close().catch(() => undefined); await rm(root, { recursive: true, force: true }); }
  report.result = report.issues.length === 0 ? "PASS" : "FAIL"; await writeFile(path.join(evidenceRoot, "browser-review.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"); console.log(`${report.result}: ${report.screenshots.length} screenshots with ${report.issues.length} issue(s).`); for (const issue of report.issues) console.error(`${issue.kind}: ${issue.state}: ${issue.message}`); if (report.issues.length) process.exitCode = 1;
}

await main();
