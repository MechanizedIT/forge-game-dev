# World → Experiences → Steps refinement plan

## Goal

Make the creator-facing hierarchy and feedback loop read like game creation, while preserving Forge's existing typed Project/System/Quest records and protected runner.

## Approved scope

1. Checkpoint the tested real-project integration after reviewing the worktree.
2. Present the normal hierarchy as World → Experiences → Steps.
3. Let Add Experience recommend editable Steps for one playable outcome.
4. Add contextual testing and turn change or broken results into follow-up Steps.
5. Add repair, persistent tuning metadata, presentation history, and real project Assets.
6. Keep all implementation work behind the existing work-order, Codex, file, Git, verification, playtest, completion, and undo boundaries.
7. Verify the full suite, protected compatibility, persistence, desktop/mobile layout, Back/Forward, and fresh-host console state.

## Acceptance criteria

- Normal creator screens use World, Experience, and Step; backend terms appear only in technical details.
- Add Experience produces only its new Experience and its suggested Steps.
- Test works contextually at all three levels and records one clear result.
- Needs a Change and Broken prepare bounded follow-up Steps rather than editing game files directly.
- Presentation data persists without dirtying the game worktree.
- Assets safely lists real files and accepts only bounded PNG, JPEG, or WebP uploads.
- Full tests and the protected v0.1 check pass.

## Approval

The owner explicitly supplied the hierarchy and requested the checkpoint and implementation in this task.
