# /sc-go Runtime Contract

Purpose: preview-first Git branch, worktree, commit, push, and PR operations.

Preview is read-only. `commit`, `push`, and `pr` run only after a fresh preview
and explicit current user intent for that operation; resolve or cite the
preview's warnings first. Contract-sensitive paths prompt semantic diff review;
contract-preserving maintenance does not automatically trigger T2.

Load first: `.agent/context/skills/git-workflow-operation.contract.md`, then `.agent/rules/project-config.md` for `gitWorkflow`.

Use `.agent/tools/git-workflow.mjs` to preview commands. Stop on protected base mutation, unsafe checkout, unknown base, collisions, branch mismatch, invalid names, and unresolved sensitive-file risks. A known local base supports offline setup; inventory dirty work and isolate it without stash/reset/commit.

Mutation requires explicit current user intent and a fresh preview. Never commit,
push, create a PR, force-push, delete a branch, remove a worktree, reset, or clean
without that operation being explicitly requested; stop for approval when the
preview changes target, scope, or material risk beyond authorization. Existing
explicit authorization persists; a fresh preview needs no redundant confirmation. Checkpoint automatically and continue; /sc-pause is only for actual stops.

Shared policy: `.agent/skills/agentic-delivery/references/workflow-integration.md`.
