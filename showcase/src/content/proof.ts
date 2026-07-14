export const proofFacts = {
  source: "docs/evidence/2026-07-14-v0.2-task-7-rehearsal.json",
  fullTests: 89,
  protectedTests: 37,
  automatedScreenshots: 48,
  manualConfirmationScreenshots: 1,
  approvedFilesChanged: 3,
  unexpectedFiles: 0,
  browserIssues: 0,
  viewports: ["1440×900", "768×900", "390×844"],
} as const;

export const proofItems = [
  { label: "Real GPT-5.6 structured planning", source: "src/blueprint-planner/sdk.ts" },
  { label: "Real official Codex SDK execution", source: "src/quest-runner/sdk.ts" },
  { label: "Real controlled Godot project creation", source: "docs/evidence/2026-07-14-v0.2-task-7-real-new-game.json" },
  { label: "Real Godot launch and creator playtest", source: "docs/evidence/2026-07-14-v0.2-task-7-rehearsal.json" },
  { label: "Exact approved file boundaries", source: "docs/evidence/2026-07-14-v0.2-task-7-rehearsal.json" },
  { label: "Automated verification before human judgment", source: "docs/reviews/2026-07-14-v0.2-task-7-hardening-review.md" },
  { label: "Explicit creator confirmation", source: "docs/reviews/2026-07-14-v0.2-task-7-hardening-review.md" },
  { label: "Persistent project state and Chronicle", source: "docs/evidence/2026-07-14-v0.2-task-7-real-new-game.json" },
  { label: "Clean local Git provenance", source: "docs/evidence/2026-07-14-v0.2-task-7-real-new-game.json" },
  { label: "Responsive, accessibility, and clean-clone rehearsal", source: "docs/evidence/2026-07-14-v0.2-task-7-browser-review/README.md" },
] as const;
