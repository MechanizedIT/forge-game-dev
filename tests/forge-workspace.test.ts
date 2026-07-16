import assert from "node:assert/strict";
import test from "node:test";

import { createRustRunnerFixture } from "../src/dashboard-v2/forge-workspace/fixture.js";
import { addEntity, updateEntity } from "../src/dashboard-v2/forge-workspace/repository.js";
import { addRouteFor, ancestorsOf, detailRouteFor, editRouteFor, mapRouteFor } from "../src/dashboard-v2/forge-workspace/routes.js";

test("Rust Runner fixture exposes the full beginner-facing hierarchy", () => {
  const state = createRustRunnerFixture();
  const world = state.entities[state.worldId]!;
  const region = state.entities["crash-landing"]!;
  const town = state.entities["wreck-site"]!;
  const building = state.entities["run-and-jump"]!;
  const part = state.entities["tune-jump-arc"]!;

  assert.deepEqual(ancestorsOf(state, part).map((item) => item.kind), ["world", "region", "town", "building", "part"]);
  assert.deepEqual(ancestorsOf(state, part).map((item) => item.id), [world.id, region.id, town.id, building.id, part.id]);
  assert.equal(new Set([world.imageRef, region.imageRef, town.imageRef, building.imageRef]).size, 4);
});

test("workspace routes preserve hierarchy and support Back/Forward-friendly URLs", () => {
  const state = createRustRunnerFixture();
  const building = state.entities["run-and-jump"]!;
  const part = state.entities["tune-jump-arc"]!;

  assert.equal(mapRouteFor(state, building), "/world/rust-runner/map/region/crash-landing/town/wreck-site/building/run-and-jump");
  assert.equal(detailRouteFor(state, part), "/world/rust-runner/part/tune-jump-arc");
  assert.equal(editRouteFor(state, building), "/world/rust-runner/building/run-and-jump/edit");
  assert.equal(addRouteFor(state, building, "part"), "/world/rust-runner/building/run-and-jump/add/part");
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

