import assert from "node:assert/strict";
import test from "node:test";

import type { GeneratedProjectWorldSnapshot } from "../src/generated-project-world/shared.js";
import { createRustRunnerFixture } from "../src/dashboard-v2/forge-workspace/fixture.js";
import { adaptGeneratedProjectWorld } from "../src/dashboard-v2/forge-workspace/real-project-adapter.js";
import { addEntity, updateEntity } from "../src/dashboard-v2/forge-workspace/repository.js";
import { addRouteFor, ancestorsOf, detailRouteFor, editRouteFor, mapRouteFor } from "../src/dashboard-v2/forge-workspace/routes.js";

test("Rust Runner fixture exposes the direct beginner-facing hierarchy", () => {
  const state = createRustRunnerFixture();
  const world = state.entities[state.worldId]!;
  const building = state.entities["run-and-jump"]!;
  const part = state.entities["tune-jump-arc"]!;

  assert.deepEqual(ancestorsOf(state, part).map((item) => item.kind), ["world", "building", "part"]);
  assert.deepEqual(ancestorsOf(state, part).map((item) => item.id), [world.id, building.id, part.id]);
  assert.equal(world.childIds.every((id) => state.entities[id]?.kind === "building"), true);
});

test("workspace routes preserve hierarchy and support Back/Forward-friendly URLs", () => {
  const state = createRustRunnerFixture();
  const building = state.entities["run-and-jump"]!;
  const part = state.entities["tune-jump-arc"]!;

  assert.equal(mapRouteFor(state, building), "/world/rust-runner/map/building/run-and-jump");
  assert.equal(detailRouteFor(state, part), "/world/rust-runner/part/tune-jump-arc");
  assert.equal(editRouteFor(state, building), "/world/rust-runner/building/run-and-jump/edit");
  assert.equal(addRouteFor(state, building, "part"), "/world/rust-runner/building/run-and-jump/add/part");
});

test("real Project, System, and Quest state adapts to World, Building, and Part", () => {
  const snapshot = {
    project: { projectId: "signal-sweep", displayName: "Signal Sweep", lastOpenedAt: "2026-07-16T00:00:00.000Z" },
    projectModel: {
      project: { vision: "Activate a relay.", engine: { projectFile: "project.godot", mainScene: "scenes/main.tscn" } },
      systems: [{ systemId: "first-playable", title: "First Playable", outcome: "Activate one relay.", status: "active", questIds: ["relay", "camera"] }],
      quests: [
        { questId: "relay", systemId: "first-playable", title: "Activate relay", playerVisibleOutcome: "The relay lights up.", doneWhen: ["The light is visible."], status: "completed" },
        { questId: "camera", systemId: "first-playable", title: "Calm camera", playerVisibleOutcome: "The camera stays calm.", doneWhen: ["The camera follows smoothly."], status: "available" },
      ],
    },
    systemQuestPlan: null,
    quests: [],
    vision: { smallestPlayableResult: "One relay can be activated." },
    activity: [],
  } as unknown as GeneratedProjectWorldSnapshot;
  const state = adaptGeneratedProjectWorld(snapshot);

  assert.equal(state.entities["signal-sweep"]?.kind, "world");
  assert.deepEqual(state.entities["signal-sweep"]?.childIds, ["first-playable"]);
  assert.equal(state.entities["first-playable"]?.kind, "building");
  assert.deepEqual(state.entities["first-playable"]?.childIds, ["relay", "camera"]);
  assert.equal(state.entities["relay"]?.kind, "part");
  assert.equal(state.entities["signal-sweep"]?.progress, 50);
  assert.equal(state.entities["first-playable"]?.progress, 50);
});

test("prototype repository helpers keep entities normalized and immutable", () => {
  const state = createRustRunnerFixture();
  const building = state.entities["run-and-jump"]!;
  const added = addEntity(state, building.id, "part", {
    name: "Polish landing dust",
    description: "Add one readable landing effect.",
    outcome: "A dust puff appears on a firm landing.",
  });

  assert.notEqual(added, state);
  assert.equal(state.entities["polish-landing-dust"], undefined);
  assert.equal(added.entities["polish-landing-dust"]?.parentId, building.id);
  assert.equal(added.entities[building.id]?.childIds.at(-1), "polish-landing-dust");

  const updated = updateEntity(added, "polish-landing-dust", {
    name: "Polish the landing",
    description: "Make the landing readable.",
    outcome: "The robot feels grounded.",
  });
  assert.equal(updated.entities["polish-landing-dust"]?.name, "Polish the landing");
  assert.equal(added.entities["polish-landing-dust"]?.name, "Polish landing dust");
});
