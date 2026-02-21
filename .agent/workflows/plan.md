---
description: "Create an implementation plan with configurable depth. Use after brainstorming or when requirements are clear."
---

# Plan Workflow

This workflow creates a detailed implementation plan. Use it when you know WHAT to build and need to define HOW.

## Steps

1. **Check for context** — Look for:
   - Recent brainstorm docs in `docs/brainstorms/` → use decisions as input
   - Context docs in `docs/context/` from `/discuss` → use locked decisions as constraints
   - Research docs in `docs/research/` from `/research` → use findings to inform approach
   - Related todos in `docs/todos/` → ask if any should be included

2. **Read writing-plans skill** — Load `skills/writing-plans/SKILL.md` and follow its process.

3. **Research phase** — Review codebase patterns, check `docs/solutions/` for past learnings, decide if external research is needed.
   - If the plan involves **frontend/UI work**, the writing-plans skill invokes `ui-ux-pro-max` to generate a design system.

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

7. **Verify plan** — Load `skills/plan-verification/SKILL.md` and run 8-dimension check:
   - Requirement coverage, task completeness, dependency correctness, key links
   - Scope sanity, must-haves derivation, complexity check, test coverage
   - If issues found → apply targeted revision (max 3 iterations)
   - Skip this step only if user explicitly uses `--skip-verify`

8. **Update state** — If `docs/STATE.md` exists, update current position to "plan created, awaiting execution".

9. **Handoff** — Ask:
   - **Execute sequentially** — Run the work workflow with checkpoints
   - **Execute with swarm** — Parallel execution for independent tasks
   - **Review and refine** — Improve the plan first
   - **Done for now** — Save for later

## When to Use
- After brainstorming completes
- After `/discuss` resolves gray areas
- After `/research` produces findings
- When requirements are clear and specific
- Before any multi-step implementation

## When to Skip
- Single-file, single-change tasks
- Emergency hotfixes (just fix and document after)

