---
name: parallel-execution
description: "Use when a plan or issue board has 5+ independent tasks that don't share files. Dispatches multiple agents working simultaneously in isolated git worktrees. Requires no unresolved blockers or file-level dependencies."
---

# Parallel Execution

## Overview

Execute independent tasks simultaneously in isolated Git worktrees when the saved time justifies coordination overhead.

**Announce:** "I'm using the parallel-execution skill to run independent tasks in parallel."

**Core principle:** Parallel only works when tasks are truly independent. One shared file = sequential.

## Reference Router

- Decide whether parallelism is allowed and worthwhile: [prerequisites and selection](references/prerequisites-and-selection.md)
- Analyze files, group dependencies, preview worktrees, dispatch, integrate, and verify: [process](references/process.md)
- Counter unsafe shortcuts or optimistic independence claims: [red flags](references/red-flags.md)

Load the full process only after the selection gate passes. Every parallel stream must use an isolated worktree or equivalent isolated workspace; if isolation is unavailable, execute sequentially.

## Mandatory Gates

- **Selection gate:** Require a Git repository, a plan or board with 5+ independent ready tasks, clean state, `gitWorkflow.allowWorktree: true`, and enough time savings to justify overhead. No unresolved blockers or file-level dependencies may remain.
- **Independence gate:** Inspect actual target files pairwise. Shared files, sequential data contracts, or unresolved integration ordering place tasks in the same sequential stream. For issue boards, schedule only `Blocked by: None` or already-`done` dependencies.
- **Preview gate:** Route remote, base, branch, clean-state, and worktree commands through `git-workflow-operation`. Each parallel stream uses its own branch and workspace; never modify the main worktree during parallel work.
- **Dispatch gate:** Give each agent its workspace, branch, ordered tasks, FSD/issue authority, verification contract, and required orchestration skill. Tasks inside one dependency group remain sequential.
- **Approval gate:** Never remove a worktree until its resolved target path is validated and the user approves. Preview merge, rebase, cleanup, push, and PR operations before mutation.
- **Conflict gate:** Never auto-resolve conflicts. A conflict invalidates the independence assumption; resolve manually and rerun the full suite.
- **Integration gate:** Inspect every branch, integrate using the FSD strategy, then run full tests and `verification-before-completion` cross-component checks. Do not claim the streams complete independently of merged-system verification.

## Integration

Used by `executing-plans` in swarm mode. Use `git-workflow-operation`, `subagent-orchestration`, and `verification-before-completion` for workspace safety, task execution, and final integration.
