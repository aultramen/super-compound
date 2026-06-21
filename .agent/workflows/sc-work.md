---
description: "Execute an approved implementation plan with tests, verification, and optional isolated parallel task execution."
---

# Work Workflow

Use this only after there is a clear plan, issue file, or task contract.

## Steps

1. Load `skills/executing-plans/SKILL.md`.
2. Read the plan or `.scratch/<feature>/issues/<NN>-<slug>.md` issue and confirm tasks, blockers, verification, and done conditions.
3. Set up the branch/worktree strategy only if requested or configured.
4. Execute one task at a time by default.
5. Use `skills/parallel-execution/SKILL.md` only when tasks are independent and isolated.
6. For UI tasks, follow `skills/interface-design/SKILL.md`.
7. Run task-level verification after each meaningful change.
8. Run final verification with `skills/verification-before-completion/SKILL.md`.
9. Summarize changed files, key decisions, and verification evidence.

## Output

- Implemented plan.
- Updated issue status when work came from `.scratch/`.
- Verification results.
- Any remaining risks or follow-up tasks.
