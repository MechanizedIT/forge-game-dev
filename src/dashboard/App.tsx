import { useEffect, useState } from "react";

import { acceptanceProof, allowedFiles, dashboardStateLabels, excludedWork, implementationSteps, progressStages, type DashboardState } from "./data.js";
import { ActionDock, ForgeCompanion, Icon, ProjectHeader, PrototypeSwitcher, TechnicalDetails, WorldMap } from "./components.js";

function CurrentQuestCard({ onReview }: { onReview: () => void }) {
  return (
    <section className="current-quest surface raised" aria-labelledby="current-quest-title">
      <div className="quest-icon"><Icon name="spark" /></div>
      <div className="current-quest-copy">
        <div className="label-row"><span className="eyebrow">Current quest</span><span className="state-pill ember">Available</span></div>
        <h2 id="current-quest-title">Enemy Targeting</h2>
        <p className="outcome-copy">Make the idle red enemy notice and chase the nearby player, then stop when the player retreats.</p>
        <p className="why-copy"><strong>Why now:</strong> this is the smallest change that turns the static sample scene into a responsive encounter.</p>
      </div>
      <button className="text-link" onClick={onReview} type="button">Open brief <Icon name="arrow" /></button>
    </section>
  );
}

function ProofPreview() {
  return (
    <section className="proof-preview surface" aria-labelledby="proof-preview-title">
      <div className="section-heading compact"><div><p className="eyebrow">Proof preview</p><h2 id="proof-preview-title">How Forge will know</h2></div><span className="planned-tag">Planned proof</span></div>
      <div className="proof-preview-grid">
        <div><span className="proof-icon blue"><Icon name="code" /></span><h3>Automated</h3><p>Project checks plus deterministic Godot signals.</p></div>
        <div><span className="proof-icon gold"><Icon name="play" /></span><h3>Creator</h3><p>You will play and confirm the visible state change.</p></div>
      </div>
    </section>
  );
}

function WorldReady({ onReview }: { onReview: () => void }) {
  return (
    <>
      <div className="page-intro"><div><p className="eyebrow">World</p><h2>Your next playable change is ready to review.</h2></div><span className="intro-note">Nothing changes before approval</span></div>
      <div className="dashboard-grid">
        <main className="main-column"><CurrentQuestCard onReview={onReview} /><WorldMap /><ProofPreview /></main>
        <div className="side-column">
          <ForgeCompanion title="The world is ready"><p>The player can already move, but the enemy never reacts. Enemy Targeting is the smallest next quest that makes this world feel alive.</p><p>I’ll show you the boundary and proof before anything changes.</p></ForgeCompanion>
          <section className="workbench-note surface"><span className="proof-icon blue"><Icon name="file" /></span><div><p className="eyebrow">Project foundation</p><h3>Prepared and verified</h3><p>Sample scene, player movement, and resettable fixture are ready.</p></div></section>
        </div>
      </div>
      <ActionDock consequence="Review the visible outcome, three-file boundary, and proof plan." primaryLabel="Review Enemy Targeting" onPrimary={onReview} />
    </>
  );
}

function NowAfterComparison() {
  return (
    <section className="now-after surface" aria-labelledby="outcome-title">
      <div className="section-heading compact"><div><p className="eyebrow">Quest outcome</p><h2 id="outcome-title">Turn a static enemy into a clear reaction</h2></div><span className="state-pill blue">Revision 1</span></div>
      <div className="comparison-grid">
        <div className="comparison-side now"><span>Now</span><h3>The enemy never reacts</h3><p>The red enemy is visible, but it always stands still and never detects the player.</p></div>
        <div className="comparison-arrow" aria-hidden="true"><Icon name="arrow" /></div>
        <div className="comparison-side after"><span>After</span><h3>It notices, chases, and resets</h3><p>Within 220 pixels it switches to CHASING and moves toward the player, then returns to IDLE outside range.</p></div>
      </div>
    </section>
  );
}

function QuestBrief({ onBuild, onBack }: { onBuild: () => void; onBack: () => void }) {
  const [notice, setNotice] = useState("");
  return (
    <>
      <div className="page-intro brief-intro">
        <div><button className="back-link" onClick={onBack} type="button">← World</button><p className="eyebrow">Quest brief · Awaiting approval</p><h2>Enemy Targeting</h2><p>Make the enemy respond clearly when the player enters and leaves its range.</p></div>
        <span className="approval-shield"><Icon name="check" /> No open decisions</span>
      </div>
      <div className="dashboard-grid brief-grid">
        <main className="main-column">
          <NowAfterComparison />
          <section className="plan-card surface" aria-labelledby="plan-title">
            <div className="section-heading"><div><p className="eyebrow">Implementation plan</p><h2 id="plan-title">Four bounded steps</h2></div><span className="planned-tag">Planned work</span></div>
            <ol className="plan-steps">{implementationSteps.map((step, index) => <li key={step.title}><span className="step-number">0{index + 1}</span><div><h3>{step.title}</h3><p>{step.description}</p><code>{step.file}</code></div></li>)}</ol>
          </section>
          <section className="scope-grid">
            <div className="surface scope-card allowed"><div className="section-heading compact"><div><p className="eyebrow">Allowed boundary</p><h2>Exactly three files</h2></div><span className="file-count">3</span></div><ul className="file-list">{allowedFiles.map((file) => <li key={file}><Icon name="file" /><code>{file}</code></li>)}</ul></div>
            <div className="surface scope-card excluded"><p className="eyebrow">Explicitly excluded</p><h2>Not part of this quest</h2><ul className="quiet-list">{excludedWork.map((item) => <li key={item}>{item}</li>)}</ul></div>
          </section>
          <section className="proof-plan surface">
            <div className="section-heading compact"><div><p className="eyebrow">Proof plan</p><h2>Two kinds of evidence</h2></div><span className="planned-tag">Not run yet</span></div>
            <div className="proof-plan-grid"><div><span className="proof-icon blue"><Icon name="code" /></span><div><h3>Automated proof</h3><p>Repository checks and headless Godot checks for idle, detection, chase, and player movement.</p></div></div><div><span className="proof-icon gold"><Icon name="play" /></span><div><h3>Creator proof</h3><p>Play the scene and observe IDLE → CHASING → IDLE before Forge completes the quest.</p></div></div></div>
            <TechnicalDetails label="View exact checks and assumptions"><p><code>npm run check</code></p><p><code>npm run godot:verify</code></p><p>Assumption: direct movement is sufficient because the sample scene has no chase obstacles.</p></TechnicalDetails>
          </section>
          {notice && <p className="prototype-notice" role="status">{notice}</p>}
        </main>
        <div className="side-column"><ForgeCompanion title="A small, visible change" tone="blue"><p>I’ve reduced this to one visible behavior and three files. Forge will check the mechanics automatically, then ask you to play it.</p></ForgeCompanion><section className="approval-boundary surface"><div className="boundary-icon"><Icon name="check" /></div><p className="eyebrow">Approval boundary</p><h3>Nothing has changed yet.</h3><p>Building snapshots this plan and allows Codex to edit only the three files shown here.</p></section></div>
      </div>
      <ActionDock consequence="Codex may change only the 3 files in this approved plan." secondaryLabel="Revise plan" onSecondary={() => setNotice("Plan refinement is intentionally not connected in this frontend prototype.")} primaryLabel="Build with Codex" primaryIcon="spark" onPrimary={onBuild} />
    </>
  );
}

function ProgressStages({ current }: { current: number }) {
  const explanations = ["Reading only the approved scene and scripts.", "Turning the approved plan into a focused Codex work packet.", "Codex is applying the bounded Enemy Targeting change.", "Forge is checking the actual diff and running both approved commands.", "Forge is mapping evidence back to every acceptance criterion."];
  return <ol className="progress-stages">{progressStages.map((stage, index) => { const status = index < current ? "complete" : index === current ? "current" : "pending"; return <li className={status} key={stage}><span className="stage-marker">{status === "complete" ? <Icon name="check" /> : index + 1}</span><div><span className="stage-state">{status === "complete" ? "Done" : status === "current" ? "In progress" : "Waiting"}</span><h3>{stage}</h3>{status === "current" && <p>{explanations[index]}</p>}</div></li>; })}</ol>;
}

function ImplementationRunning({ currentStage }: { currentStage: number }) {
  return (
    <>
      <div className="page-intro"><div><p className="eyebrow">Enemy Targeting · Implementation</p><h2>Forge is updating the game.</h2><p>The approved plan is locked while this run is active.</p></div><span className="running-indicator"><span /> Working</span></div>
      <div className="dashboard-grid progress-grid">
        <main className="main-column">
          <section className="progress-card surface raised" aria-labelledby="progress-title"><div className="section-heading"><div><p className="eyebrow">Understandable progress</p><h2 id="progress-title">{progressStages[currentStage]}</h2></div><span className="prototype-tag">Demo stage</span></div><ProgressStages current={currentStage} /></section>
          <TechnicalDetails label="Technical details (optional)"><dl className="details-grid"><div><dt>Approved scope</dt><dd>3 files</dd></div><div><dt>Network</dt><dd>Disabled</dd></div><div><dt>Workspace</dt><dd>Prepared Sample Game</dd></div><div><dt>Event view</dt><dd>Sanitized stage reducer</dd></div></dl><p>No raw SDK event stream is shown in the primary experience.</p></TechnicalDetails>
        </main>
        <div className="side-column"><ForgeCompanion title={currentStage < 3 ? "The boundary is holding" : "Verification comes next"} tone="blue"><p>{currentStage < 3 ? "Codex is working only inside the approved three-file boundary. Forge will compare the real diff with that plan before presenting a result." : "The code change is no longer enough on its own. Forge is checking scope, project health, and the Godot behavior now."}</p></ForgeCompanion><section className="scope-lock surface"><div className="lock-heading"><span className="proof-icon blue"><Icon name="file" /></span><div><p className="eyebrow">Scope lock</p><h3>3 approved files</h3></div></div><ul className="file-list compact-files">{allowedFiles.map((file) => <li key={file}><Icon name="check" /><code>{file}</code></li>)}</ul></section></div>
      </div>
      <ActionDock consequence="No action needed — Forge is completing the current stage." status="Run in progress" />
    </>
  );
}

function ProofSummary({ onPlay }: { onPlay: () => void }) {
  return (
    <>
      <div className="result-banner surface"><div className="result-icon"><Icon name="check" /></div><div><p className="eyebrow">Automated result</p><h2>Automated checks passed</h2><p>The change stayed inside the approved scope. Forge still needs your eyes on the game.</p></div><span className="manual-status"><span /> Play confirmation needed</span></div>
      <div className="dashboard-grid evidence-grid">
        <main className="main-column">
          <section className="surface criteria-card" aria-labelledby="criteria-title">
            <div className="section-heading"><div><p className="eyebrow">Acceptance proof</p><h2 id="criteria-title">Five checked · one needs play</h2></div><span className="state-pill blue">Automated proof</span></div>
            <ul className="criteria-list">{acceptanceProof.map(([id, proof]) => <li key={id}><span className="criterion-check"><Icon name="check" /></span><code>{id}</code><p>{proof}</p><strong>Passed</strong></li>)}<li className="pending"><span className="criterion-check"><Icon name="play" /></span><code>AC-6</code><p>Visible IDLE → CHASING → IDLE observation</p><strong>Pending play</strong></li></ul>
          </section>
          <section className="surface changed-files"><div className="section-heading compact"><div><p className="eyebrow">Scope result</p><h2>Exactly three planned files changed</h2></div><span className="success-label"><Icon name="check" /> No unexpected files</span></div><ul className="file-list horizontal">{allowedFiles.map((file) => <li key={file}><Icon name="file" /><code>{file}</code></li>)}</ul></section>
          <TechnicalDetails label="View technical evidence"><div className="command-result"><span>Passed</span><code>npm run check</code></div><div className="command-result"><span>Passed</span><code>npm run godot:verify</code></div><p><code>FORGE_ENEMY_TARGETING_VERIFY_OK idle=pass detection=pass chase=pass player=pass</code></p><p>Internal verdict: <code>CONDITIONAL PASS</code>. AC-6 remains <code>pending_play</code>.</p></TechnicalDetails>
        </main>
        <div className="side-column">
          <ForgeCompanion title="Your eyes are the final proof" tone="success"><p>Every automated check passed. Approach the red enemy, then retreat, and confirm both state changes before Forge records completion.</p></ForgeCompanion>
          <section className="play-instructions surface"><p className="eyebrow">What to look for</p><h2>Play the result</h2><ol><li><span>1</span>Approach the red enemy.</li><li><span>2</span>Observe <code>IDLE → CHASING</code>.</li><li><span>3</span>Retreat beyond its range.</li><li><span>4</span>Observe <code>CHASING → IDLE</code>.</li></ol></section>
        </div>
      </div>
      <ActionDock consequence="Launch the Sample Game and confirm the visible behavior yourself." primaryLabel="Play the result" primaryIcon="play" onPrimary={onPlay} />
    </>
  );
}

function QuestComplete({ onWorld }: { onWorld: () => void }) {
  return (
    <>
      <div className="prototype-warning" role="note"><Icon name="spark" /><strong>UI prototype state</strong><span>This view demonstrates post-persistence feedback. This dashboard has not written completion data.</span></div>
      <div className="completion-hero surface"><div className="completion-emblem"><span><Icon name="check" /></span></div><div><p className="eyebrow">Quest complete</p><h2>Enemy Targeting is alive.</h2><p>The red enemy now detects the nearby player, chases directly, and returns to idle when the player retreats.</p></div><span className="completion-stamp">Verified by Forge + creator</span></div>
      <div className="dashboard-grid complete-grid">
        <main className="main-column"><WorldMap completed /><section className="chronicle-preview surface"><div className="section-heading"><div><p className="eyebrow">Chronicle preview</p><h2>A concise record of the change</h2></div><span className="state-pill success">Persistence preview</span></div><div className="chronicle-row"><span className="chronicle-date">13<br/><small>JUL</small></span><div><h3>Enemy Targeting completed</h3><p>Three approved files changed. Automated checks passed. Creator confirmed IDLE → CHASING → IDLE.</p><div className="proof-badges"><span><Icon name="check" /> Automated proof</span><span><Icon name="check" /> Creator proof</span><span><Icon name="check" /> Scope clean</span></div></div></div></section></main>
        <div className="side-column"><ForgeCompanion title="The world remembers" tone="success"><p>You confirmed the mechanic in play, and the real CLI workflow can persist that proof before marking the roadmap complete.</p></ForgeCompanion><section className="next-direction surface"><p className="eyebrow">Next direction</p><h2>More of the world is planned</h2><p>Future quests are still design directions. They are not runnable in this prototype yet.</p><span className="planned-tag">Planned · not available</span></section></div>
      </div>
      <ActionDock consequence="Return to the world and inspect the completed quest node." primaryLabel="Return to world" onPrimary={onWorld} />
    </>
  );
}

function PlayConfirmation({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  return <div className="modal-backdrop" role="presentation"><section className="confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><span className="prototype-tag">Prototype handoff</span><div className="modal-icon"><Icon name="play" /></div><p className="eyebrow">After the game closes</p><h2 id="confirm-title">Did you see it work?</h2><p>Confirm only after you saw the enemy change from IDLE to CHASING and back to IDLE.</p><div className="modal-actions"><button className="button secondary" onClick={onClose} type="button">It did not work</button><button className="button primary" onClick={onConfirm} type="button">I saw it work <Icon name="check" /></button></div><small>This prototype does not launch Godot or persist your answer.</small></section></div>;
}

export default function App() {
  // Demo adapter only: these transitions do not call the quest runner or write Forge state.
  const [state, setState] = useState<DashboardState>("world_ready");
  const [currentStage, setCurrentStage] = useState(2);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [navNotice, setNavNotice] = useState("");

  useEffect(() => {
    document.title = `${dashboardStateLabels[state]} · Forge Workshop`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [state]);

  const activeNav = state === "ready_to_play" ? "Proof" : state === "quest_complete" ? "Chronicle" : "World";
  const navigate = (destination: "World" | "Proof" | "Chronicle") => {
    if (destination === "World") setState("world_ready");
    else if (destination === "Proof") setState("ready_to_play");
    else if (state === "quest_complete") setState("quest_complete");
    else setNavNotice("Chronicle becomes meaningful after a quest has been completed.");
  };

  return (
    <div className="app-shell">
      <ProjectHeader active={activeNav} onNavigate={navigate} />
      <div className="blueprint-rule" aria-hidden="true" />
      <div className="demo-ribbon"><span>Interactive UI prototype</span><p>Real Enemy Targeting contracts · mocked dashboard transitions</p></div>
      {navNotice && <button className="nav-notice" onClick={() => setNavNotice("")} type="button">{navNotice}<span>Dismiss</span></button>}
      <div className="page-shell">
        {state === "world_ready" && <WorldReady onReview={() => setState("plan_review")} />}
        {state === "plan_review" && <QuestBrief onBack={() => setState("world_ready")} onBuild={() => setState("implementation_running")} />}
        {state === "implementation_running" && <ImplementationRunning currentStage={currentStage} />}
        {state === "ready_to_play" && <ProofSummary onPlay={() => setShowConfirmation(true)} />}
        {state === "quest_complete" && <QuestComplete onWorld={() => setState("world_ready")} />}
        {state === "blocked" && <WorldReady onReview={() => setState("plan_review")} />}
        {state === "verification_failed" && <ProofSummary onPlay={() => setShowConfirmation(true)} />}
      </div>
      <PrototypeSwitcher state={state} currentStage={currentStage} onState={setState} onStage={setCurrentStage} />
      {showConfirmation && <PlayConfirmation onClose={() => setShowConfirmation(false)} onConfirm={() => { setShowConfirmation(false); setState("quest_complete"); }} />}
    </div>
  );
}
