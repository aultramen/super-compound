---
description: "Create a Product Requirements Document from an approved BRD, focused on observable product behavior and acceptance."
---

# PRD Workflow

Use this when approved business requirements need to become product behavior before FSD planning.

## Steps

1. Load `skills/agentic-delivery/SKILL.md`.
2. Load `skills/prd-generator/SKILL.md`.
3. Read the approved BRD, exploration notes, advisory research notes, current docs, and related code behavior.
4. If a factual gap blocks observable behavior, emit `OPEN-RESEARCH-*`, run a targeted `sc-research.md`, then resume here. If the evidence changes business scope or policy, return to `sc-explore.md` and update the BRD instead of silently changing it in the PRD.
5. Use `skills/domain-modeling/SKILL.md` in advisory read-only mode when user stories need vocabulary alignment; persist glossary updates only through an explicitly authorized owner.
6. Use `skills/codebase-design/SKILL.md` only when product requirements need a known test seam or interface constraint to be reliable.
7. Define users, observable behavior, feature scope, non-goals, user stories, functional requirements, acceptance criteria, edge cases, negative behavior, and product-level security/privacy/compliance requirements.
8. Do not specify database schema, internal architecture, implementation modules, or technical mechanisms unless they are existing constraints inherited from the BRD or repository.
9. Use qualified BRD references such as `BRD-CCC#BREQ-001`; mark unresolved product decisions as `OPEN-*`.
10. Mention Git workflow constraints only when they affect release or collaboration expectations; do not mutate Git state.
11. A chat draft is allowed while requirements are being shaped. Before approval and `/sc-plan`, save the PRD to `docs/prd/prd-<feature>.md` using the skeleton first and the full template only as a reference.
12. Route to `sc-plan.md` only after the durable PRD is approved.

## Output

- PRD or PRD summary.
- Acceptance criteria.
- `OPEN-*` blockers and next workflow: `/sc-research` or `/sc-explore` when evidence/business authority is unresolved; otherwise `/sc-plan`.
