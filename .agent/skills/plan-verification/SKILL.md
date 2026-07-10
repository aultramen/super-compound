---
name: plan-verification
description: "Use when an FSD and goal issue board need requirement coverage, goal quality, dependency DAG, sizing, and verification validated before execution."
---

# Plan Verification

## Overview

FSDs are implementation contracts. Run all nine verification dimensions before execution so gaps are fixed while they are cheap.

Announce: "I'm using the plan-verification skill to validate this plan before execution."

## Reference Router

Load only the dimensions involved in the current check or failed re-check:

- Requirement coverage, task completeness, and dependency DAGs: [coverage and dependencies](references/coverage-and-dependencies.md)
- Key links, scope sanity, and derived must-haves: [links, scope, and must-haves](references/links-scope-and-must-haves.md)
- Goal and issue granularity: [sizing](references/sizing.md)
- Critical-path tests and exact technical-decision coverage: [tests and decisions](references/tests-and-decisions.md)
- Severity, report format, verdict, and retry limit: [verification process](references/verification-process.md)
- Permitted targeted fixes: [revision rules](references/revision-rules.md)

Run every dimension for the initial gate. After targeted revision, reload and rerun only failed dimensions unless the change affects their dependencies.

## Mandatory Gates

- **Coverage gate:** Every BRD/PRD requirement and acceptance criterion needs corresponding FSD authority, verification, and a goal issue pointer. Missing coverage is Critical.
- **Goal gate:** Every goal needs a clear action, verification, done criteria, explicit dependencies, and a coherent independently verifiable outcome. Dependencies and `Blocked by` paths must exist, precede dependents, and form an acyclic graph.
- **Link gate:** Database, API, UI, shared-type, workflow, and other key connections must be ordered and specified before consumers rely on them.
- **Scope gate:** Derive endpoint/page/workflow capability, critical error handling, and user validation. Split separate features or oversized work; merge tiny mechanical work. A coherent tracer bullet may cross layers and must not be rejected merely for doing so.
- **Test gate:** Every critical path, edge case, and error path needs a verification step.
- **Decision gate:** Every approved `TDEC-*` and every applicable obligation from a linked `ACCEPTED` ADR must map by exact ID to at least one `GOAL-*` and one `TEST-*`. Blocked or superseded decisions stay out of executable goals. Missing exact-ID coverage blocks execution. Fuzzy text similarity may warn after implementation but must never create a blocking match.
- **Verdict gate:** Report `PASS`, `PASS WITH NOTES`, or `NEEDS REVISION`, with findings classified Critical, Important, or Suggestion. Apply targeted fixes only; do not change scope or add features.
- **Stop gate:** After three failed revision loops, stop and mark `needs_review`.

## Integration

This is the final `/sc-plan` check. Use with `writing-plans`, `issue-workflow`, `gap-closure`, and `verification-before-completion`.
