import { useCallback, useEffect, useMemo, useState } from "react";

import type { ClarificationTopic, GameBlueprint } from "../contracts/index.js";
import {
  acceptBlueprintRoadmap,
  approveBlueprint,
  cancelProjectCreation,
  cancelBlueprintPlanning,
  createApprovedProject,
  createOpenProject,
  loadBlueprintPlanning,
  loadProjectCreationState,
  openCreatedProjectFolder,
  rejectBlueprintPlan,
  resetFailedProjectCreation,
  reviseAcceptedRoadmap,
  reviseBlueprintIdea,
  startBlueprintPlanning,
  submitBlueprintAnswers,
  subscribeToBlueprintPlanning,
  subscribeToProjectCreation,
} from "../dashboard/api.js";
import type { RoadmapEdit } from "../blueprint-planner/starter-catalog.js";
import {
  blueprintPlanningStages,
  type BlueprintPlanningSnapshot,
} from "../blueprint-planner/shared.js";
import {
  projectCreationStages,
  type CreatedProjectSummary,
  type ProjectCreationStateResponse,
} from "../project-creation/shared.js";

const examples = [
  "A top-down arena where the player pushes enemies away.",
  "A platformer about jumping between unstable machines.",
  "A small movement game where collecting energy changes the arena.",
] as const;

function PlanningCore({ state }: { state: "ready" | "thinking" | "focused" | "validated" }) {
  const companionState = state === "validated" ? "complete" : state;
  return <span aria-label={`Forge Companion ${state}`} className={`companion-core companion-${companionState}`} role="img"><span className="companion-orbit orbit-a" /><span className="companion-orbit orbit-b" /><span className="companion-center" /></span>;
}
function NewGameHeader({ state, onBack, backLabel = "Launchpad" }: { state: "ready" | "thinking" | "focused" | "validated"; onBack: () => void; backLabel?: string }) {
  return <header className="new-game-header"><button className="back-button" onClick={onBack} type="button"><span aria-hidden="true">←</span> {backLabel}</button><div className="forge-brand"><PlanningCore state={state} /><div><strong>Forge</strong><span>New Game Blueprint</span></div></div><span className="planning-provenance">GPT-5.6 · High reasoning</span></header>;
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

function InterpretationReview({ snapshot, busy, error, onBack, onContinue, onReject, onRevise }: { snapshot: BlueprintPlanningSnapshot; busy: boolean; error: string | null; onBack: () => void; onContinue: () => void; onReject: () => void; onRevise: () => void }) {
  const proposal = snapshot.proposal!;
  return <main className="new-game-shell blueprint-review-screen"><NewGameHeader onBack={onBack} state="focused" /><section className="blueprint-review"><header className="blueprint-hero"><div><p className="v2-eyebrow">Supported interpretation · review 1 of 3</p><h1>{proposal.blueprint.projectName}</h1><p>{proposal.recommendedInterpretation}</p></div><PlanningCore state="focused" /><span className={`foundation-badge fit-${proposal.foundationFit.level}`}>{proposal.foundationFit.level} starter fit</span></header><section className="blueprint-promises"><article><span>Fit</span><p className="v2-eyebrow">Why this foundation?</p><h2>Top-down Arena</h2><p>{proposal.foundationFit.explanation}</p></article><article><span>Tradeoffs</span><p className="v2-eyebrow">What changes?</p><ul>{proposal.tradeoffs.map((tradeoff) => <li key={tradeoff}>{tradeoff}</li>)}</ul></article><article><span>Original</span><p className="v2-eyebrow">Exact creator idea</p><p>{proposal.originalIdea}</p></article></section><section className="blueprint-map-section"><div><p className="v2-eyebrow">Compatible choices</p><h2>Accept the interpretation, revise it, or keep the unsupported format.</h2></div><div className="blueprint-detail-grid">{proposal.alternatives.map((alternative) => <article key={alternative.id}><h3>{alternative.title}</h3><p>{alternative.interpretation}</p><small>{alternative.consequence}</small></article>)}</div></section>{error && <p className="planning-error" role="alert">{error}</p>}<footer className="blueprint-actions"><button className="v2-button button-quiet" onClick={onBack} type="button">Cancel</button><button className="v2-button button-quiet" disabled={busy} onClick={onReject} type="button">Reject plan</button><button className="v2-button button-quiet" disabled={busy} onClick={onRevise} type="button">Revise idea</button><button className="v2-button button-ember" disabled={busy} onClick={onContinue} type="button">Review game vision <span aria-hidden="true">→</span></button></footer></section></main>;
}

function VisionReview({ snapshot, busy, error, onApprove, onBack, onReject, onRevise }: { snapshot: BlueprintPlanningSnapshot; busy: boolean; error: string | null; onApprove: () => void; onBack: () => void; onReject: () => void; onRevise: () => void }) {
  const blueprint = snapshot.blueprint!;
  return <main className="new-game-shell blueprint-review-screen"><NewGameHeader backLabel="Interpretation" onBack={onBack} state="focused" /><section className="blueprint-review"><header className="blueprint-hero"><div><p className="v2-eyebrow">Game vision · review 2 of 3</p><h1>{blueprint.projectName}</h1><p>{blueprint.vision}</p></div><PlanningCore state="focused" /><span className="foundation-badge">Model proposal · not roadmap authority</span></header><section className="blueprint-promises"><article><span>01</span><p className="v2-eyebrow">Core action</p><h2>{blueprint.coreAction}</h2><p>{blueprint.funTarget}</p></article><article><span>02</span><p className="v2-eyebrow">Smallest playable result</p><h2>{blueprint.smallestPlayableResult}</h2><p>{blueprint.firstPlayableMilestone}</p></article><article><span>03</span><p className="v2-eyebrow">Fixed foundation</p><h2>Godot 4 · 2D · GDScript</h2><p>Top-down Arena · code-native visuals</p></article></section><BlueprintDetails blueprint={blueprint} /><div className="blueprint-validation"><span>✓</span><div><strong>Safe creative blueprint validated</strong><p>The next screen reconciles this proposal against verified starter behavior. Model quest ordering is not yet authoritative.</p></div></div>{error && <p className="planning-error" role="alert">{error}</p>}<footer className="blueprint-actions"><button className="v2-button button-quiet" disabled={busy} onClick={onReject} type="button">Reject plan</button><button className="v2-button button-quiet" disabled={busy} onClick={onRevise} type="button">Revise idea</button><button className="v2-button button-ember" disabled={busy} onClick={onApprove} type="button">Accept vision and reconcile roadmap <span aria-hidden="true">→</span></button></footer></section></main>;
}

function StarterAwareRoadmapReview({ snapshot, busy, error, onAccept, onEdit, onReject }: { snapshot: BlueprintPlanningSnapshot; busy: boolean; error: string | null; onAccept: () => void; onEdit: (edit: RoadmapEdit) => void; onReject: () => void }) {
  const roadmap = snapshot.acceptedRoadmap!;
  const [drafts, setDrafts] = useState<Record<string, { title: string; outcome: string }>>(() => Object.fromEntries(roadmap.quests.map((quest) => [quest.reference, { title: quest.title, outcome: quest.visibleOutcome }])));
  const remaining = 3 - roadmap.revisionEvents.length;
  const reorder = (index: number, direction: -1 | 1) => { const references = roadmap.quests.map((quest) => quest.reference); const target = index + direction; if (target < 0 || target >= references.length) return; [references[index], references[target]] = [references[target]!, references[index]!]; onEdit({ kind: "quest_reordered", references }); };
  return <main className="new-game-shell blueprint-review-screen"><NewGameHeader onBack={onReject} state="focused" /><section className="blueprint-review"><header className="blueprint-hero"><div><p className="v2-eyebrow">Starter-aware roadmap · review 3 of 3</p><h1>Review facts separately from planned changes.</h1><p>Only the accepted fingerprint becomes creation authority. {remaining} of 3 bounded edits remain.</p></div><PlanningCore state="focused" /><span className="foundation-badge">Fingerprint {roadmap.fingerprint.slice(0, 12)}…</span></header><section className="blueprint-map-section"><div><p className="v2-eyebrow">Already playable · Forge-owned facts</p><h2>These are not quests.</h2></div><ul className="starter-fact-list">{roadmap.alreadyPlayable.map((fact) => <li key={fact.factId}>{fact.statement}</li>)}</ul></section><section className="blueprint-map-section"><div><p className="v2-eyebrow">Planned changes · accepted deltas</p><h2>{roadmap.quests.length} non-duplicative quests</h2></div><div className="blueprint-roadmap-review">{roadmap.quests.map((quest, index) => { const draft = drafts[quest.reference] ?? { title: quest.title, outcome: quest.visibleOutcome }; return <article className="blueprint-quest-step roadmap-edit-card" key={quest.reference}><span>Quest {index + 1} · {quest.implementationReadiness === "registered_existing_files" ? "Registered contract" : "Planned / ineligible"}</span><label>Title<input maxLength={180} onChange={(event) => setDrafts((current) => ({ ...current, [quest.reference]: { ...draft, title: event.target.value } }))} value={draft.title} /></label><button className="v2-button button-quiet" disabled={busy || remaining <= 0 || draft.title === quest.title} onClick={() => onEdit({ kind: "quest_title_changed", reference: quest.reference, title: draft.title })} type="button">Save title</button><label>Visible outcome<textarea maxLength={280} onChange={(event) => setDrafts((current) => ({ ...current, [quest.reference]: { ...draft, outcome: event.target.value } }))} value={draft.outcome} /></label><button className="v2-button button-quiet" disabled={busy || remaining <= 0 || draft.outcome === quest.visibleOutcome} onClick={() => onEdit({ kind: "quest_outcome_changed", reference: quest.reference, visibleOutcome: draft.outcome })} type="button">Save outcome</button><p>{quest.whyItMatters}</p><small>{quest.dependsOn.length ? `Depends on ${quest.dependsOn.join(", ")}` : "First delta · no dependencies"} · {quest.verificationProfile ?? "No registered verifier"}</small><div><button disabled={busy || remaining <= 0 || index === 0} onClick={() => reorder(index, -1)} type="button">Move earlier</button><button disabled={busy || remaining <= 0 || index === roadmap.quests.length - 1} onClick={() => reorder(index, 1)} type="button">Move later</button><button disabled={busy || remaining <= 0 || roadmap.quests.length <= 3} onClick={() => onEdit({ kind: "quest_removed", reference: quest.reference })} type="button">Remove</button></div></article>; })}</div>{roadmap.optionalDeltaIds.map((deltaId) => <button className="v2-button button-quiet" disabled={busy || remaining <= 0} key={deltaId} onClick={() => onEdit({ kind: "optional_delta_added", deltaId })} type="button">Add prevalidated optional delta: Relay Pressure</button>)}</section>{error && <p className="planning-error" role="alert">{error}</p>}<footer className="blueprint-actions"><button className="v2-button button-quiet" disabled={busy} onClick={onReject} type="button">Reject plan</button><button className="v2-button button-ember" disabled={busy} onClick={onAccept} type="button">Accept this roadmap fingerprint <span aria-hidden="true">→</span></button></footer></section></main>;
}

function BlueprintReview({ snapshot, busy, error, onApprove, onBack, onRevise }: { snapshot: BlueprintPlanningSnapshot; busy: boolean; error: string | null; onApprove: () => void; onBack: () => void; onRevise: () => void }) {
  const blueprint = snapshot.blueprint!;
  return <main className="new-game-shell blueprint-review-screen"><NewGameHeader onBack={onBack} state="focused" /><section className="blueprint-review"><header className="blueprint-hero"><div><p className="v2-eyebrow">Blueprint Review · creator approval required</p><h1>{blueprint.projectName}</h1><p>{blueprint.vision}</p></div><PlanningCore state="focused" /><span className="foundation-badge">Top-down arena foundation</span></header><section className="blueprint-promises"><article><span>01</span><p className="v2-eyebrow">What game are we making?</p><h2>{blueprint.coreAction}</h2><p>The fun target: {blueprint.funTarget}</p></article><article><span>02</span><p className="v2-eyebrow">What will be playable first?</p><h2>{blueprint.smallestPlayableResult}</h2><p>{blueprint.firstPlayableMilestone}</p></article><article><span>03</span><p className="v2-eyebrow">How will you play?</p><h2>{blueprint.inputMode.replaceAll("_", " ")}</h2><p>Godot 4 · 2D · GDScript · code-native visuals</p></article></section><section className="blueprint-map-section"><div><p className="v2-eyebrow">Ordered quest roadmap</p><h2>{blueprint.quests.length} achievable steps to the first playable milestone</h2></div><RoadmapReview blueprint={blueprint} /></section><BlueprintDetails blueprint={blueprint} /><div className="blueprint-validation"><span>✓</span><div><strong>Blueprint validation passed</strong><p>Quest references are valid and acyclic. Criteria link to verification ideas. No paths, commands, packages, project files, or workflow claims were accepted.</p></div><small>GPT-5.6 · high · {snapshot.provenance.attempts === 1 ? "first response valid" : "validated after one repair"}</small></div>{error && <p className="planning-error" role="alert">{error}</p>}<footer className="blueprint-actions"><button className="v2-button button-quiet" onClick={onBack} type="button">Cancel</button><button className="v2-button button-quiet" onClick={onRevise} type="button">Revise idea</button><button className="v2-button button-ember" disabled={busy} onClick={onApprove} type="button">Approve blueprint <span aria-hidden="true">→</span></button></footer></section></main>;
}

function BlueprintReady({ snapshot, onBack, onCreate, onRevise }: { snapshot: BlueprintPlanningSnapshot; onBack: () => void; onCreate: () => void; onRevise: () => void }) {
  const blueprint = snapshot.blueprint!;
  return <main className="new-game-shell blueprint-ready-screen"><NewGameHeader onBack={onBack} state="validated" /><section className="ready-panel"><div className="ready-core"><PlanningCore state="validated" /><span>✓</span></div><p className="v2-eyebrow">Blueprint Ready · validated planning result</p><h1>Your game blueprint is ready.</h1><p>Forge has prepared the vision, first playable milestone, and quest roadmap. You can now review the final filesystem action before anything is written.</p><div className="ready-summary"><article><span>Project name</span><strong>{blueprint.projectName}</strong></article><article><span>Foundation</span><strong>Top-down arena</strong></article><article><span>Roadmap</span><strong>{blueprint.quests.length} quests</strong></article><article><span>Destination owner</span><strong>Forge local workspace</strong></article><article><span>Engine</span><strong>Godot 4 · 2D · GDScript</strong></article><article><span>Dependencies</span><strong>None · code-native only</strong></article></div><div className="ready-boundary"><strong>Forge will smoke-check Godot and create a local Git baseline.</strong><span>{blueprint.firstPlayableMilestone}</span><small>No project directory, command, or registry entry exists yet.</small></div><button className="v2-button button-ember" onClick={onCreate} type="button">Create the Godot project <span aria-hidden="true">→</span></button><div className="ready-actions"><button className="v2-button button-quiet" onClick={onRevise} type="button">Revise blueprint</button><button className="v2-button button-violet" onClick={onBack} type="button">Return to Launchpad</button></div></section></main>;
}

function CreationConfirmation({ blueprint, questCount, busy, error, onBack, onConfirm }: { blueprint: GameBlueprint; questCount: number; busy: boolean; error: string | null; onBack: () => void; onConfirm: () => void }) {
  return <main className="new-game-shell creation-confirmation-screen"><NewGameHeader onBack={onBack} state="focused" /><section className="creation-confirmation"><PlanningCore state="focused" /><p className="v2-eyebrow">Final creation confirmation · separate filesystem approval</p><h1>Create {blueprint.projectName}?</h1><p>The creative plan and roadmap fingerprint are accepted. Nothing will be written until you confirm this exact filesystem action.</p><div className="creation-facts"><article><span>Project</span><strong>{blueprint.projectName}</strong></article><article><span>Foundation</span><strong>Top-down Arena</strong></article><article><span>Accepted roadmap</span><strong>{questCount} planned deltas</strong></article><article><span>Destination</span><strong>Forge local workspace</strong></article><article><span>Technology</span><strong>Godot 4 · 2D · GDScript</strong></article><article><span>Assets and dependencies</span><strong>None external</strong></article></div><div className="creation-promise"><strong>Forge controls every operation.</strong><ul><li>Copy the committed Top-down Arena starter.</li><li>Write and reload immutable provenance plus authoritative v2 roadmap records.</li><li>Run the fixed Godot smoke check.</li><li>Create one local Git baseline with no remotes.</li><li>Register the project only after every step passes.</li></ul></div>{error && <p className="planning-error" role="alert">{error}</p>}<footer className="creation-confirm-actions"><button className="v2-button button-quiet" disabled={busy} onClick={onBack} type="button">Not yet</button><button className="v2-button button-ember" disabled={busy} onClick={onConfirm} type="button">{busy ? "Starting safely…" : "Confirm and create project"}</button></footer></section></main>;
}

function useCreationElapsedTime(startedAt: string | null): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { if (!startedAt) return; const timer = window.setInterval(() => setNow(Date.now()), 1_000); return () => window.clearInterval(timer); }, [startedAt]);
  if (!startedAt) return "00:00";
  const total = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1_000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function CreationProgress({ state, busy, onCancel }: { state: ProjectCreationStateResponse; busy: boolean; onCancel: () => void }) {
  const creation = state.creation;
  const elapsed = useCreationElapsedTime(creation.startedAt);
  const verifying = creation.stage === "Checking the Godot project" || creation.stage === "Creating the baseline";
  const foundation = creation.foundation === "open_godot" ? "Open Godot project" : "Top-down Arena";
  return <main className="new-game-shell creation-progress-screen"><NewGameHeader onBack={() => {}} state="thinking" /><section className="creation-progress" aria-live="polite"><div className={`creation-companion ${verifying ? "is-verifying" : "is-assembling"}`}><PlanningCore state="thinking" /><span>{verifying ? "VERIFYING" : "ASSEMBLING"}</span></div><p className="v2-eyebrow">Controlled project creation · live deterministic stages</p><h1>{creation.stage ?? "Preparing project creation"}</h1><p>{creation.explanation}</p><div className="creation-identity"><span><small>Project</small><strong>{creation.displayName}</strong></span><span><small>Foundation</small><strong>{foundation}</strong></span><span><small>Project identifier</small><strong>{creation.relativeProjectIdentifier ?? "Allocating safely…"}</strong></span><span><small>Elapsed</small><strong>{elapsed}</strong></span></div><ol className="creation-stage-list">{projectCreationStages.map((stage, index) => { const complete = creation.completedStages.includes(stage); const active = creation.stage === stage; return <li className={complete ? "stage-complete" : active ? "stage-active" : "stage-pending"} key={stage}><span>{complete ? "✓" : String(index + 1).padStart(2, "0")}</span><strong>{stage}</strong><em>{complete ? "Complete" : active ? "In progress" : "Waiting"}</em></li>; })}</ol><p className="creation-truth">Stages come from the creation service. Forge does not use percentages, estimates, invented file counts, or model-generated commands.</p><button className="v2-button button-quiet" disabled={busy} onClick={onCancel} type="button">Cancel before promotion</button></section></main>;
}

export function CreatedProjectSummaryView({ project, onBack, onEnterWorld }: { project: CreatedProjectSummary; onBack: () => void; onEnterWorld: (projectId: string) => void }) {
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const openFolder = async () => { try { await openCreatedProjectFolder(project.projectId); setNotice("Project folder opened."); setError(null); } catch (nextError) { setError(nextError instanceof Error ? nextError.message : String(nextError)); } };
  const open = project.foundation === "open_godot";
  return <main className="new-game-shell project-created-screen"><NewGameHeader onBack={onBack} state="validated" /><section className="project-created"><div className="ready-core"><PlanningCore state="validated" /><span>✓</span></div><p className="v2-eyebrow">Project Created · verified and registered</p><h1>Your Godot project is ready.</h1><p>{open ? `${project.displayName} is a small runnable Godot project. Now describe the game inside Project World.` : `${project.displayName} is a real local Godot project built from Forge’s controlled Top-down Arena starter.`}</p><div className="created-proof-grid"><article><span>Project</span><strong>{project.displayName}</strong></article><article><span>Foundation</span><strong>{open ? "Open Godot project" : "Top-down Arena"}</strong></article><article><span>Roadmap</span><strong>{open ? "Ready for your idea" : `${project.questCount} planned quests`}</strong></article><article><span>Godot smoke check</span><strong>Passed · {project.godotVersion}</strong></article><article><span>Local Git baseline</span><strong>{project.gitCommitSha.slice(0, 12)}</strong></article><article><span>Foundation version</span><strong>{project.starterVersion}</strong></article><article><span>Project documentation</span><strong>Saved</strong></article><article><span>Chronicle</span><strong>Initialized</strong></article><article><span>Restart discovery</span><strong>Registered</strong></article></div><div className="project-location"><span>Project location</span><code>{project.projectLocation}</code></div><div className="created-boundary"><strong>Project World is ready.</strong><p>{open ? "Open it, describe the game, and Forge will turn the idea into systems and small quests." : "The persisted roadmap, verified starter preview, Chronicle, documents, and idea seeds can now open."}</p></div>{notice && <p className="workflow-notice" role="status">{notice}</p>}{error && <p className="planning-error" role="alert">{error}</p>}<div className="created-actions"><button className="v2-button button-quiet" onClick={() => void openFolder()} type="button">Open project folder</button><button className="v2-button button-mint" onClick={() => onEnterWorld(project.projectId)} type="button">Enter Project World</button><button className="v2-button button-violet" onClick={onBack} type="button">Return to Launchpad</button></div><details className="v2-details"><summary>Technical creation evidence</summary><div><p><code>{project.godotSuccessMarker}</code></p><p>Git baseline <code>{project.gitCommitSha}</code></p><p>Project ID <code>{project.projectId}</code></p></div></details></section></main>;
}

function friendlyCreationFailure(stage: ProjectCreationStateResponse["creation"]["stage"]): string {
  if (stage === "Writing project records") return "Forge could not finish saving and rechecking the approved project records. Your accepted plan is still available to review and retry.";
  if (stage === "Checking the Godot project") return "The new project did not pass Forge’s controlled Godot check. Nothing was registered, and you may safely review or leave.";
  if (stage === "Creating the baseline") return "Forge could not create the project’s clean local history. Nothing was registered, and you may safely review or leave.";
  return "Forge could not finish this creation attempt. Nothing was registered, and your accepted plan remains available to review.";
}

function CreationFailure({ busy, state, onBack, onRetry }: { busy: boolean; state: ProjectCreationStateResponse; onBack: () => void; onRetry: () => void }) {
  const creation = state.creation;
  return <main className="new-game-shell creation-failure-screen"><NewGameHeader onBack={onBack} state="focused" /><section className="creation-failure" role="alert"><PlanningCore state="focused" /><p className="v2-eyebrow">Project creation stopped safely</p><h1>The project was not created.</h1><p>{friendlyCreationFailure(creation.stage)}</p><div className="failure-stage"><span>Stopped at</span><strong>{creation.stage ?? "Before creation"}</strong></div>{creation.failureEvidence && <small>Safe failure record: <code>{creation.failureEvidence}</code></small>}<ul><li>No project was registered as ready.</li><li>The known staging directory was removed only after containment checks.</li><li>The sample workspace and other generated projects were untouched.</li></ul>{creation.error && <details className="v2-details"><summary>Technical failure details</summary><p>{creation.error}</p></details>}<div><button className="v2-button button-quiet" disabled={busy} onClick={onBack} type="button">Return to Launchpad</button><button className="v2-button button-ember" disabled={busy} onClick={onRetry} type="button">Review and retry creation</button></div></section></main>;
}

function PlanningFailure({ snapshot, onBack, onRevise }: { snapshot: BlueprintPlanningSnapshot; onBack: () => void; onRevise: () => void }) {
  return <main className="new-game-shell planning-failure"><NewGameHeader onBack={onBack} state="focused" /><section><PlanningCore state="focused" /><p className="v2-eyebrow">Planning stopped safely</p><h1>Forge could not prepare a valid blueprint.</h1><p>{snapshot.error}</p>{snapshot.validationProblems.length > 0 && <details><summary>Validation details</summary><ul>{snapshot.validationProblems.map((problem) => <li key={problem}>{problem}</li>)}</ul></details>}<p>No blueprint, project files, directories, commands, or Godot processes were created. The sample path remains available.</p><div><button className="v2-button button-quiet" onClick={onBack} type="button">Return to Launchpad</button><button className="v2-button button-violet" onClick={onRevise} type="button">Revise idea</button></div></section></main>;
}

function LegacyNewGameFlow({ onBack, onOpenProjectWorld }: { onBack: () => void; onOpenProjectWorld: (projectId: string) => void }) {
  const [snapshot, setSnapshot] = useState<BlueprintPlanningSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [reviewStep, setReviewStep] = useState<"interpretation" | "vision">("interpretation");
  const [error, setError] = useState<string | null>(null);
  const [creationState, setCreationState] = useState<ProjectCreationStateResponse | null>(null);
  const [showCreationConfirmation, setShowCreationConfirmation] = useState(false);
  const refresh = useCallback(async () => {
    try { setSnapshot(await loadBlueprintPlanning()); setError(null); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : String(nextError)); }
  }, []);
  useEffect(() => { void refresh(); return subscribeToBlueprintPlanning(() => void refresh(), () => {}); }, [refresh]);
  const refreshCreation = useCallback(async () => { try { setCreationState(await loadProjectCreationState()); } catch (nextError) { setError(nextError instanceof Error ? nextError.message : String(nextError)); } }, []);
  useEffect(() => { void refreshCreation(); return subscribeToProjectCreation(() => void refreshCreation(), () => {}); }, [refreshCreation]);
  const run = useCallback(async (action: () => Promise<BlueprintPlanningSnapshot>) => {
    setBusy(true);
    try { setSnapshot(await action()); setError(null); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : String(nextError)); }
    finally { setBusy(false); }
  }, []);
  const cancel = useCallback(() => { void cancelBlueprintPlanning().finally(onBack); }, [onBack]);
  const revise = useCallback(() => void run(reviseBlueprintIdea), [run]);
  const reject = useCallback(() => { void rejectBlueprintPlan().finally(onBack); }, [onBack]);
  const view = useMemo(() => snapshot?.phase ?? "intake", [snapshot?.phase]);
  const confirmCreation = useCallback(async () => {
    if (!creationState || busy) return;
    setBusy(true);
    try { setCreationState(await createApprovedProject(creationState.mutationToken)); setShowCreationConfirmation(false); setError(null); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : String(nextError)); await refreshCreation(); }
    finally { setBusy(false); }
  }, [busy, creationState, refreshCreation]);
  const cancelCreation = useCallback(async () => {
    if (!creationState || busy) return;
    setBusy(true);
    try { setCreationState(await cancelProjectCreation(creationState.mutationToken)); setError(null); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : String(nextError)); await refreshCreation(); }
    finally { setBusy(false); }
  }, [busy, creationState, refreshCreation]);
  const resetCreationFailure = useCallback(async (returnToLaunchpad: boolean) => {
    if (!creationState || busy) return;
    setBusy(true);
    try {
      setCreationState(await resetFailedProjectCreation(creationState.mutationToken));
      setError(null);
      if (returnToLaunchpad) onBack();
      else setShowCreationConfirmation(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
      await refreshCreation();
    } finally { setBusy(false); }
  }, [busy, creationState, onBack, refreshCreation]);

  if (!snapshot) return <main className="v2-loading"><PlanningCore state="thinking" /><h1>Opening New Game Intake</h1><p>{error ?? "Loading the session planning boundary…"}</p></main>;
  if (showCreationConfirmation && snapshot.blueprint) return <CreationConfirmation blueprint={snapshot.blueprint} questCount={snapshot.acceptedRoadmap?.quests.length ?? snapshot.blueprint.quests.length} busy={busy} error={error} onBack={() => setShowCreationConfirmation(false)} onConfirm={() => void confirmCreation()} />;
  if (creationState?.creation.phase === "creating") return <CreationProgress busy={busy} onCancel={() => void cancelCreation()} state={creationState} />;
  if (creationState?.creation.phase === "created" && creationState.creation.createdProject) return <CreatedProjectSummaryView onBack={onBack} onEnterWorld={onOpenProjectWorld} project={creationState.creation.createdProject} />;
  if (creationState?.creation.phase === "failed") return <CreationFailure busy={busy} onBack={() => void resetCreationFailure(true)} onRetry={() => void resetCreationFailure(false)} state={creationState} />;
  if (view === "planning") return <Planning onBack={cancel} snapshot={snapshot} />;
  if (view === "clarification") return <Clarification busy={busy} error={error} onBack={cancel} onRevise={revise} onSubmit={(answers) => void run(() => submitBlueprintAnswers(answers))} snapshot={snapshot} />;
  if (view === "review") return reviewStep === "interpretation"
    ? <InterpretationReview busy={busy} error={error} onBack={cancel} onContinue={() => setReviewStep("vision")} onReject={reject} onRevise={revise} snapshot={snapshot} />
    : <VisionReview busy={busy} error={error} onApprove={() => void run(approveBlueprint)} onBack={() => setReviewStep("interpretation")} onReject={reject} onRevise={revise} snapshot={snapshot} />;
  if (view === "roadmap_review") return <StarterAwareRoadmapReview busy={busy} error={error} onAccept={() => void run(() => acceptBlueprintRoadmap(snapshot.acceptedRoadmap!.fingerprint))} onEdit={(edit) => void run(() => reviseAcceptedRoadmap(edit))} onReject={reject} snapshot={snapshot} />;
  if (view === "ready") return <CreationConfirmation blueprint={snapshot.blueprint!} questCount={snapshot.acceptedRoadmap!.quests.length} busy={busy} error={error} onBack={onBack} onConfirm={() => void confirmCreation()} />;
  if (view === "failed") return <PlanningFailure onBack={onBack} onRevise={revise} snapshot={snapshot} />;
  return <Intake busy={busy} error={error} initialIdea={snapshot.idea} onBack={onBack} onStart={(idea) => void run(() => startBlueprintPlanning(idea))} />;
}

export function NewGameFlow({ onBack, onOpenProjectWorld }: { onBack: () => void; onOpenProjectWorld: (projectId: string) => void }) {
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creationState, setCreationState] = useState<ProjectCreationStateResponse | null>(null);
  const refresh = useCallback(async () => {
    try { setCreationState(await loadProjectCreationState()); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : String(nextError)); }
  }, []);
  useEffect(() => { void refresh(); return subscribeToProjectCreation(() => void refresh(), () => {}); }, [refresh]);
  const create = async () => {
    if (!creationState || busy) return;
    setBusy(true);
    try { setCreationState(await createOpenProject(displayName, creationState.mutationToken)); setError(null); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : String(nextError)); await refresh(); }
    finally { setBusy(false); }
  };
  const cancel = async () => {
    if (!creationState || busy) return;
    setBusy(true);
    try { setCreationState(await cancelProjectCreation(creationState.mutationToken)); setError(null); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : String(nextError)); await refresh(); }
    finally { setBusy(false); }
  };
  const resetFailure = async () => {
    if (!creationState || busy) return;
    setBusy(true);
    try { setCreationState(await resetFailedProjectCreation(creationState.mutationToken)); setError(null); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : String(nextError)); await refresh(); }
    finally { setBusy(false); }
  };
  if (!creationState) return <main className="v2-loading"><PlanningCore state="thinking" /><h1>Opening new game</h1><p>{error ?? "Loading the safe local workspace…"}</p></main>;
  if (creationState.creation.phase === "creating") return <CreationProgress busy={busy} onCancel={() => void cancel()} state={creationState} />;
  if (creationState.creation.phase === "created" && creationState.creation.createdProject) return <CreatedProjectSummaryView onBack={onBack} onEnterWorld={onOpenProjectWorld} project={creationState.creation.createdProject} />;
  if (creationState.creation.phase === "failed") return <CreationFailure busy={busy} onBack={onBack} onRetry={() => void resetFailure()} state={creationState} />;
  const safeName = /^[A-Za-z0-9][A-Za-z0-9 '&-]{1,47}$/u.test(displayName.trim());
  return <main className="new-game-shell intake-screen"><NewGameHeader onBack={onBack} state="ready" /><section className="intake-layout"><aside className="intake-assembly" aria-hidden="true"><PlanningCore state="ready" /><span className="assembly-label">NEW GODOT PROJECT</span><div className="assembly-beam" /><div className="assembly-nodes"><i /><i /><i /><i /></div><strong>Name → open → describe your game</strong></aside><section className="intake-composer" aria-labelledby="open-project-title"><p className="v2-eyebrow">Shortest path to a playable game</p><h1 id="open-project-title">Name your game.</h1><p className="intake-promise">Forge will create a tiny runnable Godot project. Inside it, you can describe any simple game idea and turn it into small quests.</p><label className="idea-composer"><span>Project name</span><input autoFocus maxLength={48} onChange={(event) => setDisplayName(event.target.value)} placeholder="Moonlight Courier" type="text" value={displayName} /><small>Letters, numbers, spaces, apostrophes, ampersands, and hyphens.</small></label><div className="intake-scope" aria-label="Fixed project scope"><span>Godot 4</span><span>2D</span><span>GDScript</span><span>No game-type gate</span><span>Local Git safety</span></div>{error && <p className="planning-error" role="alert">{error}</p>}<div className="intake-actions"><button className="v2-button button-quiet" onClick={onBack} type="button">Cancel</button><button className="v2-button button-violet" disabled={busy || !safeName} onClick={() => void create()} type="button">Create and open <span aria-hidden="true">→</span></button></div></section></section></main>;
}
