---
description: "Run the complete Super Compound lifecycle through BRD, PRD, FSD, goals, implementation, verification, review, and audit."
---

# Launch Workflow

Pass each prospective write through `.agent/tools/workflow-admission.mjs`.

Use this when the user wants the whole lifecycle from idea to verified delivery.

## Pipeline

1. `sc-status.md` - check current state and existing handoff; resume from the `docs/STATE.md` Next action.
2. `sc-explore.md` - resolve business intent, constraints, non-goals, and open decisions into a BRD.
3. `sc-research.md` - conditional evidence gate only when a named factual or technical gap could change the BRD, PRD, FSD, or risk decision; otherwise skip it.
4. `sc-prd.md` - create the PRD draft and classify UI delivery risk.
5. `/sc-ui` - validate the UI-bearing PRD draft, optionally returning to `/sc-explore` for a throwaway prototype spike.
6. `sc-prd.md` - absorb accepted evidence and produce the approved PRD experience baseline.
7. `sc-plan.md` - create the FSD/UI-API readiness gate, optional contract enabler, exactly one blocked first vertical slice, and dependent scale-out pointers.
8. `sc-eval.md` - define measurable pass/fail checks when useful.
9. `sc-go.md` - preview branch or optional worktree setup when configured or requested.
10. `sc-work.md` - materialize and verify the bounded contract enabler when needed.
11. `/sc-plan` - after an enabler, re-index the exact revisions, rerun readiness, and obtain Technical Manager re-approval before releasing the first slice.
12. `sc-work.md` - verify the first vertical slice against the real provider, then return to `/sc-plan` to promote only eligible dependents.
13. `sc-work.md` - perform controlled scale-out only after the first-slice issue is verified and the PRD baseline is `VALIDATED`.
14. `sc-work.md` - execute the bounded hardening/verification goal for integration, responsive, accessibility, E2E, and visual-regression evidence; obtain Business Owner UAT approval.
15. `sc-review.md` - audit implementation and recorded verification/UAT evidence against authority; it does not manufacture missing evidence.
16. `sc-audit.md` - run risk checks when the change affects users, data, dependencies, auth, release, or agent surfaces.
17. `sc-go.md` - preview the finish flow and PR template after verification; push and PR return `OPEN-RELEASE-GATE` until the operation allowlist carries them.
18. `sc-compound.md` - document reusable lessons.

Run one active stage at a time. At every non-trivial boundary update
`docs/STATE.md` with artifact paths, accepted decisions, blockers, qualified
gate refs/version plus a non-authoritative status snapshot, verification refs,
and next route; update only the STATE fields that changed and never
re-serialize unchanged sections; use `.continue-here.md` only as a short pointer
when stopping. Release prior-stage detail before loading the next contract. UI implementation
is a capability of an approved goal under `sc-work.md`, not a parallel authority.

Carry the exact `run_id` and current run head at every implementation handoff,
then route the handoff through `/sc-work`; launch never manufactures approval or
mutates implementation directly. A `docs/STATE.md` update is itself a classified
write and needs the active run's source-write gate. Store only a
non-authoritative run pointer and refresh it with `loop-run.mjs show`; never copy
the event log, counters, approval envelope, or confirmation digest into STATE.

## Rules

- Skip stages only when the input is already clear and evidence exists.
- Do not run research as lifecycle ceremony; return its advisory note to the workflow that owns the decision.
- Ask for approval at meaningful gates.
- Keep BRD, PRD, FSD, and ADR content in durable artifacts; keep goal issues to qualified references.
- Do not treat launch as permission to deploy or publish.
- Do not treat launch as permission to commit, push, or create a PR without routing through `/sc-go`.
