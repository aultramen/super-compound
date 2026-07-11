---
description: "Run the complete Super Compound lifecycle through BRD, PRD, FSD, goals, implementation, verification, review, and audit."
---

# Launch Workflow

Use this when the user wants the whole lifecycle from idea to verified delivery.

## Pipeline

1. `sc-status.md` - check current state and existing handoff.
2. `sc-explore.md` - resolve business intent, constraints, non-goals, and open decisions into a BRD.
3. `sc-research.md` - conditional evidence gate only when a named factual or technical gap could change the BRD, PRD, FSD, or risk decision; otherwise skip it.
4. `sc-prd.md` - use the BRD to define user-visible behavior and acceptance criteria in a PRD.
5. `sc-plan.md` - use the PRD to create the FSD, ADR applicability decision, goal issue pointers, and verification.
6. `sc-eval.md` - define measurable pass/fail checks when useful.
7. `sc-go.md` - preview branch or optional worktree setup when configured or requested.
8. `sc-work.md` - execute approved FSD goals through lightweight issue pointers.
9. `sc-review.md` - review against spec and standards.
10. `sc-audit.md` - run risk checks when the change affects users, data, dependencies, auth, release, or agent surfaces.
11. `sc-go.md` - preview finish flow, push, and PR template after verification.
12. `sc-compound.md` - document reusable lessons.

Run one active stage at a time. At every non-trivial boundary update
`docs/STATE.md` with the artifact path, accepted decisions, blockers,
verification, and next route; use `.continue-here.md` only as a short pointer
when stopping. Release prior-stage detail before loading the next contract. UI implementation
is a capability of an approved goal under `sc-work.md`, not a parallel authority.

## Rules

- Skip stages only when the input is already clear and evidence exists.
- Do not run research as lifecycle ceremony; return its advisory note to the workflow that owns the decision.
- Ask for approval at meaningful gates.
- Keep BRD, PRD, FSD, and ADR content in durable artifacts; keep goal issues to qualified references.
- Do not treat launch as permission to deploy or publish.
- Do not treat launch as permission to commit, push, or create a PR without routing through `/sc-go`.
