import type { EntityKind, ForgeEntity, ForgeWorldState } from "./model.js";

export function ancestorsOf(state: ForgeWorldState, entity: ForgeEntity): ForgeEntity[] {
  const path: ForgeEntity[] = [];
  let current: ForgeEntity | undefined = entity;
  while (current) {
    path.unshift(current);
    current = current.parentId ? state.entities[current.parentId] : undefined;
  }
  return path;
}

export function mapRouteFor(state: ForgeWorldState, entity: ForgeEntity): string {
  const path = ancestorsOf(state, entity);
  const world = path[0]!;
  if (entity.kind === "world") return "/world/" + world.id + "/map";
  return "/world/" + world.id + "/map/" + path.slice(1).map((item) => item.kind + "/" + item.id).join("/");
}

export function detailRouteFor(state: ForgeWorldState, entity: ForgeEntity): string {
  return entity.kind === "part" ? "/world/" + state.worldId + "/part/" + entity.id : mapRouteFor(state, entity);
}

export function editRouteFor(state: ForgeWorldState, entity: ForgeEntity): string {
  return entity.kind === "world"
    ? "/world/" + state.worldId + "/edit"
    : "/world/" + state.worldId + "/" + entity.kind + "/" + entity.id + "/edit";
}

export function addRouteFor(state: ForgeWorldState, parent: ForgeEntity, kind: EntityKind): string {
  return parent.kind === "world"
    ? "/world/" + state.worldId + "/add/" + kind
    : "/world/" + state.worldId + "/" + parent.kind + "/" + parent.id + "/add/" + kind;
}

