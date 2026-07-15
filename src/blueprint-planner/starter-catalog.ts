import { createHash } from "node:crypto";

import {
  acceptedRoadmapSchema,
  blueprintProposalSchema,
  type AcceptedRoadmap,
  type AcceptedRoadmapQuest,
  type BlueprintProposal,
  type CreatorRevisionEvent,
  type GameBlueprint,
} from "../contracts/index.js";

export const TOP_DOWN_ARENA_STARTER = { id: "top-down-arena", version: "1.0.0" } as const;

export const TOP_DOWN_ARENA_FACTS = [
  { factId: "bounded-arena", statement: "A bounded code-native arena and camera are already present." },
  { factId: "player-movement", statement: "Keyboard movement is already verified by the controlled starter." },
  { factId: "objective-marker", statement: "One visible objective marker already exists in the opening arena." },
] as const;

const signalDeltas: Record<string, Omit<AcceptedRoadmapQuest, "reference" | "dependsOn"> & { defaultDependencyId: string | null }> = {
  "signal-relay-activation": {
    catalogDeltaId: "signal-relay-activation",
    title: "Activate the Signal Relay",
    visibleOutcome: "Crossing the existing relay activates it once with a clear code-native visual response.",
    whyItMatters: "This adds the first real Signal Sweep mechanic instead of relabeling starter movement or scenery.",
    currentPlayableFacts: ["The objective marker is visible, but it has no activation state or relay response."],
    scope: {
      included: ["One activation state on the existing relay", "One clear code-native activation response", "Existing starter files only"],
      excluded: ["New files", "External assets", "Scoring", "Multiple relays", "Quest completion claims"],
    },
    acceptanceCriteria: [
      { id: "AC-1", criterion: "The existing relay changes from inactive to active when the player enters it.", verificationIds: ["V-1"] },
      { id: "AC-2", criterion: "The controlled arena, player movement, camera, and objective node remain healthy.", verificationIds: ["V-2"] },
    ],
    verificationIdeas: [
      { id: "V-1", idea: "Use the Forge-owned relay_activation_v1 proof to observe inactive and activated relay states." },
      { id: "V-2", idea: "Run the controlled starter health proof and later ask the creator to inspect the real game." },
    ],
    editableFileRoles: ["main_scene", "main_script", "objective_visual"],
    verificationProfile: "relay_activation_v1",
    implementationReadiness: "registered_existing_files",
    defaultDependencyId: null,
  },
  "signal-response": {
    catalogDeltaId: "signal-response",
    title: "Carry the Signal Response",
    visibleOutcome: "Activation sends one readable response across the arena so the relay result is unmistakable.",
    whyItMatters: "A visible response turns one trigger into an understandable cause-and-effect beat.",
    currentPlayableFacts: ["The starter has static code-native visuals but no post-activation signal response."],
    scope: { included: ["One activation response"], excluded: ["External assets", "Audio pipeline", "Verifier claims"] },
    acceptanceCriteria: [{ id: "AC-3", criterion: "Relay activation produces one readable arena response.", verificationIds: ["V-3"] }],
    verificationIdeas: [{ id: "V-3", idea: "Inspect the response during a later separately planned proof pass." }],
    editableFileRoles: [], verificationProfile: null, implementationReadiness: "planned_unverified", defaultDependencyId: "signal-relay-activation",
  },
  "signal-sweep-loop": {
    catalogDeltaId: "signal-sweep-loop",
    title: "Complete the Signal Sweep",
    visibleOutcome: "The player can repeat a clear approach, activation, and response loop in the bounded arena.",
    whyItMatters: "The repeatable sweep makes the small prototype feel like one complete playable idea.",
    currentPlayableFacts: ["Movement is repeatable, but no relay activation loop exists yet."],
    scope: { included: ["One repeatable relay loop"], excluded: ["Multiple levels", "Progression", "Verifier claims"] },
    acceptanceCriteria: [{ id: "AC-4", criterion: "The relay loop can be repeated without breaking movement or arena state.", verificationIds: ["V-4"] }],
    verificationIdeas: [{ id: "V-4", idea: "Repeat the approach and activation loop twice in a future proof run." }],
    editableFileRoles: [], verificationProfile: null, implementationReadiness: "planned_unverified", defaultDependencyId: "signal-response",
  },
  "signal-countdown": {
    catalogDeltaId: "signal-countdown",
    title: "Add Relay Pressure",
    visibleOutcome: "A short visible countdown makes reaching the relay feel urgent without adding a broader progression system.",
    whyItMatters: "Time pressure provides one optional tension layer after the core sweep works.",
    currentPlayableFacts: ["The starter has no countdown or timed relay state."],
    scope: { included: ["One visible countdown"], excluded: ["Leaderboards", "Currencies", "Verifier claims"] },
    acceptanceCriteria: [{ id: "AC-5", criterion: "A readable countdown governs one relay attempt.", verificationIds: ["V-5"] }],
    verificationIdeas: [{ id: "V-5", idea: "Observe one countdown success and one timeout in a future proof run." }],
    editableFileRoles: [], verificationProfile: null, implementationReadiness: "planned_unverified", defaultDependencyId: "signal-sweep-loop",
  },
};

const requiredDeltaOutcome: Record<string, RegExp> = {
  "signal-relay-activation": /activat|inactive|state|response/iu,
  "signal-response": /signal|response|react/iu,
  "signal-sweep-loop": /repeat|loop|again/iu,
  "signal-countdown": /countdown|timer|timed|urgent/iu,
};

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => [key, stableValue(child)]));
  return value;
}

export function fingerprintAcceptedRoadmap(value: Pick<AcceptedRoadmap, "approvedBlueprintSha256" | "starter" | "alreadyPlayable" | "quests" | "optionalDeltaIds" | "revision">): string {
  const authority = {
    approvedBlueprintSha256: value.approvedBlueprintSha256,
    starter: value.starter,
    alreadyPlayable: value.alreadyPlayable,
    quests: value.quests,
    optionalDeltaIds: value.optionalDeltaIds,
    revision: value.revision,
  };
  return createHash("sha256").update(JSON.stringify(stableValue(authority)), "utf8").digest("hex");
}

function proposalFit(originalIdea: string): BlueprintProposal["foundationFit"] {
  const normalized = originalIdea.toLowerCase();
  if (/visual novel|card game|turn[- ]based|3d|first[- ]person|multiplayer/u.test(normalized)) {
    return { level: "poor", explanation: "The core format is outside Forge's single verified Top-down Arena starter; only a small arena reinterpretation is supported." };
  }
  if (/platformer|side[- ]view|jump|rooftop/u.test(normalized)) {
    return { level: "partial", explanation: "The signal or action loop can fit one arena, but side-view platforming and jumping are not supported by this starter." };
  }
  return { level: "strong", explanation: "The idea fits one bounded Top-down Arena using the verified Godot 4, 2D, GDScript starter." };
}

export function buildBlueprintProposal(originalIdea: string, blueprint: GameBlueprint): BlueprintProposal {
  const foundationFit = proposalFit(originalIdea);
  const proposal = {
    schemaVersion: 1 as const,
    originalIdea: originalIdea.trim(),
    recommendedInterpretation: `A supported Top-down Arena version: ${blueprint.vision}`,
    foundationFit,
    tradeoffs: foundationFit.level === "strong"
      ? ["Forge keeps the first playable inside one bounded arena and uses code-native visuals."]
      : ["Forge changes the presentation to top-down arena movement.", "Unsupported foundation-specific mechanics are excluded from the first playable."],
    alternatives: [
      { id: "accept-top-down", title: "Use the supported arena", interpretation: blueprint.vision, consequence: "Continues with the verified Top-down Arena starter." },
      { id: "revise-idea", title: "Revise the concept", interpretation: "Adjust the core action or smallest playable result before creation.", consequence: "Uses one bounded planning revision and creates no files." },
      ...(foundationFit.level === "poor" ? [{ id: "reject-plan", title: "Keep the original format", interpretation: "Reject this Forge interpretation.", consequence: "Creates nothing and waits for a suitable future starter." }] : []),
    ],
    blueprint,
  };
  return blueprintProposalSchema.parse(proposal);
}

function catalogQuest(deltaId: string, reference: AcceptedRoadmapQuest["reference"], referencesByDelta: ReadonlyMap<string, AcceptedRoadmapQuest["reference"]>): AcceptedRoadmapQuest {
  const delta = signalDeltas[deltaId];
  if (!delta) throw new Error(`Unknown Forge-owned delta: ${deltaId}`);
  const { defaultDependencyId, ...body } = delta;
  return { ...structuredClone(body), reference, dependsOn: defaultDependencyId ? [referencesByDelta.get(defaultDependencyId)!] : [] };
}

export function createSignalSweepRoadmap(approvedBlueprintSha256: string, blueprint: GameBlueprint, revisionEvents: CreatorRevisionEvent[] = []): AcceptedRoadmap {
  const searchable = `${blueprint.projectName} ${blueprint.vision} ${blueprint.coreAction} ${blueprint.quests.map((quest) => `${quest.title} ${quest.visibleOutcome}`).join(" ")}`;
  if (!/signal|relay/u.test(searchable.toLowerCase())) throw new Error("Forge has no registered starter-delta catalog for this blueprint. Revise it to the bounded Signal Sweep proof or reject it.");
  const ids = ["signal-relay-activation", "signal-response", "signal-sweep-loop"];
  const referencesByDelta = new Map(ids.map((id, index) => [id, `Q${index + 1}` as AcceptedRoadmapQuest["reference"]]));
  const quests = ids.map((id) => catalogQuest(id, referencesByDelta.get(id)!, referencesByDelta));
  const authority = {
    approvedBlueprintSha256,
    starter: TOP_DOWN_ARENA_STARTER,
    alreadyPlayable: [...TOP_DOWN_ARENA_FACTS],
    quests,
    optionalDeltaIds: ["signal-countdown"],
    revision: revisionEvents.length + 1,
  };
  return acceptedRoadmapSchema.parse({ schemaVersion: 1, ...authority, revisionEvents, fingerprint: fingerprintAcceptedRoadmap(authority), acceptedAt: null });
}

export function validateAcceptedRoadmap(value: unknown, expectedBlueprintSha256?: string): AcceptedRoadmap {
  const roadmap = acceptedRoadmapSchema.parse(value);
  if (expectedBlueprintSha256 && roadmap.approvedBlueprintSha256 !== expectedBlueprintSha256) throw new Error("Accepted roadmap blueprint approval is stale.");
  if (roadmap.fingerprint !== fingerprintAcceptedRoadmap(roadmap)) throw new Error("Accepted roadmap fingerprint is stale.");
  for (const quest of roadmap.quests) {
    const catalog = signalDeltas[quest.catalogDeltaId];
    if (!catalog) throw new Error(`Quest ${quest.reference} is not a Forge-owned starter delta.`);
    if (TOP_DOWN_ARENA_FACTS.some((fact) => fact.factId === quest.catalogDeltaId)) throw new Error(`Quest ${quest.reference} duplicates verified starter behavior.`);
    if (JSON.stringify(quest.currentPlayableFacts) !== JSON.stringify(catalog.currentPlayableFacts)) throw new Error(`Quest ${quest.reference} has untrusted starter reconciliation.`);
    if (!requiredDeltaOutcome[quest.catalogDeltaId]?.test(quest.visibleOutcome) || TOP_DOWN_ARENA_FACTS.some((fact) => fact.statement.toLowerCase() === quest.visibleOutcome.toLowerCase())) {
      throw new Error(`Quest ${quest.reference} restates starter behavior instead of a visible catalog delta.`);
    }
  }
  return roadmap;
}

export type RoadmapEdit =
  | { kind: "quest_title_changed"; reference: string; title: string }
  | { kind: "quest_outcome_changed"; reference: string; visibleOutcome: string }
  | { kind: "quest_removed"; reference: string }
  | { kind: "quest_reordered"; references: string[] }
  | { kind: "optional_delta_added"; deltaId: string };

export function reviseAcceptedRoadmap(currentValue: unknown, edit: RoadmapEdit, occurredAt: string): AcceptedRoadmap {
  const current = validateAcceptedRoadmap(currentValue);
  if (current.acceptedAt) throw new Error("An accepted roadmap is immutable provenance.");
  if (current.revisionEvents.length >= 3) throw new Error("The three permitted pre-creation revisions have already been used.");
  let quests = structuredClone(current.quests);
  let optionalDeltaIds = [...current.optionalDeltaIds];
  let target = "roadmap";
  if (edit.kind === "quest_title_changed" || edit.kind === "quest_outcome_changed") {
    const index = quests.findIndex((quest) => quest.reference === edit.reference);
    if (index < 0) throw new Error(`Unknown quest ${edit.reference}.`);
    target = edit.reference;
    quests[index] = edit.kind === "quest_title_changed" ? { ...quests[index]!, title: edit.title.trim() } : { ...quests[index]!, visibleOutcome: edit.visibleOutcome.trim() };
  } else if (edit.kind === "quest_removed") {
    if (quests.length <= 3) throw new Error("An accepted roadmap needs at least three planned deltas.");
    if (quests.some((quest) => quest.dependsOn.includes(edit.reference as AcceptedRoadmapQuest["reference"]))) throw new Error(`Remove dependent quests before removing ${edit.reference}.`);
    target = edit.reference;
    quests = quests.filter((quest) => quest.reference !== edit.reference);
  } else if (edit.kind === "quest_reordered") {
    if (edit.references.length !== quests.length || new Set(edit.references).size !== quests.length) throw new Error("Reorder must include every quest exactly once.");
    const byReference = new Map(quests.map((quest) => [quest.reference, quest]));
    quests = edit.references.map((reference) => {
      const quest = byReference.get(reference as AcceptedRoadmapQuest["reference"]);
      if (!quest) throw new Error(`Unknown quest ${reference}.`);
      return quest;
    });
  } else {
    if (!optionalDeltaIds.includes(edit.deltaId) || !signalDeltas[edit.deltaId]) throw new Error("Only a listed Forge-owned optional delta can be added.");
    if (quests.length >= 5) throw new Error("An accepted roadmap supports at most five deltas.");
    const reference = `Q${Math.max(...quests.map((quest) => Number(quest.reference.slice(1)))) + 1}` as AcceptedRoadmapQuest["reference"];
    const refs = new Map(quests.map((quest) => [quest.catalogDeltaId, quest.reference]));
    quests.push(catalogQuest(edit.deltaId, reference, refs));
    optionalDeltaIds = optionalDeltaIds.filter((id) => id !== edit.deltaId);
    target = edit.deltaId;
  }
  const authority = { approvedBlueprintSha256: current.approvedBlueprintSha256, starter: current.starter, alreadyPlayable: current.alreadyPlayable, quests, optionalDeltaIds, revision: current.revision + 1 };
  const newFingerprint = fingerprintAcceptedRoadmap(authority);
  const event: CreatorRevisionEvent = { kind: edit.kind, target, priorFingerprint: current.fingerprint, newFingerprint, occurredAt, actor: "creator" };
  return validateAcceptedRoadmap(acceptedRoadmapSchema.parse({ ...current, ...authority, revisionEvents: [...current.revisionEvents, event], fingerprint: newFingerprint }));
}

export function acceptRoadmap(currentValue: unknown, expectedFingerprint: string, acceptedAt: string): AcceptedRoadmap {
  const current = validateAcceptedRoadmap(currentValue);
  if (current.acceptedAt) throw new Error("The roadmap is already accepted.");
  if (current.fingerprint !== expectedFingerprint) throw new Error("The roadmap changed after review. Review its current fingerprint before accepting it.");
  return acceptedRoadmapSchema.parse({ ...current, acceptedAt });
}
