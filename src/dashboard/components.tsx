import type { ReactNode } from "react";

import type { Roadmap } from "../contracts/index.js";

export function Icon({ name }: { name: "arrow" | "check" | "code" | "file" | "play" | "spark" }) {
  const paths = {
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    check: <path d="m5 12 4 4L19 6" />,
    code: <path d="m8 9-4 3 4 3m8-6 4 3-4 3m-2-9-4 12" />,
    file: <path d="M6 3h8l4 4v14H6zM14 3v5h5" />,
    play: <path d="m9 7 8 5-8 5z" />,
    spark: <path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5z" />,
  } as const;
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

export function ProjectHeader({ active, engine, projectName, onNavigate, proofAvailable, chronicleAvailable }: {
  active: "World" | "Proof" | "Chronicle";
  engine: string;
  projectName: string;
  onNavigate: (destination: "World" | "Proof" | "Chronicle") => void;
  proofAvailable: boolean;
  chronicleAvailable: boolean;
}) {
  const availability = {
    World: true,
    Proof: proofAvailable,
    Chronicle: chronicleAvailable,
  } as const;
  const labels = {
    World: "World",
    Proof: availability.Proof ? "Proof" : "Proof · after build",
    Chronicle: availability.Chronicle ? "Chronicle" : "Chronicle · after completion",
  } as const;
  return (
    <header className="project-header">
      <div className="brand-block">
        <div className="forge-mark" aria-hidden="true"><span /></div>
        <div>
          <p className="eyebrow">Forge Workshop</p>
          <div className="project-title-row"><h1>{projectName}</h1><span className="ready-chip"><span /> Ready</span></div>
        </div>
      </div>
      <nav aria-label="Primary navigation" className="primary-nav">
        {(["World", "Proof", "Chronicle"] as const).map((item) => (
          <button
            aria-label={labels[item]}
            className={active === item ? "nav-button active" : "nav-button"}
            disabled={!availability[item]}
            key={item}
            onClick={() => onNavigate(item)}
            type="button"
          >{labels[item]}</button>
        ))}
      </nav>
      <div className="header-meta"><span>{engine}</span></div>
    </header>
  );
}

export function ForgeCompanion({ title, children, tone = "ember" }: {
  title: string;
  children: ReactNode;
  tone?: "ember" | "blue" | "success";
}) {
  return (
    <aside className={`companion-card ${tone}`} aria-labelledby="companion-title">
      <div className="companion-heading">
        <div className="ember-core" aria-hidden="true"><span className="core-center" /></div>
        <div><p className="eyebrow">Forge Companion</p><h2 id="companion-title">{title}</h2></div>
      </div>
      <div className="companion-copy">{children}</div>
      <details className="quiet-details"><summary>Why this matters</summary><p>A bounded quest keeps the visible outcome, approved scope, and proof connected from plan to play.</p></details>
    </aside>
  );
}

export function QuestNode({ label, state, detail }: {
  label: string;
  state: "completed" | "available" | "locked" | "active";
  detail: string;
}) {
  const visualState = state === "completed" ? "complete" : state === "locked" ? "planned" : state;
  return (
    <div className={`quest-node ${visualState}`}>
      <div className="node-glyph" aria-hidden="true">{state === "completed" ? <Icon name="check" /> : state === "locked" ? <span>···</span> : <span />}</div>
      <div><span className="node-state">{state === "completed" ? "Completed" : state}</span><h3>{label}</h3><p>{detail}</p></div>
    </div>
  );
}

export function WorldMap({ roadmap }: { roadmap: Roadmap }) {
  const completed = roadmap.quests.filter((quest) => quest.state === "completed").length;
  return (
    <section className="world-map surface" aria-labelledby="world-map-title">
      <div className="section-heading">
        <div><p className="eyebrow">Sample Game roadmap</p><h2 id="world-map-title">A small world, built one quest at a time</h2></div>
        <span className="map-note">Workshop district · {completed} of {roadmap.quests.length} complete</span>
      </div>
      <div className="map-canvas">
        <div className="path-line path-one" aria-hidden="true" />
        <div className="map-node foundation"><QuestNode label="Project Foundation" state="completed" detail="Player movement and fixture ready" /></div>
        {roadmap.quests.map((quest) => (
          <div className="map-node targeting" key={quest.questId}>
            <QuestNode label={quest.title} state={quest.state} detail={quest.summary} />
          </div>
        ))}
        <div className="blueprint-ring ring-one" aria-hidden="true" /><div className="blueprint-ring ring-two" aria-hidden="true" />
      </div>
    </section>
  );
}

export function TechnicalDetails({ children, label = "Technical details" }: { children: ReactNode; label?: string }) {
  return <details className="technical-details"><summary><Icon name="code" /> {label}</summary><div className="technical-body">{children}</div></details>;
}

export function ActionDock({ consequence, primaryLabel, primaryIcon = "arrow", onPrimary, secondaryLabel, onSecondary, status }: {
  consequence: string;
  primaryLabel?: string;
  primaryIcon?: "arrow" | "play" | "spark";
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  status?: string;
}) {
  return (
    <div className="action-dock" aria-label="Next action">
      <div className="action-consequence"><span className="dock-kicker">Next step</span><strong>{consequence}</strong></div>
      <div className="action-buttons">
        {secondaryLabel && <button className="button secondary" disabled={!onSecondary} onClick={onSecondary} type="button">{secondaryLabel}</button>}
        {primaryLabel && <button className="button primary" disabled={!onPrimary} onClick={onPrimary} type="button">{primaryLabel}<Icon name={primaryIcon} /></button>}
        {status && <span className="no-action-chip"><span /> {status}</span>}
      </div>
    </div>
  );
}
