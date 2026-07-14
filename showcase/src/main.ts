import "./styles.css";
import { evidenceById } from "./content/evidence";
import { interfaceTour } from "./content/interface-tour";
import { demoPoster, linkLabels, publicLinks } from "./content/links";
import { proofFacts, proofItems } from "./content/proof";
import { release, replayExplanation, replayLabel } from "./content/release";
import type { Walkthrough } from "./content/types";
import { capabilities, knownLimitations } from "./content/vision";
import { walkthroughs } from "./content/walkthroughs";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Showcase root is missing.");

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
const externalLink = (href: string, label: string, className = "button button-secondary") => `<a class="${className}" href="${escapeHtml(href)}" rel="noreferrer" target="_blank">${escapeHtml(label)} <span aria-hidden="true">↗</span></a>`;
const optionalLink = (href: string | undefined, label: string, pending: string) => href ? externalLink(href, label, "text-link") : `<span class="pending-link"><span aria-hidden="true">○</span> ${escapeHtml(pending)}</span>`;
const current = capabilities.filter((claim) => claim.horizon === "working-now");
const next = capabilities.filter((claim) => claim.horizon === "next");
const future = capabilities.filter((claim) => claim.horizon === "future");

const sequence = ["Idea", "Blueprint", "Project World", "Approved Quest", "Codex", "Verification", "Playtest", "Chronicle"];
const architecture = [
  ["Creator", "Defines intent, approves project changes, and judges gameplay."],
  ["Forge", "Owns intake, approval, allowed paths, state transitions, verification, and persistence."],
  ["GPT-5.6", "Produces a structured blueprint; it cannot choose paths, commands, packages, or source files."],
  ["Official Codex SDK", "Implements the approved sample quest inside its bounded workspace."],
  ["Godot 4.7", "Loads and checks the project, then runs the real playtest."],
  ["Local Git", "Records file provenance, exact boundaries, and a clean generated-project baseline."],
  ["JSON + Markdown", "Keep plans, evidence, roadmaps, Chronicle entries, and project records inspectable."],
] as const;

app.innerHTML = `
  <header class="site-header">
    <a class="brand" href="#top" aria-label="Forge showcase home"><span class="brand-mark" aria-hidden="true"><i></i></span><span><b>Forge</b><small>Living Game Workshop</small></span></a>
    <nav aria-label="Primary navigation"><a href="#how">How it works</a><a href="#tour">Interface</a><a href="#walkthrough">Walkthrough</a><a href="#proof">Proof</a></nav>
    ${externalLink(publicLinks.repository, "GitHub", "header-link")}
  </header>
  <main id="main">
    <section class="hero" id="top" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="eyebrow">${release.event} · ${release.category}</p>
        <h1 id="hero-title">Build your game one <em>verified quest</em> at a time.</h1>
        <p class="hero-summary">Forge turns AI game-development work into a visible roadmap of small, understandable quests. You approve what changes, Codex builds inside a clear boundary, Forge verifies the result, and you play it before the project moves forward.</p>
        <div class="hero-actions">
          <a class="button button-primary" href="#walkthrough">Explore the walkthrough <span aria-hidden="true">↓</span></a>
          <button class="button button-secondary" data-video-open type="button">Watch the demo</button>
          ${externalLink(publicLinks.repository, "View the project")}
        </div>
        <a class="local-action" href="#run-local">Run Forge locally <span aria-hidden="true">→</span></a>
        <p class="built-with">Built with ${release.technologies.join(", ").replace(/, ([^,]*)$/, ", and $1")}</p>
      </div>
      <figure class="hero-visual">
        <img src="/hero-workshop.webp" width="1536" height="1024" alt="Abstract industrial workshop where an ember path of quest nodes moves toward a cyan energy core, representing human direction and machine execution." />
        <figcaption><span class="classification decorative">Decorative illustration</span> An idea becomes a navigable project world.</figcaption>
      </figure>
    </section>

    <aside class="truth-strip" aria-label="Showcase boundary"><span>${replayLabel}</span><p>${replayExplanation}</p></aside>

    <section class="section problem-section" id="problem" aria-labelledby="problem-title">
      <div class="section-heading"><p class="eyebrow">The creator problem</p><h2 id="problem-title">AI can write code while the project becomes harder to understand.</h2><p>These are recurring workflow risks—not claims about every product. Forge focuses on the space between an idea, a code change, and a result someone can actually play.</p></div>
      <div class="problem-grid">
        ${[
          ["The project becomes a black box", "Technical output can hide what changed and what decision comes next."],
          ["Prompts accumulate unrelated context", "Long-running work loses the boundary between current intent and old instructions."],
          ["Code success looks like game success", "A passing operation cannot tell whether the mechanic feels right in play."],
          ["The work outruns the playable result", "Over-engineering can begin before the smallest useful outcome exists."],
          ["Important decisions disappear into chat", "Scope, proof, and project continuity become difficult to recover later."],
          ["Creators inherit process ownership", "Someone still has to define scope, inspect the result, and preserve understanding."],
        ].map(([title, body], index) => `<article><span>0${index + 1}</span><h3>${title}</h3><p>${body}</p></article>`).join("")}
      </div>
    </section>

    <section class="section method-section" id="how" aria-labelledby="how-title">
      <div class="section-heading split-heading"><div><p class="eyebrow">How Forge helps</p><h2 id="how-title">Models reason. Deterministic systems govern.</h2></div><p>Forge makes work visible, changes bounded, guidance plain, outcomes playable, and project understanding persistent.</p></div>
      <ol class="method-list">
        ${[
          ["Capture intent", "Start with the creator’s idea and smallest playable result."],
          ["Shape a roadmap", "Break direction into small, tangible quests."],
          ["Approve one boundary", "Show scope, files, proof, and required playtest."],
          ["Let Codex build", "Pass one approved task through the official SDK."],
          ["Verify the project", "Check actual files, commands, and Godot health."],
          ["Ask the creator to play", "Automation stops before gameplay judgment."],
          ["Remember progress", "Persist roadmap, Chronicle, artifacts, and decisions."],
        ].map(([title, body], index) => `<li><span>${String(index + 1).padStart(2, "0")}</span><div><h3>${title}</h3><p>${body}</p></div></li>`).join("")}
      </ol>
      <div class="sequence" aria-label="Forge workflow sequence">${sequence.map((item, index) => `<span>${item}</span>${index < sequence.length - 1 ? '<i aria-hidden="true">→</i>' : ""}`).join("")}</div>
    </section>

    <section class="section tour-section" id="tour" aria-labelledby="tour-title">
      <div class="section-heading"><p class="eyebrow">Quick interface tour</p><h2 id="tour-title">A workshop vocabulary for staying in control.</h2><p>Each surface answers one creator question. Open any concept for its moment, expected decision, and truth boundary.</p></div>
      <div class="tour-grid">
        ${interfaceTour.map((item, index) => `<details class="tour-card accent-${item.accent}" ${index === 0 ? "open" : ""}><summary><span>${String(index + 1).padStart(2, "0")}</span><h3>${item.name}</h3><i aria-hidden="true">+</i></summary><div><p>${item.what}</p><dl><dt>When</dt><dd>${item.when}</dd><dt>Your move</dt><dd>${item.action}</dd><dt>It does not mean</dt><dd>${item.notMeaning}</dd></dl></div></details>`).join("")}
      </div>
    </section>

    <section class="walkthrough-section" id="walkthrough" aria-labelledby="walkthrough-title">
      <div class="section-heading walkthrough-heading"><p class="eyebrow">Choose a verified path</p><h2 id="walkthrough-title">See the workflow, one real state at a time.</h2><p>${replayExplanation}</p></div>
      <div class="path-picker" role="tablist" aria-label="Walkthrough path">
        ${walkthroughs.map((walkthrough, index) => `<button aria-controls="walkthrough-player" aria-selected="${index === 0}" class="path-button" data-path="${walkthrough.id}" role="tab" type="button"><span>${walkthrough.id === "sample" ? "A" : "B"}</span><b>${walkthrough.title}</b><small>${walkthrough.summary}</small></button>`).join("")}
      </div>
      <div class="walkthrough-player" id="walkthrough-player" role="tabpanel" tabindex="0" aria-label="Guided Forge replay">
        <div class="replay-ribbon"><span class="status-dot" aria-hidden="true"></span><b>${replayLabel}</b><small>This replay makes no network or project changes.</small></div>
        <div class="walkthrough-meta"><p class="eyebrow" data-step-progress></p><div class="step-track" aria-hidden="true" data-step-track></div></div>
        <div class="walkthrough-layout">
          <figure class="step-media" data-step-media></figure>
          <article class="step-copy">
            <div class="system-labels" data-step-systems></div>
            <h3 tabindex="-1" data-step-title></h3>
            <p class="step-summary" data-step-summary></p>
            <div class="why-box"><span>Why this matters</span><p data-step-why></p></div>
            <details class="technical-proof"><summary>Technical proof <span aria-hidden="true">+</span></summary><p data-step-proof></p></details>
          </article>
        </div>
        <div class="walkthrough-controls">
          <button class="button button-secondary" data-step-previous type="button">← Previous</button>
          <button class="restart-button" data-step-restart type="button">Restart walkthrough</button>
          <button class="button button-primary" data-step-next type="button">Next step →</button>
        </div>
        <p class="sr-only" aria-live="polite" data-step-announcement></p>
      </div>
      <aside class="version-boundary"><b>Forge v0.2 boundary</b><p>Generated quest implementation is intentionally not enabled in Forge v0.2. The sample path demonstrates the complete Codex build loop; the new-game path demonstrates planning, safe project creation, verification, and persistent project organization.</p></aside>
    </section>

    <section class="section difference-section" id="difference" aria-labelledby="difference-title">
      <div class="section-heading"><p class="eyebrow">How Forge is different</p><h2 id="difference-title">Forge organizes what happens before and after the code is written.</h2><p>It is not trying to replace Codex. It gives Codex a creator-friendly project structure, a bounded task, and a clear definition of what happens before and after the code is written.</p></div>
      <div class="comparison-grid">
        <article><span>Common pattern</span><h3>Prompt-to-output tools</h3><p>Optimized primarily for quickly generating an initial result.</p></article>
        <article><span>Common pattern</span><h3>General coding agents</h3><p>Powerful implementation tools; the user often owns scope, result checking, and long-term project understanding.</p></article>
        <article class="forge-comparison"><span>Forge emphasis</span><h3>Full creator workflow</h3><p>Visual project understanding, small quests, explicit approval, specialized AI roles, technical proof, creator playtesting, and persistent context.</p></article>
      </div>
    </section>

    <section class="horizon-section" id="vision" aria-labelledby="vision-title">
      <div class="section-heading"><p class="eyebrow">Current prototype versus greater vision</p><h2 id="vision-title">What works now is not the same as what comes next.</h2></div>
      <div class="horizon-grid">
        <article class="horizon current"><span class="horizon-label">Current prototype · verified</span><h3>Working now</h3>${current.map((claim) => `<div><b>${claim.label}</b><p>${claim.description}</p></div>`).join("")}</article>
        <article class="horizon planned"><span class="horizon-label">Planned · not implemented</span><h3>Next</h3>${next.map((claim) => `<div><b>${claim.label}</b><p>${claim.description}</p></div>`).join("")}</article>
        <article class="horizon future"><span class="horizon-label">Future direction</span><h3>Greater Forge vision</h3>${future.map((claim) => `<div><b>${claim.label}</b><p>${claim.description}</p></div>`).join("")}</article>
      </div>
    </section>

    <section class="section architecture-section" id="architecture" aria-labelledby="architecture-title">
      <div class="section-heading split-heading"><div><p class="eyebrow">Technical architecture</p><h2 id="architecture-title">Human judgment stays at both ends of the loop.</h2></div><p>Forge owns the controlled boundary around focused model work. Technical detail remains available without becoming the primary experience.</p></div>
      <div class="architecture-flow" aria-label="Forge technical workflow">${["Creator", "Forge intake + approval", "GPT-5.6 plan or Codex task", "Forge execution boundary", "Automated verification", "Godot playtest", "Creator confirmation", "Roadmap + Chronicle + Git"].map((item, index, all) => `<span>${item}</span>${index < all.length - 1 ? '<i aria-hidden="true">→</i>' : ""}`).join("")}</div>
      <details class="architecture-details"><summary>Explore each system’s responsibility <span aria-hidden="true">+</span></summary><div>${architecture.map(([name, description]) => `<article><h3>${name}</h3><p>${description}</p></article>`).join("")}</div></details>
    </section>

    <section class="proof-section" id="proof" aria-labelledby="proof-title">
      <div class="section-heading"><p class="eyebrow">Build Week proof</p><h2 id="proof-title">Every public claim points back to repository evidence.</h2><p>The showcase reuses final Task 7 application states. Decorative art is labeled separately and never presented as proof.</p></div>
      <div class="proof-stats" aria-label="Task 7 verification facts"><div><strong>${proofFacts.fullTests}</strong><span>full tests passed</span></div><div><strong>${proofFacts.protectedTests}</strong><span>protected v0.1 tests</span></div><div><strong>${proofFacts.automatedScreenshots + proofFacts.manualConfirmationScreenshots}</strong><span>review captures</span></div><div><strong>${proofFacts.browserIssues}</strong><span>browser issues</span></div></div>
      <ul class="proof-list">${proofItems.map((item) => `<li><span aria-hidden="true">✓</span><div><b>${item.label}</b><code>${item.source}</code></div></li>`).join("")}</ul>
      <div class="evidence-sample"><img src="${evidenceById.get("completion")?.publicPath}" width="1440" height="1053" loading="lazy" alt="${evidenceById.get("completion")?.alt}" /><div><span class="classification real">Real Forge application state</span><h3>Proof + creator judgment + persistence</h3><p>This Task 7 capture shows final completion only after the code passed and the creator explicitly confirmed the visible behavior.</p></div></div>
    </section>

    <section class="section local-section" id="run-local" aria-labelledby="local-title">
      <div class="section-heading split-heading"><div><p class="eyebrow">Repository and local use</p><h2 id="local-title">The full Forge experience stays close to your project.</h2></div><p>The hosted walkthrough is the fastest way to understand Forge. The real application runs locally because it needs controlled access to project files, Codex, Godot, Git, and operating-system actions.</p></div>
      <div class="local-grid"><div><h3>Run the v0.2 judge path</h3><ol><li>Install Node.js 20.19+ or 22.12+, Git 2.x, and authenticate Codex.</li><li>Clone the public repository and run <code>npm ci</code>.</li><li>Authorize the pinned Godot download with <code>npm run demo:prepare -- confirm-download</code>.</li><li>Launch the Living Game Workshop with <code>npm run forge</code>.</li></ol>${externalLink(publicLinks.repository, "Open setup guide", "button button-primary")}</div><aside><h3>What remains local</h3><ul><li>Your game project and Forge records</li><li>Codex and GPT credentials</li><li>Godot and Git processes</li><li>Filesystem and operating-system actions</li></ul><p class="license-note">Repository license selection remains an owner action; no license is implied by this showcase.</p></aside></div>
      <aside class="site-cannot"><div><p class="eyebrow">Static showcase boundary</p><h3>What this website cannot do</h3></div><ul><li>Run Codex or call GPT-5.6</li><li>Launch Godot or Git</li><li>Access local files or modify a game</li><li>Persist visitor projects</li><li>Simulate a live agent run</li><li>Replace the local Forge application</li></ul><p>${knownLimitations[4]}</p></aside>
    </section>

    <section class="section links-section" id="links" aria-labelledby="links-title"><div class="section-heading"><p class="eyebrow">Submission links</p><h2 id="links-title">Follow the project from proof to submission.</h2></div><div class="submission-links"><div><span>Source</span>${externalLink(publicLinks.repository, "GitHub repository", "text-link")}</div><div><span>Demo</span>${optionalLink(publicLinks.demoVideo, "Watch the public demo", linkLabels.demoPending)}</div><div><span>Showcase</span>${optionalLink(publicLinks.liveSite, "Open the live showcase", linkLabels.livePending)}</div><div><span>Submission</span>${optionalLink(publicLinks.devpost, "View on Devpost", linkLabels.devpostPending)}</div></div></section>

    <section class="final-cta" aria-labelledby="final-title"><div><p class="eyebrow">Ready to enter the workshop?</p><h2 id="final-title">Keep the creator in control—and make every quest playable, provable, and remembered.</h2></div><div><a class="button button-primary" href="#walkthrough">Explore the walkthrough</a>${externalLink(publicLinks.repository, "Run Forge locally", "button button-secondary")}</div></section>
  </main>
  <footer><a class="brand footer-brand" href="#top"><span class="brand-mark" aria-hidden="true"><i></i></span><span><b>Forge</b><small>${release.productVersion} public showcase</small></span></a><p>${replayLabel}. No analytics, cookies, runtime API calls, or visitor project persistence.</p><a href="#top">Back to top ↑</a></footer>

  <dialog class="video-dialog" data-video-dialog aria-labelledby="video-title"><div class="dialog-header"><div><p class="eyebrow">Forge in under three minutes</p><h2 id="video-title">${publicLinks.demoVideo ? "Watch the real Forge demo" : linkLabels.demoPending}</h2></div><button aria-label="Close demo video" data-video-close type="button">×</button></div><div class="video-body">${publicLinks.demoVideo ? `<div class="video-poster"><img src="${escapeHtml(demoPoster)}" alt="" /><a class="button button-primary" href="${escapeHtml(publicLinks.demoVideo)}" rel="noreferrer" target="_blank">Open the demo video ↗</a></div>` : `<div class="video-pending"><span class="brand-mark" aria-hidden="true"><i></i></span><p>The public video URL has not been configured yet. No fake or local video is embedded.</p></div>`}<div><h3>What the demo covers</h3><p>The sample quest moves from scope and creator approval through the official Codex SDK, automated proof, real Godot playtesting, explicit confirmation, and persistent completion. It then shows GPT-5.6 planning and controlled new-project creation.</p></div></div></dialog>
`;

const canonical = document.querySelector<HTMLLinkElement>("#canonical-link");
if (canonical && publicLinks.liveSite) canonical.href = publicLinks.liveSite;

let activeWalkthrough: Walkthrough = walkthroughs[0]!;
let activeStepIndex = 0;
const player = document.querySelector<HTMLElement>("#walkthrough-player");
const title = document.querySelector<HTMLElement>("[data-step-title]");
const media = document.querySelector<HTMLElement>("[data-step-media]");
const progress = document.querySelector<HTMLElement>("[data-step-progress]");
const track = document.querySelector<HTMLElement>("[data-step-track]");
const systems = document.querySelector<HTMLElement>("[data-step-systems]");
const summary = document.querySelector<HTMLElement>("[data-step-summary]");
const why = document.querySelector<HTMLElement>("[data-step-why]");
const proof = document.querySelector<HTMLElement>("[data-step-proof]");
const announcement = document.querySelector<HTMLElement>("[data-step-announcement]");
const previousButton = document.querySelector<HTMLButtonElement>("[data-step-previous]");
const nextButton = document.querySelector<HTMLButtonElement>("[data-step-next]");

function renderStep(moveFocus = false): void {
  const step = activeWalkthrough.steps[activeStepIndex];
  if (!step) throw new Error("Walkthrough step is missing.");
  const asset = evidenceById.get(step.evidenceId);
  if (!asset || !title || !media || !progress || !track || !systems || !summary || !why || !proof || !announcement || !previousButton || !nextButton) throw new Error("Walkthrough content is incomplete.");
  progress.textContent = `${activeWalkthrough.shortTitle} · Step ${activeStepIndex + 1} of ${activeWalkthrough.steps.length}`;
  track.innerHTML = activeWalkthrough.steps.map((_, index) => `<span class="${index <= activeStepIndex ? "is-complete" : ""}">${index + 1}</span>`).join("");
  media.innerHTML = `<img src="${asset.publicPath}" width="1440" height="900" alt="${escapeHtml(asset.alt)}" /><figcaption><span class="classification real">${asset.classification}</span><span>${escapeHtml(asset.state)}</span></figcaption>`;
  systems.innerHTML = step.systems.map((system) => `<span class="system system-${system.toLowerCase().replace(/[^a-z0-9]+/g, "-")}">${escapeHtml(system)}</span>`).join("");
  title.textContent = step.title;
  summary.textContent = step.summary;
  why.textContent = step.why;
  proof.textContent = step.technicalProof;
  previousButton.disabled = activeStepIndex === 0;
  nextButton.textContent = activeStepIndex === activeWalkthrough.steps.length - 1 ? "Replay from start ↺" : "Next step →";
  announcement.textContent = `${activeWalkthrough.title}, step ${activeStepIndex + 1} of ${activeWalkthrough.steps.length}: ${step.title}`;
  const url = new URL(window.location.href);
  url.searchParams.set("walkthrough", activeWalkthrough.id);
  url.searchParams.set("step", step.id);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  if (moveFocus) title.focus({ preventScroll: true });
}

function selectWalkthrough(id: string, requestedStep?: string): void {
  activeWalkthrough = walkthroughs.find((item) => item.id === id) ?? walkthroughs[0]!;
  const requestedIndex = requestedStep ? activeWalkthrough.steps.findIndex((step) => step.id === requestedStep) : -1;
  activeStepIndex = requestedIndex >= 0 ? requestedIndex : 0;
  document.querySelectorAll<HTMLButtonElement>("[data-path]").forEach((button) => button.setAttribute("aria-selected", String(button.dataset.path === activeWalkthrough.id)));
  renderStep(Boolean(requestedStep));
}

document.querySelectorAll<HTMLButtonElement>("[data-path]").forEach((button) => button.addEventListener("click", () => selectWalkthrough(button.dataset.path ?? "sample")));
previousButton?.addEventListener("click", () => { if (activeStepIndex > 0) { activeStepIndex -= 1; renderStep(true); } });
nextButton?.addEventListener("click", () => { activeStepIndex = activeStepIndex === activeWalkthrough.steps.length - 1 ? 0 : activeStepIndex + 1; renderStep(true); });
document.querySelector("[data-step-restart]")?.addEventListener("click", () => { activeStepIndex = 0; renderStep(true); });
player?.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLButtonElement || event.target instanceof HTMLDetailsElement || event.target instanceof HTMLElement && event.target.closest("details")) return;
  if (event.key === "ArrowRight") { event.preventDefault(); nextButton?.click(); }
  if (event.key === "ArrowLeft") { event.preventDefault(); previousButton?.click(); }
});

const initialUrl = new URL(window.location.href);
selectWalkthrough(initialUrl.searchParams.get("walkthrough") ?? "sample", initialUrl.searchParams.get("step") ?? undefined);

const dialog = document.querySelector<HTMLDialogElement>("[data-video-dialog]");
let videoTrigger: HTMLElement | null = null;
document.querySelectorAll<HTMLElement>("[data-video-open]").forEach((button) => button.addEventListener("click", () => { videoTrigger = button; dialog?.showModal(); }));
document.querySelector("[data-video-close]")?.addEventListener("click", () => dialog?.close());
dialog?.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
dialog?.addEventListener("close", () => videoTrigger?.focus());
