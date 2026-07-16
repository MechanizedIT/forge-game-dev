import { useEffect, useMemo, useRef, useState } from "react";

import { loadProjectCreationState, openGeneratedProjectWorld } from "../dashboard/api.js";
import type { GeneratedProjectWorldSnapshot } from "../generated-project-world/shared.js";
import type { RecentProjectSummary } from "../project-creation/shared.js";
import { GeneratedProjectWorld, GeneratedProjectWorldFailure } from "./GeneratedProjectWorld.js";
import { NewGameFlow } from "./NewGameFlow.js";
import { ForgiePanel, Toast, TopNavigation, WorkspaceShell, type ForgeDestination } from "./forge-workspace/components.js";
import { childKind, isEntityKind, type EntityKind, type ForgeEntity } from "./forge-workspace/model.js";
import { addEntity, LocalForgePrototypeRepository, updateEntity } from "./forge-workspace/repository.js";
import { routeParts, useForgeRouter } from "./forge-workspace/router.js";
import { addRouteFor, detailRouteFor, editRouteFor, mapRouteFor } from "./forge-workspace/routes.js";
import {
  AtlasScreen,
  BuildScreen,
  EntityFormScreen,
  ExistingWorldsScreen,
  ForgieDrawer,
  PartDetailScreen,
  PublishScreen,
  RepairScreen,
  WorldForgeScreen,
  WorldMapScreen,
} from "./forge-workspace/screens.js";

function screenFor(path: string): ForgeDestination {
  const segments = routeParts(path);
  if (path === "/forge" || path === "/worlds" || path === "/world/new") return "forge";
  if (segments.includes("atlas")) return "atlas";
  if (segments.includes("build") || segments.includes("repair")) return "build";
  if (segments.includes("publish")) return "publish";
  return "map";
}

export default function ForgeDashboard() {
  const repository = useRef(new LocalForgePrototypeRepository());
  const [state, setState] = useState(() => repository.current.load());
  const [recent, setRecent] = useState<RecentProjectSummary[]>([]);
  const [generated, setGenerated] = useState<GeneratedProjectWorldSnapshot | null>(null);
  const [generatedFailure, setGeneratedFailure] = useState<{ projectId: string; error: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [forgieOpen, setForgieOpen] = useState(false);
  const { navigate, path } = useForgeRouter();
  const parts = routeParts(path);

  useEffect(() => {
    document.title = "Forge Game Dev";
    void loadProjectCreationState().then((snapshot) => setRecent(snapshot.recentProjects)).catch(() => undefined);
  }, []);
  useEffect(() => repository.current.save(state), [state]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4_000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const world = state.entities[state.worldId]!;
  const current = useMemo(() => {
    if (parts[0] !== "world") return world;
    for (let index = parts.length - 1; index >= 1; index -= 1) {
      const candidate = state.entities[parts[index] ?? ""];
      if (candidate) return candidate;
    }
    return world;
  }, [parts, state.entities, world]);

  const navigateTop = (destination: ForgeDestination) => {
    if (destination === "forge") navigate("/forge");
    else if (destination === "map") navigate(mapRouteFor(state, current.kind === "part" ? state.entities[current.parentId!]! : current));
    else navigate("/world/" + state.worldId + "/" + destination);
  };

  const openReal = async (projectId: string) => {
    if (busy) return;
    setBusy(true);
    try {
      setGenerated(await openGeneratedProjectWorld(projectId));
      setGeneratedFailure(null);
      navigate("/world/" + projectId + "/operations");
    } catch (error) {
      setGenerated(null);
      setGeneratedFailure({ projectId, error: error instanceof Error ? error.message : String(error) });
      navigate("/world/" + projectId + "/operations");
    } finally {
      setBusy(false);
    }
  };

  if (parts[0] === "world" && parts[2] === "operations") {
    if (generated) return <GeneratedProjectWorld initialSnapshot={generated} onBack={() => { setGenerated(null); navigate("/worlds"); }} onSnapshot={setGenerated} />;
    if (generatedFailure) return <GeneratedProjectWorldFailure error={generatedFailure.error} onBack={() => { setGeneratedFailure(null); navigate("/worlds"); }} onRetry={() => void openReal(generatedFailure.projectId)} projectId={generatedFailure.projectId} />;
    return <main className="v2-loading"><h1>Open this project from Existing Worlds</h1><p>Forge needs to validate the registered project before showing its operational workspace.</p><button className="forge-primary-button" onClick={() => navigate("/worlds")} type="button">Open Existing Worlds</button></main>;
  }

  if (path === "/world/new") {
    return <div className="forge-v3-app new-world-route"><TopNavigation active="forge" onNavigate={navigateTop} /><NewGameFlow onBack={() => navigate("/forge")} onOpenProjectWorld={(projectId) => void openReal(projectId)} /></div>;
  }

  const show = (message: string) => setToast(message);
  const quickAction = (action: string) => {
    if (action === "forgie") { setForgieOpen(true); return; }
    if (action === "atlas" || action === "assets") { navigate("/world/" + state.worldId + "/atlas"); if (action === "assets") show("Atlas opened with project assets and files."); return; }
    if (action === "repair") { navigate("/world/" + state.worldId + "/repair"); return; }
    if (action === "create") {
      const parent = current.kind === "part" ? state.entities[current.parentId!]! : current;
      const kind = parent.kind === "part" ? "part" : childKind[parent.kind];
      navigate(addRouteFor(state, parent, kind));
      return;
    }
    if (action === "build-part") {
      setState((previous) => ({ ...previous, entities: { ...previous.entities, [current.id]: { ...current, status: "building" } } }));
      navigate("/world/" + state.worldId + "/build");
      show("Part staged in Build. Review its work order before Codex starts.");
      return;
    }
    if (action === "complete" && current.kind === "part") {
      setState((previous) => ({ ...previous, entities: { ...previous.entities, [current.id]: { ...current, status: "complete", progress: 100 } } }));
      show(current.name + " marked complete in the local prototype plan.");
      return;
    }
    show(action === "test" ? "Test staged. Forge will launch the connected Godot project when one is selected." : "Action staged for " + current.name + ".");
  };

  const common = {
    active: screenFor(path),
    current,
    onAction: quickAction,
    onEdit: () => navigate(editRouteFor(state, current)),
    onNavigate: navigateTop,
    state,
  };

  let content;
  let hideRails = false;
  if (path === "/forge") {
    hideRails = true;
    content = <WorldForgeScreen onExisting={() => navigate("/worlds")} onNew={() => navigate("/world/new")} />;
  } else if (path === "/worlds") {
    hideRails = true;
    content = <ExistingWorldsScreen busy={busy} onNew={() => navigate("/world/new")} onOpenPrototype={() => navigate("/world/" + state.worldId + "/map")} onOpenReal={(projectId) => void openReal(projectId)} recent={recent} />;
  } else if (parts[2] === "part") {
    const part = current.kind === "part" ? current : undefined;
    content = part
      ? <PartDetailScreen onAction={quickAction} onBack={() => navigate(mapRouteFor(state, state.entities[part.parentId!]!))} part={part} state={state} />
      : <WorldMapScreen current={world} onAdd={(kind) => navigate(addRouteFor(state, world, kind))} onEdit={() => navigate(editRouteFor(state, world))} onOpen={(entity) => navigate(detailRouteFor(state, entity))} onPrimary={() => navigate("/world/" + state.worldId + "/atlas")} state={state} />;
  } else if (parts.includes("add") || parts.includes("edit")) {
    const addIndex = parts.indexOf("add");
    const editIndex = parts.indexOf("edit");
    const mode = addIndex >= 0 ? "add" : "edit";
    const kindValue = mode === "add" ? parts[addIndex + 1] : current.kind;
    const kind: EntityKind = kindValue && isEntityKind(kindValue) ? kindValue : current.kind;
    const parent = mode === "add" ? current : current.parentId ? state.entities[current.parentId] : undefined;
    const cancelTarget = mode === "add" ? current : current.kind === "part" ? state.entities[current.parentId!]! : current;
    content = <EntityFormScreen kind={kind} mode={mode} onCancel={() => navigate(detailRouteFor(state, cancelTarget))} onSave={(value) => {
      setState((previous) => mode === "add" ? addEntity(previous, current.id, kind, value) : updateEntity(previous, current.id, value));
      show((mode === "add" ? "Added " : "Saved ") + value.name + ".");
      navigate(detailRouteFor(state, cancelTarget));
    }} parent={parent} target={mode === "edit" ? current : undefined} />;
    void editIndex;
  } else if (parts.includes("atlas")) {
    content = <AtlasScreen onOpen={(entity) => navigate(detailRouteFor(state, entity))} onRepair={(repair) => show("Opened repair: " + repair.title)} state={state} />;
  } else if (parts.includes("build")) {
    content = <BuildScreen onOpen={(entity) => navigate(detailRouteFor(state, entity))} state={state} />;
  } else if (parts.includes("repair")) {
    content = <RepairScreen onToast={show} state={state} />;
  } else if (parts.includes("publish")) {
    content = <PublishScreen onCheck={() => show("Release check started. Forge found the items shown below.")} state={state} />;
  } else {
    content = <WorldMapScreen current={current} onAdd={(kind) => navigate(addRouteFor(state, current, kind))} onEdit={() => navigate(editRouteFor(state, current))} onOpen={(entity) => navigate(detailRouteFor(state, entity))} onPrimary={() => current.kind === "building" ? show("Editor launch is available after opening a connected Godot project.") : navigate("/world/" + state.worldId + "/atlas")} state={state} />;
  }

  return <WorkspaceShell {...common} hideRails={hideRails}>{content}{hideRails && path === "/worlds" && <div className="worlds-forgie"><ForgiePanel onOpen={() => setForgieOpen(true)} /></div>}{forgieOpen && <ForgieDrawer context={current} onClose={() => setForgieOpen(false)} onSubmit={(value) => { setForgieOpen(false); show("Forgie saved this request locally: " + value); }} />}{toast && <Toast message={toast} onClose={() => setToast(null)} />}</WorkspaceShell>;
}
