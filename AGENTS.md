# Codex Instructions for Forge

This repository is the OpenAI Build Week implementation of Forge: a visual game-project workspace that turns ideas into an organized roadmap, turns roadmap systems into buildable quests, and translates AI-agent work into understandable, verified progress.

## Read first

Before starting a task, read only the minimum governing context:

1. `AGENTS.md`
2. `docs/PRODUCT_VISION.md` for the product direction and decision filter
3. `docs/REPOSITORY_GUIDE.md` to identify the owning subsystem and authoritative state
4. `README.md` for the product promise and judge path
5. `ROADMAP.md` for sequence and scope
6. `BUILD_WEEK_BASELINE.md` when provenance or prior work matters
7. The selected subsystem instructions, tests, quest, plan, or handoff relevant to the task

Do not load unrelated documents merely because they exist. Prefer focused context and inspect additional files only when the task requires them.

## Product vision gate

`docs/PRODUCT_VISION.md` governs product direction. Current code, old plans, demo
starters, verification profiles, and capability labels may describe the present
implementation, but they do not override the vision.

Before proposing or implementing product work, ask:

1. Does this help a creator visually organize a game as broad systems and smaller quests?
2. Can the creator describe the mechanic without Forge needing a new supported-game-type or capability entry?
3. Does this simplify the creator's path, or add screens, ceremony, and technical language?
4. Is this the smallest end-to-end improvement that moves the alpha toward real use?
5. Will Forge explain and record the agent's work in language the creator can understand?

If the answer is no, simplify, defer, or redesign the work. A known template or
verifier may make a path faster or safer, but it must not decide what creators
are allowed to plan.

## Repository routing

- Use `docs/REPOSITORY_GUIDE.md` first and `docs/CHANGE_MAP.md` for symptom-oriented navigation.
- Identify the authoritative owner and mutation boundary before editing a consumer.
- Read only the relevant nested `AGENTS.md`, implementation entry points, contracts, and protecting tests.
- Use `rg` to confirm imports, callers, routes, and artifact paths; do not infer ownership from directory names alone.
- Do not load all historical plans, handoffs, reviews, or evidence. Open the latest relevant closeout only when a decision needs provenance.
- Treat generated repository maps and packed indexes as derived navigation aids, never as authoritative state or architecture.

## Product contract

The alpha must prove one polished experience:

1. Launch Forge with minimal setup.
2. Start or reopen a Godot project.
3. Discuss the game idea and see a visual roadmap of broad systems.
4. Open one system and refine it into smaller quests.
5. Select one quest and approve a plain-language agent work order.
6. See understandable progress rather than raw terminal output.
7. Verify the project with baseline checks and any optional extra proof.
8. Launch the real game and experience the new mechanic.
9. Confirm, revise, or undo the result.
10. Persist the updated quest, parent system, roadmap, history, and concise project record.

Optimize for the shortest reliable path to this creator experience. Preserve the
existing judge path as compatibility evidence, not as a limit on the product model.

## Workflow

All meaningful feature work follows this state machine:

```text
PLAN → APPROVE → IMPLEMENT → REVIEW → DOCUMENT → COMPLETE
```

- **Plan:** Inspect relevant context and write a bounded plan with acceptance criteria.
- **Approve:** Stop before meaningful implementation when the plan requires a human product decision.
- **Implement:** Change only what the approved task requires.
- **Review:** Compare the actual diff and evidence with every acceptance criterion.
- **Document:** Update concise operational state, roadmap, handoff, and work log.
- **Complete:** Mark work complete only when evidence supports it.

Keep planning and implementation in separate handoffs. A handoff must end with
the owner-facing format in **Owner communication** below.

## Scope boundaries

Required scope:

- One polished Godot alpha path; a bundled sample may prove it but must not define supported game types
- Conversational game planning into a visual roadmap of broad systems
- Conversational system refinement into smaller quests
- Visual system and quest selection with one clear next action
- Runtime Codex integration
- Plain-language work approval, progress, result, and next-step explanation
- Structured plan, implementation, review, run, and closeout artifacts in the background
- Baseline automated verification, with optional mechanic-specific proof that never gates eligibility
- Game launch and visible mechanic change
- Persistent project, system, quest, history, and completion feedback
- Minimal judge installation path

Explicitly out of scope unless the required path is already complete:

- Vector databases or generalized semantic memory
- Multi-provider model routing
- Autonomous multi-agent frameworks
- Cloud accounts, authentication, or team collaboration
- Plugin or skill marketplaces
- General-purpose project scanning
- Unity or Unreal integration
- Native always-on-top desktop avatar
- Currencies, inventories, leveling, or broad gamification systems
- Production-scale security and deployment infrastructure

If a proposed feature does not make the golden path more understandable, credible, reliable, or demonstrable within three minutes, defer it.

A starter, template, or verification adapter is an implementation convenience.
Do not turn it into the product's list of allowed ideas, mechanics, or game types.

## Alpha fast-track

- Build the smallest real vertical slice that a creator can use and understand.
- Prefer extending the working path over inventing a framework for possible future paths.
- Do not add a registry, catalog, abstraction, or generalized subsystem unless the current alpha path needs it now.
- Reuse Task A's safety and recovery machinery and Task B's useful planning and persistence work; remove gates rather than multiplying profiles.
- Keep milestones independently demonstrable and ordered by creator value.
- Make one owner decision at a time. Do not create approval screens for decisions Forge can safely make itself.
- Stop opportunistic refactors, broad polish, and stretch features when the next alpha blocker is solved.
- Safety governs what an agent may change. It must not govern what a creator may imagine or place on the roadmap.

## Implementation principles

- Models reason; deterministic systems govern.
- Prefer explicit manifests, schemas, templates, and state transitions.
- Use focused Codex skills for planning, implementation, and closeout.
- Keep user-visible language plain; technical details should use progressive disclosure.
- Never present raw model or terminal output as the primary progress experience.
- Preserve user control before meaningful project changes.
- Do not claim verification without command output or visible evidence.
- Keep documents operational and short. Put executable truth in code and structured data.
- Pin external tools used by the judge path where practical.
- Preserve existing user changes and avoid unrelated rewrites.

## Owner communication

Treat the owner as a smart product creator who should not need engineering
knowledge. Explain it like you would to a five-year-old: short sentences,
ordinary words, concrete outcomes, and one action at a time. This is a clarity
rule, not permission to be patronizing.

Every completion response and handoff must begin with these sections:

1. **What I did** — at most three short bullets about visible outcomes.
2. **What this means** — one short paragraph explaining why it matters.
3. **What you do next** — exactly one recommended next action. If no action is needed, say: **Nothing. You are done for now.**
4. **How to do it** — when an action is needed, give exact clicks, commands, or steps. Do not merely point to another document or assume the owner knows where a command runs.

Put logs, hashes, schemas, file inventories, test counts, and implementation
details under **Technical details (optional)** after the owner brief. Do not lead
with them. Define any unavoidable technical term in plain language the first
time it appears. If something failed, state what the owner can do next before
explaining the internal cause.

## Evidence and provenance

Build Week provenance is part of the product work, not an afterthought.

For every meaningful AI-assisted work unit, update `docs/AI_WORK_LOG.md` with:

- Date and objective
- Actor or model surface
- Workflow stage
- Human decisions
- AI contribution
- Files changed
- Verification and result
- Commit SHA once available
- Codex session or `/feedback` ID when applicable

Store runtime quest artifacts under `.forge/runs/` or the repository's eventual equivalent. Do not record hidden reasoning, secrets, credentials, or unredacted private transcripts. Commit a small sanitized representative run for judges once the workflow exists.

Git history is the authoritative change record. `BUILD_WEEK_BASELINE.md` distinguishes prior work from new work; the AI work log explains collaboration; judge-facing milestone summaries should remain concise.

## Completion checklist

Before calling a task complete:

- Confirm the approved scope was not expanded.
- Run the smallest relevant automated checks.
- Exercise the affected user path when practical.
- Review the diff for unrelated changes.
- Update the relevant roadmap or handoff state.
- At milestone closeout, update `PROJECT_STATUS.md`; do not update it after every edit.
- Add or update the AI work-log entry.
- Give the owner-facing **What I did / What this means / What you do next / How to do it** brief.
- State technical evidence and uncertainty only after the plain-language brief.

Use this requirement in future Codex milestone prompts:

> Update `PROJECT_STATUS.md` at milestone closeout so it accurately reflects what works, what remains incomplete, how the current experience can be tested, and the next recommended milestone. Keep it concise and understandable without reading the technical handoffs.

## Priority when asked to proceed

1. Unblock the golden path.
2. Make the existing path work end to end without the UI.
3. Replace capability-gated planning with the open Project → System → Quest model.
4. Connect the real backend to the simplest roadmap-centered UI.
5. Improve progress, failure, completion, and next-action communication.
6. Harden installation, restart recovery, and judge replay.
7. Consider stretch goals only after the creator path is repeatable.
