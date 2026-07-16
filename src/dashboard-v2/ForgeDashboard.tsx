import { useEffect, useMemo, useRef, useState } from "react";

import {
  acceptSystemQuestWorkOrder,
  approveGeneratedQuest,
  loadGeneratedProjectWorld,
  loadProjectCreationState,
  openGeneratedProjectWorld,
  prepareGeneratedQuest,
  reviewSystemQuestWorkOrder,
  startGeneratedQuest,
} from "../dashboard/api.js";
import type { GeneratedProjectWorldSnapshot } from "../generated-project-world/shared.js";
import type { RecentProjectSummary } from "../project-creation/shared.js";
import { GeneratedProjectWorldFailure } from "./GeneratedProjectWorld.js";
import { NewGameFlow } from "./NewGameFlow.js";
import { SystemQuestRefinement, type SystemQuestListItem } from "./SystemQuestRefinement.js";
import { SystemRoadmapPlanning } from "./SystemRoadmapPlanning.js";
import { ForgiePanel, Toast, TopNavigation, WorkspaceShell, type ForgeDestination } from "./forge-workspace/components.js";
import { childKind, isEntityKind, type EntityKind, type ForgeEntity } from "./forge-workspace/model.js";
import { adaptGeneratedProjectWorld } from "./forge-workspace/real-project-adapter.js";
import { RealPartDetailScreen, RealPartWorkflowScreen, type PartFileChoice } from "./forge-workspace/real-project-screens.js";
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
  if (segments.includes("build") || segments.includes("repair") || segments.includes("work")) return "build";
  if (segments.includes("publish")) return "publish";
  return "map";
}

export default function ForgeDashboard() {
  const repository = useRef(new LocalForgePrototypeRepository());
  const routeLoadRef = useRef<string | null>(null);
  const [prototypeState, setPrototypeState] = useState(() => repository.current.load());
  const [recent, setRecent] = useState<RecentProjectSummary[]>([]);
  const [generated, setGenerated] = useState<GeneratedProjectWorldSnapshot | null>(null);
  const [generatedFailure, setGeneratedFailure] = useState<{ projectId: string; error: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [forgieOpen, setForgieOpen] = useState(false);
  const { navigate, path } = useForgeRouter();
  const parts = routeParts(path);
  const routeWorldId = parts[0] === "world" && parts[1] && parts[1] !== "new" ? parts[1] : null;

  useEffect(() => {
    document.title = "Forgie Game Dev Workshop";
    void loadProjectCreationState().then((snapshot) => setRecent(snapshot.recentProjects)).catch(() => undefined);
  }, []);
  useEffect(() => repository.current.save(prototypeState), [prototypeState]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4_000);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!routeWorldId || routeWorldId === prototypeState.worldId || generated?.project.projectId === routeWorldId || routeLoadRef.current === routeWorldId) return;
    routeLoadRef.current = routeWorldId;
    setBusy(true);
    void loadGeneratedProjectWorld(routeWorldId).then((snapshot) => {
      setGenerated(snapshot);
      setGeneratedFailure(null);
    }).catch((error) => {
      setGenerated(null);
      setGeneratedFailure({ projectId: routeWorldId, error: error instanceof Error ? error.message : String(error) });
    }).finally(() => setBusy(false));
  }, [generated?.project.projectId, prototypeState.worldId, routeWorldId]);

  const realProjectOpen = Boolean(generated && routeWorldId === generated.project.projectId);
  const workspaceState = useMemo(
    () => realProjectOpen ? adaptGeneratedProjectWorld(generated!) : prototypeState,
    [generated, prototypeState, realProjectOpen],
  );
  const world = workspaceState.entities[workspaceState.worldId]!;
  const current = useMemo(() => {
    if (parts[0] !== "world") return world;
    for (let index = parts.length - 1; index >= 1; index -= 1) {
      const candidate = workspaceState.entities[parts[index] ?? ""];
      if (candidate) return candidate;
    }
    return world;
  }, [parts, workspaceState.entities, world]);

  const show = (message: string) => setToast(message);
  const navigateTop = (destination: ForgeDestination) => {
    if (destination === "forge") navigate("/forge");
    else if (destination === "map") navigate(mapRouteFor(workspaceState, current.kind === "part" ? workspaceState.entities[current.parentId!]! : current));
    else navigate("/world/" + workspaceState.worldId + "/" + destination);
  };
  const openReal = async (projectId: string) => {
    if (busy) return;
    setBusy(true);
    routeLoadRef.current = projectId;
    try {
      const snapshot = await openGeneratedProjectWorld(projectId);
      setGenerated(snapshot);
      setGeneratedFailure(null);
      navigate("/world/" + projectId + "/map");
    } catch (error) {
      setGenerated(null);
      setGeneratedFailure({ projectId, error: error instanceof Error ? error.message : String(error) });
      navigate("/world/" + projectId + "/map");
    } finally { setBusy(false); }
  };
  const refreshGenerated = async () => {
    if (!generated) return null;
    const next = await loadGeneratedProjectWorld(generated.project.projectId);
    setGenerated(next);
    return next;
  };
  const startRealPart = async (part: ForgeEntity, choice: PartFileChoice) => {
    if (!generated || busy) return;
    setBusy(true);
    try {
      const projectId = generated.project.projectId;
      const quest = generated.projectModel.quests.find((item) => item.questId === part.id)!;
      const native = generated.systemQuestPlan?.systems.flatMap((system) => system.quests).find((item) => item.questId === part.id);
      const sameSavedFiles = native?.workOrder
        && native.workOrder.existingFiles.join("\n") === choice.existingFiles.join("\n")
        && native.workOrder.newFiles.join("\n") === choice.newFiles.join("\n");
      if (native && !sameSavedFiles) {
        const review = await reviewSystemQuestWorkOrder(projectId, quest.systemId, choice.existingFiles, choice.newFiles, quest.questId);
        if (!review.workOrder) throw new Error("Forge could not prepare the recommended file list.");
        await acceptSystemQuestWorkOrder(projectId, quest.systemId, review.workOrder.fingerprint);
      }
      const brief = generated.quests.find((item) => item.questId === quest.questId);
      let run = brief?.run ?? await prepareGeneratedQuest(projectId, quest.questId);
      if (run.phase === "contract_review") run = await approveGeneratedQuest(projectId, quest.questId, run.contract.fingerprint);
      if (run.phase === "approved") run = await startGeneratedQuest(projectId, quest.questId);
      await refreshGenerated();
      navigate("/world/" + projectId + "/part/" + quest.questId + "/work");
    } catch (error) {
      show(error instanceof Error ? error.message : String(error));
    } finally { setBusy(false); }
  };

  if (path === "/world/new") {
    return <div className="forge-v3-app new-world-route"><TopNavigation active="forge" onNavigate={navigateTop} /><NewGameFlow onBack={() => navigate("/forge")} onOpenProjectWorld={(projectId) => void openReal(projectId)} /></div>;
  }
  if (routeWorldId && generatedFailure?.projectId === routeWorldId) {
    return <GeneratedProjectWorldFailure error={generatedFailure.error} onBack={() => { setGeneratedFailure(null); navigate("/worlds"); }} onRetry={() => void openReal(generatedFailure.projectId)} projectId={generatedFailure.projectId} />;
  }
  if (routeWorldId && routeWorldId !== prototypeState.worldId && !realProjectOpen) {
    return <main className="v2-loading"><h1>Opening this World…</h1><p>Forgie is reading its saved Buildings and Parts.</p></main>;
  }

  const quickAction = (action: string) => {
    if (action === "forgie") { setForgieOpen(true); return; }
    if (action === "atlas" || action === "assets") { navigate("/world/" + workspaceState.worldId + "/atlas"); if (action === "assets") show("Atlas opened with project assets and files."); return; }
    if (action === "repair") { navigate("/world/" + workspaceState.worldId + "/repair"); return; }
    if (action === "create") {
      const parent = current.kind === "part" ? workspaceState.entities[current.parentId!]! : current;
      const kind = parent.kind === "part" ? "part" : childKind[parent.kind];
      navigate(addRouteFor(workspaceState, parent, kind));
      return;
    }
    if (action === "build-part") {
      if (realProjectOpen && current.kind === "part") { navigate(detailRouteFor(workspaceState, current)); return; }
      setPrototypeState((previous) => ({ ...previous, entities: { ...previous.entities, [current.id]: { ...current, status: "building" } } }));
      navigate("/world/" + workspaceState.worldId + "/build");
      show("Part staged in Build. Review its work order before Codex starts.");
      return;
    }
    if (action === "complete" && current.kind === "part" && !realProjectOpen) {
      setPrototypeState((previous) => ({ ...previous, entities: { ...previous.entities, [current.id]: { ...current, status: "complete", progress: 100 } } }));
      show(current.name + " marked complete in the local prototype plan.");
      return;
    }
    show(action === "test" ? "Open a Part to playtest its verified build." : "Action staged for " + current.name + ".");
  };

  const editCurrent = () => {
    if (!realProjectOpen) { navigate(editRouteFor(workspaceState, current)); return; }
    if (current.kind === "world" || current.kind === "building") navigate(editRouteFor(workspaceState, current));
    else show("Part outcome edits remain in Advanced Details for this alpha.");
  };
  const common = { active: screenFor(path), current, onAction: quickAction, onEdit: editCurrent, onNavigate: navigateTop, state: workspaceState };

  let content;
  let hideRails = false;
  if (path === "/forge") {
    hideRails = true;
    content = <WorldForgeScreen onExisting={() => navigate("/worlds")} onNew={() => navigate("/world/new")} />;
  } else if (path === "/worlds") {
    hideRails = true;
    content = <ExistingWorldsScreen busy={busy} onNew={() => navigate("/world/new")} onOpenPrototype={() => navigate("/world/" + prototypeState.worldId + "/map")} onOpenReal={(projectId) => void openReal(projectId)} recent={recent} />;
  } else if (realProjectOpen && parts[2] === "part" && parts[4] === "work" && current.kind === "part") {
    content = <RealPartWorkflowScreen onBack={() => navigate(detailRouteFor(workspaceState, current))} onSnapshot={setGenerated} questId={current.id} snapshot={generated!} />;
  } else if (parts[2] === "part") {
    const part = current.kind === "part" ? current : undefined;
    content = part
      ? realProjectOpen
        ? <RealPartDetailScreen busy={busy} onBack={() => navigate(mapRouteFor(workspaceState, workspaceState.entities[part.parentId!]!))} onStart={(choice) => void startRealPart(part, choice)} part={part} snapshot={generated!} state={workspaceState} />
        : <PartDetailScreen onAction={quickAction} onBack={() => navigate(mapRouteFor(workspaceState, workspaceState.entities[part.parentId!]!))} part={part} state={workspaceState} />
      : <WorldMapScreen current={world} onAdd={(kind) => navigate(addRouteFor(workspaceState, world, kind))} onEdit={editCurrent} onOpen={(entity) => navigate(detailRouteFor(workspaceState, entity))} onPrimary={() => navigate("/world/" + workspaceState.worldId + "/atlas")} state={workspaceState} />;
  } else if (realProjectOpen && (parts.includes("add") || parts.includes("edit"))) {
    const addIndex = parts.indexOf("add");
    const requestedKind = addIndex >= 0 ? parts[addIndex + 1] : current.kind;
    if (requestedKind === "building" || current.kind === "world") {
      content = <SystemRoadmapPlanning initialIdea={generated!.projectModel.project.vision} onAccepted={async () => { const next = await refreshGenerated(); if (next) navigate("/world/" + next.project.projectId + "/map"); }} onClose={() => navigate(mapRouteFor(workspaceState, world))} projectId={generated!.project.projectId} />;
    } else {
      const building = current.kind === "building" ? current : workspaceState.entities[current.parentId!]!;
      const saved = generated!.systemQuestPlan?.systems.find((system) => system.systemId === building.id)?.quests ?? [];
      const statuses = new Map(generated!.projectModel.quests.map((quest) => [quest.questId, quest.status]));
      const systemQuests: SystemQuestListItem[] = saved.map((quest) => ({ ...quest, status: statuses.get(quest.questId) ?? "blocked" }));
      content = <SystemQuestRefinement onChanged={async () => { await refreshGenerated(); }} onClose={() => navigate(mapRouteFor(workspaceState, building))} onReady={async (questId) => { const next = await refreshGenerated(); if (next) navigate("/world/" + next.project.projectId + "/part/" + questId); }} projectId={generated!.project.projectId} systemId={building.id} systemOutcome={building.outcome} systemQuests={systemQuests} systemTitle={building.name} />;
    }
  } else if (parts.includes("add") || parts.includes("edit")) {
    const addIndex = parts.indexOf("add");
    const mode = addIndex >= 0 ? "add" : "edit";
    const kindValue = mode === "add" ? parts[addIndex + 1] : current.kind;
    const kind: EntityKind = kindValue && isEntityKind(kindValue) ? kindValue : current.kind;
    const parent = mode === "add" ? current : current.parentId ? workspaceState.entities[current.parentId] : undefined;
    const cancelTarget = mode === "add" ? current : current.kind === "part" ? workspaceState.entities[current.parentId!]! : current;
    content = <EntityFormScreen kind={kind} mode={mode} onCancel={() => navigate(detailRouteFor(workspaceState, cancelTarget))} onSave={(value) => {
      setPrototypeState((previous) => mode === "add" ? addEntity(previous, current.id, kind, value) : updateEntity(previous, current.id, value));
      show((mode === "add" ? "Added " : "Saved ") + value.name + ".");
      navigate(detailRouteFor(workspaceState, cancelTarget));
    }} parent={parent} target={mode === "edit" ? current : undefined} />;
  } else if (parts.includes("atlas")) {
    content = <AtlasScreen onOpen={(entity) => navigate(detailRouteFor(workspaceState, entity))} onRepair={(repair) => show("Opened repair: " + repair.title)} state={workspaceState} />;
  } else if (parts.includes("build")) {
    content = <BuildScreen onOpen={(entity) => navigate(detailRouteFor(workspaceState, entity))} state={workspaceState} />;
  } else if (parts.includes("repair")) {
    content = <RepairScreen onToast={show} state={workspaceState} />;
  } else if (parts.includes("publish")) {
    content = <PublishScreen onCheck={() => show("Release check started. Forgie found the items shown below.")} state={workspaceState} />;
  } else {
    const firstPart = current.kind === "building" ? current.childIds.map((id) => workspaceState.entities[id]).find((item) => item?.kind === "part") : null;
    content = <WorldMapScreen current={current} onAdd={(kind) => navigate(addRouteFor(workspaceState, current, kind))} onEdit={editCurrent} onOpen={(entity) => navigate(detailRouteFor(workspaceState, entity))} onPrimary={() => firstPart ? navigate(detailRouteFor(workspaceState, firstPart)) : navigate("/world/" + workspaceState.worldId + "/atlas")} state={workspaceState} />;
  }

  return <WorkspaceShell {...common} hideRails={hideRails}>{content}{hideRails && path === "/worlds" && <div className="worlds-forgie"><ForgiePanel onOpen={() => setForgieOpen(true)} /></div>}{forgieOpen && <ForgieDrawer context={current} onClose={() => setForgieOpen(false)} onSubmit={(value) => { setForgieOpen(false); show("Forgie saved this request locally: " + value); }} />}{toast && <Toast message={toast} onClose={() => setToast(null)} />}</WorkspaceShell>;
}
