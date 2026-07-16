# React dashboard World Map redesign

## Goal

Replace the old Forge dashboard shell with a polished, beginner-readable workspace based on the supplied mockup while keeping the working project creation, project opening, quest approval, Codex run, verification, and Godot launch paths available.

## Fast path

- Add a small hash-route layer so Back, Forward, breadcrumbs, and direct links work without changing the local host.
- Keep existing backend-connected flows behind the new World Forge and Existing Worlds screens.
- Add a normalized local Rust Runner repository for the prototype-only World → Region → Town → Building → Part hierarchy.
- Build shared shell, hero, carousel, inspector, form, and status components once.
- Use local persistence for add/edit, Atlas, repair, publish, and lightweight assistant actions until matching backend endpoints exist.
- Store generated scene art behind image keys; keep interface icons as accessible SVG.

## Mapping

- Existing generated project → World
- Existing roadmap system → Region presentation when shown in the operational workspace
- Existing quest → Building/Part work item depending on its size
- Existing project activity/documents → Atlas records
- Prototype-only Region/Town organization → local repository, never written into authoritative backend artifacts

## Acceptance criteria

1. World Forge, New World, Existing Worlds, World Map, Atlas, Build, Repair, Publish, Part Detail, and add/edit routes are reachable and have no dead primary actions.
2. Rust Runner drills through World → Region → Town → Building → Part with URL-backed breadcrumbs and changing hero artwork.
3. Add/edit actions persist locally and return to the correct hierarchy level.
4. Existing backend-connected new/open project and generated quest-runner screens remain reachable.
5. Desktop uses the three-column layout; narrow screens prioritize the main viewport and expose side rails as drawers.
6. Typecheck, focused tests, production build, and desktop/mobile browser checks pass.

## Backend gaps kept local

Region/Town persistence, Atlas indexing, repairs, release readiness, and AI image selection do not yet have matching backend contracts. They stay behind the frontend repository/service boundary so they can be replaced without changing screen components.
