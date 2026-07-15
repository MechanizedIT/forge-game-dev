# External Test Plan

## Purpose and order

External testing should answer whether Forge is understandable and controllable, not create testimonials on demand. Run tests only after feature freeze and only on a known recoverable build. Preserve submission time by using the smallest test appropriate to each person's available setup.

Priority evidence, strongest first:

1. Independent tester completes one generated quest.
2. Independent tester creates and advances a tiny game.
3. Usability correction derived from observed confusion.
4. Permissioned screen-recording excerpt.
5. Permissioned concise quote.
6. Showcase comprehension result.

## Tester profiles

| Profile | Best session | What it tests |
| --- | --- | --- |
| Non-programmer interested in making a game | Showcase comprehension, then owner-assisted local flow | Plain language, decision load, approval meaning, proof vs playtest |
| Godot/game-development user | Local alpha on Signal Sweep or Gravity Tap | Starter honesty, editor/play workflow, quest scope, mechanic credibility |
| AI coding-tool user | Full generated quest with technical details available | Context boundary, approval, progress, verification, Git/rollback trust |

Recruit one per profile if possible; two high-quality sessions are better than many rushed sessions.

## Showcase comprehension script (5–10 minutes)

Give only the public URL and say: “Look at this as if someone sent it to you. Think aloud for 30–60 seconds.” Then ask:

1. What do you think Forge does?
2. What works today?
3. What appears to be future vision?
4. What would you click first?
5. What is confusing?
6. How is this different from ordinary AI chat or a coding tool?
7. Would you install it? What would stop you?

Record time to first accurate explanation, first click, current/future classification errors, unclear terms, and install blockers. Do not correct the tester until the initial answers are captured.

## Local alpha script (25–45 minutes)

Precondition: owner has rehearsed the exact build and captured its baseline commit. Give the tester the judge/setup instructions, not repository architecture notes.

Observe without leading:

- setup completion and recovery attempts;
- time to understand Launchpad;
- idea entry and supported-foundation interpretation;
- vision and roadmap acceptance;
- recognition of starter facts versus planned work;
- time to choose/adjust the first quest;
- whether the exact file boundary and approval are meaningful;
- whether progress, automated proof, and creator play are distinguished;
- playtest behavior and confirmation choice;
- completion/Chronicle/Git/next-quest comprehension;
- restart restoration;
- owner interventions and why they were necessary;
- the tester's final explanation of what Forge changed.

Use task prompts such as “Make a tiny signal-relay game,” not instructions naming buttons. If a non-programmer cannot finish setup in the scheduled window, switch to owner-assisted execution and measure product comprehension rather than changing architecture.

## Evidence record

For each session store a private, sanitized record outside public showcase content until consent is resolved:

```text
sessionId, date, buildCommit, testerProfile, testType
consent: notes | recording | anonymousQuote | namedQuote | projectPublication
times: setup, launchpad, acceptedVision, acceptedRoadmap, questStart, completion
observations[], ownerInterventions[], bugs[], terminology[], successfulArtifacts[]
publicationCandidates[] with per-item consent and redaction status
```

Think-aloud notes should describe observed behavior and short paraphrases. A verbatim quote, name, face, voice, screen recording, or tester-created project is never public without explicit item-level permission. A tester can withdraw publication permission without invalidating private usability findings.

## Triage

| Level | Definition | Freeze behavior |
| --- | --- | --- |
| P0 integrity | Data loss, wrong project, boundary escape, false completion, unrecoverable run | Stop tests; fix or revert to v0.2 story |
| P0 journey | Tester cannot approve/build/play/confirm/restore on rehearsed setup | Fix only if bounded; otherwise use fallback proof |
| Submission clarity | Current/future confusion, approval/proof misunderstanding, unclear next step | Copy/layout correction allowed if no architecture change |
| P1 usability | Extra clicks, terminology, editor convenience | Record for after submission unless trivial |
| Future request | chat, more starters, export/publishing, import | Record; do not unfreeze |

Every change after freeze requires: linked observation, bounded diff, focused regression, full clean replay if it touches state, and no loss of the three-day submission reserve.

## Success thresholds

- All testers correctly identify that Forge structures and governs Codex work rather than replacing Codex.
- No tester thinks planned quests are already implemented or model suggestions are automated proof.
- At least one tester can state which files Codex was allowed to change and why they still had to play.
- The rehearsed local tester reaches completion without owner filesystem/Git repair.
- Restart restoration is understood without explanation.
- All public evidence has explicit recorded consent; no fabricated or unattributed quote is used.
