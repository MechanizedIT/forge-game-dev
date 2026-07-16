import { useEffect, useState } from "react";

import {
  approveGeneratedQuest,
  cancelGeneratedQuest,
  confirmGeneratedQuest,
  listSystemQuestFiles,
  loadGeneratedProjectWorld,
  loadGeneratedQuestRun,
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
import type { ForgeEntity, ForgeWorldState } from "./model.js";
import { ancestorsOf } from "./routes.js";

export interface PartFileChoice {
  existingFiles: string[];
  newFiles: string[];
}

function nativeQuest(snapshot: GeneratedProjectWorldSnapshot, questId: string) {
  return snapshot.systemQuestPlan?.systems.flatMap((system) => system.quests).find((quest) => quest.questId === questId) ?? null;
}

export function RealPartDetailScreen({ busy, onBack, onStart, part, snapshot, state }: {
  busy: boolean;
  onBack: () => void;
  onStart: (choice: PartFileChoice) => void;
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

  return <section className="tool-screen part-detail-screen real-part-detail"><header className="detail-header"><button className="back-button-v3" onClick={onBack} type="button"><Icon name="back" /> Back to Building</button><StatusBadge status={part.status} /><p className="screen-kicker">Part detail</p><h1>{part.name}</h1><p>{path.map((item) => item.name).join(" › ")}</p></header><div className="part-detail-grid"><article className="detail-card primary-detail"><p className="panel-kicker">Finished result</p><h2>{part.outcome}</h2><p>{part.description}</p><h3>Done when</h3><ol className="check-list">{part.acceptanceCriteria.map((criterion, index) => <li key={criterion}><span>{index + 1}</span>{criterion}</li>)}</ol><p className="related-building"><strong>Related Building:</strong> {system.title}</p></article><aside><section className="detail-card what-forgie-will-do"><p className="panel-kicker">What Forgie will do</p><h2>Build this one small result.</h2><p>Codex will change only the files listed here. Forge will check the project afterward, then give you the real game to try.</p><div className="recommended-files"><strong>Recommended files</strong>{allFiles.length ? allFiles.map((file) => <code key={file}>{file}</code>) : <small>{accepted ? "Finding the safest files…" : "Forge will use the saved work plan for this Part."}</small>}</div>{error && <p className="workflow-error" role="alert">{error}</p>}<button className="forge-primary-button wide" disabled={busy || !canStart} onClick={() => onStart({ existingFiles, newFiles })} type="button"><Icon name="build" /> {busy ? "Preparing…" : part.status === "building" ? "Continue Building" : "Start Building"}</button>{accepted && <button className="forge-secondary-button wide" onClick={() => setReviewOpen((open) => !open)} type="button">{reviewOpen ? "Hide Files" : "Review Files"}</button>}{reviewOpen && <div className="file-review"><fieldset><legend>Existing files</legend>{candidates.map((file) => <label key={file.relativePath}><input checked={existingFiles.includes(file.relativePath)} disabled={!existingFiles.includes(file.relativePath) && allFiles.length >= 4} onChange={() => toggleExisting(file.relativePath)} type="checkbox" /><code>{file.relativePath}</code></label>)}</fieldset><label><span>New files</span><textarea onChange={(event) => setNewFiles(event.target.value.split(/[,\n]/u).map((item) => item.trim()).filter(Boolean).slice(0, Math.max(0, 4 - existingFiles.length)))} value={newFiles.join("\n")} /></label></div>}<details className="advanced-details"><summary>Advanced Details</summary><p>Internal Project/System/Quest IDs: <code>{snapshot.project.projectId}</code> · <code>{system.systemId}</code> · <code>{quest.questId}</code></p><p>Current backend status: <code>{quest.status}</code></p><p>Forge still validates the exact work plan, file boundary, Godot health, and optional extra checks before playtesting.</p></details></section></aside></div></section>;
}

const phaseLabel: Record<GeneratedQuestRunSnapshot["phase"], string> = {
  contract_review: "Preparing the build",
  approved: "Preparing the build",
  implementing: "Codex is working",
  scope_review: "Waiting for your file choice",
  verifying: "Checking the result",
  waiting_for_playtest: "Ready to playtest",
  completion_pending: "Saving the result",
  completed: "Part complete",
  failed: "Needs attention",
  cancelled: "Building stopped",
  interrupted: "Building paused",
};

function progressSteps(run: GeneratedQuestRunSnapshot) {
  const rank = { contract_review: 1, approved: 1, implementing: 2, scope_review: 2, verifying: 3, waiting_for_playtest: 4, completion_pending: 5, completed: 5, failed: 2, cancelled: 1, interrupted: 2 }[run.phase];
  return ["Gathering the relevant project files", "Preparing the build", "Codex is working", "Checking the result", "Ready to playtest"].map((label, index) => ({ label, done: index < rank, current: index === rank }));
}

export function RealPartWorkflowScreen({ onBack, onSnapshot, questId, snapshot }: {
  onBack: () => void;
  onSnapshot: (snapshot: GeneratedProjectWorldSnapshot) => void;
  questId: string;
  snapshot: GeneratedProjectWorldSnapshot;
}) {
  const brief = snapshot.quests.find((quest) => quest.questId === questId);
  const [run, setRun] = useState<GeneratedQuestRunSnapshot | null>(brief?.run ?? null);
  const [busy, setBusy] = useState(false);
  const [played, setPlayed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
    } catch (next) { setError(next instanceof Error ? next.message : String(next)); }
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
    } catch (next) { setError(next instanceof Error ? next.message : String(next)); }
    finally { setBusy(false); }
  };
  const play = async () => {
    if (busy) return;
    setBusy(true);
    try { const result = await playGeneratedQuest(projectId, questId); setPlayed(true); setNotice(result.message); setError(null); }
    catch (next) { setError(next instanceof Error ? next.message : String(next)); }
    finally { setBusy(false); }
  };
  const confirm = (result: GeneratedCreatorResult) => void action(() => confirmGeneratedQuest(projectId, questId, result), result === "worked");

  if (!quest) return <section className="tool-screen"><h1>This Part is no longer in the World.</h1><button onClick={onBack} type="button">Back to World</button></section>;
  if (!run) return <section className="tool-screen real-workflow-screen"><button className="back-button-v3" onClick={onBack} type="button"><Icon name="back" /> Back to Part</button><h1>Opening the saved build…</h1></section>;
  const steps = progressSteps(run);
  const proofRows = Object.entries(run.proofs) as Array<[string, GeneratedQuestRunSnapshot["proofs"][keyof GeneratedQuestRunSnapshot["proofs"]]]>;

  return <section className="tool-screen real-workflow-screen"><header><button className="back-button-v3" disabled={run.phase === "implementing" || run.phase === "verifying" || run.phase === "completion_pending"} onClick={onBack} type="button"><Icon name="back" /> Back to Part</button><p className="screen-kicker">Building Part</p><h1>{quest.title}</h1><p>{run.contract.visibleOutcome}</p><StatusBadge status={run.phase === "completed" ? "complete" : run.phase === "failed" || run.phase === "scope_review" ? "attention" : "building"} /></header><div className="real-workflow-grid"><section className="detail-card"><h2>{phaseLabel[run.phase]}</h2><ol className="plain-progress">{steps.map((step) => <li className={step.done ? "done" : step.current ? "current" : ""} key={step.label}><span>{step.done ? <Icon name="check" /> : ""}</span>{step.label}</li>)}</ol>{run.progress.length > 0 && <p className="latest-progress">{run.progress.at(-1)}</p>}{notice && <p className="workflow-notice" role="status">{notice}</p>}{error && <p className="workflow-error" role="alert">{error}</p>}<div className="workflow-actions">{(run.phase === "contract_review" || run.phase === "approved") && <button className="forge-primary-button" disabled={busy} onClick={() => void continueWork()} type="button">{busy ? "Starting…" : "Continue Building"}</button>}{run.actions.play && <button className="forge-primary-button playtest-button" disabled={busy} onClick={() => void play()} type="button"><Icon name="play" /> Playtest</button>}{run.actions.confirm && played && <><button className="forge-primary-button" disabled={busy} onClick={() => confirm("worked")} type="button">Worked</button><button className="forge-secondary-button" disabled={busy} onClick={() => confirm("did_not_work")} type="button">Needs Fixing</button><button className="forge-secondary-button" disabled={busy} onClick={() => confirm("not_ready")} type="button">Not Sure</button></>}{run.actions.cancel && !run.actions.confirm && <button className="forge-secondary-button" disabled={busy} onClick={() => void action(() => cancelGeneratedQuest(projectId, questId))} type="button">Stop safely</button>}{run.actions.rollback && <button className="forge-secondary-button" disabled={busy} onClick={() => void action(() => rollbackGeneratedQuest(projectId, questId), true)} type="button">Undo reviewed changes</button>}{run.phase === "completed" && <button className="forge-primary-button" onClick={onBack} type="button">Return to World</button>}</div></section><aside className="detail-card workflow-proof"><p className="panel-kicker">Checks</p>{proofRows.map(([key, proof]) => <article key={key}><span className={"proof-dot " + proof.result} /><div><strong>{key === "projectHealth" ? "Godot health" : key === "boundary" ? "Chosen files" : key === "creator" ? "Your playtest" : "Extra check"}</strong><small>{proof.result.replaceAll("_", " ")}</small></div></article>)}<details className="advanced-details"><summary>Advanced Details</summary><p>Phase: <code>{run.phase}</code></p><p>Work ID: <code>{run.contract.fingerprint}</code></p><p>Allowed files:</p>{run.contract.allowedFiles.map((file) => <code className="contract-file" key={file.relativePath}>{file.relativePath}</code>)}{run.error && <p>{run.error}</p>}</details></aside></div></section>;
}
