## Status Roles

Use these statuses in issue files:

- `needs-triage`: needs maintainer evaluation
- `needs-info`: waiting on more information
- `ready-for-agent`: fully specified and agent-ready
- `ready-for-human`: needs human judgment, access, or approval
- `blocked`: blocked by unresolved `OPEN-*`, missing FSD authority, or unavailable required access
- `in-progress`: active work
- `done`: completed and verified by task-level checks
- `verified`: completion evidence reviewed against the FSD
- `wontfix`: will not be actioned

## Done Conditions

The output is complete when:

- `.scratch/<feature-slug>/FSD.md` exists as a pointer or the issue files link directly to the parent FSD.
- Every issue has `Status`, `Parent FSD`, `Goal ID`, `Blocked by`, qualified refs, verification refs, and stop conditions.
- The dependency graph is acyclic.
- At least one issue has `Blocked by: None` unless the whole board is intentionally blocked.
- Issue files do not duplicate BRD, PRD, FSD, or ADR prose.
- The user can pass one issue file to `/sc-work`.
