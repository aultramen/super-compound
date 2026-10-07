# Route Selection

## Evidence before route

Frame the named obstacle. Search relevant knowledge and inspect only the source
needed to resolve it, including artifact revision/approval where material.
Label a user-reported approval as reported until inspected; do not fabricate
approval dates, failing commands or file contents. A narrow search miss is not
proof of absence. If evidence remains insufficient, describe what to inspect
next, by whom, and what result would change the recommendation.

## Owner map

| Need | Owner and boundary |
|---|---|
| Focused advice on an obstacle or next step | `/sc-hints`; answer in chat |
| Project position, state reconciliation, resume | `/sc-status`; read-only orientation |
| Broad improvement inventory | `/sc-geniusloop`; Brain filtering and its owned report |
| Business scope or unresolved value/policy | `/sc-explore`; BRD and optional prototype |
| Approved BRD, product requirements missing | `/sc-prd`; PRD |
| Approved PRD, FSD/technical decision/GOAL readiness missing | `/sc-plan`; FSD/GOAL |
| Facts insufficient, stale or contradictory | `/sc-research`; advisory evidence |
| Concrete failure requested for diagnosis/fix | `/sc-debug`; reproduce and verify |
| Change requested for review | `/sc-review`; findings |
| Small concrete change or approved ready goal requested for execution | `/sc-work`; tests and implementation |
| Git action requested | `/sc-go`; existing preview/authorization policy |

## Tier and authority

Apply `agentic-delivery/references/workflow-integration.md` from the skills root,
not a new tier rubric. A light change needs a proportional step, not compulsory
BRD/PRD/FSD creation. Full scope follows approved BRD -> PRD -> FSD -> GOAL:
route to the first missing authoritative stage and preserve configured authority
under the exception or opted-in stage policy. Hints remains advisory: accepting
advice is distinct from an execution request. A blocking
technical proof stays unresolved after a business approval.

If advice conflicts with approved FSD, identify the conflicting section and
consequence. Offer a conforming option or route the material delta to `/sc-plan`
(business/product changes to their owners first). Do not rewrite the contract
or treat urgency, sunk cost or a senior's preference as permission to skip it.

## Guidance to execution

Agreement alone leaves the consultation read-only. “Laksanakan rekomendasi itu”
selects the owner; reuse authorization already provided for that scope and
revision, and inspect remaining gates. Avoid asking for permission twice.
Handoff does not authorize a branch, migration, release or implementation.
Continue independent authorized work when only dependent items are blocked.

Context management uses the existing context-engineering skill. Advice about
handoff can explain `/sc-pause` and `/sc-status`, but consultation itself must
not write a handoff. Delegate only when the active owner and host permit it.
