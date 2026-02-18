---
description: "Execute an implementation plan task by task. Sequential by default, optional swarm mode for parallel tasks."
---

# Work Workflow

This workflow executes a plan systematically. It handles environment setup, task execution, quality checks, and shipping.

## Steps

1. **Load the plan** — Read the plan document. Confirm you understand all tasks.

2. **Read executing-plans skill** — Load `skills/executing-plans/SKILL.md` and follow its process.

3. **Setup environment** — Based on SUPER-COMPOUND.md project config:
   // turbo
   - **branch mode:** `git checkout -b feat/<feature-name>`
   - **worktree mode:** `git worktree add ../<project>-<feat> -b feat/<name>`
   - **no-git mode:** Skip setup

4. **Create task checklist** — Extract all tasks from plan into a trackable list.

5. **Swarm decision** — If plan has 5+ independent tasks, ask:
   > "This plan has [N] independent tasks. Use parallel swarm execution, or sequential?"

6. **Execute tasks** — For each task:
   - Follow TDD cycle (if strict/balanced mode): test → fail → code → pass → refactor
   - Follow existing codebase patterns
   - For **frontend/UI tasks**: follow `ui-ux-pro-max` design system and run pre-delivery checklist
   - Run tests after each change
   - Commit incrementally with conventional messages
   - Mark task complete

7. **Batch checkpoints** (sequential mode) — After every 3 tasks:
   - Show progress summary
   - Show verification output
   - Ask: "Ready for next batch, or any feedback?"

8. **Quality gate** — After all tasks:
   // turbo
   - Run full test suite
   // turbo
   - Run linter
   - Use verification-before-completion skill
   - Check against plan acceptance criteria

9. **Ship it** — Final commit, push if using Git. Summarize what was built.

10. **Suggest next steps:**
    - Run review workflow for code review
    - Run compound workflow if tricky issues were solved
    - Done

## When to Use
- After a plan is created and approved
- When you have a clear list of tasks to execute

## When to Skip
- No plan exists (create one first with plan workflow)
- Single trivial change (just do it directly)
