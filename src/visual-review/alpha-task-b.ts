import { once } from "node:events";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";

import { chromium, type Browser, type Page } from "@playwright/test";

import { BlueprintPlanningService } from "../blueprint-planner/service.js";
import type { BlueprintModelExecutor } from "../blueprint-planner/types.js";
import { gitBaselineResultSchema, godotVerificationResultSchema } from "../contracts/index.js";
import { createForgeDashboardServer } from "../dashboard-host/server.js";
import { ForgeDashboardService } from "../dashboard-host/service.js";
import { repositoryRoot } from "../demo/paths.js";
import { GeneratedProjectWorldService } from "../generated-project-world/service.js";
import { GeneratedQuestRunnerService } from "../generated-quest-runner/service.js";
import { ProjectCreationService } from "../project-creation/service.js";

const evidenceRoot = path.join(repositoryRoot, "docs", "evidence", "2026-07-14-alpha-task-b-browser-review");
const blueprintResponse = JSON.stringify({
  resultType: "blueprint", clarificationQuestions: [],
  blueprint: {
    projectName: "Signal Sweep",
    vision: "A compact top-down arena where the player sweeps across one relay and turns it into a bright signal source.",
    foundation: "top_down_arena", inputMode: "keyboard",
    coreAction: "Move through one signal relay to activate it.",
    funTarget: "Make the single relay response immediate, readable, and satisfying.",
    smallestPlayableResult: "The player reaches one relay and sees it activate clearly.",
    firstPlayableMilestone: "Activate one relay and read its response inside the bounded arena.",
    quests: [
      { reference: "Q1", title: "Reach the Relay", visibleOutcome: "The player reaches one visible relay.", dependencies: [] },
      { reference: "Q2", title: "Activate the Signal", visibleOutcome: "The relay activates with a visible response.", dependencies: ["Q1"] },
      { reference: "Q3", title: "Repeat the Sweep", visibleOutcome: "The activation loop can be repeated.", dependencies: ["Q2"] },
    ],
    includedScope: ["One bounded arena", "One relay", "Keyboard movement"],
    excludedScope: ["External assets", "Multiple relays", "Scoring"],
    acceptanceCriteria: [
      { reference: "AC-1", questReference: "Q1", criterion: "The relay remains visible.", verificationReferences: ["V-1"] },
      { reference: "AC-2", questReference: "Q2", criterion: "The relay activates visibly.", verificationReferences: ["V-2"] },
      { reference: "AC-3", questReference: "Q3", criterion: "The loop repeats.", verificationReferences: ["V-3"] },
    ],
    verificationIdeas: [
      { reference: "V-1", questReference: "Q1", idea: "Inspect the existing relay." },
      { reference: "V-2", questReference: "Q2", idea: "Observe inactive and activated states." },
      { reference: "V-3", questReference: "Q3", idea: "Repeat the loop twice later." },
    ],
    projectDocumentationSummary: "Signal Sweep is a bounded relay-activation prototype.",
    initialChronicleSummary: "Forge accepted one starter-aware Signal Sweep roadmap.",
  },
});

const report = { date: "2026-07-14", states: [] as string[], screenshots: [] as string[], issues: [] as string[], result: "PASS" as "PASS" | "FAIL" };

function executor(): BlueprintModelExecutor {
  return { start: () => ({ run: async () => ({ finalResponse: blueprintResponse, threadId: "alpha-task-b-visual", usage: { inputTokens: 10, cachedInputTokens: 0, outputTokens: 10, reasoningOutputTokens: 2 } }) }) };
}

async function launchBrowser(): Promise<Browser> {
  for (const channel of ["msedge", "chrome"] as const) {
    try { return await chromium.launch({ channel, headless: true }); } catch {}
  }
  return chromium.launch({ headless: true });
}

async function capture(page: Page, state: string): Promise<void> {
  const width = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  if (width.scroll > width.client + 1) report.issues.push(`${state}: horizontal overflow ${width.scroll}/${width.client}`);
  const name = `${state}.png`;
  await page.screenshot({ path: path.join(evidenceRoot, name), fullPage: true });
  report.states.push(state); report.screenshots.push(name);
}

async function main(): Promise<void> {
  await mkdir(evidenceRoot, { recursive: true });
  const temp = await mkdtemp(path.join(os.tmpdir(), "forge-alpha-task-b-visual-"));
  const sample = new ForgeDashboardService({ forgeHome: temp, codexExecutor: { start: async () => { throw new Error("Sample SDK is outside Task B review."); } }, gameLauncher: async () => { throw new Error("Sample launch is outside Task B review."); } });
  const planning = new BlueprintPlanningService(executor());
  let godotAttempts = 0;
  const creation = new ProjectCreationService({
    forgeHome: temp,
    verifyGodot: async ({ projectId, verifiedAt }) => {
      godotAttempts += 1;
      if (godotAttempts === 1) throw new Error("Controlled first-attempt visual review failure.");
      return godotVerificationResultSchema.parse({ schemaVersion: 1, projectId, status: "passed", godotVersion: "4.7.stable.visual", arguments: ["--headless", "--path", ".", "--script", "res://scripts/verify_project.gd"], successMarker: "FORGE_TOP_DOWN_ARENA_VERIFY_OK", output: "FORGE_TOP_DOWN_ARENA_VERIFY_OK main=pass player=pass input=pass movement=pass objective=pass scripts=pass external=none", verifiedAt });
    },
    createGitBaseline: async ({ projectId, committedAt }) => gitBaselineResultSchema.parse({ schemaVersion: 1, projectId, status: "passed", commitSha: "c".repeat(40), commitMessage: "Forge project baseline", cleanWorktree: true, remoteCount: 0, committedAt }),
    requireCleanGit: () => {},
  });
  const runner = new GeneratedQuestRunnerService({ forgeHome: temp });
  const world = new GeneratedProjectWorldService({ forgeHome: temp, generatedRunner: runner });
  const server = createForgeDashboardServer(sample, path.join(repositoryRoot, "dist", "dashboard"), planning, creation, world, runner);
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  let browser: Browser | null = null;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on("pageerror", (error) => report.issues.push(`page: ${error.message}`));
    await page.goto(`${baseUrl}/v0.2.html`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Start a new game" }).click();
    await page.getByLabel("Your game idea").fill("A side-view platformer about sweeping signals between rooftop relays.");
    await page.getByRole("button", { name: "Shape my game" }).click();
    await page.getByRole("heading", { name: "Signal Sweep" }).waitFor();
    await capture(page, "unsupported-recommendation-desktop");
    await page.setViewportSize({ width: 390, height: 844 }); await capture(page, "unsupported-recommendation-narrow");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole("button", { name: "Review game vision" }).click();
    await page.getByText("Game vision · review 2 of 3").waitFor(); await capture(page, "vision-review-desktop");
    await page.getByRole("button", { name: "Accept vision and reconcile roadmap" }).click();
    await page.getByRole("heading", { name: "Review facts separately from planned changes." }).waitFor();
    await capture(page, "starter-aware-roadmap-desktop");
    await page.setViewportSize({ width: 390, height: 844 }); await capture(page, "starter-aware-roadmap-narrow");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole("button", { name: "Move later" }).first().click();
    await page.getByRole("alert").waitFor(); await capture(page, "roadmap-edit-error-desktop");
    await page.getByRole("button", { name: "Accept this roadmap fingerprint" }).click();
    await page.getByRole("heading", { name: "Create Signal Sweep?" }).waitFor(); await capture(page, "accepted-roadmap-creation-review");
    await page.getByRole("button", { name: "Confirm and create project" }).click();
    await page.getByRole("heading", { name: "The project was not created." }).waitFor({ timeout: 15_000 });
    await capture(page, "creation-failure-retry-desktop");
    await page.getByRole("button", { name: "Review and retry creation" }).click();
    await page.getByRole("heading", { name: "Create Signal Sweep?" }).waitFor();
    await page.getByRole("button", { name: "Confirm and create project" }).click();
    await page.getByRole("heading", { name: "Your Godot project is ready." }).waitFor({ timeout: 15_000 });
    await page.getByRole("button", { name: "Enter Project World" }).click();
    await page.locator(".generated-project-world").waitFor({ timeout: 10_000 }); await capture(page, "fresh-project-world-desktop");
    await page.setViewportSize({ width: 390, height: 844 }); await capture(page, "fresh-project-world-narrow");
  } catch (error) { report.issues.push(error instanceof Error ? error.message : String(error)); }
  finally { await browser?.close(); await new Promise<void>((resolve) => server.close(() => resolve())); await rm(temp, { recursive: true, force: true }); }
  report.result = report.issues.length ? "FAIL" : "PASS";
  await writeFile(path.join(evidenceRoot, "browser-review.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`${report.result}: ${report.screenshots.length} Task B states, ${report.issues.length} issues.`);
  if (report.issues.length) process.exitCode = 1;
}

await main();
