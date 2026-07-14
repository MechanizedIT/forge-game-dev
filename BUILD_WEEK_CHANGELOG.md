# Forge Build Week Changelog

## v0.1.0 — Day 1 Judge-Ready Golden Path

**Date:** 2026-07-13
**Status:** Verified on a clean 64-bit Windows 11 checkout

Forge `v0.1.0` preserves the first complete Build Week prototype checkpoint. A judge can install locked dependencies, authorize the pinned Godot 4.7 download, open the real dashboard, review and approve Enemy Targeting, watch understandable Codex progress, receive automated verification, play the changed game, explicitly confirm the visible behavior, reload the completed roadmap, and reset the demo for another run.

Automated proof and creator confirmation remain separate gates: passing checks produce `CONDITIONAL PASS`; only observed play followed by **I saw it work** produces final `PASS` and persistent completion.

### Included

- Clean Windows repository setup and recovery instructions
- Real Forge Workshop dashboard backed by persistent quest artifacts
- Official Codex SDK execution constrained to three approved Godot files
- Deterministic project and Godot verification
- Play launch, exact creator confirmation, final review, and roadmap persistence
- Explicit reset and replay path
- Sanitized Build Week provenance, review, and closeout evidence

### Remaining submission work

- Publish the under-three-minute demo video and Devpost URLs
- Preserve the primary Codex `/feedback` ID and finish submission metadata
- Select a license
- Decide whether an honestly labeled offline fallback is required

### Known limitations

- Windows is the primary tested platform; the clean rehearsal used Windows 11 x64.
- The bundled Godot sample and prepared Enemy Targeting quest are the supported golden path.
- Live implementation requires internet access and Codex authentication.
- Plan refinement, contextual questions, generalized project scanning, additional engines, and broader Chronicle features are not part of this checkpoint.

## v0.2 Task 3 — Living Game Workshop sample integration

**Date:** 2026-07-14
**Status:** Complete — product path, creator confirmation, persistence, and responsive browser review passed

- The v0.2 sample Project World now reads the real protected workspace, roadmap, quest, plan, review, completion, and Chronicle artifacts.
- Quest Forge, Active Build, Playtest Gate, creator confirmation, Quest Complete, Proof, reset, and failure states use the new workshop visual system while calling the existing v0.1 host services.
- The official-SDK rehearsal changed exactly the three approved Godot files, passed automated verification, launched Godot, received explicit creator confirmation, persisted final completion, reloaded after host restart, and restored the baseline through confirmed reset.
- `npm run forge` and `npm run forge:v0.1` remain unchanged; the integrated path remains `npm run forge:v0.2`.
- Create, GPT planning, project generation, generated-project persistence, and idea-to-quest behavior remain unavailable.
- The installed Browser plugin failed before tab creation, so the pinned project-local Playwright `1.61.1` fallback reviewed the real host in Edge at `1440×900`, `768×900`, and `390×844`. Real-state screenshots, console/network checks, navigation, overflow, primary actions, mobile roadmap order, and reduced-motion behavior pass.
- The first fallback pass found a missing favicon 404; an inline code-native v0.2 Forge favicon corrected it without changing workflow behavior.

### First-time judge usability refinement

Direct observations from a real first-time run drove this focused update:

- The World screen now introduces Forge, states the review → approve → build → verify → play path, explains the three-file boundary and proof model, and makes **Review Enemy Targeting** the obvious starting action.
- Preserved setup now reports whether Enemy Targeting is available, in progress, or completed and prints the exact fresh-reset command.
- Completed dashboards offer **Start fresh demo** behind explicit confirmation using the existing safe reset implementation.
- Proof and Chronicle are disabled with honest availability labels until they contain real evidence.
- The Codex working state now emphasizes the current and completed stages, plain-language activity, elapsed time, and the expectation that implementation may take several minutes; technical events remain optional.
- The baseline player supports arrow keys and WASD, both are checked by real Godot verification, and the ready-to-play screen gives four exact play instructions.

A real SDK rehearsal exposed and corrected one Godot 4.7 verifier typing issue, then passed every automated criterion within the approved three-file boundary and launched the game. No creator success was inferred during this refinement run; cancellation correctly left the quest incomplete.

## v0.2 Task 4A — New Game Intake and GPT-5.6 Blueprint Planning

**Date:** 2026-07-14
**Status:** Complete — real GPT planning, strict validation, responsive review, and protected regressions passed

- **Create a new game** now opens a focused composer with three useful examples and the fixed Godot 4, 2D, GDScript, Top-down arena, code-native, first-playable boundary.
- The installed official Codex SDK runs GPT-5.6 with high reasoning, read-only sandboxing, network and web search disabled, structured output, and session-scoped state.
- GPT may ask at most three questions from five allowed topics on one screen. Forge rejects repeated answered topics and never allows a second clarification loop.
- The strict blueprint validates a safe name, the required foundation, three to five unique acyclic quest references, criterion/proof links, and absence of paths, commands, packages, arbitrary source files, and workflow claims.
- One invalid response receives one same-thread structure repair; a second invalid response ends in a safe, plain-language failure without a blueprint.
- Blueprint Review leads with the vision, first playable result, and roadmap. Approval produces only the honest **Blueprint Ready** session state.
- The real rehearsal generated the five-quest **Last-Moment Pulse** blueprint in one valid GPT-5.6 response in about 29.5 seconds. It created no project directory and recorded zero project files, commands, and Godot processes.
- Edge visual review passed all requested desktop, tablet, mobile, and reduced-motion states with no console/network errors, horizontal overflow, missing primary actions, or roadmap-order problems.
- `npm run forge` and `npm run forge:v0.1` remain protected; `npm run forge:v0.2` owns this preview path.

Task 5 still owns controlled starter copying, project-directory creation, Git initialization, Godot smoke verification, generated-project persistence, and registration. GPT-5.6 used API-key-backed Codex auth for the live rehearsal; ChatGPT Codex auth rejected the requested model and Forge did not silently substitute another.

## v0.2 Task 5 — Controlled Top-down Arena Project Creation and Persistence

**Date:** 2026-07-14
**Status:** Complete — controlled creation, Godot verification, Git baseline, restart discovery, and responsive review passed

- Added one committed Top-down Arena starter with an exact inventory, versioned manifest, code-native scene, player movement, objective marker, and Forge-owned verifier.
- Added strict generated-project contracts for the starter, project, vision, first playable, quests, state, Chronicle, planning/creation provenance, Godot result, Git result, registry, and sanitized failure evidence.
- A current approved blueprint now requires a second exact filesystem confirmation. A one-time same-origin mutation token prevents cross-origin, ambiguous, or replayed creation requests.
- Creation uses seven honest stages, a staging directory, atomic artifact writes, strict reload validation, pinned Godot 4.7 verification, one clean local Git baseline commit with no remotes, atomic promotion, and registry-last persistence.
- Canonical path, direct-child, reserved-name, length, collision, symlink/junction, duplicate, concurrent, cancellation, and controlled cleanup boundaries are covered by tests.
- Launchpad recent-project summaries and created-project reopen/folder actions survive a fresh service instance while Project World integration remains explicitly pending.
- The real GPT-5.6 rehearsal created **Last-Moment Pulse**, project `last-moment-pulse-6631032087`, with 32 controlled files and Git commit `9f73f5040bac9b67e806a56129170a150c139637`; Godot emitted the exact success marker and a visible launch ran 120 frames.
- Edge review passed ten confirmation, progress, verification, created, reduced-motion, recent/reopen, and controlled-failure captures with no console, network, layout, focus, or action issues.
- `npm run check` passes 79/79 and `npm run check:v0.1` passes the production build plus all 37 protected compatibility tests. The sample hash remained unchanged and GPT supplied no paths, commands, arbitrary files, or source code.

Task 6 owns generated-project Project World integration. Generated-quest implementation, additional starters, and sample-art changes remain deferred.

## v0.2 Task 6 — Generated Project World Integration

**Date:** 2026-07-14
**Status:** Complete — validated open, restart state, idea activity, real Godot launch, and responsive review passed

- Launchpad recent projects now open through a same-origin `POST` accepting only the registered project ID. Full validation precedes the atomic `lastOpenedAt` update.
- Read-only reload uses `GET /world` and changes no registry or project bytes.
- Project World renders the persisted vision, first playable milestone, four-node roadmap, planning briefs, Chronicle, derived idea activity, documentation disclosures, and controlled actions.
- The code-native canvas is explicitly a **Verified starter layout** / **Playable-state preview**, not a captured Godot frame. Enemy approach and push pulse remain planned.
- Generated quest implementation remains `not_enabled` and is explained without a fake or unexplained Build action.
- One optional `.forge/idea-seeds.json` record owns idea text plus the activity note merged into the Chronicle view. Authoritative Chronicle and roadmap hashes remain unchanged.
- A fresh service restored Last-Moment Pulse, the fourth selected quest, one idea seed, and its derived activity. The generated Git baseline stayed clean and the sample hash stayed unchanged.
- Pinned Godot launched the canonical project for 120 frames with exit code `0`.
- `npm run check` passes 86/86; `npm run check:v0.1` passes the production build and 37/37; Edge review passes 11 states with zero issues.

Task 7 owns final required-path hardening. Generated-quest implementation, more starters, import, generalized scanning, and sample art remain deferred.

## v0.2 Task 7 — End-to-End Hardening and Judge Rehearsal

**Date:** 2026-07-14
**Status:** Pass — both required journeys and all release gates complete

- Verified a clean temporary clone through `npm ci`, Codex login status, first-time pinned Godot download, and demo preparation.
- Ran a fresh official-SDK Enemy Targeting implementation that changed only the three approved files and passed every automated criterion. A creator then visibly observed `IDLE → CHASING → IDLE`, entered the exact success confirmation, and Forge persisted final `PASS` through host reload before a verified safe reset.
- Used real GPT-5.6 high reasoning and exact approvals to create **Gravity Tap Arena**, verify it in pinned Godot, establish clean no-remote Git commit `7dbbbf43f206cd5334b226d6c9a98fbfcf0e10a8`, register it, reopen Project World, restore selection and idea activity, and preserve roadmap/Chronicle bytes and the sample workspace.
- Fixed Windows review-host `spawn EINVAL`, stale visual-harness composition and cleanup, prior-evidence overwrite risk, and hidden generated Godot/File Explorer actions.
- Edge `150.0.4078.65` passed 48 automated captures across six suites with zero console, network, layout, action, focus, accessibility, or reduced-motion issues; one additional real completion capture records creator-confirmed proof.
- Added a judge guide, video shot list, submission checklist, final review/closeout, handoff, and sanitized Task 7 evidence.
- Promoted `npm run forge` to v0.2 after every gate passed, retained `npm run forge:v0.1` as the protected compatibility launch and `npm run forge:v0.2` as an explicit alias, and added a default-routing regression.

Generated-quest execution, additional starters, import, generalized scanning, Graphify, Godot MCP, general chat, automatic idea conversion, and sample art remain deferred.

## v0.2 Task 8 — Public Showcase and Guided Walkthrough

**Date:** 2026-07-14
**Status:** Complete — static build, content/privacy validation, responsive Edge review, and release regressions pass

- Added an isolated static `showcase/` surface representing the immutable `v0.2.0` release at commit `08cffa7`.
- Added a concise product narrative, category-level workflow problem, Forge method, interface tour, two seven-step guided replays, neutral comparison, explicit current/next/future horizons, progressive technical architecture, Task 7 proof, local setup, submission links, and a static-site limitation boundary.
- Reused nine inspected Task 7 application states with typed provenance; generated one decorative hero through the built-in OpenAI image tool and created deterministic SVG favicon/Open Graph assets. Illustrations are never classified as evidence.
- Added truthful configured/unconfigured public links, an accessible non-autoplay video dialog, query-string walkthrough deep links, keyboard and touch controls, focus management, live announcements, and reduced-motion behavior.
- Added static/Vercel deployment, content refresh, evidence sanitation, public-link, image record, architecture decision, and future cloud/local companion documentation.
- Added content tests, static/privacy/truth validation, asset budgets, and Microsoft Edge review at desktop, tablet, mobile, and reduced-motion states without operational imports or runtime data calls.
- The Task 7 release, `npm run forge`, `npm run forge:v0.1`, operational sources, sample/generated projects, and `v0.2.0` tag remain unchanged. No deployment occurred.
