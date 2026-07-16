import type { ForgeEntity, ForgeWorldState } from "./model.js";

function entity(input: ForgeEntity): ForgeEntity {
  return input;
}

const entities = [
  entity({
    id: "rust-runner", kind: "world", parentId: null,
    childIds: ["run-and-jump", "dodge-obstacles", "collect-scrap", "upgrade-thrusters"],
    name: "Rust Runner",
    description: "A casual endless side-scroller where a small robot runs across an alien planet, gathers upgrade parts, and reaches new themed biomes.",
    outcome: "Make a welcoming run, jump, salvage, and upgrade loop that grows into a colorful alien journey.",
    imageRef: "world-rust-runner", status: "building", progress: 50,
    relatedFiles: ["project.godot", "scenes/runner.tscn"],
    acceptanceCriteria: ["The first run is easy to understand.", "A player can see what to build next."],
  }),
  entity({
    id: "crash-landing", kind: "region", parentId: "rust-runner",
    childIds: ["wreck-site", "hopper-ridge", "salvage-camp", "relay-station"],
    name: "Crash Landing",
    description: "The opening biome where the robot crash-lands and learns the basic run, jump, salvage, and upgrade loop.",
    outcome: "The player survives a short run, gathers salvage, and installs a first upgrade.",
    imageRef: "region-crash", status: "building", progress: 70,
    relatedFiles: ["scenes/crash_landing.tscn"],
    acceptanceCriteria: ["Movement is playable.", "The first reward is understandable."],
  }),
  entity({
    id: "scrap-plains", kind: "region", parentId: "rust-runner", childIds: [],
    name: "Scrap Plains", description: "Longer runs, moving hazards, more salvage, and a stronger sense of speed.",
    outcome: "Turn the starter loop into a satisfying longer run.", imageRef: "region-scrap",
    status: "ready", progress: 45, relatedFiles: [], acceptanceCriteria: ["Long runs stay readable."],
  }),
  entity({
    id: "crystal-canyons", kind: "region", parentId: "rust-runner", childIds: [],
    name: "Crystal Canyons", description: "Purple alien canyons with larger gaps, magnetic pickups, and improved jump abilities.",
    outcome: "Introduce a fresh biome and a meaningful movement upgrade.", imageRef: "region-crystal",
    status: "planned", progress: 25, relatedFiles: [], acceptanceCriteria: ["The biome feels distinct."],
  }),
  entity({
    id: "neon-ruins", kind: "region", parentId: "rust-runner", childIds: [],
    name: "Neon Ruins", description: "Advanced hazards, glowing technology, stronger upgrades, and late-game variety.",
    outcome: "Prove the runner can support a dramatic late-game milestone.", imageRef: "region-neon",
    status: "planned", progress: 0, relatedFiles: [], acceptanceCriteria: ["Late-game goals stay readable."],
  }),
  entity({
    id: "wreck-site", kind: "town", parentId: "crash-landing",
    childIds: ["run-and-jump", "dodge-obstacles", "collect-scrap", "upgrade-thrusters"],
    name: "Wreck Site", description: "A busy salvage hub built around the robot’s crashed ship and the first playable abilities.",
    outcome: "Group the first movement, obstacle, collection, and upgrade outcomes in one clear hub.",
    imageRef: "town-wreck", status: "building", progress: 75,
    relatedFiles: ["scenes/wreck_site.tscn"], acceptanceCriteria: ["The starter loop can be played here."],
  }),
  entity({
    id: "hopper-ridge", kind: "town", parentId: "crash-landing", childIds: [],
    name: "Hopper Ridge", description: "A rocky route for timing jumps over widening gaps.",
    outcome: "Teach jump timing without punishing new players.", imageRef: "town-hopper",
    status: "ready", progress: 50, relatedFiles: [], acceptanceCriteria: ["Jumps teach through play."],
  }),
  entity({
    id: "salvage-camp", kind: "town", parentId: "crash-landing", childIds: [],
    name: "Salvage Camp", description: "A friendly camp for collecting scrap and understanding upgrades.",
    outcome: "Make rewards and progression feel visible.", imageRef: "town-salvage",
    status: "ready", progress: 50, relatedFiles: [], acceptanceCriteria: ["Rewards are easy to read."],
  }),
  entity({
    id: "relay-station", kind: "town", parentId: "crash-landing", childIds: [],
    name: "Relay Station", description: "The region finale that points the runner toward the Scrap Plains.",
    outcome: "End the opening milestone with a clear next destination.", imageRef: "town-relay",
    status: "planned", progress: 25, relatedFiles: [], acceptanceCriteria: ["The next region is clear."],
  }),
  entity({
    id: "run-and-jump", kind: "building", parentId: "rust-runner",
    childIds: ["add-run-input", "tune-jump-arc", "add-coyote-time", "place-obstacle-lanes"],
    name: "Run & Jump", description: "The first concrete playable slice. The robot can run, jump, and land with a satisfying feel.",
    outcome: "The robot moves with confidence and forgives small timing mistakes.",
    imageRef: "building-run", status: "building", progress: 75,
    relatedFiles: ["scripts/RunnerBot.gd", "scripts/RunnerMovement.gd", "scenes/RunnerBot.tscn"],
    acceptanceCriteria: ["Run input responds immediately.", "Short and long jumps feel predictable.", "Restart preserves the behavior."],
  }),
  entity({
    id: "dodge-obstacles", kind: "building", parentId: "rust-runner", childIds: [],
    name: "Dodge Obstacles", description: "Readable hazards and fair spacing turn movement into a game.",
    outcome: "The player can read and avoid the first obstacle pattern.", imageRef: "building-dodge",
    status: "ready", progress: 50, relatedFiles: [], acceptanceCriteria: ["Hazards feel fair."],
  }),
  entity({
    id: "collect-scrap", kind: "building", parentId: "rust-runner", childIds: [],
    name: "Collect Scrap", description: "A visible pickup loop that rewards exploration and distance.",
    outcome: "Scrap is easy to spot, collect, and count.", imageRef: "building-collect",
    status: "ready", progress: 25, relatedFiles: [], acceptanceCriteria: ["Pickups are readable."],
  }),
  entity({
    id: "upgrade-thrusters", kind: "building", parentId: "rust-runner", childIds: [],
    name: "Upgrade Thrusters", description: "The first upgrade spends salvage on a movement improvement.",
    outcome: "The player feels a clear before-and-after change.", imageRef: "building-upgrade",
    status: "planned", progress: 0, relatedFiles: [], acceptanceCriteria: ["The upgrade has a visible effect."],
  }),
  entity({
    id: "add-run-input", kind: "part", parentId: "run-and-jump", childIds: [],
    name: "Add run input", description: "Connect left and right input to the runner’s movement.",
    outcome: "The robot starts and stops cleanly.", imageRef: "part-run", status: "complete", progress: 100,
    relatedFiles: ["scripts/RunnerBot.gd"], acceptanceCriteria: ["Keyboard input moves the robot.", "Stopping feels immediate."],
  }),
  entity({
    id: "tune-jump-arc", kind: "part", parentId: "run-and-jump", childIds: [],
    name: "Tune jump arc", description: "Adjust jump height, gravity, timing, and landing response until the robot feels satisfying to control.",
    outcome: "Short and long jumps feel readable and pleasant.", imageRef: "part-jump", status: "building", progress: 70,
    relatedFiles: ["scripts/RunnerBot.gd", "scripts/RunnerMovement.gd", "scenes/RunnerBot.tscn"],
    acceptanceCriteria: ["Play the runner scene.", "Compare short and long jumps.", "Confirm behavior after restart."],
  }),
  entity({
    id: "add-coyote-time", kind: "part", parentId: "run-and-jump", childIds: [],
    name: "Add coyote time", description: "Allow a tiny grace window after leaving a ledge.",
    outcome: "Near-miss jumps feel fair.", imageRef: "part-coyote", status: "ready", progress: 40,
    relatedFiles: ["scripts/RunnerMovement.gd"], acceptanceCriteria: ["A late button press still jumps during the grace window."],
  }),
  entity({
    id: "place-obstacle-lanes", kind: "part", parentId: "run-and-jump", childIds: [],
    name: "Place obstacle lanes", description: "Build the first readable platform and hazard sequence.",
    outcome: "The starter route teaches movement through play.", imageRef: "part-obstacles", status: "planned", progress: 20,
    relatedFiles: ["scenes/wreck_site.tscn"], acceptanceCriteria: ["The route has a safe teaching beat."],
  }),
];

export function createRustRunnerFixture(): ForgeWorldState {
  return {
    version: 1,
    worldId: "rust-runner",
    entities: Object.fromEntries(entities.map((item) => [item.id, structuredClone(item)])),
    repairs: [
      {
        id: "obstacle-spacing",
        title: "Obstacle spacing feels unfair",
        description: "Two opening hazards can appear too close together at higher speed.",
        status: "attention",
        entityIds: ["dodge-obstacles", "run-and-jump"],
        reproductionSteps: ["Open the Wreck Site run.", "Reach the second obstacle pair.", "Jump late at normal speed."],
      },
      {
        id: "restart-jump",
        title: "Jump tuning after restart",
        description: "Confirm the new jump values reload consistently.",
        status: "ready",
        entityIds: ["tune-jump-arc"],
        reproductionSteps: ["Play once.", "Restart the scene.", "Compare the jump arc."],
      },
    ],
    activity: [
      { id: "a1", title: "Move Around", detail: "Jump arc tuned", when: "12m", tone: "gold" },
      { id: "a2", title: "Upgrade parts", detail: "New part added", when: "2h", tone: "pink" },
      { id: "a3", title: "Landscape swap", detail: "Repair completed", when: "1d", tone: "green" },
    ],
    updatedAt: new Date().toISOString(),
  };
}
