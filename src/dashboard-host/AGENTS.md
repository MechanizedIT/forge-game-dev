# Dashboard Host Instructions

## Owns

HTTP/static serving, same-origin request gates, service composition, and the protected sample dashboard orchestration.

## Does not own

Blueprint rules, generated-project creation, registry storage, generated-world artifact meaning, or React presentation.

## Start here

Read `server.ts`, `cli.ts`, the relevant domain service, and `../../docs/REPOSITORY_GUIDE.md`.

## Invariants

Routes validate exact bodies and same-origin mutations. The host delegates durable state to domain owners. Default and legacy sample behavior stay compatible.

## Required checks

Run `npm test -- --test-name-pattern=dashboard` only if supported; otherwise run `npm test`, plus `npm run check:v0.1` for sample-route changes.
