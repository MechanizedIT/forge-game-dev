import { useRef, useState, type ReactNode, type WheelEvent } from "react";

import { imageFor } from "./art.js";
import forgieLogo from "./assets/forgie-game-dev-workshop.png";
import { childKind, kindLabels, type EntityKind, type ForgeEntity, type ForgeWorldState } from "./model.js";

export type ForgeDestination = "forge" | "map" | "atlas" | "build" | "publish";
export type IconName = "anvil" | "home" | "map" | "atlas" | "build" | "publish" | "back" | "edit" | "plus" | "chevron" | "repair" | "test" | "assets" | "spark" | "search" | "folder" | "play" | "check" | "close" | "panel";

export function Icon({ name }: { name: IconName }) {
  const path: Record<IconName, ReactNode> = {
    anvil: <path d="M4 5h16v3l-5 4v5h3v2H6v-2h3v-5L4 8V5Zm3 2 4 3h2l4-3H7Z" />,
    home: <><path d="m4 11 8-7 8 7" /><path d="M6 10v9h12v-9M10 19v-5h4v5" /></>,
    map: <><path d="m4 6 5-2 6 2 5-2v14l-5 2-6-2-5 2V6Z" /><path d="M9 4v14M15 6v14" /></>,
    atlas: <><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16" /></>,
    build: <path d="m14 6 4-2 2 2-2 4-3 1-6 6-2 3-3-3 3-2 6-6 1-3Z" />,
    publish: <><path d="M12 3c4 2 6 5 6 9l-4 2-2 5-2-5-4-2c0-4 2-7 6-9Z" /><circle cx="12" cy="9" r="2" /></>,
    back: <path d="m11 5-7 7 7 7M4 12h16" />,
    edit: <path d="m4 16-1 5 5-1L19 9l-4-4L4 16Zm9-9 4 4" />,
    plus: <path d="M12 5v14M5 12h14" />,
    chevron: <path d="m9 6 6 6-6 6" />,
    repair: <><path d="M14 6a4 4 0 0 0-5 5l-5 5 4 4 5-5a4 4 0 0 0 5-5l-3 2-3-3 2-3Z" /></>,
    test: <><path d="M8 3v5l-4 9c-.7 1.6.4 3 2 3h12c1.6 0 2.7-1.4 2-3l-4-9V3" /><path d="M7 14h10M7 3h10" /></>,
    assets: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m5 17 5-4 3 2 2-2 4 4" /></>,
    spark: <path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z" />,
    search: <><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></>,
    folder: <path d="M3 6h7l2 2h9v10H3V6Z" />,
    play: <path d="m9 6 9 6-9 6V6Z" />,
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    panel: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M15 4v16" /></>,
  };
  return <svg aria-hidden="true" className="forge-icon" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">{path[name]}</svg>;
}

export function ForgeBrand() {
  return <div className="forge-v3-brand" aria-label="Forgie Game Dev Workshop"><img alt="Forgie Game Dev Workshop" src={forgieLogo} /></div>;
}

function navLabel(destination: ForgeDestination): string {
  return { forge: "World Forge", map: "World Map", atlas: "Atlas", build: "Build", publish: "Publish" }[destination];
}

export function TopNavigation({ active, onNavigate }: { active: ForgeDestination; onNavigate: (destination: ForgeDestination) => void }) {
  const icons: Record<ForgeDestination, IconName> = { forge: "home", map: "map", atlas: "atlas", build: "build", publish: "publish" };
  const [profileOpen, setProfileOpen] = useState(false);
  return <header className="forge-v3-topbar"><ForgeBrand /><nav aria-label="Primary navigation">{(Object.keys(icons) as ForgeDestination[]).map((destination) => <button aria-current={active === destination ? "page" : undefined} key={destination} onClick={() => onNavigate(destination)} type="button"><Icon name={icons[destination]} /><span>{navLabel(destination)}</span></button>)}</nav><div className="profile-menu-wrap"><button aria-expanded={profileOpen} aria-label="Account menu" className="profile-button" onClick={() => setProfileOpen((open) => !open)} type="button"><span>F</span><Icon name="chevron" /></button>{profileOpen && <aside className="profile-menu"><strong>Local Forge workspace</strong><span>No account or cloud sign-in is needed.</span><small>Projects stay on this computer.</small></aside>}</div></header>;
}

function ProgressBar({ value }: { value: number }) {
  return <span aria-label={value + "% complete"} className="forge-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><i style={{ width: value + "%" }} /></span>;
}

export function ProjectRail({ state }: { state: ForgeWorldState }) {
  const world = state.entities[state.worldId]!;
  const worldBuildings = world.childIds.map((id) => state.entities[id]).filter((item) => item?.kind === "building") as ForgeEntity[];
  const buildings = Object.values(state.entities).filter((item) => item.kind === "building");
  const completedWorldBuildings = worldBuildings.filter((item) => item.status === "complete").length;
  const completedBuildings = buildings.filter((item) => item.status === "complete").length;
  return <aside className="forge-project-rail" aria-label="World overview"><section className="forge-panel world-summary"><p className="panel-kicker">Current World</p><img alt="" src={imageFor(world.imageRef)} /><h2>{world.name}</h2><p>{world.description.split(".")[0]}</p><strong>{completedWorldBuildings} / {worldBuildings.length}<small> Experiences complete</small></strong><ProgressBar value={world.progress} /><div className="summary-stats"><span><b>{completedBuildings} / {buildings.length}</b><small>Experiences</small></span><span><b>{state.repairs.length}</b><small>Open repairs</small></span></div></section><section className="forge-panel recent-panel"><p className="panel-kicker">Recently updated</p>{state.activity.map((activity) => <article key={activity.id}><span className={"activity-dot tone-" + activity.tone} /><div><strong>{activity.title}</strong><small>{activity.detail}</small></div><time>{activity.when}</time></article>)}</section></aside>;
}

export function InspectorRail({ current, onAction, onEdit, state }: { current: ForgeEntity; onAction: (action: string) => void; onEdit: () => void; state: ForgeWorldState }) {
  const children = current.childIds.map((id) => state.entities[id]).filter(Boolean) as ForgeEntity[];
  const complete = children.filter((item) => item.status === "complete").length;
  const nextKind = current.kind === "part" ? "check" : childKind[current.kind];
  return <aside className="forge-inspector-rail" aria-label="Inspector"><section className="forge-panel inspector-panel"><p className="panel-kicker">Inspector</p><img alt="" src={imageFor(current.imageRef)} /><span className="entity-label">{kindLabels[current.kind]}</span><h2>{current.name}</h2><p>{current.description}</p><div className="inspector-stats"><span><b>{current.kind === "part" ? current.acceptanceCriteria.length : complete + " / " + children.length}</b><small>{current.kind === "part" ? "Checks" : kindLabels[nextKind as EntityKind] + "s complete"}</small></span><span><b>{current.progress}%</b><small>Complete</small></span></div><ProgressBar value={current.progress} /><div className="rail-actions"><button onClick={onEdit} type="button"><Icon name="edit" /> Edit</button><button onClick={() => onAction("atlas")} type="button"><Icon name="atlas" /> Atlas</button></div></section><section className="forge-panel quick-actions"><p className="panel-kicker">Quick actions</p><div><button onClick={() => onAction("repair")} type="button"><Icon name="repair" /><b>Repair</b><small>Fix a problem</small></button><button onClick={() => onAction("test")} type="button"><Icon name="test" /><b>Test</b><small>Play and check</small></button><button onClick={() => onAction("assets")} type="button"><Icon name="assets" /><b>Assets</b><small>Art, sound, files</small></button><button onClick={() => onAction("create")} type="button"><Icon name="plus" /><b>Create</b><small>Add to this level</small></button></div></section><ForgiePanel onOpen={() => onAction("forgie")} /></aside>;
}

export function ForgiePanel({ onOpen }: { onOpen: () => void }) {
  return <button className="forge-panel forgie-panel" onClick={onOpen} type="button"><span className="forgie-orb"><i /><b /></span><span><small>Ask Forgie</small><strong>What Step should we work on?</strong><em>Build, find, fix, or test something.</em></span><Icon name="chevron" /></button>;
}

export function ActiveWorkBanner({ canStop, name, onOpen, onStop, status }: { canStop: boolean; name: string; onOpen: () => void; onStop: () => void; status: string }) {
  return <aside className="active-work-banner" role="status"><span className="active-work-pulse" /><div><strong>Work is already open: {name}</strong><p>{status} {canStop ? "Forge pauses new Experiences until you continue or stop this Step." : "Forge pauses new Experiences while this Step needs your attention."}</p></div><button className="forge-primary-button" onClick={onOpen} type="button">Open active Step</button>{canStop && <button className="forge-secondary-button" onClick={onStop} type="button">Stop safely</button>}</aside>;
}

export function WorkspaceShell({ active, children, current, hideRails = false, onAction, onEdit, onNavigate, state }: {
  active: ForgeDestination;
  children: ReactNode;
  current: ForgeEntity;
  hideRails?: boolean;
  onAction: (action: string) => void;
  onEdit: () => void;
  onNavigate: (destination: ForgeDestination) => void;
  state: ForgeWorldState;
}) {
  const [drawer, setDrawer] = useState<"project" | "inspector" | null>(null);
  return <div className="forge-v3-app"><TopNavigation active={active} onNavigate={onNavigate} /><div className={"forge-workspace" + (hideRails ? " rails-hidden" : "")}><div className={"mobile-drawer project-drawer" + (drawer === "project" ? " open" : "")}><button aria-label="Close project panel" className="drawer-close" onClick={() => setDrawer(null)} type="button"><Icon name="close" /></button><ProjectRail state={state} /></div><main className="forge-main-viewport">{children}</main><div className={"mobile-drawer inspector-drawer" + (drawer === "inspector" ? " open" : "")}><button aria-label="Close inspector" className="drawer-close" onClick={() => setDrawer(null)} type="button"><Icon name="close" /></button><InspectorRail current={current} onAction={onAction} onEdit={onEdit} state={state} /></div></div>{!hideRails && <nav aria-label="Mobile workspace panels" className="mobile-panel-nav"><button onClick={() => setDrawer("project")} type="button"><Icon name="map" /> World</button><button onClick={() => onAction("forgie")} type="button"><Icon name="spark" /> Ask Forgie</button><button onClick={() => setDrawer("inspector")} type="button"><Icon name="panel" /> Inspector</button></nav>}</div>;
}

export function HierarchyHero({ entity, onEdit, onPrimary }: { entity: ForgeEntity; onEdit: () => void; onPrimary: () => void }) {
  return <section className={"hierarchy-hero hero-" + entity.kind}><img alt={entity.name + " concept art"} src={imageFor(entity.imageRef)} /><div className="hero-shade" /><div className="hero-identity"><span>{kindLabels[entity.kind]}</span><h1>{entity.name}</h1></div><div className="hero-actions"><button onClick={onPrimary} type="button">{entity.kind === "building" ? "Open first Part" : "Open in Atlas"}</button><button aria-label={"Edit " + entity.name} onClick={onEdit} type="button"><Icon name="edit" /> Edit</button></div></section>;
}

export function Breadcrumbs({ entities, onOpen }: { entities: ForgeEntity[]; onOpen: (entity: ForgeEntity) => void }) {
  return <nav aria-label="World hierarchy" className="forge-breadcrumbs">{entities.map((entity, index) => <span key={entity.id}><button aria-current={index === entities.length - 1 ? "page" : undefined} onClick={() => onOpen(entity)} type="button">{index === 0 ? "World" : entity.name}</button>{index < entities.length - 1 && <Icon name="chevron" />}</span>)}</nav>;
}

function EntityCard({ entity, onOpen }: { entity: ForgeEntity; onOpen: () => void }) {
  return <button className="entity-card" onClick={onOpen} type="button"><span className="card-image"><img alt="" src={imageFor(entity.imageRef)} /><em>{kindLabels[entity.kind]}</em></span><span className="card-copy"><b>{entity.name}</b><small>{entity.status === "building" ? "Building now" : entity.status}</small><span><i>{entity.progress}%</i><ProgressBar value={entity.progress} /></span></span></button>;
}

export function EntityCarousel({ items, kind, onAdd, onOpen }: { items: ForgeEntity[]; kind: EntityKind; onAdd: () => void; onOpen: (entity: ForgeEntity) => void }) {
  const article = kind === "building" ? "an" : "a";
  const rail = useRef<HTMLDivElement>(null);
  const scroll = (direction: number) => rail.current?.scrollBy({ left: direction * 340, behavior: "smooth" });
  const wheel = (event: WheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) rail.current?.scrollBy({ left: event.deltaY, behavior: "auto" });
  };
  return <section className="carousel-section"><header><h2>{kindLabels[kind]}s</h2><span>{items.length} total</span><button className="small-add" onClick={onAdd} type="button"><Icon name="plus" /> Add {kindLabels[kind]}</button></header><div className="carousel-frame"><button aria-label="Previous cards" className="carousel-arrow prev" onClick={() => scroll(-1)} type="button">‹</button><div className="entity-carousel" onWheel={wheel} ref={rail} tabIndex={0}>{items.map((item) => <EntityCard entity={item} key={item.id} onOpen={() => onOpen(item)} />)}<button className="entity-card add-card" onClick={onAdd} type="button"><span><Icon name="plus" /></span><b>Add {kindLabels[kind]}</b><small>Create the next clear step.</small></button></div><button aria-label="Next cards" className="carousel-arrow next" onClick={() => scroll(1)} type="button">›</button></div><p className="carousel-hint">Choose {article} {kindLabels[kind].toLowerCase()} to open it, or add one to create the next milestone.</p></section>;
}

export function StatusBadge({ status }: { status: ForgeEntity["status"] }) {
  return <span className={"status-badge status-" + status}>{status === "building" ? "In progress" : status}</span>;
}

export function EmptyState({ action, body, onAction, title }: { action: string; body: string; onAction: () => void; title: string }) {
  return <section className="empty-state"><span><Icon name="map" /></span><h2>{title}</h2><p>{body}</p><button className="forge-primary-button" onClick={onAction} type="button">{action}</button></section>;
}

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return <button className="forge-toast" onClick={onClose} role="status" type="button"><Icon name="check" /><span>{message}</span><Icon name="close" /></button>;
}
