import type {
  ChronicleV2,
  GeneratedProjectStateAny,
  GeneratedQuestArtifactV2,
  GeneratedRoadmapV2,
  IdeaSeed,
  ProjectModel,
  AcceptedSystemQuestPlan,
} from "../contracts/index.js";
import type { GeneratedQuestEligibility, GeneratedQuestRunSnapshot } from "../generated-quest-runner/shared.js";

export type GeneratedWorldView = Exclude<GeneratedProjectStateAny["currentView"], "project_created">;

export interface GeneratedProjectIdentity {
  projectId: string;
  displayName: string;
  foundation: "top_down_arena" | "open_godot";
  foundationLabel: "Top-down Arena" | "Open Godot project";
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
  successMarker: "FORGE_TOP_DOWN_ARENA_VERIFY_OK" | "FORGE_OPEN_GODOT_VERIFY_OK";
}

export interface GeneratedQuestBrief extends GeneratedQuestArtifactV2 {
  outcomeLabel: "Generated intended outcome";
  whyItMatters: string;
  implementationLabel: string;
  eligibility: GeneratedQuestEligibility;
  run: GeneratedQuestRunSnapshot | null;
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
  projectModel: ProjectModel;
  systemQuestPlan: AcceptedSystemQuestPlan | null;
  vision: {
    vision: string;
    coreAction: string;
    funTarget: string;
    inputMode: string;
    smallestPlayableResult: string;
  };
  /** @deprecated Compatibility transport for the current generated-project UI. */
  starterAwarePlanning: {
    accepted: boolean;
    acceptedRoadmapFingerprint: string | null;
    alreadyPlayable: string[];
  };
  playable: GeneratedPlayableTruth;
  firstPlayable: {
    title: "First Playable";
    outcome: string;
    questIds: string[];
  };
  /** @deprecated Use projectModel.systems and projectModel.quests. */
  roadmap: GeneratedRoadmapV2;
  /** @deprecated Use projectModel.quests and projectModel.workSessions. */
  quests: GeneratedQuestBrief[];
  state: {
    currentView: GeneratedWorldView;
    selectedQuestId: string | null;
    nextRecommendedQuestId: string | null;
    repairNotice: string | null;
  };
  chronicle: ChronicleV2;
  ideaSeeds: IdeaSeed[];
  activity: GeneratedActivity[];
  documents: GeneratedDocumentDisclosure[];
  actions: {
    launchGodot: true;
    openFolder: true;
    saveIdea: true;
    generatedQuestImplementation: boolean;
  };
}

export interface GeneratedWorldStateInput {
  currentView: GeneratedWorldView;
  selectedQuestId: string | null;
}

export interface GeneratedIdeaSaveResponse {
  seed: IdeaSeed;
  activity: Extract<GeneratedActivity, { source: "derived_idea_activity" }>;
}

export interface GeneratedLaunchResponse {
  launched: true;
  message: string;
}

export interface SystemQuestFileCandidate {
  relativePath: string;
  size: number;
  sha256: string;
}

export interface SystemQuestWorkOrderReview {
  questId: string;
  title: string;
  playerVisibleOutcome: string;
  doneWhen: string[];
  excludedScope: string[];
  existingFiles: string[];
  newFiles: string[];
  fingerprint: string;
}
