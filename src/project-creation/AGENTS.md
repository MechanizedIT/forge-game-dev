# Project Creation Instructions

## Owns

Controlled starter assembly, safe Forge-owned paths, artifact generation, fixed verification, local Git baseline, failure cleanup/evidence, and the project registry.

## Does not own

GPT content generation, sample workspace reset, generated Project World rendering, or generated-quest execution.

## Start here

Read `../../docs/PRODUCT_VISION.md`, `service.ts`, `filesystem.ts`, `artifacts.ts`,
`registry.ts`, `starter.ts`, and `../../docs/REPOSITORY_GUIDE.md`.

## Invariants

Creation requires a current approved blueprint and exact confirmation; paths stay canonical direct children; promote only after validation/Godot/Git; register last; cleanup only verified transaction-owned paths.

The current controlled Top-down Arena starter is a compatibility fixture and
demo accelerator, not Forge's list of supported games. Do not expand it into a
template or capability framework. Product-direction work should move toward one
minimal Forge-owned Godot project path whose roadmap remains open-ended.

## Required checks

Run `tests/project-creation.test.ts`, `tests/contracts.test.ts`, and `npm run check:v0.1`.
