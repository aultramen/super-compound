---
description: "Resolve fuzzy ideas into a BRD with business objectives, constraints, policies, and business acceptance before PRD."
---

# Explore Workflow

Use this when the work is not ready for product requirements or technical planning. The canonical output is a BRD.

## Modes

- Idea exploration: clarify user, problem, alternatives, non-goals, and success signal.
- Decision alignment: ask focused questions when code/docs cannot answer them.
- Domain alignment: normalize terms and surprising trade-offs before specs.
- Architecture exploration: compare module/interface options before committing.
- Prototype exploration: build throwaway evidence only when a runnable answer is cheaper than debate.

## Steps

1. Load `skills/agentic-delivery/SKILL.md`.
2. Load `skills/brainstorming/SKILL.md`.
3. Inspect existing code, docs, issues, accepted ADRs in `docs/solutions/`, and related solutions before asking questions.
4. Load `skills/domain-modeling/SKILL.md` when terms, roles, or domain boundaries are fuzzy.
5. Load `skills/codebase-design/SKILL.md` when a business decision depends on a major seam, module shape, or testability tradeoff.
6. Load `skills/prototyping/SKILL.md` only when runnable evidence is cheaper than debate.
7. Resolve the smallest business decision that unlocks the next step.
8. Capture objectives, scope, non-goals, business rules, policies, constraints, acceptance gates, and `OPEN-*` blockers.
9. Capture Git workflow constraints only when they affect delivery scope; do not mutate Git state.
10. Save a BRD to `docs/brd/brd-<feature>.md` when a durable artifact is useful, using the BRD template only as a reference.
11. Route to `sc-prd.md` when the BRD is approved or the user explicitly accepts its assumptions.

## Output

- BRD or BRD summary.
- Business acceptance criteria.
- `OPEN-*` blockers and owner/gate when known.
- Recommended next workflow: `/sc-prd`.
