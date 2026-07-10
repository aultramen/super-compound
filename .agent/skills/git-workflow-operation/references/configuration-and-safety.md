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
