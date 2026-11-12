---
name: plan-verification
description: "Use when an FSD and goal issue board need requirement coverage, goal quality, dependency DAG, sizing, and verification validated before execution."
---

# Plan Verification

## Summary

Apply this procedure within its authorized scope and use `.agent/context/output-style.md` for every documentation file created or updated: summary first, relevant HLD, preserved evidence and parser fields.

## Reference Router

Load only the dimensions involved in the current check or failed re-check:

- Requirement coverage, task completeness, and dependency DAGs: [coverage and dependencies](references/coverage-and-dependencies.md)
- Key links, scope sanity, and derived must-haves: [links, scope, and must-haves](references/links-scope-and-must-haves.md)
- Goal and issue granularity: [sizing](references/sizing.md)
- Critical-path tests and exact technical-decision coverage: [tests and decisions](references/tests-and-decisions.md)
- For UI-bearing scope, load the canonical profile and hard gates from [UI contract readiness](../agentic-delivery/references/ui-contract-readiness.md).
- Severity, report format, verdict, and recovery: [verification process](references/verification-process.md)
- Permitted targeted fixes: [revision rules](references/revision-rules.md)

Run ten verification dimensions initially; after revision recheck affected dimensions.

## Mandatory Gates

- **Coverage gate:** Map every requirement/acceptance criterion to FSD authority, verification, and a goal pointer. Missing must-have coverage is Critical.
- **Goal gate:** Every goal needs action, verification, done criteria, dependencies, and one coherent outcome. `Blocked by` paths exist, precede dependents, and form an acyclic graph.
- **Link gate:** Database, API, UI, shared-type, workflow, and other key connections must be ordered and specified before consumers rely on them.
  Check evidence dependencies as well as issue paths: a goal's completion proof
  cannot be its own entry condition. Require a bounded approved qualification/
  enabler path when facts/assets are missing; apply the canonical UI readiness
  reference. First-slice real integration proof gates scale-out, not first-slice entry.
- **Scope gate:** Derive endpoint/page/workflow capability, critical error handling, and user validation. Split separate features or oversized work; merge tiny mechanical work. A coherent tracer bullet may cross layers and must not be rejected merely for doing so.
- **Test gate:** Every critical path, edge case, and error path needs a verification step. Plan authored/changed-gate qualification under [dimension 8](references/tests-and-decisions.md#8-test-coverage).
- **Decision gate:** Every approved `TDEC-*` and every applicable obligation from a linked `ACCEPTED` ADR must map by exact ID to at least one `GOAL-*` and one `TEST-*`. Blocked or superseded decisions stay out of executable goals. Missing exact-ID coverage blocks execution. Fuzzy text similarity may warn after implementation but must never create a blocking match.
- **UI/API readiness gate:** For UI-bearing scope apply [dimension 10](references/tests-and-decisions.md#10-uiapi-integration-readiness): networked `readiness-gate.mjs` exit 0; LOCAL_ONLY mapped local proof within the goal; non-UI `NOT_APPLICABLE` with factual reason. When networked merged verification remains, one `HARDENING` goal depends on applicable UI delivery slices.
- **Enabler-only gate:** `PASS WITH NOTES - ENABLER_ONLY` requires a bounded `CONTRACT_ENABLER` while readiness is `DRAFT/BLOCKED`; first vertical slice and scale-out stay blocked. Apply [qualification/promotion rules](references/tests-and-decisions.md#10-uiapi-integration-readiness) and [verdict limits](references/verification-process.md).
- **Verdict gate:** Report `PASS`, `PASS WITH NOTES`, or `NEEDS REVISION`, with impact-based findings. Apply targeted fixes within scope.
- **Recovery gate:** Repeated failure triggers reassessment/escalation per shared recovery policy; only missing authority/access, hard limits, or proven stagnation stop the affected goal.
