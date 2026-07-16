import { useEffect, useState } from "react";

import {
  approveGeneratedQuest,
  cancelGeneratedQuest,
  confirmGeneratedQuest,
  listSystemQuestFiles,
  loadGeneratedProjectWorld,
  loadGeneratedQuestRun,
  mutateForgePresentation,
  playGeneratedQuest,
  rollbackGeneratedQuest,
  startGeneratedQuest,
  subscribeToGeneratedQuest,
} from "../../dashboard/api.js";
import type { GeneratedCreatorResult } from "../../contracts/index.js";
import type { GeneratedProjectWorldSnapshot, SystemQuestFileCandidate } from "../../generated-project-world/shared.js";
import type { GeneratedQuestRunSnapshot } from "../../generated-quest-runner/shared.js";
import { recommendQuestFiles } from "../SystemQuestRefinement.js";
import { Icon, StatusBadge } from "./components.js";
import { TuningSection } from "./creator-tools.js";
import { friendlyRunError } from "./friendly-errors.js";
import type { ForgeEntity, ForgeWorldState } from "./model.js";
import { ancestorsOf } from "./routes.js";

export interface PartFileChoice {
  existingFiles: string[];
  newFiles: string[];
}

export interface FollowUpPreparation {
  kind: "change" | "repair";
  note: string;
  originalStepId: string;
  originalStepName: string;
  files: string[];
  feedbackEntryId?: string | undefined;
}

function nativeQuest(snapshot: GeneratedProjectWorldSnapshot, questId: string) {
  return snapshot.systemQuestPlan?.systems.flatMap((system) => system.quests).find((quest) => quest.questId === questId) ?? null;
}

export function RealPartDetailScreen({ activeRun, busy, followUp, onBack, onEdit, onSnapshot, onStart, onStopActive, onTest, part, snapshot, state }: {
  activeRun?: GeneratedQuestRunSnapshot | null | undefined;
  busy: boolean;
  followUp?: FollowUpPreparation | null | undefined;
  onBack: () => void;
  onEdit: () => void;
  onSnapshot: (snapshot: GeneratedProjectWorldSnapshot) => void;
  onStart: (choice: PartFileChoice) => void;
  onStopActive?: (() => void) | undefined;
  onTest: () => void;
  part: ForgeEntity;
  snapshot: GeneratedProjectWorldSnapshot;
  state: ForgeWorldState;
}) {
  const quest = snapshot.projectModel.quests.find((item) => item.questId === part.id)!;
  const system = snapshot.projectModel.systems.find((item) => item.systemId === quest.systemId)!;
  const accepted = nativeQuest(snapshot, quest.questId);
  const [candidates, setCandidates] = useState<SystemQuestFileCandidate[]>([]);
  const [existingFiles, setExistingFiles] = useState<string[]>(accepted?.workOrder?.existingFiles ?? part.relatedFiles);
  const [newFiles, setNewFiles] = useState<string[]>(accepted?.workOrder?.newFiles ?? []);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accepted) return;
    let active = true;
    void listSystemQuestFiles(snapshot.project.projectId, system.systemId).then((files) => {
      if (!active) return;
      setCandidates(files);
      if (!accepted.workOrder) {
        const recommendation = recommendQuestFiles(accepted, files);
        setExistingFiles(recommendation.existingFiles);
        if (recommendation.existingFiles.length === 0 && recommendation.suggestedNewFile) setNewFiles([recommendation.suggestedNewFile]);
      }
    }).catch((next) => active && setError(next instanceof Error ? next.message : String(next)));
    return () => { active = false; };
  }, [accepted, snapshot.project.projectId, system.systemId]);

  const path = ancestorsOf(state, part);
  const allFiles = [...existingFiles, ...newFiles];
  const canStart = quest.status !== "completed" && quest.status !== "blocked" && quest.status !== "deferred" && (!accepted || allFiles.length > 0);
  const toggleExisting = (file: string) => setExistingFiles((current) => current.includes(file) ? current.filter((item) => item !== file) : current.length + newFiles.length < 4 ? [...current, file] : current);
  const history = (snapshot.presentation?.history ?? []).filter((entry) => entry.entityId === part.id).slice(-6).reverse();
  const relatedAreas = snapshot.architecture.gameAreas.filter((area) => area.relatedStepIds.includes(part.id));
  const primaryArea = [...relatedAreas].sort((left, right) => right.relatedFilePaths.filter((file) => allFiles.includes(file)).length - left.relatedFilePaths.filter((file) => allFiles.includes(file)).length)[0];
  const secondaryAreas = relatedAreas.filter((area) => area.id !== primaryArea?.id).slice(0, 3);
  const sharedFiles = allFiles.filter((file) => snapshot.architecture.gameAreas.filter((area) => area.relatedFilePaths.includes(file)).length > 1);
  const dependencyNames = Array.from(new Set(relatedAreas.flatMap((area) => area.dependencyIds))).map((id) => snapshot.architecture.gameAreas.find((area) => area.id === id)?.name).filter(Boolean);

  const activeStatus = activeRun ? phaseLabel[activeRun.phase] : null;
  const activeAction = activeRun?.phase === "waiting_for_playtest" ? "Open Playtest" : activeRun?.phase === "failed" ? "Review Failure" : activeRun?.phase === "implementing" || activeRun?.phase === "verifying" ? "Open Progress" : "Continue Building";
  return <section className="tool-screen part-detail-screen real-part-detail"><header className="detail-header"><button className="back-button-v3" onClick={onBack} type="button"><Icon name="back" /> Back to Experience</button><StatusBadge status={activeRun?.phase === "failed" ? "attention" : part.status} /><p className="screen-kicker">Step detail</p><h1>{part.name}</h1><p>{path.map((item) => item.name).join(" › ")}</p>{activeRun && <div className="inline-work-status" role="status"><strong>Current work: {activeStatus}</strong><p>{activeRun.phase === "waiting_for_playtest" ? "The checked result is ready to play." : activeRun.phase === "failed" ? "A check failed. Open the build to review or prepare a repair." : "Forge is keeping this Step open until you continue or stop safely."}</p></div>}<div className="detail-inline-actions"><button disabled={Boolean(activeRun && activeRun.phase !== "cancelled" && activeRun.phase !== "completed")} onClick={onEdit} title={activeRun ? "Finish or stop the current work before editing this Step." : "Edit Step"} type="button"><Icon name="edit" /> Edit Step</button>{(!activeRun || activeRun.phase === "waiting_for_playtest") && <button onClick={onTest} type="button"><Icon name="play" /> Test</button>}</div>{activeRun && <p className="workflow-notice">Editing is paused while this work session is open. Continue it below or stop it safely first.</p>}</header>{followUp && <section className="detail-card follow-up-preparation"><p className="panel-kicker">{followUp.kind === "repair" ? "Repair preparation" : "Follow-up change"}</p><h2>{followUp.kind === "repair" ? "Repair this result" : "Build this requested change"}</h2><p><strong>Requested change:</strong> {followUp.note}</p><p><strong>Related original Step:</strong> {followUp.originalStepName}</p></section>}<div className="part-detail-grid"><article className="detail-card primary-detail"><p className="panel-kicker">Intended change</p><h2>{part.outcome}</h2><p>{part.description}</p><h3>Success looks like</h3><ol className="check-list">{part.acceptanceCriteria.map((criterion, index) => <li key={criterion}><span>{index + 1}</span>{criterion}</li>)}</ol><p className="related-building"><strong>Related Experience:</strong> {system.title}</p></article><aside><section className="detail-card what-forgie-will-do"><p className="panel-kicker">What Forgie will do</p><h2>Build this one small result.</h2><p>Codex will change only the files listed here. Forge will check the project afterward, then give you the real game to try.</p>{primaryArea && <div className="architecture-summary"><strong>Forgie found related parts of your game</strong><p>Primary area: {primaryArea.name}</p>{secondaryAreas.length > 0 && <p>Also affected: {secondaryAreas.map((area) => area.name).join(" and ")}</p>}</div>}{sharedFiles.length > 0 && <p className="architecture-warning">This change touches files used by several Game Areas. Forge will keep the related checks in context.</p>}{dependencyNames.length > 0 && <p className="architecture-warning">This change may also affect {dependencyNames.join(" and ")}. Forge will include its relevant checks.</p>}<div className="recommended-files"><strong>Recommended files</strong>{allFiles.length ? allFiles.map((file) => <code key={file}>{file}</code>) : <small>{accepted ? "Finding the safest files…" : "Forge will use the saved work plan for this Step."}</small>}</div>{error && <p className="workflow-error" role="alert">{error}</p>}<button className="forge-primary-button wide" disabled={busy || !canStart} onClick={() => onStart({ existingFiles, newFiles })} type="button"><Icon name="build" /> {busy ? "Preparing…" : activeRun ? activeAction : followUp ? followUp.kind === "repair" ? "Repair This" : "Build This Change" : "Start Building"}</button>{(activeRun?.actions.cancel || activeRun?.actions.rollback) && onStopActive && <button className="forge-secondary-button wide" onClick={onStopActive} type="button">Stop safely</button>}{accepted && <button className="forge-secondary-button wide" onClick={() => setReviewOpen((open) => !open)} type="button">{reviewOpen ? "Hide Files" : "Review Files"}</button>}{reviewOpen && <div className="file-review"><fieldset><legend>Existing files</legend>{candidates.map((file) => <label key={file.relativePath}><input checked={existingFiles.includes(file.relativePath)} disabled={!existingFiles.includes(file.relativePath) && allFiles.length >= 4} onChange={() => toggleExisting(file.relativePath)} type="checkbox" /><code>{file.relativePath}</code></label>)}</fieldset><label><span>New files</span><textarea onChange={(event) => setNewFiles(event.target.value.split(/[,\n]/u).map((item) => item.trim()).filter(Boolean).slice(0, Math.max(0, 4 - existingFiles.length)))} value={newFiles.join("\n")} /></label></div>}<details className="advanced-details"><summary>Advanced Details</summary><p>Related Game Areas: {relatedAreas.map((area) => area.name).join(" · ") || "None yet"}</p>{relatedAreas.flatMap((area) => area.constraints).map((constraint) => <p key={constraint}>Constraint: {constraint}</p>)}<p>Internal compatibility IDs: <code>{snapshot.project.projectId}</code> · <code>{system.systemId}</code> · <code>{quest.questId}</code></p><p>Current backend status: <code>{quest.status}</code></p><p>Forge still validates the exact work plan, file boundary, Godot health, and optional extra checks before playtesting.</p></details></section></aside></div><TuningSection entity={part} onSnapshot={onSnapshot} snapshot={snapshot} /><section className="detail-card step-history"><p className="panel-kicker">History</p><h2>What happened with this Step</h2>{history.length ? history.map((entry) => <article key={entry.entryId}><strong>{entry.type.replaceAll("_", " ")}</strong><p>{entry.note || entry.summary}</p>{entry.linkedFollowUpId && <small>Follow-up Step: {entry.linkedFollowUpId}</small>}<time>{new Date(entry.occurredAt).toLocaleString()}</time></article>) : <p>No work or playtest notes have been recorded yet.</p>}</section></section>;
}

const phaseLabel: Record<GeneratedQuestRunSnapshot["phase"], string> = {
  contract_review: "Preparing the build",
  approved: "Preparing the build",
  implementing: "Codex is working",
  scope_review: "Waiting for your file choice",
  verifying: "Checking the result",
  waiting_for_playtest: "Ready to playtest",
  completion_pending: "Saving the result",
  completed: "Step complete",
  failed: "Needs attention",
  cancelled: "Building stopped",
  interrupted: "Building paused",
};

function progressSteps(run: GeneratedQuestRunSnapshot) {
  const labels = ["Gathering the relevant project files", "Preparing the build", "Codex updated the reviewed files", "Checking the result", "Ready to playtest"];
  if (run.phase === "failed") return labels.map((label, index) => ({ label, done: index < 2 || (index === 2 && run.changedFiles.length > 0), current: false, failed: index === 3 }));
  const rank = { contract_review: 1, approved: 1, implementing: 2, scope_review: 2, verifying: 3, waiting_for_playtest: 4, completion_pending: 5, completed: 5, cancelled: 1, interrupted: 2 }[run.phase];
  return labels.map((label, index) => ({ label: index === 2 && run.phase === "implementing" ? "Codex is working" : label, done: index < rank, current: index === rank, failed: false }));
}

export function RealPartWorkflowScreen({ followUp, onBack, onFollowUp, onSnapshot, questId, snapshot }: {
  followUp?: FollowUpPreparation | null | undefined;
  onBack: () => void;
  onFollowUp: (result: "needs_change" | "broken", note: string, feedbackEntryId?: string) => Promise<void> | void;
  onSnapshot: (snapshot: GeneratedProjectWorldSnapshot) => void;
  questId: string;
  snapshot: GeneratedProjectWorldSnapshot;
}) {
  const brief = snapshot.quests.find((quest) => quest.questId === questId);
  const [run, setRun] = useState<GeneratedQuestRunSnapshot | null>(brief?.run ?? null);
  const [busy, setBusy] = useState(false);
  const [played, setPlayed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reviewFailure, setReviewFailure] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const projectId = snapshot.project.projectId;
  const quest = snapshot.projectModel.quests.find((item) => item.questId === questId);

  const refreshWorld = async () => onSnapshot(await loadGeneratedProjectWorld(projectId));
  useEffect(() => {
    if (!run || run.phase === "completed" || run.phase === "cancelled") return;
    return subscribeToGeneratedQuest(projectId, questId, () => {
      void loadGeneratedQuestRun(projectId, questId).then((next) => {
        setRun(next);
        if (next.phase === "completed") void refreshWorld();
      }).catch(() => undefined);
    }, () => undefined);
  }, [projectId, questId, run?.phase]);

  const action = async (operation: () => Promise<GeneratedQuestRunSnapshot>, refresh = false) => {
    if (busy) return;
    setBusy(true);
    try {
      const next = await operation();
      setRun(next);
      setError(null);
      if (refresh || next.phase === "completed") await refreshWorld();
    } catch (next) { setError(friendlyRunError(next instanceof Error ? next.message : String(next))); }
    finally { setBusy(false); }
  };
  const continueWork = async () => {
    if (!run || busy) return;
    setBusy(true);
    try {
      let next = run;
      if (next.phase === "contract_review") next = await approveGeneratedQuest(projectId, questId, next.contract.fingerprint);
      if (next.phase === "approved") next = await startGeneratedQuest(projectId, questId);
      setRun(next);
      setError(null);
    } catch (next) { setError(friendlyRunError(next instanceof Error ? next.message : String(next))); }
    finally { setBusy(false); }
  };
  const play = async () => {
    if (busy) return;
    setBusy(true);
    try { const result = await playGeneratedQuest(projectId, questId); setPlayed(true); setNotice(result.message); setError(null); }
    catch (next) { setError(friendlyRunError(next instanceof Error ? next.message : String(next))); }
    finally { setBusy(false); }
  };
  const submitResult = async (result: "worked" | "needs_change" | "broken" | "not_sure") => {
    const mapped: GeneratedCreatorResult = result === "worked" ? "worked" : result === "broken" ? "did_not_work" : "not_ready";
    if (busy) return;
    setBusy(true);
    try {
      const confirmed = await confirmGeneratedQuest(projectId, questId, mapped);
      setRun(confirmed);
      const note = feedback.trim() || (result === "worked" ? "Confirmed this Step works in the game." : result === "not_sure" ? "Creator needs another playtest." : result.replaceAll("_", " "));
      const next = await mutateForgePresentation(projectId, { action: "record_feedback", entityId: questId, result, note, relatedFiles: run?.contract.allowedFiles.map((file) => file.relativePath) ?? [] });
      onSnapshot(next);
      const entryId = next.presentation?.history.at(-1)?.entryId;
      if (result === "needs_change" || result === "broken") await onFollowUp(result, note, entryId);
      else if (result === "worked") onBack();
      else setUncertain(true);
      setError(null);
    } catch (next) { setError(friendlyRunError(next instanceof Error ? next.message : String(next))); }
    finally { setBusy(false); }
  };

  if (!quest) return <section className="tool-screen"><h1>This Step is no longer in the World.</h1><button onClick={onBack} type="button">Back to World</button></section>;
  if (!run) return <section className="tool-screen real-workflow-screen"><button className="back-button-v3" onClick={onBack} type="button"><Icon name="back" /> Back to Step</button><h1>Opening the saved build…</h1></section>;
  const steps = progressSteps(run);
  const proofRows = Object.entries(run.proofs) as Array<[string, GeneratedQuestRunSnapshot["proofs"][keyof GeneratedQuestRunSnapshot["proofs"]]]>;
  const failedProof = proofRows.find(([, proof]) => proof.result === "failed");
  const failureSummary = failedProof?.[1].summary ?? run.error ?? "A required check failed.";
  const repairRequest = followUp?.kind === "repair" ? followUp.note : run.contract.repairRequest;
  const stopAndReturn = async () => {
    if (run.actions.rollback) await action(() => rollbackGeneratedQuest(projectId, questId), true);
    else if (run.actions.cancel) await action(() => cancelGeneratedQuest(projectId, questId), true);
    onBack();
  };
  const prepareRepair = async () => onFollowUp("broken", failureSummary);

  return <section className="tool-screen real-workflow-screen">
    <header><button className="back-button-v3" disabled={run.phase === "implementing" || run.phase === "verifying" || run.phase === "completion_pending"} onClick={onBack} type="button"><Icon name="back" /> Back to Step</button><p className="screen-kicker">{repairRequest ? "Repairing Step" : followUp ? "Building Change to Step" : "Building Step"}</p><h1>{followUp ? followUp.originalStepName : quest.title}</h1>{repairRequest ? <section className="follow-up-preparation" role="status"><strong>Repair request</strong><p>{repairRequest}</p><small>New work session for this same Step.</small></section> : followUp && <section className="follow-up-preparation" role="status"><strong>Requested change</strong><p>{followUp.note}</p><small>Follow-up Step: {quest.title}</small></section>}<p>{run.contract.visibleOutcome}</p><StatusBadge status={run.phase === "completed" ? "complete" : run.phase === "failed" || run.phase === "scope_review" ? "attention" : "building"} /></header>
    <div className="real-workflow-grid"><section className="detail-card"><h2>{phaseLabel[run.phase]}</h2>
      <ol className="plain-progress">{steps.map((step) => <li className={step.failed ? "failed" : step.done ? "done" : step.current ? "current" : ""} key={step.label}><span>{step.done ? <Icon name="check" /> : step.failed ? "!" : ""}</span>{step.label}</li>)}</ol>
      {run.phase === "failed" ? <section className="verification-failure" role="alert"><strong>{failedProof?.[0] === "mechanic" ? "The extra mechanic check failed." : "A required check failed."}</strong><p>{failureSummary}</p></section> : run.progress.length > 0 && <p className="latest-progress">{run.progress.at(-1)}</p>}
      {notice && <p className="workflow-notice" role="status">{notice}</p>}{error && <p className="workflow-error" role="alert">{error}</p>}
      {uncertain && <section className="uncertain-actions"><strong>Keep this Step open or stop safely.</strong><div className="workflow-actions"><button className="forge-primary-button" disabled={busy} onClick={() => { setUncertain(false); setPlayed(false); void play(); }} type="button">Playtest Again</button><button className="forge-secondary-button" onClick={onBack} type="button">Review Step</button><button className="forge-secondary-button" disabled={busy} onClick={() => void stopAndReturn()} type="button">Stop safely</button></div></section>}
      {!uncertain && <div className="workflow-actions">{(run.phase === "contract_review" || run.phase === "approved") && <button className="forge-primary-button" disabled={busy} onClick={() => void continueWork()} type="button">{busy ? "Starting…" : "Continue Building"}</button>}{run.phase === "failed" && <button className="forge-primary-button" disabled={busy} onClick={() => void prepareRepair()} type="button">Prepare Repair</button>}{run.phase === "failed" && <button className="forge-secondary-button" onClick={() => setReviewFailure((value) => !value)} type="button">Review Failure</button>}{run.actions.play && <button className="forge-primary-button playtest-button" disabled={busy} onClick={() => void play()} type="button"><Icon name="play" /> {busy ? "Playing…" : "Playtest"}</button>}{run.actions.confirm && played && <><label className="playtest-note"><span>What did you notice or want changed?</span><textarea onChange={(event) => setFeedback(event.target.value)} value={feedback} /></label><button className="forge-primary-button" disabled={busy} onClick={() => void submitResult("worked")} type="button">Worked</button><button className="forge-secondary-button" disabled={busy} onClick={() => void submitResult("needs_change")} type="button">Needs a Change</button><button className="forge-secondary-button" disabled={busy} onClick={() => void submitResult("broken")} type="button">Broken</button><button className="forge-secondary-button" disabled={busy} onClick={() => void submitResult("not_sure")} type="button">Not Sure</button></>}{(run.actions.cancel || (run.phase === "failed" && run.actions.rollback)) && <button className="forge-secondary-button" disabled={busy} onClick={() => void stopAndReturn()} type="button">Stop safely</button>}{run.actions.rollback && <button className="forge-secondary-button" disabled={busy} onClick={() => void action(() => rollbackGeneratedQuest(projectId, questId), true)} type="button">Undo reviewed changes</button>}{run.phase === "completed" && <button className="forge-primary-button" onClick={onBack} type="button">Return to World</button>}</div>}
      {reviewFailure && <details className="failure-review" open><summary>Failure details</summary>{failedProof?.[1].evidence.map((item) => <pre key={item}>{item}</pre>)}</details>}
    </section><aside className="detail-card workflow-proof"><p className="panel-kicker">Checks</p>{proofRows.map(([key, proof]) => <article key={key}><span className={"proof-dot " + proof.result} /><div><strong>{key === "projectHealth" ? "Godot health" : key === "boundary" ? "Chosen files" : key === "creator" ? "Your playtest" : "Extra check"}</strong><small>{proof.result.replaceAll("_", " ")}</small></div></article>)}<details className="advanced-details"><summary>Context Summary</summary>{run.contextSummary ? <><p>Primary Game Area: {run.contextSummary.primaryArea ?? "No strong match"}</p>{run.contextSummary.secondaryAreas.length > 0 && <p>Also affected: {run.contextSummary.secondaryAreas.join(" · ")}</p>}{run.contextSummary.relatedPreviousSteps.length > 0 && <p>Related previous Steps: {run.contextSummary.relatedPreviousSteps.join(" · ")}</p>}<p>Selected files:</p>{run.contextSummary.selectedFiles.map((file) => <code className="contract-file" key={file}>{file}</code>)}{run.contextSummary.regressionChecks.map((check) => <p key={check}>Check: {check}</p>)}</> : <p>Forge used the approved Step and file boundary. No saved Game Area context was available.</p>}</details><details className="advanced-details"><summary>Advanced Details</summary><p>Phase: <code>{run.phase}</code></p><p>Work ID: <code>{run.contract.fingerprint}</code></p><p>Allowed files:</p>{run.contract.allowedFiles.map((file) => <code className="contract-file" key={file.relativePath}>{file.relativePath}</code>)}{run.error && <p>{run.error}</p>}</details></aside></div>
  </section>;
}
