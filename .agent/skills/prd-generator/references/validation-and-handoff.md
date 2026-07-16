# Validation and Handoff

## Story sizing

Each story should fit one focused implementation session. Split when it spans unrelated roles or systems, has distinct release risk or verification, or has acceptance criteria too broad to review together. Preserve end-to-end user value in each vertical slice.

## Validation

Confirm:

- Every goal maps to a story or requirement and every story has concrete acceptance criteria.
- Non-goals close likely scope-creep paths.
- BRD IDs and requirement IDs provide complete traceability.
- Canonical rules and state semantics do not conflict.
- UI work specifies accessibility, responsive behavior, and important states.
- Every UI state is covered or has `N/A - reason + approver`; the Experience
  Baseline is `VALIDATED`, `EXCEPTION_APPROVED`, or `NOT_APPLICABLE`.
- `HIGH_INTERACTION` has interactive evidence; timing, runtime responsive,
  keyboard/focus, realtime, or offline risk has runnable evidence.
- Data, security, privacy, compliance, and AI behavior includes applicable negative, degraded, and abuse cases.
- Testing decisions identify observable behavior or the highest practical public seam.
- Open questions are named `OPEN-*` blockers with an owner or decision path.
- The PRD neither invents business policy beyond the BRD nor technical implementation beyond known constraints.

## Handoff

Save the PRD, report its path and unresolved blockers, and stop. Available next routes are:

1. Review and refine the PRD.
2. For a UI-bearing draft, validate it read-only with `/sc-ui`, absorb accepted
   evidence into the PRD, then approve it.
3. Convert the approved PRD to an FSD with `/sc-plan` and `writing-plans`.
4. Convert approved FSD goals to issue pointers with `/sc-plan --issues <prd>` when a Journey, Kanban board, or multi-agent slices are needed.

Do not skip directly from PRD to implementation.
