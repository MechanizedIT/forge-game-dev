# Forge Repository Guide

This is the shortest stable map from a maintenance task to its owner. It is not a status report or file inventory. Runtime schemas, persisted artifacts, source code, and Git remain authoritative; this guide only routes readers to them.

## How to use this guide

1. Find the subsystem or state concern below. For a visible symptom, use the [change map](CHANGE_MAP.md).
2. Open its entry point, contracts, and protecting tests. If the directory has a local `AGENTS.md`, follow it.
3. Confirm relationships with `rg` before editing. A consumer displaying data does not thereby own that data.
4. Use [PROJECT_STATUS.md](../PROJECT_STATUS.md) only for the current milestone, [ROADMAP.md](../ROADMAP.md) for sequence/scope, and [PLAN.md](../PLAN.md) for the approved v0.2 product contract.
5. Open a dated plan, handoff, review, closeout, or evidence file only when the selected subsystem's decision provenance is relevant.

Generated repository maps, packed files, screenshots, and rehearsal reports are derived evidence. Never edit them as a substitute for changing an authoritative contract, state owner, or source entry point.

## Documentation entry points

| Need | Start |
| --- | --- |
| Product promise and judge commands | [README](../README.md) |
| Final v0.2 judge walkthrough and recovery | [Judge guide](JUDGE_GUIDE.md) |
| Video rehearsal and submission gates | [Video shot list](VIDEO_SHOT_LIST.md) and [submission checklist](SUBMISSION_CHECKLIST.md) |
| Current milestone truth | [Project status](../PROJECT_STATUS.md) |
| Required/deferred sequence | [Roadmap](../ROADMAP.md) |
| Approved v0.2 journeys and boundaries | [Plan](../PLAN.md) |
| Proposed post-v0.2 alpha proof-game scope | [Alpha proof-game plan](plans/alpha/README.md) |
| Original architecture decisions | [Build plan](BUILD_PLAN.md) |
| Sample CLI and evidence behavior | [Quest CLI guide](QUEST_CLI.md) |
| Godot fixture/bootstrap operation | [Godot fixture guide](GODOT_FIXTURE.md) |
| Task-oriented code navigation | [Change map](CHANGE_MAP.md) |
| AI collaboration provenance | [AI work log](AI_WORK_LOG.md) |

## Subsystem guide

<!-- forge-subsystem:dashboard-host-api -->
### dashboard-host-api — Dashboard host and API

- **Purpose:** Compose the local Forge process, serve built React entries, expose same-origin HTTP/SSE boundaries, and adapt the protected sample service to the browser.
- **Owns:** Route parsing, exact request-body gates, same-origin mutation checks, static serving, service composition, and the sample dashboard's transient run/launch/confirmation orchestration.
- **Does not own:** Blueprint validity, project creation transactions, registry meaning, generated-world artifacts, or UI presentation semantics.
- **Start:** [host CLI](../src/dashboard-host/cli.ts), [HTTP server](../src/dashboard-host/server.ts), [sample dashboard service](../src/dashboard-host/service.ts), and [browser API client](../src/dashboard/api.ts).
- **Contracts and artifacts:** [dashboard transport types](../src/dashboard/shared.ts); delegates durable sample artifacts to the sample workflow and other state to injected domain services.
- **Consumers:** Default/legacy React dashboard, v0.2 Launchpad, automation/rehearsal clients, and the CLI launch commands in [package.json](../package.json).
- **Tests:** [dashboard host tests](../tests/dashboard-host.test.ts), [legacy compatibility tests](../tests/legacy-sample.test.ts), and [v0.2 routing tests](../tests/dashboard-v2.test.ts).
- **Decisions:** [Task 3 closeout](closeouts/2026-07-14-v0.2-task-3-sample-integration-closeout.md) and [Task 1 baseline-protection closeout](closeouts/2026-07-13-v0.2-task-1-baseline-protection-closeout.md).
- **Protect:** Domain services below, sample completion semantics, and the independently launchable default/legacy entries. Do not make the host a second durable state owner.

<!-- forge-subsystem:sample-workflow -->
### sample-workflow — v0.1 and prepared sample workflow

- **Purpose:** Preserve the verified Enemy Targeting golden path from immutable fixture through approval, Codex execution, automated review, play, creator confirmation, completion, reload, and reset.
- **Owns:** Prepared quest/plan loading, demo workspace lifecycle, bounded run context, approved verification, run artifacts, final completion, and roadmap completion mutation.
- **Does not own:** Generated projects, GPT blueprint planning, v0.2 layout, or registry state.
- **Start:** [prepared quest loader](../src/quests/prepared-enemy-targeting.ts), [demo workspace](../src/demo/workspace.ts), [runner workflow](../src/quest-runner/workflow.ts), and [completion gate](../src/quest-runner/completion.ts).
- **Contracts and artifacts:** The immutable [baseline fixture](../fixtures/godot/baseline), especially `.forge/quests/enemy-targeting.json`, `.forge/plans/enemy-targeting.json`, and `.forge/roadmap.json`; per-user sample state under `%LOCALAPPDATA%/Forge/demo-workspace/.forge/runs/<run-id>/` and `.forge/state/enemy-targeting.json`.
- **Consumers:** CLI runner, dashboard host/service, v0.2 sample presentation adapter, Proof, and Chronicle presentation.
- **Tests:** [prepared quest tests](../tests/prepared-quest.test.ts), [workspace tests](../tests/workspace.test.ts), [runner tests](../tests/quest-runner.test.ts), [completion tests](../tests/quest-completion.test.ts), and [protected compatibility tests](../tests/legacy-sample.test.ts).
- **Decisions:** [Enemy Targeting CLI closeout](closeouts/2026-07-13-enemy-targeting-cli-closeout.md), [completion closeout](closeouts/2026-07-13-quest-completion-gate-closeout.md), and [Task 3 closeout](closeouts/2026-07-14-v0.2-task-3-sample-integration-closeout.md).
- **Protect:** Immutable fixture intent, exact approval/play phrases, allowed three-file scope, offline fake-SDK tests, and reset isolation from generated projects.

<!-- forge-subsystem:launchpad-project-world -->
### launchpad-project-world — v0.2 Launchpad and sample Project World

- **Purpose:** Present the two v0.2 journeys and recompose the real sample workflow as an understandable workshop without becoming a workflow owner.
- **Owns:** React view state, visual hierarchy, responsive layout, Launchpad navigation, sample snapshot-to-presentation adaptation, and calls to backend APIs.
- **Does not own:** Sample run/completion state, blueprint truth, creation transactions, generated project artifacts, or registry persistence.
- **Start:** [v0.2 app](../src/dashboard-v2/App.tsx), [sample presentation adapter](../src/dashboard-v2/sample-workflow.ts), [new-game flow](../src/dashboard-v2/NewGameFlow.tsx), and [styles](../src/dashboard-v2/styles.css).
- **Contracts and artifacts:** Consumes [dashboard snapshot types](../src/dashboard/shared.ts), [planning transport types](../src/blueprint-planner/shared.ts), [creation transport types](../src/project-creation/shared.ts), and [generated-world transport types](../src/generated-project-world/shared.ts); it persists no independent roadmap.
- **Consumers:** Browser users and visual-review harnesses.
- **Tests:** [v0.2 tests](../tests/dashboard-v2.test.ts), [dashboard host tests](../tests/dashboard-host.test.ts), and the focused visual-review entry points under [visual review](../src/visual-review).
- **Decisions:** [Task 2.1 visual hierarchy closeout](closeouts/2026-07-13-v0.2-task-2-1-visual-hierarchy-closeout.md) and [Task 3 closeout](closeouts/2026-07-14-v0.2-task-3-sample-integration-closeout.md).
- **Protect:** Default/legacy sample behavior, truthful state labels, progressive disclosure, and the rule that presentation never advances authoritative state by itself.

<!-- forge-subsystem:blueprint-planning -->
### blueprint-planning — GPT blueprint planning

- **Purpose:** Turn one bounded game idea into either one clarification screen or a strict, reviewable Top-down Arena blueprint.
- **Owns:** Session-scoped planning state, prompt/repair construction, official SDK configuration, one-repair limit, cancellation, approval envelope, provenance, and blueprint fingerprinting.
- **Does not own:** Output directories, source files, shell commands, starter selection beyond the fixed contract, Godot execution, project persistence, or quest implementation.
- **Start:** [planning service](../src/blueprint-planner/service.ts), [prompt boundary](../src/blueprint-planner/prompt.ts), [SDK adapter](../src/blueprint-planner/sdk.ts), and [blueprint schema](../src/contracts/game-blueprint.ts).
- **Contracts and artifacts:** `GameBlueprint` and planning-result schemas in [game blueprint contracts](../src/contracts/game-blueprint.ts); planning state is in memory until project creation writes approved blueprint/provenance into a generated project.
- **Consumers:** Host planning routes, new-game UI, project-creation approval envelope, and the planning rehearsal.
- **Tests:** [blueprint planning tests](../tests/blueprint-planning.test.ts), [contract tests](../tests/contracts.test.ts), and [v0.2 integration tests](../tests/dashboard-v2.test.ts).
- **Decisions:** [Task 4A closeout](closeouts/2026-07-14-v0.2-task-4a-blueprint-planning-closeout.md) and [Task 4A review](reviews/2026-07-14-v0.2-task-4a-blueprint-planning-review.md).
- **Protect:** Fixed Godot 4/2D/GDScript/Top-down Arena scope, maximum three questions, no second clarification loop, no silent model fallback, and no writes on approval.

<!-- forge-subsystem:project-creation -->
### project-creation — Project creation and starter fixture

- **Purpose:** Deterministically turn a current approved blueprint into one verified, clean, registered local Godot project.
- **Owns:** Exact creation confirmation, safe root allocation, controlled starter assembly, artifact writes/reloads, fixed Godot verification, local Git baseline, staging/promotion, failure evidence, cleanup, and registry-last transaction ordering.
- **Does not own:** Blueprint generation, sample reset, generated-world rendering, or generated-quest implementation.
- **Start:** [creation service](../src/project-creation/service.ts), [filesystem safety](../src/project-creation/filesystem.ts), [artifact writer](../src/project-creation/artifacts.ts), [starter assembler](../src/project-creation/starter.ts), and the [Top-down Arena fixture](../fixtures/godot/top-down-arena).
- **Contracts and artifacts:** [generated-project schemas](../src/contracts/generated-project.ts); controlled starter manifest; generated project tree at `%LOCALAPPDATA%/Forge/projects/<project-id>/`; failed-creation evidence at `%LOCALAPPDATA%/Forge/evidence/creation-failures/`.
- **Consumers:** Host creation routes, new-game UI, project registry, generated Project World, and creation rehearsal.
- **Tests:** [project creation tests](../tests/project-creation.test.ts), [contract tests](../tests/contracts.test.ts), and [Godot bootstrap tests](../tests/godot-bootstrap.test.ts).
- **Decisions:** [Task 5 closeout](closeouts/2026-07-14-v0.2-task-5-project-creation-closeout.md) and [Task 5 review](reviews/2026-07-14-v0.2-task-5-project-creation-review.md).
- **Protect:** Canonical direct-child containment, no caller-selected destination, no arbitrary model files/commands, register last, no remotes, and cleanup only of verified transaction-owned directories.

<!-- forge-subsystem:godot-verification -->
### godot-verification — Godot bootstrap, launch, and verification

- **Purpose:** Provide one pinned, checksummed Godot runtime and deterministic verification/launch boundaries for the sample fixture and controlled starter.
- **Owns:** Pinned version/URL/hash, explicit download consent, verified cache, safe extraction, executable selection, process invocation helpers, and sample fixture verification/launch.
- **Does not own:** Quest criteria, project registration, generated-world claims, or creator confirmation.
- **Start:** [pinned build](../src/godot/pinned-build.ts), [bootstrap](../src/godot/bootstrap.ts), [fixture runner](../src/godot/run-fixture.ts), and [creation verifier](../src/project-creation/godot-verifier.ts).
- **Contracts and artifacts:** Verified runtime cache under `%LOCALAPPDATA%/Forge/tools/`; exact sample success tokens in [fixture runner](../src/godot/run-fixture.ts); starter verification arguments/marker in [creation verifier](../src/project-creation/godot-verifier.ts) and [starter manifest](../fixtures/godot/top-down-arena/starter-manifest.json).
- **Consumers:** Demo preparation/play, quest completion launch, project creation, generated-world launch, and rehearsals.
- **Tests:** [Godot executable tests](../tests/godot-executable.test.ts), [bootstrap/extraction tests](../tests/godot-bootstrap.test.ts), [project creation tests](../tests/project-creation.test.ts), and [completion tests](../tests/quest-completion.test.ts).
- **Decisions:** [pinned Godot closeout](closeouts/2026-07-13-pinned-godot-bootstrap-closeout.md), [fixture closeout](closeouts/2026-07-13-godot-fixture-foundation-closeout.md), and [Task 5 closeout](closeouts/2026-07-14-v0.2-task-5-project-creation-closeout.md).
- **Protect:** Explicit download consent, checksum-before-install, containment-safe extraction, exact verifier arguments/markers, and separation between automated proof and creator-observed play.

<!-- forge-subsystem:project-registry -->
### project-registry — Project registry

- **Purpose:** Persist the mapping from stable generated project IDs to canonical local locations and recent-project metadata across restarts.
- **Owns:** `%LOCALAPPDATA%/Forge/project-registry.json`, duplicate-ID rejection, malformed-registry preservation, canonical registered-path resolution, availability summaries, and explicit open recency.
- **Does not own:** Project-local identity/content, roadmap, Chronicle, idea seeds, sample workspace, or project regeneration.
- **Start:** [registry store](../src/project-creation/registry.ts), [registry schemas](../src/contracts/generated-project.ts), and creation's register-last call in [creation service](../src/project-creation/service.ts).
- **Contracts and artifacts:** `ProjectRegistry`/`ProjectRegistryEntry` in [generated-project contracts](../src/contracts/generated-project.ts); the global `project-registry.json` stores canonical path plus discovery metadata only.
- **Consumers:** Launchpad recent projects, project creation, and generated Project World resolution/open.
- **Tests:** [registry and restart cases](../tests/project-creation.test.ts) and [generated-world registry cases](../tests/generated-project-world.test.ts).
- **Decisions:** [Task 5 closeout](closeouts/2026-07-14-v0.2-task-5-project-creation-closeout.md) and [Task 6 closeout](closeouts/2026-07-14-v0.2-task-6-generated-project-world-closeout.md).
- **Protect:** Missing projects remain represented; malformed data is backed up rather than deleting projects; path resolution must remain canonical and contained; read-only world load must not update recency.

<!-- forge-subsystem:generated-project-world -->
### generated-project-world — Generated Project World

- **Purpose:** Reopen a registered generated project by joining its strict project-local artifacts into a truthful, restart-safe Project World.
- **Owns:** Validated cross-artifact join, read-only snapshot, in-memory stale-selection repair, explicit selection persistence, atomic idea seeds plus derived activity, and bounded launch/folder actions.
- **Does not own:** Registry identity/location, project creation, authoritative roadmap/Chronicle mutation, starter verification truth, or generated-quest implementation.
- **Start:** [world service](../src/generated-project-world/service.ts), [transport types](../src/generated-project-world/shared.ts), [world UI](../src/dashboard-v2/GeneratedProjectWorld.tsx), and [generated-project contracts](../src/contracts/generated-project.ts).
- **Contracts and artifacts:** Project-local `.forge/project-manifest.json` points to identity/vision/first-playable/roadmap/quests/state/Chronicle/provenance/verification artifacts; `.forge/idea-seeds.json` alone owns saved ideas and their derived activity notes.
- **Consumers:** Host generated-project routes, v0.2 Launchpad/World, project-world rehearsal, and visual review.
- **Tests:** [generated Project World tests](../tests/generated-project-world.test.ts), [project creation tests](../tests/project-creation.test.ts), and [v0.2 tests](../tests/dashboard-v2.test.ts).
- **Decisions:** [Task 6 closeout](closeouts/2026-07-14-v0.2-task-6-generated-project-world-closeout.md) and [Task 6 review](reviews/2026-07-14-v0.2-task-6-generated-project-world-review.md).
- **Protect:** GET remains byte-for-byte read-only; Chronicle/roadmap remain unchanged by idea saves; generated quests remain `not_enabled`; starter visuals remain labelled preview rather than captured gameplay.

<!-- forge-subsystem:public-showcase -->
### public-showcase — Static public showcase and guided replay

- **Purpose:** Explain the verified Forge v0.2 release through a no-install public page and two deterministic guided walkthroughs.
- **Owns:** Static page composition, typed public content, public link configuration, copied/optimized evidence metadata, generated decorative assets, showcase validation, static build, and showcase Edge review.
- **Does not own:** Operational Forge workflow state, Codex/GPT execution, Godot/Git processes, project files, runtime persistence, Task 7 evidence truth, or external deployment.
- **Start:** [showcase README](../showcase/README.md), [typed release content](../showcase/src/content/release.ts), [walkthroughs](../showcase/src/content/walkthroughs.ts), [evidence manifest](../showcase/src/content/evidence.ts), and [page entry](../showcase/src/main.ts).
- **Contracts and artifacts:** Typed content under `showcase/src/content/`, static assets under `showcase/public/`, production output under ignored `showcase/dist/`, and Task 8 browser reports under [evidence](evidence/2026-07-14-v0.2-task-8-showcase-review).
- **Consumers:** Build Week judges, prospective local users, social links, deployment owner, and submission documentation.
- **Tests:** [showcase content tests](../showcase/tests/content.test.ts), [showcase validator](../showcase/scripts/validate.ts), and [showcase Edge review](../showcase/scripts/review.ts).
- **Decisions:** [Task 8 plan](plans/2026-07-14-v0.2-task-8-public-showcase.md) and [static showcase ADR](../showcase/docs/ADR_STATIC_SHOWCASE.md).
- **Protect:** Never present fixture replay as live AI, never classify illustration as proof, never publish private IDs or local paths, never import operational services, and never render an absent optional URL as an active link.

<!-- forge-subsystem:visual-review-evidence -->
### visual-review-evidence — Visual review and evidence

- **Purpose:** Exercise browser-visible states at defined viewports and preserve reproducible evidence without turning screenshots into product truth.
- **Owns:** Pinned Playwright/Edge harnesses, scenario setup, console/network/layout/action/focus/reduced-motion assertions, reports, and screenshots.
- **Does not own:** Runtime workflow state, verification verdicts, roadmap completion, or product status.
- **Start:** [visual-review harnesses](../src/visual-review), the relevant script in [package.json](../package.json), and the matching evidence README under [evidence](evidence).
- **Contracts and artifacts:** Dated reports/screenshots under [evidence](evidence); these are derived review records and may be regenerated only by the matching bounded scenario.
- **Consumers:** Task reviews/closeouts, judge-facing documentation, and maintainers investigating responsive/browser regressions.
- **Tests:** Functional owners' tests plus [v0.2 tests](../tests/dashboard-v2.test.ts); harness assertions are executed through the relevant `visual:review:*` package script.
- **Decisions:** [Task 3 browser fallback closeout](closeouts/2026-07-14-v0.2-task-3-sample-integration-closeout.md), [Task 5 review](reviews/2026-07-14-v0.2-task-5-project-creation-review.md), and [Task 6 review](reviews/2026-07-14-v0.2-task-6-generated-project-world-review.md).
- **Protect:** Do not present fixture evidence as live evidence, do not hand-edit reports to claim a pass, and do not infer runtime ownership from screenshot output.

<!-- forge-subsystem:documentation-status -->
### documentation-status — Documentation and status workflow

- **Purpose:** Keep operational truth, scope, provenance, and bounded task evidence discoverable without rewriting history or duplicating current status.
- **Owns:** Current milestone summary, roadmap sequencing, approved plan, AI work log, and dated plan/handoff/review/closeout records.
- **Does not own:** Runtime state, source changes, test results not backed by command output, or generated repository indexes.
- **Start:** [project status](../PROJECT_STATUS.md), [roadmap](../ROADMAP.md), [plan](../PLAN.md), [AI work log](AI_WORK_LOG.md), and the root [AGENTS](../AGENTS.md).
- **Contracts and artifacts:** Git is the authoritative change record; [baseline disclosure](../BUILD_WEEK_BASELINE.md) owns prior-work provenance; dated artifacts under [plans](plans), [handoffs](handoffs), [reviews](reviews), [closeouts](closeouts), and [evidence](evidence) are immutable historical records once closed.
- **Consumers:** Future Codex sessions, maintainers, judges, milestone closeout, and submission packaging.
- **Tests:** [context validator](../scripts/validate-repository-context.mjs) checks this navigation layer; existing product tests remain owned by their subsystems.
- **Decisions:** Root [AGENTS](../AGENTS.md), [build plan](BUILD_PLAN.md), and the latest relevant closeout—not simply the newest file in the repository.
- **Protect:** Do not duplicate `PROJECT_STATUS.md`, rewrite historical evidence, claim unrun verification, or make every session load the full documentation tree.

## Authoritative state matrix

| Concern | Authoritative owner | Persisted artifact | Derived consumers | Mutation boundary | Protecting tests |
| --- | --- | --- | --- | --- | --- |
| Prepared sample intent and scope | Quest/plan/roadmap schemas plus immutable baseline fixture | Sample fixture `.forge/quests`, `.forge/plans`, `.forge/roadmap.json` | CLI, host, v0.2 sample UI | Fixture changes are explicit product changes; runtime does not rewrite quest/plan | [prepared quest](../tests/prepared-quest.test.ts), [contracts](../tests/contracts.test.ts) |
| Sample source changes and run proof | Quest runner; Git for source diff | Demo workspace Git plus `.forge/runs/<run-id>/` | Proof UI, review, closeout | Approved runner writes only scoped files and run evidence | [runner](../tests/quest-runner.test.ts), [host](../tests/dashboard-host.test.ts) |
| Sample completion | Completion gate and roadmap contract | `.forge/state/enemy-targeting.json`, final run review/completion, `.forge/roadmap.json` | World, Chronicle, restart | Only successful review plus exact creator confirmation | [completion](../tests/quest-completion.test.ts), [host](../tests/dashboard-host.test.ts) |
| Blueprint content | `GameBlueprint` schema and planning service | In memory until creation; then approved blueprint/provenance in project | Blueprint Review, creation | Planner may approve an envelope but cannot write project files | [planning](../tests/blueprint-planning.test.ts), [contracts](../tests/contracts.test.ts) |
| Generated project identity/content | Project-local manifest and referenced strict artifacts | Generated project `.forge/` tree and `PROJECT.md` | World, docs, Chronicle, creation summary | Creation transaction writes before promotion; later mutations are individually bounded | [creation](../tests/project-creation.test.ts), [world](../tests/generated-project-world.test.ts) |
| Project discovery/location | Project registry store | `%LOCALAPPDATA%/Forge/project-registry.json` | Launchpad, generated-world resolver | Creation registers last; explicit open alone updates recency | [creation](../tests/project-creation.test.ts), [world](../tests/generated-project-world.test.ts) |
| Generated selection | Generated-world service and state schema | `.forge/project-state.json` | Generated World UI | Explicit same-origin state save only; stale repair is in memory | [world](../tests/generated-project-world.test.ts) |
| Generated Chronicle | Project creation's Chronicle artifact | `.forge/chronicle.json` | Chronicle view | Current v0.2 has no post-creation Chronicle mutation | [creation](../tests/project-creation.test.ts), [world](../tests/generated-project-world.test.ts) |
| Saved idea and derived activity | Idea-seeds artifact | `.forge/idea-seeds.json` | Idea dock and merged activity view | Atomic idea save; never rewrites roadmap/Chronicle | [world](../tests/generated-project-world.test.ts) |
| Godot installation and automated result | Pinned build plus owning verifier | Verified tool cache; project-local verification result for generated projects | Creation, launch, Proof labels | Fixed version/hash/args/markers; creator observation remains separate | [bootstrap](../tests/godot-bootstrap.test.ts), [creation](../tests/project-creation.test.ts) |
| Current milestone truth | Project status, reconciled at closeout | [PROJECT_STATUS.md](../PROJECT_STATUS.md) | README/roadmap/task prompts | Milestone closeout only; historical evidence is not rewritten | [context validator](../scripts/validate-repository-context.mjs) |

## Nested instruction evaluation

Local `AGENTS.md` files exist only where crossing the boundary can damage durable state or the protected judge path:

- [dashboard host](../src/dashboard-host/AGENTS.md): keeps HTTP composition from absorbing domain ownership.
- [quest runner](../src/quest-runner/AGENTS.md): protects approval, scope, evidence, and completion gates.
- [blueprint planner](../src/blueprint-planner/AGENTS.md): preserves the model-versus-deterministic-shell boundary.
- [project creation](../src/project-creation/AGENTS.md): protects filesystem, Git, Godot, cleanup, and register-last invariants.
- [generated Project World](../src/generated-project-world/AGENTS.md): protects read-only joins and narrow mutations.
- [Godot runtime](../src/godot/AGENTS.md): protects pinned download, extraction, verification, and launch behavior.

No local instructions are added to UI, contracts, fixtures, tests, visual evidence, or documentation directories. Their boundaries are adequately routed here, and extra files would duplicate the root workflow more than they would prevent mistakes.

## Documentation maintenance

Run `npm run context:check` after changing this guide, the change map, local instructions, or referenced paths. The validator checks structure and path staleness; it deliberately does not assert that the architecture descriptions are semantically correct. Review ownership claims against imports, contracts, persisted writes, and protecting tests before merging.
