# Forge Change Map

Use this map when the task arrives as a symptom or requested behavior. The subsystem IDs match the [repository guide](REPOSITORY_GUIDE.md). Confirm the actual caller/writer relationship with `rg` before editing.

## Common changes and failures

### Launchpad or v0.2 UI change

- **Symptom or request:** A launch choice, visual hierarchy, action label, responsive arrangement, or client-side navigation needs to change.
- **Owning subsystem:** `launchpad-project-world` for presentation; `dashboard-host-api` only if the transport boundary must change.
- **Start:** [v0.2 app](../src/dashboard-v2/App.tsx), [view state](../src/dashboard-v2/state.ts), [styles](../src/dashboard-v2/styles.css), then the focused component such as [new-game flow](../src/dashboard-v2/NewGameFlow.tsx) or [generated world UI](../src/dashboard-v2/GeneratedProjectWorld.tsx).
- **Contracts and tests:** [dashboard v0.2 tests](../tests/dashboard-v2.test.ts), relevant shared transport type, and the matching harness under [visual review](../src/visual-review).
- **Neighboring consumers:** Dashboard host routes, sample presentation adapter, planning/creation/world API clients, and browser evidence.
- **Do not change first:** Sample runner/completion, generated project artifacts, registry, or fixture data to solve a layout problem.

### Prepared sample quest workflow change or failure

- **Symptom or request:** Enemy Targeting cannot start, emits wrong progress, changes the wrong files, fails proof, cannot reach play/confirmation, completes early, or resets incorrectly.
- **Owning subsystem:** `sample-workflow`, with `dashboard-host-api` as the browser adapter.
- **Start:** [runner workflow](../src/quest-runner/workflow.ts), [completion gate](../src/quest-runner/completion.ts), [prepared quest loader](../src/quests/prepared-enemy-targeting.ts), and [demo workspace](../src/demo/workspace.ts). For a browser-only failure, begin at [dashboard service](../src/dashboard-host/service.ts).
- **Contracts and tests:** [quest](../src/contracts/quest.ts), [plan](../src/contracts/implementation-plan.ts), [review](../src/contracts/review-result.ts), [completion](../src/contracts/quest-completion.ts), [runner tests](../tests/quest-runner.test.ts), [completion tests](../tests/quest-completion.test.ts), and [host tests](../tests/dashboard-host.test.ts).
- **Neighboring consumers:** Default/legacy dashboard, v0.2 sample adapter, Proof/Chronicle UI, Godot launch, and demo reset.
- **Do not change first:** v0.2 fixture-like presentation, generated-project services, global registry, or the immutable baseline unless the prepared quest contract itself is intentionally changing.

### GPT planning failure or blueprint rule change

- **Symptom or request:** Planning repeats questions, accepts unsupported scope, fails repair, uses the wrong model boundary, loses cancellation, or produces an invalid blueprint.
- **Owning subsystem:** `blueprint-planning`.
- **Start:** [planning service](../src/blueprint-planner/service.ts), [prompt](../src/blueprint-planner/prompt.ts), [SDK adapter](../src/blueprint-planner/sdk.ts), and [blueprint schema](../src/contracts/game-blueprint.ts).
- **Contracts and tests:** [game blueprint contract](../src/contracts/game-blueprint.ts), [planning transport](../src/blueprint-planner/shared.ts), [planning tests](../tests/blueprint-planning.test.ts), and [contract tests](../tests/contracts.test.ts).
- **Neighboring consumers:** New Game Intake/Review, project-creation approval envelope, provenance artifact, and planning rehearsal.
- **Do not change first:** Project filesystem code, starter source, registry, Godot verifier, or generated Project World to compensate for invalid model output.

### Generated project creation failure

- **Symptom or request:** Confirmation is rejected, a destination collides, starter assembly is incomplete, artifact round-trip fails, Godot/Git blocks promotion, cleanup is unsafe, or a project is registered after failure.
- **Owning subsystem:** `project-creation`; use `godot-verification` for runtime/bootstrap causes and `project-registry` only after promotion succeeds.
- **Start:** [creation service](../src/project-creation/service.ts), then [filesystem](../src/project-creation/filesystem.ts), [starter](../src/project-creation/starter.ts), [artifacts](../src/project-creation/artifacts.ts), [creation verifier](../src/project-creation/godot-verifier.ts), or [Git baseline](../src/project-creation/git-baseline.ts) according to the failed stage.
- **Contracts and tests:** [generated-project contracts](../src/contracts/generated-project.ts), [starter manifest](../fixtures/godot/top-down-arena/starter-manifest.json), and [project creation tests](../tests/project-creation.test.ts).
- **Neighboring consumers:** Registry/recent projects, creation UI, generated Project World, failure evidence, and Godot cache.
- **Do not change first:** GPT prompt, generated-world join, sample workspace/reset, or caller-selected filesystem paths.

### Registry or restart failure

- **Symptom or request:** A created project disappears after restart, recent-project availability is wrong, a moved project is trusted, malformed registry data deletes discovery, or opening updates recency at the wrong time.
- **Owning subsystem:** `project-registry`.
- **Start:** [registry store](../src/project-creation/registry.ts), [registry schemas](../src/contracts/generated-project.ts), then the caller in [creation service](../src/project-creation/service.ts) or [generated-world service](../src/generated-project-world/service.ts).
- **Contracts and tests:** `ProjectRegistry`/`ProjectRegistryEntry` in [generated-project contracts](../src/contracts/generated-project.ts), [project creation restart tests](../tests/project-creation.test.ts), and [generated-world open/read-only tests](../tests/generated-project-world.test.ts).
- **Neighboring consumers:** Launchpad recent projects, creation result reopening, generated-world resolution, and explicit open recency.
- **Do not change first:** Project-local manifest/roadmap/Chronicle, Launchpad cards, or regenerate a project to conceal a registry defect.

### Godot download, launch, or automated verification failure

- **Symptom or request:** Download consent/checksum/cache fails, extraction is rejected, an executable cannot be found, fixture verification fails, generated starter smoke fails, or a verified project will not launch.
- **Owning subsystem:** `godot-verification`; the invoking subsystem owns the meaning of the result.
- **Start:** [bootstrap](../src/godot/bootstrap.ts), [pinned build](../src/godot/pinned-build.ts), [executable discovery](../src/godot/find-executable.ts), [sample runner](../src/godot/run-fixture.ts), or [creation verifier](../src/project-creation/godot-verifier.ts).
- **Contracts and tests:** [Godot bootstrap tests](../tests/godot-bootstrap.test.ts), [executable tests](../tests/godot-executable.test.ts), [workspace tests](../tests/workspace.test.ts), [project creation tests](../tests/project-creation.test.ts), and the exact starter [verification script](../fixtures/godot/top-down-arena/scripts/verify_project.gd).
- **Neighboring consumers:** Demo prepare/play, sample completion, project creation, generated-world launch, and visual rehearsals.
- **Do not change first:** Quest verdicts, registry entries, UI success labels, or persisted verification artifacts to turn a runtime failure into a pass.

### Generated roadmap, quest brief, or Project World display failure

- **Symptom or request:** A registered project opens with mismatched quests, wrong order/selection, false preview claims, missing documents, an enabled build action, or a read that changes bytes.
- **Owning subsystem:** `generated-project-world`; `project-creation` owns defects already present in newly written artifacts.
- **Start:** [world service](../src/generated-project-world/service.ts), [transport types](../src/generated-project-world/shared.ts), [world UI](../src/dashboard-v2/GeneratedProjectWorld.tsx), and [project-local schemas](../src/contracts/generated-project.ts).
- **Contracts and tests:** Manifest, roadmap, quest, state, Chronicle, idea, and verification schemas in [generated-project contracts](../src/contracts/generated-project.ts); [generated-world tests](../tests/generated-project-world.test.ts) and [creation tests](../tests/project-creation.test.ts).
- **Neighboring consumers:** Launchpad open, quest brief, Documents, Chronicle, idea dock, Godot/folder actions, and restart restoration.
- **Do not change first:** Registry canonical paths, starter source, blueprint prompt, or roadmap bytes merely to fit a UI expectation.

### Persistence or Chronicle behavior change

- **Symptom or request:** Sample completion does not reload, generated selection is lost, idea activity mutates Chronicle/roadmap, derived activity is mislabeled, or reset touches the wrong workspace.
- **Owning subsystem:** `sample-workflow` for Enemy Targeting; `generated-project-world` for generated selection/ideas; `project-registry` for global discovery.
- **Start:** For sample state, [completion](../src/quest-runner/completion.ts) and [workspace](../src/demo/workspace.ts). For generated state, [world service](../src/generated-project-world/service.ts) and [generated project schemas](../src/contracts/generated-project.ts).
- **Contracts and tests:** [completion tests](../tests/quest-completion.test.ts), [workspace tests](../tests/workspace.test.ts), [host reload/reset tests](../tests/dashboard-host.test.ts), and [generated-world persistence tests](../tests/generated-project-world.test.ts).
- **Neighboring consumers:** World/Chronicle/Proof presentation, Launchpad recent projects, Git cleanliness, and rehearsal hashes.
- **Do not change first:** React local state, screenshots, authoritative Chronicle bytes for an idea save, or sample reset code for a generated-project problem.

### Responsive or browser-review failure

- **Symptom or request:** Horizontal overflow, hidden primary action, focus/reduced-motion regression, console/network error, state screenshot mismatch, or browser scenario cannot reach its target.
- **Owning subsystem:** `launchpad-project-world` for UI defects; `visual-review-evidence` for harness/setup defects; the relevant domain owner for a real API/runtime failure.
- **Start:** Reproduce with the matching script in [package.json](../package.json), inspect the relevant harness under [visual review](../src/visual-review), then the affected component and [v0.2 styles](../src/dashboard-v2/styles.css).
- **Contracts and tests:** [v0.2 tests](../tests/dashboard-v2.test.ts), [host tests](../tests/dashboard-host.test.ts), the matching report under [evidence](evidence), and subsystem tests for any failing endpoint.
- **Neighboring consumers:** Review/closeout evidence, README screenshots, judge replay, and accessibility behavior.
- **Do not change first:** Hand-edit evidence, weaken assertions, substitute fixture states for required live states, or mutate runtime artifacts to make a screenshot pass.

### Static showcase content, build, or review failure

- **Symptom or request:** A public claim is stale, walkthrough step is wrong, evidence image is missing, optional link is broken, static build fails, responsive review regresses, or the hosted page implies a live Forge operation.
- **Owning subsystem:** `public-showcase`; use `visual-review-evidence` only when the shared browser tooling itself is defective and `documentation-status` when current milestone truth is wrong outside the page.
- **Start:** [showcase README](../showcase/README.md), the relevant typed source under [showcase content](../showcase/src/content), [showcase entry](../showcase/src/main.ts), [validator](../showcase/scripts/validate.ts), and [review harness](../showcase/scripts/review.ts).
- **Contracts and tests:** [content tests](../showcase/tests/content.test.ts), [typed evidence manifest](../showcase/src/content/evidence.ts), `npm run showcase:check`, and `npm run showcase:review`.
- **Neighboring consumers:** Public deployment, submission links, Open Graph metadata, Task 8 evidence, judge guide, video shot list, and repository status.
- **Do not change first:** Operational dashboard services, quest runner, blueprint planner, project creation, generated Project World, Task 7 evidence, or release tags to solve a static showcase problem.

## Maintenance rule

When a new stable subsystem is added, update both this map and the repository guide in the same change, use a unique subsystem ID, link at least one protecting test, and run `npm run context:check`. A dated closeout is decision evidence, not a replacement for these routes.
