# /sc-go Runtime Contract

Purpose: preview-first Git branch, worktree, commit, push, and PR operations.

Load first: `.agent/context/skills/git-workflow-operation.contract.md`, then `.agent/rules/project-config.md` for `gitWorkflow`.

Use `.agent/tools/git-workflow.mjs` to preview commands. Stop on protected base branch, dirty tree before checkout, missing remote/base, branch collisions, branch mismatch, invalid branch names, and sensitive-file warnings before `git add .`.

Mutation requires explicit current user intent and a fresh preview. Never commit,
push, create a PR, force-push, delete a branch, remove a worktree, reset, or clean
without that operation being explicitly requested; stop for approval when the
preview exposes risk.
