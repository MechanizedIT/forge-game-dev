# Skills and Context Plan

## Decision

Do not add a product runtime skill before feature freeze. The first generated-quest loop should use deterministic services, strict schemas, an explicit Codex prompt, and a small context package. Skills become useful after a procedure has repeated and stabilized; they never own project state, approval, file authority, proof, or completion.

This follows the official distinction in [Codex skills](https://learn.chatgpt.com/docs/build-skills.md): a skill is a progressively disclosed reusable workflow package. [AGENTS.md guidance](https://learn.chatgpt.com/docs/agent-configuration/agents-md.md) remains the durable repository instruction layer. Because Forge starts the SDK in a generated project directory, a skill stored only in Forge's `.agents/skills` is not automatically generated-project authority and should not be assumed available there.

## Candidate evaluation

Every candidate below has an explicit disposition. “Deterministic” means code/schema is better than a skill for the alpha.

| Candidate | Purpose/caller/input → structured output | Forbidden responsibility / location and mode | Version, tests, failure / decision |
| --- | --- | --- | --- |
| Game-idea decomposition | Planner: idea + answers → bounded premise/goals | No foundation selection or persistence; product planner | Schema-versioned fixture/rehearsal; fail closed / keep in prompt+schema |
| Foundation recommendation | Planner: idea + starter capabilities → fit, interpretation, alternatives | No starter creation or silent coercion; product planner | Blueprint schema tests + poor-fit cases / deterministic wrapper + model field, no skill P0 |
| Blueprint generation | Planner: accepted interpretation → blueprint | No project paths/code/commands; product planner | Existing schema/session/repair / retain existing prompt, not a skill |
| Roadmap review | Planner/UI: blueprint + starter facts + edits → accepted delta roadmap | No source mutation; blueprint planner | Graph/edit/reload tests / deterministic validation with model proposal |
| Quest specification | Future proposal flow: seed/current facts → reviewable quest proposal | No roadmap mutation until acceptance; Forge owner-level or product P1 | Proposal schema/revision tests / defer |
| Generated implementation | Runner: approved contract + exact files → source diff/events | No state/Git/verification authority; generated project SDK context | Contract version + boundary/failure/real rehearsal / explicit prompt P0; consider skill later |
| Godot-aware implementation | Runner: controlled scene/scripts + verifier API → bounded edits | No arbitrary Godot docs/network/assets; generated project | Same run tests / fold into contract prompt, not a separate skill |
| Verification planning | Planner: criteria → proposed proof profile | Cannot create proof or let model choose commands; product planner | Profile registry fixtures / deterministic profile lookup; unsupported means ineligible |
| Creator explanation | UI adapter: validated state → plain explanation | No hidden chat truth or mutation; product code | Snapshot/copy tests / deterministic templates P0 |
| Documentation synchronization | Completion: JSON transaction → Markdown | No model-authored authority; product code | Renderer version/golden byte tests / deterministic only |
| Idea-to-quest refinement | Future: seed + project facts → proposal revision | No automatic promotion/code; product P1 | Proposal schema/duplicate/rejection tests / defer |
| Web export preparation | Owner: manifest/readiness → checklist/result | No credentials/public deploy; owner/submission tooling | Pinned Godot/preset checks / guided checklist P2, potential skill after proof |
| Submission evidence | Owner: sanitized run manifest + consent → evidence checklist/copy proposal | No fabrication/private upload/deploy; `.agents/skills` owner tooling | Evidence schema/truth/privacy tests / existing visual-plan plus deterministic showcase tools suffice |

If a later skill is created, use a focused location and name such as `.agents/skills/generated-quest-closeout/` for Forge development or a versioned starter-owned `.agents/skills/forge-quest-implementation/` only after generated projects deliberately ship that surface. Its `SKILL.md` must define caller, inputs, output artifact, forbidden writes, and fail-closed behavior. Do not copy Forge's full history into it.

## Runtime context package

The generated runner assembles context from authoritative owners, never from search over all history:

| Section | Source | Selection rule |
| --- | --- | --- |
| Objective | accepted quest revision | one player-visible outcome and why |
| Current facts | starter manifest + latest verified/completed state | only facts relevant to this quest |
| Plan | approved implementation contract | bounded ordered steps and exclusions |
| Files | starter role map + contract | 1–4 exact existing UTF-8 text files with hashes and full contents |
| Scene | deterministic parser/manifest | compact nodes/scripts relevant to allowed files |
| Proof target | Forge verification profile registry | profile ID, required observable API/state, acceptance mapping; no editable verifier source needed |
| Process rules | Forge runner | no new/delete/rename/dependency/command/state/cache changes; stop on ambiguity |
| Output | runner protocol | concise summary, actual touched paths, checks attempted; Forge independently reviews |

Budget rules:

- Maximum four editable source/scene files.
- Maximum 40,000 UTF-8 characters for the complete model context, approximately 10,000 tokens depending on code/text mix.
- Maximum one current quest and its direct dependencies' outcome summaries; no unrelated quest bodies.
- Full contents for approved files—never lossy excerpts that hide edit context.
- No silent truncation. If the package exceeds budget, reduce quest/file scope or make it ineligible.
- Record section byte counts, file hashes, contract fingerprint, model/config, and SDK usage/latency in sanitized evidence.

Do not include entire Chronicle, prior raw model transcripts, every planning artifact, other projects, user home paths beyond the resolved working directory needed by the SDK, secrets, credentials, or public-network access. The SDK uses workspace-write for the generated project and network disabled. Forge performs all Godot/Git commands outside the model.

## Failure behavior

- Missing/invalid authoritative input: no model call; return to quest/contract review.
- Unsupported verification criteria: mark quest planned but not build-eligible; do not ask Codex to invent proof.
- Oversized context: fail preparation with the exact oversized section and a smaller-quest recommendation.
- Skill not found/version mismatch in any later design: fall back only to a versioned embedded prompt with identical contract, never to unbounded behavior.
- Model violates instructions: boundary fails regardless of model summary; no verification or completion.
- Context/procedure version changes after approval: invalidate the fingerprint and require approval again.

Forge remains authoritative because all durable state comes from validated JSON and transactions; all paths/commands/proof/Git come from deterministic code; every model/skill output is a proposal or bounded source diff subject to independent review.
