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

test("v0.2 source keeps launch, placeholder, responsive, and reduced-motion promises explicit", async () => {
  const [app, styles, html, packageJsonText] = await Promise.all([
    readFile(path.join(repositoryRoot, "src", "dashboard-v2", "App.tsx"), "utf8"),
    readFile(path.join(repositoryRoot, "src", "dashboard-v2", "styles.css"), "utf8"),
    readFile(path.join(repositoryRoot, "v0.2.html"), "utf8"),
    readFile(path.join(repositoryRoot, "package.json"), "utf8"),
  ]);

  assert.match(app, /What would you like to build\?/);
  assert.match(app, /Explore sample world/);
  assert.match(app, /Start a new game/);
  assert.match(app, /Upcoming v0\.2 capability/);
  assert.match(app, /No GPT call, project generation, or artifact creation is active/);
  assert.match(app, /Review Enemy Targeting/);
  assert.match(styles, /@media \(max-width: 800px\)/);
  assert.match(styles, /@media \(max-width: 480px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(html, /src\/dashboard-v2\/main\.tsx/);

  const packageJson = JSON.parse(packageJsonText) as { scripts: Record<string, string> };
  assert.equal(packageJson.scripts.forge, "npm run dashboard:build && npm run dashboard:host");
  assert.equal(packageJson.scripts["forge:v0.1"], "npm run dashboard:build && npm run dashboard:host -- --legacy");
  assert.equal(packageJson.scripts["forge:v0.2"], "npm run dashboard:build && npm run dashboard:host -- --v0.2");
});
