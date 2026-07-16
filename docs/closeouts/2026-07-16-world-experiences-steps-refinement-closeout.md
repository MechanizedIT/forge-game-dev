# World → Experiences → Steps refinement closeout

## Result

Forge now presents real projects as **World → Experiences → Steps**. Add Experience captures one playable outcome and recommends focused Steps. Contextual testing, feedback, Repair, tuning, history, Assets, and edit flows are joined to the existing safe project workflow.

## Safety and persistence

- Project/System/Quest remain the authoritative backend contracts.
- Follow-up and repair work reuse the existing planner, exact file review, runner, Git boundary, verification, launch, completion, recovery, and undo.
- Presentation state and uploaded images live in ignored `.forge` metadata and do not dirty game Git.
- Uploads are limited to PNG, JPEG, or WebP, five megabytes, safe project containment, and validated file signatures.

## Evidence

- Checkpoint commit: `7795305 Checkpoint real project integration and simplified hierarchy`.
- `npm test`: 173/173 passed.
- `npm run check:v0.1`: 38/38 passed with typecheck and production dashboard build.
- Fresh-host browser review opened Signal Sweep, real Assets, Add Experience, and contextual Test; Back/Forward worked; 390×844 World Map and Assets had no horizontal overflow; fresh-host console had zero warnings or errors.
- Presentation persistence test reloads edits, feedback, tuning, and an uploaded image while the temporary Godot worktree stays clean.

## Known limitation

Tuning remembers explicit values and their intended file/property links, but it does not yet write those values into Godot scripts or settings automatically.

## Next step

Run one real creator journey through Add Experience, suggested Steps, Start Building, playtest feedback, one follow-up Step, and Worked.
