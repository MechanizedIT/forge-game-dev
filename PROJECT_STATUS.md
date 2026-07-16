# Forge Project Status

**Last updated:** 2026-07-16

**Current milestone:** `Real World → Building → Part shell integration`

**Overall state:** `IMPLEMENTED` — Real registered projects now open inside the redesigned shell as Worlds with their real Systems shown as Buildings and Quests shown as Parts. The existing protected work runner remains underneath the simpler presentation.

**Owner confirmation:** Pending one owner-run **Start Building → Playtest → Worked** pass in the joined shell. Browser review stopped before starting real Codex work.

**Milestone implementation commit:** Not created. The redesign checkpoint is `d373b16`; this integration remains in the working tree.

## What works now

- `npm run forge` opens the supplied FORGIE / GAME DEV WORKSHOP logo, World Forge, and the responsive World Map shell.
- Existing registered projects open as **World → Building → Part**. Project/System/Quest remain the authoritative backend names and schema.
- Real completion counts, activity, Inspector details, Atlas entries, recommended files, acceptance checks, and status flow into the redesigned screens.
- **Add Building** and **Add Part** reuse existing open system and quest planning. Region/Town are dormant and are no longer navigation gates.
- Part Detail shows **What Forgie will do**, editable recommended files, one normal **Start Building** action, plain progress, **Playtest**, **Worked**, **Needs Fixing**, **Not Sure**, and optional advanced details.
- The existing exact work order, Codex runner, file boundary, verification, Godot launch, completion, reload, recovery, and undo remain unchanged underneath the new presentation.
- Full tests pass 171/171. Typecheck, production build, protected compatibility, desktop/mobile navigation, Back/Forward, overflow, and browser console checks pass.

- After accepting quests, Forge shows the complete saved quest list and marks the next available quest as **Recommended next** instead of jumping directly into an unnamed file chooser.
- Preparing work now names the exact quest, repeats its visible outcome and done-when checks, and suggests editable existing/new Godot files from the already bounded candidate list. This adds no Codex turn and grants no authority before confirmation.
- **Back to system** discards unfinished file picks and releases transient planner ownership. Another system opens immediately; returning reconstructs saved quests and confirmed work orders from project records.
- Native **Worked** completion now compares deterministic completion records with the Git index. An already-final `.forge/project-state.json` is included in the expected exact manifest and committed rather than falsely stopping after successful play.

- **Start a new game** now asks only for a project name. Forge creates a tiny runnable Godot project, verifies it with pinned Godot, creates a clean local Git baseline, registers it last, and opens Project World.
- The creator describes the actual game after the workspace opens. Existing open system and quest planners accept ordinary Godot ideas without a game-type, capability, starter, template, or profile permission gate.
- Every available native quest can now receive its own one-to-four-file work plan. Completing one quest unlocks the next dependency-safe quest, which can be scoped, sent to the same runner, played, confirmed, reloaded, and undone independently.

- A creator can move through one connected path: describe a game, confirm broad systems, edit one system into small quests, choose one to four files, confirm the work plan, and separately choose **Send to Codex**.
- Native planned quests now use the existing profile-free runner. The creator's exact file choice is the only game-file permission; profiles remain optional extra checks and never decide which ideas are allowed.
- The runner rechecks the saved planning files before Codex starts and before completion. Changed bytes, staged planning files, other dirty files, links, remotes, or a changed project stop safely.
- After the checks pass, Forge shows **Play the real game**. **Worked**, **Did not work**, and **Not ready** appear only after a successful launch. Only the creator's **Worked** choice can save completion.
- Native completion joins the quest, work session, result, History, project notes, one local Git commit, reload, restart recovery, and exact undo. Older Gravity Tap and Signal Sweep records keep their existing behavior.
- Main buttons now use short words such as **Confirm this plan**, **Send to Codex**, and **Files Codex may change**. Pencil buttons use clear tooltips for editing systems and quests.

- **Refine this system** opens from the connected roadmap. The creator explains the player-facing result in ordinary words; no game type, capability, profile, starter, template, tool, or verifier decides what is allowed.
- Forge asks at most one short clarification round and proposes up to five ordered quests. The creator can revise repeatedly, cancel safely, retry the exact failed step, or accept the exact fingerprinted proposal.
- Accepted quests persist in `.forge/system-quests.json` under the selected system. Missing records keep exact Milestone 4 behavior, malformed records fail closed, and later roadmap reshaping never writes or rewrites this record on read.
- A small chooser lists only bounded existing Godot text files under `scenes/` and `scripts/`, plus an exact expected-new Godot text path under an existing safe parent. The creator must review and accept the exact one-to-four-file draft.
- Reload resumes accepted quests and scope review honestly. Saving rechecks stale system or quest wording, canonical exact paths, and unresolved work. The final screen plainly says no contract was prepared and no work ran.

- **Shape systems** opens inside the connected Roadmap shell. The creator writes an idea in ordinary words; no game type, capability, starter, template, profile, or verifier decides whether it is allowed.
- Forge asks at most one short round of up to three questions, then shows three to six broad systems. The creator can revise repeatedly, cancel safely, retry the exact failed step, or accept the exact fingerprinted proposal.
- Accepted systems persist in `.forge/system-roadmap.json`. Empty systems remain real. Existing quests keep their system, global order, sessions, results, history, and focus meaning. Missing records keep exact old behavior with no on-read rewrite.
- Start, acceptance, and the final save reject unresolved work. The fixed target, canonical project, exact quest membership, populated-system order, and project fingerprint all fail closed when stale or unsafe.

- Generated projects open into one persistent shell with Roadmap, History, Project files, quest review, and work-session views.
- The roadmap reads systems and quests from the open Project Model. An empty system remains visible without a fake quest or fake action.
- Forgie shows one short recommendation for the selected system or quest. The Workbench Dock contains only Play Game, Open Folder, and Toolbox.
- Any active work session focuses its actual quest, disables Play and workspace navigation, keeps safe folder access, and still lets the creator view progress.
- Exact contract review remains separate from approval and from starting work. The shell reuses the existing runner, proof, play, confirmation, completion, reload, and rollback screens.

- `npm run forge` opens the v0.2 Living Game Workshop. `npm run forge:v0.1` remains the protected direct compatibility launch, and `npm run forge:v0.2` remains an explicit alias.
- The sample journey reviews an exact three-file plan, requires approval, runs the official Codex SDK once, shows truthful stages, verifies scope and Godot behavior, launches the game, requires exact creator confirmation, persists completion, reloads, and resets safely.
- The new-game journey uses real GPT-5.6 high reasoning, bounded clarification, strict blueprint validation, separate approvals, one controlled Top-down Arena starter, pinned Godot verification, a clean no-remote Git baseline, registry-last persistence, and a restart-safe Project World.
- New intake now shows one explicit supported interpretation, `strong`/`partial`/`poor` fit, tradeoffs, alternatives, revise, and reject before vision approval. The exact original idea remains immutable provenance.
- Forge reconciles Signal Sweep against three controlled starter facts, permits at most three fingerprinted creator revisions, and makes a separately accepted roadmap the creation authority. Only prevalidated deltas can be added; stale fingerprints, unsafe dependencies, and starter-only outcomes fail closed.
- Fresh starter-aware projects write immutable accepted-roadmap provenance plus authoritative v2 roadmap, quest, state, Chronicle, and deterministic Markdown artifacts. Older v0.2 and Task A projects continue to load without migration or GET-time writes.
- Generated Quest 1 can resolve the registered `relay_activation_v1` profile to exactly `scenes/main.tscn`, `scripts/main.gd`, and `scripts/objective_marker.gd`. Later unregistered quests stay visibly planned and ineligible. Gravity Tap keeps its exact revision ceremony and profile behavior.
- Generated Project World restores roadmap selection, quest briefs, documents, Chronicle, and idea seeds. For the prepared Gravity Tap Quest 1, it now supports Adjust, Build, exact contract approval, staged progress, independent proof, visible play, creator confirmation, safe rollback, completion, and restart restoration.
- Generated Project World also returns the open versioned project model. Systems can exist with no quests and keep `planned` status; focus can select only that system until it is refined. Legacy flat roadmaps become one truthful **First Playable** system; every validated runner session is linked in stable order, and terminal sessions link to results and Chronicle history.
- Verification profiles appear only as optional descriptive extra proof in the new model. They do not change model validity, dependency readiness, quest status, or system status.
- Task 7 corrected visible Windows launching for generated Godot and File Explorer actions.
- Edge `150.0.4078.65` and Playwright `1.61.1` pass 48 automated captures across six suites at desktop, tablet, and mobile sizes, including focus, reduced motion, failures, and recovery. One additional real creator-confirmed completion capture records the final gate.
- A clean temporary checkout passed `npm ci`, Codex login status, first-time pinned Godot download, and demo preparation.
- `npm run showcase` opens a separate static submission surface with a thirty-second product explanation, interface tour, two seven-step guided replays, current/future boundary, architecture, Task 7 proof, local setup, and truthful pending public links.
- The showcase imports no operational Forge service, makes no runtime data call, and cannot run Codex or GPT-5.6, launch Godot or Git, access files, modify games, simulate an agent run, or persist visitor projects.

## Alpha Task A evidence

- Real project `gravity-tap-arena-6cbe7b2a54` began at clean baseline `7dbbbf43f206cd5334b226d6c9a98fbfcf0e10a8`; adjusted contract revision 2 changed exactly `scenes/main.tscn` and `scripts/objective_marker.gd` through official SDK thread `019f63c4-68cb-7770-a5c0-35a4ca735e7f`.
- Run `run-q1-enter-the-arena-1784085217366-54d6c1f399c3` passed exact inventory boundary, pinned Godot project health, Forge-owned `gravity_orb_presence_v1` mechanic proof, and the creator's explicit **Worked** result after visible play.
- Completion commit `f4cbba5928e22c0a3471239d7b67b490c7649a56` records the run ID. Quest, roadmap, Chronicle, docs, provenance, project state, commit tree, and ignored receipt agree after fresh-service reload and a full host process restart.
- Full validation passes 98/98 tests, all 38 protected v0.1 tests, production build, showcase checks, context validation, and a 12-state Edge review with zero reported issues.

## Alpha Pivot Milestone 1 evidence

- The focused contract, migration, creation, runner, recovery, completion, and compatibility suite passes 51/51. The full suite passes 121/121; protected v0.1 remains 38/38 with a production build.
- Real Gravity Tap reopens with Quest 1 completed, Quest 2 available, run `run-q1-enter-the-arena-1784085217366-54d6c1f399c3`, completion commit `f4cbba5928e22c0a3471239d7b67b490c7649a56`, tree `1fd2f3045f65d1d4ec70475666ea089a9ae12d85`, and its exact Chronicle link.
- Real Signal Sweep reopens with Quest 1 available, later quests blocked, session `run-q1-activate-the-signal-relay-1784097644808-d6b07df30793` still in `contract_review`, zero changed files, no result, and the same active-lock hash.
- Before/after hashes match for the registry, every `.forge` record, all run files, both Git heads, both clean statuses, and both empty remote lists. No live project write or runner execution occurred.

## Alpha Pivot Milestone 2 evidence

- The test-owned **Show the welcome beacon** quest changes one approved existing scene and creates one approved new GDScript with `verificationProfile: null`.
- It passes exact scope review and fixed pinned-Godot health, records optional mechanic proof as `not_run`, requires real launch plus exact creator `worked`, completes one local Git transaction and receipt, reloads from a fresh service, and leaves a clean worktree.
- Recovery tests restore the exact existing scene and delete only the unchanged approved new script after every changed path passes preflight. Concurrent edits and undeclared files fail closed.
- Strict scope requests enter `scope_review`, retain the project lock when reviewed changes exist, never add requested paths to authority, and offer exact rollback.
- Exact v1 Gravity Tap fingerprint `2f90b794bdea0a224ba2ef64aef7ec2275de9f18cf8e5c37579d7e7082f0b572` and v1 proof rules remain protected.
- The full suite passes 126/126. Protected v0.1 passes 38/38 with the production build. The focused milestone commands pass 72/72.
- A corrected read-only live audit loaded both real projects and proved registry, project files, Forge records, Git HEAD/status, and remotes remained byte-identical. Gravity Tap remains completed at `f4cbba5928e22c0a3471239d7b67b490c7649a56`; Signal Sweep remains unchanged in `contract_review` with zero changed files.

## Alpha Pivot Milestone 3 evidence

- Focused workspace checks pass 19/19. The full suite passes 132/132, and the protected v0.1 suite passes 38/38 with a production build.
- The project-workspace Edge review passes 15 temporary states with zero issues. It covers desktop, tablet, phone, Toolbox focus from both triggers, quest focus return, reduced motion, empty/failure behavior, exact pre-approval, and active-work locks.
- The protected generated-quest Edge review passes 12 temporary states with zero issues, including exact approval, separate start, progress, proof, play, creator confirmation, completion, and safe failure.
- Independent read-only review found and verified fixes for project-wide active locks, active-quest focus, duplicate locked actions, Toolbox focus return, narrow dock clipping, and missing active/pre-approval browser evidence.
- Live read-only reload kept the registry at `a23042ae97c706285780d91642faed0a0e29261ab04b4feb2b6f75c840f06b86`. Gravity Tap bytes stayed `79dcb02744d4070cd71f4d3d42a333ce84315316c056445be5162efee9f2f56c` at Git `f4cbba5928e22c0a3471239d7b67b490c7649a56`; Signal Sweep bytes stayed `31d5d1acab8e31c5ae2b1ae1a110f68c55fcad2fe30225b87b413e36ef71e86e` at Git `a0ad834d6c1f98a51b63c7313564acb1af274e41`.

## Alpha Pivot Milestone 4 evidence

- Focused checks pass 45/45. The full suite passes 145/145. Protected v0.1 passes 38/38 with a production build. Context validation reports 11 subsystems, 10 change routes, 255 path references, and 68 test references.
- The new Edge review passes 9 idea, clarification, proposal, revision, acceptance, reload, failure, mobile, and reduced-motion states with zero issues. Existing 15-state workspace and 12-state runner reviews also pass.
- The temporary project's real Git status changed from clean to only `?? .forge/system-roadmap.json`. A recursive audit proved every other project file and the temporary registry stayed byte-identical.
- Live read-only reload kept registry hash `a23042ae97c706285780d91642faed0a0e29261ab04b4feb2b6f75c840f06b86`. Gravity Tap stayed clean at Git `f4cbba5928e22c0a3471239d7b67b490c7649a56` with tree digest `155d08c1581c1adbb71f2456eef2993656bd1bc17bb208aec9b77e3a6a7342e5`. Signal Sweep stayed clean at Git `a0ad834d6c1f98a51b63c7313564acb1af274e41` with tree digest `d6125f1b31626e57cfaabfbb86eac98228562ce6310251f61a542d9c300988bf`. Both still have no remotes.

## Alpha Pivot Milestone 5 evidence

- Focused final checks pass 39/39. The full suite passes 154/154. Protected v0.1 passes 38/38 with a production build. Context validation reports 11 subsystems, 10 change routes, 255 path references, and 68 test references.
- The new Edge review passes 8 description, proposal, responsive, file-choice, exact-review, ready, and reload states with zero issues. Existing roadmap, workspace, and runner browser suites also pass with temporary projects.
- Independent read-only review found five safety and truth gaps. Restart resume, active-work rechecking, semantic fingerprints, canonical exact paths, and work-order wording were corrected and rechecked.
- Live read-only reload kept registry hash `a23042ae97c706285780d91642faed0a0e29261ab04b4feb2b6f75c840f06b86`. Gravity Tap kept 40 audited files and clean Git `f4cbba5928e22c0a3471239d7b67b490c7649a56`; Signal Sweep kept 37 audited files and clean Git `a0ad834d6c1f98a51b63c7313564acb1af274e41`. Both still have no remotes.

## Alpha Pivot Milestone 6 evidence

- Full tests pass 164/164. Protected v0.1 checks pass 38/38 with the production build. Type checks, dashboard build, context validation, and `git diff --check` pass.
- The live planning repair accepts the current Codex response shape without weakening Forge's checks. The owner's exact idea returned three clear systems, and a follow-up returned one welcome-beacon quest. Both test proposals were canceled, so no planning record or Godot file changed. Failure screens now use short, friendly words instead of raw service errors.
- The new creator rehearsal passes 7 desktop and phone states with zero issues and stops before **Worked**. The earlier roadmap, quest, workspace, and runner browser checks also pass: 51 screenshots total with zero issues.
- Temporary tests prove failed launch cannot be confirmed, changed planning bytes cannot start, staged planning files and remotes are rejected, pre-commit failures restore records, exact undo restores the scene and removes only the approved unchanged new file, and restart repair reuses one completion commit.
- The browser rehearsal copied a registered source project into an isolated Forge home. A recursive before/after audit says the real source project and real registry stayed unchanged.
- The independent review found five serious gaps. Fixes now require successful launch before confirmation, recheck planning bytes throughout the run, preserve older completion notes, cover native recovery, and audit the whole source project.
- The owner completed the named isolated temporary project, saw the welcome beacon in the launched Godot game, and chose **Worked**. Completion then reloaded successfully; the one local milestone commit is recorded in the closeout.

## How to test this milestone

Run `npm run forge`, open the robot project, refine a system, and confirm its quests. Check that the saved quest list appears, open the recommended quest, then choose **Back to system** and open another system. For the completion repair, finish a quest, play it, and choose **Worked**. For automated proof, run `npm test`, `npm run check:v0.1`, `npm run context:check`, and `npm run visual:review:alpha:system-quest`.

## Alpha Milestone 8 evidence

- Full tests pass 167/167. Protected v0.1 passes 38/38 with type checks and the production dashboard build. Repository context validation and `git diff --check` pass.
- The native creator rehearsal reproduces project state that already matches the final selection while hidden from ordinary Git status. **Worked** stages the exact expected manifest, includes `.forge/project-state.json`, creates one commit and receipt, and reloads completed.
- The dated Edge review passes nine screens with zero issues. It shows all saved quests, the recommended next quest, explicit quest context and suggestions, then leaves the chooser, opens another system, returns, finishes the work plan, and reloads it.
- The owner closed Forge completely, restarted it, reopened the robot project, confirmed **Random obstacle appearances** completed, confirmed correct system progress, History, and next available quest, then launched the game successfully. All six checks passed.

## Alpha Milestone 7 evidence

- A temporary real **Moonlight Courier** project completed neutral creation with Godot `4.7.stable.official.5b4e0cb0f`, zero starter quests, and clean local Git commit `9dd6e0840a7d…`; the temporary project was removed after verification.
- Full tests pass 166/166. The focused creation, world, runner, recovery, completion, host, UI, and repeated work-order suite passes 78/78. Protected v0.1 passes 38/38 with the production dashboard build.
- Type checks, production build, repository context validation, and `git diff --check` pass. Empty-roadmap reopen keeps quest focus null, and a completed native quest makes the next dependency-safe quest available for its own confirmed file plan.

## Alpha Task B implementation evidence

- Failure-first proposal/planner tests established the missing contract and provenance behavior before implementation. Additional regressions cover the creator's three-turn planning sequence, failed-state reset, and bounded retry for a transient Windows registry lock. The final suite passes 114/114 tests; the protected v0.1 suite remains 38/38.
- Deterministic creation/restart tests prove both approvals are checked before allocation, new artifacts reload as v2, old generated projects remain read-only compatible, Signal Sweep Quest 1 prepares a three-existing-file relay contract at revision 1, later quests remain ineligible, and no SDK run begins.
- The repository-owned `relay_activation_v1.gd` verifier has a fixed Godot invocation and exact success marker. Tests use a controlled process boundary; the live mechanic was not implemented or claimed.
- The ten-state browser review passes at desktop and narrow widths with zero reported issues, covering unsupported interpretation, vision, starter facts versus deltas, invalid reorder feedback, accepted creation review, friendly creation failure/retry, and fresh Project World.
- `npm run check`, `npm run check:v0.1`, `npm run showcase:check`, `npm run context:check`, production dashboard build, and `git diff --check` pass. The `v0.2.0` tag remains at `cad4d690b4f667f051d9113a416525b16eec5dbe`.
- Live Signal Sweep project `signal-sweep-f49fc33f38` passed Godot 4.7 verification and a clean no-remote Git baseline at `a0ad834d6c1f98a51b63c7313564acb1af274e41`, survived a full Forge restart, and reopened with Quest 1 available. Its prepared contract is fingerprint `f368d661cff834ace9437d51fce3c79e47f0dd85a6dfc558b49d5eec30b73e53`, allows only `scenes/main.tscn`, `scripts/main.gd`, and `scripts/objective_marker.gd`, and has zero changed files.

## Task 8 evidence

- Typed content records the represented `v0.2.0` tag, release commit `08cffa7`, public links, both walkthroughs, evidence provenance, proof facts, capability horizons, and limitations.
- Nine inspected Task 7 states are reused as optimized evidence; one generated hero and two deterministic SVG assets are labelled illustration rather than proof.
- `npm run showcase:check` passes typechecking, five content tests, the static build, privacy/truth validation, and budgets: 40,401 bytes JavaScript, 22,774 bytes CSS, and 245,048 bytes of initial document assets.
- Task 8 Edge review passes desktop, tablet, mobile, keyboard, focus, touch/click, deep-link, truthful pending-video dialog, Escape/focus-return, console/network, overflow, and reduced-motion checks with zero issues.

## Task 7 evidence

- Real sample run `enemy-targeting-1784056119542` changed only the approved files, passed automated review, received exact creator confirmation after visible `IDLE → CHASING → IDLE`, persisted final `PASS` after a host reload, and reset safely to the clean fixture.
- Real **Gravity Tap Arena** project `gravity-tap-arena-6cbe7b2a54` used GPT-5.6, passed Godot, created clean Git commit `7dbbbf43f206cd5334b226d6c9a98fbfcf0e10a8`, restored state/idea after restart, opened visibly in Godot and File Explorer, and left the sample hash unchanged.
- Browser evidence: 48 automated screenshots plus one real creator-confirmed completion capture, zero reported issues.
- `npm run context:check`, all 89 full-suite tests, the production build, all 37 protected v0.1 tests, the live default-launch probe, clean-clone gate, and diff/cleanliness checks pass.

## Remaining submission work

1. Review the public copy, select a license, record/publish the under-three-minute video, and preserve the primary `/feedback` ID privately.
2. Deploy the static showcase, then configure the final video, live-site, and Devpost URLs.
3. Confirm repository visibility and the final submission branch, then push or submit only with explicit owner authorization.

The open project model, profile-free runner, connected workspace, open system planning, and system-to-quest planning now work together in a completed creator walkthrough. External import, broad scanning, non-Godot engines, and generalized integrations remain deferred. Signal Sweep remains unapproved and unimplemented. The next product milestone has not yet been selected; preserve this completed proof before choosing one.

See the [Alpha Pivot Milestone 6 closeout](docs/closeouts/2026-07-15-alpha-pivot-creator-rehearsal-closeout.md), [review](docs/reviews/2026-07-15-alpha-pivot-creator-rehearsal-review.md), [Alpha Pivot Milestone 5 review](docs/reviews/2026-07-15-alpha-pivot-system-quest-refinement-review.md), and [judge guide](docs/JUDGE_GUIDE.md).
