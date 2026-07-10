# Advanced Debugging Techniques

Load only for the matching branch.

## Regression Localization

When a large change introduced the defect, find a known-good state and bisect or compare incrementally until one change explains the transition. Preserve user work and avoid destructive history operations.

## Five-Level Backward Trace

Trace:

1. **Symptom** — user-visible wrong result
2. **Immediate producer** — code rendering or returning it
3. **Upstream input** — transformer, query, caller, or message
4. **Source** — API, database, user input, file, or external system
5. **Root cause** — missing validation, race, stale state, or broken invariant

Ask "what produced this value?" at every level. A fix at levels 1-2 is suspect unless evidence shows the cause truly lives there.

## Defense in Depth

After the root fix, decide whether the defect class warrants:

- boundary validation at entry,
- business invariant assertions,
- runtime prerequisite/configuration checks,
- safe diagnostic events without secrets or PII.

Each layer must have a distinct failure-detection purpose; do not add redundant checks mechanically.

## Condition-Based Waiting

For async failures, wait for a condition or event rather than sleeping a fixed duration. Poll or subscribe until the condition is true, with a maximum timeout only as a safety net and a meaningful timeout failure. Prefer framework utilities such as `waitFor`, `eventually`, or event-driven notifications.

## Architecture Stop

After three failed fix attempts, stop. Reassess the model, abstraction boundaries, accidental complexity, and test seams. Escalate to redesign or planning rather than stacking a fourth patch.
