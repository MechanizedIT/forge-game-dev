# Alpha Milestone 7 — Open Project and Repeatable Quest Loop

**Status:** `COMPLETE` — implemented and verified on 2026-07-16.

## Goal

Let a creator start one new Forge-owned **Godot** project for any ordinary game
idea, shape it into systems and quests, and complete more than one small quest
in sequence. Forge must never require a game type, starter catalog entry,
capability, or verification profile before the idea can be planned or worked.

## The simple creator path

1. Choose **Start a new game** and give the project a name.
2. Forge creates one small, blank-but-runnable Godot project and checks that
   Godot can open it.
3. Inside the existing workspace, describe the game idea; shape systems and
   quests exactly as the current completed rehearsal does.
4. Pick an available quest, confirm one to four Godot text files, send that
   work to Codex, play it, and choose **Worked**.
5. Forge makes the next unblocked quest available. Repeat from step 4.

The creator may describe any Godot mechanic or system. The only continuing
limit is the safety boundary for each individual quest: Codex changes only the
one to four files the creator approved. If more files are needed, Forge pauses
for a new work-plan review; it never silently expands the scope.

## Decisions

- Replace the active new-project path's Top-down Arena interpretation,
  starter-aware catalog, and fit/rejection ceremony with a single neutral Godot
  foundation. Keep that old path available only as protected v0.2 compatibility
  evidence; do not migrate or rewrite its projects.
- The neutral foundation contains only the minimum files needed for a Godot
  project to open and show a simple Forge-owned starting screen. It is not a
  selectable template, mechanic catalog, or second workflow.
- Keep the existing local ownership, canonical-path, staged-promotion, pinned
  Godot, clean local Git baseline, registry-last, rollback, and restart
  machinery. Replace the Top-down-Arena-specific health check with a fixed
  generic Godot launch/load check.
- Keep the completed open system and quest planners. They are the only planning
  interface after creation; no new chat, agent type, scanner, or task framework
  is introduced.
- Generalize the existing first-quest file chooser so it opens for any
  **available** accepted quest. Store that quest's existing/new file choices in
  the existing system-quest record, then hand it to the existing native runner.
- Keep optional mechanic proof optional. Every run still receives exact file
  boundary review, generic project-health proof, real launch, creator decision,
  completion, history, local Git receipt, reload, and undo.

## Implementation steps

1. **Add the neutral project foundation.**
   Create a tiny controlled Godot fixture and manifest under `fixtures/godot/`.
   Add a generic assembler beside `src/project-creation/starter.ts`; it copies
   only its declared regular files, substitutes the project name once, and
   keeps the existing containment checks. Do not add a starter registry or
   chooser.

2. **Create a generic creation contract.**
   Extend `src/project-creation/service.ts`, `artifacts.ts`, `shared.ts`, and
   the generated-project contracts so a newly created project records one
   neutral foundation identity rather than `Top-down Arena` facts. Replace the
   creation-time Top-down-Arena verifier in `godot-verifier.ts` with a fixed
   generic Godot load marker. Preserve the current Top-down-Arena artifacts and
   reader compatibility unchanged.

3. **Make Launchpad start the open path.**
   In `src/dashboard-v2/NewGameFlow.tsx` and its host/API wiring, replace the
   active new-game sequence with name → create workspace → open Project World.
   The creator writes the game idea only after the workspace is open, using the
   existing system-roadmap planner. Keep the old blueprint and starter-aware
   routes isolated for their protected tests; do not delete them in this
   milestone.

4. **Open the work-plan chooser for every available quest.**
   Refactor `src/dashboard-v2/SystemQuestRefinement.tsx`,
   `src/generated-project-world/system-quest-plan.ts`, and the relevant
   Project World service routes so an available saved quest can receive its own
   work order. Reuse the existing exact path validator and one-to-four-file
   limit. A completed quest unlocks the next dependency-safe quest; no bulk
   preparation, automatic file discovery, or extra approval screen is added.

5. **Reuse the native runner unchanged where possible.**
   Adapt `src/generated-quest-runner/native-quest.ts` and its service boundary
   only to recognize the neutral foundation and generic project-health proof.
   Preserve the saved-plan byte checks, Git checks, scope review, recovery,
   completion, reload, and undo contracts from Milestone 6.

6. **Prove one two-quest journey.**
   Add focused temporary-project tests and one browser rehearsal: create a
   neutral project, accept systems, accept two dependent quests, complete the
   first with creator **Worked**, reload, then prepare and complete the second.
   Assert no profile, catalog, or game-type field controls eligibility. Also
   rerun protected v0.1/v0.2 compatibility tests against the existing Top-down
   Arena projects.

## Acceptance criteria

- A new Forge-owned Godot project can be created without selecting or fitting a
  named game type, starter, capability, profile, or template.
- The new project opens successfully with the pinned Godot runtime and receives
  a clean local Git baseline plus restart-safe registration.
- Any ordinary Godot idea can become three to six systems and one selected
  system can become small ordered quests without a Forge support gate.
- Two dependent quests can each be separately scoped to one to four approved
  Godot text files, completed through Codex, played, confirmed **Worked**,
  reloaded, and recorded in the project model and History.
- A quest that asks for undeclared files pauses for scope review; it does not
  gain authority. Undo restores only run-owned changes.
- Existing Top-down Arena, Gravity Tap, Signal Sweep, sample, v0.1, and v0.2
  paths remain compatible and unchanged on read.

## Explicitly out of scope

- Importing arbitrary existing projects or scanning their code.
- Unity, Unreal, non-Godot projects, cloud workspaces, collaboration, or a
  plugin/template marketplace.
- Automatic file selection, large multi-file batches, autonomous multi-quest
  work, new agents, or new verification profiles.
- General game generation, art/assets, export/publishing, or a second project
  creation mode.

## Verification

Run focused creation, native-runner, recovery, project-world, system-roadmap,
system-quest, and new two-quest tests; then `npm run check`, `npm run
check:v0.1`, dashboard build, context validation, and `git diff --check`.
Browser proof must use a temporary Forge home and prove the source registry and
existing projects stayed byte-identical.

## Approval record

The owner approved this exact milestone before implementation. The shipped
scope remained one neutral Godot foundation plus a repeatable quest loop;
broader import, engine, asset, export, and autonomous-work ideas remain separate.
