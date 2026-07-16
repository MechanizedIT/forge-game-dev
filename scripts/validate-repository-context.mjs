import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const contextFiles = [
  "AGENTS.md",
  "docs/REPOSITORY_GUIDE.md",
  "docs/CHANGE_MAP.md",
  "docs/research/REPOSITORY_CONTEXT_TOOLS.md",
  "src/dashboard-host/AGENTS.md",
  "src/quest-runner/AGENTS.md",
  "src/blueprint-planner/AGENTS.md",
  "src/project-creation/AGENTS.md",
  "src/generated-project-world/AGENTS.md",
  "src/generated-quest-runner/AGENTS.md",
  "src/godot/AGENTS.md",
];

const requiredSubsystemIds = [
  "dashboard-host-api",
  "sample-workflow",
  "launchpad-project-world",
  "blueprint-planning",
  "project-creation",
  "godot-verification",
  "project-registry",
  "generated-project-world",
  "generated-quest-runner",
  "public-showcase",
  "visual-review-evidence",
  "documentation-status",
];

const guideSections = [
  "# Forge Repository Guide",
  "## How to use this guide",
  "## Documentation entry points",
  "## Subsystem guide",
  "## Authoritative state matrix",
  "## Nested instruction evaluation",
  "## Documentation maintenance",
];

const subsystemFields = [
  "**Purpose:**",
  "**Owns:**",
  "**Does not own:**",
  "**Start:**",
  "**Contracts and artifacts:**",
  "**Consumers:**",
  "**Tests:**",
  "**Decisions:**",
  "**Protect:**",
];

const changeMapFields = [
  "**Symptom or request:**",
  "**Owning subsystem:**",
  "**Start:**",
  "**Contracts and tests:**",
  "**Neighboring consumers:**",
  "**Do not change first:**",
];

const requiredChangeEntries = [
  "Launchpad or v0.2 UI change",
  "Prepared sample quest workflow change or failure",
  "Open roadmap, system quest, or legacy blueprint planning failure",
  "Generated project creation failure",
  "Registry or restart failure",
  "Godot download, launch, or automated verification failure",
  "Generated roadmap, quest brief, or Project World display failure",
  "Native planned-quest run, scope, Worked completion, or undo failure",
  "Persistence or Chronicle behavior change",
  "Responsive or browser-review failure",
  "Static showcase content, build, or review failure",
];

function fail(message) {
  throw new Error(message);
}

function requireIncludes(contents, values, label) {
  for (const value of values) {
    if (!contents.includes(value)) fail(`${label} is missing required content: ${value}`);
  }
}

function assertUnique(values, label) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) fail(`Duplicate ${label}: ${value}`);
    seen.add(value);
  }
}

function relativeMarkdownLinks(contents) {
  const links = [];
  const pattern = /\[[^\]]*\]\(([^)]+)\)/gu;
  for (const match of contents.matchAll(pattern)) {
    const raw = match[1].trim().replace(/^<|>$/gu, "");
    const target = raw.split(/\s+['"]/u, 1)[0].split("#", 1)[0];
    if (!target || target.startsWith("#") || /^[a-z][a-z0-9+.-]*:/iu.test(target)) continue;
    links.push(target);
  }
  return links;
}

async function validateLinks(file, contents) {
  const sourcePath = path.join(repositoryRoot, file);
  const links = relativeMarkdownLinks(contents);
  for (const link of links) {
    const target = path.resolve(path.dirname(sourcePath), decodeURIComponent(link));
    const relative = path.relative(repositoryRoot, target);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      fail(`${file} references a path outside the repository: ${link}`);
    }
    await access(target).catch(() => fail(`${file} references a missing path: ${link}`));
  }
  return links;
}

function subsystemBlocks(guide) {
  const matches = [...guide.matchAll(/<!-- forge-subsystem:([a-z0-9-]+) -->/gu)];
  const ids = matches.map((match) => match[1]);
  assertUnique(ids, "subsystem identifier");
  requireIncludes(ids.join("\n"), requiredSubsystemIds, "Repository guide subsystem list");
  if (ids.length !== requiredSubsystemIds.length) {
    fail(`Repository guide has ${ids.length} subsystem identifiers; expected ${requiredSubsystemIds.length}.`);
  }

  return matches.map((match, index) => ({
    id: match[1],
    contents: guide.slice(match.index, matches[index + 1]?.index ?? guide.indexOf("## Authoritative state matrix")),
  }));
}

function validateGuide(guide) {
  requireIncludes(guide, guideSections, "Repository guide");
  for (const block of subsystemBlocks(guide)) {
    requireIncludes(block.contents, [`### ${block.id} —`, ...subsystemFields], `Subsystem ${block.id}`);
  }
}

function validateChangeMap(changeMap) {
  requireIncludes(changeMap, [
    "# Forge Change Map",
    "## Common changes and failures",
    "## Maintenance rule",
  ], "Change map");
  for (const entry of requiredChangeEntries) {
    const heading = `### ${entry}`;
    const start = changeMap.indexOf(heading);
    if (start === -1) fail(`Change map is missing required entry: ${entry}`);
    const next = changeMap.indexOf("\n### ", start + heading.length);
    const block = changeMap.slice(start, next === -1 ? changeMap.indexOf("\n## Maintenance rule") : next);
    requireIncludes(block, changeMapFields, `Change map entry ${entry}`);
  }
}

function validateToolEvaluation(contents) {
  requireIncludes(contents, [
    "# Repository Context Tool Evaluation",
    "## Graphify",
    "## Repomix",
    "## Aider-style repository maps",
    "## Recommended bounded experiment",
  ], "Repository context tool evaluation");
}

function validateNestedInstructions(files) {
  const required = ["## Owns", "## Does not own", "## Start here", "## Invariants", "## Required checks"];
  for (const [file, contents] of files) {
    if (file === "AGENTS.md") continue;
    requireIncludes(contents, required, file);
  }
}

async function main() {
  const loaded = new Map();
  for (const file of contextFiles) {
    const absolute = path.join(repositoryRoot, file);
    const contents = await readFile(absolute, "utf8").catch(() => fail(`Missing required context file: ${file}`));
    loaded.set(file, contents);
  }

  validateGuide(loaded.get("docs/REPOSITORY_GUIDE.md"));
  validateChangeMap(loaded.get("docs/CHANGE_MAP.md"));
  validateToolEvaluation(loaded.get("docs/research/REPOSITORY_CONTEXT_TOOLS.md"));
  validateNestedInstructions([...loaded.entries()].filter(([file]) => file.endsWith("/AGENTS.md")));

  const allLinks = [];
  for (const [file, contents] of loaded) {
    allLinks.push(...(await validateLinks(file, contents)).map((target) => ({ file, target })));
  }

  const testLinks = allLinks.filter(({ target }) => /(^|\/)tests\/[^/]+\.test\.ts$/u.test(target.replaceAll("\\", "/")));
  if (testLinks.length === 0) fail("Navigation documents must reference protecting test files.");
  for (const { file, target } of testLinks) {
    if (!target.endsWith(".test.ts")) fail(`${file} has an invalid test reference: ${target}`);
  }

  console.log(
    `Repository context valid: ${requiredSubsystemIds.length} subsystems, ${requiredChangeEntries.length} change routes, ${allLinks.length} path references, ${testLinks.length} test references.`,
  );
}

main().catch((error) => {
  console.error(`Repository context validation failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
