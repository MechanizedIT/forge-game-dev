# Enemy Targeting Command-Line Loop Plan

- **Workflow state:** `COMPLETE`
- **Baseline:** `ef64f8f3d9e3e1cf93b0b01ac8048b8dadcccbf4`
- **Scope:** One live Enemy Targeting execution path before dashboard work

## Approved implementation

1. Validate the prepared quest, approved plan, roadmap linkage, workspace, and verification allowlist.
2. Establish a clean Git baseline only when a workspace is first prepared or explicitly reset.
3. Require creator approval, then send a three-file bounded work packet to the official `@openai/codex-sdk` in the demo workspace.
4. Reduce SDK events to five creator-facing stages while retaining sanitized technical evidence.
5. Capture the actual diff, run the two approved commands, and deterministically review every criterion.
6. Write validated handoff and review artifacts; leave the roadmap `available` pending visible play confirmation.

## Acceptance criteria

- Invalid quest, plan, workspace, approval, or verification data prevents execution.
- Cancellation starts no SDK turn and cannot complete the quest.
- Codex can write only the persistent demo workspace and receives only declared context.
- The normal test suite is offline and uses a fake SDK/event stream.
- A real opt-in SDK command exists and produces plain-language progress.
- Actual diff scope and command evidence determine `CONDITIONAL PASS` or `FAIL`.
- Handoff and review artifacts pass strict runtime validation.
- Prepare, preserve, reset, Godot verification, and play behavior remain intact.

## Non-goals

Dashboard, avatar, completion feedback, multiple quests/providers, App Server, scanning, retries, repair loops, and generalized agent infrastructure.
