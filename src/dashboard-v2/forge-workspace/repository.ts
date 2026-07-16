import { createRustRunnerFixture } from "./fixture.js";
import type { EntityKind, ForgeEntity, ForgeWorldState } from "./model.js";

const STORAGE_KEY = "forge.prototype.rust-runner.v1";

export interface ForgePrototypeRepository {
  load(): ForgeWorldState;
  save(state: ForgeWorldState): void;
  reset(): ForgeWorldState;
}

export class LocalForgePrototypeRepository implements ForgePrototypeRepository {
  load(): ForgeWorldState {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return createRustRunnerFixture();
      const parsed = JSON.parse(raw) as ForgeWorldState;
      if (parsed.version !== 1 || !parsed.entities?.[parsed.worldId]) return createRustRunnerFixture();
      return parsed;
    } catch {
      return createRustRunnerFixture();
    }
  }

  save(state: ForgeWorldState): void {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }));
  }

  reset(): ForgeWorldState {
    const state = createRustRunnerFixture();
    this.save(state);
    return state;
  }
}

export function slugId(value: string): string {
  const slug = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug || "new-item";
}

export function addEntity(state: ForgeWorldState, parentId: string, kind: EntityKind, input: Pick<ForgeEntity, "name" | "description" | "outcome">): ForgeWorldState {
  const base = slugId(input.name);
  let id = base;
  let suffix = 2;
  while (state.entities[id]) { id = base + "-" + suffix; suffix += 1; }
  const parent = state.entities[parentId];
  if (!parent) return state;
  const next: ForgeEntity = {
    id, kind, parentId, childIds: [], name: input.name, description: input.description,
    outcome: input.outcome, imageRef: parent.imageRef, status: "planned", progress: 0,
    relatedFiles: [], acceptanceCriteria: input.outcome ? [input.outcome] : [],
  };
  return {
    ...state,
    entities: {
      ...state.entities,
      [parentId]: { ...parent, childIds: [...parent.childIds, id] },
      [id]: next,
    },
  };
}

export function updateEntity(state: ForgeWorldState, id: string, input: Pick<ForgeEntity, "name" | "description" | "outcome">): ForgeWorldState {
  const current = state.entities[id];
  if (!current) return state;
  return { ...state, entities: { ...state.entities, [id]: { ...current, ...input } } };
}

