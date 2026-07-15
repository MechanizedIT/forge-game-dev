# Alpha Capability Matrix

## Scoring

Scores run 1–5. Higher is positive for **CV** creator value, **PN** proof necessity, **DV** demonstration value, and **RU** existing reuse. Higher is worse for **EF** effort, **RR** regression risk, **FG** filesystem/Git risk, **MT** manual-testing burden, **CT** context/token cost, and **DR** deadline risk. Scores compare remaining Build Week work, not long-term value.

| # | Capability | CV | PN | DV | RU | EF | RR | FG | MT | CT | DR | Size / priority |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | Free-form idea intake | 5 | 4 | 5 | 5 | 1 | 2 | 1 | 3 | 3 | 2 | Small / P0 preserve |
| 2 | Supported-foundation recommendation | 5 | 4 | 5 | 3 | 3 | 3 | 1 | 4 | 4 | 3 | Medium / P0 Task B |
| 3 | Recommendation + alternatives | 5 | 3 | 4 | 3 | 2 | 2 | 1 | 3 | 3 | 2 | Small / P0 Task B |
| 4 | Vision revision | 4 | 3 | 4 | 3 | 3 | 3 | 1 | 4 | 4 | 3 | Medium / P0 bounded |
| 5 | Roadmap revision and acceptance | 5 | 4 | 5 | 2 | 4 | 4 | 2 | 5 | 4 | 4 | Large / P0 bounded |
| 6 | Generated quest eligibility | 5 | 5 | 5 | 3 | 3 | 4 | 2 | 4 | 2 | 3 | Medium / P0 |
| 7 | Generated quest adjustment | 5 | 4 | 5 | 2 | 3 | 4 | 2 | 4 | 3 | 4 | Medium / P0 narrow |
| 8 | Generated quest Codex implementation | 5 | 5 | 5 | 4 | 5 | 5 | 5 | 5 | 4 | 5 | Large / P0 Task A |
| 9 | File allowlists | 5 | 5 | 5 | 4 | 3 | 4 | 5 | 4 | 2 | 4 | Medium / P0 |
| 10 | Controlled new-file creation | 4 | 1 | 3 | 1 | 5 | 5 | 5 | 5 | 3 | 5 | Too large / Deferred |
| 11 | Generated-project rollback | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 5 | 2 | 5 | Large / P0 |
| 12 | Generated quest verification | 5 | 5 | 5 | 4 | 4 | 5 | 4 | 5 | 3 | 5 | Large / P0 |
| 13 | Creator playtest + confirmation | 5 | 5 | 5 | 5 | 2 | 3 | 2 | 5 | 1 | 2 | Small / P0 |
| 14 | Completion transaction | 5 | 5 | 5 | 3 | 5 | 5 | 5 | 5 | 2 | 5 | Large / P0 |
| 15 | Chronicle/docs synchronization | 4 | 5 | 5 | 3 | 4 | 5 | 4 | 4 | 2 | 4 | Medium / P0 |
| 16 | Idea seed refinement | 4 | 1 | 3 | 3 | 4 | 3 | 1 | 4 | 5 | 4 | Large / Deferred |
| 17 | Idea promotion into quest | 5 | 1 | 4 | 2 | 5 | 5 | 3 | 5 | 5 | 5 | Too large / Deferred |
| 18 | Minimal Companion conversation | 4 | 1 | 4 | 1 | 5 | 4 | 2 | 5 | 5 | 5 | Too large / Deferred |
| 19 | Godot editor launch | 4 | 2 | 4 | 5 | 1 | 2 | 2 | 3 | 1 | 1 | Small / P1, Task A tail |
| 20 | Local Web export | 4 | 1 | 5 | 1 | 5 | 4 | 4 | 5 | 2 | 5 | Too large / P2 decision |
| 21 | Publishing guidance | 3 | 1 | 3 | 2 | 2 | 1 | 1 | 3 | 1 | 2 | Small / P2 checklist |
| 22 | Proof-game evidence generation | 5 | 4 | 5 | 5 | 2 | 2 | 1 | 4 | 1 | 2 | Small / P2 |
| 23 | External tester support | 5 | 2 | 5 | 3 | 4 | 3 | 2 | 5 | 1 | 4 | Medium / P1/P2 |
| 24 | Final showcase refresh | 4 | 2 | 5 | 5 | 2 | 2 | 1 | 3 | 1 | 2 | Small / P2 after freeze |

## Implementation profiles

Each row covers the requested foundation, gap, dependencies/reuse, contracts/persistence, UX/risk, test burden, and proof value without repeating the architecture document.

| Capability group | Existing foundation → missing work | Dependencies and reusable pieces | Contract/persistence impact | UX, safety, testing, and demonstration |
| --- | --- | --- | --- | --- |
| 1–5 Idea, fit, vision, roadmap | Intake/session/schema/approval exist → honest fit, focused decision revision, starter-delta roadmap, explicit acceptance | Planner SDK/session, starter facts, creation artifacts | Minimal blueprint fit fields; immutable approved blueprint; accepted roadmap revision/fingerprint | No project files yet; model/schema/manual-interpretation risk; strong fresh-journey value; exhaustive planner/creation/reload tests |
| 6–7 Eligibility/adjustment | Roadmap has locked/available and selection → dependency computation, durable plan vs transient run states, bounded outcome/scope adjustment | Roadmap join and Project World selection | Quest revision + accepted contract fingerprint; roadmap only changes after explicit edit | Prevent unavailable builds and global-scope approval; dependency/revision/browser tests; essential control signal |
| 8–9 Implementation/allowlist | Sample SDK/diff gate → generated sibling, role resolution, exact existing files | SDK adapter, registry, progress/evidence patterns | Run journal + approved implementation contract; source only in approved project paths | Highest filesystem risk and proof value; failure injection, real Codex, browser, protected regressions |
| 10 Controlled new files | None in generated source path → roots/extensions/count/creation ledger | Starter manifest could later declare roots | Would add created-file intents and cleanup receipts | Not needed for Signal Sweep; traversal/deletion/import/dependency burden is too high before freeze |
| 11–12 Rollback/verification | Creation rollback and sample checks → run-owned pre/post images, concurrent-edit refusal, boundary/project/mechanic layers | Atomic writes, Git helpers, Godot smoke, verifier pattern | Journal phase, hashes, structured proof artifacts | Must prove failure, not just success; heavy deterministic plus manual testing; essential credibility |
| 13–15 Confirm/complete/docs | Sample play gate and completion → generated transaction, Chronicle/docs/Git/restart consistency | Launch action, confirmation pattern, artifact renderers | Roadmap/quest/Chronicle/project/provenance + local SHA receipt | Creator retains final gameplay authority; commit/restart fault injection; central Build Week narrative |
| 16–17 Ideas/proposals | Atomic seed storage → revisions, proposal artifact, review, dependency placement, promotion | Idea dock, planner call | New proposal owner; seed stays immutable; explicit accepted promotion writes roadmap/quest | Low filesystem risk but high state/model/UX/test burden; does not unblock code-to-game proof |
| 18 Companion | Static contextual copy → intents, retrieval, budget, proposal cards, conversation persistence | Current explanation copy only | Chat cannot own truth; any mutation must create reviewed proposal | High distraction/context burden; defer until deterministic workflow is understandable |
| 19 Editor launch | Pinned executable and registered launch → editor-specific state/error | Registry, pinned Godot, host process wrapper | No project artifact mutation | Project-ID-only, no caller args; small Windows/process/manual test; useful P1 action |
| 20–21 Export/publish | No preset/template/package → readiness probe/checklist or controlled preset/export | Pinned Godot only; showcase can link later | Export manifest only if built; credentials never stored | Template/browser/hosting burden; native capture is reliable; guided checklist is honest P2 |
| 22–24 Evidence/test/showcase | Task 7/8 harness and typed content → proof-game manifest, consented feedback, one refresh | Evidence schemas, Playwright, showcase content | Derived evidence/public copy only; never operational state | Low mutation risk, high submission value; must occur after freeze and pass privacy/truth checks |

## Capability-by-capability feasibility notes

The score columns above carry manual burden and demonstration value. This table makes each capability's foundation, missing work, dependencies/reuse, contract/persistence, UX/safety risk, and test burden explicit.

| # / capability | Foundation and reusable pieces | Missing work, dependencies, contracts/persistence | UX, risk, tests, and proof value |
| --- | --- | --- | --- |
| 1 Free-form intake | Existing bounded input/session/schema | Preserve; depends on planner host only; no new persistence | Low filesystem risk; regression/live-model cases; already strong demo entry |
| 2 Foundation recommendation | Fixed foundation + starter manifest | Fit/interpretation fields and starter capability input; blueprint provenance | Prevent silent coercion; model/schema/manual poor-fit tests; high proof honesty |
| 3 Alternatives | Planner/UI choice patterns | Compact alternatives + Something else; session revision only | Choice-quality/decision-load testing; no filesystem risk; visible creator control |
| 4 Vision revision | Whole-blueprint revise exists | Decision-level revision/fingerprint invalidation; immutable accepted provenance | Model variance and stale approval tests; high fresh-journey value |
| 5 Roadmap review | 3–5 quest schema/dependencies | Starter-delta validation, bounded graph edits, accepted roadmap revision | Highest Task B UX/state burden; dependency/reload/creation tests; essential fresh proof |
| 6 Eligibility | Current locked/available join | Plan-state adapter + dependency/profile/file-role eligibility | False-enabled build is severe; graph/profile/restart tests; critical next-action proof |
| 7 Quest adjustment | Existing quest brief/selection | Narrow outcome/scope revision and contract invalidation | Must not expand files/profile; schema/browser/approval tests; meaningful control |
| 8 Generated implementation | Sample SDK/progress/diff concepts | Sibling service, focused context, journal/lock, generated contract | Highest agent/filesystem risk; live SDK + fault/browser/protected tests; central demo |
| 9 Allowlists | Sample exact paths + starter inventory | Logical role resolver, contained existing-file hashes | Traversal/link/new/delete/rename tests; approval becomes credible |
| 10 New files | No safe generated creation ledger | Declared roots/extensions/count/prevent overwrite/cleanup; depends on stable P0 | High import/rollback risk and manual burden; unnecessary for proof, deferred |
| 11 Rollback | Creation cleanup + clean generated Git | Run pre/post hashes/preimages, exact restore, concurrent-edit refusal | Destructive-error risk; heavy fault injection/manual recovery; trust requirement |
| 12 Verification | Baseline verifier + sample mechanic check | Three layers + profile registry outside editable paths | False proof is severe; malicious/self-verifier/Godot/real-mechanic tests; core evidence |
| 13 Play/confirmation | Existing pinned launch and sample gate | Generated run outcomes and persistent journal | Manual by definition; all outcome/reload tests; strongest creator-control moment |
| 14 Completion | Sample completion + atomic JSON/Git helpers | Multi-artifact transaction, exact stage/commit, SHA receipt, recovery | Highest consistency/Git risk; every failure point + fresh reload; core proof |
| 15 Chronicle/docs sync | Creation JSON/Markdown/Chronicle | `quest_completed`, renderer update/byte validation/provenance | Drift/privacy risk; golden/cross-artifact/restart tests; clear persistence evidence |
| 16 Seed refinement | Atomic idea seeds | New proposal call/revisions/duplicates; proposal owner | Model/context/manual review burden; no code value before core, deferred |
| 17 Seed promotion | Roadmap/quest creation patterns | Explicit acceptance transaction/dependencies/IDs | Silent mutation risk and broad state tests; useful later, too large now |
| 18 Companion | Static contextual recommendation | Intents/retrieval/budget/history/proposal cards | Overclaim/context/privacy/state risk; extensive conversation/browser tests; distracts from proof |
| 19 Editor launch | Registry + pinned executable + process wrappers | Empty-body project-ID action and transient process state | Caller-arg/process risks; Windows/manual multi-project tests; small P1 convenience |
| 20 Web export | Pinned Godot only | Preset/templates/fixed output/manifest/browser serve; depends on green game | Supply-chain/hosting/manual matrix burden; flashy but deadline-hostile |
| 21 Publishing guidance | Existing submission docs | Deterministic readiness/checklist and owner decision points | Low technical risk; privacy/link review; useful P2 handoff, no auto-publish |
| 22 Proof evidence | Task 7 reports/harness/evidence schema | Generated run manifest + gameplay provenance | Redaction/consent risk; truth/privacy checks; very high submission value |
| 23 External support | Judge guide/recovery patterns | Diagnostics, tester script, owner-independent recovery | Setup variance/manual burden; observed tests; practical-alpha gate, not P0 code loop |
| 24 Showcase refresh | Typed isolated Task 8 site | One curated post-freeze content/evidence update | Public truth/privacy/link regression; showcase check/visual review; high judge value |

## Classification

- **P0:** preserve free-form input; foundation recommendation/alternatives; bounded vision/roadmap acceptance; quest eligibility/adjustment; generated Codex implementation; existing-file allowlist; rollback; three-layer verification; creator confirmation; completion; Chronicle/docs/Git/restart.
- **P1:** editor launch if isolated, external-test diagnostics/recovery, and only rehearsal-proven UX fixes. A future controlled-new-file prototype is P1 after Build Week, not before freeze.
- **P2:** evidence generation, guided export readiness/publishing checklist, native capture, external feedback synthesis, final showcase refresh, packaging.
- **Deferred:** controlled new files before the proof passes, seed refinement/promotion, Companion conversation, real Web export unless the one-hour readiness gate is unexpectedly green, more foundations, general publishing.
