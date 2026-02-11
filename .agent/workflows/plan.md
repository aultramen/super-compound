---
description: "Create an implementation plan with configurable depth. Use after brainstorming or when requirements are clear."
---

# Plan Workflow

This workflow creates a detailed implementation plan. Use it when you know WHAT to build and need to define HOW.

## Steps

1. **Check for brainstorm** — Look for recent brainstorm docs in `docs/brainstorms/`. Use decisions as input.

2. **Read writing-plans skill** — Load `skills/writing-plans/SKILL.md` and follow its process.

3. **Research phase** — Review codebase patterns, check `docs/solutions/` for past learnings, decide if external research is needed.

4. **Choose depth** — Ask user:
   - 📄 **Quick** — Simple tasks, small fixes (list of tasks + acceptance criteria)
   - 📋 **Standard** — Most features (detailed with file paths, code snippets, TDD steps)
   - 📚 **Comprehensive** — Major features (phased plan with risks, alternatives, documentation)

5. **Write the plan** — Create bite-sized tasks (2-5 min each) with:
   - Exact file paths
   - Complete code (not placeholders)
   - Test-first structure (if TDD mode is strict/balanced)
   - Verification commands with expected output

6. **Save plan** — Write to `docs/plans/YYYY-MM-DD-<feature-name>-plan.md`.

7. **Handoff** — Ask:
   - **Execute sequentially** — Run the work workflow with checkpoints
   - **Execute with swarm** — Parallel execution for independent tasks
   - **Review and refine** — Improve the plan first
   - **Done for now** — Save for later

## When to Use
- After brainstorming completes
- When requirements are clear and specific
- Before any multi-step implementation

## When to Skip
- Single-file, single-change tasks
- Emergency hotfixes (just fix and document after)
