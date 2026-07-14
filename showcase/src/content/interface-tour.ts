import type { InterfaceConcept } from "./types";

export const interfaceTour: InterfaceConcept[] = [
  { name: "Launchpad", accent: "ember", what: "The starting place for the sample, a new game, or a recent project.", when: "At launch.", action: "Choose the journey you want to continue.", notMeaning: "It does not scan or upload projects." },
  { name: "Project World", accent: "cyan", what: "A visual view of what is playable, verified, and ahead.", when: "After choosing or reopening a project.", action: "Read the world and select one quest.", notMeaning: "Its code-native preview is not a captured game frame." },
  { name: "Roadmap", accent: "ember", what: "An ordered path of small quests with tangible outcomes.", when: "Inside Project World and blueprints.", action: "Choose the next bounded result.", notMeaning: "A planned node is not implemented work." },
  { name: "Quest Forge", accent: "ember", what: "The approval gate for scope, files, proof, and playtesting.", when: "Before Codex may build the sample quest.", action: "Approve the exact contract or leave unchanged.", notMeaning: "Opening it does not start Codex." },
  { name: "Forge Companion", accent: "cyan", what: "Plain-language guidance about the current state and next decision.", when: "Beside the active work.", action: "Use it to understand what Forge needs from you.", notMeaning: "It is not an autonomous chat agent." },
  { name: "Proof", accent: "cyan", what: "Evidence that files stayed bounded and technical checks passed.", when: "After implementation and verification.", action: "Review what changed and what passed.", notMeaning: "Technical proof is not gameplay approval." },
  { name: "Playtest Gate", accent: "ember", what: "The point where automation stops and creator judgment begins.", when: "After automated proof passes.", action: "Play, observe, and explicitly confirm or reject.", notMeaning: "Closing Godot does not count as success." },
  { name: "Chronicle", accent: "mint", what: "A persistent record of meaningful events and decisions.", when: "After progress is saved.", action: "Revisit what the project learned and completed.", notMeaning: "It is not raw terminal or chat history." },
  { name: "Idea Seeds", accent: "violet", what: "Saved possibilities for later planning.", when: "Inside a generated Project World.", action: "Capture an idea without interrupting current work.", notMeaning: "A seed does not silently change the roadmap." },
];
