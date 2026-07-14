import { useCallback, useEffect, useMemo, useState } from "react";

import type { ClarificationTopic, GameBlueprint } from "../contracts/index.js";
import {
  approveBlueprint,
  cancelBlueprintPlanning,
  loadBlueprintPlanning,
  reviseBlueprintIdea,
  startBlueprintPlanning,
  submitBlueprintAnswers,
  subscribeToBlueprintPlanning,
} from "../dashboard/api.js";
import {
  blueprintPlanningStages,
  type BlueprintPlanningSnapshot,
} from "../blueprint-planner/shared.js";

const examples = [
  "A top-down arena where the player pushes enemies away.",
  "A platformer about jumping between unstable machines.",
  "A small movement game where collecting energy changes the arena.",
] as const;

function PlanningCore({ state }: { state: "ready" | "thinking" | "focused" | "validated" }) {
  const companionState = state === "validated" ? "complete" : state;
  return <span aria-label={`Forge Companion ${state}`} className={`companion-core companion-${companionState}`} role="img"><span className="companion-orbit orbit-a" /><span className="companion-orbit orbit-b" /><span className="companion-center" /></span>;
}
function NewGameHeader({ state, onBack }: { state: "ready" | "thinking" | "focused" | "validated"; onBack: () => void }) {
  return <header className="new-game-header"><button className="back-button" onClick={onBack} type="button"><span aria-hidden="true">←</span> Launchpad</button><div className="forge-brand"><PlanningCore state={state} /><div><strong>Forge</strong><span>New Game Blueprint</span></div></div><span className="planning-provenance">GPT-5.6 · High reasoning</span></header>;
}

function ScopeRail() {
  return <div className="intake-scope" aria-label="Fixed planning scope"><span>Godot 4</span><span>2D</span><span>GDScript</span><span>Top-down arena foundation</span><span>Code-native visuals</span><span>First playable, not a complete game</span></div>;
}

function Intake({ initialIdea, busy, error, onBack, onStart }: { initialIdea: string; busy: boolean; error: string | null; onBack: () => void; onStart: (idea: string) => void }) {
  const [idea, setIdea] = useState(initialIdea);
  return <main className="new-game-shell intake-screen"><NewGameHeader onBack={onBack} state="ready" /><section className="intake-layout"><aside className="intake-assembly" aria-hidden="true"><PlanningCore state="ready" /><span className="assembly-label">IDEA INTAKE</span><div className="assembly-beam" /><div className="assembly-nodes"><i /><i /><i /><i /></div><strong>Idea → playable core → roadmap</strong></aside><section className="intake-composer" aria-labelledby="intake-title"><p className="v2-eyebrow">Create a new game · focused intake</p><h1 id="intake-title">What kind of game would you like to make?</h1><p className="intake-promise">Describe a small 2D game idea. Forge will shape it into a focused Godot project, a first playable milestone, and a roadmap of achievable quests.</p><label className="idea-composer"><span>Your game idea</span><textarea autoFocus maxLength={1500} onChange={(event) => setIdea(event.target.value)} placeholder="A small top-down arena where…" rows={7} value={idea} /><small>{idea.trim().length} / 1,500 · one focused idea, not a chat</small></label><div className="example-prompts"><span>Try an example</span>{examples.map((example) => <button key={example} onClick={() => setIdea(example)} type="button">“{example}”</button>)}</div><ScopeRail />{error && <p className="planning-error" role="alert">{error}</p>}<div className="intake-actions"><button className="v2-button button-quiet" onClick={onBack} type="button">Cancel</button><button className="v2-button button-violet" disabled={busy || idea.trim().length < 12} onClick={() => onStart(idea)} type="button">Shape my game <span aria-hidden="true">→</span></button></div></section></section></main>;
}

function Planning({ snapshot, onBack }: { snapshot: BlueprintPlanningSnapshot; onBack: () => void }) {
  return <main className="new-game-shell planning-screen"><NewGameHeader onBack={onBack} state="thinking" /><section className="planning-center" aria-live="polite"><div className="planning-core-stage"><PlanningCore state="thinking" /><span className="planning-pulse" /></div><p className="v2-eyebrow">Live blueprint planning</p><h1>Assembling your game blueprint.</h1><p>Forge is turning your idea into a bounded game blueprint. No project files are being written yet.</p><ol className="planning-stages">{blueprintPlanningStages.map((stage, index) => { const complete = snapshot.completedStages.includes(stage); const active = snapshot.stage === stage; return <li className={complete ? "stage-complete" : active ? "stage-active" : "stage-pending"} key={stage}><span>{complete ? "✓" : String(index + 1).padStart(2, "0")}</span><strong>{stage}</strong><em>{complete ? "Complete" : active ? "In progress" : "Queued"}</em></li>; })}</ol><div className="runtime-strip"><span><i /> GPT-5.6</span><span>High reasoning</span><span>Read-only sandbox</span><span>Network disabled</span><span>{snapshot.provenance.threadId ? `Run ${snapshot.provenance.threadId.slice(0, 12)}…` : "Starting live planning run"}</span></div><button className="v2-button button-quiet" onClick={onBack} type="button">Cancel planning</button></section></main>;
}

function Clarification({ snapshot, busy, error, onBack, onRevise, onSubmit }: { snapshot: BlueprintPlanningSnapshot; busy: boolean; error: string | null; onBack: () => void; onRevise: () => void; onSubmit: (answers: Partial<Record<ClarificationTopic, string>>) => void }) {
  const [answers, setAnswers] = useState<Partial<Record<ClarificationTopic, string>>>({});
  const complete = snapshot.clarificationQuestions.every((question) => Boolean(answers[question.topic]?.trim()));
  return <main className="new-game-shell clarification-screen"><NewGameHeader onBack={onBack} state="focused" /><section className="clarification-panel"><div className="clarification-heading"><PlanningCore state="focused" /><div><p className="v2-eyebrow">Focused clarification · {snapshot.clarificationQuestions.length} of 3 maximum</p><h1>A few choices will keep the first build focused.</h1><p>Answer these together. Forge will not open an ongoing conversation.</p></div></div><div className="clarification-questions">{snapshot.clarificationQuestions.map((question, index) => <fieldset key={question.topic}><legend><span>{String(index + 1).padStart(2, "0")}</span>{question.prompt}</legend>{question.answerType === "single_choice" ? <div className="clarification-choices">{question.choices.map((choice) => <label key={choice}><input checked={answers[question.topic] === choice} name={question.topic} onChange={() => setAnswers((current) => ({ ...current, [question.topic]: choice }))} type="radio" /><span>{choice}</span></label>)}</div> : <input maxLength={240} onChange={(event) => setAnswers((current) => ({ ...current, [question.topic]: event.target.value }))} placeholder="Short, focused answer" type="text" value={answers[question.topic] ?? ""} />}</fieldset>)}</div>{error && <p className="planning-error" role="alert">{error}</p>}<footer className="clarification-actions"><button className="v2-button button-quiet" onClick={onBack} type="button">Cancel</button><button className="v2-button button-quiet" onClick={onRevise} type="button">Revise original idea</button><button className="v2-button button-violet" disabled={busy || !complete} onClick={() => onSubmit(answers)} type="button">Continue with these answers <span aria-hidden="true">→</span></button></footer></section></main>;
}

function RoadmapReview({ blueprint }: { blueprint: GameBlueprint }) {
  return <div className="blueprint-roadmap-review" aria-label="Ordered blueprint roadmap"><div className="foundation-node"><span>Foundation</span><strong>Top-down arena</strong></div>{blueprint.quests.map((quest, index) => <div className="blueprint-quest-step" key={quest.reference}><i aria-hidden="true" /><article><span>Quest {index + 1} · {quest.reference}</span><h3>{quest.title}</h3><p>{quest.visibleOutcome}</p>{quest.dependencies.length > 0 && <small>Builds after {quest.dependencies.join(", ")}</small>}</article></div>)}</div>;
}

function BlueprintDetails({ blueprint }: { blueprint: GameBlueprint }) {
  return <details className="blueprint-details"><summary>Blueprint details <span>Criteria, proof, scope, and documentation</span></summary><div className="blueprint-detail-grid"><section><h3>Included scope</h3><ul>{blueprint.includedScope.map((item) => <li key={item}>{item}</li>)}</ul></section><section><h3>Excluded scope</h3><ul>{blueprint.excludedScope.map((item) => <li key={item}>{item}</li>)}</ul></section><section className="detail-wide"><h3>Acceptance criteria and verification</h3>{blueprint.acceptanceCriteria.map((criterion) => <article key={criterion.reference}><strong>{criterion.reference} · {criterion.questReference}</strong><p>{criterion.criterion}</p><small>Proof: {criterion.verificationReferences.map((reference) => blueprint.verificationIdeas.find((idea) => idea.reference === reference)?.idea).filter(Boolean).join(" · ")}</small></article>)}</section><section><h3>Project documentation summary</h3><p>{blueprint.projectDocumentationSummary}</p></section><section><h3>Initial Chronicle summary</h3><p>{blueprint.initialChronicleSummary}</p></section></div></details>;
}

function BlueprintReview({ snapshot, busy, error, onApprove, onBack, onRevise }: { snapshot: BlueprintPlanningSnapshot; busy: boolean; error: string | null; onApprove: () => void; onBack: () => void; onRevise: () => void }) {
  const blueprint = snapshot.blueprint!;
  return <main className="new-game-shell blueprint-review-screen"><NewGameHeader onBack={onBack} state="focused" /><section className="blueprint-review"><header className="blueprint-hero"><div><p className="v2-eyebrow">Blueprint Review · creator approval required</p><h1>{blueprint.projectName}</h1><p>{blueprint.vision}</p></div><PlanningCore state="focused" /><span className="foundation-badge">Top-down arena foundation</span></header><section className="blueprint-promises"><article><span>01</span><p className="v2-eyebrow">What game are we making?</p><h2>{blueprint.coreAction}</h2><p>The fun target: {blueprint.funTarget}</p></article><article><span>02</span><p className="v2-eyebrow">What will be playable first?</p><h2>{blueprint.smallestPlayableResult}</h2><p>{blueprint.firstPlayableMilestone}</p></article><article><span>03</span><p className="v2-eyebrow">How will you play?</p><h2>{blueprint.inputMode.replaceAll("_", " ")}</h2><p>Godot 4 · 2D · GDScript · code-native visuals</p></article></section><section className="blueprint-map-section"><div><p className="v2-eyebrow">Ordered quest roadmap</p><h2>{blueprint.quests.length} achievable steps to the first playable milestone</h2></div><RoadmapReview blueprint={blueprint} /></section><BlueprintDetails blueprint={blueprint} /><div className="blueprint-validation"><span>✓</span><div><strong>Blueprint validation passed</strong><p>Quest references are valid and acyclic. Criteria link to verification ideas. No paths, commands, packages, project files, or workflow claims were accepted.</p></div><small>GPT-5.6 · high · {snapshot.provenance.attempts === 1 ? "first response valid" : "validated after one repair"}</small></div>{error && <p className="planning-error" role="alert">{error}</p>}<footer className="blueprint-actions"><button className="v2-button button-quiet" onClick={onBack} type="button">Cancel</button><button className="v2-button button-quiet" onClick={onRevise} type="button">Revise idea</button><button className="v2-button button-ember" disabled={busy} onClick={onApprove} type="button">Approve blueprint <span aria-hidden="true">→</span></button></footer></section></main>;
}

function BlueprintReady({ snapshot, onBack, onRevise }: { snapshot: BlueprintPlanningSnapshot; onBack: () => void; onRevise: () => void }) {
  const blueprint = snapshot.blueprint!;
  return <main className="new-game-shell blueprint-ready-screen"><NewGameHeader onBack={onBack} state="validated" /><section className="ready-panel"><div className="ready-core"><PlanningCore state="validated" /><span>✓</span></div><p className="v2-eyebrow">Blueprint Ready · validated planning result</p><h1>Your game blueprint is ready.</h1><p>Forge has prepared the vision, first playable milestone, and quest roadmap. The next step will create the real Godot project from the controlled Top-down Arena starter.</p><div className="ready-summary"><article><span>Validation</span><strong>Passed</strong></article><article><span>Planning provenance</span><strong>GPT-5.6 · High</strong></article><article><span>Roadmap</span><strong>{blueprint.quests.length} quests</strong></article><article><span>Foundation</span><strong>Top-down arena</strong></article><article><span>Project files written</span><strong>None</strong></article><article><span>Commands run</span><strong>None</strong></article></div><div className="ready-boundary"><strong>{blueprint.projectName}</strong><span>{blueprint.firstPlayableMilestone}</span><small>Session blueprint only · Task 5 will own project creation and persistence.</small></div><button className="v2-button button-mint" disabled type="button">Create the Godot project — next task</button><div className="ready-actions"><button className="v2-button button-quiet" onClick={onRevise} type="button">Revise blueprint</button><button className="v2-button button-violet" onClick={onBack} type="button">Return to Launchpad</button></div></section></main>;
}

function PlanningFailure({ snapshot, onBack, onRevise }: { snapshot: BlueprintPlanningSnapshot; onBack: () => void; onRevise: () => void }) {
  return <main className="new-game-shell planning-failure"><NewGameHeader onBack={onBack} state="focused" /><section><PlanningCore state="focused" /><p className="v2-eyebrow">Planning stopped safely</p><h1>Forge could not prepare a valid blueprint.</h1><p>{snapshot.error}</p>{snapshot.validationProblems.length > 0 && <details><summary>Validation details</summary><ul>{snapshot.validationProblems.map((problem) => <li key={problem}>{problem}</li>)}</ul></details>}<p>No blueprint, project files, directories, commands, or Godot processes were created. The sample path remains available.</p><div><button className="v2-button button-quiet" onClick={onBack} type="button">Return to Launchpad</button><button className="v2-button button-violet" onClick={onRevise} type="button">Revise idea</button></div></section></main>;
}

export function NewGameFlow({ onBack }: { onBack: () => void }) {
  const [snapshot, setSnapshot] = useState<BlueprintPlanningSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try { setSnapshot(await loadBlueprintPlanning()); setError(null); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : String(nextError)); }
  }, []);
  useEffect(() => { void refresh(); return subscribeToBlueprintPlanning(() => void refresh(), () => {}); }, [refresh]);
  const run = useCallback(async (action: () => Promise<BlueprintPlanningSnapshot>) => {
    setBusy(true);
    try { setSnapshot(await action()); setError(null); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : String(nextError)); }
    finally { setBusy(false); }
  }, []);
  const cancel = useCallback(() => { void cancelBlueprintPlanning().finally(onBack); }, [onBack]);
  const revise = useCallback(() => void run(reviseBlueprintIdea), [run]);
  const view = useMemo(() => snapshot?.phase ?? "intake", [snapshot?.phase]);

  if (!snapshot) return <main className="v2-loading"><PlanningCore state="thinking" /><h1>Opening New Game Intake</h1><p>{error ?? "Loading the session planning boundary…"}</p></main>;
  if (view === "planning") return <Planning onBack={cancel} snapshot={snapshot} />;
  if (view === "clarification") return <Clarification busy={busy} error={error} onBack={cancel} onRevise={revise} onSubmit={(answers) => void run(() => submitBlueprintAnswers(answers))} snapshot={snapshot} />;
  if (view === "review") return <BlueprintReview busy={busy} error={error} onApprove={() => void run(approveBlueprint)} onBack={cancel} onRevise={revise} snapshot={snapshot} />;
  if (view === "ready") return <BlueprintReady onBack={onBack} onRevise={revise} snapshot={snapshot} />;
  if (view === "failed") return <PlanningFailure onBack={onBack} onRevise={revise} snapshot={snapshot} />;
  return <Intake busy={busy} error={error} initialIdea={snapshot.idea} onBack={onBack} onStart={(idea) => void run(() => startBlueprintPlanning(idea))} />;
}
