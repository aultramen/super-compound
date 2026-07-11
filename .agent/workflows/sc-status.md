---
description: "Show current project/session state and route to the next useful workflow."
---

# Status Workflow

Use this at the start of a session or when orientation is needed.

## Steps

1. Check for `.continue-here.md`.
2. Read `docs/STATE.md` and `docs/progress.md` when present.
3. Inventory only issue metadata (`Status`, `Goal ID`, `Blocked by`, and path)
   under `.scratch/*/issues/` without reading all issue bodies. Read the body of
   only the selected ready or blocking issue after the route is chosen.
4. Check Git status, active branch, upstream, and worktree state when inside a Git repo; do not mutate Git state.
5. Summarize current position, completed work, remaining work, blockers, issue board status, and verification status. Route a named `OPEN-RESEARCH-*` evidence blocker to `/sc-research`, then back to its owning workflow.
6. If no ready goal issues exist and there is no active handoff, blocker, or failing verification, recommend `/sc-geniusloop`.
7. Recommend one exact route from `/sc-init`, `/sc-status`, `/sc-geniusloop`,
   `/sc-explore`, `/sc-research`, `/sc-prd`, `/sc-plan`, `/sc-eval`, `/sc-go`,
   `/sc-work`, `/sc-debug`, `/sc-review`, `/sc-audit`, `/sc-compound`,
   `/sc-pause`, `/sc-launch`, or `/sc-ui`.

## Output

- Short dashboard.
- Recommended next action.
