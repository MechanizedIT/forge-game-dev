import { useCallback, useEffect, useState } from "react";

import type { ImplementationPlan, Quest } from "../contracts/index.js";
import {
  approveQuest,
  confirmCreatorResult,
  launchGame,
  loadDashboard,
  resetDemo,
  subscribeToDashboard,
} from "./api.js";
import {
  ActionDock,
  ForgeCompanion,
  Icon,
  ProjectHeader,
  TechnicalDetails,
  WorldMap,
} from "./components.js";
import {
  dashboardProgressStages,
  dashboardNavigationAvailability,
  formatElapsedTime,
  type CreatorConfirmation,
  type DashboardSnapshot,
  type DemoResetAction,
} from "./shared.js";

type View = "World" | "Proof" | "Chronicle" | "Brief";

function approvedFiles(plan: ImplementationPlan): string[] {
  return [...new Set(plan.steps.flatMap((step) => step.files))];
}

function playInstruction(quest: Quest): string {
  return (
    quest.verification.find((verification) => verification.kind === "play")?.instruction ??
    "Move with the arrow keys or WASD and confirm the visible Enemy Targeting behavior."
  );
}

function useElapsedTime(startedAt: string | null): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [startedAt]);
  if (!startedAt) return "00:00";
  return formatElapsedTime((now - Date.parse(startedAt)) / 1_000);
}

function CurrentQuestCard({ snapshot, onReview }: {
  snapshot: DashboardSnapshot;
  onReview: () => void;
}) {
  const roadmapQuest = snapshot.roadmap.quests.find(
    (quest) => quest.questId === snapshot.quest.questId,
  );
  const completed = roadmapQuest?.state === "completed";
  return (
    <section className="current-quest surface raised" aria-labelledby="current-quest-title">
      <div className="quest-icon"><Icon name={completed ? "check" : "spark"} /></div>
      <div className="current-quest-copy">
        <div className="label-row"><span className="eyebrow">Current quest</span><span className={`state-pill ${completed ? "success" : "ember"}`}>{completed ? "Completed" : roadmapQuest?.state ?? "Available"}</span></div>
        <h2 id="current-quest-title">{snapshot.quest.title}</h2>
        <p className="outcome-copy">{snapshot.quest.playerOutcome}</p>
        <p className="why-copy"><strong>Why now:</strong> {snapshot.quest.whyItMatters}</p>
      </div>
      <button className={completed ? "text-link" : "button primary quest-start"} onClick={onReview} type="button">{completed ? "View proof" : `Review ${snapshot.quest.title}`} <Icon name="arrow" /></button>
    </section>
  );
}

function ProofPreview({ snapshot }: { snapshot: DashboardSnapshot }) {
  const commands = snapshot.quest.verification.filter((item) => item.kind === "command");
  return (
    <section className="proof-preview surface" aria-labelledby="proof-preview-title">
      <div className="section-heading compact"><div><p className="eyebrow">Proof preview</p><h2 id="proof-preview-title">How Forge will know</h2></div><span className="planned-tag">{snapshot.review ? "Recorded proof" : "Planned proof"}</span></div>
      <div className="proof-preview-grid">
        <div><span className="proof-icon blue"><Icon name="code" /></span><h3>Automated</h3><p>{commands.length} approved checks plus deterministic Godot signals.</p></div>
        <div><span className="proof-icon gold"><Icon name="play" /></span><h3>Creator</h3><p>You play and explicitly confirm the visible state change.</p></div>
      </div>
    </section>
  );
}

function WorldReady({ snapshot, onReview, onReset }: {
  snapshot: DashboardSnapshot;
  onReview: () => void;
  onReset: () => void;
}) {
  const complete = snapshot.completion !== null;
  const roadmapQuest = snapshot.roadmap.quests.find((quest) => quest.questId === snapshot.quest.questId);
  const questState = complete ? "completed" : snapshot.phase === "implementation_running" ? "in progress" : roadmapQuest?.state ?? "available";
  return (
    <>
      <div className="page-intro orientation-intro"><div><p className="eyebrow">Forge in one sentence</p><h2>Turn game development with Codex into visible, reviewable quests.</h2><p>{complete ? "This workspace already contains a completed demo run." : "You will review one gameplay change, approve Codex, verify it, then play it yourself."}</p></div><span className={`state-pill ${complete ? "success" : "ember"}`}>Enemy Targeting · {questState}</span></div>
      <section className="journey-card surface" aria-label="Forge demo path">
        <div><p className="eyebrow">Your five-step demo</p><h2>Review → approve → build → verify → play</h2></div>
        <p>Codex will change only three approved Godot files. Forge will inspect the diff, run deterministic checks, and ask you to confirm what you see in the game.</p>
      </section>
      {snapshot.notice && <p className="prototype-notice" role="status">{snapshot.notice}</p>}
      <div className="dashboard-grid">
        <main className="main-column"><CurrentQuestCard snapshot={snapshot} onReview={onReview} /><WorldMap roadmap={snapshot.roadmap} /><ProofPreview snapshot={snapshot} /></main>
        <div className="side-column">
          <ForgeCompanion title={complete ? "The world remembers" : "The world is ready"} tone={complete ? "success" : "ember"}><p>{complete ? snapshot.completion?.summary : snapshot.quest.whyItMatters}</p><p>{complete ? "The roadmap and final review were reloaded from persisted Forge artifacts." : "I’ll show you the boundary and proof before anything changes."}</p></ForgeCompanion>
          <section className="workbench-note surface"><span className="proof-icon blue"><Icon name="file" /></span><div><p className="eyebrow">Project workspace</p><h3>{snapshot.project.workspaceStatus === "reset" || snapshot.project.workspaceStatus === "created" ? "Fresh demo ready" : "Existing progress preserved"}</h3><p>Enemy Targeting is <strong>{questState}</strong>. {snapshot.project.workspaceStatus === "preserved" ? "Forge did not overwrite your prior demo run." : "The immutable baseline was copied into your workspace."}</p>{snapshot.project.workspaceStatus === "preserved" && <p className="reset-command">Fresh terminal reset: <code>npm run demo:reset -- confirm-reset</code></p>}{complete && <button className="button secondary fresh-demo-button" onClick={onReset} type="button">Start fresh demo</button>}</div></section>
        </div>
      </div>
      <ActionDock consequence={complete ? "Inspect the persisted result, or reset this generated workspace for a fresh judge run." : "Start here: see the exact change, three-file boundary, and proof plan before approval."} secondaryLabel={complete ? "Start fresh demo" : undefined} onSecondary={complete ? onReset : undefined} primaryLabel={complete ? "View completed proof" : `Review ${snapshot.quest.title}`} onPrimary={onReview} />
    </>
  );
}

function NowAfterComparison({ quest }: { quest: Quest }) {
  return (
    <section className="now-after surface" aria-labelledby="outcome-title">
      <div className="section-heading compact"><div><p className="eyebrow">Quest outcome</p><h2 id="outcome-title">Turn a static enemy into a clear reaction</h2></div><span className="state-pill blue">Validated quest</span></div>
      <div className="comparison-grid">
        <div className="comparison-side now"><span>Now</span><h3>Current baseline</h3><p>{quest.baselineBehavior}</p></div>
        <div className="comparison-arrow" aria-hidden="true"><Icon name="arrow" /></div>
        <div className="comparison-side after"><span>After</span><h3>Expected behavior</h3><p>{quest.expectedBehavior}</p></div>
      </div>
    </section>
  );
}

function QuestBrief({ snapshot, busy, onBuild, onBack }: {
  snapshot: DashboardSnapshot;
  busy: boolean;
  onBuild: () => void;
  onBack: () => void;
}) {
  const files = approvedFiles(snapshot.plan);
  return (
    <>
      <div className="page-intro brief-intro">
        <div><button className="back-link" onClick={onBack} type="button">← World</button><p className="eyebrow">Quest brief · Awaiting approval</p><h2>{snapshot.quest.title}</h2><p>{snapshot.quest.playerOutcome}</p></div>
        <span className="approval-shield"><Icon name="check" /> {snapshot.plan.openDecisions.length === 0 ? "No open decisions" : `${snapshot.plan.openDecisions.length} open decisions`}</span>
      </div>
      <div className="dashboard-grid brief-grid">
        <main className="main-column">
          <NowAfterComparison quest={snapshot.quest} />
          <section className="plan-card surface" aria-labelledby="plan-title">
            <div className="section-heading"><div><p className="eyebrow">Implementation plan · Revision {snapshot.plan.revision}</p><h2 id="plan-title">{snapshot.plan.summary}</h2></div><span className="planned-tag">Approved artifact</span></div>
            <ol className="plan-steps">{snapshot.plan.steps.map((step, index) => <li key={step.id}><span className="step-number">{String(index + 1).padStart(2, "0")}</span><div><h3>{step.id}</h3><p>{step.description}</p><code>{step.files.length > 0 ? step.files.join(", ") : "No additional files"}</code></div></li>)}</ol>
          </section>
          <section className="scope-grid">
            <div className="surface scope-card allowed"><div className="section-heading compact"><div><p className="eyebrow">Allowed boundary</p><h2>Exactly {files.length} files</h2></div><span className="file-count">{files.length}</span></div><ul className="file-list">{files.map((file) => <li key={file}><Icon name="file" /><code>{file}</code></li>)}</ul></div>
            <div className="surface scope-card excluded"><p className="eyebrow">Explicitly excluded</p><h2>Not part of this quest</h2><ul className="quiet-list">{snapshot.plan.excluded.map((item) => <li key={item}>{item}</li>)}</ul></div>
          </section>
          <section className="proof-plan surface">
            <div className="section-heading compact"><div><p className="eyebrow">Proof plan</p><h2>Automated checks plus creator play</h2></div><span className="planned-tag">Not run yet</span></div>
            <div className="proof-plan-grid"><div><span className="proof-icon blue"><Icon name="code" /></span><div><h3>Automated proof</h3><p>{snapshot.quest.verification.filter((item) => item.kind === "command").map((item) => item.argv.join(" ")).join(" and ")}</p></div></div><div><span className="proof-icon gold"><Icon name="play" /></span><div><h3>Creator proof</h3><p>{playInstruction(snapshot.quest)}</p></div></div></div>
            <TechnicalDetails label="View exact assumptions and criteria"><ul className="quiet-list">{snapshot.plan.assumptions.map((item) => <li key={item}>{item}</li>)}</ul>{snapshot.quest.acceptanceCriteria.map((criterion) => <p key={criterion.id}><code>{criterion.id}</code> {criterion.text}</p>)}</TechnicalDetails>
          </section>
        </main>
        <div className="side-column"><ForgeCompanion title="A small, visible change" tone="blue"><p>{snapshot.quest.whyItMatters}</p><p>Forge will compare the real diff and verification evidence with this exact plan.</p></ForgeCompanion><section className="approval-boundary surface"><div className="boundary-icon"><Icon name="check" /></div><p className="eyebrow">Approval boundary</p><h3>Nothing has changed yet.</h3><p>Building snapshots revision {snapshot.plan.revision} and lets Codex edit only the {files.length} files shown here.</p></section></div>
      </div>
      <ActionDock consequence={`Codex may change only the ${files.length} files in this approved plan.`} secondaryLabel="Back to world" onSecondary={onBack} primaryLabel={busy ? "Starting…" : "Build with Codex"} primaryIcon="spark" onPrimary={busy ? undefined : onBuild} />
    </>
  );
}

const progressExplanations = [
  "Reading only the approved scene and scripts.",
  "Turning the approved plan into a focused Codex work packet.",
  "Codex is applying the bounded Enemy Targeting change.",
  "Forge is checking the real diff and running the approved commands.",
  "Forge is mapping evidence back to every acceptance criterion.",
] as const;

function ProgressStages({ progress }: { progress: DashboardSnapshot["progress"] }) {
  const current = Math.max(0, Math.min(progress.length - 1, dashboardProgressStages.length - 1));
  return <ol className="progress-stages">{dashboardProgressStages.map((stage, index) => { const status = progress.includes(stage) && index < current ? "complete" : index === current ? "current" : "pending"; return <li className={status} key={stage}><span className="stage-marker">{status === "complete" ? <Icon name="check" /> : index + 1}</span><div><span className="stage-state">{status === "complete" ? "Done" : status === "current" ? "In progress" : "Waiting"}</span><h3>{stage}</h3>{status === "current" && <p>{progressExplanations[index]}</p>}</div></li>; })}</ol>;
}

function ImplementationRunning({ snapshot }: { snapshot: DashboardSnapshot }) {
  const files = approvedFiles(snapshot.plan);
  const elapsed = useElapsedTime(snapshot.runStartedAt);
  const currentIndex = Math.max(0, Math.min(snapshot.progress.length - 1, dashboardProgressStages.length - 1));
  const currentStage = snapshot.progress.at(-1) ?? dashboardProgressStages[0];
  return (
    <>
      <div className="page-intro progress-intro"><div><p className="eyebrow">{snapshot.quest.title} · Codex is working</p><h2>{currentStage}</h2><p>{progressExplanations[currentIndex]} The approved plan stays locked for this run.</p></div><span className="running-indicator"><span /> Still working · {elapsed}</span></div>
      <main className="progress-focus">
        <section className="progress-card surface raised" aria-labelledby="progress-title">
          <div className="progress-reassurance"><div><p className="eyebrow">Live, understandable progress</p><h2 id="progress-title">Forge is still with you.</h2></div><p>Codex implementation can take several minutes. This timer keeps moving while the run is active; Forge will verify the real diff before you can play.</p></div>
          <ProgressStages progress={snapshot.progress} />
        </section>
        <TechnicalDetails label="Technical details (optional)"><dl className="details-grid"><div><dt>Elapsed</dt><dd>{elapsed}</dd></div><div><dt>Approved scope</dt><dd>{files.length} files</dd></div><div><dt>Network</dt><dd>Disabled</dd></div><div><dt>Workspace</dt><dd>Prepared Sample Game</dd></div></dl><ul className="file-list compact-files">{files.map((file) => <li key={file}><Icon name="check" /><code>{file}</code></li>)}</ul>{snapshot.technicalEvents.map((event, index) => <pre key={index}>{JSON.stringify(event)}</pre>)}</TechnicalDetails>
      </main>
      <ActionDock consequence={`Still working for ${elapsed}. No action is needed; Forge will stop safely if verification fails.`} status="Run in progress" />
    </>
  );
}

function ProofSummary({ snapshot, busy, onPlay }: {
  snapshot: DashboardSnapshot;
  busy: boolean;
  onPlay: () => void;
}) {
  const review = snapshot.review;
  if (!review) return <FailureState snapshot={snapshot} />;
  const files = snapshot.handoff?.changes.map((change) => change.path) ?? [];
  const complete = snapshot.completion !== null;
  return (
    <>
      {snapshot.error && <p className="error-notice" role="alert">{snapshot.error}</p>}
      {snapshot.notice && <p className="prototype-notice" role="status">{snapshot.notice}</p>}
      <div className="result-banner surface"><div className="result-icon"><Icon name="check" /></div><div><p className="eyebrow">Automated result</p><h2>{complete ? "All proof passed" : "Automated checks passed"}</h2><p>{complete ? "Forge persisted automated and creator evidence." : "The change stayed inside the approved scope. Forge still needs your eyes on the game."}</p></div><span className="manual-status"><span /> {complete ? "Creator confirmed" : "Play confirmation needed"}</span></div>
      <div className="dashboard-grid evidence-grid">
        <main className="main-column">
          <section className="surface criteria-card" aria-labelledby="criteria-title"><div className="section-heading"><div><p className="eyebrow">Acceptance proof</p><h2 id="criteria-title">Evidence against every criterion</h2></div><span className="state-pill blue">{review.verdict}</span></div><ul className="criteria-list">{review.criteria.map((criterion) => { const text = snapshot.quest.acceptanceCriteria.find((item) => item.id === criterion.criterionId)?.text ?? criterion.criterionId; return <li className={criterion.result === "pending_play" ? "pending" : ""} key={criterion.criterionId}><span className="criterion-check"><Icon name={criterion.result === "pending_play" ? "play" : "check"} /></span><code>{criterion.criterionId}</code><p>{text}</p><strong>{criterion.result.replace("_", " ")}</strong></li>; })}</ul></section>
          <section className="surface changed-files"><div className="section-heading compact"><div><p className="eyebrow">Scope result</p><h2>{files.length} recorded file{files.length === 1 ? "" : "s"} changed</h2></div><span className="success-label"><Icon name="check" /> {review.scope.unexpectedFiles.length === 0 ? "No unexpected files" : `${review.scope.unexpectedFiles.length} unexpected`}</span></div><ul className="file-list horizontal">{files.map((file) => <li key={file}><Icon name="file" /><code>{file}</code></li>)}</ul></section>
          <TechnicalDetails label="View technical evidence">{snapshot.handoff?.verificationRuns.map((verification) => <div className="command-result" key={verification.verificationId}><span>{verification.exitCode === 0 ? "Passed" : "Failed"}</span><code>{verification.command.join(" ")}</code><p>{verification.evidence}</p></div>)}{snapshot.technicalEvents.map((event, index) => <pre key={index}>{JSON.stringify(event)}</pre>)}</TechnicalDetails>
        </main>
        <div className="side-column"><ForgeCompanion title={complete ? "The quest is proven" : "Your eyes are the final proof"} tone="success"><p>{complete ? snapshot.completion?.summary : "Every automated check passed. Follow the four steps below, then report only what you personally observed."}</p></ForgeCompanion><section className="play-instructions surface"><p className="eyebrow">Before you launch</p><h2>How to test the game</h2><ol><li><span>1</span>Move with the arrow keys or WASD.</li><li><span>2</span>Approach the enemy and watch <code>IDLE → CHASING</code>.</li><li><span>3</span>Retreat and watch <code>CHASING → IDLE</code>.</li><li><span>4</span>Close the game when finished.</li></ol></section></div>
      </div>
      <ActionDock consequence={complete ? "The final review and roadmap completion are persisted." : "Launch the Sample Game and confirm the visible behavior yourself."} primaryLabel={complete ? undefined : busy || snapshot.phase === "launching_game" ? "Game running…" : "Play the result"} primaryIcon="play" onPrimary={complete || busy ? undefined : onPlay} status={complete ? "Quest complete" : undefined} />
    </>
  );
}

function QuestComplete({ snapshot, onWorld }: {
  snapshot: DashboardSnapshot;
  onWorld: () => void;
}) {
  if (!snapshot.completion) return <FailureState snapshot={snapshot} />;
  const date = new Date(snapshot.completion.completedAt);
  return (
    <>
      <div className="completion-hero surface"><div className="completion-emblem"><span><Icon name="check" /></span></div><div><p className="eyebrow">Quest complete</p><h2>{snapshot.quest.title} is alive.</h2><p>{snapshot.completion.summary}</p></div><span className="completion-stamp">Verified by Forge + creator</span></div>
      <div className="dashboard-grid complete-grid"><main className="main-column"><WorldMap roadmap={snapshot.roadmap} /><section className="chronicle-preview surface"><div className="section-heading"><div><p className="eyebrow">Chronicle</p><h2>A concise persisted record</h2></div><span className="state-pill success">Saved</span></div><div className="chronicle-row"><span className="chronicle-date">{String(date.getDate()).padStart(2, "0")}<br/><small>{date.toLocaleString("en", { month: "short" }).toUpperCase()}</small></span><div><h3>{snapshot.quest.title} completed</h3><p>{snapshot.completion.summary}</p><div className="proof-badges"><span><Icon name="check" /> Automated proof</span><span><Icon name="check" /> Creator proof</span><span><Icon name="check" /> Scope clean</span></div></div></div></section></main><div className="side-column"><ForgeCompanion title="The world remembers" tone="success"><p>Forge reloaded this completion from the persistent workspace. Celebration appears only after the final review, completion, and roadmap writes succeed.</p></ForgeCompanion><section className="next-direction surface"><p className="eyebrow">Completed at</p><h2>{date.toLocaleString()}</h2><p>Run <code>{snapshot.completion.runId}</code></p></section></div></div>
      <ActionDock consequence="Return to the world and inspect the persisted completed node." primaryLabel="Return to world" onPrimary={onWorld} />
    </>
  );
}

function FailureState({ snapshot }: { snapshot: DashboardSnapshot }) {
  return (
    <div className="failure-panel surface" role="alert"><p className="eyebrow">Forge stopped safely</p><h2>{snapshot.phase === "verification_failed" ? "The change did not pass verification." : "Forge needs attention before continuing."}</h2><p>{snapshot.error ?? "The current workflow could not continue."}</p>{snapshot.review?.concerns.map((concern) => <p key={concern}>{concern}</p>)}<TechnicalDetails label="Preserved evidence">{snapshot.handoff?.verificationRuns.map((run) => <p key={run.verificationId}><code>{run.command.join(" ")}</code>: exit {run.exitCode}<br/>{run.evidence}</p>)}</TechnicalDetails><p>The quest remains incomplete. Review the evidence or use the existing explicit reset path before trying again.</p></div>
  );
}

function PlayConfirmation({ busy, onConfirm }: {
  busy: boolean;
  onConfirm: (response: CreatorConfirmation) => void;
}) {
  return <div className="modal-backdrop" role="presentation"><section className="confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><span className="state-pill blue">Game closed</span><div className="modal-icon"><Icon name="play" /></div><p className="eyebrow">Creator confirmation</p><h2 id="confirm-title">Did you see it work?</h2><p>Confirm only after you personally saw the enemy change from IDLE to CHASING and back to IDLE.</p><div className="modal-actions"><button className="button secondary" disabled={busy} onClick={() => onConfirm("CANCEL")} type="button">Cancel</button><button className="button secondary" disabled={busy} onClick={() => onConfirm("IT DID NOT WORK")} type="button">It did not work</button><button className="button primary" disabled={busy} onClick={() => onConfirm("I SAW IT WORK")} type="button">I saw it work <Icon name="check" /></button></div><small>Forge records only the exact choice you make here.</small></section></div>;
}

function ResetConfirmation({ busy, onReset }: {
  busy: boolean;
  onReset: (action: DemoResetAction) => void;
}) {
  return <div className="modal-backdrop" role="presentation"><section className="confirmation-modal reset-modal" role="dialog" aria-modal="true" aria-labelledby="reset-title"><span className="state-pill ember">Explicit reset</span><p className="eyebrow">Start fresh demo</p><h2 id="reset-title">Replace the generated demo workspace?</h2><p>This removes the saved quest progress and gameplay changes from <strong>Forge’s demo workspace only</strong>. The repository, immutable fixture, and verified Godot cache stay untouched.</p><p>Terminal equivalent: <code>npm run demo:reset -- confirm-reset</code></p><div className="modal-actions"><button className="button secondary" disabled={busy} onClick={() => onReset("CANCEL")} type="button">Cancel</button><button className="button primary" disabled={busy} onClick={() => onReset("CONFIRM RESET")} type="button">Reset and start fresh</button></div></section></div>;
}

export default function App() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [view, setView] = useState<View>("World");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const next = await loadDashboard();
      setSnapshot(next);
      setLocalError(null);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : String(error));
    }
  }, []);

  useEffect(() => {
    void refresh();
    return subscribeToDashboard(
      (event) => {
        if (event.type === "progress") {
          setSnapshot((current) => current ? { ...current, phase: "implementation_running", progress: event.progress } : current);
        } else {
          void refresh();
        }
      },
      () => {},
    );
  }, [refresh]);

  useEffect(() => {
    if (!snapshot) return;
    document.title = `${snapshot.quest.title} · Forge Workshop`;
    if (snapshot.phase === "ready_to_play" || snapshot.phase === "launching_game" || snapshot.phase === "awaiting_confirmation") setView("Proof");
    if (snapshot.phase === "quest_complete") setView("Chronicle");
    if (snapshot.phase === "implementation_running") setView("World");
  }, [snapshot?.phase]);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await approveQuest();
      await refresh();
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const play = async () => {
    if (busy || !snapshot) return;
    setBusy(true);
    setSnapshot({ ...snapshot, phase: "launching_game", notice: "Godot is running. Return after the game closes." });
    try {
      setSnapshot(await launchGame());
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : String(error));
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (response: CreatorConfirmation) => {
    if (busy) return;
    setBusy(true);
    try {
      const next = await confirmCreatorResult(response);
      setSnapshot(next);
      if (next.phase === "quest_complete") setView("Chronicle");
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : String(error));
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const reset = async (action: DemoResetAction) => {
    if (busy) return;
    setBusy(true);
    try {
      const next = await resetDemo(action);
      setSnapshot(next);
      setView("World");
      setShowResetConfirmation(false);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  if (!snapshot) return <div className="loading-screen"><div className="ember-core" aria-hidden="true"><span className="core-center" /></div><h1>Opening Forge Workshop</h1><p>{localError ?? "Loading the validated Sample Game workspace…"}</p></div>;

  const navigation = dashboardNavigationAvailability(snapshot);
  const navigate = (destination: "World" | "Proof" | "Chronicle") => setView(destination);
  const activeNav = view === "Brief" ? "World" : view;
  const showBrief = view === "Brief" && snapshot.phase === "world_ready";
  const showProof = view === "Proof" && snapshot.review !== null;
  const showComplete = view === "Chronicle" && snapshot.completion !== null;

  return (
    <div className="app-shell">
      <ProjectHeader active={activeNav} engine={snapshot.project.engine} projectName={snapshot.project.name} proofAvailable={navigation.Proof} chronicleAvailable={navigation.Chronicle} onNavigate={navigate} />
      <div className="blueprint-rule" aria-hidden="true" />
      <div className="demo-ribbon"><span>Live Forge workspace</span><p>Validated quest artifacts · real runner · persisted completion</p></div>
      {localError && <button className="nav-notice error" onClick={() => setLocalError(null)} type="button">{localError}<span>Dismiss</span></button>}
      <div className="page-shell">
        {snapshot.phase === "implementation_running" ? <ImplementationRunning snapshot={snapshot} />
          : snapshot.phase === "verification_failed" || snapshot.phase === "blocked" ? <FailureState snapshot={snapshot} />
          : showBrief ? <QuestBrief snapshot={snapshot} busy={busy} onBack={() => setView("World")} onBuild={() => void run()} />
          : showProof ? <ProofSummary snapshot={snapshot} busy={busy} onPlay={() => void play()} />
          : showComplete ? <QuestComplete snapshot={snapshot} onWorld={() => setView("World")} />
          : snapshot.phase === "ready_to_play" || snapshot.phase === "launching_game" || snapshot.phase === "awaiting_confirmation" ? <ProofSummary snapshot={snapshot} busy={busy} onPlay={() => void play()} />
          : <WorldReady snapshot={snapshot} onReset={() => setShowResetConfirmation(true)} onReview={() => snapshot.completion ? setView("Proof") : setView("Brief")} />}
      </div>
      {snapshot.phase === "awaiting_confirmation" && <PlayConfirmation busy={busy} onConfirm={(response) => void confirm(response)} />}
      {showResetConfirmation && <ResetConfirmation busy={busy} onReset={(action) => void reset(action)} />}
    </div>
  );
}
