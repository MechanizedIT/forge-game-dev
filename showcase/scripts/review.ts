import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type BrowserContext, type Page } from "@playwright/test";

const showcaseRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(showcaseRoot, "..");
const evidenceRoot = path.join(repositoryRoot, "docs", "evidence", "2026-07-14-v0.2-task-8-showcase-review");
const baseUrl = "http://127.0.0.1:4184";
const report = { date: "2026-07-14", browser: "Microsoft Edge", viewports: [] as Array<Record<string, unknown>>, interactions: [] as string[], issues: [] as string[], result: "PENDING" };

async function waitForServer(): Promise<void> {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { const response = await fetch(baseUrl); if (response.ok) return; } catch { /* retry */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Showcase preview did not start.");
}

function observe(page: Page): void {
  page.on("console", (message) => { if (message.type() === "error") report.issues.push(`console: ${message.text()}`); });
  page.on("pageerror", (error) => report.issues.push(`pageerror: ${error.message}`));
  page.on("requestfailed", (request) => { if (request.url().startsWith(baseUrl)) report.issues.push(`requestfailed: ${request.url()}`); });
}

async function reviewViewport(context: BrowserContext, name: string, width: number, height: number): Promise<void> {
  const page = await context.newPage();
  await page.setViewportSize({ width, height });
  observe(page);
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /Build your game one/ }).waitFor();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) report.issues.push(`${name}: horizontal overflow ${overflow}px`);
  for (const label of ["Explore the walkthrough", "Watch the demo", "View the project"]) if (!await page.getByRole(label === "Watch the demo" ? "button" : "link", { name: label }).first().isVisible()) report.issues.push(`${name}: primary action missing: ${label}`);
  await page.locator("#walkthrough").scrollIntoViewIfNeeded();
  const player = page.locator("#walkthrough-player");
  await player.focus();
  await player.press("ArrowRight");
  await page.getByRole("heading", { name: "Select Enemy Targeting" }).waitFor();
  if (!await page.getByRole("heading", { name: "Select Enemy Targeting" }).evaluate((element) => element === document.activeElement)) report.issues.push(`${name}: step heading did not receive focus`);
  await page.getByRole("tab", { name: /Create a new game/ }).click();
  await page.getByRole("heading", { name: "Describe a small 2D game idea" }).waitFor();
  await page.getByRole("button", { name: "Next step" }).click();
  await page.getByRole("heading", { name: "Review the GPT-5.6 blueprint" }).waitFor();
  await page.getByRole("button", { name: "Watch the demo" }).first().click();
  await page.getByRole("dialog").waitFor();
  if (!await page.getByText("No fake or local video is embedded.").isVisible()) report.issues.push(`${name}: unconfigured video truth missing`);
  await page.keyboard.press("Escape");
  if (!await page.getByRole("button", { name: "Watch the demo" }).first().evaluate((element) => element === document.activeElement)) report.issues.push(`${name}: video focus did not return`);
  await page.screenshot({ path: path.join(evidenceRoot, `${name}.png`), fullPage: true });
  report.viewports.push({ name, width, height, overflow, result: "PASS" });
  await page.close();
}

await mkdir(evidenceRoot, { recursive: true });
const server = spawn(process.execPath, [path.join(repositoryRoot, "node_modules", "vite", "bin", "vite.js"), "preview", "--config", path.join(showcaseRoot, "vite.config.ts"), "--host", "127.0.0.1", "--port", "4184"], { cwd: repositoryRoot, stdio: "ignore", windowsHide: true });
try {
  await waitForServer();
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    const context = await browser.newContext();
    await reviewViewport(context, "desktop-1440x900", 1440, 900);
    await reviewViewport(context, "tablet-768x900", 768, 900);
    await reviewViewport(context, "mobile-390x844", 390, 844);
    const reduced = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 390, height: 844 } });
    const page = await reduced.newPage();
    observe(page);
    await page.goto(`${baseUrl}/?walkthrough=new-game&step=verify#walkthrough`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Verify the Godot starter and Git baseline" }).waitFor();
    const motion = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
    if (motion !== "auto") report.issues.push(`reduced-motion: expected auto scroll behavior, received ${motion}`);
    await page.screenshot({ path: path.join(evidenceRoot, "mobile-reduced-motion-deep-link.png"), fullPage: true });
    report.interactions.push("Arrow-key walkthrough navigation", "Focus moved to changed step heading", "Touch/click path and step controls", "Deep link to a new-game step", "Unconfigured video dialog and Escape close", "Focus returned to video trigger", "Reduced-motion deep-link review");
    await reduced.close();
    await context.close();
  } finally { await browser.close(); }
  report.result = report.issues.length === 0 ? "PASS" : "FAIL";
} finally {
  server.kill();
  await writeFile(path.join(evidenceRoot, "review.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
}
if (report.issues.length) { console.error(report.issues.join("\n")); process.exit(1); }
console.log(`Showcase Edge review passed: ${report.viewports.length} viewports, ${report.interactions.length} interaction checks, 0 issues.`);
