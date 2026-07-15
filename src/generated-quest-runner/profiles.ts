import type { GeneratedQuestArtifactV2, GeneratedVerificationProfile } from "../contracts/index.js";

export interface GeneratedProfileDefinition {
  id: GeneratedVerificationProfile;
  preparedQuestId: string | null;
  minimumRevision: number;
  pendingProofSummary: string;
  mechanicProofSummary: string;
  creatorSuccessSummary: string;
  steps: Array<{ id: string; summary: string }>;
  acceptanceCriteria: Array<{ id: string; criterion: string; proofReferences: Array<"boundary" | "project_health" | "mechanic" | "creator"> }>;
  creatorPlaySteps: string[];
  risksAndAssumptions: string[];
  contextInstructions: string[];
}

export const generatedProfileCatalog: Record<GeneratedVerificationProfile, GeneratedProfileDefinition> = {
  gravity_orb_presence_v1: {
    id: "gravity_orb_presence_v1",
    preparedQuestId: "q1-enter-the-arena",
    minimumRevision: 2,
    pendingProofSummary: "Waiting for the Forge-owned gravity orb proof.",
    mechanicProofSummary: "Forge found exactly one visible gravity orb through its repository-owned profile.",
    creatorSuccessSummary: "The creator confirmed the visible gravity orb in the real game.",
    steps: [
      { id: "STEP-1", summary: "Make the existing objective unmistakably read as one gravity orb while preserving the controlled starter structure." },
      { id: "STEP-2", summary: "Expose the stable Forge gravity-orb observable used by the repository-owned mechanic proof." },
    ],
    acceptanceCriteria: [
      { id: "AC-1", criterion: "The opening arena visibly contains exactly one clearly identifiable gravity orb.", proofReferences: ["boundary", "mechanic", "creator"] },
      { id: "AC-2", criterion: "The controlled arena, player, keyboard movement, and project load remain healthy.", proofReferences: ["project_health", "creator"] },
    ],
    creatorPlaySteps: ["Launch the real game from Forge.", "Confirm the opening arena contains one obvious gravity orb.", "Move the player and confirm the starter still behaves normally.", "Return to Forge and choose the truthful result."],
    risksAndAssumptions: ["The objective node name remains stable so the controlled starter verifier is not weakened.", "No gravity interaction, scoring, new file, dependency, or external asset is part of this quest."],
    contextInstructions: ["Expose exactly one stable mechanic observable by adding metadata forge_role = \"gravity_orb\" to the existing ObjectiveMarker node.", "Make the visible objective copy and code-native drawing clearly describe one gravity orb. Do not add gravity interaction in this quest."],
  },
  relay_activation_v1: {
    id: "relay_activation_v1",
    preparedQuestId: null,
    minimumRevision: 1,
    pendingProofSummary: "Waiting for the Forge-owned signal relay activation proof.",
    mechanicProofSummary: "Forge observed one existing relay move from inactive to activated through its repository-owned profile.",
    creatorSuccessSummary: "The creator confirmed the signal relay activation in the real game.",
    steps: [
      { id: "STEP-1", summary: "Give the existing ObjectiveMarker one explicit inactive signal-relay state without changing the controlled starter structure." },
      { id: "STEP-2", summary: "Activate that existing relay when the player enters it and expose the stable Forge relay observable." },
      { id: "STEP-3", summary: "Render a clear code-native activated response while preserving movement, arena, camera, and objective ownership." },
    ],
    acceptanceCriteria: [
      { id: "AC-1", criterion: "The existing signal relay begins inactive and becomes activated through the bounded relay activation function.", proofReferences: ["boundary", "mechanic", "creator"] },
      { id: "AC-2", criterion: "The controlled arena, player, keyboard movement, camera, and ObjectiveMarker remain healthy.", proofReferences: ["project_health", "creator"] },
    ],
    creatorPlaySteps: ["Launch the real game from Forge.", "Move the player into the existing signal relay.", "Confirm the relay changes once to a clear activated state.", "Move again and confirm the starter remains responsive.", "Return to Forge and choose the truthful result."],
    risksAndAssumptions: ["The ObjectiveMarker name and script path remain stable.", "Only the existing main scene, main script, and objective visual script may change.", "No new relay, scoring, timer, external asset, or quest-completion claim is part of this contract."],
    contextInstructions: ["Keep exactly one ObjectiveMarker and mark it with forge_role = \"signal_relay\" plus relay_state = \"inactive\" before activation.", "Implement a stable no-argument activate_signal_relay method on Main that changes only that existing relay to relay_state = \"activated\" and updates its code-native visual response.", "Connect the existing relay so player entry calls the same activation method. Do not add files, scoring, timers, or multiple relays."],
  },
};

export function profileForQuest(quest: GeneratedQuestArtifactV2): GeneratedProfileDefinition | null {
  if (!quest.verificationProfile) return null;
  const profile = generatedProfileCatalog[quest.verificationProfile];
  if (!profile || (profile.preparedQuestId !== null && quest.questId !== profile.preparedQuestId) || quest.sequence !== 1 || quest.revision < profile.minimumRevision) return null;
  return profile;
}
