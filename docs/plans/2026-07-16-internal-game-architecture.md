# Internal Game Architecture Plan

## Goal

Help Forge fit one small creator-directed Step into the larger game without adding a required creator workflow tier.

## Plan

1. Persist a validated `ProjectArchitecture` at `.forge/architecture.json`.
2. Keep `GameArea` flat: identity, description, category, files, dependencies, Experience/System links, Step/Quest links, constraints, recent changes, and timestamp.
3. Initialize deterministically from the Project Model, accepted quest records, approved files, bounded project-file data, and prior run results.
4. Add optional architecture summaries and advisory warnings during Step file/work-order review.
5. Select one primary area, up to three secondary areas, five previous Steps, and only selected files for Codex context.
6. Incrementally record changed files, verification, playtest, feedback, and cross-area touches after work.
7. Add a Game Areas Atlas filter with optional edits and keep World → Experiences → Steps unchanged.
8. Protect the change with focused service/context/UI checks, the full suite, production build, compatibility checks, and browser QA.

## Acceptance

- Project/System/Quest and the existing runner remain authoritative.
- Architecture reduces context rather than dumping project history.
- No architecture review becomes a required gate.
- No new dependency, semantic index, graph store, or per-file AI classification is introduced.
