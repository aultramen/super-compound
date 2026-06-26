---
description: "Preview and run safe Git branch, commit, push, worktree, and Pull Request operations."
---

# Go Workflow

Use this workflow for explicit Git operations after or before Super Compound work: branch start, optional worktree setup, commit, push, and Pull Request preparation.

## Usage

```text
/sc-go status
/sc-go start feature/name
/sc-go worktree feature/name --path ../project-feature
/sc-go commit "Describe the change"
/sc-go push
/sc-go pr
```

## Steps

1. Read `.agent/context/workflows/sc-go.contract.md` and `.agent/context/skills/git-workflow-operation.contract.md`.
2. Load `skills/git-workflow-operation/SKILL.md` when performing or reviewing Git operations.
3. Read `.agent/rules/project-config.md` and use `gitWorkflow` defaults unless the user mentions another base branch or remote.
4. Identify the operation: `status`, `start`, `worktree`, `commit`, `push`, `pr`, or finish flow.
5. Use `.agent/tools/git-workflow.mjs` to preview safety checks and commands when available.
6. If the user mentions a branch different from the active branch, stop or preview checkout/worktree commands before commit, push, or PR.
7. Never commit, push, force-push, create a PR, delete a branch, remove a worktree, reset, or clean without explicit user intent and a fresh preview.
8. For PRs, use `.agent/templates/git-workflow/PULL_REQUEST_TEMPLATE.md`; use `gh` or `glab` only when available and explicitly requested.

## Output

- Git safety check result.
- Command preview.
- PR template or PR creation command when requested.
- Blockers, warnings, and required user approval for risky operations.
