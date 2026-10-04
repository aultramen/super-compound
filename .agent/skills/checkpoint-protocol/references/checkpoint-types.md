# Checkpoint Types

## Summary

Choose an existing type only for input the agent cannot resolve. All types use
the single [answerable package](../../../context/checkpoint.contract.md#answerable-package),
not separate ad-hoc formats or a new schema.

## Trigger routing

| Remaining need after research/available checks | Type | User-facing kind |
| --- | --- | --- |
| Unavailable business fact held by a person | `needs_info` | keputusan |
| Outcome-changing choice among valid approaches | `needs_decision` | keputusan |
| Action outside existing authorization | `needs_confirmation` | izin tindakan |
| Verification possible only in a specific user environment | `needs_testing` | pengujian |
| Missing service access or credential readiness | `needs_credentials` | akses |
| External deployment/restart/configuration agent cannot perform | `needs_deployment_action` | akses |
| Required human acceptance/judgment with reviewable evidence | `needs_review` | review |

Agent-owned research and automated tests are work, not user checkpoints.
Routine naming, test data, imports, equivalent reversible designs and file
placement follow conventions without approval. `needs_confirmation` checks
operation, target, scope and material risk against persistent authorization;
do not re-request an unchanged authorized action.

## Type-specific material

- Decision: meaningful choices, recommendation/reason/trade-off, exact delta
  if an accepted decision must change. Retain unrelated accepted decisions.
- Action: exact target, effects, reversibility/recovery and explicit scoped answer.
- Review: assessed experience, representative example, walkthrough and linked
  sections, acceptance question. Prototype acceptance is not integration or UAT.
- Manual test: setup, numbered steps, expected result, actual-result reporting
  format and why agent automation cannot exercise the environment.
- Access/external action: bounded instructions, approved local destination and
  what resumes. Never ask for secrets in chat.

Batch same-owner/scope independent needs; separate required stage approvals.
Keep technical IDs/gate diagnostics below the self-contained human summary.
