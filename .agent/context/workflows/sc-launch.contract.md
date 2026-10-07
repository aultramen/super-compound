# /sc-launch Runtime Contract

Purpose: run the lifecycle from idea to verified delivery. Resume from docs/STATE.md Next action.
Launch is the `full` tier; a `light` request goes directly to `/sc-work` or `/sc-debug`.
Stage mode: BRD approval → PRD approval → FSD/goals/verification approval → separate execution authorization. Preserve prior grants; no administrative reapproval.

Run one active stage at a time: status, explore, conditional research, PRD draft,
`/sc-ui` validation, approved PRD, plan with optional contract enabler, eval,
`/sc-go` preview, contract enabler execution, internal planning-owned deterministic
promotion, real first vertical slice, eligible dependent promotion, controlled scale-out, applicable hardening
applicable verification plus conditional Business Owner UAT, review, audit,
`/sc-go` finish preview, compound. At each non-trivial boundary update
`docs/STATE.md` with only artifact paths, decisions, blockers, qualified gate
refs/version and a non-authoritative snapshot, verification refs, and next route; `.continue-here.md`
remains a short pointer. Release prior stage detail.
The active controller performs derived metadata promotion without planning re-entry;
material deltas return to `/sc-plan`/owner and preserve required proof gates.
Route each implementation handoff to `/sc-work`; launch itself writes only
`docs/STATE.md` and never writes implementation.
Return research to its decision owner. Skip only with evidence. Launch grants no
deploy, publish, commit, push, or PR permission.

UI topology, affected proof, and conditional UAT follow the canonical UI readiness reference.

Human input/approval: .agent/context/checkpoint.contract.md

`verification-before-completion`: all goal ACs plus final combined outcome must
have actual proof; `verified-promise.mjs --run <id>` must allow completion.
Report `Evidence of Completion` with what/how, actual result/locator and AC mapping.
Configuration, command success, worker reports or metadata alone are insufficient.
