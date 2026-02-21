---
name: executing-plans
description: "Use when you have a written implementation plan to execute. Supports sequential (default) and optional swarm mode for parallel execution."
---

# Executing Plans

## Overview

Load a plan, execute tasks systematically, verify continuously, and ship complete features. Sequential by default with optional swarm mode for independent tasks.

**Announce:** "I'm using the executing-plans skill to implement this plan."

## Phase 1: Quick Start

### 1.1 Read and Clarify

- Read the plan document completely
- Review any references or links in the plan
- If anything is unclear or ambiguous, **ask clarifying questions NOW**
- Get user approval to proceed
- **Do not skip this** — better to ask now than build wrong

### 1.2 Setup Environment

**Check Git mode from SUPER-COMPOUND.md project config:**

| Git Workflow | Action |
|-------------|--------|
| `branch` (default) | `git checkout -b feat/<feature-name>` |
| `worktree` | Create isolated worktree: `git worktree add ../<project>-<feat> -b feat/<name>` |
| `none` | Skip git setup, work directly |

**If already on a feature branch:** Ask "Continue on `[branch]`, or create a new branch?"

### 1.3 Create Task Checklist

Break plan into actionable tasks with:
- Dependencies between tasks
- Priority order
- Testing and quality check tasks
- Specific, completable items

### 1.4 Swarm Decision (Optional)

**Only suggest swarm mode when ALL of these are true:**
- Plan has 5+ independent tasks
- Tasks don't share files or have tight dependencies
- User hasn't disabled swarm mode

**Ask:** "This plan has [N] independent tasks. Would you like to use parallel swarm execution, or proceed sequentially?"

**If user chooses swarm:**
- Switch to worktree mode for git
- Create isolated workspaces per agent
- Coordinate via task queue with dependencies

## Phase 2: Execute

### Sequential Mode (Default)

```
while (tasks remain):
    1. Mark task as in_progress
    2. Read referenced files from plan
    3. Look for similar patterns in codebase
    4. Check SUPER-COMPOUND.md Section 10 — verify file goes in correct directory
    5. Implement following existing conventions + architecture rules
    6. Verify dependency direction (no forbidden imports)
    7. Write tests for new functionality
    8. Run tests after changes
    9. Mark task as completed
    10. Check off task in plan document ([ ] → [x])
    11. Evaluate for incremental commit
```

### Incremental Commits

| Commit when... | Don't commit when... |
|----------------|---------------------|
| Logical unit complete | Small part of larger unit |
| Tests pass + meaningful progress | Tests failing |
| About to switch contexts | Purely scaffolding with no behavior |
| About to attempt risky changes | Would need a "WIP" message |

**Heuristic:** "Can I write a commit message describing a complete, valuable change? If yes, commit."

```bash
# 1. Verify tests pass
# 2. Stage related files only (not `git add .`)
git add <files related to this logical unit>
# 3. Commit with conventional message
git commit -m "feat(scope): description"
```

### Follow Existing Patterns

- Load reference files from the plan
- Match naming conventions exactly
- Reuse existing components
- Follow project coding standards (SUPER-COMPOUND.md config)
- When in doubt, grep for similar implementations

### Test Continuously

- Run relevant tests after each significant change
- Don't wait until the end to test
- Fix failures immediately
- Add new tests for new functionality

## Phase 3: Quality Check

### Core Quality Checks (Always)

```bash
# Run full test suite
[project test_command from SUPER-COMPOUND.md]

# Run linting
[project lint_command from SUPER-COMPOUND.md]
```

### Verification Gate

**Before claiming complete, use verification-before-completion skill:**
1. All tasks marked completed
2. All tests pass (with fresh output)
3. Linting passes
4. Code follows existing patterns
5. Architecture compliance verified (SUPER-COMPOUND.md Section 10)
6. No console errors or warnings
7. For multi-component work: run integration-checking skill

### Revision Mode

**When verification fails, don't restart — revise:**

```
IF verification gate fails:
  1. Identify specific failures (which checks failed)
  2. Enter revision mode:
     → Fix ONLY the failing aspects
     → DO NOT touch passing code
     → DO NOT add new features
  3. Re-run failed verification checks
  4. Max 3 revision iterations
  5. If still failing → checkpoint: needs_review
```

| Revision Allowed | Revision NOT Allowed |
|-----------------|---------------------|
| Fix failing tests | Add new features |
| Fix linting errors | Refactor passing code |
| Fix broken wiring | Change architecture |
| Add missing error handling | Change scope |

## Phase 4: Ship It

### Create Commit (if using Git)

```bash
git add .
git status  # Review what's being committed
git diff --staged  # Check the changes

git commit -m "feat(scope): description of what and why"
```

### Update State

If `docs/STATE.md` exists:
1. Mark completed tasks in Completed Work section
2. Update Current Position (next task or "done")
3. Record any decisions made during execution

### Notify User

- Summarize what was completed
- Note any follow-up work needed
- Suggest next steps (review, compound knowledge)

## Key Principles

| Principle | Description |
|-----------|-------------|
| **Start Fast** | Get clarification once, then execute |
| **Plan is Your Guide** | Follow the plan, don't reinvent |
| **Test As You Go** | After each change, not end |
| **Quality Built In** | Patterns, tests, linting |
| **Ship Complete** | Don't leave features 80% done |
| **Revise, Don't Restart** | When checks fail, fix specifically |

## Red Flags

| Thought | Reality |
|---------|---------|
| "Skip clarifying questions" | Ask now, not after building wrong thing |
| "Ignore plan references" | The plan has references for a reason |
| "Test at the end" | Test continuously or suffer later |
| "80% done is fine" | Finish the feature. Ship complete. |
| "Tests pass, we're done" | Use verification-before-completion skill |
| "Verification failed, start over" | Use revision mode — fix specific failures |

## Integration

**Prerequisite skills:**
- **writing-plans** — Creates the plan this skill executes

**Skills used during execution:**
- **test-driven-development** — Each task follows TDD
- **verification-before-completion** — Before claiming done (includes goal-backward)
- **systematic-debugging** — When things break during execution
- **checkpoint-protocol** — When human input is needed during execution
- **state-management** — Track progress in STATE.md
- **context-engineering** — Load files strategically per task
- **integration-checking** — Verify cross-component wiring

**This skill feeds into:**
- **code-review** — Review completed implementation
- **knowledge-compounding** — Document learnings
- **gap-closure** — When verification reveals gaps

