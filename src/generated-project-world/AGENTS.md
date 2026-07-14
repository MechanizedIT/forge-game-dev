# Generated Project World Instructions

## Owns

Registry-resolved artifact joins, generated-world snapshots, selection persistence, idea seeds with derived activity, and bounded launch/folder actions.

## Does not own

Project creation, registry identity/location writes except explicit open recency, authoritative Chronicle/roadmap mutation, or generated-quest implementation.

## Start here

Read `service.ts`, `shared.ts`, `../contracts/generated-project.ts`, and `../../docs/REPOSITORY_GUIDE.md`.

## Invariants

GET is byte-for-byte read-only; registry paths and manifest artifacts are containment-checked; idea saves do not rewrite Chronicle or roadmap; preview and implementation claims remain truthful.

## Required checks

Run `tests/generated-project-world.test.ts`, `tests/project-creation.test.ts`, and `npm run check:v0.1`.
