---
description: "Create an FSD from an approved PRD, then slice FSD goals into lightweight issue files."
---

# Plan Workflow

Use this when approved product requirements are ready to become a technical implementation contract. The FSD is the primary output and implementation authority.

## Steps

1. Load `skills/agentic-delivery/SKILL.md`.
2. Load `skills/writing-plans/SKILL.md`.
3. Read the approved PRD, upstream BRD references, research, exploration notes, codebase conventions, and existing tests.
4. For UI work, load `skills/interface-design/SKILL.md`.
5. For new dependencies or version-sensitive APIs, run compatibility and official-doc checks.
6. Load `skills/domain-modeling/SKILL.md` or `skills/codebase-design/SKILL.md` when vocabulary, seams, or architecture are still shaping the FSD.
7. Decide ADR applicability:
   - default to FSD `TDEC-*` for local technical decisions;
   - link only `ACCEPTED` ADRs from `docs/solutions/adr-####-<slug>.md` when an ADR is justified;
   - block affected goals if a required ADR is missing or not accepted.
8. Save the FSD to `docs/fsd/fsd-<feature>.md`, using the FSD template only as a reference.
9. Load `skills/issue-workflow/SKILL.md` for goal issue files under `.scratch/<feature>/issues/`.
10. Load `skills/triage-workflow/SKILL.md` when shaping incoming, stale, or raw issues into agent-ready work.
11. Shape FSD `GOAL-*` packets into vertical, independently verifiable issue pointers without copying BRD/PRD/FSD/ADR prose.
12. Include blocker relationships, qualified refs, verification refs, and stop conditions.
13. Use `skills/plan-verification/SKILL.md` before execution.

## Output

- FSD technical contract.
- `.scratch/<feature>/issues/*.md` goal issue pointers when work will be delegated or executed incrementally.
- Verification plan.
- Risks, assumptions, and out-of-scope notes.
