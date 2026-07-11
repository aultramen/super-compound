# /sc-plan Runtime Contract

Purpose: convert an approved PRD into an FSD plus lightweight goal issue pointers.

Load first:

- Approved PRD and qualified upstream BRD refs.
- `.agent/context/skills/sc-plan.contract.md`.
- `.agent/templates/agentic-delivery/skeletons/FSD-Skeleton.md`,
  `.agent/templates/agentic-delivery/skeletons/ADR-Skeleton-OPTIONAL.md` only if
  justified, and
  `.agent/templates/agentic-delivery/skeletons/Issue-Pointer-Skeleton.md`.

Gates:

- FSD is implementation authority.
- Research notes are advisory; accepted conclusions must be translated into FSD `TDEC-*`, constraints, or a linked accepted ADR.
- ADRs are optional; linked ADRs must be `ACCEPTED`.
- Stop with `OPEN-*` if PRD authority, security/privacy obligation, data/API/auth/workflow/state detail, or verification authority is missing.
- Issue pointers must use paths and qualified IDs, not copied artifact prose.
- Suggest Git branch names and optional worktree candidates for independent parallel goals; do not mutate Git state.
- Resolve narrow doc lookups inline; use `/sc-research` only for a named evidence gap that could materially change the FSD, then return to planning.

Escalate to full `sc-plan.md` or full skills when writing/reviewing the detailed FSD procedure.
