# Alpha Proof-Game Roadmap

## Outcome and critical path

The alpha succeeds only when Forge can truthfully show one complete generated-quest loop in a real generated Godot project:

`ordinary-language idea → honest supported interpretation → approved vision → starter-aware accepted roadmap → eligible quest → adjusted bounded contract → explicit approval → Codex changes exact files → boundary/project/mechanic proof → creator playtest → creator success → atomic completion + Git → restart + next recommendation`

Everything before Codex exists in partial form. Everything after generated quest selection is the critical missing product. The deadline strategy is therefore **prove the transaction first, improve the fresh intake second, freeze, then submit**.

## Scope

### P0 Build Week proof alpha

- Preserve the existing sample and v0.2 paths.
- Execute exactly one eligible generated quest in a registered clean generated project.
- Use a strict implementation contract and existing-file allowlist.
- Show understandable progress and three separate proof layers.
- Require creator play and explicit success before completion.
- Roll back only run-owned changes and recover interrupted state.
- Atomically update quest, roadmap, Chronicle, deterministic docs, provenance, project state, and local Git.
- Restore completion and recommend the next eligible quest after restart.
- Then make a fresh idea honest: supported-foundation recommendation, bounded vision revision, starter-aware roadmap review/acceptance.

### P1 practical external-test additions

Only after P0 passes twice: isolated Open in Godot action, setup diagnostics/recovery copy, owner-independent test instructions, and the smallest usability corrections observed in rehearsal. Controlled new files, idea proposals, and structured Companion intents remain candidates—not commitments.

### P2 submission work

Proof-game capture, evidence manifest, consented test notes, one post-freeze showcase refresh, video, Devpost copy, public links, packaging, clean-clone rehearsal, and native gameplay fallback.

### Deferred

Multiple starters/foundations, general project scanning/import, general Companion chat, automatic idea promotion, broad new-file authority, generalized export/publishing, accounts, collaboration, and multi-quest autonomy.

## Task A — complete one generated quest

**Status:** `COMPLETE / PASS` (2026-07-14). Real Gravity Tap Arena Quest 1 passed exact approval, official SDK execution, existing-file boundary review, project and mechanic proof, visible creator play, creator-selected **Worked**, atomic completion commit, fresh-service reconciliation, and full host restart restoration. See the [review](../../reviews/2026-07-14-alpha-task-a-generated-quest-loop-review.md), [closeout](../../closeouts/2026-07-14-alpha-task-a-generated-quest-loop-closeout.md), and [real rehearsal evidence](../../evidence/2026-07-14-alpha-task-a-real-rehearsal.json).

**Goal:** implement, prove, play, confirm, complete, commit, and restore one generated quest without changing the sample semantics.

**Creator-visible result:** an eligible Project World quest offers Adjust, Build, and Defer. Build opens a plain-language contract with exact file boundary. After approval, Forge shows bounded progress, proof results, play instructions, explicit success/failure/not-ready choices, then a completion card with Chronicle, Git, and next quest.

**Owner:** new `src/generated-quest-runner/AGENTS.md`, `service.ts`, contracts, transaction/recovery modules, and tests. `generated-project-world` remains the validated read snapshot. `dashboard-host` exposes exact routes. The existing `quest-runner` retains Enemy Targeting semantics.

**Reuse:** registered-project resolution; generated artifact schemas and atomic JSON writer; pinned Godot resolver/runner; creation Git helpers where invariants match; sample SDK configuration, event sanitization, diff capture, progress concepts, play gate, and confirmation language. Extract only stateless primitives with identical tests.

**Likely files:**

- `src/contracts/generated-project.ts` and new `src/contracts/generated-quest-run.ts`
- new `src/generated-quest-runner/{service,contract,context,boundary,verification,completion,recovery,shared}.ts`
- narrow shared primitives under `src/quest-runner/` only if both paths have identical behavior
- `src/dashboard-host/{server,service}.ts`, `src/dashboard/api.ts`
- `src/dashboard-v2/GeneratedProjectWorld.tsx`, `src/dashboard-v2/styles.css`
- `src/godot/` for a mechanic verifier adapter and optional editor action
- focused generated-runner, host, UI-source, recovery, and protected-regression tests
- a real rehearsal/evidence script and milestone docs

**New contracts:** `GeneratedQuestImplementationContract`, `GeneratedQuestRunJournal`, boundary result, three-layer verification result, creator confirmation, completion receipt, and minimal durable quest lifecycle described in [architecture](ALPHA_ARCHITECTURE.md).

**Artifact/state changes:** run-owned journal/evidence; quest lifecycle; roadmap state; Chronicle `quest_completed`; deterministic Markdown; project state; planning/implementation provenance; one local Git commit; ignored actual-SHA receipt. Initial blueprint and idea seeds do not change.

**API changes:** project-ID + quest-ID routes for prepare/adjust/approve/start/status/cancel/play/confirm/rollback; exact body schemas; same-origin on every mutation/action; no caller paths, commands, model options, or Git arguments. Add `POST /api/projects/:projectId/editor` only after the core acceptance suite passes and keep it isolated.

**UI changes:** dynamic quest count/copy; outcome-first quest brief; Adjust/Build/Defer; contract review; progress; proof layers; play gate; confirmation; failure/rollback; completion and next recommendation. No raw terminal as primary content.

**Non-goals:** new files, additional starters, roadmap-wide editing, idea promotion, Companion chat, export, publishing, arbitrary verification commands, multiple completed quests, sample runner refactor for its own sake.

**Security/rollback boundary:** start only from a registered canonical project at clean expected HEAD. Resolve file roles to a maximum of four existing project files plus one Forge-owned verifier file; block `.forge` source edits during Codex, `.git`, `.godot`, external assets, deletion, unapproved paths, links/escapes, dependencies, commands, and concurrent edits. Capture pre/post hashes and restore only run-owned paths when their current hashes still match; otherwise refuse automatic rollback.

**Tests and real rehearsal:** contract/schema rejection; traversal/symlink/body gates; dirty worktree; unapproved modification/new/deleted file; concurrent edit; Codex failure; verification failure; confirmation outcomes; commit failure; interrupted phases; reload reconciliation; deterministic rendering; sample hashes and protected suite. Rehearse one real quest in Gravity Tap Arena first, visibly play it, record exact confirmation, restart a fresh service, validate the commit and next quest, then reset/repeat once if time permits.

**Browser review:** prepare, contract, active progress, each failure class, proof, play, confirm, complete, restart, desktop/tablet/mobile, keyboard/focus/reduced motion, no stale optimistic rows.

**Documentation:** Task A plan/handoff/review/closeout/evidence, AI work log, operational status/roadmap only at actual milestone closeout, and judge recovery notes only after proof.

**Acceptance criteria:**

1. One real generated quest reaches completed only after exact approval, allowed diff, all automated proof, and creator success.
2. No unapproved path/new/deleted file can pass boundary review.
3. Failure/cancel/rejection never completes the quest; safe rollback touches only run-owned paths.
4. Quest, roadmap, Chronicle, docs, provenance, project state, and Git agree after reload.
5. The commit records the run ID; the ignored receipt records the actual SHA without a second commit.
6. The sample fixture/path, other generated projects, showcase, and `v0.2.0` remain unchanged.

All six acceptance criteria passed. Task A intentionally proves one prepared, existing-file-only generated quest; it does not authorize Task B or broaden the supported project/foundation boundary.

**Estimate:** one xhigh Codex implementation session plus one separate review/fix session; roughly 25–40 touched Forge files including tests/docs. **Model:** GPT-5.6 Sol xhigh. **Unattended:** code/test work may run unattended inside the approved task; real Codex execution, visible play, creator confirmation, and failure/rollback judgment require the creator. **Kill:** if no real generated quest completes by the end of Day 1, stop Task B and use only the reduced fallback on Day 2; if that still fails, return to the released v0.2 submission path.

## Task B — honest starter-aware intake and roadmap review

Task B starts only after Task A completes a real rehearsal.

**Goal:** let an ordinary idea become one explicit supported interpretation and an accepted roadmap of deltas rather than silently forcing the idea or planning starter behavior again.

**Creator-visible result:** Forge says, in plain language, “Here is the version that fits the Top-down Arena foundation,” shows fit/tradeoffs and 2–3 alternatives, allows revise/reject, then presents a roadmap that labels **Already playable** versus **Planned change** and permits bounded title/outcome/removal/reordering edits before acceptance.

**Owner:** blueprint planner owns recommendation and initial proposal; project creation owns carrying accepted artifacts into the new project; generated world reads the accepted roadmap. Do not move editing into the world snapshot service.

**Reuse/likely files:** planner service/prompt/session/SDK; `game-blueprint.ts`; `NewGameFlow.tsx`; creation artifact renderers; starter facts/manifest/verifier; generated project contracts and world UI copy; focused planner/creation/world tests and real fresh rehearsal.

**New contracts:** add exactly `originalIdea`, `recommendedInterpretation`, compact `foundationFit { level, explanation }`, `tradeoffs[]`, and `alternatives[]`, each rendered and tested. Do not accept model-authored `creatorAdjustments`; record creator edits as structured approval-envelope revision events. Add explicit accepted-roadmap revision/provenance and `currentPlayableFacts`/delta scope per quest. The approved initial blueprint remains immutable provenance; the accepted roadmap becomes mutable plan authority.

**State/API/UI:** bounded planner revisions occur before creation and require a new explicit roadmap acceptance fingerprint. No source project exists yet. Creation persists both original blueprint and accepted roadmap provenance. Collapse redundant Ready copy if safe, but retain separate creative approval and exact filesystem confirmation.

**Non-goals:** another foundation/starter, arbitrary quest generation after creation, idea seeds, chat, generated code, export, visual redesign.

**Risk/boundary:** model variance and schema expansion. Reject unsupported output, one repair only, no destination/source/command authority, and no creation until both plan and filesystem approvals match. If starter reconciliation cannot be deterministic, constrain the proof concept and use a Forge-owned quest template for Signal Sweep rather than accepting contradictory model quests.

**Tests/rehearsal/browser:** unsupported platformer interpretation; strong/partial/poor fit; revision and rejection; alternatives/something else; starter-duplicate quest rejection; dependency-safe add/remove/reorder; immutable provenance; creation/reload; existing blueprint/creation/sample regressions. Run one fresh Signal Sweep planning/creation rehearsal and inspect the accepted roadmap before using it as proof evidence.

**Acceptance:** no idea is silently presented as native support; every accepted quest is a visible delta from verified starter facts; creator can revise/reject; first eligible quest is implementable under Task A; existing v0.2 projects still load.

**Estimate:** one high Codex session plus focused review; roughly 15–25 Forge files. **Model:** GPT-5.6 Sol High. **Unattended:** implementation/tests yes after scope approval; live model result acceptance and creation confirmation require the creator. **Kill:** if it cannot produce a non-duplicative roadmap by the middle of Day 4, use the existing generated-project fallback and freeze.

## Seven-day schedule

| Day | Work and gate |
| --- | --- |
| **1 — first major implementation day** | Land this planning commit; approve Task A; drive the smallest Gravity Tap contract through execution, proof, creator gate, completion, and restart. Build failure-first tests alongside it. **Gate:** if no real quest completes by end of day, kill Task B and every secondary feature immediately and switch to the reduced fallback prompt. |
| **2 — harden or stop** | If Day 1 passed, harden rollback/recovery/UI and repeat the real rehearsal. If it failed, spend this day only on the prepared fallback. **Gate:** no trustworthy completion by end of day means return to the released v0.2 submission story; do not keep building alpha. |
| **3 — fresh journey** | Fix only Task A defects. If green, implement Task B recommendation + starter-aware roadmap review; create/rehearse Signal Sweep. Decide editor action only if it is demonstrably isolated. |
| **4 — proof game and freeze** | Complete one Signal Sweep quest through the real loop; run internal browser/accessibility/restart/rollback review. Decide Web export with a one-hour readiness probe only; otherwise native capture. **Hard feature freeze: 18:00 local.** |
| **5 — test/evidence** | No features. External showcase comprehension and owner-assisted/local alpha tests; triage only P0 blockers; capture gameplay, contracts, proof, Chronicle, and Git evidence with consent. |
| **6 — submission assembly** | One typed showcase content refresh, video assembly, Devpost draft, evidence audit, UX copy fixes that do not change architecture, full regression and clean-clone rehearsal. |
| **7 — final** | Final external/owner replay, links/license/visibility decisions, video/Devpost polish, clean clone, submit, and protected buffer. Roll back to v0.2 story if integrity gates fail. |

## Kill criteria

- No real generated completion by end of the first major implementation day (Day 1): cancel Task B, chat, ideas, editor, export, and use the reduced fallback prompt only.
- No trustworthy prepared completion by end of Day 2: stop alpha implementation and return to the released v0.2 submission story.
- Unreliable rollback, state reconciliation, or Git: do not expose generated Build; submit the released v0.2 path.
- New-file need expands beyond the proof contract: simplify Signal Sweep; do not weaken the boundary.
- Task B threatens the Task A rehearsal: use Gravity Tap and describe fresh-intake improvement as future work.
- Companion or idea promotion touches the critical path: defer it.
- Export needs template installation/pinning, preset debugging, or hosting work beyond one hour: capture native gameplay.
- A second starter appears necessary: simplify the game.
- An external tester cannot set up in time: run showcase comprehension or an owner-assisted quest test; do not broaden setup scope.
- Any change risks the sample, showcase, release tag, or unrelated generated project: stop and restore the protected boundary.
