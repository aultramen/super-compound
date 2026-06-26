---
name: parallel-execution
description: "Use when a plan or issue board has 5+ independent tasks that don't share files. Dispatches multiple agents working simultaneously in isolated git worktrees. Requires no unresolved blockers or file-level dependencies."
---

# Parallel Execution

## Overview

Execute independent plan tasks or issue files simultaneously using isolated git worktrees per agent. Combines parallel agent dispatch with worktree isolation to prevent checkout churn and merge conflicts.

**Announce:** "I'm using the parallel-execution skill to run independent tasks in parallel."

**Core principle:** Parallel only works when tasks are truly independent. One shared file = sequential.

## Prerequisites

- Git repository initialized
- Plan or `.scratch/` issue board with 5+ tasks or issues
- Tasks identified as independent (no shared files)
- `gitWorkflow.allowWorktree: true` in `.agent/rules/project-config.md`
- `git-workflow-operation` preview confirms remote, base branch, clean state, and branch availability

## When to Use vs When NOT

| Use When | Don't Use When |
|----------|---------------|
| 5+ independent tasks or ready issues | Tasks share files |
| Tasks modify different modules | Sequential dependencies |
| Time savings justify overhead | Small plan (< 5 tasks) |
| Clean git state | Uncommitted changes |

## The Process

### Phase 1: Independence Analysis

For each pair of tasks or issue files, check:

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

For issue boards, schedule only issues whose `Blocked by` entries are `None` or already `done`.

### Phase 2: Preview Worktrees

For each parallel group, preview an isolated worktree:

```bash
git fetch origin
git worktree add -b feature/group-a ../project-group-a origin/main
git worktree add -b feature/group-b ../project-group-b origin/main
git worktree add -b feature/group-c ../project-group-c origin/main
```

**Rules:**
- Each worktree gets its own branch
- Worktree is optional, used only for parallel work or multi-branch review
- Install dependencies in each worktree if needed
- Never modify the main worktree during parallel work
- Do not remove worktrees without validating the target path and asking for approval

### Phase 3: Dispatch Agents

Send each group to a separate agent:

```markdown
## Workspace: ../project-group-a
## Tasks: [1, 2] (sequential within group)
## Branch: feature/group-a

Execute tasks 1 and 2 sequentially in this workspace.
Follow subagent-orchestration for each task.
Route commit, push, and PR preparation through /sc-go after each accepted task when commits are requested.
```

### Phase 4: Integrate Back

After all agents complete:

```bash
git status
git diff
git push -u origin feature/group-a
git push -u origin feature/group-b
git push -u origin feature/group-c
```

Open PRs for completed branches unless the FSD states a different integration strategy. If local merge, rebase, or worktree cleanup is required, preview commands first and run full verification after resolution.

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
| "Delete worktrees now" | Validate paths and ask before removal. |

## Integration

**This skill is used by:**
- **executing-plans** — When swarm mode is chosen

**This skill uses:**
- **git-workflow-operation** - Preview branch, worktree, push, and PR operations
- **subagent-orchestration** — Each agent follows subagent workflow
- **verification-before-completion** — Integration check after merge
