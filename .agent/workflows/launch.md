---
description: "Full autonomous pipeline: brainstorm → plan → work → review → compound. Use when you want the complete development lifecycle."
---

# Launch Workflow

This workflow runs the complete Super Compound development pipeline from idea to shipped feature with knowledge capture.

> **Use this when you want the full lifecycle.** For individual phases, use the specific workflows instead.

## Steps

Run these workflows in order:

1. **Brainstorm** — `/brainstorm [feature description]`
   - Explore the idea collaboratively
   - Create design document
   - Get user approval on approach
   - **Frontend features** auto-activate `ui-ux-pro-max` for design intelligence

2. **Plan** — `/plan`
   - Auto-detects recent brainstorm document
   - Create implementation plan with chosen depth
   - Get user approval on plan

3. **Work** — `/work`
   - Execute the plan task by task
   - TDD cycle for each feature
   - Incremental commits
   - Batch checkpoints for feedback

4. **Review** — `/review`
   - Multi-perspective code review
   - Classify findings by severity
   - Fix any P1 critical issues
   - Get approval

5. **Compound** — `/compound`
   - Document any non-trivial problems solved during work
   - Capture solutions for future reference
   - Cross-reference with existing knowledge

6. **Ship** — Final summary:
   - What was built
   - What was tested
   - What was documented
   - Suggested follow-up items

## When to Use
- New feature development from scratch
- Major refactoring projects
- When you want the discipline of the full pipeline

## When to Skip
- Quick fixes (just use work workflow)
- Emergency hotfixes (fix, test, document)
- Exploration / prototyping (use brainstorm only)

## Notes
- Each step waits for user approval before proceeding to the next
- You can exit the pipeline at any step
- The pipeline adapts to your project's SUPER-COMPOUND.md settings
