# Git Workflow Operation Skill Contract

Use for branch start, optional worktree setup, commit, push, and Pull Request preparation.

- Default mode is preview-first; show commands before running Git operations.
- Remote setup: checkout base, pull `--ff-only`, create branch. Offline `--local`: known local base; isolate dirty work without stash/reset.
- Optional worktree flow: `git fetch origin`, `git worktree add -b <branch> <path> origin/<base>`.
- Finish flow: `git status`, `git diff`, sensitive-file warning, `git add .`, commit, first push with `-u`.
- Branch prefixes: `feature`, `fix`, `hotfix`, `refactor`, `docs`, `chore`.
- Never use `git push --force`; after rebase use `--force-with-lease` only with explicit approval.

Shared policy: `.agent/skills/agentic-delivery/references/workflow-integration.md`.
