export type DashboardState =
  | "world_ready"
  | "plan_review"
  | "implementation_running"
  | "ready_to_play"
  | "quest_complete"
  | "blocked"
  | "verification_failed";

export const dashboardStateLabels: Record<DashboardState, string> = {
  world_ready: "World ready",
  plan_review: "Quest brief",
  implementation_running: "Implementation running",
  ready_to_play: "Ready to play",
  quest_complete: "Quest complete",
  blocked: "Blocked preview",
  verification_failed: "Failed preview",
};

export const allowedFiles = ["main.tscn", "scripts/enemy.gd", "scripts/verify_fixture.gd"] as const;

export const implementationSteps = [
  {
    title: "Teach the enemy when the player is nearby",
    description: "Add a clear 220-pixel detection range and a reliable idle-or-chasing state.",
    file: "scripts/enemy.gd",
  },
  {
    title: "Make the reaction visible in the scene",
    description: "Connect the existing player and show IDLE or CHASING above the red enemy.",
    file: "main.tscn",
  },
  {
    title: "Prove the behavior automatically",
    description: "Check idle, detection, chase distance, and the player’s existing movement.",
    file: "scripts/verify_fixture.gd",
  },
  {
    title: "Verify, play, and close the quest",
    description: "Run both approved checks, then ask you to confirm the visible result in Godot.",
    file: "No additional files",
  },
] as const;

export const progressStages = [
  "Inspecting approved files",
  "Preparing the change",
  "Updating the game",
  "Running verification",
  "Preparing the result",
] as const;

export const acceptanceProof = [
  ["AC-1", "Enemy remains idle outside the detection range"],
  ["AC-2", "Enemy detects the player inside the range"],
  ["AC-3", "Enemy closes the distance while chasing"],
  ["AC-4", "Existing player movement still works"],
  ["AC-5", "Project and Godot checks pass"],
] as const;

export const excludedWork = [
  "Combat, damage, or health",
  "Navigation or obstacle avoidance",
  "Multiple targets or enemy types",
  "New art, animation, audio, or broad AI systems",
] as const;
