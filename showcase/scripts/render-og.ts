import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const showcaseRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(showcaseRoot, "public", "og-forge.svg");
const output = path.join(showcaseRoot, "public", "og-forge.png");
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(source).href, { waitUntil: "load" });
  await page.screenshot({ path: output, type: "png" });
} finally {
  await browser.close();
}
console.log("Rendered showcase/public/og-forge.png at 1200×630.");
