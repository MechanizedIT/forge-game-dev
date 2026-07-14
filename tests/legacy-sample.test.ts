import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("default and legacy entries render the same protected sample experience", async () => {
  const defaultAppEntry = await readFile(
    path.join(repositoryRoot, "src", "dashboard", "App.tsx"),
    "utf8",
  );
  assert.equal(defaultAppEntry.trim(), 'export { default } from "./LegacySampleApp.js";');

  const legacyMain = await readFile(
    path.join(repositoryRoot, "src", "dashboard", "legacy-main.tsx"),
    "utf8",
  );
  assert.match(legacyMain, /import LegacySampleApp from "\.\/LegacySampleApp\.js"/);
  assert.match(legacyMain, /<LegacySampleApp \/>/);

  const packageJson = JSON.parse(
    await readFile(path.join(repositoryRoot, "package.json"), "utf8"),
  ) as { scripts: Record<string, string> };
  assert.equal(
    packageJson.scripts.forge,
    "npm run dashboard:build && npm run dashboard:host",
  );
  assert.equal(
    packageJson.scripts["forge:v0.1"],
    "npm run dashboard:build && npm run dashboard:host -- --legacy",
  );

  const legacyHtml = await readFile(path.join(repositoryRoot, "legacy.html"), "utf8");
  assert.match(legacyHtml, /src\/dashboard\/legacy-main\.tsx/);
});
