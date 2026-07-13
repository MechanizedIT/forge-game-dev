# Forge Artifact Templates

These files define the minimum information Forge needs for one bounded quest. The JSON templates are valid JSON so they can become fixtures for the first contract tests.

- `project-manifest.template.json` — engine, artifact paths, and allowed commands
- `roadmap.template.json` — persistent quest availability and completion
- `quest.template.json` — static outcome, scope, criteria, and verification
- `implementation-plan.template.json` — reviewable plan revision awaiting approval
- `implementation-handoff.template.json` — implementation evidence passed to review
- `review-result.template.json` — criterion-by-criterion review and next state
- [`../AI_WORK_LOG.md`](../AI_WORK_LOG.md#entry-template) — canonical concise work-log entry template; it is linked rather than duplicated here

Runtime ownership is intentionally singular: roadmap status is not stored in a quest, and workflow stage is not stored in the roadmap. Replace the sample values; do not add provider configuration, chat transcripts, secrets, or hidden reasoning.
