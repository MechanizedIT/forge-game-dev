import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evidenceAssets } from "../src/content/evidence";
import { publicLinks } from "../src/content/links";
import { proofFacts, proofItems } from "../src/content/proof";
import { release, replayExplanation, replayLabel } from "../src/content/release";
import { capabilities, knownLimitations } from "../src/content/vision";
import { walkthroughs } from "../src/content/walkthroughs";

const showcaseRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(showcaseRoot, "..");
const failures: string[] = [];
const fail = (message: string) => failures.push(message);
const requireIncludes = (contents: string, value: string, label: string) => { if (!contents.includes(value)) fail(`${label} is missing: ${value}`); };
const sourceFiles = [
  path.join(showcaseRoot, "index.html"),
  ...readdirSync(path.join(showcaseRoot, "src"), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(?:ts|css)$/u.test(entry.name))
    .map((entry) => path.join(entry.parentPath, entry.name)),
];
const publicTextFiles = readdirSync(path.join(showcaseRoot, "public"), { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile() && /\.(?:svg|txt|json|webmanifest)$/u.test(entry.name))
  .map((entry) => path.join(entry.parentPath, entry.name));
const combined = [...sourceFiles, ...publicTextFiles].map((file) => readFileSync(file, "utf8")).join("\n");
const main = readFileSync(path.join(showcaseRoot, "src", "main.ts"), "utf8");
const index = readFileSync(path.join(showcaseRoot, "index.html"), "utf8");

for (const section of ["problem", "how", "tour", "walkthrough", "difference", "vision", "architecture", "proof", "run-local", "links"]) requireIncludes(main, `id=\"${section}\"`, "Required section");
for (const value of [replayLabel, replayExplanation]) requireIncludes(combined, value, "Required public truth");
for (const value of ["Build your game one", "Generated quest implementation is intentionally not enabled in Forge v0.2"]) requireIncludes(main, value, "Required public truth");

if (walkthroughs.length !== 2) fail("Exactly two walkthroughs are required.");
for (const walkthrough of walkthroughs) {
  if (walkthrough.steps.length === 0 || walkthrough.steps.length > 7) fail(`${walkthrough.id} must have one to seven steps.`);
  for (const step of walkthrough.steps) {
    if (step.systems.length === 0) fail(`${walkthrough.id}/${step.id} lacks a responsible system.`);
    if (!step.title || !step.summary || !step.why || !step.technicalProof) fail(`${walkthrough.id}/${step.id} has incomplete content.`);
    if (!evidenceAssets.some((asset) => asset.id === step.evidenceId)) fail(`${walkthrough.id}/${step.id} references missing evidence ${step.evidenceId}.`);
  }
}

for (const asset of evidenceAssets) {
  if (path.isAbsolute(asset.sourcePath)) fail(`${asset.id} exposes an absolute repository path.`);
  const source = path.join(repositoryRoot, asset.sourcePath);
  const publicAsset = path.join(showcaseRoot, "public", asset.publicPath.replace(/^\//u, ""));
  if (!existsSync(source)) fail(`${asset.id} source evidence is missing: ${asset.sourcePath}`);
  if (!existsSync(publicAsset)) fail(`${asset.id} public evidence is missing: ${asset.publicPath}`);
  if (!asset.sourcePath || !asset.sourceCommit || !asset.captureDate || !asset.alt) fail(`${asset.id} has incomplete provenance.`);
  if (asset.classification.includes("illustration")) fail(`${asset.id} is decorative but referenced as walkthrough evidence.`);
}

for (const claim of capabilities) {
  if (claim.horizon === "working-now" && (!claim.source || !existsSync(path.join(repositoryRoot, claim.source)))) fail(`Current claim ${claim.id} lacks repository evidence.`);
  if (claim.horizon !== "working-now" && claim.source) fail(`Planned/future claim ${claim.id} must not look implemented.`);
}
if (!knownLimitations.some((item) => item.includes("guided replay"))) fail("Known limitations must identify the showcase as a guided replay.");
for (const proof of proofItems) if (!existsSync(path.join(repositoryRoot, proof.source))) fail(`Proof source is missing: ${proof.source}`);
if (!existsSync(path.join(repositoryRoot, proofFacts.source))) fail("Proof fact source is missing.");

for (const [key, value] of Object.entries(publicLinks)) {
  if (!value) continue;
  let url: URL;
  try { url = new URL(value); } catch { fail(`${key} is not a valid URL.`); continue; }
  if (url.protocol !== "https:") fail(`${key} must use HTTPS.`);
  if (/localhost|127\.0\.0\.1|plan\.agent-native\.com/iu.test(url.hostname)) fail(`${key} is not a public submission URL.`);
}
if (!publicLinks.repository.includes("github.com/MechanizedIT/forge-game-dev")) fail("Canonical repository URL is stale.");
if (publicLinks.demoVideo === undefined && /href=.{0,100}Demo video coming soon/iu.test(main)) fail("Unconfigured demo is rendered as an active link.");

if (/(?:fetch\s*\(|XMLHttpRequest|WebSocket|EventSource)/u.test(main)) fail("The walkthrough must not require runtime network data.");
if (/(?:[A-Z]:[\\/]Users[\\/]|\/(?:Users|home)\/[^\s'"]+)/u.test(combined)) fail("Public source contains an absolute user path.");
if (/(?:\/feedback\b|plan\.agent-native\.com|api[_-]?key\s*[:=]|authorization\s*[:=]|bearer\s+[a-z0-9])/iu.test(combined)) fail("Public source contains private configuration or credential material.");
if (/generated[- ]quest implementation (?:is|now) (?:enabled|available)/iu.test(combined)) fail("Generated quest implementation is presented as current.");
if (release.productVersion !== "v0.2" || release.representedTag !== "v0.2.0" || release.sourceCommit !== "08cffa71cd802b14c6c72ad343f9fa5b4007a482") fail("Release representation is stale or contradictory.");
requireIncludes(index, "og-forge.png", "Open Graph metadata");
if (!existsSync(path.join(showcaseRoot, "public", "og-forge.png"))) fail("Rendered Open Graph image is missing.");
requireIncludes(index, "manifest.webmanifest", "Web manifest metadata");

const dist = path.join(showcaseRoot, "dist");
if (!existsSync(path.join(dist, "index.html"))) fail("Static production build is missing.");
else {
  const files = readdirSync(dist, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => path.join(entry.parentPath, entry.name));
  const jsBytes = files.filter((file) => file.endsWith(".js")).reduce((sum, file) => sum + statSync(file).size, 0);
  const cssBytes = files.filter((file) => file.endsWith(".css")).reduce((sum, file) => sum + statSync(file).size, 0);
  const heroBytes = statSync(path.join(dist, "hero-workshop.webp")).size;
  const initialWalkthroughImageBytes = statSync(path.join(dist, "evidence", "launchpad.webp")).size;
  const initialBytes = jsBytes + cssBytes + statSync(path.join(dist, "index.html")).size + heroBytes + initialWalkthroughImageBytes;
  if (jsBytes > 45_000) fail(`JavaScript budget exceeded: ${jsBytes} bytes.`);
  if (cssBytes > 45_000) fail(`CSS budget exceeded: ${cssBytes} bytes.`);
  if (heroBytes > 200_000) fail(`Hero image budget exceeded: ${heroBytes} bytes.`);
  if (initialBytes > 260_000) fail(`Initial document asset budget exceeded: ${initialBytes} bytes.`);
  const largest = files.map((file) => ({ file, size: statSync(file).size })).sort((a, b) => b.size - a.size)[0];
  if (!largest) throw new Error("Static output contains no files.");
  console.log(JSON.stringify({ jsBytes, cssBytes, initialBytes, initialWalkthroughImageBytes, largestPublicAsset: path.relative(dist, largest.file), largestPublicAssetBytes: largest.size }, null, 2));
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}
console.log(`Showcase validation passed: ${walkthroughs.length} walkthroughs, ${walkthroughs.reduce((sum, item) => sum + item.steps.length, 0)} steps, ${evidenceAssets.length} public evidence assets, ${capabilities.length} capability claims.`);
