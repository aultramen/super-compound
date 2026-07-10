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
