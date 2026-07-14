# Codex Instructions for Forge

This repository is the OpenAI Build Week implementation of Forge: a gamified game-development companion that turns Codex work into visible, bounded, verified quests.

## Read first

Before starting a task, read only the minimum governing context:

1. `AGENTS.md`
2. `docs/REPOSITORY_GUIDE.md` to identify the owning subsystem and authoritative state
3. `README.md` for the product promise and judge path
4. `ROADMAP.md` for sequence and scope
5. `BUILD_WEEK_BASELINE.md` when provenance or prior work matters
6. The selected subsystem instructions, tests, quest, plan, or handoff relevant to the task

Do not load unrelated documents merely because they exist. Prefer focused context and inspect additional files only when the task requires them.

## Repository routing

- Use `docs/REPOSITORY_GUIDE.md` first and `docs/CHANGE_MAP.md` for symptom-oriented navigation.
- Identify the authoritative owner and mutation boundary before editing a consumer.
- Read only the relevant nested `AGENTS.md`, implementation entry points, contracts, and protecting tests.
- Use `rg` to confirm imports, callers, routes, and artifact paths; do not infer ownership from directory names alone.
- Do not load all historical plans, handoffs, reviews, or evidence. Open the latest relevant closeout only when a decision needs provenance.
- Treat generated repository maps and packed indexes as derived navigation aids, never as authoritative state or architecture.

## Product contract

The Build Week prototype must prove one polished experience:

1. Launch Forge with minimal setup.
2. View an example Godot project as a visual roadmap of quests.
3. Select a prepared gameplay quest.
4. Review or refine its implementation plan.
5. Approve Codex to implement it.
6. See understandable progress rather than raw terminal output.
7. Verify the change.
8. Launch the game and experience the new mechanic.
9. Complete the quest with visual feedback.
10. Persist the updated roadmap and concise project record.

Optimize for the shortest reliable path to this judge experience.

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

Keep planning and implementation in separate handoffs. A handoff should end with a short TL;DR, current evidence, remaining risks, and the next bounded action.

## Scope boundaries

Required scope:

- One bundled Godot sample game
- One polished prepared quest, with a few additional roadmap choices
- Visual quest selection and detail view
- Companion explanation and action choices
- Runtime Codex integration
- Structured plan, implementation, review, and closeout artifacts
- Automated headless verification
- Game launch and visible mechanic change
- Persistent roadmap state and quest-completion feedback
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
- State what changed, what passed, what remains uncertain, and what should happen next.

Use this requirement in future Codex milestone prompts:

> Update `PROJECT_STATUS.md` at milestone closeout so it accurately reflects what works, what remains incomplete, how the current experience can be tested, and the next recommended milestone. Keep it concise and understandable without reading the technical handoffs.

## Priority when asked to proceed

1. Unblock the golden path.
2. Make the existing path work end to end without the UI.
3. Connect the real backend to the dashboard.
4. Improve progress, failure, and completion communication.
5. Harden installation and judge replay.
6. Add the new-quest planning path.
7. Consider stretch goals only after the judge path is repeatable.
