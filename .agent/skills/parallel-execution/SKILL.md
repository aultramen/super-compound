---
name: parallel-execution
description: "Use when a plan or issue board has 2+ independent execution streams whose time saving exceeds coordination overhead. Dispatches agents in isolated git worktrees only after required delivery gates pass."
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

- **Selection gate:** Require a Git repository, 2+ independent execution streams,
  clean state, `gitWorkflow.allowWorktree: true`, and time savings greater than
  coordination overhead. No unresolved blocker or dependency may remain.
- **UI scale-out gate:** For UI-bearing streams, the first vertical slice must be
  verified against the real provider, the experience baseline must be
  `VALIDATED`, every stream must pin the same contract version, and mock-only
  evidence cannot satisfy the gate.
- **Independence gate:** Inspect actual target files and semantic dependencies
  pairwise. Shared files, schemas, generated artifacts, migrations, lockfiles,
  sequential contracts, or integration ordering stay in one sequential stream
  with a single writer. Schedule only `Blocked by: None` or verified dependencies.
- **Preview gate:** Route remote, base, branch, clean-state, and worktree commands through `git-workflow-operation`. Each parallel stream uses its own branch and workspace; never modify the main worktree during parallel work.
- **Dispatch gate:** Give each agent its workspace, branch, ordered tasks, FSD/issue authority, verification contract, and required orchestration skill. Tasks inside one dependency group remain sequential. Compute the wave plan first: `node .agent/tools/goal-waves.mjs --issues-dir .scratch/<feature>/issues` groups goals into dependency waves (add `--json` for the stable machine shape); dispatch one wave at a time, capped by its `maxWorkers`. Shared-state writes during a wave hold the `docs/STATE.md` lock (see `goal-waves.mjs` lock helpers).
- **Wave-boundary gate:** After wave N verifies, write a compact wave summary to `docs/STATE.md` under the existing `goal-waves.mjs`/`file-state.mjs` lock; dispatch wave N+1 with fresh subagents (no accumulated transcript); on mid-wave failure re-dispatch only goals `verified-promise.mjs` leaves unverified.
- **Approval gate:** Never remove a worktree until its resolved target path is validated and the user approves. Preview merge, rebase, cleanup, push, and PR operations before mutation.
- **Conflict gate:** Never auto-resolve conflicts. A conflict invalidates the independence assumption; resolve manually and rerun the full suite.
- **Integration gate:** Inspect every branch, integrate using the FSD strategy,
  then run full tests, contract/fixture/provider/consumer checks, and
  `verification-before-completion`. Do not claim completion without
  merged-system integration verification.

## Integration

Used by `executing-plans` in swarm mode. Use `git-workflow-operation`, `subagent-orchestration`, and `verification-before-completion` for workspace safety, task execution, and final integration.
