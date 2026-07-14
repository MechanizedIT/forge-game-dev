import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import {
  approveQuest,
  cancelQuestApproval,
  confirmCreatorResult,
  launchGame,
  loadDashboard,
  resetDemo,
  subscribeToDashboard,
} from "../dashboard/api.js";
import {
  dashboardProgressStages,
  formatElapsedTime,
  type CreatorConfirmation,
  type DashboardSnapshot,
  type DemoResetAction,
} from "../dashboard/shared.js";
import {
  approvedFiles,
  buildSampleWorkflowPresentation,
  playInstruction,
  type SampleRoadmapNode,
} from "./sample-workflow.js";
import { viewForLaunchChoice, type LaunchChoice } from "./state.js";

type CompanionState = "ready" | "focused" | "thinking" | "complete";
type IconName = "arrow" | "back" | "check" | "code" | "file" | "idea" | "play" | "spark";
type AppView = "launchpad" | "sample" | "create_placeholder";
type SampleView = "world" | "quest" | "build" | "playtest" | "proof" | "complete";

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    back: <path d="m11 5-7 7 7 7M4 12h16" />,
    check: <path d="m5 12 4 4L19 6" />,
    code: <path d="m8 9-4 3 4 3m8-6 4 3-4 3m-2-9-4 12" />,
    file: <path d="M6 3h8l4 4v14H6zM14 3v5h5" />,
    idea: <path d="M9 18h6m-5 3h4m3-12a5 5 0 0 1-2 4c-.7.6-1 1.2-1 2h-4c0-.8-.3-1.4-1-2a5 5 0 1 1 8-4Z" />,
    play: <path d="m9 7 8 5-8 5z" />,
    spark: <path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5z" />,
  };
  return <svg aria-hidden="true" className="v2-icon" viewBox="0 0 24 24">{paths[name]}</svg>;
}

function CompanionCore({ state, compact = false }: { state: CompanionState; compact?: boolean }) {
  return <span aria-label={`Forge Companion ${state}`} className={`companion-core companion-${state}${compact ? " companion-compact" : ""}`} role="img"><span className="companion-orbit orbit-a" /><span className="companion-orbit orbit-b" /><span className="companion-center" /></span>;
}

function ForgeBrand({ state = "ready" }: { state?: CompanionState }) {
  return <div className="forge-brand"><CompanionCore compact state={state} /><div><strong>Forge</strong><span>Living Game Workshop</span></div></div>;
}

function SamplePathPreview() {
  return <div className="launch-miniature sample-miniature" aria-hidden="true"><div className="mini-toolbar"><span /> SAMPLE_GAME.EXE <strong>VERIFIED</strong></div><div className="mini-game-stage"><span className="mini-arena-ring" /><span className="mini-player"><i />PLAYER</span><span className="mini-enemy"><i />IDLE</span></div><div className="mini-quest-rail"><span className="mini-node mini-done"><Icon name="check" /></span><span className="mini-line mini-line-done" /><span className="mini-node mini-active"><i /></span><span className="mini-line mini-line-future" /><span className="mini-node mini-future"><i /></span><em>Movement</em><strong>Enemy Targeting</strong><em>Game Feel</em></div></div>;
}

function CreatePathPreview() {
  return <div className="launch-miniature create-miniature" aria-hidden="true"><div className="idea-source"><span><Icon name="idea" /> YOUR IDEA</span><strong>“A quick arena game where movement feels great.”</strong></div><span className="idea-transform"><Icon name="arrow" /></span><div className="blueprint-roadmap"><span><i>01</i> Move</span><b /><span><i>02</i> Encounter</span><b /><span><i>03</i> Playable</span></div><div className="blueprint-status"><span /> IDEA → PLAYABLE ROADMAP</div></div>;
}

function LaunchChoiceCard({ accent, description, label, onChoose, title }: { accent: "ember" | "violet"; description: string; label: string; onChoose: () => void; title: string }) {
  return <article className={`launch-choice launch-${accent}`}>{accent === "ember" ? <SamplePathPreview /> : <CreatePathPreview />}<div className="choice-content"><span className="choice-kicker">{accent === "ember" ? "Verified path" : "Creative path"}</span><h2>{title}</h2><p>{description}</p><button className={`v2-button button-${accent}`} onClick={onChoose} type="button">{label}<Icon name="arrow" /></button></div></article>;
}

function Launchpad({ onChoose }: { onChoose: (choice: LaunchChoice) => void }) {
  return <main className="launchpad"><header className="launch-header"><ForgeBrand /><span className="preview-chip"><span /> v0.2 preview</span></header><section className="launch-hero" aria-labelledby="launch-title"><div className="launch-hero-core"><CompanionCore state="ready" /></div><div><p className="v2-eyebrow">Your game starts with direction</p><h1 id="launch-title">What would you like to build?</h1><p className="launch-summary">Forge turns an idea into a playable roadmap, keeps Codex focused on one quest, verifies the result, and remembers what changed.</p></div></section><section className="launch-choices" aria-label="Choose a Forge experience"><LaunchChoiceCard accent="ember" description="Enter the real Sample Game workspace, review its prepared quest, and follow Codex from approval to playable proof." label="Explore sample world" onChoose={() => onChoose("explore_sample")} title="Explore the sample game" /><LaunchChoiceCard accent="violet" description="Describe a small 2D idea and see Forge shape it into a focused Godot project and quest roadmap." label="Start a new game" onChoose={() => onChoose("create_game")} title="Create a new game" /></section><footer className="launch-footer"><span><Icon name="code" /> Real Codex workflow in the sample</span><span>Godot 4 · Local workspace · Creator approval</span></footer></main>;
}

function WorkshopHeader({ snapshot, active, onBack, onNavigate }: { snapshot: DashboardSnapshot; active: "World" | "Proof" | "Chronicle"; onBack: () => void; onNavigate: (view: "World" | "Proof" | "Chronicle") => void }) {
  const presentation = buildSampleWorkflowPresentation(snapshot);
  return <header className="world-header workflow-header"><button className="back-button" onClick={onBack} type="button"><Icon name="back" /> Launchpad</button><ForgeBrand state={snapshot.completion ? "complete" : snapshot.phase === "implementation_running" ? "thinking" : "focused"} /><nav aria-label="Sample project navigation" className="workshop-nav">{(["World", "Proof", "Chronicle"] as const).map((item) => { const enabled = item === "World" || (item === "Proof" ? presentation.proofAvailable : presentation.chronicleAvailable); return <button aria-current={active === item ? "page" : undefined} disabled={!enabled} key={item} onClick={() => onNavigate(item)} type="button">{item}{!enabled && <span>later</span>}</button>; })}</nav><div className="world-project-title"><div><span className="v2-eyebrow">Project World</span><h1>{snapshot.project.name}</h1></div><span className={`workspace-chip workspace-${presentation.workspaceState}`}>{presentation.workspaceLabel}</span><span className="engine-chip">{snapshot.project.engine}</span></div></header>;
}

function GamePreview({ complete }: { complete: boolean }) {
  return <div className={`game-preview${complete ? " preview-complete" : ""}`} aria-label={`Sample Game current state: enemy ${complete ? "targeting" : "idle"}`}><div className="preview-window-bar"><span><i /> REAL WORKSPACE</span><strong>SAMPLE GAME · ARENA 01</strong></div><div className="preview-stage"><span className="stage-horizon" /><span className="stage-boundary boundary-one" /><span className="stage-boundary boundary-two" /><span className="stage-light" /><span className="stage-player"><i /><b />PLAYER</span><span className="stage-enemy"><em>ENEMY · {complete ? "CHASING" : "IDLE"}</em><i /><b /></span><span className="stage-scan"><i /> {complete ? "TARGET LOCK" : "NO TARGET"}</span></div><div className="preview-caption"><span><i /> Playable workspace online</span><strong>Move with WASD or arrow keys</strong></div></div>;
}

function QuestModule({ node, children }: { node: SampleRoadmapNode; children?: ReactNode }) {
  const active = node.state === "available" || node.state === "active";
  const label = node.state === "active" ? "Building now" : node.state === "available" ? "Recommended · Available" : node.state === "completed" ? "Completed" : node.state === "planned" ? "Planned direction" : "Future region";
  return <article aria-current={active ? "step" : undefined} className={`quest-module module-${node.state}${active ? " module-active" : ""}`} data-authoritative={node.authoritative}><div className="module-region">{node.region}</div><div className="module-status"><span className="module-status-light" />{label}</div><div className="module-marker">{node.state === "completed" ? <Icon name="check" /> : <span />}</div><h3>{node.title}</h3><p>{node.summary}</p>{children}</article>;
}

function RoadmapConnector({ kind }: { kind: "current" | "complete" | "planned" }) {
  return <div className={`roadmap-connector connector-${kind}`} aria-hidden="true">{kind === "current" && <><span className="online-segment" /><span className="available-segment" /></>}{kind === "complete" && <span className="complete-segment" />}{kind === "planned" && <span className="planned-segment" />}<i /></div>;
}

function WorldCompanion({ complete }: { complete: boolean }) {
  return <aside className="world-companion" aria-label="Forge Companion guidance"><CompanionCore compact state={complete ? "complete" : "focused"} /><p>{complete ? "The encounter is verified, creator-confirmed, and saved. The world remembers what you built." : "Your player can move, but the enemy does not react yet. This quest creates the first real encounter."}</p></aside>;
}

function IdeaDock({ complete = false }: { complete?: boolean }) {
  const [idea, setIdea] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  return <section className="idea-dock" aria-labelledby="idea-title"><span className="idea-dock-icon"><Icon name="idea" /></span><div className="idea-dock-label"><span className="v2-eyebrow">Creator input · preview only</span><h2 id="idea-title">{complete ? "What should we build next?" : "What would you like to add to your game?"}</h2>{notice && <small role="status">{notice}</small>}</div><label className="idea-input"><span className="sr-only">Describe a future game idea</span><input onChange={(event) => setIdea(event.target.value)} placeholder="Maybe the enemy drops something useful…" type="text" value={idea} /><button aria-label="Preview idea capture" disabled={!idea.trim()} onClick={() => setNotice("Idea capture is a local preview. It does not create a quest or call GPT yet.")} type="button"><Icon name="arrow" /></button></label></section>;
}

function SampleWorld({ snapshot, onReview, onReset }: { snapshot: DashboardSnapshot; onReview: () => void; onReset: () => void }) {
  const presentation = buildSampleWorkflowPresentation(snapshot);
  const [movement, targeting, gameFeel, polish] = presentation.nodes;
  const complete = snapshot.completion !== null;
  return <><section className="world-intro"><p className="v2-eyebrow">World 01 · Assembly Bay</p><h2>Your game is taking shape.</h2><p>{complete ? "The first encounter is online, verified, and persisted." : "One playable system is online. The first real encounter is ready to build."}</p></section>{snapshot.notice && <p className="workflow-notice" role="status">{snapshot.notice}</p>}<section className="world-workbench" aria-label="Real Sample Game project world"><aside className="project-snapshot"><GamePreview complete={complete} /><div className="playable-copy"><span className="v2-eyebrow">Current playable state · real workspace</span><h2>{complete ? "Movement and targeting are online." : "Movement works. The enemy is waiting."}</h2><p>{presentation.currentPlayableState}</p><div className="playable-tags"><span>Movement verified</span><span>{complete ? "Targeting verified" : "Enemy idle"}</span></div></div></aside><section className="roadmap-world" aria-labelledby="roadmap-title"><div className="roadmap-heading"><div><span className="v2-eyebrow">Game assembly roadmap</span><h2 id="roadmap-title">From foundation to playable polish</h2></div><span className="roadmap-progress"><strong>{complete ? "2" : "1"}</strong> of 4 systems online</span></div><div className="roadmap-sequence"><QuestModule node={movement!} /><RoadmapConnector kind={complete ? "complete" : "current"} /><div className="active-quest-stack"><QuestModule node={targeting!}><button className={`v2-button ${complete ? "button-mint" : "button-ember"} module-action`} onClick={onReview} type="button">{complete ? "View completed proof" : "Review Enemy Targeting"}<Icon name="arrow" /></button></QuestModule><WorldCompanion complete={complete} /><button className="idea-port" onClick={() => document.querySelector<HTMLInputElement>(".idea-input input")?.focus()} type="button"><span><Icon name="idea" /></span><strong>+ Add an idea</strong><em>Preview-only possibility</em></button></div><RoadmapConnector kind="planned" /><QuestModule node={gameFeel!} /><RoadmapConnector kind="planned" /><QuestModule node={polish!} /></div></section></section><div className="world-actions"><span>{presentation.workspaceLabel}. {presentation.chronicleAvailable ? "Chronicle is available." : "Chronicle unlocks only after creator-confirmed completion."}</span>{complete && presentation.resetEligible && <button className="v2-button button-quiet" onClick={onReset} type="button">Start Fresh Demo</button>}</div><IdeaDock complete={complete} /></>;
}

function TechnicalDetails({ label, children }: { label: string; children: ReactNode }) {
  return <details className="v2-details"><summary><Icon name="code" /> {label}</summary><div>{children}</div></details>;
}

function QuestForge({ snapshot, busy, onApprove, onCancel, onBack }: { snapshot: DashboardSnapshot; busy: boolean; onApprove: () => void; onCancel: () => void; onBack: () => void }) {
  const files = approvedFiles(snapshot.plan);
  const commands = snapshot.quest.verification.filter((item) => item.kind === "command");
  return <main className="workflow-page quest-forge"><div className="workflow-title"><button className="back-button" onClick={onBack} type="button"><Icon name="back" /> Project World</button><span className="v2-eyebrow">Quest Forge · approval required</span><h1>{snapshot.quest.title}</h1><p>Nothing changes until you approve this exact prepared plan.</p></div><section className="quest-three"><article><span>01</span><p className="v2-eyebrow">What will change?</p><h2>{snapshot.quest.playerOutcome}</h2><p>{snapshot.quest.baselineBehavior}</p><div className="change-arrow"><Icon name="arrow" /> {snapshot.quest.expectedBehavior}</div></article><article><span>02</span><p className="v2-eyebrow">What may Codex change?</p><h2>Exactly {files.length} approved files</h2><ul>{files.map((file) => <li key={file}><Icon name="file" /><code>{file}</code></li>)}</ul><strong className="scope-lock"><Icon name="check" /> Scope locked for this run</strong></article><article><span>03</span><p className="v2-eyebrow">How will we prove it?</p><h2>Automated checks, then your eyes</h2><p>{commands.length} approved commands inspect the diff and game behavior.</p><p>{playInstruction(snapshot.quest)}</p></article></section><aside className="forge-callout"><CompanionCore compact state="focused" /><div><strong>A small, visible change</strong><p>{snapshot.quest.whyItMatters} Forge compares the real diff and verification evidence with this exact plan.</p></div></aside><TechnicalDetails label="Exact plan, criteria, assumptions, exclusions, and commands"><div className="technical-grid"><section><h3>Plan · revision {snapshot.plan.revision}</h3><ol>{snapshot.plan.steps.map((step) => <li key={step.id}><strong>{step.id}</strong> {step.description}</li>)}</ol></section><section><h3>Acceptance criteria</h3>{snapshot.quest.acceptanceCriteria.map((criterion) => <p key={criterion.id}><code>{criterion.id}</code> {criterion.text}</p>)}</section><section><h3>Assumptions</h3><ul>{snapshot.plan.assumptions.map((item) => <li key={item}>{item}</li>)}</ul><h3>Excluded</h3><ul>{snapshot.plan.excluded.map((item) => <li key={item}>{item}</li>)}</ul></section><section><h3>Commands</h3>{commands.map((item) => <code className="command-line" key={item.id}>{item.argv.join(" ")}</code>)}</section></div></TechnicalDetails><footer className="workflow-dock"><div><span>Creator approval boundary</span><strong>Codex may change only the {files.length} files shown above.</strong></div><button className="v2-button button-quiet" disabled={busy} onClick={onCancel} type="button">Not now</button><button className="v2-button button-ember" disabled={busy} onClick={onApprove} type="button">{busy ? "Starting…" : "Approve & build with Codex"}<Icon name="spark" /></button></footer></main>;
}

const progressExplanations = ["Reading only the approved scene and scripts.", "Turning the approved plan into a focused Codex work packet.", "Codex is applying the bounded Enemy Targeting change.", "Forge is checking the real diff and approved commands.", "Forge is mapping evidence back to every acceptance criterion."] as const;

function useElapsedTime(startedAt: string | null): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { if (!startedAt) return; const timer = window.setInterval(() => setNow(Date.now()), 1_000); return () => window.clearInterval(timer); }, [startedAt]);
  return startedAt ? formatElapsedTime((now - Date.parse(startedAt)) / 1_000) : "00:00";
}

function ActiveBuild({ snapshot }: { snapshot: DashboardSnapshot }) {
  const presentation = buildSampleWorkflowPresentation(snapshot);
  const elapsed = useElapsedTime(snapshot.runStartedAt);
  const currentIndex = Math.max(0, dashboardProgressStages.indexOf(presentation.currentStage));
  const files = approvedFiles(snapshot.plan);
  return <main className="workflow-page active-build"><div className="workflow-title build-title"><span className="live-connection"><i /> Live run through the official Codex SDK</span><p className="v2-eyebrow">Enemy Targeting · powered module under construction</p><h1>{presentation.currentStage}</h1><p>{progressExplanations[currentIndex]} The approved boundary stays locked.</p></div><section className="build-console"><div className="build-module"><CompanionCore state="thinking" /><div><span>CONNECTED · RUNNING</span><strong>{presentation.runLabel ?? "Run ID appears after the artifact is finalized"}</strong></div><time>{elapsed}</time></div><ol className="build-stages">{dashboardProgressStages.map((stage, index) => { const status = index < currentIndex ? "complete" : index === currentIndex ? "current" : "pending"; return <li className={status} key={stage}><span>{status === "complete" ? <Icon name="check" /> : index + 1}</span><div><small>{status === "complete" ? "Done" : status === "current" ? "In progress" : "Waiting"}</small><h2>{stage}</h2>{status === "current" && <p>{progressExplanations[index]}</p>}</div></li>; })}</ol><aside className="build-reassurance"><strong>Codex work can take several minutes.</strong><p>The elapsed timer is real. Forge will stop safely if scope or verification fails; there are no percentages or invented estimates.</p></aside></section><TechnicalDetails label="Locked files and optional technical activity"><p>Approved files:</p><ul className="technical-files">{files.map((file) => <li key={file}><code>{file}</code></li>)}</ul>{snapshot.technicalEvents.length ? snapshot.technicalEvents.map((event, index) => <pre key={index}>{JSON.stringify(event)}</pre>) : <p>Sanitized SDK events will appear after the run artifact is finalized.</p>}</TechnicalDetails><footer className="workflow-dock"><div><span>Current stage</span><strong>{presentation.currentStage} · {elapsed}</strong></div><span className="dock-status"><i /> Run in progress</span></footer></main>;
}

function ProofDetails({ snapshot }: { snapshot: DashboardSnapshot }) {
  const files = snapshot.handoff?.changes.map((change) => change.path) ?? [];
  return <TechnicalDetails label="Detailed criteria, commands, and sanitized events"><div className="technical-grid"><section><h3>Acceptance evidence</h3>{snapshot.review?.criteria.map((criterion) => <p key={criterion.criterionId}><code>{criterion.criterionId}</code> <strong>{criterion.result.replaceAll("_", " ")}</strong><br />{criterion.evidence.join(" ")}</p>)}</section><section><h3>Changed files</h3><ul>{files.map((file) => <li key={file}><code>{file}</code></li>)}</ul><p>Unexpected files: {snapshot.review?.scope.unexpectedFiles.length ?? 0}</p></section><section><h3>Verification runs</h3>{snapshot.handoff?.verificationRuns.map((run) => <div key={run.verificationId}><code className="command-line">{run.command.join(" ")}</code><p>Exit {run.exitCode}: {run.evidence}</p></div>)}</section><section><h3>Sanitized SDK activity</h3>{snapshot.technicalEvents.map((event, index) => <pre key={index}>{JSON.stringify(event)}</pre>)}</section></div></TechnicalDetails>;
}

function PlaytestGate({ snapshot, busy, onPlay, onConfirm }: { snapshot: DashboardSnapshot; busy: boolean; onPlay: () => void; onConfirm: (response: CreatorConfirmation) => void }) {
  const files = snapshot.handoff?.changes.map((change) => change.path) ?? [];
  const awaiting = snapshot.phase === "awaiting_confirmation";
  return <main className="workflow-page playtest-gate"><div className="playtest-hero"><CompanionCore state="focused" /><div><p className="v2-eyebrow">Automated proof complete · creator proof pending</p><h1>Codex finished. The code passed. Now the game needs you.</h1><p>Forge verified the real diff and approved commands. Completion still requires what you personally observe.</p></div></div>{snapshot.error && <p className="workflow-error" role="alert">{snapshot.error}</p>}<section className="proof-strip"><article><span><Icon name="check" /></span><small>Automated checks</small><strong>Passed</strong></article><article><span><Icon name="file" /></span><small>Approved files changed</small><strong>{files.length}</strong></article><article><span><Icon name="check" /></span><small>Unexpected files</small><strong>{snapshot.review?.scope.unexpectedFiles.length ?? 0}</strong></article><article className="pending"><span><Icon name="play" /></span><small>Creator confirmation</small><strong>Pending</strong></article></section><section className="playtest-layout"><article className="play-instructions"><p className="v2-eyebrow">Your five-step playtest</p><h2>See the encounter for yourself</h2><ol><li><span>1</span>Move with WASD or arrow keys.</li><li><span>2</span>Approach the enemy.</li><li><span>3</span>Observe <code>IDLE → CHASING</code>.</li><li><span>4</span>Retreat and observe <code>CHASING → IDLE</code>.</li><li><span>5</span>Close the game when finished.</li></ol><button className="v2-button button-ember play-action" disabled={busy || awaiting} onClick={onPlay} type="button">{snapshot.phase === "launching_game" || busy ? "Godot is running…" : "Play the result"}<Icon name="play" /></button></article><aside className="forge-callout play-callout"><CompanionCore compact state="focused" /><div><strong>Your eyes are the final proof</strong><p>Game exit is never treated as success. Forge waits for one of your three exact choices.</p></div></aside></section><ProofDetails snapshot={snapshot} />{awaiting && <ConfirmationDialog busy={busy} onConfirm={onConfirm} />}</main>;
}

function ConfirmationDialog({ busy, onConfirm }: { busy: boolean; onConfirm: (response: CreatorConfirmation) => void }) {
  return <div className="v2-modal-backdrop"><section aria-labelledby="confirmation-title" aria-modal="true" className="v2-modal" role="dialog"><span className="live-connection"><i /> Game closed · awaiting your observation</span><CompanionCore state="focused" /><p className="v2-eyebrow">Creator confirmation gate</p><h2 id="confirmation-title">Did you see it work?</h2><p>Confirm only if you personally saw the enemy change from IDLE to CHASING and back to IDLE.</p><div className="confirmation-actions"><button className="v2-button button-quiet" disabled={busy} onClick={() => onConfirm("CANCEL")} type="button">Cancel / not ready</button><button className="v2-button button-quiet" disabled={busy} onClick={() => onConfirm("IT DID NOT WORK")} type="button">It did not work</button><button className="v2-button button-mint" disabled={busy} onClick={() => onConfirm("I SAW IT WORK")} type="button">I saw it work<Icon name="check" /></button></div><small>Forge records only the exact choice you make here.</small></section></div>;
}

function QuestComplete({ snapshot, onWorld, onReset }: { snapshot: DashboardSnapshot; onWorld: () => void; onReset: () => void }) {
  const completion = snapshot.completion;
  if (!completion) return null;
  const completedAt = new Date(completion.completedAt);
  return <main className="workflow-page quest-complete"><section className="complete-hero"><CompanionCore state="complete" /><div><p className="v2-eyebrow">Quest Complete · verified and persisted</p><h1>{snapshot.quest.title} is online.</h1><p>{completion.summary}</p></div><span><Icon name="check" /> Forge + creator proof</span></section><section className="completed-roadmap"><span className="complete-node"><Icon name="check" /> Player Movement</span><i /><span className="complete-node primary"><Icon name="check" /> Enemy Targeting</span><b /><span className="future-node">Game Feel · planned</span></section><section className="chronicle-record"><div className="chronicle-date"><strong>{String(completedAt.getDate()).padStart(2, "0")}</strong><span>{completedAt.toLocaleString("en", { month: "short" }).toUpperCase()}</span></div><div><p className="v2-eyebrow">Real Chronicle record · persisted workspace</p><h2>{snapshot.quest.title} completed</h2><p>{completion.summary}</p><div className="chronicle-badges"><span><Icon name="check" /> Automated proof</span><span><Icon name="check" /> Creator proof</span><span><Icon name="check" /> Scope clean</span></div><small>Run {completion.runId} · {completedAt.toLocaleString()}</small></div></section><ProofDetails snapshot={snapshot} /><div className="next-build"><CompanionCore compact state="complete" /><div><p className="v2-eyebrow">The world remembers</p><h2>What should we build next?</h2><p>The idea field remains a local preview until guided planning is connected.</p></div></div><IdeaDock complete /><footer className="workflow-dock"><div><span>Completion persisted</span><strong>Reloading Forge restores this roadmap and Chronicle.</strong></div><button className="v2-button button-quiet" onClick={onReset} type="button">Start Fresh Demo</button><button className="v2-button button-mint" onClick={onWorld} type="button">Return to World<Icon name="arrow" /></button></footer></main>;
}

function FailureState({ snapshot, onWorld }: { snapshot: DashboardSnapshot; onWorld: () => void }) {
  return <main className="workflow-page failure-state" role="alert"><CompanionCore state="focused" /><p className="v2-eyebrow">Forge stopped safely</p><h1>{snapshot.phase === "verification_failed" ? "The change did not pass verification." : "Forge needs attention before continuing."}</h1><p>{snapshot.error ?? "The protected workflow could not continue."}</p>{snapshot.review?.concerns.map((concern) => <p key={concern}>{concern}</p>)}<ProofDetails snapshot={snapshot} /><button className="v2-button button-quiet" onClick={onWorld} type="button">Return to Project World</button><small>The quest remains incomplete. Reset requires separate explicit confirmation.</small></main>;
}

function ResetDialog({ busy, onReset }: { busy: boolean; onReset: (action: DemoResetAction) => void }) {
  return <div className="v2-modal-backdrop"><section aria-labelledby="reset-title" aria-modal="true" className="v2-modal reset-modal" role="dialog"><p className="v2-eyebrow">Explicit reset · generated demo workspace only</p><h2 id="reset-title">Start a fresh Sample Game demo?</h2><p>This removes saved quest progress and gameplay changes from Forge’s generated demo workspace. The repository, immutable fixture, and verified Godot cache remain untouched.</p><code>npm run demo:reset -- confirm-reset</code><div className="confirmation-actions"><button className="v2-button button-quiet" disabled={busy} onClick={() => onReset("CANCEL")} type="button">Cancel and preserve progress</button><button className="v2-button button-ember" disabled={busy} onClick={() => onReset("CONFIRM RESET")} type="button">Reset and start fresh</button></div></section></div>;
}

function CreatePlaceholder({ onBack }: { onBack: () => void }) {
  return <main className="placeholder-screen"><header className="placeholder-header"><button className="back-button" onClick={onBack} type="button"><Icon name="back" /> Launchpad</button><ForgeBrand state="thinking" /></header><section className="placeholder-content"><CompanionCore state="thinking" /><p className="v2-eyebrow">Upcoming v0.2 capability</p><h1>Guided project creation is next.</h1><p>Soon, you’ll describe a small 2D game and Forge will shape it into a Top-down arena project, first playable milestone, and bounded quest roadmap.</p><div className="placeholder-boundary"><Icon name="spark" /><div><strong>Honest preview boundary</strong><span>No GPT call, project generation, or artifact creation is active in this shell.</span></div></div><button className="v2-button button-violet" onClick={onBack} type="button">Return to Launchpad<Icon name="back" /></button></section></main>;
}

export default function App() {
  const [view, setView] = useState<AppView>("launchpad");
  const [sampleView, setSampleView] = useState<SampleView>("world");
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);
  const selectedRef = useRef(false);

  const refresh = useCallback(async () => { try { setSnapshot(await loadDashboard()); setError(null); } catch (nextError) { setError(nextError instanceof Error ? nextError.message : String(nextError)); } }, []);
  useEffect(() => { return subscribeToDashboard((event) => { if (event.type === "progress") setSnapshot((current) => current ? { ...current, phase: "implementation_running", progress: event.progress } : current); else void refresh(); }, () => {}); }, [refresh]);
  useEffect(() => { if (view === "sample" && !selectedRef.current) { selectedRef.current = true; void refresh(); } }, [refresh, view]);
  useEffect(() => { if (!snapshot || view !== "sample") return; if (snapshot.phase === "implementation_running") setSampleView("build"); else if (["ready_to_play", "launching_game", "awaiting_confirmation"].includes(snapshot.phase)) setSampleView("playtest"); else if (snapshot.phase === "quest_complete") setSampleView("complete"); }, [snapshot?.phase, view]);
  useEffect(() => { document.title = view === "sample" ? `${snapshot?.quest.title ?? "Sample Game"} · Forge Project World` : "Forge · Living Game Workshop"; window.setTimeout(() => window.scrollTo({ left: 0, top: 0 }), 50); }, [sampleView, snapshot?.quest.title, view]);

  const choose = (choice: LaunchChoice) => { const selected = viewForLaunchChoice(choice); setView(selected === "sample_world" ? "sample" : "create_placeholder"); setSampleView("world"); };
  const run = async () => { if (busy) return; setBusy(true); try { await approveQuest(); await refresh(); } catch (nextError) { setError(nextError instanceof Error ? nextError.message : String(nextError)); } finally { setBusy(false); } };
  const cancelApproval = async () => { if (busy) return; setBusy(true); try { await cancelQuestApproval(); await refresh(); setSampleView("world"); } catch (nextError) { setError(nextError instanceof Error ? nextError.message : String(nextError)); } finally { setBusy(false); } };
  const play = async () => { if (busy || !snapshot) return; setBusy(true); setSnapshot({ ...snapshot, phase: "launching_game", notice: "Godot is running. Return after the game closes." }); try { setSnapshot(await launchGame()); } catch (nextError) { setError(nextError instanceof Error ? nextError.message : String(nextError)); await refresh(); } finally { setBusy(false); } };
  const confirm = async (response: CreatorConfirmation) => { if (busy) return; setBusy(true); try { const next = await confirmCreatorResult(response); setSnapshot(next); setSampleView(next.phase === "quest_complete" ? "complete" : "playtest"); } catch (nextError) { setError(nextError instanceof Error ? nextError.message : String(nextError)); await refresh(); } finally { setBusy(false); } };
  const performReset = async (action: DemoResetAction) => { if (busy) return; setBusy(true); try { setSnapshot(await resetDemo(action)); setShowReset(false); setSampleView("world"); } catch (nextError) { setError(nextError instanceof Error ? nextError.message : String(nextError)); } finally { setBusy(false); } };

  if (view === "launchpad") return <Launchpad onChoose={choose} />;
  if (view === "create_placeholder") return <CreatePlaceholder onBack={() => setView("launchpad")} />;
  if (!snapshot) return <main className="v2-loading"><CompanionCore state="thinking" /><h1>Opening the real Sample Game workspace</h1><p>{error ?? "Loading validated quest, roadmap, and completion artifacts…"}</p></main>;

  const activeNav = sampleView === "proof" || sampleView === "playtest" ? "Proof" : sampleView === "complete" ? "Chronicle" : "World";
  const presentation = buildSampleWorkflowPresentation(snapshot);
  const navigate = (destination: "World" | "Proof" | "Chronicle") => { if (destination === "World") setSampleView("world"); else if (destination === "Proof" && presentation.proofAvailable) setSampleView(snapshot.phase === "ready_to_play" ? "playtest" : "proof"); else if (destination === "Chronicle" && presentation.chronicleAvailable) setSampleView("complete"); };
  const workflow = snapshot.phase === "verification_failed" || snapshot.phase === "blocked" ? <FailureState onWorld={() => setSampleView("world")} snapshot={snapshot} /> : sampleView === "quest" ? <QuestForge busy={busy} onApprove={() => void run()} onBack={() => setSampleView("world")} onCancel={() => void cancelApproval()} snapshot={snapshot} /> : sampleView === "build" ? <ActiveBuild snapshot={snapshot} /> : sampleView === "playtest" ? <PlaytestGate busy={busy} onConfirm={(response) => void confirm(response)} onPlay={() => void play()} snapshot={snapshot} /> : sampleView === "proof" ? <main className="workflow-page proof-page"><div className="workflow-title"><p className="v2-eyebrow">Real automated proof</p><h1>Enemy Targeting evidence</h1><p>The saved review, changed-file boundary, verification commands, and sanitized SDK activity.</p></div><ProofDetails snapshot={snapshot} /></main> : sampleView === "complete" ? <QuestComplete onReset={() => setShowReset(true)} onWorld={() => setSampleView("world")} snapshot={snapshot} /> : <SampleWorld onReset={() => setShowReset(true)} onReview={() => setSampleView(snapshot.completion ? "proof" : "quest")} snapshot={snapshot} />;

  return <main className="project-world"><WorkshopHeader active={activeNav} onBack={() => setView("launchpad")} onNavigate={navigate} snapshot={snapshot} />{error && <button className="workflow-error dismissible" onClick={() => setError(null)} type="button">{error}<span>Dismiss</span></button>}{workflow}{showReset && <ResetDialog busy={busy} onReset={(action) => void performReset(action)} />}</main>;
}
