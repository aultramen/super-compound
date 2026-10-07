# Workflow Dispatch

## Summary

Route user intent through existing compact contracts and preserve each owner's authority.

Use `.agent/context/workflows/<name>.contract.md` before the full workflow file.

Commands: `sc-init`, `sc-status`, `sc-hints`, `sc-geniusloop`, `sc-explore`, `sc-research`, `sc-prd`, `sc-plan`, `sc-eval`, `sc-go`, `sc-work`, `sc-debug`, `sc-review`, `sc-audit`, `sc-compound`, `sc-evolve`, `sc-pause`, `sc-launch`, `sc-ui`.

Full workflow files are authority for detailed execution or edits.

## User intents

Conceptual labels, not commands or runtime enums; use existing tiers/contracts.

| Intent | Existing owner and boundary |
|---|---|
| Start/change work | Existing owner/tier; document-only stops at its artifact/validation. |
| Continue/check status | `/sc-status` inspects; work owner resumes authorized work. Status-only stays read-only. |
| Consult | `/sc-hints` read-only; accepting advice does not authorize execution. |

Prerequisites return to their owner within scope; tiers never expand write
authority. Discover facts; report the active stage's result.

Before human input, blocker reports or owner handoffs, load
`.agent/context/checkpoint.contract.md`. It applies within existing stage and
route authority; standalone read-only requests never authorize remediation.
Prioritize a concise actionable checkpoint; retain all ready/unresolved IDs and
pending dependencies in an expandable complete list. Show material blocked scopes,
recommendations and automatic continuation; detailed review paths and bulk reply
guidance appear when needed. A satisfied goal ends with delivery, not new ideation.
