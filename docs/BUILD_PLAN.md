# Forge Build Week Architecture and Plan

## Contract review

The four governing documents agree on the audience, the Enemy Targeting golden path, the six-stage workflow, and the major exclusions. The following gaps matter before implementation:

- `ROADMAP.md` still showed the baseline SHA as incomplete even though `BUILD_WEEK_BASELINE.md` records it.
- `README.md` described the sample game as already included. The repository currently contains planning documents only, so those statements needed to be future-facing.
- The runtime integration surface, artifact format, and owner of each state were unspecified.
- The demo needs a clean, repeatable starting copy. Mutating package contents would make a second judge run unreliable.
- `PLAN → APPROVE → IMPLEMENT → REVIEW → DOCUMENT → COMPLETE` is run state; roadmap states (`locked`, `available`, `active`, `completed`) are a separate concern.
- “Persistent understanding” could be misread as generalized memory. For Build Week it means only explicit project, quest, run, and work-log files.
- A replay fallback is required for judge reliability, but it must be visibly labeled and must never be presented as a live Codex run.

No required document justifies a vector database, multi-provider layer, team system, broad repository scanner, or multi-agent coordinator.

## Smallest architecture

Use one local Node.js 20+ TypeScript process with four responsibilities:

1. Serve a small React dashboard on localhost and open it in the default browser.
2. Read and atomically write validated JSON artifacts in the demo workspace.
3. Run Codex server-side through the official `@openai/codex-sdk` package.
4. Download/checksum a pinned portable Godot build, run headless verification, and launch the game.

Start with the official Codex SDK and its public API. During the headless-runner task, verify that it exposes the approval and progress information required by the golden path. Use App Server directly only if a required capability is unavailable through the SDK, and record that evidence before adding a protocol layer. No generic provider interface is required.

```text
Browser dashboard
       |
Local Forge host
  |    |       |
JSON  Codex   Godot
state  SDK    portable binary
```

### State ownership

- Project manifest owns engine, paths, and allowed commands.
- Roadmap owns persistent quest availability and completion.
- Quest files own static intent, scope, criteria, and checks.
- A run owns the six-stage workflow, approved plan, implementation evidence, and review.
- The dashboard owns only transient selection and presentation state.
- Git remains the authoritative source-change record; `docs/AI_WORK_LOG.md` explains collaboration.

Persist project data under the extracted demo workspace:

```text
.forge/
  project.json
  roadmap.json
  state.json
  quests/
  plans/
  runs/<run-id>/
    plan.json
    implementation-handoff.json
    review.json
    events.jsonl
```

JSON is the runtime format. TypeScript schemas provide strict validation and inferred types. Markdown is reserved for concise human-facing logs and summaries. Writes use a temporary file followed by rename so roadmap state is not partially written.

### Repeatable demo

Ship an immutable baseline Godot fixture without Enemy Targeting. On first launch, copy it to a per-user Forge demo workspace. Subsequent launches reopen that workspace so completion persists. A clearly labeled **Reset demo** action recreates it from the fixture after confirmation.

The prepared quest ships with a reviewable prepared plan. Refinement creates a new plan revision before approval; it does not mutate the original template. Implementation receives only the approved plan, focused context files, allowed workspace, and verification commands.

### Understandable progress

Do not display raw Codex events as the main experience. Deterministically map them to a small Forge view model:

- Preparing the quest
- Building the mechanic
- Checking the result
- Ready to play
- Needs attention

Raw commands, changed files, and logs remain available behind a details control. The event log stores sanitized structured events, not hidden reasoning or private transcripts.

## Sequenced implementation plan

### Required

1. **Contracts and examples** — Create the TypeScript project, strict runtime schemas, Enemy Targeting example artifacts, and validation tests. No UI, Codex, or Godot yet.
2. **Repeatable Godot fixture** — Add the smallest playable baseline with player and enemy, but no targeting mechanic. Pin Godot, add the headless smoke check, and prove reset/copy behavior.
3. **Headless quest runner** — Load the prepared quest and approved plan, start one Codex SDK thread in the fixture workspace, capture the available sanitized progress and an implementation handoff, run verification, and write a review result. Use App Server directly only after documenting a required SDK capability gap.
4. **Deterministic closeout** — Advance the roadmap only when required checks pass, preserve failed runs without marking completion, and expose a single command that proves the non-UI loop.
5. **Thin dashboard** — Add roadmap, quest detail, prepared-plan review, explicit approval, refinement, and contextual question actions against the real local host.
6. **Progress and recovery** — Translate runtime events into the small stage view, add details disclosure, cancellation, retry, failure, and uncertainty states.
7. **Playable completion** — Launch Godot, collect the play confirmation, show Quest Complete feedback, persist state, and recommend the next quest.
8. **Judge packaging** — Verify `npx forge-game-dev demo`, checksum the Godot download, add an honestly labeled sanitized replay fallback, replace placeholders, and repeatedly test the three-minute path on clean Windows.

Each step ends with automated evidence, an implementation handoff, a review result, roadmap/handoff updates where relevant, and an AI work-log entry.

### Stretch only after the judge path is repeatable

- New-idea-to-quest planning beyond the minimal second proof path
- Implementing Player Dash or Damage Feedback
- Rich companion animation beyond one polished completion treatment
- Broad project discovery, other engines, remote execution, marketplaces, team features, currencies, inventory, leveling, or an operating-system overlay

## First bounded implementation task

Scaffold the Node.js/TypeScript contract layer and executable validation for the seven planning templates. Do not add the dashboard, Codex invocation, Godot project, download logic, or generalized infrastructure.

Acceptance criteria:

1. The repository has the minimum Node.js/TypeScript test setup and one source area for strict runtime schemas with inferred types.
2. Project manifest, roadmap, quest, implementation plan, implementation handoff, and review-result JSON contracts are represented and reject unknown workflow/status values.
3. Workflow stages are exactly `PLAN`, `APPROVE`, `IMPLEMENT`, `REVIEW`, `DOCUMENT`, and `COMPLETE`; roadmap states are exactly `locked`, `available`, `active`, and `completed`.
4. Example data represents the prepared Enemy Targeting quest, its prepared plan, and an initial available roadmap node without requiring UI, Codex, Godot, a database, or provider abstraction.
5. Automated tests load every example successfully and prove at least one invalid workflow transition or state is rejected.
6. Artifact paths and single-owner state rules match this document and the templates under `docs/templates/`.
7. The diff contains no dashboard, Godot integration, external memory, multi-provider, team, or multi-agent implementation.
8. `docs/AI_WORK_LOG.md` records files changed, the exact test command and result, and the commit/session fields available at closeout.

Completed on 2026-07-13. See [`handoffs/2026-07-13-contract-layer.md`](handoffs/2026-07-13-contract-layer.md) for criterion-by-criterion evidence.

## Approved architecture decisions

Approved by the creator on 2026-07-13:

1. **Runtime:** local browser dashboard plus one Node/TypeScript host. Use official `@openai/codex-sdk` first; use App Server directly only for a documented required capability gap.
2. **Artifacts:** strict JSON runtime files with TypeScript validation; Markdown only for human-facing logs and handoffs when needed.
3. **Demo safety:** copy an immutable fixture into a persistent per-user workspace and provide a confirmed reset action.
4. **Completion gate:** require automated verification plus the user choosing **I saw it work** after game launch before marking the quest complete.
5. **Fallback truthfulness:** make sanitized replay part of judge reliability, visibly label it as replay, and never treat it as live evidence.

Godot 4.7 stable Standard Windows x86_64 with GDScript is approved. The official archive, release-asset checksum source, and proposed task are recorded in [`plans/2026-07-13-godot-baseline-fixture.md`](plans/2026-07-13-godot-baseline-fixture.md). Implementation remains gated on approval of that bounded task.
