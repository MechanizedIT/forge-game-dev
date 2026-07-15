# Alpha Architecture

## Recommendation

Add a **generated-quest-runner sibling** that owns one generated run from contract preparation through recovery and completion. Keep the Project World a validated read model plus narrow actions; keep project creation responsible for creating/baselining/registering projects; keep the sample quest runner's Enemy Targeting semantics intact. Extract shared code only for stateless primitives whose invariants are identical.

```text
Blueprint planner ──approved blueprint/roadmap──▶ Project creation
       │                                               │
       │ immutable provenance                          │ registered clean project
       ▼                                               ▼
Generated Project World ◀────validated snapshot──── project-local artifacts
       │ projectId + questId                           ▲
       ▼                                               │ atomic completion
Generated quest runner ──bounded SDK/Godot/Git─────────┘
       │
       ├─ boundary proof
       ├─ project-health proof
       ├─ Forge-owned mechanic proof
       └─ creator play confirmation
```

## Decision record

Each decision is settled for the proof alpha. “Reconsider” describes new evidence that would justify reopening it.

| Decision | Recommendation and alternatives | Deadline fit / hard-to-reverse consequence | Evidence / reconsider when |
| --- | --- | --- | --- |
| 1. Free-form boundary | Accept any small idea, then show one explicit Top-down Arena interpretation, fit/mismatch, alternatives, Something else, revise/reject. Add `originalIdea`, `recommendedInterpretation`, compact `foundationFit`, `tradeoffs`, and `alternatives`. Do not put creator edit history in model output. Alternatives: silently coerce or add starters. | Honest without new engine architecture. Schema fields become durable provenance, so keep them compact. | Current literal foundation + platformer example conflict. Reconsider more foundations only after one proof loop is reliable. |
| 2. Roadmap authority | Initial approved blueprint is immutable provenance; creator-accepted project roadmap is mutable plan authority. Show starter facts vs deltas; dependency-safe edits only. | Avoids rewriting history while enabling control. Two authorities require explicit names/joins. | Current starter duplicates real quests. Reconsider richer editing after bounded add/remove/reorder tests pass. |
| 3. Quest lifecycle | Durable plan states: `planned`, `available`, `blocked`, `deferred`, `completed`. Run phases live in a separate journal. | Prevents a giant quest enum mixing plan and process. The split becomes an API contract. | Current roadmap already has plan states; sample host has transient phases. Reconsider only if recovery needs a durable semantic not expressible in the run journal. |
| 4. Implementation contract | Forge assembles a strict contract from accepted quest revision, verified starter facts, logical file roles, exclusions, criteria, Forge verification profile, and play steps. Forge assigns paths/commands/runtime/Git. | Makes approval meaningful and blocks prompt-supplied authority. Contract versioning is durable. | Sample safety comes from exact context/allowlist; generated quest scope is currently global. Reconsider fields only when a real quest cannot be expressed. |
| 5. File policy | P0 edits existing files only: at most four role-resolved game source/scene files. Codex never edits verifier/state/Git/cache. | Removes the riskiest cleanup class. It constrains proof-game design, intentionally. | Signal Sweep fits existing starter files. Reconsider controlled new files after Build Week with explicit roots/extensions/count ledger. |
| 6. Execution owner | New sibling service; extract tiny SDK/event/diff primitives later. Alternatives: call/generalize sample runner or mutate Project World. | Preserves protected semantics and ownership. Adds one service but avoids a high-risk refactor. | Source audit found Enemy-specific assumptions throughout sample workflow/completion. Reconsider a kernel after two callers stabilize. |
| 7. Verification | Three layers: Git/filesystem boundary, Godot project health, and a Forge-owned mechanic verification profile. Creator separately confirms feel/visible result. | Deterministic proof remains outside model control. Verification profile catalog limits eligible quests. | Existing verifier/sample checks are fixed and trustworthy. Reconsider broader profiles after multiple real mechanics reveal common predicates. |
| 8. Confirmation | `success`, `failure`, `not_ready`, `retry`, `cancel`. Source changes remain pending until success or explicit safe rollback. | Preserves creator authority and avoids automatic completion. Run remains recoverable. | Sample play gate works. Reconsider auto-success only for non-gameplay maintenance, outside this alpha. |
| 9. Completion | One locked transaction writes/validates all tracked state/docs, stages an exact set, commits source+state once, then writes actual SHA to an ignored local receipt. | Avoids a self-referential tracked SHA. Actual SHA is local receipt, not portable state. | Git cannot contain its own final hash. Reconsider an external append-only store post-Build Week. |
| 10. Failure/rollback | Clean-HEAD precondition; capture inventory/preimages/hashes; restore exact run-owned paths only when current hashes match reviewed post-state; refuse concurrent edits. No `git clean`/broad reset. | Safe but may require human recovery instead of guessing. The clean-start rule narrows external editing during a run. | Creation already uses safe cleanup; current generated projects are clean Git repos. Reconsider merge-aware recovery only after external editor concurrency is a product requirement. |
| 11. Idea promotion | Future separate `.forge/quest-proposals/<proposalId>.json`; seed text remains immutable; revisions and rejection live on proposal; roadmap changes only on approval. | Clear owner avoids hidden plan mutation. New lifecycle is too large pre-freeze. | Current idea schema has no lifecycle; Chronicle is event history. Reconsider storage shape when P1 is scheduled. |
| 12. Companion | Keep read-only contextual recommendation before freeze. Future structured intents produce visible proposal cards, never direct mutation. | Avoids conversation/history/context/state surfaces. Static copy must be labelled honestly. | The core code-to-game loop is missing. Reconsider after an external tester completes P0 and asks for explanation/brainstorm support. |
| 13. Godot editor | Optional Task A tail: same-origin `POST` with registered project ID only; Forge resolves canonical path, pinned executable, `--editor --path`, process state, errors. | Small and useful, but not allowed to delay completion. Process state is transient. | [Godot CLI](https://docs.godotengine.org/en/stable/tutorials/editor/command_line_tutorial.html) and existing launch owner. Reconsider inclusion if Windows process tests are not isolated in hours. |
| 14. Export/publish | No P0 export. One-hour post-core readiness probe; otherwise guided checklist + native capture. Never credentials/accounts/public deployment. | Protects three submission days. A preset/template supply chain would become a new owned dependency. | [Godot export](https://docs.godotengine.org/en/stable/tutorials/export/exporting_projects.html) requires presets/templates; none exist. Reconsider if templates are already pinned and one command succeeds. |
| 15. Skills | No product runtime skill before freeze. Use deterministic code/schema/prompt. A later focused development or generated-quest skill may encode repeated procedure, never state. | Avoids adding discovery/version/test behavior during the critical loop. | [Codex skills](https://learn.chatgpt.com/docs/build-skills.md); generated project working directory would not discover Forge-root skills. Reconsider after the workflow repeats and instructions are stable. |
| 16. Context | Deterministic compact package: accepted quest revision, current facts, exact files/contents, scene summary, exclusions, criteria, verifier profile, and instructions. Hard cap 40k UTF-8 characters (~10k tokens), truncation fails preparation rather than silently omitting required files. | Makes cost and behavior bounded. Large files make a quest ineligible until narrowed. | Current starter files are small; best practices favor focused context. Reconsider cap using recorded real usage/latency. |
| 17. Docs sync | JSON is authoritative; Markdown is deterministic and byte-validated; model prose only in explicitly owned proposal fields. | Prevents drift. Renderer version becomes part of artifact contract. | Creation already renders Markdown but lacks update. Reconsider model summaries only for non-authoritative explanation. |
| 18. Showcase evidence | Emit a sanitized run manifest and stable references; manually curate into typed showcase content once after freeze. Showcase never reads or mutates live project state. | Keeps public/privacy and operational boundaries separate. | Task 8 evidence contract already works. Reconsider automation only after submission. |

## Contract and trusted assembly

The model may propose creative wording or bounded steps, but it never supplies authority-bearing values. Forge resolves and fingerprints the final contract:

```ts
type GeneratedQuestImplementationContract = {
  schemaVersion: 1;
  projectId: string;
  questId: string;
  questRevision: number;
  playerVisibleOutcome: string;
  whyItMatters: string;
  currentPlayableFacts: string[];
  steps: Array<{ id: string; outcome: string; fileRoles: EditableFileRole[] }>;
  allowedFiles: Array<{ role: EditableFileRole; relativePath: string; preHash: string }>;
  excludedScope: string[];
  acceptanceCriteria: Array<{ id: string; statement: string; proof: ProofRef }>;
  verificationProfile: "relay_activation_v1" | "gravity_orb_presence_v1";
  creatorPlaytest: string[];
  risksAndAssumptions: string[];
  fingerprint: string;
};
```

Forge adds `runId`, absolute canonical project path, approved HEAD, exact commands, model/runtime configuration, timestamps, and journal state outside the model-visible creative proposal. `allowedFiles` resolves starter roles such as main scene/controller, player controller, and objective controller. The first alpha contract allows one to four existing paths. `.forge/**`, `.git/**`, `.godot/**`, verifier scripts, dependencies, external assets, executables, shell files, absolute paths, symlinks/escapes, deletes, and new files are forbidden.

The blueprint recommendation schema is equally deliberate:

- `originalIdea`: the exact trimmed creator input, preserved as provenance;
- `recommendedInterpretation`: one short supported version of the idea;
- `foundationFit`: `{ level: "strong" | "partial" | "poor", explanation }`;
- `tradeoffs`: one to three plain consequences of the supported interpretation;
- `alternatives`: two or three `{ id, title, interpretation, consequence }` options compatible with the one foundation.

Do **not** add model-authored `creatorAdjustments`. Creator changes are trusted UI operations recorded in the approval envelope as structured revision events with prior/new fingerprint, actor, timestamp, and changed decision/quest ID. This separates model proposal from creator provenance.

## Plan state versus run state

```text
planned ──dependencies met──▶ available ──creator defers──▶ deferred
   ▲                              │
   └────────dependency blocked────┘
                                  │ prepare run
                                  ▼
contract_review → approved → implementing → verifying → waiting_for_playtest
      │               │             │           │               │
      └─cancelled─────┴─failed──────┴─failed─────┴─not_ready─────┘
                                                              │ success
                                                              ▼
                                                      completion_pending
                                                              │ commit+reload
                                                              ▼
                                                         completed
```

Only the first row and `completed` are roadmap/quest plan states. The run phases are durable in the run journal for crash recovery but do not change roadmap availability until the completion transaction succeeds. `verification_failed`, `cancelled`, and creator failure are run outcomes/evidence, not permanent quest labels. A new run may begin from the same available quest after cleanup or explicit retry.

## Focused context assembly

Preparation is deterministic and ordered:

1. Resolve registered project, clean HEAD, manifest, accepted roadmap, selected quest/revision, and starter version.
2. Validate quest eligibility and verification-profile support.
3. Resolve logical roles to exact contained existing files; reject missing/oversized/binary/symlink paths.
4. Load the accepted outcome, why, current playable facts, narrow steps, exclusions, criteria, and creator playtest.
5. Include the exact contents of allowed files plus a compact parsed main-scene/node summary and the verifier profile's required public behavior.
6. Include Forge instructions: no new/delete/rename/dependency/command/state changes; stop on ambiguity; report changed paths and checks.
7. Serialize with section and total byte counts. Cap at 40,000 UTF-8 characters and at most four source files. Do not truncate; make the contract ineligible and ask for a smaller quest.

Do not include full Chronicle, all historical plans, unrelated quests, all `.forge` artifacts, raw prior transcripts, secrets, registry paths, or user credentials. Record the context manifest and hashes, not hidden reasoning.

## Verification ownership

| Layer | Forge proves | Forge does not claim |
| --- | --- | --- |
| Boundary | Start HEAD was clean; exact tracked diff; changed paths are approved; no new/delete/rename; no state/cache/dependency escape; current hashes match review | Gameplay quality or intent |
| Project health | Pinned Godot imports/loads; required starter scripts/nodes remain; baseline verifier passes; process exits with expected marker | New mechanic behavior beyond the baseline |
| Mechanic | A Forge-owned, versioned profile outside Codex's editable paths runs deterministic assertions for the accepted criteria | Fun, clarity, control feel, visual polish |
| Creator | The visible mechanic works in an actual play session and matches the approved outcome | Filesystem safety or technical completeness |

Eligibility is intentionally limited to quests with a registered verification profile. For Signal Sweep, `relay_activation_v1` instantiates the controlled starter scene, exercises the required activation API/signal, and checks initial/activated visual state and count without allowing Codex to edit the verifier. A model-generated “verification idea” may inform planning but never becomes proof by itself.

## Run journal, failure, and rollback

Before SDK start, acquire a project run lock and require:

- registered canonical project and expected direct-child containment;
- no active project run;
- expected baseline commit exists, `HEAD` matches, worktree/index are clean;
- contract fingerprint and quest revision still match;
- complete controlled inventory and hashes captured.

The journal stores the start HEAD, allowed paths/prehashes, observed posthashes, SDK/thread metadata, phase, proof results, confirmation, and recovery instruction. Evidence is sanitized and bounded.

Failure policy:

| Failure | Result |
| --- | --- |
| Invalid contract/context | No SDK call or file write; return to contract review |
| Codex error/interruption | Journal failed/interrupted; review actual diff before offering rollback/retry |
| Unapproved change/new/delete | Boundary fails; no verification/completion; offer exact run-owned rollback |
| Godot/mechanic failure | Keep reviewed source pending for inspect/retry/rollback; no roadmap mutation |
| Creator failure/not ready | Keep pending changes; allow retry, adjust/rebuild, or exact rollback |
| Creator cancel | Stop future work; inspect diff; offer exact rollback; no completion |
| Concurrent external edit | Refuse automatic rollback/completion; show paths and manual recovery |
| Host restart | Reload journal, lock, HEAD/status/hashes; resume only an unambiguous safe phase |

Automatic rollback compares every current run-touched path with its recorded observed posthash. Only matches are restored byte-for-byte from the captured preimage/approved HEAD, using contained exact paths. If any path changed again, rollback stops before writing. It never recursively deletes, runs `git clean`, resets the repository, or touches unrelated projects. P0 has no run-created files.

## Completion transaction and commit SHA

After creator `success`:

1. Acquire the project transaction lock; confirm run phase and contract/quest revision.
2. Confirm HEAD is still the start HEAD and the worktree exactly equals the reviewed allowed diff.
3. Rerun boundary, project-health, and mechanic proof; store immutable result hashes.
4. Build in memory the quest `completed` state, roadmap completion/unlocks, one Chronicle `quest_completed` event, project selection/next recommendation, implementation provenance, and deterministic Markdown.
5. Set journal `completion_preparing`; capture preimages for every tracked state/doc path.
6. Atomically replace the exact JSON/Markdown set and reload/cross-validate it. The Chronicle event and provenance reference `runId`, not a commit SHA.
7. Stage exactly the approved source diff plus expected state/docs; compare the staged-name list to the transaction manifest.
8. Create one commit: `forge: complete <questId> [run:<runId>]`.
9. Write ignored `.forge/local/runs/<runId>/commit.json` with actual SHA, tree, timestamp, and run ID.
10. Reload from a fresh service, confirm the commit exists and its message contains the run ID, validate all artifacts, release the lock, then expose `completed`.

If commit fails, restore only transaction-owned state/doc preimages, unstage the exact manifest, retain the approved source diff, and return to `completion_pending` with Retry commit or Roll back. If commit succeeds but the receipt write fails, restart locates the unique commit by run ID and repairs the ignored receipt; it never makes a second provenance commit. This resolves the self-reference problem without lying in tracked artifacts.

## Documentation and Chronicle policy

- Creation-time blueprint/provenance remains immutable.
- Accepted roadmap and quest JSON own current planning truth.
- Markdown (`PROJECT.md`, vision/roadmap/quest summaries) is rendered deterministically from authoritative JSON in the same completion transaction and byte-compared on reload.
- Chronicle records creator-significant durable milestones: `project_created` now, `quest_completed` in Task A, and future `quest_proposed`/`quest_accepted` only when idea promotion exists. Routine failed/cancelled runs stay in run evidence; rejected future proposals stay on the proposal artifact, avoiding a noisy or misleading Chronicle.
- Model-generated explanatory prose is allowed only in named proposal/blueprint fields with schema limits and creator review. It never rewrites verification, Git, state, or deterministic summaries.

## Future controlled new files

After the proof alpha—not during it—a P1 design may allow at most two new `.gd` or `.tscn` files under starter-declared `scripts/generated/` or `scenes/generated/`, with normalized relative paths, no overwrite, a creation ledger, no links, and the same extension/root/count checks before and after SDK. That policy must first prove safe deletion of only ledger-owned files and project import behavior. Until then, constrain the quest.

## Future idea-seed proposal lifecycle

This is a post-freeze design, included so no future feature silently mutates the accepted roadmap.

| Stage | Authority/status/identity | Provenance, revision, duplicate and cancellation rules | Model and project mutation |
| --- | --- | --- | --- |
| Saved seed | `.forge/idea-seeds.json`; `saved`; existing stable `ideaSeedId` | Exact original text/createdAt remain immutable. A normalized text hash may warn about a duplicate but never silently merges or deletes it. | No model call; writes seed record only |
| Refine request | Transient UI request referencing seed ID | Cancel discards the request; source seed stays unchanged | GPT planning surface, read-only project context; no project/roadmap/code mutation |
| Draft proposal | `.forge/quest-proposals/<proposalId>.json`; `draft`; stable proposal ID | Stores source seed, planner provenance, revision 1, suggested placement/dependencies, and bounded quest fields | GPT result validated as proposal; writes proposal artifact only |
| Proposal review | Same artifact; `in_review` | Each revise appends a compact revision record/fingerprint. Reject → `rejected`; cancel → `cancelled`. Duplicate outcome/placement is shown for creator resolution. | Optional GPT revision call; no roadmap/code mutation |
| Accepted proposal | Proposal → `accepted` with `promotedQuestId`; new quest + roadmap transaction | Creator approval fingerprint, dependency-safe insertion, unique stable quest ID, original seed/proposal retained | Deterministic transaction mutates proposal, quest, roadmap, rendered docs, Chronicle `quest_accepted`; no source code |
| Eligible quest | Quest/roadmap `planned`, then computed `available` or `blocked` | Eligibility depends on completed dependencies, supported file roles, and a verification profile | No planning call; no source mutation until a separate approved implementation run |
| Implementation | Generated run journal/contract | New run ID; failure/cancel does not rewrite seed/proposal history | Codex only after contract approval; bounded source mutation |

Chronicle may record durable `quest_accepted` and later `quest_completed`, not every draft/rejection. Proposal rejection remains on the proposal artifact. The creator can reopen any proposal revision without changing the original idea.
