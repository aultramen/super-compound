---
name: gap-closure
description: "Use when verification, review, or manual testing identifies concrete gaps in otherwise planned or completed work."
---

# Gap Closure

## Overview

Announce: "I'm using the gap-closure skill to create targeted fixes for the identified gaps."

Close only evidenced gaps; do not restart planning or turn repair into enhancement work.

## When to Use

Activate for goal-backward truth/artifact/wiring gaps, P1/P2 review findings, broken integration wiring, failing verification, or missing behavior exposed by manual testing.

- When converting evidence into bounded work, load [Gap Analysis and Plan](references/gap-analysis-and-plan.md).
- When implementing an approved closure plan, load [Execute and Re-Verify](references/execute-and-reverify.md).

Do not use when requirements or architecture are genuinely undecided; return to the appropriate planning/decision workflow instead.

## Closure Gate

**Gaps only:** every fix task must trace to a specific source finding and include files plus a proving check.

1. Parse each gap's symptom, category, severity, and root cause.
2. Cluster gaps sharing a component, file, cause, or verification dimension.
3. Create minimal fix tasks and explicit out-of-scope boundaries.
4. Execute through `test-driven-development` and focused edits.
5. Re-run the ORIGINAL verification, then relevant regression checks.
6. If new gaps appear, stop after max 2 additional closure iterations and report what remains.

## Red Flags

| Thought | Required response |
|---|---|
| "While I'm here, improve..." | Record separately; fix only sourced gaps. |
| "Rewrite the component" | Target the root cause with the smallest repair. |
| "Start planning from scratch" | Preserve verified work and plan only gaps. |
| "The new test passes, so done" | Re-run the original verification and regressions. |
| "One more closure loop" beyond the cap | Stop and escalate remaining evidence. |

## Integration

- Triggered by `verification-before-completion`, `code-review`, `integration-checking`, or manual evidence.
- Uses `executing-plans` for fix tasks and `test-driven-development` for behavior.
- Uses `systematic-debugging` when root cause is not yet established.
- Returns to `verification-before-completion` and `state-management` after repair.
