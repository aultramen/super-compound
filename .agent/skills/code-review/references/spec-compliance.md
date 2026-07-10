# Spec Compliance

Load before quality review whenever authoritative requirements exist.

## Understand the Change

1. Read the plan, issue, FSD goal, and acceptance criteria.
2. Read referenced PRD/BRD requirements, domain `CONTEXT.md`, and accepted ADRs.
3. Identify intended outcomes, explicit non-goals, dependencies, and evidence expected for completion.
4. Inspect the complete diff and nearby callers, tests, and interfaces; do not review isolated snippets only.

## Stage 1 Checklist

- Every acceptance criterion is implemented and evidenced.
- Every planned task is complete or explicitly deferred.
- Expected behavior and specified edge cases are present.
- No required feature, artifact, migration, caller, test, or documentation change is missing.
- No unplanned feature or opportunistic refactor expanded scope.
- Schema, API, authorization, role, workflow, state transition, business rule, and UI behavior come from the FSD or linked accepted ADR, not invention.
- Public contracts remain compatible unless the approved plan authorizes a break.
- The change follows domain language and ownership defined by authoritative artifacts.

If any item fails, stop Stage 2 and report the compliance gap with its source requirement and affected code. Quality review resumes only after compliance passes.
