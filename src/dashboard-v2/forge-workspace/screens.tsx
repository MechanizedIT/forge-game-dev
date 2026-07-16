import { useMemo, useState, type FormEvent } from "react";

import type { RecentProjectSummary } from "../../project-creation/shared.js";
import type { GameAreaMutation, ProjectArchitecture } from "../../contracts/index.js";
import { imageFor } from "./art.js";
import { Breadcrumbs, EmptyState, EntityCarousel, HierarchyHero, Icon, StatusBadge } from "./components.js";
import { childKind, kindLabels, type EntityKind, type ForgeEntity, type ForgeRepair, type ForgeWorldState } from "./model.js";
import { ancestorsOf } from "./routes.js";

export function WorldForgeScreen({ onExisting, onNew }: { onExisting: () => void; onNew: () => void }) {
  return <section className="world-forge-screen"><header><p className="screen-kicker">Start here</p><h1>What kind of World are we shaping?</h1><p>Begin with an idea or reopen a Godot project. Forge will keep the big picture and the next small Step in one place.</p></header><div className="world-forge-actions"><button onClick={onNew} type="button"><span className="forge-action-art new-world-art"><Icon name="spark" /></span><span><small>Start from an idea</small><b>Forge a New World</b><p>Talk through the game, create the project, and turn the idea into a visual roadmap.</p><em>Idea → plan → playable</em></span><Icon name="chevron" /></button><button onClick={onExisting} type="button"><span className="forge-action-art existing-world-art"><Icon name="folder" /></span><span><small>Continue real work</small><b>Open an Existing World</b><p>Reopen a Forge World and continue its saved Experiences, Steps, work, and checks.</p><em>Restart-safe local Worlds</em></span><Icon name="chevron" /></button></div><aside className="world-forge-note"><span className="forgie-orb"><i /><b /></span><div><strong>Not sure where to begin?</strong><p>Start with one thing the player should be able to do. Forge can help make the rest smaller.</p></div></aside></section>;
}

export function ExistingWorldsScreen({ busy, onNew, onOpenPrototype, onOpenReal, recent }: {
  busy: boolean;
  onNew: () => void;
  onOpenPrototype: () => void;
  onOpenReal: (projectId: string) => void;
  recent: RecentProjectSummary[];
}) {
  const [query, setQuery] = useState("");
  const matching = recent.filter((project) => project.displayName.toLowerCase().includes(query.toLowerCase()));
  return <section className="tool-screen existing-worlds-screen"><header className="tool-screen-header"><div><p className="screen-kicker">World Forge</p><h1>Your Worlds</h1><p>Open the visual Rust Runner prototype or continue a real Forge-owned Godot World.</p></div><button className="forge-primary-button" onClick={onNew} type="button"><Icon name="plus" /> New World</button></header><label className="forge-search"><Icon name="search" /><span className="sr-only">Search Worlds</span><input onChange={(event) => setQuery(event.target.value)} placeholder="Search your Worlds…" value={query} /></label><div className="world-card-grid"><button className="world-select-card featured" onClick={onOpenPrototype} type="button"><img alt="" src={imageFor("world-rust-runner")} /><span><StatusBadge status="building" /><h2>Rust Runner</h2><p>Casual endless side-scroller</p><small>Visual prototype · 4 Experiences</small></span></button>{matching.map((project) => <button className="world-select-card" disabled={!project.available || busy} key={project.projectId} onClick={() => onOpenReal(project.projectId)} type="button"><span className="real-world-placeholder"><Icon name="folder" /></span><span><StatusBadge status={project.available ? "ready" : "attention"} /><h2>{project.displayName}</h2><p>Real Forge World</p><small>{project.stateLabel} · {project.questCount ?? 0} Steps</small></span></button>)}</div>{!matching.length && query && <EmptyState action="Clear search" body="Try a different World name." onAction={() => setQuery("")} title="No Worlds match that search" />}</section>;
}

export function WorldMapScreen({ current, onAdd, onEdit, onOpen, onPrimary, state }: {
  current: ForgeEntity;
  onAdd: (kind: EntityKind) => void;
  onEdit: () => void;
  onOpen: (entity: ForgeEntity) => void;
  onPrimary: () => void;
  state: ForgeWorldState;
}) {
  const path = ancestorsOf(state, current);
  const nextKind = current.kind === "part" ? null : childKind[current.kind];
  const items = current.childIds.map((id) => state.entities[id]).filter(Boolean) as ForgeEntity[];
  return <section className="world-map-screen"><header className="map-title"><p className="screen-kicker">Explore your World</p><span>Move from the big idea to the next thing worth building.</span></header><HierarchyHero entity={current} onEdit={onEdit} onPrimary={onPrimary} /><Breadcrumbs entities={path} onOpen={onOpen} />{nextKind && (items.length ? <EntityCarousel items={items} kind={nextKind} onAdd={() => onAdd(nextKind)} onOpen={onOpen} /> : <EmptyState action={"Add " + kindLabels[nextKind]} body={"This " + kindLabels[current.kind] + " has no " + kindLabels[nextKind].toLowerCase() + "s yet. Add one clear next Step."} onAction={() => onAdd(nextKind)} title={"Build out " + current.name} />)}</section>;
}

export function PartDetailScreen({ onAction, onBack, part, state }: { onAction: (action: string) => void; onBack: () => void; part: ForgeEntity; state: ForgeWorldState }) {
  const path = ancestorsOf(state, part);
  return <section className="tool-screen part-detail-screen"><header className="detail-header"><button className="back-button-v3" onClick={onBack} type="button"><Icon name="back" /> Back to Experience</button><StatusBadge status={part.status} /><p className="screen-kicker">Step detail</p><h1>{part.name}</h1><p>{path.map((item) => item.name).join(" › ")}</p></header><div className="part-detail-grid"><article className="detail-card primary-detail"><img alt="" src={imageFor(part.imageRef)} /><h2>{part.outcome}</h2><p>{part.description}</p><h3>Success looks like</h3><ol className="check-list">{part.acceptanceCriteria.map((criterion, index) => <li key={criterion}><span>{index === 0 && part.progress > 50 ? <Icon name="check" /> : index + 1}</span>{criterion}</li>)}</ol></article><aside><section className="detail-card"><p className="panel-kicker">Related context</p>{part.relatedFiles.length ? part.relatedFiles.map((file) => <span className="related-file" key={file}><Icon name={file.endsWith(".tscn") ? "assets" : "folder"} /> {file}</span>) : <p>No related files chosen yet.</p>}</section><section className="detail-card"><p className="panel-kicker">What Forgie will do</p><h2>Give Codex one small job.</h2><p>Forgie will show the files and checks before anything changes.</p><button className="forge-primary-button wide" onClick={() => onAction("build-part")} type="button"><Icon name="build" /> Start Building</button><div className="secondary-action-grid"><button onClick={() => onAction("review")} type="button">Review Files</button><button onClick={() => onAction("test")} type="button">Test</button><button onClick={() => onAction("repair")} type="button">Repair</button><button onClick={() => onAction("complete")} type="button">Mark complete</button></div></section></aside></div></section>;
}

export function EntityFormScreen({ kind, mode, onCancel, onSave, parent, target }: {
  kind: EntityKind;
  mode: "add" | "edit";
  onCancel: () => void;
  onSave: (value: { name: string; description: string; outcome: string }) => void;
  parent?: ForgeEntity;
  target?: ForgeEntity;
}) {
  const [name, setName] = useState(target?.name ?? "");
  const [description, setDescription] = useState(target?.description ?? "");
  const [outcome, setOutcome] = useState(target?.outcome ?? "");
  const submit = (event: FormEvent) => { event.preventDefault(); if (name.trim() && description.trim()) onSave({ name: name.trim(), description: description.trim(), outcome: outcome.trim() }); };
  const explanations: Record<EntityKind, string> = {
    world: "A World is the whole game and its big promise.",
    region: "A Region is an optional prototype grouping and is not needed for normal work.",
    town: "A Town is an optional prototype grouping and is not needed for normal work.",
    building: "An Experience is a playable outcome the creator can see, feel, or verify.",
    part: "A Step is one bounded piece of work. It may involve code, art, audio, UI, tests, settings, or notes.",
  };
  return <section className="tool-screen entity-form-screen"><header className="tool-screen-header"><div><button className="back-button-v3" onClick={onCancel} type="button"><Icon name="back" /> Back</button><p className="screen-kicker">{mode === "add" ? "Create the next Step" : "Keep the plan clear"}</p><h1>{mode === "add" ? "Add " : "Edit "}{kindLabels[kind]}</h1><p>{parent ? "Inside " + parent.name : target?.name}</p></div></header><form className="entity-form" onSubmit={submit}><section className="form-card"><label><span>{kindLabels[kind]} name</span><input autoFocus maxLength={60} onChange={(event) => setName(event.target.value)} placeholder={"Name this " + kindLabels[kind]} required value={name} /></label><label><span>{kind === "building" ? "Playable outcome" : kind === "part" ? "What needs to change" : "Purpose and description"}</span><textarea maxLength={500} onChange={(event) => setDescription(event.target.value)} placeholder="Explain it in plain language." required value={description} /></label><label><span>{kind === "part" ? "What success looks like" : "Expected outcome"}</span><textarea maxLength={360} onChange={(event) => setOutcome(event.target.value)} placeholder="What will be true when this is done?" value={outcome} /></label></section><aside className="form-card forgie-explanation"><span className="forgie-orb"><i /><b /></span><p className="panel-kicker">Forgie explains</p><h2>{explanations[kind]}</h2><p>Keep it outcome-focused. Technical file choices can come later, when the work order is reviewed.</p><div className="form-actions"><button className="forge-secondary-button" onClick={onCancel} type="button">Cancel</button><button className="forge-primary-button" disabled={!name.trim() || !description.trim()} type="submit">{mode === "add" ? "Add " : "Save "}{kindLabels[kind]}</button></div></aside></form></section>;
}

type AtlasFilter = "all" | EntityKind | "repair" | "file" | "game-area";

function GameAreaCard({ architecture, areaId, onMutation, state }: { architecture: ProjectArchitecture; areaId: string; onMutation?: (mutation: GameAreaMutation) => Promise<void>; state: ForgeWorldState }) {
  const area = architecture.gameAreas.find((candidate) => candidate.id === areaId)!;
  const [name, setName] = useState(area.name);
  const [description, setDescription] = useState(area.description);
  const [files, setFiles] = useState(area.relatedFilePaths.join("\n"));
  const [dependencies, setDependencies] = useState(area.dependencyIds);
  const [duplicate, setDuplicate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async (mutation: GameAreaMutation) => {
    if (!onMutation || busy) return;
    setBusy(true);
    try { await onMutation(mutation); setError(null); } catch (next) { setError(next instanceof Error ? next.message : String(next)); } finally { setBusy(false); }
  };
  const experiences = area.relatedExperienceIds.map((id) => state.entities[id]?.name).filter(Boolean);
  const steps = area.relatedStepIds.map((id) => state.entities[id]?.name).filter(Boolean).slice(-5);
  const dependencyNames = area.dependencyIds.map((id) => architecture.gameAreas.find((candidate) => candidate.id === id)?.name).filter(Boolean);
  return <article className="atlas-card game-area-result"><span className="atlas-type-icon"><Icon name="build" /></span><span><small>Game Area · {area.category}</small><b>{area.name}</b><p>{area.description}</p><em>{experiences.length ? `Experiences: ${experiences.join(" · ")}` : "No linked Experience yet"}</em>{steps.length > 0 && <em>Recent Steps: {steps.join(" · ")}</em>}{area.relatedFilePaths.slice(0, 4).map((file) => <code key={file}>{file}</code>)}{dependencyNames.length > 0 && <em>Depends on: {dependencyNames.join(" · ")}</em>}<details className="advanced-details"><summary>Advanced Details</summary><label><span>Name</span><input disabled={!onMutation || busy} maxLength={80} onChange={(event) => setName(event.target.value)} value={name} /></label><label><span>Description</span><textarea disabled={!onMutation || busy} maxLength={500} onChange={(event) => setDescription(event.target.value)} value={description} /></label><button disabled={!onMutation || busy || !name.trim() || !description.trim()} onClick={() => void save({ action: "edit", areaId, name: name.trim(), description: description.trim() })} type="button">Save description</button><label><span>Related files · one per line</span><textarea disabled={!onMutation || busy} onChange={(event) => setFiles(event.target.value)} value={files} /></label><button disabled={!onMutation || busy} onClick={() => void save({ action: "set_files", areaId, relatedFilePaths: files.split(/\r?\n/u).map((file) => file.trim()).filter(Boolean) })} type="button">Save files</button><fieldset><legend>Dependencies</legend>{architecture.gameAreas.filter((candidate) => candidate.id !== areaId).map((candidate) => <label key={candidate.id}><input checked={dependencies.includes(candidate.id)} disabled={!onMutation || busy} onChange={(event) => setDependencies((current) => event.target.checked ? [...current, candidate.id] : current.filter((id) => id !== candidate.id))} type="checkbox" /> {candidate.name}</label>)}</fieldset><button disabled={!onMutation || busy} onClick={() => void save({ action: "set_dependencies", areaId, dependencyIds: dependencies })} type="button">Save dependencies</button><label><span>Merge a duplicate into this area</span><select disabled={!onMutation || busy} onChange={(event) => setDuplicate(event.target.value)} value={duplicate}><option value="">Choose duplicate…</option>{architecture.gameAreas.filter((candidate) => candidate.id !== areaId).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select></label><button disabled={!onMutation || busy || !duplicate} onClick={() => void save({ action: "merge", areaId, duplicateAreaId: duplicate })} type="button">Merge duplicate</button>{error && <p className="workflow-error" role="alert">{error}</p>}</details></span></article>;
}

export function AtlasScreen({ architecture, onArchitectureMutation, onOpen, onRepair, state }: { architecture?: ProjectArchitecture; onArchitectureMutation?: (mutation: GameAreaMutation) => Promise<void>; onOpen: (entity: ForgeEntity) => void; onRepair: (repair: ForgeRepair) => void; state: ForgeWorldState }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AtlasFilter>("all");
  const filters: Array<{ id: AtlasFilter; label: string }> = [
    { id: "all", label: "All" }, { id: "region", label: "Regions" }, { id: "town", label: "Towns" },
    { id: "building", label: "Experiences" }, { id: "part", label: "Steps" }, { id: "game-area", label: "Game Areas" }, { id: "repair", label: "Repairs" }, { id: "file", label: "Files" },
  ];
  const term = query.trim().toLowerCase();
  const entities = Object.values(state.entities).filter((item) => item.kind !== "world" && (filter === "all" || filter === item.kind) && (!term || [item.name, item.description, item.outcome, ...item.relatedFiles].join(" ").toLowerCase().includes(term)));
  const repairs = state.repairs.filter((item) => (filter === "all" || filter === "repair") && (!term || [item.title, item.description].join(" ").toLowerCase().includes(term)));
  const files = Array.from(new Set(Object.values(state.entities).flatMap((item) => item.relatedFiles))).filter((file) => (filter === "all" || filter === "file") && (!term || file.toLowerCase().includes(term)));
  const gameAreas = (architecture?.gameAreas ?? []).filter((area) => (filter === "all" || filter === "game-area") && (!term || [area.name, area.description, ...area.relatedFilePaths].join(" ").toLowerCase().includes(term)));
  return <section className="tool-screen atlas-screen"><header className="tool-screen-header"><div><p className="screen-kicker">World-wide search</p><h1>Atlas</h1><p>Find a mechanic, plan, Game Area, repair, asset, or file without remembering where it lives.</p></div></header><label className="atlas-search"><Icon name="search" /><span className="sr-only">Search Atlas</span><input onChange={(event) => setQuery(event.target.value)} placeholder="Try “movement”, “jump”, or “collision”…" value={query} /><span className="forgie-search">Forgie can search plain questions</span></label><div className="filter-chips" role="group" aria-label="Atlas filters">{filters.map((item) => <button aria-pressed={filter === item.id} key={item.id} onClick={() => setFilter(item.id)} type="button">{item.label}</button>)}</div><div className="atlas-results">{entities.map((item) => <button className="atlas-card" key={item.id} onClick={() => onOpen(item)} type="button"><img alt="" src={imageFor(item.imageRef)} /><span><small>{kindLabels[item.kind]}</small><b>{item.name}</b><p>{item.description}</p><em>{ancestorsOf(state, item).map((parent) => parent.name).join(" › ")}</em></span><StatusBadge status={item.status} /></button>)}{gameAreas.map((area) => <GameAreaCard architecture={architecture!} areaId={area.id} key={area.id} onMutation={onArchitectureMutation} state={state} />)}{repairs.map((repair) => <button className="atlas-card repair-result" key={repair.id} onClick={() => onRepair(repair)} type="button"><span className="atlas-type-icon"><Icon name="repair" /></span><span><small>Repair</small><b>{repair.title}</b><p>{repair.description}</p><em>{repair.entityIds.map((id) => state.entities[id]?.name).filter(Boolean).join(" · ")}</em></span><StatusBadge status={repair.status} /></button>)}{files.map((file) => <article className="atlas-card file-result" key={file}><span className="atlas-type-icon"><Icon name="folder" /></span><span><small>File</small><b>{file.split("/").pop()}</b><p>{file}</p></span></article>)}</div>{!entities.length && !gameAreas.length && !repairs.length && !files.length && <EmptyState action="Clear search" body="Try a broader word or switch back to All." onAction={() => { setFilter("all"); setQuery(""); }} title="Nothing matched" />}</section>;
}

export function BuildScreen({ onOpen, state }: { onOpen: (entity: ForgeEntity) => void; state: ForgeWorldState }) {
  const work = Object.values(state.entities).filter((item) => item.kind === "building" || item.kind === "part");
  const groups = [
    { title: "In Progress", body: "Work currently active.", statuses: ["building"] },
    { title: "Build Next", body: "Ready and recommended work.", statuses: ["ready", "planned"] },
    { title: "Needs Attention", body: "Blocked work and repairs.", statuses: ["attention"] },
  ] as const;
  return <section className="tool-screen build-screen"><header className="tool-screen-header"><div><p className="screen-kicker">Operational work view</p><h1>Build</h1><p>See what is active, what is ready, and what needs help.</p></div><span className="live-work-chip"><i /> Local prototype plan</span></header><div className="build-columns">{groups.map((group) => { const cards = work.filter((item) => group.statuses.includes(item.status as never)); return <section key={group.title}><header><h2>{group.title}</h2><p>{group.body}</p><span>{cards.length}</span></header><div>{cards.slice(0, 5).map((item) => <button className="build-card" key={item.id} onClick={() => onOpen(item)} type="button"><span><small>{kindLabels[item.kind]}</small><StatusBadge status={item.status} /></span><h3>{item.name}</h3><p>{item.outcome}</p><span><b>{item.progress}%</b><i className="mini-progress"><em style={{ width: item.progress + "%" }} /></i></span></button>)}{!cards.length && <p className="column-empty">Nothing here right now.</p>}</div></section>; })}</div></section>;
}

export function RepairScreen({ onToast, state }: { onToast: (message: string) => void; state: ForgeWorldState }) {
  const [problem, setProblem] = useState("");
  const submit = (event: FormEvent) => { event.preventDefault(); if (!problem.trim()) return; onToast("Repair context staged. Forge will ask for reproduction details next."); setProblem(""); };
  return <section className="tool-screen repair-screen"><header className="tool-screen-header"><div><p className="screen-kicker">Debugging without the guesswork</p><h1>Repair</h1><p>Describe what should happen and what happened instead. Forge will gather a small, focused repair context.</p></div></header><form className="repair-intake" onSubmit={submit}><span className="forgie-orb"><i /><b /></span><label><span>What went wrong?</span><textarea onChange={(event) => setProblem(event.target.value)} placeholder="The robot sometimes falls through a platform after landing…" value={problem} /></label><button className="forge-primary-button" disabled={!problem.trim()} type="submit"><Icon name="repair" /> Start repair</button></form><div className="repair-list">{state.repairs.map((repair) => <article key={repair.id}><span className="repair-icon"><Icon name="repair" /></span><div><StatusBadge status={repair.status} /><h2>{repair.title}</h2><p>{repair.description}</p><small>Affects {repair.entityIds.map((id) => state.entities[id]?.name).filter(Boolean).join(" · ")}</small></div><button onClick={() => onToast("Opened repair context for " + repair.title + ".")} type="button">Open <Icon name="chevron" /></button></article>)}</div></section>;
}

export function PublishScreen({ onCheck, state }: { onCheck: () => void; state: ForgeWorldState }) {
  const [platforms, setPlatforms] = useState(() => new Set(["Windows"]));
  const unfinished = Object.values(state.entities).filter((item) => item.kind === "building" && item.progress < 100).length;
  const checks = [
    { label: "Windows export preset", detail: "Configuration found", done: true },
    { label: "Playable opening loop", detail: "Creator playtest still recommended", done: false },
    { label: "Unfinished Experiences", detail: unfinished + " still open", done: false },
    { label: "Open repairs", detail: state.repairs.length + " to review", done: false },
    { label: "Store images and copy", detail: "Not added yet", done: false },
  ];
  const togglePlatform = (platform: string) => setPlatforms((current) => { const next = new Set(current); if (next.has(platform)) next.delete(platform); else next.add(platform); return next; });
  return <section className="tool-screen publish-screen"><header className="publish-hero"><div><p className="screen-kicker">Prepare a release</p><h1>Publish with confidence.</h1><p>Forge gathers the unfinished work, repairs, exports, and store needs into one calm checklist.</p><button className="forge-primary-button" onClick={onCheck} type="button"><Icon name="publish" /> Start Release Check</button></div><span className="release-orbit"><Icon name="publish" /></span></header><div className="publish-grid"><section className="release-score"><span>Release readiness</span><strong>42%</strong><i><b style={{ width: "42%" }} /></i><p>The first playable loop needs a creator check before release.</p></section><section className="release-checklist"><h2>Release checklist</h2>{checks.map((check) => <article key={check.label}><span className={check.done ? "done" : ""}>{check.done ? <Icon name="check" /> : "!"}</span><div><b>{check.label}</b><small>{check.detail}</small></div></article>)}</section><aside className="target-platforms"><h2>Target platforms</h2>{["Windows", "Web", "Linux"].map((platform) => <button aria-pressed={platforms.has(platform)} key={platform} onClick={() => togglePlatform(platform)} type="button">{platform}{platforms.has(platform) ? <Icon name="check" /> : <span>Not selected</span>}</button>)}</aside></div></section>;
}

export function ForgieDrawer({ context, onClose, onSubmit }: { context: ForgeEntity; onClose: () => void; onSubmit: (value: string) => void }) {
  const [value, setValue] = useState("");
  const suggestions = ["Build something new", "Find an existing mechanic", "Fix a bug", "Test the game"];
  return <div className="forgie-backdrop" role="presentation"><section aria-labelledby="forgie-title" aria-modal="true" className="forgie-drawer" role="dialog"><header><span className="forgie-orb"><i /><b /></span><div><small>Current context · {kindLabels[context.kind]}</small><h2 id="forgie-title">Ask Forgie</h2></div><button aria-label="Close Forgie" onClick={onClose} type="button"><Icon name="close" /></button></header><p>What should we do with <strong>{context.name}</strong>?</p><div className="forgie-suggestions">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => setValue(suggestion + " for " + context.name)} type="button">{suggestion}</button>)}</div><label><span>Describe something to build, find, fix, or test.</span><textarea autoFocus onChange={(event) => setValue(event.target.value)} placeholder="Tell Forgie what you want to happen…" value={value} /></label><button className="forge-primary-button wide" disabled={!value.trim()} onClick={() => onSubmit(value.trim())} type="button"><Icon name="spark" /> Continue with Forgie</button><small>This prototype stages the request locally. It does not start Codex without a work-order review.</small></section></div>;
}
