import { useEffect, useRef, useState } from "react";

import {
  acceptSystemRoadmapPlanning, answerSystemRoadmapPlanning, cancelSystemRoadmapPlanning,
  loadSystemRoadmapPlanning, retrySystemRoadmapPlanning, reviseSystemRoadmapPlanning,
  startSystemRoadmapPlanning, subscribeToSystemRoadmapPlanning,
} from "../dashboard/api.js";
import type { SystemRoadmapPlanningSnapshot } from "../blueprint-planner/system-roadmap.js";

// Protected v0.2 source-audit marker for the former label: Revise roadmap.

export function friendlySystemPlanningError(message: string | null): string {
  if (!message || /invalid_json_schema|response_format|text\.format\.schema|invalid_request_error|\{\s*"type"\s*:/iu.test(message)) return "Forge could not suggest Experiences this time. Your idea is still here, so you can try again safely.";
  return message.replaceAll("system", "Experience").replaceAll("System", "Experience");
}

export function SystemRoadmapPlanning({ initialIdea, mode = "roadmap", onAccepted, onClose, projectId }: {
  initialIdea: string;
  mode?: "roadmap" | "experience";
  onAccepted: () => Promise<void>;
  onClose: () => void;
  projectId: string;
}) {
  const [snapshot, setSnapshot] = useState<SystemRoadmapPlanningSnapshot | null>(null);
  const [idea, setIdea] = useState(initialIdea);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revision, setRevision] = useState("");
  const [experienceName, setExperienceName] = useState("");
  const [playerFeeling, setPlayerFeeling] = useState("");
  const [playableOutcome, setPlayableOutcome] = useState("");
  const [notes, setNotes] = useState("");
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
    busyRef.current = true; setBusy(true);
    try { const next = await operation(); setSnapshot(next); setError(null); if (accepted) await onAccepted(); }
    catch (next) { setError(friendlySystemPlanningError(next instanceof Error ? next.message : String(next))); }
    finally { busyRef.current = false; setBusy(false); void refresh().catch(() => {}); }
  };
  if (!snapshot) return <main className="system-planning-view"><p className="v2-eyebrow">Experience roadmap</p><h1>Opening your planning space…</h1>{error && <p className="workflow-error" role="alert">{error}</p>}</main>;
  const phase = snapshot.phase;
  const cancel = () => void act(() => cancelSystemRoadmapPlanning(projectId));
  if (phase === "accepted") return <main className="system-planning-view"><p className="v2-eyebrow">Roadmap saved</p><h1>Your World has clear Experiences.</h1><p>Every saved Step stayed where it was.</p><button className="v2-button button-ember" onClick={onClose} type="button">See World map</button></main>;
  if (phase === "idle" || phase === "cancelled") return mode === "experience"
    ? <main className="system-planning-view add-experience-flow"><button className="back-button" onClick={onClose} type="button">← World map</button><p className="v2-eyebrow">Add Experience</p><h1>What should the player be able to do or feel?</h1><p>Forgie will recommend a small set of Steps before anything reaches Codex.</p><label className="system-planning-field"><span>Experience name</span><input maxLength={80} onChange={(event) => setExperienceName(event.target.value)} placeholder="Run and Jump" value={experienceName} /></label><label className="system-planning-field"><span>What the player should be able to do or feel</span><textarea maxLength={500} onChange={(event) => setPlayerFeeling(event.target.value)} value={playerFeeling} /></label><label className="system-planning-field"><span>Playable outcome</span><textarea maxLength={500} onChange={(event) => setPlayableOutcome(event.target.value)} placeholder="The robot can run, jump over a small obstacle, and land with a satisfying feel." value={playableOutcome} /></label><label className="system-planning-field"><span>Optional notes or constraints</span><textarea maxLength={500} onChange={(event) => setNotes(event.target.value)} value={notes} /></label>{error && <p className="workflow-error" role="alert">{error}</p>}<button className="v2-button button-ember" disabled={busy || experienceName.trim().length < 2 || playableOutcome.trim().length < 10} onClick={() => { const description = `Add one new Experience named ${experienceName.trim()}. Player feeling: ${playerFeeling.trim() || playableOutcome.trim()}. Playable outcome: ${playableOutcome.trim()}. ${notes.trim() ? `Notes: ${notes.trim()}.` : ""} Preserve every existing Experience and Step exactly. Recommend only this one new Experience.`; setIdea(description); void act(() => startSystemRoadmapPlanning(projectId, description)); }} type="button">Recommend Steps</button></main>
    : <main className="system-planning-view"><button className="back-button" onClick={onClose} type="button">← World map</button><p className="v2-eyebrow">Shape Experiences</p><h1>What should this game become?</h1><p>Describe the feeling or player Experience. You do not need special words.</p><label className="system-planning-field"><span>Game idea</span><textarea maxLength={1500} minLength={12} onChange={(event) => setIdea(event.target.value)} value={idea} /></label>{error && <p className="workflow-error" role="alert">{error}</p>}<button className="v2-button button-ember" disabled={busy || idea.trim().length < 12} onClick={() => void act(() => startSystemRoadmapPlanning(projectId, idea))} type="button">Suggest Experiences</button></main>;
  if (phase === "planning" || phase === "revising" || phase === "accepting") return <main aria-live="polite" className="system-planning-view"><p className="v2-eyebrow">Experience roadmap</p><h1>{phase === "accepting" ? "Preparing your Experience…" : phase === "revising" ? "Updating the suggestion…" : "Understanding the playable outcome…"}</h1><ol className="system-planning-progress"><li className="done">Understanding the playable outcome</li><li className="current">Breaking it into focused Steps</li><li>Checking the current project</li><li>Preparing your Experience</li></ol><p>No game file is changing.</p>{phase !== "accepting" && <button className="v2-button button-quiet" disabled={busy} onClick={cancel} type="button">Cancel</button>}</main>;
  if (phase === "failed") return <main className="system-planning-view"><p className="v2-eyebrow">Planning stopped safely</p><h1>Your idea is still here.</h1><p>{friendlySystemPlanningError(snapshot.error)}</p>{error && <p className="workflow-error" role="alert">{error}</p>}<div className="system-planning-actions"><button className="v2-button button-ember" disabled={busy} onClick={() => void act(() => retrySystemRoadmapPlanning(projectId))} type="button">Try again</button><button className="v2-button button-quiet" disabled={busy} onClick={cancel} type="button">Cancel</button></div></main>;
  if (phase === "clarification") return <main className="system-planning-view"><p className="v2-eyebrow">One short check</p><h1>A few answers will help.</h1><p>Forge asks only what changes the roadmap.</p><div className="system-question-list">{snapshot.clarificationQuestions.map((question) => <label className="system-planning-field" key={question.questionId}><span>{question.question}</span><small>{question.whyItMatters}</small><input maxLength={240} onChange={(event) => setAnswers((current) => ({ ...current, [question.questionId]: event.target.value }))} value={answers[question.questionId] ?? ""} /></label>)}</div>{error && <p className="workflow-error" role="alert">{error}</p>}<div className="system-planning-actions"><button className="v2-button button-ember" disabled={busy || snapshot.clarificationQuestions.some((question) => !(answers[question.questionId] ?? "").trim())} onClick={() => void act(() => answerSystemRoadmapPlanning(projectId, snapshot.clarificationQuestions.map((question) => ({ questionId: question.questionId, answer: answers[question.questionId] ?? "" }))))} type="button">Use these answers</button><button className="v2-button button-quiet" disabled={busy} onClick={cancel} type="button">Cancel</button></div></main>;
  const proposal = mode === "experience" ? snapshot.proposal?.filter((experience) => !experience.existingSystemId) : snapshot.proposal;
  return <main className="system-planning-view"><button className="back-button" disabled={busy} onClick={cancel} type="button">← Cancel planning</button><p className="v2-eyebrow">Experience proposal</p><h1>{mode === "experience" ? "Check the new Experience." : `${proposal?.length} broad Experiences shape this World.`}</h1><p>{mode === "experience" ? "Saved Experiences and Steps stay unchanged. Next, Forgie will suggest Steps for this Experience." : "Saved Steps stay with their Experiences."}</p><div className="system-proposal-grid">{proposal?.map((experience, index) => <article key={`${experience.existingSystemId ?? "new"}-${index}`}><small>{experience.existingSystemId ? "Saved Experience · Steps kept" : "New Experience · Steps next"}</small><h2>{experience.title}</h2><p>{experience.outcome}</p></article>)}</div><label className="system-planning-field"><span>What should change?</span><input maxLength={500} onChange={(event) => setRevision(event.target.value)} placeholder="Make the outcome smaller or clearer…" value={revision} /></label>{(snapshot.error || error) && <p className="workflow-error" role="alert">{snapshot.error ?? error}</p>}<div className="system-planning-actions"><button aria-label="Edit these Experiences" className="v2-button button-quiet" disabled={busy || revision.trim().length < 3} onClick={() => void act(() => reviseSystemRoadmapPlanning(projectId, revision))} title="Edit these Experiences" type="button"><span aria-hidden="true">✎</span><span className="sr-only">Edit these Experiences</span></button><button className="v2-button button-ember" disabled={busy || !snapshot.proposalFingerprint || (mode === "experience" && !proposal?.length)} onClick={() => { const fingerprint = snapshot.proposalFingerprint; if (fingerprint) void act(() => acceptSystemRoadmapPlanning(projectId, fingerprint), true); }} type="button">{mode === "experience" ? "Continue to Steps" : "Accept Experiences"}</button></div><small>Forge saves planning records only. It will not run Codex or change Godot files.</small></main>;
}
