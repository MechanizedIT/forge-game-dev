import { useEffect, useState, type ReactNode } from "react";

import {
  sampleWorldFixture,
  type WorkshopQuestNode,
  type WorkshopQuestState,
} from "./fixture.js";
import {
  returnToLaunchpad,
  viewForLaunchChoice,
  type LaunchChoice,
  type WorkshopView,
} from "./state.js";

type CompanionState = "ready" | "focused" | "thinking" | "complete";
type IconName = "arrow" | "back" | "check" | "code" | "idea" | "play" | "spark";

const stateLabels: Record<WorkshopQuestState, string> = {
  completed: "Completed",
  available: "Available",
  planned: "Planned",
  future: "Future",
  idea: "New idea",
};

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    back: <path d="m11 5-7 7 7 7M4 12h16" />,
    check: <path d="m5 12 4 4L19 6" />,
    code: <path d="m8 9-4 3 4 3m8-6 4 3-4 3m-2-9-4 12" />,
    idea: <path d="M9 18h6m-5 3h4m3-12a5 5 0 0 1-2 4c-.7.6-1 1.2-1 2h-4c0-.8-.3-1.4-1-2a5 5 0 1 1 8-4Z" />,
    play: <path d="m9 7 8 5-8 5z" />,
    spark: <path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5z" />,
  };
  return <svg aria-hidden="true" className="v2-icon" viewBox="0 0 24 24">{paths[name]}</svg>;
}

function CompanionCore({ state, compact = false }: { state: CompanionState; compact?: boolean }) {
  return (
    <span
      aria-label={`Forge Companion ${state}`}
      className={`companion-core companion-${state}${compact ? " companion-compact" : ""}`}
      role="img"
    >
      <span className="companion-orbit orbit-a" />
      <span className="companion-orbit orbit-b" />
      <span className="companion-center" />
    </span>
  );
}

function ForgeBrand({ state = "ready" }: { state?: CompanionState }) {
  return (
    <div className="forge-brand">
      <CompanionCore compact state={state} />
      <div>
        <strong>Forge</strong>
        <span>Living Game Workshop</span>
      </div>
    </div>
  );
}

function LaunchChoiceCard({
  accent,
  description,
  details,
  icon,
  label,
  onChoose,
  title,
}: {
  accent: "ember" | "violet";
  description: string;
  details: string[];
  icon: IconName;
  label: string;
  onChoose: () => void;
  title: string;
}) {
  return (
    <article className={`launch-choice launch-${accent}`}>
      <div className="choice-visual" aria-hidden="true">
        <span className="choice-glyph"><Icon name={icon} /></span>
        <span className="choice-path path-a" />
        <span className="choice-path path-b" />
        <span className="choice-dot dot-a" />
        <span className="choice-dot dot-b" />
      </div>
      <div className="choice-content">
        <span className="choice-kicker">{accent === "ember" ? "Verified path" : "Creative path"}</span>
        <h2>{title}</h2>
        <p>{description}</p>
        <ul>{details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
        <button className={`v2-button button-${accent}`} onClick={onChoose} type="button">
          {label}<Icon name="arrow" />
        </button>
      </div>
    </article>
  );
}

function Launchpad({ onChoose }: { onChoose: (choice: LaunchChoice) => void }) {
  return (
    <main className="launchpad">
      <header className="launch-header">
        <ForgeBrand />
        <span className="preview-chip"><span /> v0.2 preview</span>
      </header>

      <section className="launch-hero" aria-labelledby="launch-title">
        <p className="v2-eyebrow">Your game starts with direction</p>
        <h1 id="launch-title">What would you like to build?</h1>
        <p className="launch-summary">
          Forge helps turn a game idea into a playable roadmap, keeps Codex focused on one quest at a
          time, verifies the result, and remembers what changed.
        </p>
      </section>

      <section className="launch-choices" aria-label="Choose a Forge experience">
        <LaunchChoiceCard
          accent="ember"
          description="Open a verified playable demonstration and see how one bounded quest moves from plan to proof."
          details={["Review a prepared quest", "Let Codex implement it", "Verify and play the result"]}
          icon="play"
          label="Explore sample world"
          onChoose={() => onChoose("explore_sample")}
          title="Explore the sample game"
        />
        <LaunchChoiceCard
          accent="violet"
          description="Describe a small 2D idea and let Forge shape the first playable direction for a Godot project."
          details={["Start from plain language", "Shape a focused game vision", "Build a quest roadmap"]}
          icon="idea"
          label="Start a new game"
          onChoose={() => onChoose("create_game")}
          title="Create a new game"
        />
      </section>

      <footer className="launch-footer">
        <span><Icon name="code" /> Real Codex workflow in the sample</span>
        <span>Godot 4 · Local workspace · Creator approval</span>
      </footer>
    </main>
  );
}

function QuestNode({ node }: { node: WorkshopQuestNode }) {
  return (
    <article
      aria-current={node.recommended ? "step" : undefined}
      className={`world-node node-${node.id} node-${node.state}`}
      data-state={node.state}
    >
      <div className="world-node-marker">
        {node.state === "completed" ? <Icon name="check" /> : node.state === "idea" ? <Icon name="idea" /> : <span />}
      </div>
      <div className="world-node-copy">
        <div className="world-node-meta">
          <span>{node.region}</span>
          <span>{node.recommended ? "Recommended" : stateLabels[node.state]}</span>
        </div>
        <h3>{node.title}</h3>
        <p>{node.summary}</p>
      </div>
      {node.state === "completed" && <CompanionCore compact state="complete" />}
    </article>
  );
}

function GamePreview() {
  return (
    <div className="game-preview" aria-label="Stylized preview of the current Sample Game state">
      <div className="preview-sky"><span>LIVE FIXTURE</span></div>
      <div className="preview-arena">
        <span className="preview-player"><i />PLAYER</span>
        <span className="preview-enemy"><i />IDLE ENEMY</span>
        <span className="preview-distance" />
      </div>
      <div className="preview-caption"><span className="preview-live" /> Playable baseline</div>
    </div>
  );
}

function WorldCompanion() {
  return (
    <aside className="world-companion" aria-labelledby="world-companion-title">
      <CompanionCore state="focused" />
      <div>
        <span className="v2-eyebrow">Forge Companion · Focused</span>
        <h2 id="world-companion-title">The first encounter is ready.</h2>
        <p>
          Your player can move, but the enemy does not react yet. Enemy Targeting would create the
          game’s first real encounter.
        </p>
      </div>
      <span className="companion-link" aria-hidden="true" />
    </aside>
  );
}

function SampleWorld({ onBack }: { onBack: () => void }) {
  const [idea, setIdea] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <main className="project-world">
      <header className="world-header">
        <button className="back-button" onClick={onBack} type="button"><Icon name="back" /> Launchpad</button>
        <ForgeBrand state="focused" />
        <div className="world-project-title">
          <div><span className="v2-eyebrow">Project World</span><h1>{sampleWorldFixture.projectName}</h1></div>
          <span className="verified-chip"><Icon name="check" /> Verified demo</span>
          <span className="engine-chip">{sampleWorldFixture.engine}</span>
        </div>
      </header>

      <section className="world-intro">
        <div>
          <p className="v2-eyebrow">World 01 · Workshop District</p>
          <h2>Your game is taking shape.</h2>
          <p>Follow the active path, prove each change, and keep the playable world moving forward.</p>
        </div>
        <div className="world-key" aria-label="Roadmap state legend">
          <span className="key-complete">Completed</span>
          <span className="key-active">Available</span>
          <span className="key-idea">New idea</span>
        </div>
      </section>

      <div className="world-layout">
        <aside className="playable-panel">
          <GamePreview />
          <div className="playable-copy">
            <span className="v2-eyebrow">Current playable state</span>
            <h2>Movement works. The world is waiting to react.</h2>
            <p>{sampleWorldFixture.currentPlayableState}</p>
            <div className="playable-tags"><span>Arrow keys + WASD</span><span>Enemy idle</span></div>
          </div>
        </aside>

        <section className="roadmap-world" aria-labelledby="roadmap-title">
          <div className="roadmap-heading">
            <div><span className="v2-eyebrow">Visual roadmap</span><h2 id="roadmap-title">From movement to a real encounter</h2></div>
            <span className="roadmap-progress"><strong>1</strong> foundation complete</span>
          </div>

          <div className="roadmap-canvas">
            <span className="world-region region-foundation">Foundation</span>
            <span className="world-region region-encounter">Encounter</span>
            <span className="world-region region-future">Future region</span>
            <span className="world-path path-complete" aria-hidden="true" />
            <span className="world-path path-active" aria-hidden="true" />
            <span className="world-path path-future" aria-hidden="true" />
            <span className="world-path path-branch" aria-hidden="true" />
            {sampleWorldFixture.quests.map((node) => <QuestNode key={node.id} node={node} />)}
            <WorldCompanion />
          </div>
        </section>
      </div>

      <section className="idea-dock" aria-labelledby="idea-title">
        <span className="idea-dock-icon"><Icon name="idea" /></span>
        <div className="idea-dock-label"><span className="v2-eyebrow">Idea seed · visual preview</span><h2 id="idea-title">What would you like to add to your game?</h2></div>
        <label className="idea-input">
          <span className="sr-only">Describe a future game idea</span>
          <input
            onChange={(event) => setIdea(event.target.value)}
            placeholder="Maybe the enemy drops something useful…"
            type="text"
            value={idea}
          />
          <button
            aria-label="Save idea preview"
            disabled={idea.trim().length === 0}
            onClick={() => setNotice("Idea capture becomes functional with the guided creation work in Task 4.")}
            type="button"
          ><Icon name="arrow" /></button>
        </label>
      </section>

      <section className="world-action-dock" aria-label="Recommended next action">
        <div><span className="v2-eyebrow">Recommended next quest</span><strong>Enemy Targeting creates the game’s first real encounter.</strong></div>
        {notice && <p className="fixture-notice" role="status">{notice}</p>}
        <button
          className="v2-button button-ember"
          onClick={() => setNotice("Quest review connects in Task 3. Use npm run forge for the protected working flow.")}
          type="button"
        >Review Enemy Targeting<Icon name="arrow" /></button>
      </section>
    </main>
  );
}

function CreatePlaceholder({ onBack }: { onBack: () => void }) {
  return (
    <main className="placeholder-screen">
      <header className="placeholder-header"><button className="back-button" onClick={onBack} type="button"><Icon name="back" /> Launchpad</button><ForgeBrand state="thinking" /></header>
      <section className="placeholder-content">
        <CompanionCore state="thinking" />
        <p className="v2-eyebrow">Upcoming v0.2 capability</p>
        <h1>Guided project creation is next.</h1>
        <p>
          Soon, you’ll describe a small 2D game and Forge will shape it into a Top-down arena project,
          first playable milestone, and bounded quest roadmap.
        </p>
        <div className="placeholder-boundary"><Icon name="spark" /><div><strong>Honest preview boundary</strong><span>No GPT call, project generation, or artifact creation is active in this shell.</span></div></div>
        <button className="v2-button button-violet" onClick={onBack} type="button">Return to Launchpad<Icon name="back" /></button>
      </section>
    </main>
  );
}

export default function App() {
  const [view, setView] = useState<WorkshopView>("launchpad");

  useEffect(() => {
    document.title = view === "sample_world" ? "Sample Game · Forge Project World" : "Forge · Living Game Workshop";
    const scrollReset = window.setTimeout(() => window.scrollTo({ left: 0, top: 0 }), 100);
    return () => window.clearTimeout(scrollReset);
  }, [view]);

  if (view === "sample_world") return <SampleWorld onBack={() => setView(returnToLaunchpad())} />;
  if (view === "create_placeholder") return <CreatePlaceholder onBack={() => setView(returnToLaunchpad())} />;
  return <Launchpad onChoose={(choice) => setView(viewForLaunchChoice(choice))} />;
}
