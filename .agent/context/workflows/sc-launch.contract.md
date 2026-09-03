# /sc-launch Runtime Contract

Pass each prospective write through `.agent/tools/workflow-admission.mjs`.

Purpose: run the lifecycle from idea to verified delivery. Resume from docs/STATE.md Next action.

Run one active stage at a time: status, explore, conditional research, PRD draft,
`/sc-ui` validation, approved PRD, plan with optional contract enabler, eval,
`/sc-go` preview, contract enabler execution, `/sc-plan` re-index/re-approval,
real first vertical slice, `/sc-plan` dependent promotion, controlled scale-out, hardening
verification plus Business Owner UAT, review, audit,
`/sc-go` finish preview, compound. At each non-trivial boundary update
`docs/STATE.md` with only artifact paths, decisions, blockers, qualified gate
refs/version and a non-authoritative snapshot, verification refs, and next route; `.continue-here.md`
remains a short pointer. Release prior stage detail.
Carry the exact `run_id` and run head through each implementation handoff and
route it to `/sc-work`; launch never creates approval or writes implementation.
STATE updates require the active source-write gate. Keep only the
non-authoritative pointer refreshed by `loop-run.mjs show`; never copy event
history, counters, approval envelopes, or a confirmation digest.
Return research to its decision owner. Skip only with evidence. Launch grants no
deploy, publish, commit, push, or PR permission.
