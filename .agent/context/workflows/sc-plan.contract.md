# /sc-plan Runtime Contract

Purpose: convert an approved PRD into an FSD plus lightweight goal issue pointers.

For human input/blockers/handoffs load `.agent/context/checkpoint.contract.md`.
Evidence/pointer refresh preserves approval; material changes ask only for the delta.
Check evidence cycles: first-slice completion proof gates scale-out, not its entry;
executable qualification needs a bounded approved enabler, never a gate bypass.

Entry of the `full` tier (agentic-delivery/references/workflow-integration.md).
Write authority artifacts only: FSD, accepted ADR, eval, issue pointers; never
product code, which belongs to an approved `/sc-work` goal.

Load first:

- Approved PRD and qualified upstream BRD refs.
- `.agent/context/skills/sc-plan.contract.md`.
- `node .agent/tools/knowledge-search.mjs "<feature area>"` hits; cite applicable ERR-*/LRN-*/solution IDs as advisory evidence; accepted decisions retain authority.
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
- Pin a derived all-AC completion contract before results, with actual outcome
  checks; coordinated goals also map final combined outcome. Never replace
  source authority or let the report choose a subset; `verification-before-completion`.
- Suggest Git branch names and optional worktree candidates for independent parallel goals; do not mutate Git state.
- Resolve narrow doc lookups inline; use `/sc-research` only for a named evidence gap that could materially change the FSD, then return to planning.
- For UI-bearing scope, load the UI readiness reference, make FSD Section 8 the
  Screen & Interaction Contract, and require `ui_contract_readiness =
  READY_FOR_SLICE` for every UI-integrated goal except the bounded enabler.
  `/sc-plan` writes only FSD and issue pointer outputs.
- If executable assets are missing, define `CONTRACT_ENABLER`, then exactly one
  blocked `FIRST_VERTICAL_SLICE`. Only the enabler may be ready while readiness
  is `DRAFT/BLOCKED`; after verification, the active controller refreshes the
  index through planning-owned deterministic promotion and reruns the gate,
  without planning re-entry solely for metadata. Material deltas return to `/sc-plan`/owner at
  `READY_FOR_SLICE`. Every `SCALE_OUT_SLICE` requires
  `FIRST_VERTICAL_SLICE_VERIFIED` and depends on its verified issue. Create
  exactly one `HARDENING` goal when networked merged/cross-slice verification
  requires it; it depends on all applicable UI delivery slices and owns final
  merged-system verification and conditional Business Owner UAT evidence.
  LOCAL_ONLY checks stay in the bounded goal, without synthetic hardening.

Escalate to full `sc-plan.md` or full skills when writing/reviewing the detailed FSD procedure.
Checkpoint automatically and continue; /sc-pause is only for actual stops. Lessons: /sc-compound.

UI topology, affected proof, and conditional UAT follow the canonical UI readiness reference.

Shared policy: `.agent/skills/agentic-delivery/references/workflow-integration.md`.

Stage approvals and execution authority: agentic-delivery/references/workflow-integration.md.

Stage mode: approved PRD → FSD/goals/verification approval → separate execution authorization. No pointer reapproval.
