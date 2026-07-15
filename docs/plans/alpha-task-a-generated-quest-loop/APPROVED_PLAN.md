# Forge Alpha Task A — Approved Implementation Plan

Approved by the creator on 2026-07-14 from reviewed planning commit
`e2e4e228a9c1cf68064a83733c10ca06f793fcca`.

Interactive plan: <https://plan.agent-native.com/plans/plan-2057b023c0974653>

## Outcome

Take exactly one eligible generated Gravity Tap quest through a creator-adjusted
plan, fingerprinted existing-file contract, explicit approval, official Codex
SDK execution, independent boundary/project/mechanic proof, visible playtest,
creator confirmation, one atomic local completion commit, and restart recovery.

## Approved decisions

- Implement Task A only. Do not start Task B or add new generated game files.
- Preserve the prepared Enemy Targeting path, controlled starter, other generated
  projects, Task 7 evidence, public showcase, and `v0.2.0` tag.
- Keep legacy generated artifacts readable without writing during GET. Materialize
  generated-only v2 artifacts only through Adjust, Defer, or completion.
- Use a Forge-owned plan-history commit for explicit Adjust or Defer mutations so
  Build starts from a clean generated-project HEAD.
- Let Codex edit only one to four Forge-resolved existing UTF-8 game files with
  workspace-write, no network, no approval escalation, and no additional roots.
- Store durable run evidence under ignored `.forge/local/runs/<runId>/` and use a
  single exclusive generated-run lock.
- Treat full controlled inventory hashes—not Git status alone—as the boundary.
- Require separate boundary, project-health, mechanic, and creator proof. Codex's
  summary is never proof.
- Permit only `worked` to enter completion; rerun proof before committing.
- Create one completion commit named `forge: complete <questId> [run:<runId>]` and
  repair a missing ignored receipt without creating another commit.

## Ordered implementation

1. Create the isolated `codex/alpha-task-a-generated-quest-loop` worktree from the
   reviewed planning commit and re-check the release tag and real project baseline.
2. Add strict generated v2, implementation-contract, journal, proof, and receipt
   schemas with legacy read adapters.
3. Add deterministic registered-project, role, existing-file, inventory, Git, and
   40,000-character context preparation.
4. Add official-SDK orchestration with sanitized staged progress and durable lock
   and journal state.
5. Add independent boundary, controlled starter-health, and
   `gravity_orb_presence_v1` proof.
6. Add exact preimage rollback and interruption/concurrent-edit recovery.
7. Add the atomic artifact, staged-manifest, Git commit, receipt, and fresh-reload
   completion transaction with fault injection.
8. Add exact same-origin host routes, typed dashboard helpers, and a read-only
   generated-world adapter around runner summaries.
9. Add outcome-first Adjust/Build/Defer, contract, progress, proof, play,
   confirmation, completion, and recovery UI states.
10. Run focused malicious-input/failure tests, protected regressions, browser
    review, repository checks, and diff review.
11. Rehearse one failed rollback, then run the official SDK once against the real
    clean Gravity Tap project. Pause after automated proof and visible launch for
    genuine creator confirmation before completion.

## Completion gates

- No unexpected path, new/delete/rename/link/escape, dependency/cache/state, or
  verifier mutation.
- All three automated proof layers pass before play and again after `worked`.
- Failure, cancellation, not-ready, retry, interruption, or concurrent edit never
  completes the quest.
- Quest, roadmap, Chronicle, project state, deterministic Markdown, Git, journal,
  receipt, and next recommendation cross-validate after a fresh service.
- Required focused tests, `npm run context:check`, `npm run check`,
  `npm run check:v0.1`, `npm run dashboard:build`, browser review, and
  `git diff --check` pass.

The second mandatory human pause is the real Gravity Tap playtest. Forge must not
fabricate the creator's confirmation.
