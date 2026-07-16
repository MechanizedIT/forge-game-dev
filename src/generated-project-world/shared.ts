import type {
  ChronicleV2,
  GeneratedProjectStateAny,
  GeneratedQuestArtifactV2,
  GeneratedRoadmapV2,
  IdeaSeed,
  ProjectModel,
  AcceptedSystemQuestPlan,
  ProjectArchitecture,
  GameAreaMutation,
} from "../contracts/index.js";
import type { GeneratedQuestEligibility, GeneratedQuestRunSnapshot } from "../generated-quest-runner/shared.js";
import type { ArchitectureContextPackage, ArchitectureWarning } from "../project-architecture/service.js";

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
  architecture: ProjectArchitecture;
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
  presentation: ForgePresentationState;
  assets: ForgeProjectAsset[];
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

export type ForgeAssetCategory = "images" | "audio" | "scenes" | "scripts" | "other";

export interface ForgeProjectAsset {
  relativePath: string;
  name: string;
  category: ForgeAssetCategory;
  size: number;
  previewUrl: string | null;
}

export interface ForgePresentationEntityOverride {
  name?: string | undefined;
  description?: string | undefined;
  outcome?: string | undefined;
  acceptanceCriteria?: string[] | undefined;
  imageRef?: string | undefined;
}

export interface ForgeTunable {
  tunableId: string;
  entityId: string;
  label: string;
  filePath: string;
  propertyName: string;
  valueType: "number" | "boolean";
  value: number | boolean;
  defaultValue: number | boolean;
  minimum?: number | undefined;
  maximum?: number | undefined;
}

export type ForgePlaytestResult = "worked" | "needs_change" | "broken" | "not_sure";

export interface ForgePresentationHistoryEntry {
  entryId: string;
  occurredAt: string;
  entityId: string;
  worldId?: string | undefined;
  experienceId?: string | undefined;
  stepId?: string | undefined;
  workAttemptId?: string | undefined;
  type: "playtest" | "change_request" | "repair" | "tuning" | "image" | "edit";
  summary: string;
  note?: string | undefined;
  result?: ForgePlaytestResult | undefined;
  linkedFollowUpId?: string | undefined;
  relatedFiles: string[];
}

export interface ForgePresentationState {
  schemaVersion: 1;
  projectId: string;
  entities: Record<string, ForgePresentationEntityOverride>;
  tunables: ForgeTunable[];
  history: ForgePresentationHistoryEntry[];
}

export type ForgePresentationMutation =
  | { action: "edit_entity"; entityId: string; name: string; description: string; outcome: string; acceptanceCriteria: string[] }
  | { action: "choose_image"; entityId: string; relativePath: string }
  | { action: "restore_image"; entityId: string }
  | { action: "record_feedback"; entityId: string; result: ForgePlaytestResult; note: string; relatedFiles: string[] }
  | { action: "link_feedback"; entryId: string; followUpId: string }
  | { action: "save_tunable"; tunable: ForgeTunable }
  | { action: "reset_tunable"; tunableId: string };

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
  architectureContext: ArchitectureContextPackage;
  architectureWarnings: ArchitectureWarning[];
}

export type { GameAreaMutation };
