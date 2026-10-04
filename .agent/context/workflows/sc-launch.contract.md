# /sc-launch Runtime Contract

Purpose: run the lifecycle from idea to verified delivery. Resume from docs/STATE.md Next action.
Launch is the `full` tier; a `light` request goes directly to `/sc-work` or `/sc-debug`.
Stage mode: BRD approval → PRD approval → FSD/goals/verification approval → separate execution authorization. Preserve prior grants; no administrative reapproval.

Run one active stage at a time: status, explore, conditional research, PRD draft,
`/sc-ui` validation, approved PRD, plan with optional contract enabler, eval,
`/sc-go` preview, contract enabler execution, `/sc-plan` mechanical re-index/promotion,
real first vertical slice, `/sc-plan` dependent promotion, controlled scale-out, hardening
applicable verification plus conditional Business Owner UAT, review, audit,
`/sc-go` finish preview, compound. At each non-trivial boundary update
`docs/STATE.md` with only artifact paths, decisions, blockers, qualified gate
refs/version and a non-authoritative snapshot, verification refs, and next route; `.continue-here.md`
remains a short pointer. Release prior stage detail.
Route each implementation handoff to `/sc-work`; launch itself writes only
`docs/STATE.md` and never writes implementation.
Return research to its decision owner. Skip only with evidence. Launch grants no
deploy, publish, commit, push, or PR permission.

UI topology, affected proof, and conditional UAT follow the canonical UI readiness reference.
