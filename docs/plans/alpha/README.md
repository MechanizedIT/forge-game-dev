# Forge Alpha Proof-Game Plan

Status: Task A is `COMPLETE / PASS` on the alpha implementation branch. Task B remains a planning proposal. Neither alpha task is part of the protected `v0.2.0` release tag.

## Recommendation in one page

Forge should spend its remaining pre-freeze implementation time proving one loop: a creator approves a bounded generated quest, Codex changes a real generated Godot project inside an exact file boundary, Forge proves the boundary and project health, the creator plays and confirms the result, and one completion transaction updates the quest, roadmap, Chronicle, deterministic records, local Git, and restart state.

The proof game should be a fresh **Signal Sweep** project: activate three relays in a bounded arena before time expires. The existing Top-down Arena starter supplies movement and the arena. The first proof quest adds one visible, verifiable relay interaction using existing files only. Use the clean local **Gravity Tap Arena** project to prove Task A first; if the generated transaction is not green by the end of the first major implementation day, cut Task B and switch to the reduced Gravity fallback. If Task A passes but the fresh journey is not green by noon on Day 4, use Gravity Tap for final evidence.

Only two substantial tasks are allowed before the hard freeze:

1. **Task A — generated quest completion loop.** Add a sibling generated-quest runner, strict implementation contract, existing-file boundary, three proof layers, creator confirmation, run-owned rollback, atomic completion, Git provenance, restart recovery, and—only if it remains isolated—the registered-project Godot editor action.
2. **Task B — honest starter-aware planning.** After Task A passes a real rehearsal, add the supported-foundation recommendation and a bounded vision/roadmap review that distinguishes starter facts from planned deltas. Do not add chat, idea promotion, export, another starter, or general project scanning.

Feature freeze is the end of Day 4. Days 5–7 are reserved for rehearsal, external testing, evidence, showcase refresh, video, Devpost, clean-clone replay, submission, and buffer.

## Three alpha scopes

- **Build Week proof alpha:** one fresh idea, approved vision and starter-aware roadmap, one implemented generated quest, deterministic and creator proof, durable completion, local Git, restart restoration, and truthful submission evidence.
- **Practical external-test alpha:** the proof loop plus setup diagnostics, comprehensible recovery, owner-independent instructions, and at least one external tester completing the flow without hidden repair.
- **Longer-term Forge:** multiple foundations, general project import/scanning, general Companion chat, controlled new-file creation at broader scale, idea promotion, export/publishing automation, and multi-quest autonomous development.

## Category distinction

| Category | Primary optimization | Where Forge is different |
| --- | --- | --- |
| Prompt-to-game/output systems | Produce an initial result quickly | Forge emphasizes reviewed small deltas and continuity after the first output |
| General coding agents | Powerful implementation across many code tasks | Forge supplies the game-specific plan, focused context, exact boundary, proof, creator gate, and durable next step around Codex |
| Game-editor assistants | Bring AI authoring/inspection close to an engine | Forge spans idea, roadmap, local project, Codex work, technical proof, playtest, Chronicle, and Git across sessions |
| Forge | A creator-friendly governed game-development loop | It trades breadth for one visible, bounded, approved, verified quest at a time |

This is a workflow distinction, not a universal-superiority claim. Forge is not trying to replace Codex; it gives Codex focused context and a creator-controlled process before and after code generation.

## Document map

| Question | Document |
| --- | --- |
| What really works now? | [Current-state audit](CURRENT_STATE_AUDIT.md) |
| What is the critical path and seven-day schedule? | [Proof-game roadmap](ALPHA_PROOF_GAME_ROADMAP.md) |
| What is P0, P1, P2, or deferred? | [Capability matrix](ALPHA_CAPABILITY_MATRIX.md) |
| Who owns execution, state, rollback, and Git? | [Architecture](ALPHA_ARCHITECTURE.md) |
| What does the creator experience? | [User journey](ALPHA_USER_JOURNEY.md) |
| Where does v0.2 confuse creators? | [UX friction review](UX_FRICTION_REVIEW.md) |
| Which tiny game proves the product? | [Proof-game plan](PROOF_GAME_PLAN.md) |
| How should external testing work? | [External-test plan](EXTERNAL_TEST_PLAN.md) |
| Where do skills and focused context fit? | [Skills and context](SKILLS_AND_CONTEXT_PLAN.md) |
| Is editor launch or Web export feasible? | [Export and publish plan](EXPORT_AND_PUBLISH_PLAN.md) |
| What changes in the public site after freeze? | [Showcase refresh plan](SHOWCASE_REFRESH_PLAN.md) |
| What should Codex implement first? | [Primary prompt](NEXT_IMPLEMENTATION_PROMPT.md) |
| What is the reduced-scope escape hatch? | [Fallback prompt](FALLBACK_IMPLEMENTATION_PROMPT.md) |
| What do the proposed screens and flow look like? | [Reviewable visual plan](visual/index.html) and [local source](visual/plan.mdx) |

## Evidence and decision basis

The audit is grounded in source, contracts, tests, Task 7/8 evidence, and two real clean generated projects under Forge's local projects root. It does not infer capability from roadmap prose. Official sources support only decisions repository evidence could not settle:

- [Codex best practices](https://learn.chatgpt.com/guides/best-practices.md): keep goals, constraints, and done conditions explicit; use focused context and plan/review gates.
- [Codex skills](https://learn.chatgpt.com/docs/build-skills.md) and [AGENTS.md guidance](https://learn.chatgpt.com/docs/agent-configuration/agents-md.md): skills are reusable, progressively disclosed procedures; repository instructions and artifacts remain durable authority.
- [Codex SDK](https://learn.chatgpt.com/docs/codex-sdk.md): generated work can use a resumable SDK thread with a workspace-write sandbox, but Forge must still own boundaries and verification.
- [Godot command line](https://docs.godotengine.org/en/stable/tutorials/editor/command_line_tutorial.html): `--editor` starts the editor and `--path` selects a project, supporting a project-ID-only host action.
- [Godot exports](https://docs.godotengine.org/en/stable/tutorials/export/exporting_projects.html) and [Web exports](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html): command-line export still requires a preset and installed templates; Web hosting has browser/server constraints. This supports deferring export until the proof loop passes.

## Adversarial review applied

| Perspective | Finding | Correction already applied throughout the plan |
| --- | --- | --- |
| Nontechnical aspiring creator | The current “free-form” promise and technical quest scope would feel misleading | Make the one supported interpretation explicit; lead with outcomes/current facts; require creator revision and play authority |
| Experienced Godot developer | A model-written verifier and root-level file examples would be false safety | Keep verification Forge-owned/outside editable paths; use real `scenes/` and `scripts/` locations; constrain eligible mechanics |
| AI-agent workflow engineer | Calling the sample runner or feeding all history would hide coupling and grow context | Add a sibling runner, exact contract, 40k-character fail-closed context, and independent diff review |
| Build Week judge | More planning/chat without a generated code-to-game result would not prove Forge | Make one completed generated quest the only critical path and Signal Sweep the visual proof |
| v0.2 maintainer | State migration, rollback, or showcase coupling could damage released evidence | Preserve sample/tag/showcase, split plan/run state, restore exact run-owned paths, refresh showcase once after freeze |
| Submission owner | Two large tasks plus export could erase the final three days | Day 1 kills Task B if no real completion; Day 2 stops alpha if fallback fails; freeze at Day 4 18:00; native capture guaranteed |
| External tester | Setup/recovery and proof language could require owner explanation | Define practical-alpha diagnostics, plain proof layers, recovery screens, consented test scripts, and an owner-assisted fallback |

The first proof quest now uses existing files only; roadmap/starter reconciliation is P0; chat and idea promotion are outside the pre-freeze path; Web export has a native-capture fallback; completion avoids a self-referential SHA; rollback refuses concurrent edits; and testing cannot consume the three post-freeze days.
