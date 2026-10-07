---
name: parallel-execution
description: "Use when a plan or issue board has 2+ independent execution streams whose time saving exceeds coordination overhead. Dispatches agents in isolated git worktrees only after required delivery gates pass."
---

# Parallel Execution

## Overview

Execute independent tasks simultaneously in isolated Git worktrees when the saved time justifies coordination overhead.

**Core principle:** Parallel only works when tasks are truly independent. One shared file = sequential.

## Reference Router

- Decide whether parallelism is allowed and worthwhile: [prerequisites and selection](references/prerequisites-and-selection.md)
- Analyze files, group dependencies, preview worktrees, dispatch, integrate, and verify: [process](references/process.md)
- Counter unsafe shortcuts or optimistic independence claims: [red flags](references/red-flags.md)

Load the full process only after the selection gate passes. Every parallel stream must use an isolated worktree or equivalent isolated workspace; if isolation is unavailable, execute sequentially.

## Mandatory Gates

- **Selection gate:** Require a Git repository, 2+ independent execution streams,
  safe isolated state, `gitWorkflow.allowWorktree: true`, and time savings greater
  than coordination overhead. Only affected goals wait for unresolved blockers;
  unrelated user edits are inventoried and preserved, never stashed/reset.
- **UI scale-out gate:** For networked UI-bearing streams, the first vertical slice must be
  verified against the real provider, the experience baseline must be
  `VALIDATED`, every stream must pin the same contract version, and mock-only
  evidence cannot satisfy the gate.
- **Independence gate:** Inspect actual target files and semantic dependencies
  pairwise. Shared files, schemas, generated artifacts, migrations, lockfiles,
  sequential contracts, or integration ordering stay in one sequential stream
  with a single writer. Schedule only `Blocked by: None` or verified dependencies.
- **Preview gate:** Route known-base, branch, target-state, and worktree commands through `git-workflow-operation`. Each parallel stream uses its own branch and workspace; never modify the main worktree during parallel work.
- **Dispatch gate:** Give each worker isolated workspace, goal authority,
  scope, and verification contract. Validate the DAG with `goal-waves.mjs`;
  dispatch `--ready --state <state.json>` as dependencies verify and slots free.
  [Process](references/process.md) defines host/resource capacities. One scheduler
  serializes shared writes with atomic replacement and ledger version checks;
  no filesystem lock helper exists.
- **Reporting boundary:** Write compact summaries to `docs/STATE.md` through the single scheduler. Fresh dispatch carries file-backed goal context; on failure recover only affected unverified goals. Reporting waves never block an otherwise dependency-ready goal.
- **Approval gate:** Never remove a worktree until its resolved target path is validated and the user approves. Preview merge, rebase, cleanup, push, and PR operations before mutation.
- **Conflict gate:** Investigate ownership and intent. Auto-resolve only proven identical changes or deterministic regeneration preserving both edits; record proof and verify integration. Quarantine only affected workers. Semantic ambiguity requires the authority owner.
- **Integration gate:** Inspect every branch, integrate using the FSD strategy,
  then run applicable integration tests and contract/fixture/provider/consumer checks, and
  `verification-before-completion`. The coordinator inspects each worker's actual
  goal/all-AC evidence and proves the final combined outcome; reports/status
  labels alone cannot promote verified or release dependencies. Require the run
  completion gate and `Evidence of Completion` with what/how, actual
  results/locators, and acceptance mapping. Partial/failed/stale proof stays incomplete.

## Integration

Used by `executing-plans` in swarm mode. Use `git-workflow-operation`, `subagent-orchestration`, and `verification-before-completion` for workspace safety, task execution, and final integration.
