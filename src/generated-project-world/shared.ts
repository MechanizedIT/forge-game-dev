import type {
  Chronicle,
  GeneratedProjectState,
  GeneratedQuestArtifact,
  IdeaSeed,
  Roadmap,
} from "../contracts/index.js";

export type GeneratedWorldView = Exclude<GeneratedProjectState["currentView"], "project_created">;

export interface GeneratedProjectIdentity {
  projectId: string;
  displayName: string;
  foundation: "top_down_arena";
  foundationLabel: "Top-down Arena";
  engineLabel: string;
  starterVersion: string;
  createdAt: string;
  lastOpenedAt: string;
}

export interface GeneratedPlayableTruth {
  previewLabel: "Playable-state preview";
  layoutLabel: "Verified starter layout";
  summary: string;
  facts: string[];
  plannedNotPlayable: string[];
  godotVersion: string;
  verifiedAt: string;
  successMarker: "FORGE_TOP_DOWN_ARENA_VERIFY_OK";
}

export interface GeneratedQuestBrief extends GeneratedQuestArtifact {
  outcomeLabel: "Generated intended outcome";
  whyItMatters: string;
  implementationLabel: "Quest planned · Codex implementation not enabled yet";
}

export interface GeneratedDocumentDisclosure {
  label: string;
  relativePath: string;
  owner: string;
}

export type GeneratedActivity = {
  activityId: string;
  occurredAt: string;
  summary: string;
  source: "authoritative_chronicle";
  label: "Chronicle event";
} | {
  activityId: string;
  occurredAt: string;
  summary: string;
  source: "derived_idea_activity";
  label: "Idea activity · derived from saved seed";
  ideaSeedId: string;
};

export interface GeneratedProjectWorldSnapshot {
  project: GeneratedProjectIdentity;
  vision: {
    vision: string;
    coreAction: string;
    funTarget: string;
    inputMode: string;
    smallestPlayableResult: string;
  };
  playable: GeneratedPlayableTruth;
  firstPlayable: {
    title: "First Playable";
    outcome: string;
    questIds: string[];
  };
  roadmap: Roadmap;
  quests: GeneratedQuestBrief[];
  state: {
    currentView: GeneratedWorldView;
    selectedQuestId: string;
    repairNotice: string | null;
  };
  chronicle: Chronicle;
  ideaSeeds: IdeaSeed[];
  activity: GeneratedActivity[];
  documents: GeneratedDocumentDisclosure[];
  actions: {
    launchGodot: true;
    openFolder: true;
    saveIdea: true;
    generatedQuestImplementation: false;
  };
}

export interface GeneratedWorldStateInput {
  currentView: GeneratedWorldView;
  selectedQuestId: string;
}

export interface GeneratedIdeaSaveResponse {
  seed: IdeaSeed;
  activity: Extract<GeneratedActivity, { source: "derived_idea_activity" }>;
}

export interface GeneratedLaunchResponse {
  launched: true;
  message: string;
}
