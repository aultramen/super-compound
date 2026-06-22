---
description: "Run the complete Super Compound lifecycle through BRD, PRD, FSD, goals, implementation, verification, review, and audit."
---

# Launch Workflow

Use this when the user wants the whole lifecycle from idea to verified delivery.

## Pipeline

1. `sc-status.md` - check current state and existing handoff.
2. `sc-explore.md` - resolve business intent, constraints, non-goals, and open decisions into a BRD.
3. `sc-research.md` - investigate unfamiliar tech or domain risks.
4. `sc-prd.md` - use the BRD to define user-visible behavior and acceptance criteria in a PRD.
5. `sc-plan.md` - use the PRD to create the FSD, ADR applicability decision, goal issue pointers, and verification.
6. `sc-eval.md` - define measurable pass/fail checks when useful.
7. `sc-work.md` - execute approved FSD goals through lightweight issue pointers.
8. `sc-review.md` - review against spec and standards.
9. `sc-audit.md` - run risk checks when the change affects users, data, dependencies, auth, release, or agent surfaces.
10. `sc-compound.md` - document reusable lessons.

## Rules

- Skip stages only when the input is already clear and evidence exists.
- Ask for approval at meaningful gates.
- Keep BRD, PRD, FSD, and ADR content in durable artifacts; keep goal issues to qualified references.
- Do not treat launch as permission to deploy or publish.
