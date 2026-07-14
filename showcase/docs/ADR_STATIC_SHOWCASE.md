# ADR: Isolated Static Showcase

- **Status:** Accepted for Task 8
- **Decision date:** 2026-07-14

## Context

Judges need a no-install explanation of Forge, but the operational application requires trusted local access to project files, Codex, Godot, Git, and operating-system actions. Recreating those services on a public host would weaken the truth boundary and duplicate Forge's state machines.

## Decision

Build one isolated static Vite surface under `showcase/` using vanilla TypeScript, semantic HTML, CSS, typed committed content, and optimized public assets. The walkthrough changes only browser-local presentation state and URL query parameters. It makes no runtime API call and imports no operational Forge module.

## Consequences

- Any static host can deploy the output without secrets or backend infrastructure.
- Visitors can understand and share Forge, but cannot run or simulate Forge operations.
- Public claims can drift unless typed sources, source-evidence links, validation, and review stay current.
- The operational application remains authoritative; the showcase is an additional submission surface, not a replacement.
