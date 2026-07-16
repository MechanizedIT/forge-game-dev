export type EntityKind = "world" | "region" | "town" | "building" | "part";
export type EntityStatus = "complete" | "building" | "ready" | "planned" | "attention";

export interface ForgeEntity {
  id: string;
  kind: EntityKind;
  parentId: string | null;
  childIds: string[];
  name: string;
  description: string;
  outcome: string;
  imageRef: string;
  status: EntityStatus;
  progress: number;
  relatedFiles: string[];
  acceptanceCriteria: string[];
}

export interface ForgeRepair {
  id: string;
  title: string;
  description: string;
  status: EntityStatus;
  entityIds: string[];
  reproductionSteps: string[];
}

export interface ForgeActivity {
  id: string;
  title: string;
  detail: string;
  when: string;
  tone: "gold" | "blue" | "green" | "pink";
}

export interface ForgeWorldState {
  version: 1;
  worldId: string;
  entities: Record<string, ForgeEntity>;
  repairs: ForgeRepair[];
  activity: ForgeActivity[];
  updatedAt: string;
}

export const childKind: Record<Exclude<EntityKind, "part">, EntityKind> = {
  world: "building",
  region: "town",
  town: "building",
  building: "part",
};

export const kindLabels: Record<EntityKind, string> = {
  world: "World",
  region: "Region",
  town: "Town",
  building: "Experience",
  part: "Step",
};

export const backendPresentationLabels = {
  Project: "World",
  System: "Experience",
  Quest: "Step",
} as const;

export function isEntityKind(value: string): value is EntityKind {
  return ["world", "region", "town", "building", "part"].includes(value);
}
