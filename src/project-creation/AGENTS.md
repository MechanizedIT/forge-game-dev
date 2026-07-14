# Project Creation Instructions

## Owns

Controlled starter assembly, safe Forge-owned paths, artifact generation, fixed verification, local Git baseline, failure cleanup/evidence, and the project registry.

## Does not own

GPT content generation, sample workspace reset, generated Project World rendering, or generated-quest execution.

## Start here

Read `service.ts`, `filesystem.ts`, `artifacts.ts`, `registry.ts`, `starter.ts`, and `../../docs/REPOSITORY_GUIDE.md`.

## Invariants

Creation requires a current approved blueprint and exact confirmation; paths stay canonical direct children; promote only after validation/Godot/Git; register last; cleanup only verified transaction-owned paths.

## Required checks

Run `tests/project-creation.test.ts`, `tests/contracts.test.ts`, and `npm run check:v0.1`.
