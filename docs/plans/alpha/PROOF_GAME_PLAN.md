# Proof-Game Plan

## Recommendation: Signal Sweep

**Pitch:** restore three glowing signal relays in a tiny arena before time expires.

- **Core action:** move to a relay and activate it; activation produces an immediate color/ring change.
- **Goal:** activate all three relays.
- **Pressure/scoring:** a short timer in Quest 3; completion time can be the score. No fail state is required for the first quest.
- **Why this concept:** the result is understandable in seconds, code-native geometry is enough, progress is visually obvious, each quest is a playable delta, and the whole game fits the existing Top-down Arena starter.

## Starter reuse

The controlled starter already supplies project configuration, one main scene, bounded arena geometry, player, keyboard movement, camera, objective marker, baseline verifier, and local Git. The accepted roadmap must label these **Already playable**, not plan them again.

No second starter, imported art, audio, dependency, or model-authored project layout is needed.

## Quest sequence

| Quest | Player-visible outcome | Dependencies | Likely existing files | Deterministic proof | Creator checkpoint |
| --- | --- | --- | --- | --- | --- |
| 1. Wake One Relay | Touch/activate one relay; it visibly changes state and reports `1 / 1` | Starter only | `scenes/main.tscn`, `scripts/main.gd`, `scripts/objective_marker.gd` | Boundary + baseline Godot + Forge `relay_activation_v1` profile checks initial/activated state and activation event | Move to relay; verify one activation, clear feedback, no repeated count |
| 2. Sweep Three Relays | Three distinct relays activate once; progress reaches `3 / 3` | Q1 | same three files | Three stable relay instances, unique activation, monotonic count, win event | Activate in different order and replay |
| 3. Beat the Signal Clock | Timer starts, all relays win, timeout/reset works | Q2 | `scenes/main.tscn`, `scripts/main.gd`, optionally `scripts/player.gd` | deterministic timer state transitions, win/timeout/reset hooks, project health | Complete once; intentionally time out; reset |
| 4. Readable Final Pass | Start/win/timeout states and relay contrast read clearly | Q3 | same files | accessibility/state-label invariants plus baseline checks; visual proof remains creator-owned | Record clean 15–25 second run |

Quest 1 is the Build Week implementation target. Quests 2–4 may remain truthful planned nodes; the proof alpha does not need to implement all of them.

## File and verification design

The first quest creates no file. Codex may edit at most the three existing game files listed above. It cannot edit `.forge/**`, `verify_project.gd`, Git metadata, cache, dependencies, or any new path.

The mechanic profile is owned by Forge, versioned, and outside the editable project paths. It defines the small public interaction contract needed for deterministic testing. Codex receives that requirement as acceptance criteria but cannot modify the proof. See [verification ownership](ALPHA_ARCHITECTURE.md#verification-ownership).

Automated proof is deliberately narrower than the creator claim:

- **Boundary:** only the approved existing files changed; no new/delete/rename.
- **Project health:** pinned Godot imports/loads and the starter's baseline verifier still passes.
- **Mechanic:** relay begins inactive, activates once through the expected interaction, emits/reports the state, and shows an activated property/state.
- **Creator:** the feedback is visible, understandable, and feels responsive in play.

## Capture moments

1. Foundation recommendation: ordinary-language Signal Sweep idea → honest Top-down Arena interpretation.
2. Roadmap review: starter facts separated from relay delta quests.
3. Contract: exactly three allowed files and three proof layers.
4. Active build: Forge progress, not raw terminal.
5. Proof: boundary/project/mechanic green while creator play remains pending.
6. Gameplay: player crosses the arena and relay changes visibly.
7. Completion: quest node completes, Chronicle appends, Git commit appears, next quest unlocks.
8. Restart: same completed node and next recommendation restored.

The short video narrative is: “I described a tiny mechanic, approved Forge's safe interpretation and quest, watched Codex work inside three files, saw what Forge could prove, played the result myself, and reopened the project with its roadmap and history intact.”

## Alternatives

### Last-Moment Pulse

Move in a bounded arena and trigger a pulse that pushes an approaching enemy away. It is visually compelling and an existing project already has the roadmap, but enemy movement/push physics create more failure modes and its first two planned quests duplicate the starter. Use it only if the roadmap is reconciled and time remains.

### Gravity Tap Arena

Move to a central orb and later trigger a gravity pull. It is already a real, clean, verified generated project and therefore the best operational fallback. Its current first quest can be narrowed to turn the objective placeholder into a clearly identifiable orb using existing files. The later gravity mechanic is stronger video but requires more behavior and verification design.

### Beacon Hold

Stand inside one beacon long enough to charge it while an indicator fills. It is simple and verifiable, but less visually distinctive than activating multiple relays and can feel like a single UI timer rather than a tiny game.

## Primary and fallback strategy

- **Primary evidence:** after Task A passes on a known project and Task B passes, create Signal Sweep through the fresh idea → interpretation → roadmap → project path and complete Quest 1.
- **Operational fallback:** preserve and use `gravity-tap-arena-6cbe7b2a54` at clean baseline commit `7dbbbf43f206cd5334b226d6c9a98fbfcf0e10a8`. Its current Q1 scope overclaims the starter. Before execution, the creator must explicitly approve a new quest revision that narrows the delta to moving/reframing the existing objective as one clearly identifiable gravity orb with stable observable identity; the original blueprint remains provenance. Implement only that revision through the same transaction.
- **Fallback checkpoint:** if the generated completion architecture cannot complete a Gravity Tap rehearsal by the end of the first major implementation day, cut Task B and switch immediately to the reduced [fallback implementation prompt](FALLBACK_IMPLEMENTATION_PROMPT.md). If that prepared fallback still cannot complete safely by end of Day 2, stop alpha implementation. If Task A is green but Signal Sweep lacks a valid starter-aware accepted roadmap, clean created project, eligible contract, and green dry-run by **12:00 on Day 4**, stop fresh-path work and capture Gravity Tap.

## Web-export possibility

Signal Sweep uses GDScript, code-native shapes, keyboard input, and no external dependencies, so the game concept is compatible with a future single-threaded Web export. That does not make Forge export-ready. Godot still requires a preset and installed matching templates, and Forge has neither. The submission plan therefore treats Web export as a post-core one-hour probe and native gameplay capture as the guaranteed path. See [Export and Publish](EXPORT_AND_PUBLISH_PLAN.md).

## Proof-game acceptance

- A first-time viewer understands the action and success state within ten seconds.
- Quest 1 is a real delta from the starter and completes through generated Codex work.
- The approved source boundary is no more than three existing files.
- Automated proof and creator confirmation are both recorded and clearly distinct.
- Completion survives restart and identifies a real local Git commit.
- No sample, unrelated generated project, showcase, or release tag is mutated.
