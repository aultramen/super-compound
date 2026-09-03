---
name: plan-verification
description: "Use when an FSD and goal issue board need requirement coverage, goal quality, dependency DAG, sizing, and verification validated before execution."
---

# Plan Verification

Announce: "I'm using the plan-verification skill to validate this plan before execution."

## Reference Router

Load only the dimensions involved in the current check or failed re-check:

- Requirement coverage, task completeness, and dependency DAGs: [coverage and dependencies](references/coverage-and-dependencies.md)
- Key links, scope sanity, and derived must-haves: [links, scope, and must-haves](references/links-scope-and-must-haves.md)
- Goal and issue granularity: [sizing](references/sizing.md)
- Critical-path tests and exact technical-decision coverage: [tests and decisions](references/tests-and-decisions.md)
- For UI-bearing scope, load the canonical profile and hard gates from [UI contract readiness](../agentic-delivery/references/ui-contract-readiness.md).
- Severity, report format, verdict, and retry limit: [verification process](references/verification-process.md)
- Permitted targeted fixes: [revision rules](references/revision-rules.md)

Run all ten verification dimensions initially; after revision rerun failed dimensions and affected dependencies.

## Mandatory Gates

- **Coverage gate:** Every BRD/PRD requirement and acceptance criterion needs corresponding FSD authority, verification, and a goal issue pointer. Missing coverage is Critical.
- **Goal gate:** Every goal needs a clear action, verification, done criteria, explicit dependencies, and a coherent independently verifiable outcome. Dependencies and `Blocked by` paths must exist, precede dependents, and form an acyclic graph.
- **Link gate:** Database, API, UI, shared-type, workflow, and other key connections must be ordered and specified before consumers rely on them.
- **Scope gate:** Derive endpoint/page/workflow capability, critical error handling, and user validation. Split separate features or oversized work; merge tiny mechanical work. A coherent tracer bullet may cross layers and must not be rejected merely for doing so.
- **Test gate:** Every critical path, edge case, and error path needs a verification step.
- **Decision gate:** Every approved `TDEC-*` and every applicable obligation from a linked `ACCEPTED` ADR must map by exact ID to at least one `GOAL-*` and one `TEST-*`. Blocked or superseded decisions stay out of executable goals. Missing exact-ID coverage blocks execution. Fuzzy text similarity may warn after implementation but must never create a blocking match.
- **UI/API readiness gate:** Dimension 10 applies only to UI-bearing scope. Require
  `node .agent/tools/readiness-gate.mjs` exit 0 (every canonical hard gate),
  contract version and refs on each UI issue, exactly one first vertical slice,
  and scale-out dependencies on its verified issue. Require exactly one
  `HARDENING` goal that depends on every UI delivery slice. An exception or
  mock-only result cannot hide a failed hard gate. Non-UI work records
  `NOT_APPLICABLE` with approved reason.
- **Enabler-only gate:** A `CONTRACT_ENABLER` is the sole exception while
  readiness is `DRAFT` or `BLOCKED`. Report `PASS WITH NOTES - ENABLER_ONLY` only
  when the enabler is independently bounded/testable and every
  first vertical slice and scale-out issue remains blocked. After verification, return to
  `/sc-plan` and rerun all UI/API hard gates.
- **Verdict gate:** Report `PASS`, `PASS WITH NOTES`, or `NEEDS REVISION`, with findings classified Critical, Important, or Suggestion. Apply targeted fixes only; do not change scope or add features.
- **Stop gate:** After three failed revision loops, stop and mark `needs_review`.
