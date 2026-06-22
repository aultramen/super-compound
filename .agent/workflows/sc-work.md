---
description: "Execute an approved FSD goal or lightweight issue pointer with focused context, tests, and verification."
---

# Work Workflow

Use this only after there is an approved FSD goal or `.scratch/<feature>/issues/` issue pointer.

## Steps

1. Load `skills/agentic-delivery/SKILL.md`.
2. Load `skills/context-engineering/SKILL.md`.
3. Load `skills/executing-plans/SKILL.md`.
4. Read the `.scratch/<feature>/issues/<NN>-<slug>.md` issue or direct FSD goal, then dynamically load only the referenced FSD sections, upstream BRD/PRD IDs, linked accepted ADRs, blockers, verification refs, and relevant code/tests.
5. Confirm the FSD is approved, every referenced `TDEC-*` is approved, every linked ADR is `ACCEPTED`, and no `OPEN-* BLOCKER` affects the goal.
6. If authority is missing, stop and report `OPEN-xxx` instead of inventing schema, APIs, authorization, workflows, roles, or state transitions.
7. Set up the branch/worktree strategy only if requested or configured.
8. Execute one FSD goal at a time by default.
9. Use `skills/parallel-execution/SKILL.md` only when goals are independent, unblocked, and isolated.
10. For UI tasks, follow `skills/interface-design/SKILL.md`.
11. Use `skills/test-driven-development/SKILL.md` for behavior changes and regressions.
12. Run task-level verification after each meaningful change.
13. Run final verification with `skills/verification-before-completion/SKILL.md`.
14. Summarize changed files, mapped requirement IDs, deviations, and verification evidence.

## Output

- Implemented FSD goal.
- Updated issue status when work came from `.scratch/`.
- Verification results.
- `OPEN-*` blockers, residual risks, or follow-up goals.
