# Forge

### Turn Codex into your game development companion.

Forge turns AI-assisted game development into a visual, guided series of quests. Instead of starting with a blank chat, creators see where their game is going, choose what to build next, approve a clear plan, and watch Codex turn that plan into a playable result.

> **Forge is the platform. The assistant is your companion.**

[![OpenAI Build Week](https://img.shields.io/badge/OpenAI-Build%20Week-black)](https://openai.devpost.com/)
![Status](https://img.shields.io/badge/status-prototype-blue)
![Engine](https://img.shields.io/badge/sample%20project-Godot%204-478CBF)

## Demo

- **[Watch the three-minute demo](VIDEO_URL_HERE)**
- **[View the Devpost submission](DEVPOST_URL_HERE)**

![Forge roadmap dashboard](docs/assets/forge-dashboard.png)

_Mockup placeholder: replace with the final roadmap dashboard screenshot._

## The Build Week experience

The prototype focuses on one polished workflow:

```text
Choose a quest
    ↓
Review the plan
    ↓
Build with Codex
    ↓
Verify the change
    ↓
Play the result
    ↓
Complete the quest
```

The included Godot project starts with a visual roadmap and several prepared gameplay quests. Select **Enemy Targeting** and the Forge companion explains what was planned, what Codex will change, and how the result will be verified. The creator can approve the plan, refine it, ask a question, or choose another direction.

After approval, Forge gives Codex a bounded work packet, translates technical activity into understandable progress, verifies the result, launches the game, and updates the roadmap with satisfying quest-completion feedback.

## Judge quick start

### Planned requirements

- Windows 10 or 11
- Node.js 20 or newer
- Git
- Codex installed and authenticated
- Internet access during initial setup

Godot does not need to be installed in advance. Forge will offer to download a pinned portable build after receiving permission.

### Install and launch

```bash
npx forge-game-dev demo
```

> This is the target judge command. The published package name and command will be verified before submission.

### Repository fallback

```bash
git clone https://github.com/MechanizedIT/forge-game-dev.git
cd forge-game-dev
npm install
npm run demo
```

## Recommended test path

1. Launch Forge.
2. Select the **Enemy Targeting** quest.
3. Review the companion's explanation and implementation plan.
4. Choose **Build with Codex** and approve the mission.
5. Follow the simplified progress updates.
6. Launch the Godot game when prompted.
7. Move near the enemy and confirm it detects and chases the player.
8. Return to Forge to see verification evidence and the completed roadmap node.

The complete judge path is designed to take only a few minutes.

![Selected quest and companion](docs/assets/forge-quest-details.png)

_Mockup placeholder: replace with the final selected-quest screenshot._

## What makes Forge different

Most AI coding tools begin with an empty prompt and return technical output. Forge adds a human-centered experience around Codex:

- **Visual project direction:** A roadmap of landmarks and quests replaces disconnected chat sessions.
- **Bounded work:** Every quest defines its outcome, context, acceptance criteria, and verification path.
- **Human approval:** The creator sees what Codex is about to do before implementation begins.
- **Plain-language communication:** Technical details remain available without becoming the primary experience.
- **Tangible progress:** A completed quest produces a playable change, evidence, and visual feedback.
- **Persistent understanding:** Roadmap state, plans, handoffs, and decisions survive the session.

## How Forge uses Codex and GPT

Codex performs the repository work: inspecting the focused game context, planning the implementation, changing files, running checks, reviewing results, and producing structured handoffs.

Forge governs the experience: selecting the quest, bounding context, requesting approval, tracking workflow state, recording evidence, translating activity into player-friendly updates, and advancing the roadmap.

Focused GPT reasoning stages support the loop:

1. **Plan** — turn a gameplay goal into a concrete plan and acceptance criteria.
2. **Implement** — guide Codex with the approved plan and relevant project context.
3. **Review** — compare the change and evidence with the approved quest.
4. **Explain** — tell the creator what changed, what was verified, and what to do next.

The guiding principle is simple:

> **Models reason. Deterministic systems govern.**

## Prototype architecture

```text
Forge dashboard
      ↓
Quest + roadmap state
      ↓
Focused Codex skills
      ↓
Godot project changes
      ↓
Automated verification
      ↓
Plain-language result
      ↓
Updated roadmap
```

The Build Week workflow is deliberately small:

```text
PLAN → APPROVE → IMPLEMENT → REVIEW → DOCUMENT → COMPLETE
```

## What Forge is becoming

Today, Forge is a focused Godot prototype proving that one gameplay idea can become an understandable, verified, playable accomplishment.

The longer-term vision is a project operating system for AI-assisted creators:

```text
Idea → Vision → Roadmap → Quest → Implementation → Evidence → Progress
```

Future versions may create roadmaps from informal ideas, discover relevant project context, support additional engines, preserve long-term decision history, and adapt the companion to each creator's experience level. The goal is not to remove creators from development; it is to help more people direct complex projects without losing understanding or control.

## Build Week provenance

Forge existed before Build Week as a broader product concept and experimental repository. This submission is a focused new implementation of the game-development companion experience.

- Prior project: [MechanizedIT/Project-Forge](https://github.com/MechanizedIT/Project-Forge)
- Baseline and prior-work disclosure: [`BUILD_WEEK_BASELINE.md`](BUILD_WEEK_BASELINE.md)
- Implementation roadmap: [`ROADMAP.md`](ROADMAP.md)
- AI work log: [`docs/AI_WORK_LOG.md`](docs/AI_WORK_LOG.md)

The judge testing path is fully contained in this repository; the prior project is background only.

## Prototype limitations

- The bundled Godot project is the primary supported test environment.
- Roadmap creation is template-driven.
- Repository scanning is intentionally limited.
- Windows is the primary tested platform.
- The companion lives inside Forge rather than in an operating-system-level overlay.
- Live implementation requires Codex authentication and internet access.

## Built with

Codex · GPT · TypeScript · React · Godot 4 · Node.js · Git

## License

License details will be added before submission.
