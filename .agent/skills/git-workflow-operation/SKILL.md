---
name: git-workflow-operation
description: "Use when starting Git work, preparing commits, pushing branches, opening Pull Requests, or coordinating optional git worktrees."
---

# Git Workflow Operation

## Purpose

Git operations are preview-first. Show safety checks and exact commands before checkout, add, commit, push, PR creation, merge, branch deletion, or worktree removal.

## When To Use

Use for `/sc-go`, edits beginning through `/sc-work` or `/sc-debug`, user-requested branch/commit/push/PR/worktree operations, or isolated parallel work. Skip read-only research, artifact authoring, UI review, and knowledge capture unless they explicitly require Git state.

## Reference Router

- Project defaults, repository checks, commit/push/PR checks, and destructive prohibitions: [configuration and safety](references/configuration-and-safety.md)
- Standard branch/worktree/finish previews and valid branch names: [commands and branches](references/commands-and-branches.md)
- Workflow-specific behavior and shortcut warnings: [touchpoints and red flags](references/touchpoints-and-red-flags.md)

Load command previews only for the requested operation. Load workflow touchpoints only when coordinating another `/sc-*` route.

## Mandatory Gates

- **Preview gate:** Read `gitWorkflow` configuration and show the exact proposed commands before any mutation. Use `.agent/tools/git-workflow.mjs` for deterministic previews and the PR template for PR text.
- **Repository gate:** Confirm repository, configured remote, clean state before checkout, `remote/base`, branch availability, and valid prefix/name. Worktrees are optional, not the default.
- **Protected-base gate:** Never edit, commit, or push directly on the protected base. If the requested branch is not active, stop or preview checkout/worktree setup first.
- **Sensitive-file gate:** Before staging, inspect `git status` and `git diff`; warn about `.env`, secrets, credentials, logs, caches, and build output before `git add .`.
- **Verification gate:** Require relevant local verification before commit claims or PR creation. Review the actual diff and PR checklist; `/sc-review` and `/sc-audit` remain read-only.
- **Force gate:** First push uses `git push -u origin <branch>`. After an approved rebase, use only `--force-with-lease`, never `--force`.
- **Approval gate:** Never run publishing commands, `git reset --hard`, `git clean -fd`, destructive branch deletion, merge, or destructive worktree removal without explicit approval. Validate worktree target paths before cleanup.

## Integration

Used by `/sc-go`, `/sc-work`, `/sc-debug`, `/sc-review`, `/sc-audit`, `/sc-status`, `/sc-pause`, `/sc-launch`, `executing-plans`, and `parallel-execution`.
