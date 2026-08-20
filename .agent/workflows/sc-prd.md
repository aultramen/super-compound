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
8. Set `ui_delivery_profile` in this order: `NOT_APPLICABLE`, `STANDARD`, or
   `HIGH_INTERACTION`. Set `experience_baseline_status` in this order:
   `DRAFT`, `VALIDATED`, or `EXCEPTION_APPROVED` (or `NOT_APPLICABLE` for a
   non-interactive surface). If UI is detected but unclassified, use `STANDARD`.
9. For `STANDARD` or `HIGH_INTERACTION`, route the PRD draft through `/sc-ui`
   before approval. `HIGH_INTERACTION` requires interactive evidence; runnable
   evidence is mandatory when the material risk is timing, runtime responsive
   behavior, keyboard/focus, realtime, or offline behavior. `STANDARD` may use
   lower-fidelity evidence when it resolves the material risk.
   Every product state is covered or `N/A - reason + approver`.
10. `EXCEPTION_APPROVED` allows only the first vertical slice and needs owner,
    rationale, and follow-up gate; it cannot authorize parallel scale-out.
11. Do not specify database schema, internal architecture, implementation modules, or technical mechanisms unless they are existing constraints inherited from the BRD or repository.
12. Use qualified BRD references such as `BRD-CCC#BREQ-001`; mark unresolved product decisions as `OPEN-*`.
13. Mention Git workflow constraints only when they affect release or collaboration expectations; do not mutate Git state.
14. A chat draft is allowed while requirements are being shaped. Before approval and `/sc-plan`, save the PRD to `docs/prd/prd-<feature>.md` using `.agent/templates/agentic-delivery/skeletons/PRD-Skeleton.md` first and the full template only as a reference.
15. Route to `sc-plan.md` only after the durable PRD is approved with baseline
    `VALIDATED`, `EXCEPTION_APPROVED`, or `NOT_APPLICABLE`.

## Output

- PRD or PRD summary.
- Acceptance criteria.
- UI delivery profile, experience baseline status, state coverage, evidence refs, and approver.
- `OPEN-*` blockers and deterministic next workflow: a UI-bearing `DRAFT` goes
  to `/sc-ui`; unresolved evidence/business authority goes to `/sc-research` or
  `/sc-explore`; only an approved `VALIDATED`, `EXCEPTION_APPROVED`, or
  `NOT_APPLICABLE` baseline goes to `/sc-plan`.
