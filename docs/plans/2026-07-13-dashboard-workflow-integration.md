# Dashboard Workflow Integration Plan

- **Workflow state:** `COMPLETE`
- **Scope:** Connect the Forge Workshop dashboard to the existing Enemy Targeting command-line workflow.
- **Approval:** The owner approved this bounded milestone in the implementation request.

## Implementation

1. Keep `prepareQuestRun`, `executePreparedQuest`, review creation, Godot launch, and completion persistence authoritative.
2. Add a local Node/TypeScript host that serves the built dashboard, reads validated workspace artifacts, prevents duplicate live runs, and exposes approval, progress, play, and confirmation actions.
3. Split the existing completion gate into reusable post-launch finalization plus the unchanged CLI launch-and-confirm wrapper so the browser can wait for Godot to close before asking the creator.
4. Replace the frontend demo-state controller with real API snapshots and server-sent progress while retaining progressive technical disclosure and the existing visual design.
5. Add focused offline tests using the real runner with fake SDK, verification, and launcher dependencies, plus an explicit CLI cancellation regression.

## Acceptance criteria

- The dashboard reads the real roadmap, Enemy Targeting quest, approved plan, review, verification, and completion artifacts.
- A dashboard approval starts exactly one existing runner execution; concurrent approval is rejected.
- The five approved creator-facing progress stages arrive in order without raw SDK output becoming primary UI.
- Verification failure and Godot launch failure cannot advance the quest.
- Creator rejection or cancellation cannot persist completion.
- Exact creator confirmation after a successful launch persists the existing completion and roadmap artifacts before the UI celebrates.
- Refresh immediately reflects the completed roadmap from disk.
- The developer mock-state controller is absent from the judge path.
- The existing CLI cancellation and full automated suite continue to pass.

## Non-goals

New quests, plan refinement, contextual chat, project scanning, authentication, cloud hosting, App Server, additional providers, repair loops, or visual redesign.
