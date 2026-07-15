# Forge Product Vision

This document is the product-direction check for every Forge task. Read it
before planning or implementing product work.

## One-sentence vision

Forge is the visual planning, orchestration, and project-memory layer between a
game creator, their Godot project, and AI coding agents.

## The problem Forge solves

Making a game with AI currently requires too many disconnected steps. A creator
may discuss an idea in ChatGPT, receive a long text plan, manually turn broad
systems into smaller tasks, copy those tasks into files, open Godot, switch to
VS Code or Codex, explain the context again, inspect technical output, and then
try to remember what was completed.

Forge brings that work into one understandable place. The creator should always
be able to see what the game is becoming, what already works, what is being
built now, and what should happen next.

## The intended creator journey

1. Start or reopen a Godot project.
2. Talk with Forge about the game idea.
3. See the idea become a visual roadmap of broad mechanics and systems.
4. Open one system and talk through how to divide it into smaller quests.
5. Choose a quest and approve a clear agent job.
6. Let the agent work while Forge shows simple progress.
7. Read Forge's plain-language explanation of what changed and what was checked.
8. Play the real game and choose: it works, it needs changes, or undo it.
9. See the quest, parent system, roadmap, history, and project notes update.

The core product model is:

```text
Project → Systems → Quests → Work sessions → Results
```

## Product principles

### The roadmap is open-ended

Creators may plan any Godot mechanic or system. Forge is not a menu of supported
game types, templates, deltas, or verification profiles. Adding an idea to the
roadmap must not require adding a capability entry to Forge's code.

### Safety controls work, not imagination

Forge should control agent scope with approval, declared files, Git checkpoints,
baseline project checks, play confirmation, pause-for-more-scope, and undo.
Known mechanic verifiers may add confidence. Their absence must not make an idea
or quest unsupported.

### Visual first, words second

The roadmap and status should explain the project at a glance. Use short labels,
progress, relationships, and one obvious next action. Put long plans, proof,
logs, hashes, and generated documents behind optional details.

### Forge translates between creator and agent

The creator speaks in outcomes: what the game should do and feel like. The agent
may work in files, commands, and tests. Forge translates the proposed work and
the result into plain language, while keeping exact evidence available in the
background.

### The creator stays in control

The creator approves meaningful project changes and decides whether the result
works in the game. Forge organizes and explains; it does not silently take over
the project.

## Alpha fast-track

The alpha is intentionally small:

- Godot only.
- One real idea-to-roadmap-to-quest-to-playable-change path.
- New Forge-owned projects and existing Forge-registered projects.
- One agent execution path.
- One simple visual workspace.
- Local records and restart recovery.

The alpha does not need many templates, many verifiers, every type of project,
deep repository indexing, multiple agents, cloud accounts, collaboration, or a
general platform. Breadth belongs in the open planning model; implementation
proves one simple mechanic safely from end to end.

Existing Top-down Arena and prepared quests are useful demonstrations and
compatibility fixtures. They are not the definition of Forge.

## Things to avoid

- Turning templates or verification profiles into product permissions.
- Adding a new capability record for every mechanic.
- Forcing a creator's idea to fit the current starter.
- Replacing one clear workflow with many review and confirmation screens.
- Showing technical contracts, fingerprints, hashes, or raw agent output as the main experience.
- Building generalized infrastructure before the current creator path works.
- Adding features because they may be useful later rather than because the alpha needs them now.

## Decision filter for every task

Before approving a plan or implementation, answer:

1. What creator problem does this solve?
2. Where does it appear in the intended creator journey?
3. Does it make Forge simpler and more visual?
4. Does it preserve open-ended planning?
5. Does it move one real alpha path forward now?
6. What can be removed or deferred?

If those answers are unclear, the task is probably too broad, too technical, or
pointed at the wrong product.

## Communication promise to the owner

Agents must explain completed work in plain, concrete language. Start with what
changed, why it matters, what the owner should do next, and exactly how to do it.
Assume the owner will not search through engineering documents to find the real
instructions. Put optional technical evidence after the owner-facing answer.
