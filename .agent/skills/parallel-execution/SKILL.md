---
name: parallel-execution
description: "Use when a plan has 5+ independent tasks that don't share files. Dispatches multiple agents working simultaneously in isolated git worktrees. Requires tasks with no file-level dependencies."
---

# Parallel Execution

## Overview

Execute independent plan tasks simultaneously using isolated git worktrees per agent. Combines parallel agent dispatch with worktree isolation to prevent merge conflicts.

**Announce:** "I'm using the parallel-execution skill to run independent tasks in parallel."

**Core principle:** Parallel only works when tasks are truly independent. One shared file = sequential.

## Prerequisites

- Git repository initialized
- Plan with 5+ tasks
- Tasks identified as independent (no shared files)
- `git_workflow` set to `worktree` in project-config.md

## When to Use vs When NOT

| Use When | Don't Use When |
|----------|---------------|
| 5+ independent tasks | Tasks share files |
| Tasks modify different modules | Sequential dependencies |
| Time savings justify overhead | Small plan (< 5 tasks) |
| Clean git state | Uncommitted changes |

## The Process

### Phase 1: Independence Analysis

For each pair of tasks, check:

```
Task A files ∩ Task B files = ∅  →  Independent ✅
Task A files ∩ Task B files ≠ ∅  →  Sequential ❌
```

**Build dependency graph:**
```
Task 1: src/auth/* → Independent group A
Task 2: src/auth/* → Sequential with Task 1 (shared files)
Task 3: src/api/*  → Independent group B
Task 4: src/ui/*   → Independent group C
Task 5: src/api/*  → Sequential with Task 3 (shared files)
```

**Result:** Parallel groups = {[1,2], [3,5], [4]} → Run 3 parallel streams.

### Phase 2: Create Worktrees

For each parallel group, create an isolated worktree:

```bash
# From main project directory
git worktree add ../project-group-a -b feat/group-a
git worktree add ../project-group-b -b feat/group-b
git worktree add ../project-group-c -b feat/group-c
```

**Rules:**
- Each worktree gets its own branch
- Install dependencies in each worktree if needed
- Never modify the main worktree during parallel work

### Phase 3: Dispatch Agents

Send each group to a separate agent:

```markdown
## Workspace: ../project-group-a
## Tasks: [1, 2] (sequential within group)
## Branch: feat/group-a

Execute tasks 1 and 2 sequentially in this workspace.
Follow subagent-orchestration for each task.
Commit after each task.
```

### Phase 4: Merge Back

After all agents complete:

```bash
# Switch to main branch
git checkout main

# Merge each group
git merge feat/group-a --no-ff
git merge feat/group-b --no-ff
git merge feat/group-c --no-ff

# Clean up worktrees
git worktree remove ../project-group-a
git worktree remove ../project-group-b
git worktree remove ../project-group-c
```

**If merge conflicts:**
1. Resolve conflicts manually
2. Run full test suite after resolution
3. Never auto-resolve — conflicts mean independence analysis was wrong

### Phase 5: Integration Verification

After merging all groups:
- Run full test suite
- Use `verification-before-completion` integration checking
- Verify cross-component wiring

## Red Flags

| Thought | Reality |
|---------|---------|
| "These tasks are probably independent" | Check actual files. Probably ≠ verified. |
| "Small overlap is fine" | One shared file = merge conflict guaranteed |
| "Skip worktrees, just use branches" | Branches without worktrees = context switching overhead |
| "Auto-merge conflicts" | Manual resolution only. Conflicts = bad analysis. |

## Integration

**This skill is used by:**
- **executing-plans** — When swarm mode is chosen

**This skill uses:**
- **subagent-orchestration** — Each agent follows subagent workflow
- **verification-before-completion** — Integration check after merge
