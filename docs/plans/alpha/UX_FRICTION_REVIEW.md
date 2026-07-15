# UX Friction Review

This review uses Task 7/8 screenshots and reports, current React copy, strict contracts, and real generated artifacts. A passing responsive harness is evidence that a screen renders; it is not evidence that a creator understands it.

## Priority findings

| Severity | Screen/state and evidence | Likely creator interpretation | Consequence | Correction | Critical path / owner |
| --- | --- | --- | --- | --- | --- |
| Proof-game blocker | Intake: `NewGameFlow.tsx` examples vs literal foundation schema/prompt | “Forge supports my platformer idea.” | Silent conversion makes the resulting game feel generic or dishonest | After input, show one recommended Top-down Arena interpretation, fit/mismatch, 2–3 alternatives, Something else, and revise/reject | Task B / blueprint planner |
| Proof-game blocker | Real Last-Moment Pulse and Gravity Tap roadmaps vs starter manifest/verifier | “Forge wants me to build movement that already works.” | First eligible quest may produce no meaningful change | Feed verified starter facts into planning; require quests to describe deltas; reconcile accepted roadmap before creation | Task B / planner + creation artifacts |
| Proof-game blocker | Generated quest footer: implementation not enabled | “The main promise stops where coding should start.” | No generated proof game | Add bounded Build/adjust/defer, contract review, progress, proof, play, confirm, complete | Task A / generated-quest runner + dashboard |
| Proof-game blocker | Quest artifacts copy blueprint-global included/excluded scope | “This small quest can change most of the game.” | Approval is not meaningful; unsafe model context | Give each quest a narrow player outcome, local scope, role-resolved files, exclusions, criteria, proof, and play steps | Task A contract; Task B generation |
| Major confusion | Project World hard-codes four quests and “Task 6” | “This project has exactly four quests because Forge says so.” | 3/5-quest plans and future versions display stale truth | Render counts/capability language from validated state; remove internal task numbers | Task A UI cleanup |
| Major confusion | Quest cards expose Q IDs and dependency slugs | “I need to understand implementation identifiers.” | Technical structure dominates the game outcome | Lead with visible outcome and plain dependency reason; put IDs behind technical details | Task A UI |
| Major confusion | Planner-supplied “verification ideas” | “Forge has proven this automatically.” | Blurs model suggestion, Godot check, and human feel | Label Boundary check, Project check, Mechanic check, and Your playtest as separate layers | Task A verification UI |
| Major confusion | Blueprint review has one whole-plan Revise path | “I must restart to fix one quest.” | Low creator control and high model variance | Allow bounded decision edits and roadmap accept/reject; preserve immutable original blueprint provenance | Task B |
| Major confusion | Static Companion prose resembles an assistant | “I can ask it to change the game.” | Capability overclaim and dead-end expectations | Label it “Forge recommendation”; keep read-only before freeze | Task A copy; chat deferred |
| Moderate friction | Approve blueprint → Ready → Create → exact confirmation | “Why did approval not start creation?” | Three decisions feel like repeated consent | Keep two distinct approvals—creative plan, filesystem creation—but collapse the intermediate ready state into the creation review | Task B if capacity remains |
| Moderate friction | Only Launch Godot and Open Folder | “I can play or browse files, but not edit the project.” | Owner workflow feels incomplete | Add Open in Godot as a project-ID-only action if isolated after Task A core passes | Task A tail / Godot owner |
| Moderate friction | Plan/current/future labels are accurate but verbose | “I am reading a status report, not making a game.” | Progress feels document-heavy | Use outcome-first headings, one recommendation, one next action, technical disclosure on demand | Both tasks / dashboard |
| Cosmetic | Repeated badges and long explanatory paragraphs | “Everything is equally important.” | Visual hierarchy weakens | Keep one state badge, one proof summary, and compact detail disclosure | Post-core UX correction |

## Creator decision pattern

Every meaningful choice should use the same small grammar:

1. One recommended choice.
2. One sentence explaining why it fits the creator's idea and the supported foundation.
3. Two or three genuinely different alternatives when useful.
4. Something else.
5. Revise/back.
6. Plain consequences: what changes now, what stays planned, and whether code/files will be touched.

Do not apply this pattern to trivial confirmations. File creation and Codex implementation still require explicit, exact approvals because they cross mutation boundaries.

## State-language rules

- **Planning:** “Forge is proposing; no project code changes.”
- **Contract review:** “These exact files may change; everything else is blocked.”
- **Implementing:** translate SDK events into the current bounded step; never show raw terminal output as primary UI.
- **Verifying:** name the boundary, project-health, and mechanic checks individually.
- **Waiting for you:** explain exactly how to play and what success should feel/look like.
- **Completed:** show the visible outcome, changed files, verification, Chronicle entry, Git commit, and next eligible quest.
- **Failed/cancelled:** say whether source changes remain, whether automatic rollback is safe, and the next reversible action.

## Corrections explicitly outside the freeze path

General chat, free-form project mutation from Companion, idea-seed promotion, broad publishing, more foundations, and arbitrary new files would add more options before the existing choices produce a completed game. They are deferred even though each could improve the eventual product.
