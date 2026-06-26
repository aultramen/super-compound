---
description: "Create a Product Requirements Document from an approved BRD, focused on observable product behavior and acceptance."
---

# PRD Workflow

Use this when approved business requirements need to become product behavior before FSD planning.

## Steps

1. Load `skills/agentic-delivery/SKILL.md`.
2. Load `skills/prd-generator/SKILL.md`.
3. Read the approved BRD, exploration notes, research, current docs, and related code behavior.
4. Use `skills/domain-modeling/SKILL.md` when user stories need project vocabulary or glossary updates.
5. Use `skills/codebase-design/SKILL.md` only when product requirements need a known test seam or interface constraint to be reliable.
6. Define users, observable behavior, feature scope, non-goals, user stories, functional requirements, acceptance criteria, edge cases, negative behavior, and product-level security/privacy/compliance requirements.
7. Do not specify database schema, internal architecture, implementation modules, or technical mechanisms unless they are existing constraints inherited from the BRD or repository.
8. Use qualified BRD references such as `BRD-CCC#BREQ-001`; mark unresolved product decisions as `OPEN-*`.
9. Mention Git workflow constraints only when they affect release or collaboration expectations; do not mutate Git state.
10. Save the PRD to `docs/prd/prd-<feature>.md` when a durable artifact is useful, using the PRD template only as a reference.
11. Route to `sc-plan.md` after approval.

## Output

- PRD or PRD summary.
- Acceptance criteria.
- `OPEN-*` blockers and next workflow: `/sc-plan`.
