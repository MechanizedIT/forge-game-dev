# Forge v0.2 Plan — Living Game Workshop

## Product contract

Forge v0.2 proves two complete, honest experiences:

1. **Explore the sample game** — the protected v0.1 Enemy Targeting path, presented inside a clearer creative workshop. Its approval, Codex SDK execution, verification, playtest, reset, persistence, and completion behavior remain unchanged.
2. **Create a new game** — a creator describes a small 2D game, GPT-5.6 turns it into a bounded project blueprint, Forge creates a Godot 4 GDScript project from a controlled starter, and the creator enters a persistent Project World with a roadmap and Chronicle.

Forge is the deterministic product shell. GPT-5.6 may propose vision and structure, but it cannot choose shell commands, arbitrary dependencies, unsupported foundations, workflow state, or storage paths. Codex remains the implementation agent for the prepared sample quest. Implementing a generated quest is optional for v0.2.

The experience should feel like a modern game-development tool, a progression map, a creative planning space, and a friendly companion. It must not resemble a business dashboard, terminal wrapper, medieval-fantasy interface, steampunk control panel, or generic chatbot.

### v0.2 boundaries

- Godot 4, 2D, and GDScript only.
- Code-native visuals; no external assets or generated dependencies.
- The required starter is **Top-down arena**. **Side-scrolling platformer** and **Movement sandbox** are stretch goals only after the complete required path is stable and rehearsed.
- Generated blueprints contain one first playable milestone and three to five bounded quests.
- A created project is a real launchable local Godot project, not a mockup, but v0.2 does not promise a complete game.
- The sample workspace and new-game workspaces have separate creation, reset, state, and artifact owners.

## User journeys

### Path 1 — Explore the sample game

1. The Launchpad asks, **What would you like to build?**
2. The creator chooses **Explore the sample game** and sees that this is Forge's verified, playable demonstration.
3. Forge prepares or reopens the existing sample workspace with the current safe preservation behavior.
4. Project World explains the current player movement and idle enemy in plain language. The roadmap is the dominant surface and Enemy Targeting is the active available quest.
5. The Forge Companion points to Enemy Targeting and explains why the mechanic matters.
6. The creator opens Quest Forge, which leads with:
   - What will change?
   - What may Codex change?
   - How will we prove it?
7. The creator may disclose the exact plan, files, assumptions, exclusions, and criteria, then explicitly approves **Build with Codex** or returns without changes.
8. Active Build uses the real Codex SDK and existing five friendly stages. It shows current stage, elapsed time, locked scope, and optional technical activity without fake percentages.
9. Automated proof is recorded through the existing review flow. Failure or uncertainty cannot advance to play or completion.
10. Playtest Gate says, **Codex finished. The code passed. Now the game needs you.** The creator launches the game and receives the existing exact play instructions.
11. Only **I saw it work** persists final PASS, completes the node, updates project state, and creates the Chronicle record. Rejection and cancellation leave the quest incomplete.
12. Quest Complete activates the roadmap path, transforms the node, shows restrained companion feedback, and asks, **What should we build next?**
13. Restart reloads the completed roadmap and Chronicle. **Start fresh demo** retains the current explicit confirmation and safe reset behavior.

At every v0.2 milestone, the legacy sample experience remains launchable without entering the new-game path.

### Path 2 — Create a new game

1. The creator chooses **Create a new game** from Launchpad.
2. Forge asks for a plain-language game idea in one focused composer. Example prompts demonstrate small playable ideas rather than complete games.
3. GPT-5.6 evaluates whether the idea already answers the five permitted intake topics:
   - 2D game style
   - Core player action
   - What should feel fun
   - Keyboard or controller
   - Smallest playable result
4. If material information is missing, Forge asks no more than three focused questions in one screen. It never repeats answered questions and never opens a general chat.
5. GPT-5.6 produces a structured Project Blueprint containing:
   - Concise game vision and sanitized project name
   - The controlled Top-down arena foundation
   - Input choice and smallest playable result
   - First playable milestone
   - Three to five sequenced quests
   - Bounded scope, acceptance criteria, and verification ideas for every quest
   - Concise project brief and initial Chronicle entry
6. Blueprint Review summarizes the game promise, first playable result, roadmap, and foundation. Technical schema details remain hidden. The creator can **Create this project**, **Revise the idea**, or cancel.
7. Forge deterministically validates the blueprint, copies the selected starter, writes project-local Forge artifacts, initializes its local Git baseline, and runs that starter's pinned Godot smoke check. GPT does not write project files directly.
8. Creation succeeds only if all artifacts validate and the Godot project loads. A failed creation is reported and is not registered as ready.
9. The creator enters the new Project World. The game preview, current playable foundation, first milestone, three-to-five-node roadmap, companion, and Chronicle are loaded from persisted project state.
10. Quest nodes open a planning brief, but **Build with Codex** is labeled unavailable for generated quests in required v0.2 scope.
11. The persistent field **What would you like to add to your game?** saves a local violet idea seed and Chronicle note. It does not behave like chat or silently begin implementation.
12. Restarting Forge reopens the created project with its roadmap, documentation, idea seeds, and Chronicle intact.

## Screen-by-screen UX contract

### 1. Project Launchpad

- Full-workspace composition with a strong display title: **What would you like to build?**
- Two large, unequal-to-dashboard choices with visual previews:
  - **Explore the sample game** — “Review a prepared quest, watch Codex build it, verify it, and play the result.”
  - **Create a new game** — “Shape a small 2D idea into a Godot project, first milestone, and playable roadmap.”
- A small recent-project strip appears only after a new project exists.
- No analytics, navigation tabs, proof counters, or technical setup copy dominates this screen.

### 2. New Game Intake

- One generous idea field, a short scope promise, and three example idea chips.
- The scope promise states: 2D Godot, GDScript, controlled starter, no external assets, and first playable result rather than a full game.
- If clarification is required, show at most three compact choice or short-answer prompts. Keyboard/controller and starter style use controlled choices; creative answers stay short free text.
- Primary action is contextual: **Shape my game** or **Continue with these answers**.

### 3. Blueprint Review

- Hero area: game name, one-sentence vision, selected foundation, and smallest playable result.
- Dominant visual: a compact roadmap flowing from Foundation to First Playable Milestone through three to five quests.
- A single summary region answers: what Forge will create, what remains for later, and how the starter will be checked.
- An expandable **Blueprint details** section contains exact criteria, verification ideas, assumptions, and generated documentation.
- Creation is an explicit approval boundary. Nothing is written before **Create this project**.

### 4. Project World

- The roadmap occupies most of the central canvas and reads as connected regions, not a grid of cards.
- A game preview and **Current playable state** sit together as one anchored world status element.
- Completed nodes use mint only after verified persistence; available nodes use ember; AI-active states use cyan; idea seeds and future possibilities use violet.
- Future regions may be visually present but must correspond to real generated roadmap nodes, not decorative fake features.
- The abstract Forge Companion core sits near the active node and changes state through color, pose, and a small text bubble.
- The persistent bottom idea dock says, **What would you like to add to your game?** Submission saves an idea seed and never masquerades as a planned quest.
- For the sample, Enemy Targeting is the active prepared node. For a created project, the first generated quest is active and explicitly marked **Planned · implementation not enabled yet**.

### 5. Quest Forge

- Lead with three creator questions:
  1. **What will change?** — visible before/after outcome.
  2. **What may Codex change?** — plain scope summary and file-count boundary.
  3. **How will we prove it?** — automated checks and creator play.
- Place exact steps, filenames, assumptions, exclusions, criteria IDs, and commands in one progressive-disclosure region.
- The sample retains **Build with Codex** and the existing approval semantics.
- Generated projects show **Quest planned** and a clear explanation that implementation is not part of required v0.2.

### 6. Active Build

- Preserve the real SDK operation and existing state machine.
- Show current stage most prominently, followed by elapsed time, locked scope, and a reassuring plain-language explanation.
- Keep completed stages visible; do not invent percentages or completion estimates.
- Technical events, commands, and files remain optional disclosure.
- Cancellation, verification failure, launch failure, and blocked states must remain truthful and non-celebratory.

### 7. Playtest Gate

- Strong handoff copy: **Codex finished. The code passed. Now the game needs you.**
- Summarize scope check, automated checks, and changed files in creator language.
- Make **Play the result** the unmistakable action and show exact controls and expected visible behavior before launch.
- After the game closes, request one of the current exact creator responses. Do not infer success from process exit.

### 8. Quest Complete and Chronicle

- Animate only after final review, roadmap, completion, and Chronicle writes succeed.
- Activate the connecting roadmap path, transform the node, brighten the companion core, and reveal one concise Chronicle entry.
- Use mint sparingly; avoid rewards, points, currencies, or level systems.
- End with **What should we build next?** and focus the persistent idea dock.

## Visual language

- Deep charcoal and muted navy form the workspace and world depth.
- Ember orange identifies creator choices and approval boundaries.
- Cyan identifies GPT/Codex activity and automated evidence.
- Violet identifies ideas and unplanned possibilities.
- Mint green is reserved for verified, persisted completion.
- Use stronger display typography for world and quest names, with compact monospace only for optional technical details.
- Prefer large composed surfaces, connected paths, thumbnails, and negative space over repeated bordered cards.
- The Forge Companion is a small abstract core, not a fantasy character, robot mascot, or chat avatar.
- Motion is restrained: node focus, path activation, companion state, and completion reveal. Respect reduced-motion preferences.

## Required and optional capabilities

### Required for v0.2

- Launchpad with the two requested paths.
- New Project World shell and visual system.
- Complete v0.1 sample journey inside that shell, plus an always-available legacy fallback.
- GPT-5.6 new-game intake with no more than three allowed clarifying questions.
- Strict blueprint generation for exactly one supported foundation and three to five quests.
- Deterministic creation of one controlled Top-down arena Godot starter.
- Starter-specific headless smoke verification before registration.
- Persistent project manifest, vision, roadmap, quests, project state, documentation, idea seeds, and Chronicle.
- New-project Project World with honest planning-only quest actions.
- Automated regression coverage, one real sample rehearsal, and one real new-game rehearsal.

### Optional only after required work passes

- Codex implementation of the first generated quest.
- A second generated-project playtest/complete loop.
- Plan regeneration for a single quest from an idea seed.
- Side-scrolling platformer and Movement sandbox starters.
- The bounded sample-game visual-art pass.
- More elaborate companion motion or completion sound.
- Additional starter variations.

## Minimum architecture changes

Keep the existing React/Vite dashboard, Node host, SSE progress channel, contracts, Codex SDK executor, demo workspace, Godot bootstrap, runner, review, play, and completion services. Do not introduce another service, database, generalized scanner, provider abstraction, or orchestration framework.

### Frontend composition

- Add a top-level experience router with `launchpad`, `new_game_intake`, `blueprint_review`, and `project_world` states.
- Preserve the current sample application as a `LegacySampleExperience`/sample workflow component rather than rewriting its internal operation while building the shell.
- Recompose existing roadmap, quest brief, progress, proof, play, and completion components into the Living Game Workshop visual hierarchy.
- Keep a legacy feature flag and launch command available until v0.2 closeout.

### New-game planning contract

Add one strict `GameBlueprint` contract. The model may return:

- `projectName`, `vision`, and the literal `top_down_arena` foundation
- `inputMode`, `coreAction`, `funTarget`, and `smallestPlayableResult`
- one first playable milestone
- three to five quests with title, visible outcome, included/excluded scope, acceptance criteria, verification ideas, and dependencies
- concise project-documentation and Chronicle summaries
- up to three clarification questions drawn only from the five allowed intake topics

Forge assigns IDs, timestamps, storage paths, roadmap positions, workflow states, and starter commands. Model output cannot contain shell commands, dependencies, absolute paths, or arbitrary file contents. Invalid output gets one schema-repair turn; a second failure stops without creating a project.

Use the installed Codex SDK for the runtime planning call with a structured output schema, `model: "gpt-5.6"`, `modelReasoningEffort: "high"`, read-only sandbox, and network disabled. The `gpt-5.6` alias targets GPT-5.6 Sol; official guidance positions it for complex reasoning and coding: <https://developers.openai.com/api/docs/models/gpt-5.6-sol>.

### Controlled starter manifest

The required implementation contains one small manifest for **Top-down arena** and only the fields needed to copy and verify that starter. It is not a generalized template framework. A later starter may add another validated manifest without redesigning project creation, but v0.2 does not implement that abstraction in advance.

The Top-down arena starter contains deterministic project files, a code-native arena scene, CharacterBody2D movement, keyboard/controller input mapping, a visible interaction target, and a headless smoke verifier. Forge copies it to `%LOCALAPPDATA%\Forge\projects\<project-id>`, writes validated artifacts, runs its verifier with the pinned Godot build, and initializes a local Git baseline only after verification passes. Project creation never modifies the repository fixture or sample workspace.

### Persistence

New projects persist under their own `.forge` directory:

- project manifest and current project state
- game vision and deterministic Markdown summary
- roadmap and individual quest files
- idea-seed list
- Chronicle with created, idea-saved, and future quest-completion entry types

The roadmap owns quest availability/completion. Project state owns only selected quest, last-opened time, and current view. Chronicle records concise events without duplicating authoritative state. All JSON is schema-validated and written atomically.

### Minimal host API

- Load application state and recent created projects.
- Open the existing sample path.
- Submit new-game intake and optional focused answers.
- Generate and validate a blueprint.
- Approve and create a project from a starter.
- Open a created project and save an idea seed.
- Retain all existing Enemy Targeting run, play, confirm, reset, and event endpoints as compatibility routes.

## Sequenced roadmap

| Task | Size | Outcome | Model and reasoning |
|---|---|---|---|
| **1. Protect the v0.1 baseline** | Small | Record immutable and working baselines, create a legacy launch mode, and lock regression evidence before changing UX. | Codex with `gpt-5.6`, high |
| **2. Build Launchpad and Project World shell** | Medium | Add the two-path Launchpad, top-level experience routing, world canvas, visual tokens, companion core, preview/status anchor, roadmap regions, and idea dock using fixture data only. | Codex with `gpt-5.6`, medium |
| **3. Reframe the sample flow** | Medium | Place the real sample roadmap, Quest Forge, Active Build, Playtest Gate, Quest Complete, reset, Proof, and Chronicle inside the new shell without changing backend semantics. | Codex with `gpt-5.6`, high |
| **4. Add new-game intake and GPT-5.6 planning** | Large | Add the focused intake, optional three-question clarification, strict blueprint schema, one repair attempt, Blueprint Review, and truthful planning states. | Runtime GPT-5.6 high; implementation Codex with `gpt-5.6`, high |
| **5. Create the Top-down arena project and persist artifacts** | Large | Add the single controlled starter, its minimal manifest and smoke verifier, deterministic creation, atomic artifact writes, project registry, Git baseline, and failure cleanup. | Codex with `gpt-5.6`, xhigh |
| **6. Connect the new-project Project World** | Medium | Load a created project, render its real roadmap and Chronicle, open generated quest briefs, persist selection/restart state, and save violet idea seeds. | Codex with `gpt-5.6`, medium |
| **7. Harden, rehearse, and document required v0.2** | Medium | Run compatibility, creation, persistence, failure, keyboard, responsive, reduced-motion, sample live-run, and Top-down arena rehearsals; update operational docs and evidence. | Codex with `gpt-5.6`, xhigh |
| **8. Optional sample-game visual pass** | Small | Only after Tasks 1–7 pass: improve the sample scene with code-native arena depth, landmarks, silhouettes, and instruction treatment while preserving gameplay nodes and criteria. | Codex with `gpt-5.6`, medium |
| **9. Optional expansion** | Large | Only after Tasks 1–7 pass: separately plan generated-quest implementation or an additional controlled starter; do not combine them. | Codex with `gpt-5.6`, xhigh |

Higher reasoning is reserved for artifact safety, workspace creation, compatibility, and final review. Medium is sufficient for bounded UI composition and visual work. GPT-5.6 supports configurable reasoning levels, while the current Codex SDK exposes through `xhigh`; do not add a model selector for v0.2. See <https://developers.openai.com/api/docs/models>.

**Current checkpoint:** Tasks 1 through 5 are complete. Task 5 created and verified one real project from the controlled Top-down Arena starter, persisted and reloaded its authoritative artifacts, created a clean local Git baseline, registered it last, rediscovered it after restart, and passed responsive Edge review. Task 6 remains unapproved and owns generated-project Project World integration only; generated-quest implementation remains later and optional.

## Task 1 — exact acceptance criteria

**Objective:** establish a continuously usable v0.1 fallback and measurable regression boundary before any v0.2 product change.

1. The immutable release reference is recorded as tag `v0.1.0` at commit `99a439a`; the current refined working baseline is recorded as commit `4d27612`.
2. `git status --short` is clean before the task begins, and no baseline fixture, quest, plan, verifier, runner, dashboard behavior, reset path, or completion artifact is changed by Task 1.
3. `npm run check` passes the existing type checks and all 48 tests from the working baseline.
4. A focused compatibility command runs the existing tests that cover:
   - real prepared roadmap/quest/plan loading
   - approval and duplicate-run rejection
   - five ordered friendly progress stages
   - scope and automated-verification failure gates
   - game-launch and creator-confirmation gates
   - persisted completion after restart
   - confirmed and cancelled reset behavior
   - CLI cancellation safety
5. A legacy launch mode opens the current sample experience directly, without showing or depending on new-game APIs, blueprint schemas, starter templates, or new-project state.
6. The normal `npm run forge` path remains pointed at the legacy experience until the integrated v0.2 sample journey passes Task 7 rehearsal; v0.2 development is enabled through an explicit development flag or command.
7. The legacy mode and future v0.2 mode use the same existing sample workspace and service rather than copying or migrating its state.
8. An automated test proves that a completed sample workspace reloads identically through legacy mode and that reset still targets only the generated demo workspace.
9. The task records command output, test count, tag and commit SHAs, known manual evidence, and rollback commands in a dated review artifact.
10. `git diff --check` passes, the diff contains no product redesign, and the AI work log records the protection decision and verification result.

Task 1 ends after this protection layer. It does not begin Launchpad, visual-system, GPT, contract, starter, or new-project work.

## Task 2 — completed shell boundary

Task 2 adds an isolated Living Game Workshop preview with the two-choice Launchpad and a fixture-backed sample Project World. The Project World establishes the roadmap-dominant hierarchy, preview and playable-state anchor, five required roadmap states, companion placement, persistent idea-field placement, and responsive visual language. The Create path stops at an honest unavailable-state explanation, the idea field is local-only, and the prepared Enemy Targeting action does not invoke the runner from this shell yet.

Evidence: `npm run check` passes 52 tests; `npm run check:v0.1` passes its production build and all 37 protected compatibility tests; desktop, tablet, and mobile browser reviews show no horizontal overflow or console warnings/errors. Review screenshots and the exact real-versus-fixture boundary are recorded in the dated Task 2 review and closeout artifacts.

## Task 2.1 — completed visual-hierarchy refinement

Task 2.1 replaces the free-form, crossing graph with one semantic sequence: **Foundation → First Encounter → Game Feel → Polish**. The first transition visibly combines the online mint foundation with the ember current step; future dependencies use one neutral dashed treatment. **Add an idea** is a short violet port beneath Enemy Targeting rather than a quest node. The primary review action lives inside the active quest, and the compact Companion guidance is anchored beneath it without covering the sequence.

The Launchpad now previews the experience behind each path: the sample choice contains a miniature game stage and verified quest rail; the create choice shows plain-language input becoming a three-node roadmap. Both desktop actions remain above the 1440×900 fold. The Project World uses one industrial sci-fi workbench, a larger game-like arena snapshot, open roadmap space, restrained machined structure, and a vertical semantic sequence at narrow widths. All behavior remains fixture-only.

## Task 3 — complete

The sample choice now loads the authoritative dashboard snapshot and reuses the existing approval, official SDK runner, five-stage progress, diff review, verification, Godot launch, exact creator confirmation, completion, Chronicle, restart, and reset services. Quest Forge, Active Build, Playtest Gate, Proof, Quest Complete, and failure/reset states are recomposed inside the Living Game Workshop without a new workflow owner.

Live runs changed exactly the three approved files, rejected duplicate starts, passed repository and Godot checks, launched Godot 4.7, remained incomplete after game exit, received explicit creator confirmation, persisted final `PASS`, and reloaded completed roadmap and Chronicle state. The accepted fallback-review run is `enemy-targeting-1784009287800`.

The installed Browser plugin remained unavailable, so a pinned project-local Playwright `1.61.1` harness reviewed the real host in Edge at `1440×900`, `768×900`, and `390×844`. Launchpad, fresh World, Quest Forge, Active Build, Playtest Gate, desktop/mobile confirmation, Quest Complete, completed proof, reloaded World, and reduced-motion evidence pass without console warnings/errors, page exceptions, failed same-origin requests, horizontal overflow, missing primary actions, or broken navigation. Task 3’s verdict is `PASS`.

## Task 4A — complete

**Create a new game** now opens one focused composer with examples and the fixed Godot 4, 2D, GDScript, Top-down arena, code-native, first-playable boundary. GPT-5.6 may either return a complete blueprint or one screen of at most three questions drawn from the five approved topics. Once answers are submitted, no second clarification loop is accepted.

The planning service uses the official SDK with `gpt-5.6`, high reasoning, a read-only sandbox, disabled network and web search, structured output, session-scoped state, and abortable cancellation. Forge validates the literal foundation, three-to-five quest count, unique and acyclic temporary references, criteria-to-verification links, safe project name, and absence of paths, commands, packages, source files, and workflow claims. One invalid response receives one same-thread repair containing only the original intake, answers, and validation problems; a second failure stops safely.

Blueprint Review leads with the game, first playable result, and ordered roadmap. Criteria, proof, scope, documentation, and Chronicle copy remain behind **Blueprint details**. Approval changes only the in-memory phase to **Blueprint Ready**, which explicitly reports no project files and no commands. The real rehearsal produced **Last-Moment Pulse**, five ordered quests, no clarification, one valid response, a sanitized thread ID, and approximately 29.5 seconds of latency. The deterministic Edge harness passed all requested desktop, tablet, mobile, and reduced-motion states.

Task 4A does not create a starter, project directory, Git repository, Godot process, `.forge` artifact, persistent registry entry, or generated Project World. API-key-backed Codex auth was used for the required GPT-5.6 rehearsal; the current ChatGPT-authenticated Codex surface rejected that model and the runtime correctly did not substitute another model.

## Task 5 — complete

Task 5 adds one versioned, controlled Top-down Arena starter and a deterministic creation transaction. A still-current approved blueprint may proceed only after a separate exact filesystem confirmation. Forge owns the destination, copies the declared starter inventory, writes strict JSON plus deterministic Markdown records, reloads and validates them, runs fixed pinned-Godot verification, creates one clean local Git baseline with no remotes, promotes the staged directory, and registers it last through an atomic registry.

The UI shows seven real stages and truthful cancellation, failure, created-project, recent-project, and reopen states. Cleanup is limited to canonical Forge-owned direct children and refuses symlink or traversal escape. The real GPT-to-project rehearsal created **Last-Moment Pulse**, passed the stable Godot marker, produced one clean Git commit, relaunched for 120 frames, survived service restart, and left the sample workspace unchanged. The deterministic Edge harness passed confirmation, progress, verification, success, failure, recent/reopen, responsive, focus, and reduced-motion checks.

Task 5 deliberately stops at `Created · Project World integration pending`. It does not render generated project data in Project World, implement any generated quest, add starters, or alter sample art.

## Rollback strategy

- Never move, replace, or delete `v0.1.0`.
- Treat `4d27612` as the refined working fallback and `v0.1.0` as the immutable release recovery point.
- Keep each roadmap task in a bounded commit; do not mix sample-runner changes with new-game creation changes.
- Keep legacy sample mode runnable throughout development. Do not switch the default launch to v0.2 until Task 7 passes.
- Do not migrate existing sample `.forge` artifacts. New contracts must be additive and new-game-only unless the sample already accepts them.
- Store new projects outside the sample workspace so cleanup and failure cannot affect the golden demo.
- On a v0.2 regression, disable the v0.2 entry flag and launch legacy mode; if the working tree itself is damaged, recover from `4d27612` or the `v0.1.0` tag without rewriting history.
- Preserve failed new-project creation evidence outside the destination, remove only the incomplete generated directory after verified path checks, and never call the sample reset routine for a new project.
- Before each task closes, run the compatibility command. Any golden-path regression blocks the next task.

## Deferred features

- Existing-project import or general repository scanning.
- Unity, Unreal, Godot 3, 3D, C#, or engines other than Godot 4.
- Generic chat, open-ended companion conversation, or unlimited clarification.
- Generated full games, external art, asset-store access, arbitrary dependencies, or package generation.
- Arbitrary generated shell commands, verification commands, or project scripts outside controlled starters.
- Generated-quest Codex implementation unless all required v0.2 work is complete.
- Multiple model providers, provider routing, model selectors, or silent fallbacks.
- Cloud accounts, authentication, hosted execution, sharing, teams, or collaboration.
- Vector databases, generalized semantic memory, or broad project indexing.
- Autonomous multi-agent systems, agent marketplaces, plugins, or skill marketplaces.
- Native always-on-top companions, voice, elaborate avatars, or deep animation systems.
- Currencies, inventory, levels, skill trees, rewards, or broad gamification.
- Production analytics, deployment infrastructure, or production-scale security work.

## End-of-tomorrow definition of done

A meaningful v0.2 is complete when all of the following are true:

1. `npm run forge` opens the Living Game Workshop Launchpad and presents exactly the two required paths.
2. **Explore the sample game** completes the full real Enemy Targeting journey through approval, live Codex progress, automated proof, play, creator confirmation, persistent roadmap/Chronicle completion, restart, and reset.
3. The legacy sample launch remains independently available and passes the protected compatibility suite.
4. **Create a new game** accepts an idea, asks at most three focused questions when needed, and visibly uses GPT-5.6 high reasoning to produce a valid blueprint.
5. The blueprint contains a concise vision, safe name, selected controlled foundation, first playable milestone, three to five bounded quests, acceptance criteria, verification ideas, documentation, and initial Chronicle entry.
6. Approval creates a real Top-down arena project, validates all artifacts, passes its pinned headless Godot smoke check, and initializes a local Git baseline.
7. The created project opens in Project World with its persisted playable-state summary, roadmap, quest briefs, companion state, documentation, Chronicle, and functional idea-seed field.
8. Restarting Forge reloads the created project without regenerating or losing its state.
9. Desktop and narrow-window layouts are usable, keyboard focus is visible, reduced-motion behavior works, and no required state presents fake progress or false verification.
10. Automated checks pass, one real sample live run is completed, the Top-down arena starter is smoke-tested, and one new-game flow is visually rehearsed end to end.
11. `PROJECT_STATUS.md`, `ROADMAP.md`, README operation notes, review/closeout artifacts, and `docs/AI_WORK_LOG.md` truthfully describe what works and state that generated-quest implementation, additional starters, and the sample art pass remain optional/deferred if they were not completed.

Generated-quest implementation, additional starters, and the sample visual-art pass are not part of this definition of done. After Tasks 1–7 pass, each optional expansion receives its own plan and approval before implementation.
