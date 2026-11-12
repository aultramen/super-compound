---
description: "Run the complete Super Compound lifecycle through BRD, PRD, FSD, goals, implementation, verification, review, and audit."
---

# Launch Workflow

## Summary

Before requesting input or approval, load `.agent/context/checkpoint.contract.md`; use its complete active-work list and reply guidance.


Use this when the user wants the whole lifecycle from idea to verified delivery.
Launch is the `full` delivery tier: use it when intake classified the request
`full` (triggers T1-T5 in `skills/agentic-delivery/references/workflow-integration.md`);
a `light` request goes straight to `/sc-work` or `/sc-debug`.


## Example

Input: `/sc-launch Dashboard penggunaan untuk admin akun`.
Prerequisite: Full delivery intent, known users/outcome and existing artifacts.
Result and next action: BRD -> PRD -> FSD -> verified goals; retain configured stage approvals and separate execution authorization.

## Pipeline

Five phases; the numbered steps below are the detail. A step marked
(conditional) runs only when its trigger applies; otherwise skip it silently.

| Phase | Steps | Ends with |
|---|---|---|
| Define | 1-6 | approved BRD and PRD |
| Plan | 7-8 | FSD, readiness gate, goal pointers, checks |
| Build | 9-13 | verified first vertical slice and any scale-out |
| Verify | 14-16 | hardening evidence, review, audit |
| Ship | 17-18 | `/sc-go` finish preview and captured lessons |

1. `sc-status.md` - check current state and existing handoff; resume from the `docs/STATE.md` Next action.
2. `sc-explore.md` - resolve business intent, constraints, non-goals, and open decisions into a BRD.
3. `sc-research.md` - conditional evidence gate only when a named factual or technical gap could change the BRD, PRD, FSD, or risk decision; otherwise skip it.
4. `sc-prd.md` - create the PRD draft and classify UI delivery risk.
5. `/sc-ui` (conditional) - validate the UI-bearing PRD draft read-only. `STANDARD` runs in the same turn as step 4 with no separate visible round; only `HIGH_INTERACTION` gets its own round, optionally returning to `/sc-explore` for a throwaway prototype spike.
6. `sc-prd.md` - absorb accepted evidence once and produce the approved PRD experience baseline.
7. `sc-plan.md` - create the FSD/UI-API readiness gate, optional contract enabler, exactly one blocked first vertical slice, and dependent scale-out pointers.
8. `sc-eval.md` (conditional) - define measurable pass/fail checks when useful.
9. `sc-go.md` (conditional) - preview branch or optional worktree setup when configured or requested.
10. `sc-work.md` (conditional) - materialize and verify the bounded contract enabler when needed.
11. Internal planning-owned promotion (conditional) - after an enabler, the active controller
    re-indexes exact revisions, reruns readiness and releases the first slice
    without planning re-entry solely for metadata; material deltas return to `/sc-plan`/owner.
12. `sc-work.md` - for networked UI, verify the first vertical slice against the real provider, then internally promote only eligible dependents through the same planning-owned checks. LOCAL_ONLY uses mapped local checks without provider barriers.
13. `sc-work.md` (conditional) - perform controlled scale-out only after the first-slice issue is verified and the PRD baseline is `VALIDATED`.
14. `sc-work.md` - execute the bounded hardening/verification goal the plan defines for integration, responsive, accessibility, E2E, and visual-regression evidence (a single-slice plan carries these checks in step 12); obtain Business Owner UAT approval only when required by acceptance or material human judgment.
15. `sc-review.md` - audit implementation and recorded verification/UAT evidence against authority; it does not manufacture missing evidence. Every goal and the final combined outcome need `Evidence of Completion` per `.agent/rules/quality-gates.md` before delivery is Done/Completed.
16. `sc-audit.md` (conditional) - run risk checks when the change affects users, data, dependencies, auth, release, or agent surfaces.
17. `sc-go.md` - preview the finish flow and PR template after verification; commit, push, and PR run through `/sc-go` on explicit confirmation.
18. `sc-compound.md` (conditional) - document reusable lessons only when an ERR/LRN or convention arose.

Run one active stage at a time. At every non-trivial boundary update only the
changed `docs/STATE.md` fields (artifact paths, accepted decisions, blockers,
gate and verification refs, next route) per `skills/state-management/SKILL.md`;
`.continue-here.md` stays a short pointer when stopping. Release prior-stage
detail before loading the next contract. UI implementation
is a capability of an approved goal under `sc-work.md`, not a parallel authority.

Close out once per launch, not per goal: run
`node .agent/tools/memory-maintenance.mjs flush` once after the last goal.
Closeout appears in chat only as the `Detail:` link.

Route every implementation handoff through `/sc-work`; launch itself writes
only `docs/STATE.md` and never mutates implementation directly.

## Rules

- Skip stages only when the input is already clear and evidence exists.
- Do not run research as lifecycle ceremony; return its advisory note to the workflow that owns the decision.
- In stage mode, stop for BRD approval, PRD approval, FSD/goals/verification approval, and then separate execution authorization. Preserve prior grants; do not turn internal corrections or derived pointers into additional checkpoints.
- Keep BRD, PRD, FSD, and ADR content in durable artifacts; keep goal issues to qualified references.
- Do not treat launch as permission to deploy or publish.
- Do not treat launch as permission to commit, push, or create a PR without routing through `/sc-go`.

UI topology, affected proof, and conditional UAT follow the canonical UI readiness reference.
