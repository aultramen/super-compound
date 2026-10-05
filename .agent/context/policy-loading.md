# Conditional Policy Loading

## Summary

Request -> route/tier -> core contract -> active authority -> affected code/tests
-> evidence -> concise result. Apply mandatory checks from the contract; load
only the section needed for the current event. Resident unchanged instructions
remain active. This routing does not add or waive authorization.

| Event | Source to load |
| --- | --- |
| Intake: classify light/full and T1-T5 | `skills/agentic-delivery/references/workflow-integration.md#delivery-tier-at-intake` only when classification is unresolved |
| Material action or changed authority | Same source, risk/authorization and stage sections |
| Human need or reply | `context/checkpoint.contract.md`; detailed package only for complex needs |
| Branch/worktree/commit/push/PR | `context/skills/git-workflow-operation.contract.md`, then uncovered detail through `/sc-go` |
| UI or external integration | Active route's topology/first-slice gates; relevant `integration-checking` or `interface-design` detail |
| Authorized delegation | `subagent-orchestration` or `parallel-execution` procedure; never infer dispatch authority from this table |
| Repeated failure/stagnation | `workflow-integration.md#recovery-and-progress`; reassess rather than repeating identical reads/checks |
| Completion or evidence reuse | `workflow-integration.md#evidence-identity`; covered verification checks in active contract |
| Compaction/resume/corrected instructions | `context-engineering/references/active-context.md`; next goal and affected drift only |

Resolve source paths under `.agent/`; the shared source above lives under
`skills/agentic-delivery/references/`. Conflict, missing check, material risk or
editing a procedure requires its source. Full workflow/skill names in a contract
are authority references, not an instruction to preload all procedures.
