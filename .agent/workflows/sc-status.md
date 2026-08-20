---
description: "Show current project/session state and route to the next useful workflow."
---

# Status Workflow

Use this at the start of a session or when orientation is needed.

## Steps

1. Check for `.continue-here.md`.
2. Read `docs/STATE.md` and `docs/progress.md` when present.
   Treat any `run_id`, status, and run head digest as a non-authoritative pointer.
   Refresh it with `node .agent/tools/loop-run.mjs show --run <run_id>`; never
   copy events, counters, an approval envelope, or a confirmation digest into
   the dashboard.
3. Inventory only issue metadata (`Status`, `Goal ID`, `Blocked by`, and path)
   under `.scratch/*/issues/` without reading all issue bodies. Read the body of
   only the selected ready or blocking issue after the route is chosen.
4. Check Git status, active branch, upstream, and worktree state when inside a Git repo; do not mutate Git state.
5. Summarize current position, completed work, remaining work, blockers, issue board status, and verification status. Route a named `OPEN-RESEARCH-*` evidence blocker to `/sc-research`, then back to its owning workflow.
6. Run `node .agent/tools/memory-maintenance.mjs report`; if the tool is
   missing, count Quick Reference rows in `docs/ERROR_LOG.md` and
   `docs/LEARNED_KNOWLEDGE.md` manually. If any category or prevention rule
   recurs 3+ times or a `PATTERN` flag exists, recommend `/sc-evolve` as the
   next route.
7. If no ready goal issues exist and there is no active handoff, blocker, or failing verification, recommend `/sc-geniusloop`.
8. Recommend one exact route from `/sc-init`, `/sc-status`, `/sc-geniusloop`,
   `/sc-explore`, `/sc-research`, `/sc-prd`, `/sc-plan`, `/sc-eval`, `/sc-go`,
   `/sc-work`, `/sc-debug`, `/sc-review`, `/sc-audit`, `/sc-compound`,
   `/sc-evolve`, `/sc-pause`, `/sc-launch`, or `/sc-ui`.
9. If the exact next transition is `START` or `RESUME`, say that fresh human
   confirmation is required; a saved STATE snapshot cannot authorize it.

## Output

- Short dashboard.
- Recommended next action.
