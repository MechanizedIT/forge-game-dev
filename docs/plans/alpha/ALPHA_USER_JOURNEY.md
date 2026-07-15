# Alpha User Journey

## Build Week proof journey

The journey is a sequence of visible decisions, not a chat transcript and not a terminal session.

| Stage | What the creator sees | Creator action | What Forge owns and persists | Capability status |
| --- | --- | --- | --- | --- |
| 1. Idea | “Describe the tiny game you want to make” with ordinary-language input | Enter Signal Sweep idea | Existing planner session only; no project write | Existing v0.2 |
| 2. Supported interpretation | “Best fit: a Top-down Arena relay challenge,” fit/mismatch, tradeoffs, alternatives, Something else | Accept, pick alternative, revise, or reject | Proposed blueprint revision; no project write | Proposed P0 Task B |
| 3. Vision | One-sentence promise, player action/goal, exclusions, first playable | Edit a bounded decision or accept | Immutable accepted-blueprint provenance after approval | Existing + P0 revision |
| 4. Roadmap | **Already playable** facts above 3–5 **Planned changes**; first playable highlighted | Rename/outcome edit, dependency-safe add/remove/reorder, accept/reject | Accepted roadmap fingerprint; still no project write | Proposed P0 Task B |
| 5. Create | Exact destination and controlled starter summary | Confirm filesystem creation | Existing staging, Godot proof, baseline Git, artifacts, registration | Existing v0.2 |
| 6. Project World | Current playable state, roadmap, one recommended eligible quest, plain next action | Select eligible quest | Existing read snapshot/selection | Existing + P0 copy |
| 7. Quest review | Outcome, why, current facts, narrow delta, proof, play steps | Adjust, Build, or Defer | Quest revision or plan state only after explicit action | Proposed P0 Task A |
| 8. Contract review | Exact files that may change, exclusions, three automated checks, expected visible result | Approve exact contract or go back | Fingerprinted contract/run journal | Proposed P0 Task A |
| 9. Build | Human-readable steps: preparing context, editing approved files, reviewing boundary | Wait or cancel | SDK thread/events/evidence; source diff only | Proposed P0 Task A |
| 10. Verification | Boundary, project health, and mechanic checks shown separately | Inspect details or retry/rollback on failure | Structured proof results | Proposed P0 Task A |
| 11. Play | “Launch and activate one relay”; actions: Play, Open in Godot (if enabled), Open Folder | Play the real game | Existing launch plus optional editor action; no completion yet | Existing/P1 |
| 12. Confirm | “Did the relay activate visibly?” | Worked / Did not work / Not ready / Retry / Cancel | Creator confirmation in run journal | Proposed P0 Task A |
| 13. Complete | Visible outcome, files changed, proof, Chronicle, Git, next quest | Continue or stop | Atomic project state/docs/Git completion | Proposed P0 Task A |
| 14. Restart | Completed node and next eligible recommendation restored | Reopen project | Strict artifact/Git/receipt reconciliation | Proposed P0 Task A |

## Recommendation pattern

Forge should recommend, not present an undifferentiated menu. For Signal Sweep:

> **Recommended: Relay challenge in the Top-down Arena.** It keeps your “restore signals under pressure” idea and fits the safe starter's movement and bounded arena. The first version uses visible geometric relays instead of a large map or art pipeline.

Alternatives might be “collect three signals with no timer,” “hold one relay while danger approaches,” and **Something else**. Each states the consequence in one sentence. A poor-fit idea such as a scrolling platformer receives an honest message: Forge can reinterpret it as an arena challenge, but does not currently support platformer physics as a native foundation.

Clarifications are asked only when the answer changes the foundation interpretation, first playable, scope, or proof. Do not ask about art style, lore, or polish when code-native visuals and a tiny first playable are already fixed.

## Roadmap review

The review has two visually separate sections:

- **Already playable from the starter:** bounded arena, player, WASD/arrows movement, camera, objective-marker placeholder, project load.
- **Your planned changes:** only deltas such as relay activation, three-relay progress, timer/win/reset, and optional clarity polish.

The creator may edit a quest title or player-visible outcome, remove a non-required quest, add one bounded quest, and reorder where dependencies allow. Forge immediately explains broken dependencies and blocks acceptance until the graph and first playable are valid. Technical IDs stay in disclosure. Accepting fingerprints this roadmap; creation carries it forward. The original accepted blueprint stays immutable for provenance.

## Quest adjustment and approval

The quest brief starts with what will change in the game, not global scope or IDs. **Adjust** may change the visible outcome and omit an optional sub-outcome, but may not add files, change verification profile, cross exclusions, or make a blocked quest eligible. Any adjustment increments the quest revision and invalidates an older prepared contract.

**Build** is a two-step boundary:

1. Forge prepares a contract and shows exact allowed files and proof.
2. The creator approves that fingerprint. No approval is inferred from choosing the quest.

**Defer** changes only the plan state and recommendation; it performs no model call or source mutation.

## Build, proof, and play language

The creator should always be able to answer four questions:

1. **What is happening?** “Codex is adding relay activation.”
2. **Where may it work?** “Only `scenes/main.tscn`, `scripts/main.gd`, and `scripts/objective_marker.gd`.”
3. **What did Forge prove?** “No other file changed; Godot loads; the relay verification profile passes.”
4. **What do I still decide?** “Play it and tell Forge whether the relay is clear and works.”

Raw model/terminal logs remain available only as bounded technical evidence. The primary progress view uses Forge stages and approved step names.

## Confirmation outcomes

| Choice | Behavior |
| --- | --- |
| Worked | Rerun final proof, complete transaction, commit, reload, recommend next quest |
| Did not work | Keep the reviewed diff pending; record failure; offer Retry build, Adjust quest, Play again, or Roll back |
| Not ready | Keep waiting-for-playtest and changes intact; no failure/completion claim |
| Retry | Relaunch play or, after an explicit build choice, start a new run from a clean/reconciled state |
| Cancel | Stop future work; inspect actual diff; offer safe exact rollback; never mark complete |

Unexpected external edits disable completion and automatic rollback until the creator resolves them. Forge names affected paths and preserves data instead of guessing.

## Completion and restart

Completion presents one concise record:

- “Relay activation is playable.”
- changed files;
- boundary/project/mechanic checks;
- creator confirmation time;
- Chronicle event and run ID;
- local Git commit short SHA from the ignored receipt;
- newly available quest and why it is next.

After restart, Forge validates the project-local JSON/Markdown joins, Git commit/run ID, and local receipt before rendering completed. Inconsistency yields a recovery screen; it never silently repairs roadmap truth or claims completion.

## Idea seeds and proposed quests (post-freeze)

The visible future flow is:

`saved seed → Refine → proposal card → revise/reject/accept → accepted roadmap quest → dependency eligibility`

The original seed remains unchanged. Refinement creates a proposal with stable ID, revision, source seed, provenance, status, suggested dependency placement, and narrow quest specification. Rejection/cancellation affects only the proposal. Acceptance is a separate mutation that creates a quest and updates the roadmap transactionally. No source code changes occur. This is P1 after the proof loop, not part of Task A or B.

## Companion (post-freeze)

Before freeze the surface should be labelled **Forge recommendation** and remain derived from current state. A later minimal Companion may support Explain this screen, Explain verification, Recommend next quest, Brainstorm/Save/Refine idea, and Explain failed build. Any mutation response becomes a visible proposal card with explicit acceptance. Conversation history never becomes project truth and carries no shell, arbitrary filesystem, or direct roadmap authority.

Start that future Companion read-only. Retrieve only the validated current Project World snapshot, selected quest/active run summary, relevant proof/failure, and at most two directly related roadmap outcomes. Cap the assembled input at 24,000 UTF-8 characters (roughly 6,000 tokens) and output at roughly 800 tokens. The first version keeps only the current in-memory session (at most six turns); restart drops conversation while saved ideas/proposals remain in their own authoritative artifacts. A later conversation log, if justified by testing, must be a separate non-authoritative local artifact with retention/redaction controls. Unsupported mutation intent returns a reviewable proposal card or an explanation—not a hidden write.

## Action safety

- **Play:** existing project-ID-only pinned Godot launch.
- **Open in Godot:** optional project-ID-only host action; Forge supplies `--editor --path` and tracks transient process state.
- **Open Folder:** existing canonical registered folder action.
- No action accepts a caller path, executable, arbitrary argument, command, or document name.
