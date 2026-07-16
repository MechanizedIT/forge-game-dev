# Alpha Milestone 8 — Clear Quest Handoff and Reliable Worked Completion

**Status:** `COMPLETE` — implemented, browser-reviewed, and creator-confirmed on 2026-07-16.

## Goal

Keep creators oriented between system planning and one quest's work plan, let
them leave safely for another system, and make the final **Worked** choice
complete reliably when mutable project state already differs from the Git
index.

## Approved creator path

1. Accept a system's suggested quests and see every saved quest.
2. See the next available quest marked as recommended.
3. Open one quest and see its title, outcome, success checks, and editable file
   suggestions before reviewing the exact work plan.
4. Leave without choosing files and immediately plan another system or quest.
5. Play a completed mechanic, choose **Worked**, and receive one exact local
   completion commit and receipt.

## Boundaries

- Reuse the existing quest-planning call; file recommendations are local and
  deterministic, so this milestone adds no Codex turn.
- Recommend only already validated Godot candidates and never grant authority
  until the creator confirms the existing one-to-four-file work plan.
- Persist accepted quests and confirmed work orders; discard only unfinished
  file selection when leaving.
- Keep exact completion-manifest equality, rollback, commit, and receipt rules.
- Do not add a registry, broad scan, game type, capability, profile, autonomous
  quest choice, or second workflow owner.

## Acceptance criteria

- Confirming quests shows all saved quest titles and outcomes before file
  selection.
- The first available incomplete quest is visibly recommended.
- File selection names the exact quest, repeats its done-when checks, and marks
  Forge's editable suggested files.
- Leaving releases transient planner ownership and another system opens without
  `Quest planning is open for another system.`
- Returning reconstructs saved quests and confirmed work orders from project
  records; unfinished file picks are gone.
- Native completion includes `.forge/project-state.json` whenever its finalized
  contents differ from the Git index, even if the working copy already matched
  before **Worked** or the path uses `skip-worktree`.
- Focused tests, full tests, protected v0.1 checks, production build, context
  checks, and a browser smoke pass.

## Owning files

- `src/dashboard-v2/SystemQuestRefinement.tsx`
- `src/dashboard-v2/GeneratedProjectWorld.tsx`
- `src/blueprint-planner/system-quest.ts`
- `src/dashboard-host/server.ts`
- `src/generated-quest-runner/completion.ts`
- Focused tests under `tests/`

## Approval

The owner approved implementation on 2026-07-16 after completing two live
quests and reporting the two workflow problems plus the native completion
manifest failure.
