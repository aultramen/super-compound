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
- Data, security, privacy, compliance, and AI behavior includes applicable negative, degraded, and abuse cases.
- Testing decisions identify observable behavior or the highest practical public seam.
- Open questions are named `OPEN-*` blockers with an owner or decision path.
- The PRD neither invents business policy beyond the BRD nor technical implementation beyond known constraints.

## Handoff

Save the PRD, report its path and unresolved blockers, and stop. Available next routes are:

1. Review and refine the PRD.
2. Convert it to an FSD with `/sc-plan` and `writing-plans`.
3. Convert approved FSD goals to issue pointers with `/sc-plan --issues <prd>` when a Journey, Kanban board, or multi-agent slices are needed.
4. Route UI-focused work through `/sc-ui`.

Do not skip directly from PRD to implementation.
