# Real World → Building → Part integration

## Approved scope

The owner's prompt approves immediate implementation of the existing Project/System/Quest backend inside the redesigned shell. No backend migration, runner rewrite, new dependency, or broad visual redesign is allowed.

## Plan

1. Map real Project/System/Quest data to World/Building/Part in a small typed presentation adapter.
2. Route saved Worlds into the redesigned shell and bypass Region/Town in the normal path.
3. Reuse the World Map, carousel, Inspector, breadcrumbs, and Part Detail components with real data.
4. Wire Add Building and Add Part to the existing system and quest planning services.
5. Open the existing work-order and Codex runner from Part Detail with recommended files already selected.
6. Present one **Start Building** confirmation, plain progress, Playtest, and Worked/Needs Fixing/Not Sure while preserving advanced details.
7. Replace the text logo with the supplied FORGIE / GAME DEV WORKSHOP artwork.
8. Run focused adapter, planning, runner, completion, type, build, desktop, and mobile checks; run the full suite once near completion.

## Acceptance

- Saved projects open as Worlds in the redesigned shell.
- Systems and quests appear directly as Buildings and Parts.
- Region and Town are not normal navigation gates.
- Creation actions reuse authoritative planning services.
- Part work reuses file recommendation, exact work orders, runner safety, verification, Godot play, completion, and undo.
- The normal Part screen explains the result, files, checks, and one next action in plain language.
