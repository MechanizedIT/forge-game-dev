import { useEffect, useMemo, useState } from "react";

import {
  acceptSystemQuestPlanning,
  acceptSystemQuestWorkOrder,
  answerSystemQuestPlanning,
  cancelSystemQuestPlanning,
  listSystemQuestFiles,
  loadSystemQuestPlanning,
  retrySystemQuestPlanning,
  reviewSystemQuestWorkOrder,
  reviseSystemQuestPlanning,
  startSystemQuestPlanning,
  subscribeToSystemQuestPlanning,
} from "../dashboard/api.js";
import type { SystemQuestPlanningSnapshot } from "../blueprint-planner/system-quest.js";
import type { SystemQuestFileCandidate } from "../generated-project-world/shared.js";

export function friendlyQuestPlanningError(message: string | null): string {
  if (!message || /invalid_json_schema|response_format|text\.format\.schema|invalid_request_error|\{\s*"type"\s*:/iu.test(message)) {
    return "Forge could not suggest quests this time. Your description is still here, so you can try again safely.";
  }
  return message;
}

export function SystemQuestRefinement({ projectId, systemId, systemTitle, systemOutcome, onClose, onChanged, onReady }: {
  projectId: string;
  systemId: string;
  systemTitle: string;
  systemOutcome: string;
  onClose: () => void;
  onChanged: () => Promise<void>;
  onReady: (questId: string) => Promise<void> | void;
}) {
  const [snapshot, setSnapshot] = useState<SystemQuestPlanningSnapshot | null>(null);
  const [description, setDescription] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revision, setRevision] = useState("");
  const [files, setFiles] = useState<SystemQuestFileCandidate[]>([]);
  const [existingFiles, setExistingFiles] = useState<string[]>([]);
  const [newFileText, setNewFileText] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => setSnapshot(await loadSystemQuestPlanning(projectId, systemId));
  useEffect(() => {
    let active = true;
    void loadSystemQuestPlanning(projectId, systemId).then((value) => { if (active) { setSnapshot(value); setDescription(value.description); setBusy(false); } }).catch((next) => { if (active) { setError(friendlyQuestPlanningError(next instanceof Error ? next.message : String(next))); setBusy(false); } });
    const unsubscribe = subscribeToSystemQuestPlanning(projectId, systemId, () => void refresh().catch(() => {}), () => {});
    return () => { active = false; unsubscribe(); };
  }, [projectId, systemId]);

  useEffect(() => {
    if (!snapshot || !["quests_accepted", "choosing_files", "work_order_review", "ready"].includes(snapshot.phase)) return;
    void listSystemQuestFiles(projectId, systemId).then(setFiles).catch((next) => setError(next instanceof Error ? next.message : String(next)));
  }, [projectId, snapshot?.phase, systemId]);

  const newFiles = useMemo(() => newFileText.split(/[,\n]/u).map((value) => value.trim()).filter(Boolean), [newFileText]);
  const run = async (operation: () => Promise<SystemQuestPlanningSnapshot>, changed = false): Promise<boolean> => {
    if (busy) return false;
    setBusy(true);
    try {
      const value = await operation();
      setSnapshot(value);
      setError(null);
      if (changed) await onChanged();
      return true;
    } catch (next) { setError(friendlyQuestPlanningError(next instanceof Error ? next.message : String(next))); return false; }
    finally { setBusy(false); }
  };
  const cancel = () => void run(() => cancelSystemQuestPlanning(projectId, systemId));

  if (busy && !snapshot) return <main className="system-quest-refinement"><p className="v2-eyebrow">Quest guide</p><h1>Opening this system…</h1></main>;
  if (!snapshot) return <main className="system-quest-refinement"><h1>Forge stopped safely.</h1><p role="alert">{error}</p><button className="v2-button button-quiet" onClick={() => void refresh()} type="button">Retry</button></main>;

  const common = <header><p className="v2-eyebrow">Edit this game system</p><h1>{systemTitle}</h1><p>{systemOutcome}</p><small>No Godot file changes. Codex has not started.</small></header>;
  if (["idle", "cancelled"].includes(snapshot.phase)) return <main className="system-quest-refinement">{common}{error && <p className="workflow-error" role="alert">{error}</p>}<label><span>What should the player experience here?</span><textarea maxLength={1500} minLength={12} onChange={(event) => setDescription(event.target.value)} placeholder="The beacon should feel useful before the storm becomes dangerous…" rows={5} value={description} /></label><div className="system-quest-actions"><button className="v2-button button-quiet" onClick={onClose} type="button">Back to roadmap</button><button className="v2-button button-ember" disabled={busy || description.trim().length < 12} onClick={() => void run(() => startSystemQuestPlanning(projectId, systemId, description))} type="button">Suggest small quests</button></div></main>;

  if (["planning", "revising", "accepting_quests", "accepting_work_order"].includes(snapshot.phase)) return <main className="system-quest-refinement">{common}<section className="workspace-empty"><strong>{snapshot.phase === "accepting_quests" || snapshot.phase === "accepting_work_order" ? "Saving the exact choice…" : "Forgie is shaping a short quest path…"}</strong><p>Your words stay here while Forge finishes this one step.</p></section></main>;

  if (snapshot.phase === "clarification") return <main className="system-quest-refinement">{common}<section><h2>One small question round</h2><p>Forge needs only these answers before suggesting quests.</p>{snapshot.clarificationQuestions.map((question) => <label key={question.questionId}><span>{question.question}</span><small>{question.whyItMatters}</small><input maxLength={240} onChange={(event) => setAnswers((current) => ({ ...current, [question.questionId]: event.target.value }))} value={answers[question.questionId] ?? ""} /></label>)}</section>{error && <p className="workflow-error" role="alert">{error}</p>}<div className="system-quest-actions"><button className="v2-button button-quiet" onClick={cancel} type="button">Cancel</button><button className="v2-button button-ember" disabled={busy || snapshot.clarificationQuestions.some((question) => !(answers[question.questionId] ?? "").trim())} onClick={() => void run(() => answerSystemQuestPlanning(projectId, systemId, snapshot.clarificationQuestions.map((question) => ({ questionId: question.questionId, answer: answers[question.questionId] ?? "" }))))} type="button">Use these answers</button></div></main>;

  if (snapshot.phase === "failed") return <main className="system-quest-refinement">{common}<p className="workflow-error" role="alert">{friendlyQuestPlanningError(snapshot.error)}</p><div className="system-quest-actions"><button className="v2-button button-quiet" onClick={cancel} type="button">Cancel</button><button className="v2-button button-ember" onClick={() => void run(() => retrySystemQuestPlanning(projectId, systemId))} type="button">Retry the same step</button></div></main>;

  if (snapshot.phase === "review" && snapshot.proposal && snapshot.proposalFingerprint) return <main className="system-quest-refinement">{common}<section><h2>Check the new quests</h2><p>Existing quests stay fixed. These are added in this order.</p><div className="workspace-quest-grid system-quest-proposal">{snapshot.proposal.map((quest, index) => <article className="workspace-quest-card" key={`${index}-${quest.title}`}><small>New quest {index + 1}</small><strong>{quest.title}</strong><p>{quest.playerVisibleOutcome}</p><details><summary>Done when</summary><ul>{quest.doneWhen.map((item) => <li key={item}>{item}</li>)}</ul><strong>Not included</strong><ul>{quest.excludedScope.map((item) => <li key={item}>{item}</li>)}</ul></details></article>)}</div></section><label><span>Ask for one change</span><input maxLength={500} onChange={(event) => setRevision(event.target.value)} placeholder="Make the first quest smaller…" value={revision} /></label>{(error || snapshot.error) && <p className="workflow-error" role="alert">{error ?? snapshot.error}</p>}<div className="system-quest-actions"><button className="v2-button button-quiet" onClick={cancel} type="button">Cancel</button><button aria-label="Edit these quests" className="v2-button button-quiet" disabled={busy || revision.trim().length < 3} onClick={() => void run(() => reviseSystemQuestPlanning(projectId, systemId, revision))} title="Edit these quests" type="button"><span aria-hidden="true">✎</span><span className="sr-only">Edit these quests</span></button><button className="v2-button button-ember" disabled={busy} onClick={() => void run(() => acceptSystemQuestPlanning(projectId, systemId, snapshot.proposalFingerprint!), true)} type="button">Confirm quests</button></div></main>;

  if (snapshot.phase === "work_order_review" && snapshot.workOrder) return <main className="system-quest-refinement">{common}<section className="generated-contract"><header><p className="v2-eyebrow">Check the work plan</p><h2>Files Codex may change</h2></header><div className="generated-contract-grid"><article><h3>Existing files</h3>{snapshot.workOrder.existingFiles.length ? snapshot.workOrder.existingFiles.map((file) => <code className="contract-file" key={file}>{file}</code>) : <p>None.</p>}</article><article><h3>New files</h3>{snapshot.workOrder.newFiles.length ? snapshot.workOrder.newFiles.map((file) => <code className="contract-file" key={file}>{file}</code>) : <p>None.</p>}</article></div><p>Confirming this plan does not start Codex or change the game.</p></section>{(error || snapshot.error) && <p className="workflow-error" role="alert">{error ?? snapshot.error}</p>}<div className="system-quest-actions"><button className="v2-button button-quiet" onClick={cancel} type="button">Change files</button><button className="v2-button button-ember" onClick={() => void run(() => acceptSystemQuestWorkOrder(projectId, systemId, snapshot.workOrder!.fingerprint), true)} type="button">Confirm this plan</button></div></main>;

  if (snapshot.phase === "ready") return <main className="system-quest-refinement">{common}<section className="workspace-empty"><strong>Work plan saved.</strong><p>Your quests and chosen files are saved. Codex has not started and no Godot file changed.</p>{snapshot.workOrder && <code>{[...snapshot.workOrder.existingFiles, ...snapshot.workOrder.newFiles].join(" · ")}</code>}</section><button className="v2-button button-ember" disabled={!snapshot.workOrder} onClick={() => { if (snapshot.workOrder) void onReady(snapshot.workOrder.questId); }} type="button">Open first quest</button></main>;

  return <main className="system-quest-refinement">{common}<section><h2>Choose files for the first quest</h2><p>Pick one to four Godot text files. Codex can touch only the files you confirm.</p><fieldset><legend>Existing files</legend>{files.length ? files.map((file) => <label className="system-quest-file" key={file.relativePath}><input checked={existingFiles.includes(file.relativePath)} disabled={!existingFiles.includes(file.relativePath) && existingFiles.length + newFiles.length >= 4} onChange={(event) => setExistingFiles((current) => event.target.checked ? [...current, file.relativePath] : current.filter((item) => item !== file.relativePath))} type="checkbox" /><code>{file.relativePath}</code></label>) : <p>No eligible existing files were found under scenes/ or scripts/.</p>}</fieldset><label><span>New files</span><textarea onChange={(event) => setNewFileText(event.target.value)} placeholder="scripts/welcome_beacon.gd" rows={3} value={newFileText} /><small>One path per line or comma. The parent folder must already exist.</small></label></section>{error && <p className="workflow-error" role="alert">{error}</p>}<div className="system-quest-actions"><button className="v2-button button-quiet" onClick={() => void run(() => cancelSystemQuestPlanning(projectId, systemId)).then((success) => { if (success) onClose(); })} type="button">Leave saved quests</button><button className="v2-button button-ember" disabled={busy || existingFiles.length + newFiles.length < 1 || existingFiles.length + newFiles.length > 4} onClick={() => void run(() => reviewSystemQuestWorkOrder(projectId, systemId, existingFiles, newFiles))} type="button">Check chosen files</button></div></main>;
}
