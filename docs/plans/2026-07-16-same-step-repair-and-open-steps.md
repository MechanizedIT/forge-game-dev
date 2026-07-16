# Same-Step Repair and Open Steps

## Problem

A failed Godot check is routed through new-Step planning. This consumes another
Step, loses the direct relationship to the failed work session, and is blocked
when an Experience already contains five Steps. The five-Step ceiling is also
enforced in several open-planning persistence boundaries.

## Approved direction

- A failed build repairs the same Step in a new work session.
- The exact creator-visible failure is part of the reviewed repair contract.
- Repair reuses the Step's already approved file boundary and keeps approval,
  verification, playtest, rollback, and history gates.
- Experiences have no creator-facing total Step ceiling. Each model suggestion
  batch remains bounded to at most four Steps.

## Acceptance criteria

1. Repair safely restores or closes the failed run before preparing new work.
2. The new run keeps the same Step ID and includes the repair request in its
   fingerprinted contract and Codex context.
3. Reloading the repair or work page preserves the same-Step relationship.
4. An Experience with five Steps can accept and load a sixth Step.
5. Focused planner, runner, dashboard, type, and production-build checks pass.

## Out of scope

- Changing the one-to-four approved-file safety boundary.
- Changing legacy starter blueprint sizes or prepared sample behavior.
- Reworking completed-Step feature changes; this repair applies to failed,
  incomplete work.
