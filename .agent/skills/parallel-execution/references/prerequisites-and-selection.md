## Prerequisites

- Git repository initialized
- Plan or `.scratch/` issue board with 2+ independent execution streams
- Tasks identified as independent (no shared files)
- `gitWorkflow.allowWorktree: true` in `.agent/rules/project-config.md`
- Every stream has an isolated Git worktree
- `git-workflow-operation` preview confirms remote, base branch, clean state, and branch availability
- UI scale-out starts only after the first vertical slice is verified against the real provider,
  one pinned contract version, no contract blocker, and a `VALIDATED` experience baseline
- Shared schemas, generated clients, fixtures, migrations, lockfiles, and registries have a single writer

## When to Use vs When NOT

| Use When | Don't Use When |
|----------|---------------|
| 2+ independent execution streams | Tasks share files or semantic contract dependencies |
| Tasks modify different modules | Sequential dependencies |
| Time savings justify overhead | Coordination overhead exceeds time saving |
| Clean git state | Uncommitted changes |
