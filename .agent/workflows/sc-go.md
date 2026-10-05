---
description: "Preview and run safe Git branch, commit, push, worktree, and Pull Request operations."
---

# Go Workflow

## Summary

Before requesting input or approval, load `.agent/context/checkpoint.contract.md`; use its complete active-work list and reply guidance.


Use this workflow for explicit Git operations after or before Super Compound work: branch start, optional worktree setup, commit, push, and Pull Request preparation.

Preview first, then run the explicitly authorized operation while its target,
scope, and material risk remain unchanged; no second confirmation is required.
Sensitive paths prompt semantic diff inspection, not automatic T2 escalation.
Ask again only for a material delta outside the existing authorization.


## Example

Input: `/sc-go start feature/analytics`.
Prerequisite: Explicit Git operation intent and configured base/prefix.
Result and next action: Fresh safety preview and result of the authorized operation; continue the owning development task.

## Usage

```text
/sc-go status
/sc-go start feature/name
/sc-go worktree feature/name --path ../project-feature
/sc-go commit "Describe the change"   # fresh preview, then run within authorization
/sc-go push                           # fresh preview, then run within authorization
/sc-go pr                             # fresh preview, then run within authorization
```

## Steps

1. Load `skills/git-workflow-operation/SKILL.md` when performing or reviewing Git operations.
2. Read `.agent/rules/project-config.md` and use `gitWorkflow` defaults unless the user mentions another base branch or remote.
3. Identify the operation: `status`, `start`, `worktree`, `commit`, `push`, `pr`, or finish flow.
4. Use `.agent/tools/git-workflow.mjs` to preview safety checks and commands when available.
5. If the user mentions a branch different from the active branch, stop or preview checkout/worktree commands before commit, push, or PR.
6. Never commit, push, force-push, create a PR, delete a branch, remove a worktree, reset, or clean without explicit user intent and a fresh preview.
7. For PRs, use `.agent/templates/git-workflow/PULL_REQUEST_TEMPLATE.md`; use `gh` or `glab` only when available and explicitly requested.
8. Checkpoint automatically and continue authorized work; use `/sc-pause` only when actually stopping.

## Output

- Git safety check result.
- Command preview.
- PR template or PR creation command when requested.
- Blockers, warnings, and required user approval for risky operations.
