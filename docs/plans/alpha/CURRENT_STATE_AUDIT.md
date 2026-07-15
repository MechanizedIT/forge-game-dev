# Current-State Audit

## Verified checkpoint

- Planning branch: `planning/alpha-proof-game` in a separate worktree.
- Starting `main`: `1e734bf060ff3d17abcd45678a95e03d3690ba46`, the merge of the v0.2 product and Task 8 showcase histories.
- Public showcase implementation: `d634b16e5b25e21a202558f44f2b85ba3b99d862`.
- Annotated `v0.2.0` tag object: `cad4d690b4f667f051d9113a416525b16eec5dbe`; tagged release commit: `08cffa71cd802b14c6c72ad343f9fa5b4007a482`.
- The tag, release branch, operational source, showcase source, sample fixture, and generated user projects are read-only for this planning task.

## Capability reality

| Area | What is implemented and protected | What is not implemented | Reuse decision |
| --- | --- | --- | --- |
| New-game intake | A 12–1500 character ordinary-language idea, up to three focused clarifications, strict structured output, one repair, and whole-blueprint approval | Honest foundation fit, alternatives, per-decision revision, and starter-aware roadmap deltas | Keep the session/SDK/schema gates; extend the blueprint contract minimally in Task B |
| Foundation | One controlled `top_down_arena` foundation and one deterministic Godot starter | Platformer or other foundation selection | Keep one foundation and explain the interpretation; do not add a starter |
| Creation | Safe destination confirmation, staging, controlled inventory, strict artifacts, pinned Godot validation, local clean Git baseline, register-last recovery | Model-authored source or arbitrary starter composition | Preserve the transaction; it is not the generated quest executor |
| Generated Project World | Strict registered-project joins, persisted selection, read-only world snapshot, idea-seed save, play/folder actions, restart | Quest adjustment, implementation, completion, Chronicle mutation, editor launch | Keep it a read model and narrow action surface; attach a sibling runner |
| Sample quest | Complete approval, Codex, progress, allowlist review, verification, play gate, creator confirmation, completion, evidence | Any quest except prepared Enemy Targeting | Extract only small stateless safety primitives; never call or generalize its semantic workflow |
| Godot | Pinned verified 4.7 executable, headless checks, visible project launch | Editor action and export presets/templates | Add editor launch only as an isolated project-ID action; defer export |
| Docs/state | Strict project JSON plus creation-time deterministic Markdown; Git is local provenance | Post-quest renderer/transaction and restart reconciliation | Add deterministic render/validate inside generated completion |
| Companion | Static or derived contextual recommendation copy | Conversation, durable context, mutation proposals | Keep it read-only before freeze |
| Idea seeds | Atomic `{ ideaSeedId, idea, createdAt, activityNote }` records separate from roadmap | Refinement, revisions, proposal review, promotion | Use a future proposals owner; not Task A or B |
| Showcase | Isolated typed static site with current/next/future and evidence provenance | Automatic live product synchronization | One manual/typed refresh after freeze only |

## The two most important contradictions

### Planner mechanics in source

The planner accepts 12–1,500 trimmed characters. It may return a complete blueprint immediately or one clarification screen with at most three unique questions from `game_style`, `core_action`, `fun_target`, `input_mode`, and `smallest_playable_result`; answers are at most 240 characters, the service heuristically rejects topics already answered in the idea, and no second clarification round is allowed. The same SDK session receives the answers. One structured-output repair is permitted.

The model result becomes usable only after strict Zod and cross-reference validation; paths, commands, packages, project files, and workflow claims are excluded. Approval stores an in-memory SHA-256 fingerprint and timestamp and still writes no project. Revision returns to the original idea intake rather than editing one decision. The schema permits 3–5 ordered quests with dependencies, criteria, and verification-idea references, but has no original-idea/fit/interpretation/alternative/creator-adjustment fields and no starter-fact reconciliation. These are safety-positive constraints around a temporary UX/product limitation—not evidence of broader foundation support.

### “Free-form” is syntactic, not product-semantic

`NewGameFlow.tsx` invites an original idea and even shows a platformer example, but `game-blueprint.ts` and the fixed planner prompt require `foundation: "top_down_arena"`. The service validates that literal before anything becomes authoritative. A creator can type anything, but Forge silently maps it to one foundation. This is a proof-game blocker, not a reason to add more foundations: the correction is an explicit recommended interpretation, fit/mismatch explanation, alternatives, and rejection/revision choice.

### Generated roadmaps can plan work already present

The controlled starter already contains a bounded arena, player, keyboard movement, camera, objective marker, and fixed verifier. The real **Last-Moment Pulse** roadmap begins with arena and movement quests; **Gravity Tap Arena** likewise plans arena/movement work already verified. The Project World can therefore say movement is playable while a movement quest remains locked. Before a fresh proof game is credible, roadmap generation must receive starter facts and produce delta quests, and every quest must have its own bounded scope rather than inheriting the blueprint's global scope.

## Authoritative state and mutation boundaries

| State | Current owner | Alpha rule |
| --- | --- | --- |
| Initial approved blueprint | `.forge/blueprints/approved-blueprint.json` and planning provenance | Immutable creation provenance |
| Accepted project roadmap | `.forge/roadmap.json` | Mutable authoritative plan after explicit acceptance |
| Quest specification/state | `.forge/quests/<questId>.json` | Extend under a generated-quest contract; mutate only in completion transaction |
| Selected view/quest | `.forge/project-state.json` | Existing narrow Project World mutation |
| Chronicle | `.forge/chronicle.json` | Append deterministic accepted/completed events; never use it as proposal state |
| Idea seeds | `.forge/idea-seeds.json` | Preserve immutable seed text; future refinement belongs to proposals |
| Implementation evidence | `.forge/runs/<runId>/` or local equivalent | Run-owned journal, diff, boundary, verification, confirmation, provenance |
| Actual commit SHA | Local ignored completion receipt | Store after commit to avoid a tracked self-reference loop |
| Public proof | `showcase/src/content/*` plus curated evidence | Derived, post-freeze, owner-reviewed; never an operational owner |

## Sample-loop reuse boundary

Reusable concepts are the explicit approval envelope, SDK adapter, sanitized progress translation, diff capture, exact-path review, creator play gate, evidence writer, and confirmation pattern. The current implementation is nevertheless coupled to `enemy-targeting`, a three-file allowlist, fixed commands and success marker, AC-1…AC-6, two verification results, sample completion state, and sample-specific copy. The generated path needs a sibling service and generated contracts. A later refactor may extract tiny stateless primitives only when both callers prove the identical invariant.

## UX and evidence observations

Task 7 evidence proves the sample loop and creation/reopen path work across desktop/tablet/mobile, and Task 8 proves the static showcase builds and labels current/future truth. Those reports validate layout and runtime gates; they do not establish creator comprehension. The source and screenshots still show:

- a platformer intake example beside the forced arena foundation;
- a whole-blueprint revise action instead of decision-level revision;
- technical quest IDs/dependency slugs and global scope in creator briefs;
- hard-coded “Four planned quests” and Task-number copy despite a 3–5 quest schema;
- “verification ideas” generated by the planner without separating deterministic proof from creator play;
- only Play and Open Folder actions;
- a static Companion that can be mistaken for conversational capability.

See the prioritized [UX friction review](UX_FRICTION_REVIEW.md).

## Feasibility conclusions

1. A complete generated quest is feasible because the repo already has every primitive category, but completion/rollback/state ownership must be newly designed.
2. The first proof quest should touch existing starter files only. Controlled new-file creation is unnecessary proof risk.
3. Safe editor launch is small: official Godot documentation defines `--editor` and `--path`; Forge already owns the pinned executable and canonical registered path.
4. Web export is not a small add-on. Godot requires `export_presets.cfg` and matching export templates; neither exists in Forge or generated projects.
5. General Companion chat and idea promotion would add state, context, mutation, and testing surfaces without proving the missing code-to-game loop.
6. A fresh proof game is the strongest evidence, but a clean existing generated project must be the fallback so the implementation loop—not planner variance—gets proven.

## Official-source decisions

| Source | Decision supported |
| --- | --- |
| [Codex best practices](https://learn.chatgpt.com/guides/best-practices.md) | Keep one bounded goal, explicit constraints/done criteria, focused context, and review/verification gates |
| [Codex SDK](https://learn.chatgpt.com/docs/codex-sdk.md) | Reuse an SDK thread with workspace-write only inside Forge's already-resolved project; do not treat SDK completion as proof |
| [Codex skills](https://learn.chatgpt.com/docs/build-skills.md) | Skills are focused reusable procedure packages, not state owners; defer runtime skills until a repeated workflow exists |
| [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md.md) | Repository and nested instructions remain the durable ownership boundary for Forge development |
| [Godot command line](https://docs.godotengine.org/en/stable/tutorials/editor/command_line_tutorial.html) | Implement editor launch as pinned executable plus Forge-owned `--editor --path <canonical project>` arguments |
| [Godot export](https://docs.godotengine.org/en/stable/tutorials/export/exporting_projects.html) | Export needs a named preset and installed template; do not promise it from the current repo |
| [Godot Web export](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html) | Prefer a single-threaded Web preset if attempted later; retain native capture because Web hosting/browser constraints remain |
