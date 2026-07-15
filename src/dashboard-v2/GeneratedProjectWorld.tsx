import { useEffect, useMemo, useRef, useState } from "react";

import {
  adjustGeneratedQuest,
  approveGeneratedQuest,
  cancelGeneratedQuest,
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

function GeneratedCompanion() {
  return <span aria-label="Forge Companion focused" className="companion-core companion-focused companion-compact" role="img"><span className="companion-orbit orbit-a" /><span className="companion-orbit orbit-b" /><span className="companion-center" /></span>;
}

function GeneratedHeader({ active, locked, projectName, onBack, onNavigate }: {
  active: GeneratedWorldView;
  locked: boolean;
  projectName: string;
  onBack: () => void;
  onNavigate: (view: GeneratedWorldView) => void;
}) {
  return <header className="world-header generated-world-header"><button className="back-button" onClick={onBack} type="button"><span aria-hidden="true">←</span> Launchpad</button><div className="forge-brand"><GeneratedCompanion /><div><strong>Forge</strong><span>Living Game Workshop</span></div></div><nav aria-label="Generated project navigation">{(["project_world", "chronicle", "documents"] as const).map((view) => <button aria-current={active === view ? "page" : undefined} disabled={locked} key={view} onClick={() => onNavigate(view)} type="button">{view === "project_world" ? "World" : view === "chronicle" ? "Chronicle" : "Documents"}</button>)}</nav><div className="world-project-title"><div><span className="v2-eyebrow">Generated Project World</span><h1>{projectName}</h1></div><span className="workspace-chip workspace-created">Created</span></div></header>;
}

function StarterPreview({ snapshot }: { snapshot: GeneratedProjectWorldSnapshot }) {
  return <section className="generated-starter" aria-labelledby="starter-preview-title"><div className="generated-preview-frame" aria-label="Code-native playable-state preview of the verified starter layout"><div className="preview-window-bar"><span><i /> {snapshot.playable.previewLabel.toUpperCase()}</span><strong>CODE-NATIVE · NOT A CAPTURED GODOT FRAME</strong></div><div className="generated-arena"><span className="generated-boundary" /><span className="generated-player">PLAYER</span><span className="generated-objective">OBJECTIVE</span><span className="generated-control">WASD / ARROWS</span></div></div><div className="generated-playable-copy"><p className="v2-eyebrow">{snapshot.playable.layoutLabel} · verification-derived</p><h2 id="starter-preview-title">{snapshot.playable.summary}</h2><ul>{snapshot.playable.facts.map((fact) => <li key={fact}>✓ {fact}</li>)}</ul><div className="planned-warning"><strong>Planned, not playable yet</strong>{snapshot.playable.plannedNotPlayable.map((item) => <span key={item}>{item}</span>)}</div></div></section>;
}

const proofRows = [
  ["boundary", "Boundary"],
  ["projectHealth", "Project health"],
  ["mechanic", "Mechanic"],
  ["creator", "Your playtest"],
] as const;

function ProofGrid({ run }: { run: GeneratedQuestRunSnapshot }) {
  return <section className="generated-proof-grid" aria-label="Quest proof results">{proofRows.map(([key, label]) => {
    const proof = run.proofs[key];
    return <article className={`proof-${proof.result}`} key={key}><span>{label}</span><strong>{proof.result === "passed" ? "Passed" : proof.result === "failed" ? "Needs attention" : "Pending"}</strong><p>{proof.summary}</p>{proof.evidence.length > 0 && <details><summary>Technical evidence</summary><ul>{proof.evidence.map((item) => <li key={item}>{item}</li>)}</ul></details>}</article>;
  })}</section>;
}

function ContractReview({ run, onApprove, onBack }: {
  run: GeneratedQuestRunSnapshot;
  onApprove: () => void;
  onBack: () => void;
}) {
  return <section className="generated-contract" aria-labelledby="generated-contract-title"><header><p className="v2-eyebrow">Exact implementation contract · creator approval required</p><h2 id="generated-contract-title">Forge will make this visible result</h2><p>{run.contract.visibleOutcome}</p></header><div className="generated-contract-grid"><article><h3>Existing files Codex may change</h3>{run.contract.allowedFiles.map((file) => <div className="contract-file" key={file.relativePath}><strong>{file.role.replaceAll("_", " ")}</strong><code>{file.relativePath}</code><small>Prehash {file.preSha256.slice(0, 12)}…</small></div>)}</article><article><h3>What stays out</h3><ul>{run.contract.excludedScope.map((item) => <li key={item}>{item}</li>)}</ul></article><article><h3>How Forge will prove it</h3><ul>{run.contract.acceptanceCriteria.map((item) => <li key={item.id}><strong>{item.id}</strong> {item.criterion}<small>{item.proofReferences.join(" · ")}</small></li>)}</ul></article><article><h3>Your play check</h3><ol>{run.contract.creatorPlaySteps.map((item) => <li key={item}>{item}</li>)}</ol></article></div><details className="generated-technical"><summary>Technical contract details</summary><p>Profile: <code>{run.contract.verificationProfile}</code></p><p>Fingerprint: <code>{run.contract.fingerprint}</code></p><p>Revision: {run.contract.questRevision}</p></details><div className="generated-run-actions"><button className="v2-button button-quiet" onClick={onBack} type="button">Back to outcome</button><button className="v2-button button-ember" onClick={onApprove} type="button">Approve exact contract</button></div></section>;
}

function RunPanel({ busy, run, onApprove, onBack, onCancel, onConfirm, onPlay, onRollback, onStart }: {
  busy: boolean;
  run: GeneratedQuestRunSnapshot;
  onApprove: () => void;
  onBack: () => void;
  onCancel: () => void;
  onConfirm: (result: GeneratedCreatorResult) => void;
  onPlay: () => void;
  onRollback: () => void;
  onStart: () => void;
}) {
  const [showContract, setShowContract] = useState(true);
  if (run.phase === "contract_review" && showContract) return <ContractReview onApprove={onApprove} onBack={() => setShowContract(false)} run={run} />;
  if (run.phase === "contract_review") return <section className="generated-run-card"><p className="v2-eyebrow">Forge recommendation · contract prepared</p><h2>{run.contract.visibleOutcome}</h2><p>No project file has changed. Resume the exact contract review when ready.</p><button className="v2-button button-ember" onClick={() => setShowContract(true)} type="button">Resume contract review</button><button className="v2-button button-quiet" disabled={busy} onClick={onCancel} type="button">Cancel</button></section>;
  if (run.phase === "completed") return <section className="generated-completion-card"><p className="v2-eyebrow">Quest complete · local project history updated</p><h2>{run.contract.visibleOutcome}</h2><ProofGrid run={run} /><dl><div><dt>Changed files</dt><dd>{run.changedFiles.join(", ")}</dd></div><div><dt>Run ID</dt><dd><code>{run.receipt?.runId ?? "receipt pending"}</code></dd></div><div><dt>Local Git</dt><dd><code>{run.receipt?.commitSha.slice(0, 8) ?? "receipt pending"}</code></dd></div><div><dt>Chronicle</dt><dd>Quest completion recorded</dd></div></dl><button className="v2-button button-quiet" onClick={onBack} type="button">Return to Project World</button></section>;

  const active = run.phase === "implementing" || run.phase === "verifying" || run.phase === "completion_pending";
  return <section className={`generated-run-card phase-${run.phase}`} aria-live="polite"><p className="v2-eyebrow">Generated quest run · {run.phase.replaceAll("_", " ")}</p><h2>{active ? "Forge is building the approved result" : run.phase === "approved" ? "The exact contract is approved" : run.phase === "waiting_for_playtest" ? "Automated proof passed. Now the game needs you." : "The quest remains incomplete."}</h2><ol className="generated-progress">{run.progress.map((item, index) => <li className={index === run.progress.length - 1 ? "current" : "done"} key={`${index}-${item}`}>{item}</li>)}</ol>{run.phase !== "approved" && <ProofGrid run={run} />}{run.error && <p className="workflow-error" role="alert">{run.error}</p>}{(run.phase === "failed" || run.phase === "cancelled" || run.phase === "interrupted") && <aside className={`generated-recovery recovery-${run.recovery.action}`}><strong>{run.recovery.action === "rollback" ? "Reviewed changes remain; exact rollback is safe." : run.recovery.action === "manual" ? "Forge preserved the project for manual recovery." : "No quest completion was recorded."}</strong><p>{run.recovery.message}</p>{run.recovery.concurrentPaths.length > 0 && <code>{run.recovery.concurrentPaths.join(", ")}</code>}</aside>}<details className="generated-technical"><summary>Technical run details</summary><p>Run phase: {run.phase}</p><p>Contract: <code>{run.contract.fingerprint}</code></p><p>Changed: {run.changedFiles.length > 0 ? run.changedFiles.join(", ") : "none reviewed yet"}</p></details><div className="generated-run-actions">{run.actions.start && <button className="v2-button button-ember" disabled={busy} onClick={onStart} type="button">Start approved build</button>}{run.actions.play && <button className="v2-button button-ember" disabled={busy} onClick={onPlay} type="button">Play the real game</button>}{run.actions.confirm && <><button className="v2-button button-ember" disabled={busy} onClick={() => onConfirm("worked")} type="button">Worked</button><button className="v2-button button-quiet" disabled={busy} onClick={() => onConfirm("did_not_work")} type="button">Did not work</button><button className="v2-button button-quiet" disabled={busy} onClick={() => onConfirm("not_ready")} type="button">Not ready</button><button className="v2-button button-quiet" disabled={busy} onClick={() => onConfirm("retry")} type="button">Retry playtest</button><button className="v2-button button-violet" disabled={busy} onClick={() => onConfirm("cancel")} type="button">Cancel</button></>}{run.actions.rollback && <button className="v2-button button-violet" disabled={busy} onClick={onRollback} type="button">Roll back reviewed changes</button>}{run.actions.cancel && !run.actions.confirm && <button className="v2-button button-quiet" disabled={busy} onClick={onCancel} type="button">Cancel safely</button>}</div></section>;
}

function QuestBrief({ busy, implementationEnabled, onAdjust, onApprove, onCancel, onClose, onConfirm, onDefer, onPlay, onPrepare, onRollback, onStart, quest }: {
  busy: boolean;
  implementationEnabled: boolean;
  onAdjust: (visibleOutcome: string, includedScope: string[]) => void;
  onApprove: () => void;
  onCancel: () => void;
  onClose: () => void;
  onConfirm: (result: GeneratedCreatorResult) => void;
  onDefer: () => void;
  onPlay: () => void;
  onPrepare: () => void;
  onRollback: () => void;
  onStart: () => void;
  quest: GeneratedQuestBrief;
}) {
  const requiresGravityAdjustment = quest.verificationProfile === "gravity_orb_presence_v1" && quest.revision < 2;
  const [outcome, setOutcome] = useState(requiresGravityAdjustment ? "A clearly identifiable gravity orb is present in the opening arena." : quest.visibleOutcome);
  const hasActiveRun = quest.run !== null && quest.run.phase !== "completed";
  if (quest.run) return <main className="generated-quest-brief generated-run-view"><header><button className="back-button" disabled={hasActiveRun} onClick={onClose} type="button"><span aria-hidden="true">←</span> Project World</button><p className="v2-eyebrow">Quest {quest.sequence} · Forge implementation</p><h1>{quest.title}</h1><span className="planned-only-label">{quest.implementationLabel}</span></header><RunPanel busy={busy} onApprove={onApprove} onBack={onClose} onCancel={onCancel} onConfirm={onConfirm} onPlay={onPlay} onRollback={onRollback} onStart={onStart} run={quest.run} /></main>;
  return <main className="generated-quest-brief"><header><button className="back-button" onClick={onClose} type="button"><span aria-hidden="true">←</span> Project World</button><p className="v2-eyebrow">Quest {quest.sequence} · outcome first</p><h1>{quest.title}</h1><span className="planned-only-label">{quest.implementationLabel}</span></header><section className="quest-brief-promises"><article><p className="v2-eyebrow">{quest.outcomeLabel}</p><h2>{quest.visibleOutcome}</h2></article><article><p className="v2-eyebrow">Why it matters</p><h2>{quest.whyItMatters}</h2></article><article><p className="v2-eyebrow">Proof approach</p><h2>{quest.verificationIdeas.map((item) => item.idea).join(" ")}</h2></article></section><section className="quest-brief-details"><article><h2>Included scope</h2><ul>{quest.scope.included.map((item) => <li key={item}>{item}</li>)}</ul></article><article><h2>Excluded scope</h2><ul>{quest.scope.excluded.map((item) => <li key={item}>{item}</li>)}</ul></article><article><h2>Acceptance criteria</h2>{quest.acceptanceCriteria.map((criterion) => <div key={criterion.id}><strong>{criterion.id}</strong><p>{criterion.criterion}</p><small>Verification: {criterion.verificationIds.join(", ")}</small></div>)}</article><article><h2>Current playable facts</h2>{quest.currentPlayableFacts.map((fact) => <p key={fact}>✓ {fact}</p>)}</article></section>{implementationEnabled && quest.implementation === "not_enabled" && quest.verificationProfile ? <section className="generated-quest-actions"><div><p className="v2-eyebrow">Forge recommendation · bounded existing-file quest</p><h2>{requiresGravityAdjustment ? "Adjust the visible result, then review exactly what Codex may change." : "The accepted roadmap already fixes the visible result. Review the exact existing-file contract next."}</h2><p>{quest.eligibility.reason ?? "This quest is eligible for a strict Forge implementation contract."}</p></div>{requiresGravityAdjustment && <label><span>Player-visible outcome</span><textarea maxLength={280} onChange={(event) => setOutcome(event.target.value)} value={outcome} /></label>}<div className="generated-run-actions">{requiresGravityAdjustment && <button className="v2-button button-quiet" disabled={busy || quest.state !== "available"} onClick={() => onAdjust(outcome, ["One clearly identifiable gravity orb", "Existing code-native arena visuals", "Existing ObjectiveMarker node and script"])} type="button">Adjust outcome</button>}<button className="v2-button button-ember" disabled={busy || !quest.eligibility.eligible} onClick={onPrepare} type="button">Build with Forge</button><button className="v2-button button-violet" disabled={busy || quest.state !== "available"} onClick={onDefer} type="button">Defer</button></div></section> : <aside className="implementation-boundary"><GeneratedCompanion /><div><strong>Forge recommendation · implementation is unavailable for this quest.</strong><p>{quest.eligibility.reason ?? "This Project World is running without the generated quest runner."}</p></div></aside>}</main>;
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
  const statusRef = useRef<HTMLParagraphElement>(null);
  const questButtons = useRef(new Map<string, HTMLButtonElement>());
  useEffect(() => { setSnapshot(initialSnapshot); }, [initialSnapshot]);
  useEffect(() => { if (notice) statusRef.current?.focus(); }, [notice]);
  const selectedQuest = useMemo(() => snapshot.quests.find((quest) => quest.questId === snapshot.state.selectedQuestId) ?? snapshot.quests[0]!, [snapshot]);
  const locked = selectedQuest.run !== null && selectedQuest.run.phase !== "completed" && selectedQuest.run.phase !== "cancelled";
  const update = (next: GeneratedProjectWorldSnapshot) => { setSnapshot(next); onSnapshot(next); };
  const setRun = (run: GeneratedQuestRunSnapshot) => setSnapshot((current) => ({ ...current, quests: current.quests.map((quest) => quest.questId === run.questId ? { ...quest, run, implementationLabel: `Forge run · ${run.phase.replaceAll("_", " ")}` } : quest) }));
  const refreshWorld = async () => update(await loadGeneratedProjectWorld(snapshot.project.projectId));
  useEffect(() => {
    const run = selectedQuest.run;
    if (!run || run.phase === "completed" || run.phase === "cancelled") return;
    return subscribeToGeneratedQuest(snapshot.project.projectId, selectedQuest.questId, (event) => {
      if (event.phase === "cancelled") return;
      void loadGeneratedQuestRun(snapshot.project.projectId, selectedQuest.questId).then((next) => {
        setRun(next);
      }).catch(() => {});
    }, () => {});
  }, [selectedQuest.questId, selectedQuest.run?.phase, snapshot.project.projectId]);
  const action = async <T,>(operation: () => Promise<T>, after: (value: T) => Promise<void> | void) => {
    if (busy) return;
    setBusy(true);
    try { const value = await operation(); await after(value); setError(null); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : String(nextError)); }
    finally { setBusy(false); }
  };
  const persistView = async (currentView: GeneratedWorldView, selectedQuestId = snapshot.state.selectedQuestId) => {
    if (busy || locked) return;
    await action(() => saveGeneratedProjectState(snapshot.project.projectId, { currentView, selectedQuestId }), update);
  };
  const selectQuest = async (questId: string) => { await persistView("quest_brief", questId); };
  const closeBrief = async () => { const questId = snapshot.state.selectedQuestId; await persistView("project_world", questId); window.setTimeout(() => questButtons.current.get(questId)?.focus(), 0); };
  const saveIdea = async () => {
    if (!idea.trim() || busy || locked) return;
    await action(() => saveGeneratedIdea(snapshot.project.projectId, idea), async () => {
      await refreshWorld(); setIdea(""); setNotice("Idea saved for future planning. No quest was created and no implementation started.");
    });
  };
  const launch = async () => action(() => launchGeneratedProject(snapshot.project.projectId), (result) => setNotice(result.message));
  const openFolder = async () => action(() => openCreatedProjectFolder(snapshot.project.projectId), () => setNotice("Project folder opened."));
  const questAction = <T,>(operation: () => Promise<T>, after: (value: T) => Promise<void> | void) => void action(operation, after);
  const adjust = (visibleOutcome: string, includedScope: string[]) => questAction(
    () => adjustGeneratedQuest(snapshot.project.projectId, selectedQuest.questId, { expectedRevision: selectedQuest.revision, visibleOutcome, includedScope }),
    async () => { await refreshWorld(); setNotice("Outcome adjusted and saved in local plan history. Build can now start from a clean HEAD."); },
  );
  const defer = () => questAction(() => deferGeneratedQuest(snapshot.project.projectId, selectedQuest.questId, selectedQuest.revision), refreshWorld);
  const prepare = () => questAction(() => prepareGeneratedQuest(snapshot.project.projectId, selectedQuest.questId), setRun);
  const approve = () => { const run = selectedQuest.run; if (run) questAction(() => approveGeneratedQuest(snapshot.project.projectId, selectedQuest.questId, run.contract.fingerprint), setRun); };
  const start = () => questAction(() => startGeneratedQuest(snapshot.project.projectId, selectedQuest.questId), setRun);
  const play = () => questAction(() => playGeneratedQuest(snapshot.project.projectId, selectedQuest.questId), (result) => setNotice(result.message));
  const confirm = (result: GeneratedCreatorResult) => questAction(
    () => confirmGeneratedQuest(snapshot.project.projectId, selectedQuest.questId, result),
    setRun,
  );
  const cancel = () => questAction(() => cancelGeneratedQuest(snapshot.project.projectId, selectedQuest.questId), setRun);
  const rollback = () => questAction(() => rollbackGeneratedQuest(snapshot.project.projectId, selectedQuest.questId), refreshWorld);

  const active = snapshot.state.currentView;
  if (active === "quest_brief") return <div className="project-world generated-project-world"><GeneratedHeader active={active} locked={locked} onBack={onBack} onNavigate={(view) => void persistView(view)} projectName={snapshot.project.displayName} />{error && <p className="workflow-error" role="alert">{error}</p>}{notice && <p className="workflow-notice generated-live-status" ref={statusRef} role="status" tabIndex={-1}>{notice}</p>}<QuestBrief busy={busy} implementationEnabled={snapshot.actions.generatedQuestImplementation} onAdjust={adjust} onApprove={approve} onCancel={cancel} onClose={() => void closeBrief()} onConfirm={confirm} onDefer={defer} onPlay={play} onPrepare={prepare} onRollback={rollback} onStart={start} quest={selectedQuest} /></div>;
  const completedCount = snapshot.roadmap.quests.filter((quest) => quest.state === "completed").length;
  return <div className="project-world generated-project-world"><GeneratedHeader active={active} locked={locked} onBack={onBack} onNavigate={(view) => void persistView(view)} projectName={snapshot.project.displayName} />{error && <p className="workflow-error" role="alert">{error}</p>}{notice && <p className="workflow-notice generated-live-status" ref={statusRef} role="status" tabIndex={-1}>{notice}</p>}{snapshot.state.repairNotice && <p className="workflow-notice" role="status">{snapshot.state.repairNotice}</p>}{active === "chronicle" ? <ChronicleView snapshot={snapshot} /> : active === "documents" ? <DocumentsView snapshot={snapshot} /> : <main className="generated-world-main"><section className="generated-identity"><div><p className="v2-eyebrow">{snapshot.project.foundationLabel} · {snapshot.project.engineLabel}</p><h1>{snapshot.project.displayName}</h1><p>{snapshot.vision.vision}</p></div><aside><span>First playable milestone</span><strong>{snapshot.firstPlayable.outcome}</strong></aside></section><StarterPreview snapshot={snapshot} /><section className="generated-roadmap" aria-labelledby="generated-roadmap-title"><header><div><p className="v2-eyebrow">Persisted game assembly roadmap</p><h2 id="generated-roadmap-title">{snapshot.roadmap.quests.length} quests toward First Playable</h2></div><span>{completedCount} completed · {snapshot.roadmap.quests.length - completedCount} remaining</span></header><div className="generated-roadmap-rail">{snapshot.roadmap.quests.map((node, index) => <div className="generated-roadmap-step" key={node.questId}>{index > 0 && <span className="generated-dependency" aria-label={`Depends on ${node.dependsOn.join(", ")}`}>→</span>}<button aria-current={snapshot.state.selectedQuestId === node.questId ? "step" : undefined} className={`generated-quest-node state-${node.state}`} disabled={locked} onClick={() => void selectQuest(node.questId)} ref={(element) => { if (element) questButtons.current.set(node.questId, element); else questButtons.current.delete(node.questId); }} type="button"><small>Quest {index + 1} · {node.state.replaceAll("_", " ")}</small><strong>{node.title}</strong><p>{node.summary}</p><em>{node.dependsOn.length > 0 ? `After ${node.dependsOn.join(", ")}` : "Foundation quest"}</em><span>Open quest outcome →</span></button>{snapshot.state.selectedQuestId === node.questId && <aside className="generated-companion-note"><GeneratedCompanion /><p><strong>Forge recommendation</strong><br />{node.questId === snapshot.state.nextRecommendedQuestId ? "This is the next eligible quest." : node.state === "completed" ? "This outcome is complete and recorded in local project history." : "Open the outcome to review its honest eligibility and next action."}</p></aside>}</div>)}</div></section><section className="generated-world-lower"><article><p className="v2-eyebrow">Recent project activity</p><h2>Chronicle and idea activity</h2>{snapshot.activity.slice(0, 3).map((item) => <p key={item.activityId}><strong>{item.label}</strong><br />{item.summary}</p>)}<button className="v2-button button-quiet" onClick={() => void persistView("chronicle")} type="button">View Chronicle</button></article><article><p className="v2-eyebrow">Project-local documentation</p><h2>{snapshot.documents.length} validated records</h2><p>Vision, milestone, roadmap, Chronicle, and project overview remain available without scanning arbitrary files.</p><button className="v2-button button-quiet" onClick={() => void persistView("documents")} type="button">View documents</button></article><article className="generated-actions"><p className="v2-eyebrow">Verified starter actions</p><h2>Open the real project</h2><button className="v2-button button-ember" disabled={busy || locked} onClick={() => void launch()} type="button">Launch in Godot</button><button className="v2-button button-quiet" disabled={busy} onClick={() => void openFolder()} type="button">Open project folder</button><small>Launch uses pinned Godot and the canonical registered path.</small></article></section></main>}<section className="idea-dock generated-idea-dock" aria-labelledby="generated-idea-title"><span className="idea-dock-icon">✦</span><div className="idea-dock-label"><span className="v2-eyebrow">Idea seed · persisted planning input</span><h2 id="generated-idea-title">What should Forge remember for later?</h2></div><label className="idea-input"><span className="sr-only">Save an idea for future planning</span><input disabled={locked} maxLength={500} onChange={(event) => setIdea(event.target.value)} placeholder="Leave a fading ring after each pulse…" type="text" value={idea} /><button aria-label="Save idea seed" disabled={busy || locked || !idea.trim()} onClick={() => void saveIdea()} type="button">→</button></label></section></div>;
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
