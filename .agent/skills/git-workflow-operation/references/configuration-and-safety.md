## Configuration

Read `gitWorkflow` from `.agent/rules/project-config.md`. Defaults are: remote `origin`, base `main`, preview-first enabled, clean working tree required, `git pull --ff-only`, worktree allowed, protected base branch, sensitive-file warning before `git add .`, and branch prefixes `feature`, `fix`, `hotfix`, `refactor`, `docs`, `chore`.

## Safety Checks

Before branch or worktree setup:

1. Confirm the directory is a Git repository and inventory dirty paths.
2. For remote setup, confirm configured remote and `remote/base`. For offline
   or local-only setup use `--local` with a known local base; do not fetch/pull.
3. Branch from the active known base only when no checkout will overwrite user
   changes; otherwise use an isolated worktree from that base. Dirty work in
   the original workspace does not block isolated setup.
4. Confirm branch availability and validate branch/base names and worktree paths.
5. Never automatically stash, reset, clean, or commit user work to make setup pass.

A requested operation remains authorized while target, scope, and material risk
are unchanged. Run the fresh preview and proceed; ask again only for an
unauthorized delta. Implementation scope alone never authorizes Git delivery.

Before commit/push/PR:

1. Stop on protected base branch.
2. If the user mentioned a branch that is not active, stop or preview checkout/worktree commands first.
3. Run `git status` and `git diff`.
4. Warn before `git add .` about `.env`, secrets, credentials, logs, cache, and build output.
5. Require local verification before PR creation.
6. Use `git push -u origin <branch>` for first push.
7. Use `--force-with-lease`, never `--force`, after a rebase that requires force push.

Never run `git reset --hard`, `git clean -fd`, destructive branch deletion, destructive worktree removal, or publishing commands without explicit approval.
