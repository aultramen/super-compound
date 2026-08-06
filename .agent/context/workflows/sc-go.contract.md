# /sc-go Runtime Contract

Pass each prospective write through `.agent/tools/workflow-admission.mjs`.

Purpose: preview-first Git branch, worktree, commit, push, and PR operations.

Preview is read-only and needs no wizard. `commit`, `push`, and PR mutation need
a nonterminal FSD-authorized run, host-attested approval, durable intent, and an
allowlisted operation. Until the later release gate and operation inventory are
implemented, return `OPEN-RELEASE-GATE`: the current allowlist contains no
`commit`, `push`, or `pr`, so no mutation is permitted. A preview or terminal
run is not an operation gate.

Load first: `.agent/context/skills/git-workflow-operation.contract.md`, then `.agent/rules/project-config.md` for `gitWorkflow`.

Use `.agent/tools/git-workflow.mjs` to preview commands. Stop on protected base branch, dirty tree before checkout, missing remote/base, branch collisions, branch mismatch, invalid branch names, and sensitive-file warnings before `git add .`.

Mutation requires explicit current user intent and a fresh preview. Never commit,
push, create a PR, force-push, delete a branch, remove a worktree, reset, or clean
without that operation being explicitly requested; stop for approval when the
preview exposes risk.
