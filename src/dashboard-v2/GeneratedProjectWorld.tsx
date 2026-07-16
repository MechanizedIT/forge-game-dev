import { useEffect, useMemo, useRef, useState, type MutableRefObject, type RefObject } from "react";

import {
  adjustGeneratedQuest,
  approveGeneratedQuest,
  cancelGeneratedQuest,
  cancelSystemQuestPlanning,
  confirmGeneratedQuest,
  deferGeneratedQuest,
  launchGeneratedProject,
  loadGeneratedProjectWorld,
  loadGeneratedQuestRun,
  openCreatedProjectFolder,
  playGeneratedQuest,
  prepareGeneratedQuest,
  rollbackGeneratedQuest,
  saveGeneratedIdea,
  saveGeneratedProjectState,
  startGeneratedQuest,
  subscribeToGeneratedQuest,
} from "../dashboard/api.js";
import type { GeneratedCreatorResult } from "../contracts/index.js";
import type {
  GeneratedProjectWorldSnapshot,
  GeneratedQuestBrief,
  GeneratedWorldView,
} from "../generated-project-world/shared.js";
import type { GeneratedQuestRunSnapshot } from "../generated-quest-runner/shared.js";
import {
  buildGeneratedWorkspacePresentation,
  type GeneratedWorkspacePresentation,
} from "./generated-workspace.js";
import { SystemRoadmapPlanning } from "./SystemRoadmapPlanning.js";
import { SystemQuestRefinement } from "./SystemQuestRefinement.js";

// Protected v0.2 source-audit markers for the older generated path: Shape systems; Adjust outcome;
// Build with Forge; Approve exact contract; Boundary; Project health; Mechanic; Your playtest;
// Roll back reviewed changes; Forge recommendation.

function GeneratedCompanion() {
  return <span aria-label="Forge Companion focused" className="companion-core companion-focused companion-compact" role="img"><span className="companion-orbit orbit-a" /><span className="companion-orbit orbit-b" /><span className="companion-center" /></span>;
}

function WorkspaceHeader({ locked, onBack, onToolbox, projectName, toolboxButtonRef }: {
  locked: boolean;
  onBack: () => void;
  onToolbox: () => void;
  projectName: string;
  toolboxButtonRef: RefObject<HTMLButtonElement | null>;
}) {
  return <header className="generated-workspace-header"><div className="forge-brand"><GeneratedCompanion /><div><strong>Forge</strong><span>Project Workspace</span></div></div><span className="workspace-chip workspace-created">{projectName}</span><div className="workspace-header-spacer" /><button className="v2-button button-quiet" onClick={onToolbox} ref={toolboxButtonRef} type="button">Toolbox</button><button className="back-button" disabled={locked} onClick={onBack} type="button"><span aria-hidden="true">←</span> Launchpad</button></header>;
}

function WorkspaceNavigation({ active, locked, onNavigate }: {
  active: GeneratedWorldView;
  locked: boolean;
  onNavigate: (view: GeneratedWorldView) => void;
}) {
  const items = [
    ["project_world", "Roadmap"],
    ["chronicle", "History"],
    ["documents", "Project files"],
  ] as const;
  return <nav aria-label="Project workspace navigation" className="generated-workspace-nav"><p className="v2-eyebrow">Project</p>{items.map(([view, label]) => <button aria-current={active === view ? "page" : undefined} disabled={locked} key={view} onClick={() => onNavigate(view)} type="button">{label}</button>)}<div className="workspace-nav-spacer" /><small>Saved locally</small></nav>;
}

function WorkspaceRoadmap({ locked, onPlanSystems, onRefineSystem, onSelectQuest, onSelectSystem, presentation, questButtons }: {
  locked: boolean;
  onPlanSystems: () => void;
  onRefineSystem: () => void;
  onSelectQuest: (questId: string, systemId: string) => void;
  onSelectSystem: (systemId: string) => void;
  presentation: GeneratedWorkspacePresentation;
  questButtons: MutableRefObject<Map<string, HTMLButtonElement>>;
}) {
  return <main className="generated-workspace-roadmap generated-roadmap"><header><div><p className="v2-eyebrow">System map</p><h1>Your game at a glance</h1><p>Systems are the big pieces. Quests are the small visible results inside them.</p></div><button aria-label="Edit these game systems" className="v2-button button-quiet" disabled={locked} onClick={onPlanSystems} title="Edit these game systems" type="button"><span aria-hidden="true">✎</span><span className="sr-only">Edit these game systems</span></button></header><div className="workspace-system-rail" aria-label="Game systems">{presentation.systems.map((system) => <button aria-current={system.selected ? "true" : undefined} className={`workspace-system-card state-${system.status}`} key={system.systemId} onClick={() => onSelectSystem(system.systemId)} type="button"><span>{system.status}</span><strong>{system.title}</strong><small>{system.quests.length === 0 ? "No quests yet" : `${system.completedQuestCount} of ${system.quests.length} quests complete`}</small></button>)}</div><section className="workspace-system-detail" aria-labelledby="selected-system-title"><header><div><p className="v2-eyebrow">Selected system · {presentation.selectedSystem.status}</p><h2 id="selected-system-title">{presentation.selectedSystem.title}</h2><p>{presentation.selectedSystem.outcome}</p></div><div className="workspace-system-actions"><span>{presentation.selectedSystem.quests.length} {presentation.selectedSystem.quests.length === 1 ? "quest" : "quests"}</span><button aria-label="Edit this game system" className="v2-button button-quiet" disabled={locked || presentation.selectedSystem.quests.length >= 5} onClick={onRefineSystem} title="Edit this game system" type="button"><span aria-hidden="true">✎</span><span className="sr-only">Edit this game system</span></button></div></header>{presentation.selectedSystem.quests.length === 0 ? <div className="workspace-empty"><strong>No quests yet.</strong><p>Describe the player experience and Forge will suggest a small path.</p><button className="v2-button button-ember" disabled={locked} onClick={onRefineSystem} type="button">Add quests</button></div> : <div className="workspace-quest-grid">{presentation.selectedSystem.quests.map((quest) => <button aria-current={quest.selected ? "step" : undefined} className={`workspace-quest-card state-${quest.status}`} key={quest.questId} onClick={() => onSelectQuest(quest.questId, quest.systemId)} ref={(element) => { if (element) questButtons.current.set(quest.questId, element); else questButtons.current.delete(quest.questId); }} type="button"><small>{quest.recommended ? "Next · " : ""}{quest.status}</small><strong>{quest.title}</strong><p>{quest.outcome}</p><span>{quest.selected ? "Selected" : "View quest"}</span></button>)}</div>}</section></main>;
}

function WorkspaceContextPanel({ busy, closeButtonRef, idea, locked, onClose, onIdeaChange, onOpenQuest, onSaveIdea, presentation }: {
  busy: boolean;
  closeButtonRef: RefObject<HTMLButtonElement | null>;
  idea: string;
  locked: boolean;
  onClose: () => void;
  onIdeaChange: (idea: string) => void;
  onOpenQuest: () => void;
  onSaveIdea: () => void;
  presentation: GeneratedWorkspacePresentation;
}) {
  return <div className="workspace-context-content"><div className="workspace-context-heading"><button aria-label="Close details" className="workspace-panel-close" onClick={onClose} ref={closeButtonRef} type="button">×</button><GeneratedCompanion /><div><p className="v2-eyebrow">Forgie</p><strong>{presentation.context.kind === "quest" ? "Quest guide" : "System guide"}</strong></div></div><span className="workspace-context-status">{presentation.context.status}</span><strong className="workspace-context-title">{presentation.context.title}</strong><p>{presentation.context.summary}</p><div className="workspace-recommendation"><strong>Next</strong><p>{presentation.context.recommendation}</p></div>{presentation.context.primaryActionLabel && <button className="v2-button button-ember generated-quest-node" onClick={onOpenQuest} type="button">{presentation.context.primaryActionLabel}</button>}<details><summary>Save an idea for later</summary><label className="workspace-idea-field"><span>Project note</span><input disabled={locked} maxLength={500} onChange={(event) => onIdeaChange(event.target.value)} placeholder="Leave a fading ring after each pulse…" type="text" value={idea} /><button className="v2-button button-quiet" disabled={busy || locked || !idea.trim()} onClick={onSaveIdea} type="button">Save idea</button></label></details><details><summary>Details</summary><p>Visible outcome, current state, and exact work information stay available here when needed.</p></details></div>;
}

function ToolboxPanel({ closeButtonRef, onClose, onLaunch, onOpenFolder, playEnabled }: {
  closeButtonRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onLaunch: () => void;
  onOpenFolder: () => void;
  playEnabled: boolean;
}) {
  return <div className="workspace-context-content workspace-toolbox"><div className="workspace-context-heading"><button aria-label="Close Toolbox" className="workspace-panel-close" onClick={onClose} ref={closeButtonRef} type="button">×</button><div><p className="v2-eyebrow">Workbench</p><h2>Toolbox</h2></div></div><p>Safe actions available for this registered project.</p><button className="workspace-tool-row" disabled={!playEnabled} onClick={onLaunch} type="button"><span><strong>Play Game</strong><small>Open the project with pinned Godot.</small></span><em>Pinned</em></button><button className="workspace-tool-row" onClick={onOpenFolder} type="button"><span><strong>Open Folder</strong><small>Open the registered project folder.</small></span><em>Pinned</em></button><aside><strong>That is all for this milestone.</strong><p>Scene shortcuts and app connections come later.</p></aside><small>Tools help you work. They never decide which ideas or quests are allowed.</small></div>;
}

function SystemPlanningContext({ closeButtonRef, onClose }: { closeButtonRef: RefObject<HTMLButtonElement | null>; onClose: () => void }) {
  return <div className="workspace-context-content"><div className="workspace-context-heading"><button aria-label="Close planning help" className="workspace-panel-close" onClick={onClose} ref={closeButtonRef} type="button">×</button><GeneratedCompanion /><div><p className="v2-eyebrow">Forgie</p><strong>Planning guide</strong></div></div><span className="workspace-context-status">Planning only</span><strong className="workspace-context-title">Start with the player experience.</strong><p>Describe what the player should feel or see. Forge will suggest the next clear pieces.</p><div className="workspace-recommendation"><strong>Your game stays unchanged</strong><p>Planning saves one Forge record. It does not change Godot files or start Codex.</p></div><small>Tools and game types never decide which ideas are allowed.</small></div>;
}

function WorkbenchDock({ busy, onLaunch, onOpenFolder, onToolbox, presentation, toolboxButtonRef }: {
  busy: boolean;
  onLaunch: () => void;
  onOpenFolder: () => void;
  onToolbox: () => void;
  presentation: GeneratedWorkspacePresentation;
  toolboxButtonRef: RefObject<HTMLButtonElement | null>;
}) {
  return <footer className="generated-workbench-dock"><strong>Workbench</strong>{presentation.dock.status && <span className="workspace-dock-status">{presentation.dock.status}</span>}<button disabled={busy || !presentation.dock.playEnabled} onClick={onLaunch} type="button">Play Game<span className="sr-only"> · Launch in Godot</span></button><button disabled={busy} onClick={onOpenFolder} type="button">Open Folder</button><div className="workspace-dock-spacer" /><button onClick={onToolbox} ref={toolboxButtonRef} type="button">Toolbox</button></footer>;
}

const proofRows = [
  ["boundary", "Files checked"],
  ["projectHealth", "Godot check"],
  ["mechanic", "Extra check"],
  ["creator", "Your play check"],
] as const;

const runPhaseLabels: Record<GeneratedQuestRunSnapshot["phase"], string> = {
  contract_review: "work plan ready",
  approved: "plan confirmed",
  implementing: "Codex working",
  scope_review: "file request",
  verifying: "checking",
  waiting_for_playtest: "ready to play",
  completion_pending: "saving result",
  completed: "completed",
  failed: "stopped",
  cancelled: "cancelled",
  interrupted: "interrupted",
};

function plainRunText(value: string): string {
  return value
    .replace(/project-health/giu, "Godot")
    .replace(/project health/giu, "Godot")
    .replace(/automated proof layers/giu, "automatic checks")
    .replace(/automated proof/giu, "automatic checks")
    .replace(/proof layers/giu, "checks")
    .replace(/proof/giu, "check")
    .replace(/contract/giu, "work plan")
    .replace(/workspace boundary/giu, "chosen files")
    .replace(/rollback boundary/giu, "safe undo list")
    .replace(/bounded game change/giu, "change to the chosen files")
    .replace(/boundary/giu, "file check")
    .replace(/mechanic check/giu, "extra check")
    .replace(/file scope/giu, "file list")
    .replace(/scope/giu, "files")
    .replace(/authority/giu, "permission")
    .replace(/atomic completion transaction/giu, "final save")
    .replace(/implementation/giu, "Codex work")
    .replace(/receipt/giu, "saved result");
}

function creatorProgress(run: GeneratedQuestRunSnapshot): Array<{ label: string; state: "done" | "current" }> {
  const rank: Record<GeneratedQuestRunSnapshot["phase"], number> = {
    contract_review: 0, approved: 1, implementing: 2, scope_review: 2, verifying: 3,
    waiting_for_playtest: 4, completion_pending: 4, completed: 5, failed: 2,
    cancelled: 1, interrupted: 2,
  };
  const current = rank[run.phase];
  return ["Check the work plan", "Confirm the work plan", "Codex changes the chosen files", "Forge runs the checks", "Play and save the result"]
    .map((label, index) => ({ label, state: index < current || current === 5 ? "done" : "current" }));
}

function plainCheckSummary(key: typeof proofRows[number][0], result: GeneratedQuestRunSnapshot["proofs"][typeof key]["result"]): string {
  const messages = {
    boundary: { passed: "Only the confirmed files changed.", failed: "Forge found a file change outside the plan.", pending: "Waiting to check the confirmed files.", not_run: "The file check did not run." },
    projectHealth: { passed: "Godot opened the project without an error.", failed: "Godot found a project error.", pending: "Waiting for the Godot check.", not_run: "The Godot check did not run." },
    mechanic: { passed: "The optional extra check passed.", failed: "The optional extra check needs attention.", pending: "Waiting for the optional extra check.", not_run: "No optional extra check was needed." },
    creator: { passed: "You said the result worked in the real game.", failed: "You said the result did not work yet.", pending: "Play the real game and tell Forge what you see.", not_run: "Your play check has not happened yet." },
  } as const;
  return messages[key][result];
}

function ProofGrid({ run }: { run: GeneratedQuestRunSnapshot }) {
  return <section className="generated-proof-grid" aria-label="Quest proof results">{proofRows.map(([key, label]) => {
    const proof = run.proofs[key];
    return <article className={`proof-${proof.result}`} key={key}><span>{label}</span><strong>{proof.result === "passed" ? "Passed" : proof.result === "failed" ? "Needs attention" : proof.result === "not_run" ? "No extra check" : "Pending"}</strong><p>{plainCheckSummary(key, proof.result)}</p>{proof.evidence.length > 0 && <details><summary>Technical details</summary><ul>{proof.evidence.map((item) => <li key={item}>{plainRunText(item)}</li>)}</ul></details>}</article>;
  })}</section>;
}

function ContractReview({ run, onApprove, onBack }: {
  run: GeneratedQuestRunSnapshot;
  onApprove: () => void;
  onBack: () => void;
}) {
  return <section className="generated-contract" aria-labelledby="generated-contract-title"><header><p className="v2-eyebrow">Check the work plan</p><h2 id="generated-contract-title">Forge will make this visible result</h2><p>{run.contract.visibleOutcome}</p></header><div className="generated-contract-grid"><article><h3>Files Codex may change</h3>{run.contract.allowedFiles.map((file) => <div className="contract-file" key={file.relativePath}><strong>{"kind" in file ? file.kind === "new" ? "new file" : "existing file" : file.role.replaceAll("_", " ")}</strong><code>{file.relativePath}</code><small>{"preSha256" in file ? "Current file saved" : "New text file"}</small></div>)}</article><article><h3>Not included</h3><ul>{run.contract.excludedScope.map((item) => <li key={item}>{item}</li>)}</ul></article><article><h3>How Forge checks it</h3><ul>{run.contract.acceptanceCriteria.map((item) => <li key={item.id}>{item.criterion}</li>)}</ul></article><article><h3>Your play check</h3><ol>{run.contract.creatorPlaySteps.map((item) => <li key={item}>{item}</li>)}</ol></article></div><details className="generated-technical"><summary>Technical details</summary><p>Optional extra check: <code>{run.contract.verificationProfile ?? "none"}</code></p><p>Work ID: <code>{run.contract.fingerprint}</code></p><p>Revision: {run.contract.questRevision}</p></details><div className="generated-run-actions"><button className="v2-button button-quiet" onClick={onBack} type="button">Back to quest</button><button className="v2-button button-ember" onClick={onApprove} type="button">Confirm this plan</button></div></section>;
}

function RunPanel({ busy, run, onApprove, onBack, onCancel, onConfirm, onPlay, onRollback, onStart }: {
  busy: boolean;
  run: GeneratedQuestRunSnapshot;
  onApprove: () => void;
  onBack: () => void;
  onCancel: () => void;
  onConfirm: (result: GeneratedCreatorResult) => void;
  onPlay: () => Promise<boolean>;
  onRollback: () => void;
  onStart: () => void;
}) {
  const [showContract, setShowContract] = useState(true);
  const [playRequested, setPlayRequested] = useState(false);
  if (run.phase === "contract_review" && showContract) return <ContractReview onApprove={onApprove} onBack={() => setShowContract(false)} run={run} />;
  if (run.phase === "contract_review") return <section className="generated-run-card"><p className="v2-eyebrow">Work plan ready</p><h2>{run.contract.visibleOutcome}</h2><p>No project file has changed. Check and confirm the work plan when ready.</p><button className="v2-button button-ember" onClick={() => setShowContract(true)} type="button">Check work plan</button><button className="v2-button button-quiet" disabled={busy} onClick={onCancel} type="button">Cancel</button></section>;
  if (run.phase === "completed") return <section className="generated-completion-card"><p className="v2-eyebrow">Quest complete · local project history updated</p><h2>{run.contract.visibleOutcome}</h2><ProofGrid run={run} /><dl><div><dt>Changed files</dt><dd>{run.changedFiles.join(", ")}</dd></div><div><dt>Run ID</dt><dd><code>{run.receipt?.runId ?? "receipt pending"}</code></dd></div><div><dt>Local Git</dt><dd><code>{run.receipt?.commitSha.slice(0, 8) ?? "receipt pending"}</code></dd></div><div><dt>Chronicle</dt><dd>Quest completion recorded</dd></div></dl><button className="v2-button button-quiet" onClick={onBack} type="button">Return to Project World</button></section>;

  const active = run.phase === "implementing" || run.phase === "verifying" || run.phase === "completion_pending";
  return <section className={`generated-run-card phase-${run.phase}`} aria-live="polite"><p className="v2-eyebrow">Codex work · {runPhaseLabels[run.phase]}</p><h2>{active ? "Forge is making the confirmed change" : run.phase === "approved" ? "The work plan is confirmed" : run.phase === "scope_review" ? "Codex needs a different file. You choose what happens next." : run.phase === "waiting_for_playtest" ? "The checks passed. Now play the game yourself." : "The quest remains incomplete."}</h2><ol className="generated-progress">{creatorProgress(run).map((item, index) => <li className={item.state} key={`${index}-${item.label}`}>{item.label}</li>)}</ol>{run.scopeRequest && <aside className="generated-recovery recovery-resume"><strong>Codex asked for different files. Nothing was added.</strong><p>{plainRunText(run.scopeRequest.reason)}</p><code>{run.scopeRequest.paths.join(", ")}</code></aside>}{run.phase !== "approved" && <ProofGrid run={run} />}{run.error && <p className="workflow-error" role="alert">{plainRunText(run.error)}</p>}{(run.phase === "failed" || run.phase === "cancelled" || run.phase === "interrupted" || run.phase === "scope_review") && <aside className={`generated-recovery recovery-${run.recovery.action}`}><strong>{run.recovery.action === "rollback" ? "The chosen file changes can be undone safely." : run.recovery.action === "manual" ? "Forge stopped and kept the project unchanged for review." : "The quest was not marked complete."}</strong><p>{plainRunText(run.recovery.message)}</p>{run.recovery.concurrentPaths.length > 0 && <code>{run.recovery.concurrentPaths.join(", ")}</code>}</aside>}<details className="generated-technical"><summary>Technical details</summary><p>Step: {runPhaseLabels[run.phase]}</p><p>Work ID: <code>{run.contract.fingerprint}</code></p><p>Changed: {run.changedFiles.length > 0 ? run.changedFiles.join(", ") : "none reviewed yet"}</p></details><div className="generated-run-actions">{run.actions.start && <button className="v2-button button-ember" disabled={busy} onClick={onStart} type="button">Send to Codex</button>}{run.actions.play && <button className="v2-button button-ember" disabled={busy} onClick={() => void onPlay().then((launched) => { if (launched) setPlayRequested(true); })} type="button">Play the real game</button>}{run.actions.confirm && playRequested && <><button className="v2-button button-ember" disabled={busy} onClick={() => onConfirm("worked")} type="button">Worked</button><button className="v2-button button-quiet" disabled={busy} onClick={() => onConfirm("did_not_work")} type="button">Did not work</button><button className="v2-button button-quiet" disabled={busy} onClick={() => onConfirm("not_ready")} type="button">Not ready</button><button className="v2-button button-quiet" disabled={busy} onClick={() => onConfirm("retry")} type="button">Play again</button><button className="v2-button button-violet" disabled={busy} onClick={() => onConfirm("cancel")} type="button">Cancel</button></>}{run.actions.rollback && <button className="v2-button button-violet" disabled={busy} onClick={onRollback} type="button">Undo chosen file changes</button>}{run.actions.cancel && !run.actions.confirm && <button className="v2-button button-quiet" disabled={busy} onClick={onCancel} type="button">Cancel safely</button>}</div></section>;
}

function QuestBrief({ busy, canChooseFiles, implementationEnabled, onAdjust, onApprove, onCancel, onChooseFiles, onClose, onConfirm, onDefer, onPlay, onPrepare, onRollback, onStart, quest }: {
  busy: boolean;
  canChooseFiles: boolean;
  implementationEnabled: boolean;
  onAdjust: (visibleOutcome: string, includedScope: string[]) => void;
  onApprove: () => void;
  onCancel: () => void;
  onChooseFiles: () => void;
  onClose: () => void;
  onConfirm: (result: GeneratedCreatorResult) => void;
  onDefer: () => void;
  onPlay: () => Promise<boolean>;
  onPrepare: () => void;
  onRollback: () => void;
  onStart: () => void;
  quest: GeneratedQuestBrief;
}) {
  const requiresGravityAdjustment = quest.verificationProfile === "gravity_orb_presence_v1" && quest.revision < 2;
  const [outcome, setOutcome] = useState(requiresGravityAdjustment ? "A clearly identifiable gravity orb is present in the opening arena." : quest.visibleOutcome);
  const hasActiveRun = quest.run !== null && quest.run.phase !== "completed";
  if (quest.run) return <main className="generated-quest-brief generated-run-view"><header><button className="back-button" disabled={hasActiveRun} onClick={onClose} type="button"><span aria-hidden="true">←</span> Project World</button><p className="v2-eyebrow">Quest {quest.sequence} · Codex work</p><h1>{quest.title}</h1><span className="planned-only-label">{quest.implementationLabel}</span></header><RunPanel busy={busy} onApprove={onApprove} onBack={onClose} onCancel={onCancel} onConfirm={onConfirm} onPlay={onPlay} onRollback={onRollback} onStart={onStart} run={quest.run} /></main>;
  return <main className="generated-quest-brief"><header><button className="back-button" onClick={onClose} type="button"><span aria-hidden="true">←</span> Project World</button><p className="v2-eyebrow">Quest {quest.sequence}</p><h1>{quest.title}</h1><span className="planned-only-label">{quest.implementationLabel}</span></header><section className="quest-brief-promises"><article><p className="v2-eyebrow">Player result</p><h2>{quest.visibleOutcome}</h2></article><article><p className="v2-eyebrow">Why it matters</p><h2>{quest.whyItMatters}</h2></article><article><p className="v2-eyebrow">How Forge checks it</p><h2>{quest.verificationIdeas.map((item) => item.idea).join(" ")}</h2></article></section><section className="quest-brief-details"><article><h2>What can change</h2><ul>{quest.scope.included.map((item) => <li key={item}>{item}</li>)}</ul></article><article><h2>Not included</h2><ul>{quest.scope.excluded.map((item) => <li key={item}>{item}</li>)}</ul></article><article><h2>Done when</h2>{quest.acceptanceCriteria.map((criterion) => <div key={criterion.id}><p>{criterion.criterion}</p></div>)}</article><article><h2>What already works</h2>{quest.currentPlayableFacts.map((fact) => <p key={fact}>✓ {fact}</p>)}</article></section>{canChooseFiles ? <section className="generated-quest-actions"><div><p className="v2-eyebrow">One small safety step</p><h2>Choose the files Codex may change.</h2><p>Pick one to four Godot text files for this quest. Nothing runs until you confirm them.</p></div><button className="v2-button button-ember" disabled={busy} onClick={onChooseFiles} type="button">Choose files</button></section> : implementationEnabled && quest.implementation === "not_enabled" && (quest.workOrder || quest.verificationProfile) ? <section className="generated-quest-actions"><div><p className="v2-eyebrow">Ready for your review</p><h2>{requiresGravityAdjustment ? "Edit the visible result, then check the files Codex may change." : "Check the work plan before Codex starts."}</h2><p>{quest.eligibility.reason ?? "This quest is ready for a creator-confirmed work plan."}</p></div>{requiresGravityAdjustment && <label><span>Player-visible outcome</span><textarea maxLength={280} onChange={(event) => setOutcome(event.target.value)} value={outcome} /></label>}<div className="generated-run-actions">{requiresGravityAdjustment && <button className="v2-button button-quiet" disabled={busy || quest.state !== "available"} onClick={() => onAdjust(outcome, ["One clearly identifiable gravity orb", "Existing code-native arena visuals", "Existing ObjectiveMarker node and script"])} type="button">Edit result</button>}<button className="v2-button button-ember" disabled={busy || !quest.eligibility.eligible} onClick={onPrepare} type="button">Check work plan</button><button className="v2-button button-violet" disabled={busy || quest.state !== "available"} onClick={onDefer} type="button">Do later</button></div></section> : <aside className="implementation-boundary"><GeneratedCompanion /><div><strong>This quest is not ready for Codex yet.</strong><p>{quest.eligibility.reason ?? "Open the project runner to continue."}</p></div></aside>}</main>;
}

function ChronicleView({ snapshot }: { snapshot: GeneratedProjectWorldSnapshot }) {
  return <main className="generated-reading-view"><header><p className="v2-eyebrow">Project memory · source-labelled</p><h1>Chronicle and activity</h1><p>Chronicle events remain authoritative. Saved idea activity is derived from its owning idea-seed record and is labelled separately.</p></header><ol className="generated-activity-feed">{snapshot.activity.map((item) => <li className={item.source} key={item.activityId}><time>{new Date(item.occurredAt).toLocaleString()}</time><span>{item.label}</span><p>{item.summary}</p></li>)}</ol></main>;
}

function DocumentsView({ snapshot }: { snapshot: GeneratedProjectWorldSnapshot }) {
  return <main className="generated-reading-view"><header><p className="v2-eyebrow">Validated project-local records</p><h1>Project documents</h1><p>These disclosures point to deterministic Markdown generated from the authoritative JSON artifacts. Forge does not accept arbitrary document paths.</p></header><div className="generated-document-list">{snapshot.documents.map((document) => <article key={document.relativePath}><span>{document.label}</span><strong>{document.owner}</strong><code>{document.relativePath}</code></article>)}</div></main>;
}

export function GeneratedProjectWorld({ initialSnapshot, onBack, onSnapshot }: {
  initialSnapshot: GeneratedProjectWorldSnapshot;
  onBack: () => void;
  onSnapshot: (snapshot: GeneratedProjectWorldSnapshot) => void;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [busy, setBusy] = useState(false);
  const [idea, setIdea] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSystemId, setSelectedSystemId] = useState<string | undefined>(initialSnapshot.projectModel.focus.selectedSystemId);
  const [contextPanelOpen, setContextPanelOpen] = useState(false);
  const [toolboxOpen, setToolboxOpen] = useState(false);
  const [systemPlanningOpen, setSystemPlanningOpen] = useState(false);
  const [systemQuestPlanningOpen, setSystemQuestPlanningOpen] = useState(false);
  const [workOrderQuestId, setWorkOrderQuestId] = useState<string | undefined>();
  const statusRef = useRef<HTMLParagraphElement>(null);
  const questButtons = useRef(new Map<string, HTMLButtonElement>());
  const toolboxButtonRef = useRef<HTMLButtonElement>(null);
  const dockToolboxButtonRef = useRef<HTMLButtonElement>(null);
  const toolboxReturnRef = useRef<HTMLButtonElement | null>(null);
  const contextButtonRef = useRef<HTMLButtonElement>(null);
  const panelCloseRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setSnapshot(initialSnapshot);
    setContextPanelOpen(false);
    setToolboxOpen(false);
  }, [initialSnapshot]);
  useEffect(() => { setSelectedSystemId(initialSnapshot.projectModel.focus.selectedSystemId); setSystemPlanningOpen(false); setSystemQuestPlanningOpen(false); setWorkOrderQuestId(undefined); }, [initialSnapshot.project.projectId]);
  useEffect(() => { if (notice) statusRef.current?.focus(); }, [notice]);
  const selectedQuest = useMemo(() => snapshot.quests.find((quest) => quest.questId === snapshot.state.selectedQuestId) ?? null, [snapshot]);
  const selectedQuestIsNative = Boolean(selectedQuest && snapshot.systemQuestPlan?.systems.some((system) => system.quests.some((quest) => quest.questId === selectedQuest.questId)));
  const presentation = useMemo(() => buildGeneratedWorkspacePresentation(snapshot, selectedSystemId), [selectedSystemId, snapshot]);
  const selectedSystemQuests = useMemo(() => {
    const saved = snapshot.systemQuestPlan?.systems.find((system) => system.systemId === presentation.selectedSystem.systemId)?.quests ?? [];
    const statuses = new Map(snapshot.projectModel.quests.map((quest) => [quest.questId, quest.status]));
    return saved.map((quest) => ({ ...quest, status: statuses.get(quest.questId) ?? "blocked" as const }));
  }, [presentation.selectedSystem.systemId, snapshot.projectModel.quests, snapshot.systemQuestPlan]);
  const locked = presentation.locked;
  useEffect(() => {
    if (contextPanelOpen || toolboxOpen) window.setTimeout(() => panelCloseRef.current?.focus(), 0);
  }, [contextPanelOpen, toolboxOpen]);
  const update = (next: GeneratedProjectWorldSnapshot) => { setSnapshot(next); onSnapshot(next); };
  const setRun = (run: GeneratedQuestRunSnapshot) => setSnapshot((current) => ({ ...current, quests: current.quests.map((quest) => quest.questId === run.questId ? { ...quest, run, implementationLabel: `Codex work · ${runPhaseLabels[run.phase]}` } : quest) }));
  const refreshWorld = async () => update(await loadGeneratedProjectWorld(snapshot.project.projectId));
  useEffect(() => {
    const run = selectedQuest?.run;
    if (!run || run.phase === "completed" || run.phase === "cancelled") return;
    return subscribeToGeneratedQuest(snapshot.project.projectId, selectedQuest!.questId, (event) => {
      if (event.phase === "cancelled") return;
      void loadGeneratedQuestRun(snapshot.project.projectId, selectedQuest!.questId).then((next) => {
        setRun(next);
      }).catch(() => {});
    }, () => {});
  }, [selectedQuest?.questId, selectedQuest?.run?.phase, snapshot.project.projectId]);
  const action = async <T,>(operation: () => Promise<T>, after: (value: T) => Promise<void> | void) => {
    if (busy) return;
    setBusy(true);
    try { const value = await operation(); await after(value); setError(null); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : String(nextError)); }
    finally { setBusy(false); }
  };
  const persistView = async (currentView: GeneratedWorldView, selectedQuestId = snapshot.state.selectedQuestId, allowDuringLock = false) => {
    if (busy || (locked && !allowDuringLock)) return;
    await action(() => saveGeneratedProjectState(snapshot.project.projectId, { currentView, selectedQuestId }), update);
  };
  const selectQuest = async (questId: string, systemId: string) => {
    setSelectedSystemId(systemId);
    await persistView("project_world", questId);
    if (!snapshot.quests.some((quest) => quest.questId === questId)) setSystemQuestPlanningOpen(true);
  };
  const selectSystem = (systemId: string) => {
    if (locked) return;
    setSelectedSystemId(systemId);
  };
  const openSelectedQuest = async () => {
    const questId = presentation.context.questId;
    if (!questId) { setSystemQuestPlanningOpen(true); setContextPanelOpen(false); return; }
    if (!snapshot.quests.some((quest) => quest.questId === questId)) { setSystemQuestPlanningOpen(true); setContextPanelOpen(false); return; }
    setContextPanelOpen(false);
    await persistView("quest_brief", questId, true);
  };
  const closeBrief = async () => { const questId = snapshot.state.selectedQuestId; await persistView("project_world", questId); if (questId) window.setTimeout(() => questButtons.current.get(questId)?.focus(), 0); };
  const saveIdea = async () => {
    if (!idea.trim() || busy || locked) return;
    await action(() => saveGeneratedIdea(snapshot.project.projectId, idea), async () => {
      await refreshWorld(); setIdea(""); setNotice("Idea saved for future planning. No quest was created and no implementation started.");
    });
  };
  const launch = async () => action(() => launchGeneratedProject(snapshot.project.projectId), (result) => setNotice(result.message));
  const openFolder = async () => action(() => openCreatedProjectFolder(snapshot.project.projectId), () => setNotice("Project folder opened."));
  const questAction = <T,>(operation: () => Promise<T>, after: (value: T) => Promise<void> | void) => void action(operation, after);
  const adjust = (visibleOutcome: string, includedScope: string[]) => { if (!selectedQuest) return; questAction(
    () => adjustGeneratedQuest(snapshot.project.projectId, selectedQuest.questId, { expectedRevision: selectedQuest.revision, visibleOutcome, includedScope }),
    async () => { await refreshWorld(); setNotice("Outcome adjusted and saved in local plan history. Build can now start from a clean HEAD."); },
  ); };
  const defer = () => { if (selectedQuest) questAction(() => deferGeneratedQuest(snapshot.project.projectId, selectedQuest.questId, selectedQuest.revision), refreshWorld); };
  const prepare = () => { if (selectedQuest) questAction(() => prepareGeneratedQuest(snapshot.project.projectId, selectedQuest.questId), setRun); };
  const approve = () => { const run = selectedQuest?.run; if (run && selectedQuest) questAction(() => approveGeneratedQuest(snapshot.project.projectId, selectedQuest.questId, run.contract.fingerprint), setRun); };
  const start = () => { if (selectedQuest) questAction(() => startGeneratedQuest(snapshot.project.projectId, selectedQuest.questId), setRun); };
  const play = async (): Promise<boolean> => {
    if (!selectedQuest || busy) return false;
    setBusy(true);
    try {
      const result = await playGeneratedQuest(snapshot.project.projectId, selectedQuest.questId);
      setNotice(result.message);
      setError(null);
      return true;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
      return false;
    } finally {
      setBusy(false);
    }
  };
  const confirm = (result: GeneratedCreatorResult) => { if (selectedQuest) questAction(
    () => confirmGeneratedQuest(snapshot.project.projectId, selectedQuest.questId, result),
    setRun,
  ); };
  const cancel = () => { if (selectedQuest) questAction(() => cancelGeneratedQuest(snapshot.project.projectId, selectedQuest.questId), setRun); };
  const rollback = () => { if (selectedQuest) questAction(() => rollbackGeneratedQuest(snapshot.project.projectId, selectedQuest.questId), refreshWorld); };

  const active = snapshot.state.currentView;
  const closePanel = () => {
    const returnTo = toolboxOpen ? toolboxReturnRef.current : contextButtonRef.current;
    setToolboxOpen(false);
    setContextPanelOpen(false);
    window.setTimeout(() => returnTo?.focus(), 0);
  };
  const showToolbox = (trigger: HTMLButtonElement | null) => {
    toolboxReturnRef.current = trigger;
    setContextPanelOpen(false);
    setToolboxOpen(true);
  };
  const navigate = async (view: GeneratedWorldView) => {
    if (systemQuestPlanningOpen) await cancelSystemQuestPlanning(snapshot.project.projectId, presentation.selectedSystem.systemId).catch(() => undefined);
    setContextPanelOpen(false);
    setToolboxOpen(false);
    setSystemPlanningOpen(false);
    setSystemQuestPlanningOpen(false);
    await persistView(view);
  };
  const center = systemQuestPlanningOpen
    ? <SystemQuestRefinement onChanged={refreshWorld} onClose={() => { setSystemQuestPlanningOpen(false); setWorkOrderQuestId(undefined); }} onReady={async (questId) => { setSystemQuestPlanningOpen(false); setWorkOrderQuestId(undefined); await persistView("quest_brief", questId); }} projectId={snapshot.project.projectId} systemId={presentation.selectedSystem.systemId} systemOutcome={presentation.selectedSystem.outcome} systemQuests={selectedSystemQuests} systemTitle={presentation.selectedSystem.title} targetQuestId={workOrderQuestId} />
    : systemPlanningOpen
    ? <SystemRoadmapPlanning initialIdea={snapshot.projectModel.project.vision} onAccepted={refreshWorld} onClose={() => setSystemPlanningOpen(false)} projectId={snapshot.project.projectId} />
    : active === "quest_brief"
    ? selectedQuest
      ? <QuestBrief busy={busy} canChooseFiles={selectedQuestIsNative && selectedQuest.state === "available" && selectedQuest.implementation === "not_enabled" && !selectedQuest.workOrder} implementationEnabled={snapshot.actions.generatedQuestImplementation} onAdjust={adjust} onApprove={approve} onCancel={cancel} onChooseFiles={() => { setWorkOrderQuestId(selectedQuest.questId); setSystemQuestPlanningOpen(true); }} onClose={() => void closeBrief()} onConfirm={confirm} onDefer={defer} onPlay={play} onPrepare={prepare} onRollback={rollback} onStart={start} quest={selectedQuest} />
      : <SystemQuestRefinement onChanged={refreshWorld} onClose={() => void closeBrief()} onReady={async (questId) => { setSystemQuestPlanningOpen(false); await persistView("quest_brief", questId); }} projectId={snapshot.project.projectId} systemId={presentation.selectedSystem.systemId} systemOutcome={presentation.selectedSystem.outcome} systemQuests={selectedSystemQuests} systemTitle={presentation.selectedSystem.title} />
    : active === "chronicle"
      ? <ChronicleView snapshot={snapshot} />
      : active === "documents"
        ? <DocumentsView snapshot={snapshot} />
        : <WorkspaceRoadmap locked={locked} onPlanSystems={() => { setContextPanelOpen(false); setToolboxOpen(false); setSystemQuestPlanningOpen(false); setWorkOrderQuestId(undefined); setSystemPlanningOpen(true); }} onRefineSystem={() => { setContextPanelOpen(false); setToolboxOpen(false); setSystemPlanningOpen(false); setWorkOrderQuestId(undefined); setSystemQuestPlanningOpen(true); }} onSelectQuest={(questId, systemId) => void selectQuest(questId, systemId)} onSelectSystem={selectSystem} presentation={presentation} questButtons={questButtons} />;

  return <div className="project-world generated-project-world generated-workspace"><WorkspaceHeader locked={locked} onBack={onBack} onToolbox={() => showToolbox(toolboxButtonRef.current)} projectName={snapshot.project.displayName} toolboxButtonRef={toolboxButtonRef} />{error && <p className="workflow-error" role="alert">{error}</p>}{notice && <p className="workflow-notice generated-live-status" ref={statusRef} role="status" tabIndex={-1}>{notice}</p>}{snapshot.state.repairNotice && <p className="workflow-notice" role="status">{snapshot.state.repairNotice}</p>}<div className="generated-workspace-shell"><WorkspaceNavigation active={active} locked={locked} onNavigate={navigate} /><div className="generated-workspace-center"><button className="v2-button button-quiet workspace-context-toggle" onClick={() => setContextPanelOpen(true)} ref={contextButtonRef} type="button">{systemPlanningOpen || systemQuestPlanningOpen ? "Planning help" : presentation.context.kind === "quest" ? "Quest details" : "System details"}</button>{center}</div><aside aria-label={toolboxOpen ? "Toolbox" : "Forgie guidance"} className={`generated-workspace-context${contextPanelOpen || toolboxOpen ? " is-open" : ""}`}>{toolboxOpen ? <ToolboxPanel closeButtonRef={panelCloseRef} onClose={closePanel} onLaunch={() => void launch()} onOpenFolder={() => void openFolder()} playEnabled={presentation.dock.playEnabled} /> : systemPlanningOpen || systemQuestPlanningOpen ? <SystemPlanningContext closeButtonRef={panelCloseRef} onClose={closePanel} /> : <WorkspaceContextPanel busy={busy} closeButtonRef={panelCloseRef} idea={idea} locked={locked} onClose={closePanel} onIdeaChange={setIdea} onOpenQuest={() => void openSelectedQuest()} onSaveIdea={() => void saveIdea()} presentation={presentation} />}</aside></div><WorkbenchDock busy={busy} onLaunch={() => void launch()} onOpenFolder={() => void openFolder()} onToolbox={() => showToolbox(dockToolboxButtonRef.current)} presentation={presentation} toolboxButtonRef={dockToolboxButtonRef} /></div>;
}

export function GeneratedProjectWorldFailure({ error, onBack, onRetry, projectId }: {
  error: string;
  onBack: () => void;
  onRetry: () => void;
  projectId: string;
}) {
  const [folderError, setFolderError] = useState<string | null>(null);
  const openFolder = async () => {
    try { await openCreatedProjectFolder(projectId); setFolderError(null); }
    catch (nextError) { setFolderError(nextError instanceof Error ? nextError.message : String(nextError)); }
  };
  return <main className="generated-world-failure"><GeneratedCompanion /><p className="v2-eyebrow">Project World stopped safely</p><h1>Forge could not open this Project World.</h1><p role="alert">{error}</p><p>No partial roadmap was rendered and Forge did not rewrite project artifacts or registry recency.</p>{folderError && <p role="alert">{folderError}</p>}<div><button className="v2-button button-ember" onClick={onRetry} type="button">Retry validated open</button><button className="v2-button button-quiet" onClick={() => void openFolder()} type="button">Open safe project folder</button><button className="v2-button button-violet" onClick={onBack} type="button">Return to Launchpad</button></div></main>;
}
