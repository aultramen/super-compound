---
description: "Show current project/session state and route to the next useful workflow."
---

# Status Workflow

## Summary


Use this at the start of a session or when orientation is needed.


## Example

Input: `/sc-status`.
Prerequisite: Current workspace; existing STATE/handoff when available.
Result and next action: Read-only position, evidence and blockers; one exact next route to resume.

## Steps

1. Check for `.continue-here.md`.
2. Read `docs/STATE.md` and `docs/progress.md` when present.
   Treat `docs/STATE.md` as the canonical position; verify it against `git
   status` and the artifacts it names before trusting it.
3. Inventory only issue metadata (`Status`, `Goal ID`, `Blocked by`, and path)
   under `.scratch/*/issues/` without reading all issue bodies. Read the body of
   only the selected ready or blocking issue after the route is chosen.
4. Check Git status, active branch, upstream, and worktree state when inside a Git repo; do not mutate Git state.
5. Summarize current position, completed work, remaining work, blockers, issue board status, and verification status. Apply `.agent/context/checkpoint.contract.md`: show newly resolved and remaining needs, each owner and next action, blocked scope and independent ready work. Route a named `OPEN-RESEARCH-*` evidence blocker to `/sc-research`, then back to its owning workflow.
6. Run `node .agent/tools/memory-maintenance.mjs report`. Prioritize active user
   intent and dependency-ready goals. `STALE_STATE`/`STALE_PROGRESS` are
   reconciliation signals for the owning route, not global blockers. Suggest
   `/sc-evolve` for 3+ independent evidenced origins as optional maintenance;
   it never displaces ready work. Actual authority drift blocks affected goals only.
7. If no ready goal issues exist and there is no active handoff, blocker, or failing verification, recommend `/sc-geniusloop`.
8. Recommend one exact route from `/sc-init`, `/sc-status`, `/sc-hints`, `/sc-geniusloop`,
   `/sc-explore`, `/sc-research`, `/sc-prd`, `/sc-plan`, `/sc-eval`, `/sc-go`,
   `/sc-work`, `/sc-debug`, `/sc-review`, `/sc-audit`, `/sc-compound`,
   `/sc-evolve`, `/sc-pause`, `/sc-launch`, or `/sc-ui`.
9. State the delivery tier the route implies (`skills/agentic-delivery/references/workflow-integration.md`):
   `light` goes directly to `/sc-work` or `/sc-debug`; `full` goes to
   `/sc-explore`, `/sc-prd`, or `/sc-plan` by the artifacts that already exist.

## Output

- Short dashboard.
- Recommended next action.

Standalone status stays read-only. Within active authorized delivery, return
the route internally to its owner and continue there after checking authority;
do not finish with only a command for the user to retype.

Read-only: memory-maintenance.mjs resume reports checkpoint/contract drift; owning routes reconcile missing checkpoints and affected goals, never write memory here.

Report active constraint provenance, pending completion receipts, and check
effectiveness from resume/report. Route unfinished maintenance to its owner;
status does not acknowledge receipts or flush writes.
