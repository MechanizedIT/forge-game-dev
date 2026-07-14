import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { sampleWorldFixture } from "../src/dashboard-v2/fixture.js";
import { returnToLaunchpad, viewForLaunchChoice } from "../src/dashboard-v2/state.js";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("v0.2 launch choices navigate to honest isolated preview states", () => {
  assert.equal(viewForLaunchChoice("explore_sample"), "sample_world");
  assert.equal(viewForLaunchChoice("create_game"), "create_placeholder");
  assert.equal(returnToLaunchpad(), "launchpad");
});

test("sample Project World fixture exposes the exact required roadmap states", () => {
  assert.deepEqual(
    sampleWorldFixture.quests.map(({ id, state }) => ({ id, state })),
    [
      { id: "player-movement", state: "completed" },
      { id: "enemy-targeting", state: "available" },
      { id: "game-feel", state: "planned" },
      { id: "polish", state: "future" },
      { id: "new-idea", state: "idea" },
    ],
  );
  assert.equal(sampleWorldFixture.quests.filter((quest) => quest.recommended).length, 1);
  assert.equal(sampleWorldFixture.quests.find((quest) => quest.recommended)?.id, "enemy-targeting");
});

test("v0.2 source keeps roadmap semantics, placeholder honesty, and companion states explicit", async () => {
  const [app, styles, html, packageJsonText] = await Promise.all([
    readFile(path.join(repositoryRoot, "src", "dashboard-v2", "App.tsx"), "utf8"),
    readFile(path.join(repositoryRoot, "src", "dashboard-v2", "styles.css"), "utf8"),
    readFile(path.join(repositoryRoot, "v0.2.html"), "utf8"),
    readFile(path.join(repositoryRoot, "package.json"), "utf8"),
  ]);

  assert.match(app, /What would you like to build\?/);
  assert.match(app, /sample-miniature/);
  assert.match(app, /create-miniature/);
  assert.match(app, /Explore sample world/);
  assert.match(app, /Start a new game/);
  assert.equal(app.match(/<RoadmapConnector kind="current"/g)?.length, 1);
  assert.equal(app.match(/<RoadmapConnector kind="planned"/g)?.length, 2);
  assert.match(app, /className="roadmap-sequence"/);
  assert.match(app, /className="idea-port"/);
  assert.match(app, /\+ Add an idea/);
  assert.doesNotMatch(app, /<QuestModule[^>]+new-idea/);
  assert.match(app, /This quest creates the first real\s+encounter/);
  assert.match(app, /Upcoming v0\.2 capability/);
  assert.match(app, /No GPT call, project generation, or artifact creation is active/);
  assert.match(app, /Review Enemy Targeting/);
  assert.match(styles, /grid-template-columns: minmax\(135px, \.9fr\).*minmax\(185px, 1\.18fr\)/);
  assert.match(styles, /\.online-segment \{ background: var\(--mint\)/);
  assert.match(styles, /\.available-segment \{ background: var\(--ember\)/);
  assert.match(styles, /\.planned-segment \{ width: 100%; border-top: 2px dashed/);
  assert.match(styles, /\.idea-port::before/);
  assert.match(styles, /@media \(max-width: 900px\)/);
  assert.match(styles, /\.roadmap-sequence \{ min-height: 0; grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(styles, /\.companion-ready/);
  assert.match(styles, /\.companion-focused/);
  assert.match(styles, /\.companion-thinking/);
  assert.match(styles, /\.companion-complete/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(html, /src\/dashboard-v2\/main\.tsx/);

  const packageJson = JSON.parse(packageJsonText) as { scripts: Record<string, string> };
  assert.equal(packageJson.scripts.forge, "npm run dashboard:build && npm run dashboard:host");
  assert.equal(packageJson.scripts["forge:v0.1"], "npm run dashboard:build && npm run dashboard:host -- --legacy");
  assert.equal(packageJson.scripts["forge:v0.2"], "npm run dashboard:build && npm run dashboard:host -- --v0.2");
});
