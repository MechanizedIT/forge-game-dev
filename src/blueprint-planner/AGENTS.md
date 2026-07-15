# Blueprint Planner Instructions

## Owns

Idea intake, bounded clarification, GPT session behavior, blueprint validation/repair, provenance, cancellation, and in-memory approval state.

## Does not own

Filesystem creation, starter source, registry writes, Godot execution, or generated-quest implementation.

## Start here

Read `../../docs/PRODUCT_VISION.md`, `service.ts`, `prompt.ts`, `sdk.ts`,
`../contracts/game-blueprint.ts`, and the latest relevant plan or closeout linked
from `../../docs/REPOSITORY_GUIDE.md`.

## Invariants

Structured output, IDs, dependencies, ownership, and approval state remain
deterministic; approval alone writes no project files. Game ideas, systems, and
mechanics are open-ended creator content and must not be restricted by a fixed
foundation, game-type enum, starter-delta catalog, or verification-profile
catalog.

The current Task B implementation may still contain one-shot clarification,
Top-down Arena reconciliation, and bounded roadmap edits. Preserve that behavior
only when compatibility requires it. Treat it as migration input, not the product
goal, and do not expand its catalogs.

## Required checks

Run `tests/blueprint-planning.test.ts`, `tests/dashboard-v2.test.ts`, and `npm run check:v0.1` when host wiring changes.
