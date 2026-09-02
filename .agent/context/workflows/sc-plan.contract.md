# /sc-plan Runtime Contract

Pass each prospective write through `.agent/tools/workflow-admission.mjs`.

Purpose: convert an approved PRD into an FSD plus lightweight goal issue pointers.

Loop Runtime v2: write only classified `authority_write` FSD/ADR/eval/issue
artifacts; these need no Budget & Stop Wizard. Classify the target first and
block every `implementation_write`, routing it to an approved `/sc-work` goal.
Planning defines authority but never creates approval or execution evidence.

Load first:

- Approved PRD and qualified upstream BRD refs.
- `.agent/context/skills/sc-plan.contract.md`.
- `node .agent/tools/knowledge-search.mjs "<feature area>"` hits; cite matching ERR-*/LRN-*/solution IDs verbatim as plan constraints.
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
- For UI-bearing scope, load the UI readiness reference, make FSD Section 8 the
  Screen & Interaction Contract, and require `ui_contract_readiness =
  READY_FOR_SLICE` for every UI-integrated goal except the bounded enabler.
  `/sc-plan` writes only FSD and issue pointer outputs.
- If executable assets are missing, define `CONTRACT_ENABLER`, then exactly one
  blocked `FIRST_VERTICAL_SLICE`. Only the enabler may be ready while readiness
  is `DRAFT/BLOCKED`; after its verification, return to `/sc-plan`, refresh the
  index, rerun the gate, and obtain Technical Manager approval at
  `READY_FOR_SLICE`. Every `SCALE_OUT_SLICE` requires
  `FIRST_VERTICAL_SLICE_VERIFIED` and depends on its verified issue. Create
  exactly one `HARDENING` goal that depends on all applicable UI delivery slices
  and owns final merged-system verification and Business Owner UAT evidence.

Escalate to full `sc-plan.md` or full skills when writing/reviewing the detailed FSD procedure.
