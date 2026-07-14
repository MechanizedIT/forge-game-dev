import { useEffect, useRef, useState, type ReactNode } from "react";

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
  idea: "Uncommitted idea",
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

function SamplePathPreview() {
  return (
    <div className="launch-miniature sample-miniature" aria-hidden="true">
      <div className="mini-toolbar"><span /> SAMPLE_GAME.EXE <strong>VERIFIED</strong></div>
      <div className="mini-game-stage">
        <span className="mini-arena-ring" />
        <span className="mini-player"><i />PLAYER</span>
        <span className="mini-enemy"><i />IDLE</span>
      </div>
      <div className="mini-quest-rail">
        <span className="mini-node mini-done"><Icon name="check" /></span>
        <span className="mini-line mini-line-done" />
        <span className="mini-node mini-active"><i /></span>
        <span className="mini-line mini-line-future" />
        <span className="mini-node mini-future"><i /></span>
        <em>Movement</em><strong>Enemy Targeting</strong><em>Game Feel</em>
      </div>
    </div>
  );
}

function CreatePathPreview() {
  return (
    <div className="launch-miniature create-miniature" aria-hidden="true">
      <div className="idea-source">
        <span><Icon name="idea" /> YOUR IDEA</span>
        <strong>“A quick arena game where movement feels great.”</strong>
      </div>
      <span className="idea-transform"><Icon name="arrow" /></span>
      <div className="blueprint-roadmap">
        <span><i>01</i> Move</span>
        <b />
        <span><i>02</i> Encounter</span>
        <b />
        <span><i>03</i> Playable</span>
      </div>
      <div className="blueprint-status"><span /> IDEA → PLAYABLE ROADMAP</div>
    </div>
  );
}

function LaunchChoiceCard({
  accent,
  description,
  label,
  onChoose,
  title,
}: {
  accent: "ember" | "violet";
  description: string;
  label: string;
  onChoose: () => void;
  title: string;
}) {
  return (
    <article className={`launch-choice launch-${accent}`}>
      {accent === "ember" ? <SamplePathPreview /> : <CreatePathPreview />}
      <div className="choice-content">
        <span className="choice-kicker">{accent === "ember" ? "Verified path" : "Creative path"}</span>
        <h2>{title}</h2>
        <p>{description}</p>
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
        <div className="launch-hero-core"><CompanionCore state="ready" /></div>
        <div>
          <p className="v2-eyebrow">Your game starts with direction</p>
          <h1 id="launch-title">What would you like to build?</h1>
          <p className="launch-summary">
            Forge turns an idea into a playable roadmap, keeps Codex focused on one quest, verifies
            the result, and remembers what changed.
          </p>
        </div>
      </section>

      <section className="launch-choices" aria-label="Choose a Forge experience">
        <LaunchChoiceCard
          accent="ember"
          description="Enter a verified game, review its next quest, and follow the path from movement to a real encounter."
          label="Explore sample world"
          onChoose={() => onChoose("explore_sample")}
          title="Explore the sample game"
        />
        <LaunchChoiceCard
          accent="violet"
          description="Describe a small 2D idea and see Forge shape it into a focused Godot project and quest roadmap."
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

function QuestModule({ node, active = false, children }: { node: WorkshopQuestNode; active?: boolean; children?: ReactNode }) {
  return (
    <article
      aria-current={active ? "step" : undefined}
      className={`quest-module module-${node.state}${active ? " module-active" : ""}`}
      data-state={node.state}
    >
      <div className="module-region">{node.region}</div>
      <div className="module-status">
        <span className="module-status-light" />
        {active ? "Recommended · Available" : stateLabels[node.state]}
      </div>
      <div className="module-marker">
        {node.state === "completed" ? <Icon name="check" /> : <span />}
      </div>
      <h3>{node.title}</h3>
      <p>{node.summary}</p>
      {children}
    </article>
  );
}

function RoadmapConnector({ kind, label }: { kind: "current" | "planned"; label: string }) {
  return (
    <div className={`roadmap-connector connector-${kind}`} aria-label={label}>
      {kind === "current" && <><span className="online-segment" /><span className="available-segment" /></>}
      {kind === "planned" && <span className="planned-segment" />}
      <i />
    </div>
  );
}

function GamePreview() {
  return (
    <div className="game-preview" aria-label="Stylized preview of the current Sample Game state">
      <div className="preview-window-bar">
        <span><i /> LIVE FIXTURE</span>
        <strong>SAMPLE GAME · ARENA 01</strong>
      </div>
      <div className="preview-stage">
        <span className="stage-horizon" />
        <span className="stage-boundary boundary-one" />
        <span className="stage-boundary boundary-two" />
        <span className="stage-light" />
        <span className="stage-player"><i /><b />PLAYER</span>
        <span className="stage-enemy"><em>ENEMY · IDLE</em><i /><b /></span>
        <span className="stage-scan"><i /> NO TARGET</span>
      </div>
      <div className="preview-caption">
        <span><i /> Playable baseline online</span>
        <strong>Move with WASD or arrow keys</strong>
      </div>
    </div>
  );
}

function WorldCompanion() {
  return (
    <aside className="world-companion" aria-label="Forge Companion focused guidance">
      <CompanionCore compact state="focused" />
      <p>
        Your player can move, but the enemy does not react yet. This quest creates the first real
        encounter.
      </p>
    </aside>
  );
}

function SampleWorld({ onBack }: { onBack: () => void }) {
  const [idea, setIdea] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const ideaInputRef = useRef<HTMLInputElement>(null);
  const movement = sampleWorldFixture.quests.find((quest) => quest.id === "player-movement")!;
  const targeting = sampleWorldFixture.quests.find((quest) => quest.id === "enemy-targeting")!;
  const gameFeel = sampleWorldFixture.quests.find((quest) => quest.id === "game-feel")!;
  const polish = sampleWorldFixture.quests.find((quest) => quest.id === "polish")!;

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
        <p className="v2-eyebrow">World 01 · Assembly Bay</p>
        <h2>Your game is taking shape.</h2>
        <p>One playable system is online. The first real encounter is ready to build.</p>
      </section>

      <section className="world-workbench" aria-label="Sample Game project world">
        <aside className="project-snapshot">
          <GamePreview />
          <div className="playable-copy">
            <span className="v2-eyebrow">Current playable state</span>
            <h2>Movement works. The enemy is waiting.</h2>
            <p>{sampleWorldFixture.currentPlayableState}</p>
            <div className="playable-tags"><span>Movement verified</span><span>Enemy idle</span></div>
          </div>
        </aside>

        <section className="roadmap-world" aria-labelledby="roadmap-title">
          <div className="roadmap-heading">
            <div>
              <span className="v2-eyebrow">Game assembly roadmap</span>
              <h2 id="roadmap-title">From foundation to playable polish</h2>
            </div>
            <span className="roadmap-progress"><strong>1</strong> of 4 systems online</span>
          </div>

          <div className="roadmap-sequence">
            <QuestModule node={movement} />
            <RoadmapConnector kind="current" label="Completed foundation leading to current available quest" />
            <div className="active-quest-stack">
              <QuestModule active node={targeting}>
                <button
                  className="v2-button button-ember module-action"
                  onClick={() => setNotice("Quest review connects in Task 3. Use npm run forge for the protected working flow.")}
                  type="button"
                >Review Enemy Targeting<Icon name="arrow" /></button>
                {notice && <p className="fixture-notice" role="status">{notice}</p>}
              </QuestModule>
              <WorldCompanion />
              <button className="idea-port" onClick={() => ideaInputRef.current?.focus()} type="button">
                <span><Icon name="idea" /></span>
                <strong>+ Add an idea</strong>
                <em>Uncommitted possibility</em>
              </button>
            </div>
            <RoadmapConnector kind="planned" label="Planned future dependency" />
            <QuestModule node={gameFeel} />
            <RoadmapConnector kind="planned" label="Planned future dependency" />
            <QuestModule node={polish} />
          </div>
        </section>
      </section>

      <section className="idea-dock" aria-labelledby="idea-title">
        <span className="idea-dock-icon"><Icon name="idea" /></span>
        <div className="idea-dock-label">
          <span className="v2-eyebrow">Creator input · fixture preview</span>
          <h2 id="idea-title">What would you like to add to your game?</h2>
        </div>
        <label className="idea-input">
          <span className="sr-only">Describe a future game idea</span>
          <input
            ref={ideaInputRef}
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
