import { useEffect, useRef, useState } from "react";

import {
  acceptSystemRoadmapPlanning, answerSystemRoadmapPlanning, cancelSystemRoadmapPlanning,
  loadSystemRoadmapPlanning, retrySystemRoadmapPlanning, reviseSystemRoadmapPlanning,
  startSystemRoadmapPlanning, subscribeToSystemRoadmapPlanning,
} from "../dashboard/api.js";
import type { SystemRoadmapPlanningSnapshot } from "../blueprint-planner/system-roadmap.js";

export function SystemRoadmapPlanning({ initialIdea, onAccepted, onClose, projectId }: {
  initialIdea: string;
  onAccepted: () => Promise<void>;
  onClose: () => void;
  projectId: string;
}) {
  const [snapshot, setSnapshot] = useState<SystemRoadmapPlanningSnapshot | null>(null);
  const [idea, setIdea] = useState(initialIdea);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revision, setRevision] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = async () => setSnapshot(await loadSystemRoadmapPlanning(projectId));
  useEffect(() => {
    void refresh().catch((next) => setError(next instanceof Error ? next.message : String(next)));
    return subscribeToSystemRoadmapPlanning(projectId, () => { if (!busyRef.current) void refresh().catch(() => {}); }, () => {});
  }, [projectId]);
  const act = async (operation: () => Promise<SystemRoadmapPlanningSnapshot>, accepted = false) => {
    if (busy) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const next = await operation();
      setSnapshot(next);
      setError(null);
      if (accepted) await onAccepted();
    } catch (next) { setError(next instanceof Error ? next.message : String(next)); }
    finally { busyRef.current = false; setBusy(false); void refresh().catch(() => {}); }
  };
  if (!snapshot) return <main className="system-planning-view"><p className="v2-eyebrow">System roadmap</p><h1>Opening your planning space…</h1>{error && <p className="workflow-error" role="alert">{error}</p>}</main>;
  const phase = snapshot.phase;
  const cancel = () => void act(() => cancelSystemRoadmapPlanning(projectId));
  if (phase === "accepted") return <main className="system-planning-view"><p className="v2-eyebrow">Roadmap saved</p><h1>Your game has clear big pieces.</h1><p>Every old quest stayed where it was. New systems can stay empty until you are ready.</p><button className="v2-button button-ember" onClick={onClose} type="button">See system map</button></main>;
  if (phase === "idle" || phase === "cancelled") return <main className="system-planning-view"><button className="back-button" onClick={onClose} type="button">← System map</button><p className="v2-eyebrow">Shape systems</p><h1>What should this game become?</h1><p>Describe the feeling or player experience. You do not need special words.</p><label className="system-planning-field"><span>Game idea</span><textarea maxLength={1500} minLength={12} onChange={(event) => setIdea(event.target.value)} value={idea} /></label>{error && <p className="workflow-error" role="alert">{error}</p>}<button className="v2-button button-ember" disabled={busy || idea.trim().length < 12} onClick={() => void act(() => startSystemRoadmapPlanning(projectId, idea))} type="button">Suggest systems</button></main>;
  if (phase === "planning" || phase === "revising" || phase === "accepting") return <main aria-live="polite" className="system-planning-view"><p className="v2-eyebrow">System roadmap</p><h1>{phase === "accepting" ? "Saving the exact roadmap…" : phase === "revising" ? "Shaping your revision…" : "Finding the big pieces…"}</h1><ol className="system-planning-progress"><li className="done">Understand your idea</li><li className="current">Shape broad systems</li><li>Show the whole roadmap</li></ol><p>No game file is changing.</p>{phase !== "accepting" && <button className="v2-button button-quiet" disabled={busy} onClick={cancel} type="button">Cancel</button>}</main>;
  if (phase === "failed") return <main className="system-planning-view"><p className="v2-eyebrow">Planning stopped safely</p><h1>Your idea is still here.</h1><p>{snapshot.error}</p>{error && <p className="workflow-error" role="alert">{error}</p>}<div className="system-planning-actions"><button className="v2-button button-ember" disabled={busy} onClick={() => void act(() => retrySystemRoadmapPlanning(projectId))} type="button">Try again</button><button className="v2-button button-quiet" disabled={busy} onClick={cancel} type="button">Cancel</button></div></main>;
  if (phase === "clarification") return <main className="system-planning-view"><p className="v2-eyebrow">One short check</p><h1>A few answers will help.</h1><p>Forge asks only what changes the roadmap.</p><div className="system-question-list">{snapshot.clarificationQuestions.map((question) => <label className="system-planning-field" key={question.questionId}><span>{question.question}</span><small>{question.whyItMatters}</small><input maxLength={240} onChange={(event) => setAnswers((current) => ({ ...current, [question.questionId]: event.target.value }))} value={answers[question.questionId] ?? ""} /></label>)}</div>{error && <p className="workflow-error" role="alert">{error}</p>}<div className="system-planning-actions"><button className="v2-button button-ember" disabled={busy || snapshot.clarificationQuestions.some((question) => !(answers[question.questionId] ?? "").trim())} onClick={() => void act(() => answerSystemRoadmapPlanning(projectId, snapshot.clarificationQuestions.map((question) => ({ questionId: question.questionId, answer: answers[question.questionId] ?? "" }))))} type="button">Build the roadmap</button><button className="v2-button button-quiet" disabled={busy} onClick={cancel} type="button">Cancel</button></div></main>;
  return <main className="system-planning-view"><button className="back-button" disabled={busy} onClick={cancel} type="button">← Cancel planning</button><p className="v2-eyebrow">Roadmap proposal</p><h1>{snapshot.proposal?.length} big pieces make this game.</h1><p>Old quests are kept. Empty systems are ready for later.</p><div className="system-proposal-grid">{snapshot.proposal?.map((system, index) => <article key={`${system.existingSystemId ?? "new"}-${index}`}><small>{system.existingSystemId ? "Existing system · quests kept" : "New system · no quests yet"}</small><h2>{system.title}</h2><p>{system.outcome}</p></article>)}</div><label className="system-planning-field"><span>What should change?</span><input maxLength={500} onChange={(event) => setRevision(event.target.value)} placeholder="Make the storm feel less punishing…" value={revision} /></label>{(snapshot.error || error) && <p className="workflow-error" role="alert">{snapshot.error ?? error}</p>}<div className="system-planning-actions"><button className="v2-button button-quiet" disabled={busy || revision.trim().length < 3} onClick={() => void act(() => reviseSystemRoadmapPlanning(projectId, revision))} type="button">Revise roadmap</button><button className="v2-button button-ember" disabled={busy || !snapshot.proposalFingerprint} onClick={() => { const fingerprint = snapshot.proposalFingerprint; if (fingerprint) void act(() => acceptSystemRoadmapPlanning(projectId, fingerprint), true); }} type="button">Accept systems</button></div><small>Forge will save one planning record. It will not run Git or change Godot files.</small></main>;
}
