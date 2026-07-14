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
