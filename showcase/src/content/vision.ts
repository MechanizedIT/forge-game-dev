import type { CapabilityClaim } from "./types";

export const capabilities: CapabilityClaim[] = [
  { id: "sample-loop", label: "Sample end-to-end Codex quest loop", description: "Approval, official SDK work, proof, playtest, confirmation, and persistence.", horizon: "working-now", source: "docs/evidence/2026-07-14-v0.2-task-7-rehearsal.json" },
  { id: "gpt-planning", label: "GPT-5.6 blueprint planning", description: "Structured, schema-validated planning for one supported 2D foundation.", horizon: "working-now", source: "docs/evidence/2026-07-14-v0.2-task-7-real-new-game.json" },
  { id: "project-creation", label: "Controlled Godot starter creation", description: "Forge-owned files, fixed verification, project registration, and restart.", horizon: "working-now", source: "docs/evidence/2026-07-14-v0.2-task-7-real-new-game.json" },
  { id: "persistent-world", label: "Persistent Project World", description: "Roadmap, quest briefs, documents, Chronicle, idea seeds, and local Git provenance.", horizon: "working-now", source: "docs/evidence/2026-07-14-v0.2-task-7-real-new-game.json" },
  { id: "responsive-ui", label: "Responsive Living Game Workshop", description: "Desktop, tablet, mobile, focus, recovery, and reduced-motion review.", horizon: "working-now", source: "docs/evidence/2026-07-14-v0.2-task-7-browser-review/README.md" },
  { id: "generated-build", label: "Generated-quest implementation", description: "Bring the bounded Codex build loop to approved quests from generated projects.", horizon: "next" },
  { id: "foundations", label: "More starter foundations", description: "Expand beyond the single Top-down Arena starter after the current path remains reliable.", horizon: "next" },
  { id: "import", label: "Existing-project import and richer inspection", description: "Understand established projects through explicit, controlled discovery.", horizon: "next" },
  { id: "verification", label: "Stronger game-specific verification", description: "Add mechanic-aware proof and optional live Godot editor context.", horizon: "next" },
  { id: "refinement", label: "Richer idea-to-quest refinement", description: "Turn saved possibilities into reviewable quests without silently approving work.", horizon: "next" },
  { id: "operating-environment", label: "Visual operating environment for long-running human-AI projects", description: "Decompose complex ideas into understandable, tangible milestones with clear ownership.", horizon: "future" },
  { id: "specialized-agents", label: "Specialized, focused AI roles", description: "Intent, context, planning, implementation, review, documentation, and communication use short focused contexts.", horizon: "future" },
  { id: "structured-memory", label: "Structured memory and deterministic retrieval", description: "Evidence-backed progress replaces chat-only claims while local tools remain under creator control.", horizon: "future" },
  { id: "hosted-control-plane", label: "Optional hosted control plane with a secure local companion", description: "Remote coordination could remain permissioned and auditable while project files, Codex, Godot, Git, and OS actions stay local.", horizon: "future" },
  { id: "beyond-games", label: "Applicable beyond games", description: "Game development remains the current focus; the workflow may later support other complex creative projects.", horizon: "future" },
];

export const knownLimitations = [
  "The full Forge application currently runs locally on Windows.",
  "The bundled sample and one Top-down Arena starter are the supported proof paths.",
  "Live GPT-5.6 planning and Codex implementation require authorized access and internet connectivity.",
  "Generated quest implementation is intentionally not enabled in Forge v0.2.",
  "This showcase is a guided replay; it cannot run Codex, launch Godot, access files, modify games, or persist visitor projects.",
] as const;
