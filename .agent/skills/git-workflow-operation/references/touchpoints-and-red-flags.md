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
