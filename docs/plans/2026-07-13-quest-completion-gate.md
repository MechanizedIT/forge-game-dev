# Command-Line Quest Completion Gate Plan

- **Workflow state:** `COMPLETE`
- **Baseline:** `ea9887c474b4307342de6067ab39bcf7350f4c23`
- **Scope:** Launch, exact creator confirmation, final review, and persistent Enemy Targeting completion only

## Approved implementation

1. Accept only an automated result whose scope and two command verifications passed, with only the visual criterion pending.
2. Offer to launch the exact prepared workspace through the verified Godot 4.7 executable.
3. Explain the three visible states and wait until the game closes.
4. Accept only `I SAW IT WORK`, `IT DID NOT WORK`, or `CANCEL`.
5. On exact success, write a final `PASS` review, strict completion closeout, persistent `COMPLETE` state, confirmation timestamp, and `completed` roadmap node.
6. Leave state unchanged on failed automation, launch failure, reported visual failure, cancellation, or absent interactive input.
7. Detect persisted completion before dirty-workspace checks and explain it instead of rebuilding.

## Non-goals

Dashboard, avatar, animation, sound, new quests, mechanic changes, repair loops, and generalized engine or workflow infrastructure.
