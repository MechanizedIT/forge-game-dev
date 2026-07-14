export type SystemLabel = "Creator" | "Forge" | "Codex" | "GPT-5.6" | "Godot" | "Git";

export type EvidenceClassification =
  | "Real Forge application state"
  | "Real Godot state"
  | "Decorative generated illustration"
  | "Code-native product illustration";

export interface EvidenceAsset {
  id: string;
  publicPath: string;
  sourcePath: string;
  state: string;
  task: string;
  sourceCommit: string;
  captureDate: string;
  classification: EvidenceClassification;
  publicSafe: true;
  alt: string;
}
export interface WalkthroughStep {
  id: string;
  title: string;
  summary: string;
  why: string;
  systems: SystemLabel[];
  evidenceId: string;
  technicalProof: string;
}

export interface Walkthrough {
  id: "sample" | "new-game";
  title: string;
  shortTitle: string;
  summary: string;
  proves: string[];
  steps: WalkthroughStep[];
}

export interface InterfaceConcept {
  name: string;
  accent: "ember" | "cyan" | "violet" | "mint";
  what: string;
  when: string;
  action: string;
  notMeaning: string;
}

export interface CapabilityClaim {
  id: string;
  label: string;
  description: string;
  horizon: "working-now" | "next" | "future";
  source?: string;
}
