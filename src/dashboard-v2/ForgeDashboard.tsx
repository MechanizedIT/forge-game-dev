import { useEffect, useMemo, useRef, useState } from "react";

import {
  acceptSystemQuestWorkOrder,
  approveGeneratedQuest,
  cancelGeneratedQuest,
  loadGeneratedProjectWorld,
  loadProjectCreationState,
  mutateForgePresentation,
  mutateProjectArchitecture,
  openGeneratedProjectWorld,
  prepareGeneratedQuest,
  prepareRepairGeneratedQuest,
  reviewSystemQuestWorkOrder,
  rollbackGeneratedQuest,
  startGeneratedQuest,
} from "../dashboard/api.js";
import type { GeneratedProjectWorldSnapshot } from "../generated-project-world/shared.js";
import type { GeneratedQuestRunSnapshot } from "../generated-quest-runner/shared.js";
import type { RecentProjectSummary } from "../project-creation/shared.js";
import { GeneratedProjectWorldFailure } from "./GeneratedProjectWorld.js";
import { NewGameFlow } from "./NewGameFlow.js";
import { SystemQuestRefinement, type SystemQuestListItem } from "./SystemQuestRefinement.js";
import { SystemRoadmapPlanning } from "./SystemRoadmapPlanning.js";
import { ActiveWorkBanner, ForgiePanel, Toast, TopNavigation, WorkspaceShell, type ForgeDestination } from "./forge-workspace/components.js";
import { childKind, isEntityKind, type EntityKind, type ForgeEntity } from "./forge-workspace/model.js";
import { adaptGeneratedProjectWorld } from "./forge-workspace/real-project-adapter.js";
import { RealPartDetailScreen, RealPartWorkflowScreen, type FollowUpPreparation, type PartFileChoice } from "./forge-workspace/real-project-screens.js";
import { friendlyRunError } from "./forge-workspace/friendly-errors.js";
import { ContextualPlaytest, RealAssetsScreen, RealEntityEditScreen, RealRepairScreen } from "./forge-workspace/creator-tools.js";
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
  if (segments.includes("atlas") || segments.includes("assets")) return "atlas";
  if (segments.includes("build") || segments.includes("repair") || segments.includes("work")) return "build";
  if (segments.includes("publish")) return "publish";
  return "map";
}

function isUnresolvedGeneratedRun(run: GeneratedQuestRunSnapshot): boolean {
  if (run.phase === "completed") return false;
  if (run.phase !== "cancelled") return true;
  return run.recovery.action === "rollback" || run.recovery.action === "manual";
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
  const [playtestContext, setPlaytestContext] = useState<ForgeEntity | null>(null);
  const [repairContext, setRepairContext] = useState<ForgeEntity | null>(null);
  const [assetContext, setAssetContext] = useState<ForgeEntity | null>(null);
  const [followUpDraft, setFollowUpDraft] = useState<(FollowUpPreparation & { experienceId: string; feedbackEntryId?: string | undefined }) | null>(null);
  const [followUpPreparation, setFollowUpPreparation] = useState<(FollowUpPreparation & { questId: string }) | null>(null);
  const [creatingExperienceId, setCreatingExperienceId] = useState<string | null>(null);
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
  const activeBrief = realProjectOpen
    ? generated!.quests.find((quest) => quest.run && isUnresolvedGeneratedRun(quest.run)) ?? null
    : null;
  const activeRun = activeBrief?.run ?? null;
  const activeStep = activeBrief ? workspaceState.entities[activeBrief.questId] ?? null : null;
  const onActiveStepPage = Boolean(activeStep && current.id === activeStep.id && parts[2] === "part" && (parts.length === 4 || parts[4] === "work"));

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
      const existingRun = generated.quests.find((item) => item.questId === quest.questId)?.run;
      if (existingRun && existingRun.phase !== "completed" && existingRun.phase !== "cancelled") {
        navigate(`/world/${projectId}/part/${quest.questId}/work`);
        return;
      }
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
      let run = brief?.run && !["completed", "cancelled"].includes(brief.run.phase)
        ? brief.run
        : await prepareGeneratedQuest(projectId, quest.questId);
      if (run.phase === "contract_review") run = await approveGeneratedQuest(projectId, quest.questId, run.contract.fingerprint);
      if (run.phase === "approved") run = await startGeneratedQuest(projectId, quest.questId);
      await refreshGenerated();
      navigate("/world/" + projectId + "/part/" + quest.questId + "/work");
    } catch (error) {
      show(friendlyRunError(error instanceof Error ? error.message : String(error)));
    } finally { setBusy(false); }
  };
  const stopActiveWork = async () => {
    if (!generated || !activeBrief || busy) return;
    setBusy(true);
    try {
      if (activeRun?.actions.rollback) await rollbackGeneratedQuest(generated.project.projectId, activeBrief.questId);
      else await cancelGeneratedQuest(generated.project.projectId, activeBrief.questId);
      await refreshGenerated();
      show(`Stopped ${activeStep?.name ?? "the active Step"} safely.${activeRun?.actions.rollback ? " Reviewed game-file changes were restored." : " No game files were changed."}`);
    } catch (error) {
      show(friendlyRunError(error instanceof Error ? error.message : String(error)));
    } finally { setBusy(false); }
  };

  if (path === "/world/new") {
    return <div className="forge-v3-app new-world-route"><TopNavigation active="forge" onNavigate={navigateTop} /><NewGameFlow onBack={() => navigate("/forge")} onOpenProjectWorld={(projectId) => void openReal(projectId)} /></div>;
  }
  if (routeWorldId && generatedFailure?.projectId === routeWorldId) {
    return <GeneratedProjectWorldFailure error={generatedFailure.error} onBack={() => { setGeneratedFailure(null); navigate("/worlds"); }} onRetry={() => void openReal(generatedFailure.projectId)} projectId={generatedFailure.projectId} />;
  }
  if (routeWorldId && routeWorldId !== prototypeState.worldId && !realProjectOpen) {
    return <main className="v2-loading"><h1>Opening this World…</h1><p>Forgie is reading its saved Experiences and Steps.</p></main>;
  }

  const quickAction = (action: string) => {
    if (action === "forgie") { setForgieOpen(true); return; }
    if (action === "atlas") { navigate("/world/" + workspaceState.worldId + "/atlas"); return; }
    if (action === "assets") { setAssetContext(current); navigate("/world/" + workspaceState.worldId + "/assets"); return; }
    if (action === "repair") { setRepairContext(current); navigate("/world/" + workspaceState.worldId + "/repair"); return; }
    if (action === "test") { if (realProjectOpen) setPlaytestContext(current); else show("Connect a real Godot World to launch a playtest."); return; }
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
      show("Step staged in Build. Review its work order before Codex starts.");
      return;
    }
    if (action === "complete" && current.kind === "part" && !realProjectOpen) {
      setPrototypeState((previous) => ({ ...previous, entities: { ...previous.entities, [current.id]: { ...current, status: "complete", progress: 100 } } }));
      show(current.name + " marked complete in the local prototype plan.");
      return;
    }
    show("Action staged for " + current.name + ".");
  };

  const editCurrent = () => {
    if (activeRun && activeStep?.id === current.id) {
      show("Finish or stop the current work before editing this Step.");
      return;
    }
    if (!realProjectOpen) { navigate(editRouteFor(workspaceState, current)); return; }
    navigate(editRouteFor(workspaceState, current));
  };
  const openFollowUp = async (context: ForgeEntity, result: "needs_change" | "broken", note: string, files: string[], recorded = false, feedbackEntryId?: string) => {
    try {
    if (!generated) return;
    const experienceId = context.kind === "building" ? context.id : context.kind === "part" ? context.parentId! : generated.projectModel.systems[0]?.systemId;
    if (!experienceId) { show("Add an Experience before creating a follow-up Step."); return; }
    let next = recorded ? generated : await mutateForgePresentation(generated.project.projectId, { action: "record_feedback", entityId: context.id, result, note: note || result.replaceAll("_", " "), relatedFiles: files });
    const entryId = feedbackEntryId ?? next.presentation?.history.at(-1)?.entryId;
    const latestRun = next.quests.find((quest) => quest.questId === context.id)?.run;
    if (latestRun && isUnresolvedGeneratedRun(latestRun)) {
      if (latestRun.actions.rollback) await rollbackGeneratedQuest(next.project.projectId, context.id);
      else if (latestRun.actions.cancel) await cancelGeneratedQuest(next.project.projectId, context.id);
      else throw new Error("This Step still has reviewed changes that need manual recovery before Forge can create another Step.");
      next = await loadGeneratedProjectWorld(next.project.projectId);
    }
    setGenerated(next);
    const draft = { experienceId, kind: result === "broken" ? "repair" as const : "change" as const, note: note || (result === "broken" ? "Repair the failed behavior." : "Refine the latest result."), files, originalStepId: context.id, originalStepName: context.name, ...(entryId ? { feedbackEntryId: entryId } : {}) };
    setFollowUpDraft(draft);
    const continueToFlow = () => {
      if (result === "broken") { setRepairContext(context); navigate(`/world/${next.project.projectId}/repair`); }
      else navigate(`/world/${next.project.projectId}/building/${experienceId}/add/part`);
      setPlaytestContext(null);
    };
    continueToFlow();
    } catch (error) {
      show(friendlyRunError(error instanceof Error ? error.message : String(error)));
    }
  };
  const common = { active: screenFor(path), current, onAction: quickAction, onEdit: editCurrent, onNavigate: navigateTop, state: workspaceState };
  const savedFollowUpEntry = generated?.presentation?.history.filter((entry) => entry.linkedFollowUpId === current.id).at(-1);
  const savedOriginalStep = savedFollowUpEntry ? workspaceState.entities[savedFollowUpEntry.entityId] : undefined;
  const latestRepairEntry = generated?.presentation?.history.filter((entry) => entry.type === "repair" && workspaceState.entities[entry.entityId]?.kind === "part").at(-1);
  const pendingRepairEntry = latestRepairEntry && !latestRepairEntry.linkedFollowUpId ? latestRepairEntry : undefined;
  const persistedRepairContext = pendingRepairEntry ? workspaceState.entities[pendingRepairEntry.entityId] : undefined;
  const currentFollowUp = followUpPreparation?.questId === current.id
    ? followUpPreparation
    : savedFollowUpEntry
      ? {
          questId: current.id,
          kind: savedFollowUpEntry.type === "repair" ? "repair" as const : "change" as const,
          note: savedFollowUpEntry.note || savedFollowUpEntry.summary,
          files: savedFollowUpEntry.relatedFiles,
          feedbackEntryId: savedFollowUpEntry.entryId,
          originalStepId: savedFollowUpEntry.entityId,
          originalStepName: savedOriginalStep?.name ?? "Previous Step",
        }
      : null;
  const continueRepair = async (context: ForgeEntity, note: string, files: string[], recordedFeedbackEntryId?: string) => {
    if (!generated) return;
    const feedbackEntryId = recordedFeedbackEntryId ?? followUpDraft?.feedbackEntryId ?? pendingRepairEntry?.entryId;
    if (context.kind === "part" && pendingRepairEntry?.entityId === context.id) {
      await prepareRepairGeneratedQuest(generated.project.projectId, context.id, note);
      let next = await loadGeneratedProjectWorld(generated.project.projectId);
      if (feedbackEntryId) next = await mutateForgePresentation(next.project.projectId, { action: "link_feedback", entryId: feedbackEntryId, followUpId: context.id });
      setGenerated(next);
      setFollowUpPreparation({ questId: context.id, kind: "repair", note, files, originalStepId: context.id, originalStepName: context.name, ...(feedbackEntryId ? { feedbackEntryId } : {}) });
      setFollowUpDraft(null);
      setRepairContext(null);
      navigate(`/world/${next.project.projectId}/part/${context.id}/work`);
      return;
    }
    const experienceId = context.kind === "building" ? context.id : context.kind === "part" ? context.parentId! : generated.projectModel.systems[0]?.systemId;
    if (!experienceId) return;
    setFollowUpDraft({ experienceId, kind: "repair", note, files, originalStepId: context.id, originalStepName: context.name, ...(feedbackEntryId ? { feedbackEntryId } : {}) });
    navigate(`/world/${generated.project.projectId}/building/${experienceId}/add/part`);
  };

  let content;
  let hideRails = false;
  if (path === "/forge") {
    hideRails = true;
    content = <WorldForgeScreen onExisting={() => navigate("/worlds")} onNew={() => navigate("/world/new")} />;
  } else if (path === "/worlds") {
    hideRails = true;
    content = <ExistingWorldsScreen busy={busy} onNew={() => navigate("/world/new")} onOpenPrototype={() => navigate("/world/" + prototypeState.worldId + "/map")} onOpenReal={(projectId) => void openReal(projectId)} recent={recent} />;
  } else if (realProjectOpen && parts[2] === "part" && parts[4] === "work" && current.kind === "part") {
    content = <RealPartWorkflowScreen followUp={currentFollowUp} onBack={() => navigate(detailRouteFor(workspaceState, current))} onFollowUp={(result, note, feedbackEntryId) => openFollowUp(current, result, note, activeRun?.contract.allowedFiles.map((file) => file.relativePath) ?? current.relatedFiles, Boolean(feedbackEntryId), feedbackEntryId)} onSnapshot={setGenerated} questId={current.id} snapshot={generated!} />;
  } else if (parts[2] === "part") {
    const part = current.kind === "part" ? current : undefined;
    content = part
      ? realProjectOpen
        ? <RealPartDetailScreen activeRun={activeStep?.id === part.id ? activeRun : null} busy={busy} followUp={currentFollowUp} onBack={() => navigate(mapRouteFor(workspaceState, workspaceState.entities[part.parentId!]!))} onEdit={() => editCurrent()} onSnapshot={setGenerated} onStart={(choice) => { if (activeStep?.id === part.id) void startRealPart(part, choice); else if (currentFollowUp?.originalStepId === part.id) void openFollowUp(part, currentFollowUp.kind === "repair" ? "broken" : "needs_change", currentFollowUp.note, choice.existingFiles, true, currentFollowUp.feedbackEntryId); else void startRealPart(part, choice); }} onStopActive={() => void stopActiveWork()} onTest={() => setPlaytestContext(part)} part={part} snapshot={generated!} state={workspaceState} />
        : <PartDetailScreen onAction={quickAction} onBack={() => navigate(mapRouteFor(workspaceState, workspaceState.entities[part.parentId!]!))} part={part} state={workspaceState} />
      : <WorldMapScreen current={world} onAdd={(kind) => navigate(addRouteFor(workspaceState, world, kind))} onEdit={editCurrent} onOpen={(entity) => navigate(detailRouteFor(workspaceState, entity))} onPrimary={() => navigate("/world/" + workspaceState.worldId + "/assets")} state={workspaceState} />;
  } else if (realProjectOpen && (parts.includes("add") || parts.includes("edit"))) {
    const addIndex = parts.indexOf("add");
    const editing = parts.includes("edit");
    const requestedKind = addIndex >= 0 ? parts[addIndex + 1] : current.kind;
    if (editing) {
      const returnFromEdit = () => creatingExperienceId === current.id ? navigate(`/world/${generated!.project.projectId}/building/${current.id}/add/part`) : navigate(detailRouteFor(workspaceState, current));
      content = <RealEntityEditScreen entity={current} onCancel={returnFromEdit} onSnapshot={(next) => { setGenerated(next); show(`Saved ${current.kind === "part" ? "Step" : current.kind === "building" ? "Experience" : "World"}.`); }} snapshot={generated!} />;
    } else if (requestedKind === "building" || current.kind === "world") {
      const priorIds = new Set(generated!.projectModel.systems.map((system) => system.systemId));
      content = <SystemRoadmapPlanning initialIdea={generated!.projectModel.project.vision} mode="experience" onAccepted={async () => { const next = await refreshGenerated(); const added = next?.projectModel.systems.find((system) => !priorIds.has(system.systemId)); if (next && added) { setCreatingExperienceId(added.systemId); navigate(`/world/${next.project.projectId}/building/${added.systemId}/add/part`); } else if (next) navigate(`/world/${next.project.projectId}/map`); }} onClose={() => navigate(mapRouteFor(workspaceState, world))} projectId={generated!.project.projectId} />;
    } else {
      const building = current.kind === "building" ? current : workspaceState.entities[current.parentId!]!;
      const saved = generated!.systemQuestPlan?.systems.find((system) => system.systemId === building.id)?.quests ?? [];
      const statuses = new Map(generated!.projectModel.quests.map((quest) => [quest.questId, quest.status]));
      const systemQuests: SystemQuestListItem[] = saved.map((quest) => ({ ...quest, status: statuses.get(quest.questId) ?? "blocked" }));
      const persistedFollowUpEntry = generated!.presentation?.history.filter((entry) => entry.entityId === entry.linkedFollowUpId && workspaceState.entities[entry.entityId]?.parentId === building.id).at(-1);
      const persistedOriginalStep = persistedFollowUpEntry ? workspaceState.entities[persistedFollowUpEntry.entityId] : undefined;
      const routeFollowUpDraft = followUpDraft?.experienceId === building.id
        ? followUpDraft
        : persistedFollowUpEntry && persistedOriginalStep
          ? { experienceId: building.id, kind: persistedFollowUpEntry.type === "repair" ? "repair" as const : "change" as const, note: persistedFollowUpEntry.note || persistedFollowUpEntry.summary, files: persistedFollowUpEntry.relatedFiles, originalStepId: persistedOriginalStep.id, originalStepName: persistedOriginalStep.name, feedbackEntryId: persistedFollowUpEntry.entryId }
          : null;
      const pendingRepairContext = pendingRepairEntry && workspaceState.entities[pendingRepairEntry.entityId]?.parentId === building.id ? workspaceState.entities[pendingRepairEntry.entityId] : undefined;
      content = pendingRepairContext
        ? <RealRepairScreen context={pendingRepairContext} feedbackAlreadyRecorded initialNote={pendingRepairEntry?.note ?? ""} onContinue={(note, files, feedbackEntryId) => continueRepair(pendingRepairContext, note, files, feedbackEntryId)} onSnapshot={setGenerated} snapshot={generated!} />
        : <SystemQuestRefinement creationMode={creatingExperienceId === building.id} followUpKind={routeFollowUpDraft?.kind} followUpOriginalStepName={routeFollowUpDraft?.originalStepName} initialDescription={routeFollowUpDraft?.note ?? (creatingExperienceId === building.id ? building.outcome : "")} onChanged={async () => { await refreshGenerated(); }} onClose={() => { setCreatingExperienceId(null); setFollowUpDraft(null); navigate(mapRouteFor(workspaceState, building)); }} onEditExperience={() => navigate(editRouteFor(workspaceState, building))} onReady={async (questId) => { let next = await refreshGenerated(); if (routeFollowUpDraft?.feedbackEntryId && next) { next = await mutateForgePresentation(next.project.projectId, { action: "link_feedback", entryId: routeFollowUpDraft.feedbackEntryId, followUpId: questId }); setGenerated(next); } if (routeFollowUpDraft) setFollowUpPreparation({ questId, kind: routeFollowUpDraft.kind, note: routeFollowUpDraft.note, files: routeFollowUpDraft.files, originalStepId: routeFollowUpDraft.originalStepId, originalStepName: routeFollowUpDraft.originalStepName, ...(routeFollowUpDraft.feedbackEntryId ? { feedbackEntryId: routeFollowUpDraft.feedbackEntryId } : {}) }); setFollowUpDraft(null); if (next) navigate("/world/" + next.project.projectId + "/part/" + questId); }} preferredFiles={routeFollowUpDraft?.files ?? []} projectId={generated!.project.projectId} singleStep={Boolean(routeFollowUpDraft)} systemId={building.id} systemOutcome={building.outcome} systemQuests={systemQuests} systemTitle={building.name} />;
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
    content = <AtlasScreen architecture={realProjectOpen ? generated!.architecture : undefined} onArchitectureMutation={realProjectOpen ? async (mutation) => { const next = await mutateProjectArchitecture(generated!.project.projectId, mutation); setGenerated(next); show("Game Area updated."); } : undefined} onOpen={(entity) => navigate(detailRouteFor(workspaceState, entity))} onRepair={(repair) => show("Opened repair: " + repair.title)} state={workspaceState} />;
  } else if (parts.includes("assets") && realProjectOpen) {
    content = <RealAssetsScreen current={assetContext ?? current} onSnapshot={setGenerated} snapshot={generated!} />;
  } else if (parts.includes("build")) {
    content = <BuildScreen onOpen={(entity) => navigate(detailRouteFor(workspaceState, entity))} state={workspaceState} />;
  } else if (parts.includes("repair")) {
    const resolvedRepairContext = repairContext ?? persistedRepairContext ?? current;
    content = realProjectOpen ? <RealRepairScreen
      context={resolvedRepairContext}
      feedbackAlreadyRecorded={Boolean(followUpDraft?.feedbackEntryId ?? pendingRepairEntry?.entryId)}
      initialNote={followUpDraft?.kind === "repair" ? followUpDraft.note : pendingRepairEntry?.note ?? ""}
      onContinue={(note, files, feedbackEntryId) => continueRepair(resolvedRepairContext, note, files, feedbackEntryId)}
      onSnapshot={setGenerated}
      snapshot={generated!}
    /> : <RepairScreen onToast={show} state={workspaceState} />;
  } else if (parts.includes("publish")) {
    content = <PublishScreen onCheck={() => show("Release check started. Forgie found the items shown below.")} state={workspaceState} />;
  } else {
    const firstPart = current.kind === "building" ? current.childIds.map((id) => workspaceState.entities[id]).find((item) => item?.kind === "part") : null;
    content = <WorldMapScreen current={current} onAdd={(kind) => navigate(addRouteFor(workspaceState, current, kind))} onEdit={editCurrent} onOpen={(entity) => navigate(detailRouteFor(workspaceState, entity))} onPrimary={() => { if (firstPart) navigate(detailRouteFor(workspaceState, firstPart)); else { setAssetContext(current); navigate("/world/" + workspaceState.worldId + "/assets"); } }} state={workspaceState} />;
  }

  const activeStatus = activeRun?.phase === "approved" ? "A confirmed plan is waiting to start." : activeRun?.phase === "contract_review" ? "A work plan is waiting for review." : activeRun?.phase === "implementing" ? "Codex is updating the reviewed files." : activeRun?.phase === "verifying" ? "Forge is checking the result." : activeRun?.phase === "waiting_for_playtest" ? "The checked result is waiting for your playtest." : activeRun?.phase === "failed" ? "A check failed. Open this Step to review or prepare a repair." : activeRun?.phase === "cancelled" && activeRun.recovery.action === "rollback" ? "Building stopped, but its reviewed changes are still present. Stop safely to restore them before planning another Step." : "This Step needs your attention.";
  return <WorkspaceShell {...common} hideRails={hideRails}>{activeRun && activeStep && !onActiveStepPage && <ActiveWorkBanner canStop={activeRun.actions.cancel || activeRun.actions.rollback} name={activeStep.name} onOpen={() => navigate(`/world/${generated!.project.projectId}/part/${activeStep.id}/work`)} onStop={() => void stopActiveWork()} status={activeStatus} />}{content}{hideRails && path === "/worlds" && <div className="worlds-forgie"><ForgiePanel onOpen={() => setForgieOpen(true)} /></div>}{playtestContext && generated && <ContextualPlaytest context={playtestContext} onClose={() => setPlaytestContext(null)} onFollowUp={(result, note, files, feedbackEntryId) => openFollowUp(playtestContext, result, note, files, true, feedbackEntryId)} onSnapshot={setGenerated} onStopActive={activeRun ? stopActiveWork : undefined} snapshot={generated} />}{forgieOpen && <ForgieDrawer context={current} onClose={() => setForgieOpen(false)} onSubmit={(value) => { setForgieOpen(false); show("Forgie saved this request locally: " + value); }} />}{toast && <Toast message={toast} onClose={() => setToast(null)} />}</WorkspaceShell>;
}
