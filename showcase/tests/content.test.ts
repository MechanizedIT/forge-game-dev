import assert from "node:assert/strict";
import { test } from "node:test";
import { evidenceAssets } from "../src/content/evidence";
import { publicLinks } from "../src/content/links";
import { release } from "../src/content/release";
import { capabilities } from "../src/content/vision";
import { walkthroughs } from "../src/content/walkthroughs";

test("content manifest represents the immutable v0.2 release", () => {
  assert.equal(release.productVersion, "v0.2");
  assert.equal(release.representedTag, "v0.2.0");
  assert.equal(release.sourceCommit, "08cffa71cd802b14c6c72ad343f9fa5b4007a482");
  assert.equal(publicLinks.repository, "https://github.com/MechanizedIT/forge-game-dev");
});

test("both walkthroughs remain bounded and evidence-backed", () => {
  assert.deepEqual(walkthroughs.map((item) => item.id), ["sample", "new-game"]);
  const evidenceIds = new Set(evidenceAssets.map((asset) => asset.id));
  for (const walkthrough of walkthroughs) {
    assert.ok(walkthrough.steps.length > 0 && walkthrough.steps.length <= 7);
    assert.equal(new Set(walkthrough.steps.map((step) => step.id)).size, walkthrough.steps.length);
    for (const step of walkthrough.steps) {
      assert.ok(step.systems.length > 0);
      assert.ok(evidenceIds.has(step.evidenceId));
      assert.ok(step.technicalProof.length > 20);
    }
  }
});

test("evidence classifications never confuse illustration with proof", () => {
  for (const asset of evidenceAssets) {
    assert.equal(asset.classification, "Real Forge application state");
    assert.equal(asset.publicSafe, true);
    assert.match(asset.sourcePath, /^docs\/evidence\//u);
    assert.doesNotMatch(asset.sourcePath, /^[A-Za-z]:|^\//u);
  }
});

test("optional links are absent by default rather than fake placeholders", () => {
  if (!process.env.VITE_SHOWCASE_DEMO_URL) assert.equal(publicLinks.demoVideo, undefined);
  if (!process.env.VITE_SHOWCASE_LIVE_URL) assert.equal(publicLinks.liveSite, undefined);
  if (!process.env.VITE_SHOWCASE_DEVPOST_URL) assert.equal(publicLinks.devpost, undefined);
  for (const value of Object.values(publicLinks).filter(Boolean)) assert.match(value as string, /^https:\/\//u);
});

test("current and future capability labels are explicit", () => {
  const current = capabilities.filter((claim) => claim.horizon === "working-now");
  const planned = capabilities.filter((claim) => claim.horizon !== "working-now");
  assert.ok(current.length > 0 && planned.length > 0);
  assert.ok(current.every((claim) => claim.source));
  assert.ok(planned.every((claim) => !claim.source));
  assert.ok(planned.some((claim) => claim.id === "generated-build"));
});
