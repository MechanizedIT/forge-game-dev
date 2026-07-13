# Forge Workshop Dashboard Prototype Plan

- **Workflow state:** `COMPLETE`
- **Scope:** First usable frontend prototype over the proven Enemy Targeting golden path
- **Approval:** The owner supplied the screen requirements, visual direction, state model, and frontend-only integration boundary in the implementation request.

## Approved implementation

1. Add a minimal React, TypeScript, and Vite frontend inside the existing npm package without changing runner semantics.
2. Render five typed demo states: World Ready, Quest Brief, Implementation Running, Ready to Play, and Quest Complete.
3. Reuse the prepared Enemy Targeting quest, plan, roadmap, review, and sanitized evidence wording while labeling demo-only transitions in code and UI.
4. Build small semantic components, responsive plain CSS, keyboard-visible focus, progressive technical disclosure, and one dominant action per state.
5. Keep live runtime integration, plan revision, game launch, confirmation persistence, failure recovery, and Chronicle indexing outside this task.

## Acceptance criteria

- The next action is visually obvious on all five screens.
- The Quest Brief explains the visible outcome, four steps, three-file boundary, exclusions, proof plan, and lack of open decisions before approval.
- Progress presents five understandable stages without percentages, raw SDK events, duplicate starts, or an unsafe cancel control.
- Ready to Play distinguishes AC-1 through AC-5 automated success from pending AC-6 creator proof and shows exactly three expected files with no unexpected changes.
- Quest Complete is explicitly a prototype view and cannot be mistaken for real persistence.
- The two-column desktop layout collapses cleanly and technical details remain closed by default.
- Existing checks continue to pass, and the production dashboard build succeeds.

## Non-goals

Dashboard host APIs, runner mutation, live Codex execution, Godot launch, plan refinement, persistence changes, broad project scanning, generic chat, a design-system package, or new gameplay quests.
