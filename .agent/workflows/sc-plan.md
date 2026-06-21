---
description: "Create an implementation plan from clear requirements, PRDs, research, or resolved exploration."
---

# Plan Workflow

Use this when the goal is clear enough to decide how to build it.

## Steps

1. Load `skills/writing-plans/SKILL.md`.
2. Read relevant PRDs, research, exploration notes, codebase conventions, and existing tests.
3. For UI work, load `skills/interface-design/SKILL.md`.
4. For new dependencies or version-sensitive APIs, run compatibility and official-doc checks.
5. Load `skills/domain-modeling/SKILL.md` or `skills/codebase-design/SKILL.md` when vocabulary, seams, or architecture are still shaping the plan.
6. Load `skills/issue-workflow/SKILL.md` when the user asks for issues, Journey, Kanban, PRD-to-issues, multi-agent work, or issue-ready slices.
7. Load `skills/triage-workflow/SKILL.md` when shaping incoming, stale, or raw issues into agent-ready work.
8. Shape work into vertical, independently verifiable tasks or issue files.
9. Include blocker relationships, test/verification commands, and done conditions.
10. Use `skills/plan-verification/SKILL.md` before execution.

## Output

- Implementation plan.
- Optional `.scratch/<feature>/issues/*.md` Journey board.
- Verification plan.
- Risks, assumptions, and out-of-scope notes.
