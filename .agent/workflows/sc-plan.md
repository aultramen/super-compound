---
description: "Create an FSD from an approved PRD, then slice FSD goals into lightweight issue files."
---

# Plan Workflow

Use this when approved product requirements are ready to become a technical implementation contract. The FSD is the primary output and implementation authority.

## Steps

1. Load `skills/agentic-delivery/SKILL.md` and `skills/writing-plans/SKILL.md` when following the full planning procedure.
2. Read the approved PRD, upstream BRD references, advisory research notes, exploration notes, codebase conventions, and existing tests. Research recommendations are evidence only; translate accepted conclusions into FSD `TDEC-*`, constraints, or an accepted ADR before they become implementation authority.
3. Use `.agent/templates/agentic-delivery/skeletons/FSD-Skeleton.md` first; expand full template sections only when needed.
4. For UI work, load `skills/interface-design/SKILL.md`.
5. Resolve a narrow API/version lookup inline. Route through `sc-research.md` only when a broader, conflicting, or reusable evidence gap could materially change the FSD; then resume planning. For selected dependencies or version-sensitive APIs, still run formal compatibility and official-doc pre-flight checks.
6. Load `skills/domain-modeling/SKILL.md` or `skills/codebase-design/SKILL.md` when vocabulary, seams, or architecture are still shaping the FSD.
7. Stop with `OPEN-*` when product authority, security/privacy obligations,
   data/API/auth/workflow/state detail, or verification authority is missing.
8. Decide ADR applicability:
   - default to FSD `TDEC-*` for local technical decisions;
   - link only `ACCEPTED` ADRs from `docs/solutions/adr-####-<slug>.md` when an ADR is justified;
   - block affected goals if a required ADR is missing or not accepted.
9. Save the FSD to `docs/fsd/fsd-<feature>.md`, using the FSD template only as a reference.
10. Load `skills/issue-workflow/SKILL.md` for goal issue files under `.scratch/<feature>/issues/`.
11. Load `skills/triage-workflow/SKILL.md` when shaping incoming, stale, or raw issues into agent-ready work.
12. Shape FSD `GOAL-*` packets into vertical, independently verifiable issue pointers without copying BRD/PRD/FSD/ADR prose.
13. Include suggested branch names per GOAL and identify optional worktree candidates for independent parallel goals; do not checkout or mutate Git state during planning.
14. Include blocker relationships, qualified refs, verification refs, and stop conditions.
15. Use `skills/plan-verification/SKILL.md` before execution.

## Output

- FSD technical contract.
- `.scratch/<feature>/issues/*.md` goal issue pointers when work will be delegated or executed incrementally.
- Verification plan.
- Suggested Git branch names and optional worktree candidates when useful.
- Risks, assumptions, and out-of-scope notes.
