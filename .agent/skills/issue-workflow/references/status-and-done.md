# Issue Status and Done Conditions

## Summary

Use the existing issue statuses while requiring actual outcome evidence before
completion or dependency release. Keep authority and evidence as pointers.

## Status Roles

Use these statuses in issue files:

- `needs-triage`: needs maintainer evaluation
- `needs-info`: waiting on more information
- `ready-for-agent`: fully specified, contract-gate-valid where applicable, and agent-ready
- `ready-for-human`: needs human judgment, access, or approval
- `blocked`: blocked by unresolved `OPEN-*`, missing FSD authority, or unavailable required access
- `in-progress`: active work
- `done`: every requested goal, requirement and acceptance criterion is verified with actual outcome evidence
- `verified`: completion evidence reviewed against the FSD; real integration is proven where applicable
- `wontfix`: will not be actioned

## Done Conditions

Apply [verification-before-completion](../../verification-before-completion/SKILL.md)
to the issue-shaping output and every delivered goal. `done` and `verified` both
require complete evidence; `verified` also includes coordinator/review acceptance
where applicable. Preserve issue/ledger enums. Incomplete human report labels
and the mandatory **Evidence of Completion** section come from that skill.
Record completion contract/evidence locators in the pointer; do not copy authority
prose. A previous status value alone does not release dependencies on resume.

The output is complete when:

- `.scratch/<feature-slug>/FSD.md` exists as a pointer or the issue files link directly to the parent FSD.
- Every issue has `Status`, `Parent FSD`, `Goal ID`, `Blocked by`, qualified refs, verification refs, and stop conditions.
- UI-integrated issues have a consistent pinned contract version and required gate.
- Every scale-out issue remains blocked by the first-slice issue until it is `verified`.
- The dependency graph is acyclic.
- At least one issue has `Blocked by: None` unless the whole board is intentionally blocked.
- Issue files do not duplicate BRD, PRD, FSD, or ADR prose.
- The user can pass one issue file to `/sc-work`.
- Actual pointer/graph validation or direct inspection verifies all the above;
  generated files alone are not completion evidence.
