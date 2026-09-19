---
description: "Preview and run safe Git branch, commit, push, worktree, and Pull Request operations."
---

# Go Workflow

Use this workflow for explicit Git operations after or before Super Compound work: branch start, optional worktree setup, commit, push, and Pull Request preparation.

Preview first. On explicit confirmation for that operation, run the previewed
commands. A preview that warns about full-tier paths (schema, migrations, API,
auth, billing) must cite the owning PRD/FSD or escalate (`ESCALATE: T2`) before
the mutation runs.

## Usage

```text
/sc-go status
/sc-go start feature/name
/sc-go worktree feature/name --path ../project-feature
/sc-go commit "Describe the change"   # preview, then run on confirmation
/sc-go push                           # preview, then run on confirmation
/sc-go pr                             # preview, then run on confirmation
```

## Steps

1. Load `skills/git-workflow-operation/SKILL.md` when performing or reviewing Git operations.
2. Read `.agent/rules/project-config.md` and use `gitWorkflow` defaults unless the user mentions another base branch or remote.
3. Identify the operation: `status`, `start`, `worktree`, `commit`, `push`, `pr`, or finish flow.
4. Use `.agent/tools/git-workflow.mjs` to preview safety checks and commands when available.
5. If the user mentions a branch different from the active branch, stop or preview checkout/worktree commands before commit, push, or PR.
6. Never commit, push, force-push, create a PR, delete a branch, remove a worktree, reset, or clean without explicit user intent and a fresh preview.
7. For PRs, use `.agent/templates/git-workflow/PULL_REQUEST_TEMPLATE.md`; use `gh` or `glab` only when available and explicitly requested.
8. If work remains, end with `/sc-pause` so `docs/STATE.md` carries the exact next action.

## Output

- Git safety check result.
- Command preview.
- PR template or PR creation command when requested.
- Blockers, warnings, and required user approval for risky operations.
