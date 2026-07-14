import { useEffect, useMemo, useRef, useState } from "react";

import {
  launchGeneratedProject,
  loadGeneratedProjectWorld,
  openCreatedProjectFolder,
  saveGeneratedIdea,
  saveGeneratedProjectState,
} from "../dashboard/api.js";
import type {
  GeneratedProjectWorldSnapshot,
  GeneratedQuestBrief,
  GeneratedWorldView,
} from "../generated-project-world/shared.js";

function GeneratedCompanion() {
  return <span aria-label="Forge Companion focused" className="companion-core companion-focused companion-compact" role="img"><span className="companion-orbit orbit-a" /><span className="companion-orbit orbit-b" /><span className="companion-center" /></span>;
}

function GeneratedHeader({ active, projectName, onBack, onNavigate }: {
  active: GeneratedWorldView;
  projectName: string;
  onBack: () => void;
  onNavigate: (view: GeneratedWorldView) => void;
}) {
  return <header className="world-header generated-world-header"><button className="back-button" onClick={onBack} type="button"><span aria-hidden="true">←</span> Launchpad</button><div className="forge-brand"><GeneratedCompanion /><div><strong>Forge</strong><span>Living Game Workshop</span></div></div><nav aria-label="Generated project navigation">{(["project_world", "chronicle", "documents"] as const).map((view) => <button aria-current={active === view ? "page" : undefined} key={view} onClick={() => onNavigate(view)} type="button">{view === "project_world" ? "World" : view === "chronicle" ? "Chronicle" : "Documents"}</button>)}</nav><div className="world-project-title"><div><span className="v2-eyebrow">Generated Project World</span><h1>{projectName}</h1></div><span className="workspace-chip workspace-created">Created</span></div></header>;
}

function StarterPreview({ snapshot }: { snapshot: GeneratedProjectWorldSnapshot }) {
  return <section className="generated-starter" aria-labelledby="starter-preview-title"><div className="generated-preview-frame" aria-label="Code-native playable-state preview of the verified starter layout"><div className="preview-window-bar"><span><i /> {snapshot.playable.previewLabel.toUpperCase()}</span><strong>CODE-NATIVE · NOT A CAPTURED GODOT FRAME</strong></div><div className="generated-arena"><span className="generated-boundary" /><span className="generated-player">PLAYER</span><span className="generated-objective">OBJECTIVE</span><span className="generated-control">WASD / ARROWS</span></div></div><div className="generated-playable-copy"><p className="v2-eyebrow">{snapshot.playable.layoutLabel} · verification-derived</p><h2 id="starter-preview-title">{snapshot.playable.summary}</h2><ul>{snapshot.playable.facts.map((fact) => <li key={fact}>✓ {fact}</li>)}</ul><div className="planned-warning"><strong>Planned, not playable yet</strong>{snapshot.playable.plannedNotPlayable.map((item) => <span key={item}>{item}</span>)}</div></div></section>;
}

function QuestBrief({ quest, onClose }: { quest: GeneratedQuestBrief; onClose: () => void }) {
  return <main className="generated-quest-brief"><header><button className="back-button" onClick={onClose} type="button"><span aria-hidden="true">←</span> Project World</button><p className="v2-eyebrow">Quest {quest.sequence} · planning brief</p><h1>{quest.title}</h1><span className="planned-only-label">{quest.implementationLabel}</span></header><section className="quest-brief-promises"><article><p className="v2-eyebrow">{quest.outcomeLabel}</p><h2>{quest.visibleOutcome}</h2></article><article><p className="v2-eyebrow">Why it matters</p><h2>{quest.whyItMatters}</h2></article><article><p className="v2-eyebrow">Proof approach</p><h2>{quest.verificationIdeas.map((item) => item.idea).join(" ")}</h2></article></section><section className="quest-brief-details"><article><h2>Included scope</h2><ul>{quest.scope.included.map((item) => <li key={item}>{item}</li>)}</ul></article><article><h2>Excluded scope</h2><ul>{quest.scope.excluded.map((item) => <li key={item}>{item}</li>)}</ul></article><article><h2>Acceptance criteria</h2>{quest.acceptanceCriteria.map((criterion) => <div key={criterion.id}><strong>{criterion.id}</strong><p>{criterion.criterion}</p><small>Verification: {criterion.verificationIds.join(", ")}</small></div>)}</article><article><h2>Verification ideas</h2>{quest.verificationIdeas.map((idea) => <div key={idea.id}><strong>{idea.id}</strong><p>{idea.idea}</p></div>)}<h3>Dependencies</h3><p>{quest.dependsOn.length > 0 ? quest.dependsOn.join(" → ") : "Foundation quest · no dependencies"}</p></article></section><aside className="implementation-boundary"><GeneratedCompanion /><div><strong>Planning is ready; implementation is intentionally unavailable.</strong><p>Forge has not inferred a trustworthy code change for this generated quest. No Build button, Codex run, project mutation, or progress claim is available in Task 6.</p></div></aside></main>;
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
  useEffect(() => { if (notice?.startsWith("Idea saved")) statusRef.current?.focus(); }, [notice]);
  const selectedQuest = useMemo(() => snapshot.quests.find((quest) => quest.questId === snapshot.state.selectedQuestId) ?? snapshot.quests[0]!, [snapshot]);
  const update = (next: GeneratedProjectWorldSnapshot) => { setSnapshot(next); onSnapshot(next); };
  const persistView = async (currentView: GeneratedWorldView, selectedQuestId = snapshot.state.selectedQuestId) => {
    if (busy) return;
    setBusy(true);
    try { update(await saveGeneratedProjectState(snapshot.project.projectId, { currentView, selectedQuestId })); setError(null); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : String(nextError)); }
    finally { setBusy(false); }
  };
  const selectQuest = async (questId: string) => { await persistView("quest_brief", questId); };
  const closeBrief = async () => { const questId = snapshot.state.selectedQuestId; await persistView("project_world", questId); window.setTimeout(() => questButtons.current.get(questId)?.focus(), 0); };
  const saveIdea = async () => {
    if (!idea.trim() || busy) return;
    setBusy(true);
    try {
      await saveGeneratedIdea(snapshot.project.projectId, idea);
      const next = await loadGeneratedProjectWorld(snapshot.project.projectId);
      update(next);
      setIdea("");
      setNotice("Idea saved for future planning. No quest was created and no implementation started.");
      setError(null);
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : String(nextError)); }
    finally { setBusy(false); }
  };
  const launch = async () => { setBusy(true); try { const result = await launchGeneratedProject(snapshot.project.projectId); setNotice(result.message); setError(null); } catch (nextError) { setError(nextError instanceof Error ? nextError.message : String(nextError)); } finally { setBusy(false); } };
  const openFolder = async () => { setBusy(true); try { await openCreatedProjectFolder(snapshot.project.projectId); setNotice("Project folder opened."); setError(null); } catch (nextError) { setError(nextError instanceof Error ? nextError.message : String(nextError)); } finally { setBusy(false); } };

  const active = snapshot.state.currentView;
  if (active === "quest_brief") return <div className="project-world generated-project-world"><GeneratedHeader active={active} onBack={onBack} onNavigate={(view) => void persistView(view)} projectName={snapshot.project.displayName} />{error && <p className="workflow-error" role="alert">{error}</p>}<QuestBrief onClose={() => void closeBrief()} quest={selectedQuest} /></div>;
  return <div className="project-world generated-project-world"><GeneratedHeader active={active} onBack={onBack} onNavigate={(view) => void persistView(view)} projectName={snapshot.project.displayName} />{error && <p className="workflow-error" role="alert">{error}</p>}{notice && <p className="workflow-notice generated-live-status" ref={statusRef} role="status" tabIndex={-1}>{notice}</p>}{snapshot.state.repairNotice && <p className="workflow-notice" role="status">{snapshot.state.repairNotice}</p>}{active === "chronicle" ? <ChronicleView snapshot={snapshot} /> : active === "documents" ? <DocumentsView snapshot={snapshot} /> : <main className="generated-world-main"><section className="generated-identity"><div><p className="v2-eyebrow">{snapshot.project.foundationLabel} · {snapshot.project.engineLabel}</p><h1>{snapshot.project.displayName}</h1><p>{snapshot.vision.vision}</p></div><aside><span>First playable milestone</span><strong>{snapshot.firstPlayable.outcome}</strong></aside></section><StarterPreview snapshot={snapshot} /><section className="generated-roadmap" aria-labelledby="generated-roadmap-title"><header><div><p className="v2-eyebrow">Persisted game assembly roadmap</p><h2 id="generated-roadmap-title">Four planned quests toward First Playable</h2></div><span>{snapshot.roadmap.quests.length} planned · 0 implemented by Task 6</span></header><div className="generated-roadmap-rail">{snapshot.roadmap.quests.map((node, index) => <div className="generated-roadmap-step" key={node.questId}>{index > 0 && <span className="generated-dependency" aria-label={`Depends on ${node.dependsOn.join(", ")}`}>→</span>}<button aria-current={snapshot.state.selectedQuestId === node.questId ? "step" : undefined} className={`generated-quest-node state-${node.state}`} onClick={() => void selectQuest(node.questId)} ref={(element) => { if (element) questButtons.current.set(node.questId, element); else questButtons.current.delete(node.questId); }} type="button"><small>Quest {index + 1} · {node.state === "available" ? "Available to plan" : "Planned dependency"}</small><strong>{node.title}</strong><p>{node.summary}</p><em>{node.dependsOn.length > 0 ? `After ${node.dependsOn.join(", ")}` : "Foundation quest"}</em><span>Open planning brief →</span></button>{snapshot.state.selectedQuestId === node.questId && <aside className="generated-companion-note"><GeneratedCompanion /><p>{node.state === "available" ? "This is the recommended planning brief. Generated quest implementation is not enabled yet." : "This planned quest depends on earlier roadmap work. Implementation is not enabled yet."}</p></aside>}</div>)}</div></section><section className="generated-world-lower"><article><p className="v2-eyebrow">Recent project activity</p><h2>Chronicle and idea activity</h2>{snapshot.activity.slice(0, 3).map((item) => <p key={item.activityId}><strong>{item.label}</strong><br />{item.summary}</p>)}<button className="v2-button button-quiet" onClick={() => void persistView("chronicle")} type="button">View Chronicle</button></article><article><p className="v2-eyebrow">Project-local documentation</p><h2>{snapshot.documents.length} validated records</h2><p>Vision, milestone, roadmap, Chronicle, and project overview remain available without scanning arbitrary files.</p><button className="v2-button button-quiet" onClick={() => void persistView("documents")} type="button">View documents</button></article><article className="generated-actions"><p className="v2-eyebrow">Verified starter actions</p><h2>Open the real project</h2><button className="v2-button button-ember" disabled={busy} onClick={() => void launch()} type="button">Launch in Godot</button><button className="v2-button button-quiet" disabled={busy} onClick={() => void openFolder()} type="button">Open project folder</button><small>Launch uses pinned Godot and the canonical registered path.</small></article></section></main>}<section className="idea-dock generated-idea-dock" aria-labelledby="generated-idea-title"><span className="idea-dock-icon">✦</span><div className="idea-dock-label"><span className="v2-eyebrow">Idea seed · persisted planning input</span><h2 id="generated-idea-title">What should Forge remember for later?</h2></div><label className="idea-input"><span className="sr-only">Save an idea for future planning</span><input maxLength={500} onChange={(event) => setIdea(event.target.value)} placeholder="Leave a fading ring after each pulse…" type="text" value={idea} /><button aria-label="Save idea seed" disabled={busy || !idea.trim()} onClick={() => void saveIdea()} type="button">→</button></label></section></div>;
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
