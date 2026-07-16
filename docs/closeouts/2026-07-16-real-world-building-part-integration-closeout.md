# Real World → Building → Part integration closeout

## Outcome

Real registered projects now open inside the redesigned World Map shell. The presentation adapter maps the existing backend without changing its schema:

- Project → World
- System → Building
- Quest → Part

Region and Town remain dormant prototype objects. They are no longer required navigation levels.

## Reused backend boundaries

- Registered-project validation and read-only World loading
- Open system and quest planning
- Bounded file discovery and recommendation
- Exact work-order review and acceptance
- Existing Codex runner, progress stream, verification, Godot launch, creator result, completion, reload, and undo

## Simplified creator path

Part Detail now shows the visible result, status, recommended files, done-when checks, related Building, and **What Forgie will do**. **Start Building** uses that visible summary as the single normal confirmation. File editing and the exact technical work contract remain under **Review Files** and **Advanced Details**.

During work, Forge shows plain progress. After checks pass it shows **Playtest**, then **Worked**, **Needs Fixing**, and **Not Sure**. Only **Worked** can complete the real Quest.

## Verification

- Focused hierarchy and presentation tests: 10/10 passed
- Focused adapter, generated World, system planning, quest planning, runner, and completion tests: 45/45 passed
- TypeScript typecheck: passed
- Production dashboard build: passed
- Desktop browser: real Signal Sweep World → First Playable Building → Activate the Signal Relay Part passed
- Browser Back/Forward: passed
- 390×844 mobile Part layout and overflow check: passed
- Browser console warnings/errors: none
- Full repository suite: 171/171 passed
- Protected v0.1 compatibility checks: 38/38 passed with typecheck and production build
- Repository context validation: passed

## Known limit

The browser review stopped before **Start Building** because that action intentionally approves and starts real Codex work in a registered project. Existing automated runner and completion tests cover the protected backend path. Atlas, Repair, Assets, and Publish remain intentionally shallow outside the required path.

## Next

The owner should run one chosen real Part through **Start Building → Playtest → Worked** and judge the wording and feel of the joined experience.
