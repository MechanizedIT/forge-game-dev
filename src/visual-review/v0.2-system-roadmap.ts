import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { once } from "node:events";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";

import { chromium, type Browser, type Page } from "@playwright/test";

import { BlueprintPlanningService } from "../blueprint-planner/service.js";
import { SystemRoadmapPlanningService } from "../blueprint-planner/system-roadmap.js";
import type { BlueprintModelExecutor, BlueprintModelSession, BlueprintModelTurn } from "../blueprint-planner/types.js";
import { createForgeDashboardServer } from "../dashboard-host/server.js";
import { ForgeDashboardService } from "../dashboard-host/service.js";
import { repositoryRoot, resolveForgeHome } from "../demo/paths.js";
import { GeneratedProjectWorldService } from "../generated-project-world/service.js";
import { ProjectCreationService } from "../project-creation/service.js";

const projectId = "last-moment-pulse-6631032087";
const evidenceRoot = path.join(repositoryRoot, "docs", "evidence", "2026-07-15-alpha-pivot-open-roadmap-planning");
const report = { date: "2026-07-15", browser: "", channel: "", states: [] as string[], screenshots: [] as string[], hashes: {} as Record<string, string>, gitStatusBefore: [] as string[], gitStatusAfter: [] as string[], planningRecordSha256: "", worktreeNote: "The fixed Forge planning record is the only allowed project change and appears as an ordinary untracked Git file in this temporary copy.", issues: [] as string[], result: "PASS" as "PASS" | "FAIL" };

class QueueExecutor implements BlueprintModelExecutor {
  constructor(private readonly responses: string[]) {}
  start(): BlueprintModelSession { return { run: async (): Promise<BlueprintModelTurn> => {
    const finalResponse = this.responses.shift();
    if (finalResponse === undefined) throw new Error("No visual-review model response remains.");
    return { finalResponse, threadId: "system-roadmap-visual", usage: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 1, reasoningOutputTokens: 0 } };
  } }; }
}

function proposal(title = "Lighthouse Care"): string {
  return JSON.stringify({ resultType: "proposal", systems: [
    { existingSystemId: "system-first-playable", title, outcome: "Keep the beacon bright through each storm." },
    { existingSystemId: null, title: "Storm Pressure", outcome: "Weather creates readable danger." },
    { existingSystemId: null, title: "Harbor Trust", outcome: "The harbor reacts to each night." },
    { existingSystemId: null, title: "Night Rhythm", outcome: "Each night has a clear beginning, peak, and calm ending." },
  ] });
}

function clarification(): string {
  return JSON.stringify({ resultType: "clarification", clarificationQuestions: [
    { questionId: "protect", question: "What should the player protect?", whyItMatters: "This changes which broad systems matter most." },
    { questionId: "night-length", question: "How long should one night feel?", whyItMatters: "This changes the rhythm of the roadmap." },
  ] });
}

async function browser(): Promise<Browser> {
  for (const item of [{ channel: "msedge" as const, name: "Microsoft Edge" }, { channel: "chrome" as const, name: "Google Chrome" }]) {
    try { const value = await chromium.launch({ channel: item.channel, headless: true }); report.browser = item.name; report.channel = item.channel; return value; } catch {}
  }
  const value = await chromium.launch({ headless: true }); report.browser = "Playwright Chromium"; report.channel = "chromium"; return value;
}

async function fixture(root: string, name: string) {
  const sourceHome = resolveForgeHome();
  const sourceProject = path.join(sourceHome, "projects", projectId);
  const forgeHome = path.join(root, name);
  const projectPath = path.join(forgeHome, "projects", projectId);
  await mkdir(path.dirname(projectPath), { recursive: true });
  await cp(sourceProject, projectPath, { recursive: true });
  await rm(path.join(projectPath, ".forge", "system-roadmap.json"), { force: true });
  const sourceRegistry = JSON.parse(await readFile(path.join(sourceHome, "project-registry.json"), "utf8")) as { projects: Array<Record<string, unknown>> };
  const entry = sourceRegistry.projects.find((item) => item.projectId === projectId);
  if (!entry) throw new Error(`Registered source project missing: ${projectId}`);
  await writeFile(path.join(forgeHome, "project-registry.json"), `${JSON.stringify({ schemaVersion: 1, projects: [{ ...entry, canonicalPath: projectPath }] }, null, 2)}\n`, "utf8");
  return { forgeHome, projectPath };
}

async function digest(file: string): Promise<string> { return createHash("sha256").update(await readFile(file)).digest("hex"); }
async function projectHashes(projectPath: string, relativeDirectory = ""): Promise<Record<string, string>> {
  const directory = path.join(projectPath, relativeDirectory);
  const entries = await readdir(directory, { withFileTypes: true });
  const hashes: Record<string, string> = {};
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const relative = path.join(relativeDirectory, entry.name).replaceAll("\\", "/");
    if (relative === ".git" || relative.startsWith(".git/") || relative === ".forge/system-roadmap.json") continue;
    if (entry.isSymbolicLink()) throw new Error(`Temporary audit found an unexpected symbolic link: ${relative}`);
    if (entry.isDirectory()) Object.assign(hashes, await projectHashes(projectPath, relative));
    else if (entry.isFile()) hashes[relative] = await digest(path.join(projectPath, relative));
    else throw new Error(`Temporary audit found an unsupported project entry: ${relative}`);
  }
  return hashes;
}

function gitStatus(projectPath: string): string[] {
  const result = spawnSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], { cwd: projectPath, encoding: "utf8", windowsHide: true });
  if ((result.status ?? 1) !== 0) throw new Error(`Git status failed in the temporary project: ${result.stderr.trim()}`);
  return result.stdout.split(/\r?\n/u).filter(Boolean);
}

async function start(forgeHome: string, responses: string[]) {
  const sample = new ForgeDashboardService({ forgeHome, codexExecutor: { start: async () => { throw new Error("Sample work is outside this review."); } }, gameLauncher: async () => { throw new Error("Sample launch is outside this review."); } });
  const oldPlanning = new BlueprintPlanningService({ start: () => ({ run: async () => { throw new Error("Old planning is outside this review."); } }) });
  const creation = new ProjectCreationService({ forgeHome, openFolder: () => {} });
  const world = new GeneratedProjectWorldService({ forgeHome, resolveGodot: async () => ({ executable: "C:\\Pinned\\Godot.exe", version: "4.7.visual", source: "cache" as const }), launchGodot: ({ onExit }) => onExit() });
  const systemPlanning = new SystemRoadmapPlanningService(new QueueExecutor(responses), (() => { let now = Date.parse("2026-07-15T20:00:00.000Z"); return () => now++; })());
  const server = createForgeDashboardServer(sample, path.join(repositoryRoot, "dist", "dashboard"), oldPlanning, creation, world, undefined, systemPlanning);
  server.listen(0, "127.0.0.1"); await once(server, "listening"); server.unref();
  return { server, base: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
}

function observe(page: Page, base: string, state: string): void {
  page.on("pageerror", (error) => report.issues.push(`${state}: pageerror: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("Failed to load resource")) report.issues.push(`${state}: console: ${message.text()}`); });
  page.on("response", (response) => { if (response.url().startsWith(base) && response.status() >= 400) report.issues.push(`${state}: network ${response.status()} ${response.url()}`); });
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "unknown";
    if (request.url().endsWith("/api/projects/state") && /aborted/iu.test(failure)) return;
    if (request.url().startsWith(base) && !request.url().endsWith("/events")) report.issues.push(`${state}: request failed ${request.url()} (${failure})`);
  });
}

async function capture(page: Page, name: string) {
  const width = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  if (width.scroll > width.client + 1) report.issues.push(`${name}: Horizontal overflow ${width.scroll}/${width.client}`);
  const file = `${name}.png`; await page.screenshot({ path: path.join(evidenceRoot, file), fullPage: true }); report.states.push(name); report.screenshots.push(file);
}

async function openWorld(page: Page, base: string) {
  await page.goto(`${base}/v0.2.html`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Recent projects" }).waitFor();
  await page.getByRole("button", { name: "Open Project World" }).click();
  await page.locator(".generated-project-world").waitFor();
  if (!(await page.getByRole("button", { name: "Edit these game systems" }).isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "Roadmap", exact: true }).click();
  }
  await page.getByRole("button", { name: "Edit these game systems" }).waitFor();
}

async function close(server: ReturnType<typeof createForgeDashboardServer>) { await new Promise<void>((resolve) => server.close(() => resolve())); }

async function main() {
  await mkdir(evidenceRoot, { recursive: true });
  const root = await mkdtemp(path.join(os.tmpdir(), "forge-system-roadmap-visual-"));
  let app: Browser | null = null;
  try {
    app = await browser();
    const successFixture = await fixture(root, "success");
    const success = await start(successFixture.forgeHome, [proposal(), proposal("Gentle Lighthouse Care")]);
    const context = await app.newContext({ viewport: { width: 1440, height: 900 } }); const page = await context.newPage(); observe(page, success.base, "success"); await openWorld(page, success.base);
    const registryBefore = await digest(path.join(successFixture.forgeHome, "project-registry.json"));
    const before = await projectHashes(successFixture.projectPath);
    report.gitStatusBefore = gitStatus(successFixture.projectPath);
    await page.getByRole("button", { name: "Edit these game systems" }).click(); await page.getByRole("heading", { name: "What should this game become?" }).waitFor(); await capture(page, "idea-desktop");
    await page.getByLabel("Game idea").fill("A lighthouse keeper protects a worried harbor through dangerous but readable storms."); await page.getByRole("button", { name: "Suggest systems" }).click(); await page.getByRole("heading", { name: "4 big pieces make this game." }).waitFor(); await capture(page, "proposal-desktop");
    await page.getByLabel("What should change?").fill("Make lighthouse care feel gentler."); await page.getByRole("button", { name: "Edit these game systems" }).click(); await page.getByRole("heading", { name: "Gentle Lighthouse Care" }).waitFor(); await capture(page, "revised-desktop");
    await page.setViewportSize({ width: 390, height: 844 }); await capture(page, "proposal-mobile"); await page.emulateMedia({ reducedMotion: "reduce" }); await capture(page, "proposal-mobile-reduced-motion");
    await page.setViewportSize({ width: 1440, height: 900 });
    const [, acceptResponse] = await Promise.all([
      page.getByRole("button", { name: "Accept systems" }).click(),
      page.waitForResponse((response) => response.url().includes("/system-planning/accept")),
    ]);
    const acceptBody = await acceptResponse.text();
    if (acceptResponse.status() !== 200) throw new Error(`Accept returned ${acceptResponse.status()}: ${acceptBody}`);
    try { await page.getByRole("heading", { name: "Your game has clear big pieces." }).waitFor({ timeout: 5_000 }); }
    catch {
      const state = await page.evaluate(async (id) => ({ body: document.body.innerText.slice(0, 2_000), server: await fetch(location.pathname.replace("/v0.2.html", "") + `/api/projects/${id}/system-planning/state`).then((response) => response.text()) }), projectId);
      throw new Error(`Accept UI did not settle. Response=${acceptBody}; State=${JSON.stringify(state)}`);
    }
    await page.waitForTimeout(150); await capture(page, "accepted-desktop");
    await page.getByRole("button", { name: "See system map" }).click({ timeout: 1_000 }).catch(() => undefined);
    try { await page.getByRole("button", { name: /Storm Pressure/ }).waitFor({ timeout: 5_000 }); }
    catch { throw new Error(`Accepted roadmap did not return to the system map. ${await page.locator("body").innerText()}`); }
    const after = await projectHashes(successFixture.projectPath);
    const allPaths = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
    report.hashes = Object.fromEntries(allPaths.map((key) => [key, before[key] === after[key] ? "unchanged" : "CHANGED"]));
    if (Object.values(report.hashes).some((value) => value !== "unchanged")) report.issues.push(`Unexpected project bytes changed: ${JSON.stringify(report.hashes)}`);
    if (await digest(path.join(successFixture.forgeHome, "project-registry.json")) !== registryBefore) report.issues.push("The temporary project registry changed.");
    const planningRecord = path.join(successFixture.projectPath, ".forge", "system-roadmap.json");
    report.planningRecordSha256 = await digest(planningRecord);
    report.gitStatusAfter = gitStatus(successFixture.projectPath);
    const expectedStatus = "?? .forge/system-roadmap.json";
    const afterWithoutExpected = report.gitStatusAfter.filter((line) => line !== expectedStatus);
    if (!report.gitStatusAfter.includes(expectedStatus) || JSON.stringify(afterWithoutExpected) !== JSON.stringify(report.gitStatusBefore)) {
      report.issues.push(`Git reported changes beyond the fixed planning record: before=${JSON.stringify(report.gitStatusBefore)} after=${JSON.stringify(report.gitStatusAfter)}`);
    }
    await page.reload(); await openWorld(page, success.base); await page.getByRole("button", { name: /Storm Pressure/ }).waitFor(); await capture(page, "reloaded-desktop"); await page.waitForTimeout(250);
    await context.close(); await close(success.server);

    const clarifyFixture = await fixture(root, "clarify"); const clarifyServer = await start(clarifyFixture.forgeHome, [clarification(), proposal()]);
    const clarifyContext = await app.newContext({ viewport: { width: 768, height: 900 } }); const clarifyPage = await clarifyContext.newPage(); observe(clarifyPage, clarifyServer.base, "clarify"); await openWorld(clarifyPage, clarifyServer.base); await clarifyPage.getByRole("button", { name: "Edit these game systems" }).click(); await clarifyPage.getByLabel("Game idea").fill("A lighthouse keeper protects a worried harbor through dangerous but readable storms."); await clarifyPage.getByRole("button", { name: "Suggest systems" }).click(); await clarifyPage.getByRole("heading", { name: "A few answers will help." }).waitFor(); await capture(clarifyPage, "clarification-tablet"); await clarifyPage.getByLabel("What should the player protect?").fill("The harbor village"); await clarifyPage.getByLabel("How long should one night feel?").fill("Ten minutes"); await clarifyPage.getByRole("button", { name: "Build the roadmap" }).click(); await clarifyPage.getByRole("heading", { name: "4 big pieces make this game." }).waitFor(); await clarifyContext.close(); await close(clarifyServer.server);

    const failFixture = await fixture(root, "failure"); const failServer = await start(failFixture.forgeHome, ["not-json", "still-not-json", proposal()]);
    const failContext = await app.newContext({ viewport: { width: 1440, height: 900 } }); const failPage = await failContext.newPage(); observe(failPage, failServer.base, "failure"); await openWorld(failPage, failServer.base); await failPage.getByRole("button", { name: "Edit these game systems" }).click(); await failPage.getByLabel("Game idea").fill("A lighthouse keeper protects a worried harbor through dangerous but readable storms."); await failPage.getByRole("button", { name: "Suggest systems" }).click(); await failPage.getByRole("heading", { name: "Your idea is still here." }).waitFor(); await capture(failPage, "failure-retry-desktop"); await failPage.getByRole("button", { name: "Try again" }).click(); await failPage.getByRole("heading", { name: "4 big pieces make this game." }).waitFor(); await failContext.close(); await close(failServer.server);
  } catch (error) { report.issues.push(error instanceof Error ? error.stack ?? error.message : String(error)); }
  finally { await app?.close().catch(() => undefined); await rm(root, { recursive: true, force: true }); }
  report.result = report.issues.length ? "FAIL" : "PASS";
  await writeFile(path.join(evidenceRoot, "browser-review.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`${report.result}: ${report.screenshots.length} screenshots, ${report.issues.length} issues.`);
  for (const issue of report.issues) console.error(issue);
  if (report.issues.length) process.exitCode = 1;
}

await main();
