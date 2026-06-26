---
name: git-workflow-operation
description: "Use when starting Git work, preparing commits, pushing branches, opening Pull Requests, or coordinating optional git worktrees."
---

# Git Workflow Operation

## Purpose

Git operations are preview-first. Show safety checks and exact commands before checkout, add, commit, push, PR creation, merge, branch deletion, or worktree removal.

## When To Use

Use this skill when:

- `/sc-go` is invoked.
- `/sc-work` or `/sc-debug` is about to edit files.
- A user mentions branch, commit, push, PR, Pull Request, or worktree operations.
- Parallel agents need isolated workspaces.

Do not use it for read-only research, PRD/FSD authoring, UI review, or knowledge capture unless those workflows explicitly ask for Git state.

## Configuration

Read `gitWorkflow` from `.agent/rules/project-config.md`. Defaults are: remote `origin`, base `main`, preview-first enabled, clean working tree required, `git pull --ff-only`, worktree allowed, protected base branch, sensitive-file warning before `git add .`, and branch prefixes `feature`, `fix`, `hotfix`, `refactor`, `docs`, `chore`.

## Safety Checks

Before branch or worktree setup:

1. Confirm the directory is a Git repository.
2. Confirm the configured remote exists.
3. Confirm the working tree is clean before checkout.
4. Confirm `remote/base` exists.
5. Confirm the new branch does not exist locally or remotely.
6. Validate branch name and prefix.

Before commit/push/PR:

1. Stop on protected base branch.
2. If the user mentioned a branch that is not active, stop or preview checkout/worktree commands first.
3. Run `git status` and `git diff`.
4. Warn before `git add .` about `.env`, secrets, credentials, logs, cache, and build output.
5. Require local verification before PR creation.
6. Use `git push -u origin <branch>` for first push.
7. Use `--force-with-lease`, never `--force`, after a rebase that requires force push.

Never run `git reset --hard`, `git clean -fd`, destructive branch deletion, destructive worktree removal, or publishing commands without explicit approval.

## Command Previews

Standard branch start:

```bash
git checkout main
git pull --ff-only origin main
git checkout -b feature/example
```

Optional worktree start:

```bash
git fetch origin
git worktree add -b feature/example ../project-feature origin/main
cd ../project-feature
```

Finish flow:

```bash
git status
git diff
git add .
git commit -m "Describe the change"
git push -u origin feature/example
```

Use `.agent/tools/git-workflow.mjs` for deterministic previews and `.agent/templates/git-workflow/PULL_REQUEST_TEMPLATE.md` for PR text.

## Branch Names

Allowed forms:

- `feature/name`
- `fix/name`
- `hotfix/name`
- `refactor/name`
- `docs/name`
- `chore/name`

Reject empty names, spaces, shell-risky characters, `..`, `//`, `@{`, leading dash, trailing dot, trailing slash, and unsupported prefixes.

## Workflow Touchpoints

| Workflow | Git operation |
|---|---|
| `/sc-work` | Preview branch setup before edits; block direct work on protected base. |
| `/sc-debug` | Preview `fix/*` or `hotfix/*` after reproduction and before fixing. |
| `/sc-plan` | Suggest branch names and worktree candidates only. |
| `/sc-review` | Review branch/diff and PR checklist; no push. |
| `/sc-audit` | Read-only release and secret checks. |
| `/sc-status`, `/sc-pause` | Report Git state only. |
| `/sc-launch` | Route final commit, push, and PR through `/sc-go`. |

## Red Flags

| Thought | Reality |
|---|---|
| "It is a tiny change, commit on main." | Protected base branches are not working branches. |
| "Run git add . now, review later." | Review sensitive paths before staging all files. |
| "Use force push, it is faster." | Use `--force-with-lease` only after preview and approval. |
| "Worktree should be standard." | Worktree is optional, for parallel work or multi-branch review. |

## Integration

Used by `/sc-go`, `/sc-work`, `/sc-debug`, `/sc-review`, `/sc-audit`, `/sc-status`, `/sc-pause`, `/sc-launch`, `executing-plans`, and `parallel-execution`.
