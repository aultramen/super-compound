# Human Input Runtime Contract

## Summary

Use this contract for human input, blocker reporting, and authorized handoffs.
It is the shared presentation/resumption contract, not a new approval authority.
Risk and stage policy remain in `skills/agentic-delivery/references/workflow-integration.md`.

## Before interrupting

- Inspect existing authorization and acceptance: authoritative target, scope,
  revision, operation, material risk and provenance. Evidence/index/pointer/docs
  updates and workflow transitions do not reopen unchanged approved decisions.
- Preserve configured BRD, PRD, FSD and execution checkpoints separately. For
  reapproval, name the concrete delta, why prior approval excludes it, and what
  remains approved; ask only for that delta.
- Split a mixed blocker into existing document/STATE needs: human decision or
  acceptance; action authorization; agent research; agent-runnable test;
  environment-only manual test; external access/action. Name owner, affected
  goal, evidence and next action for each. Approval resolves only its named
  decision/action; missing technical proof stays unresolved.
- Research facts and run available checks first. `OPEN`, `DRAFT`, `human baseline`
  or `HIGH_INTERACTION` alone never creates a human gate. Preserve mandatory
  security, accessibility, contract and integrity checks; preference cannot waive them.
- Batch independent inputs with the same owner/scope into one coordinated
  checkpoint; keep stage/authority boundaries separate. Ask one answerable
  question about that package, not a chain depending on unseen prior answers.

## Answerable package

Render in the user's language; these Indonesian labels illustrate the format.
Lead with the concrete need. For a simple decision, use the six fields below.
Keep IDs, digests and raw gate output in supporting detail. No empty placeholders.

```text
PERLU INPUT ANDA — [concrete title]
Yang masih diperlukan:
[specific unresolved need and affected deliverable, not just OPEN-* or DRAFT]
Mengapa perlu Anda:
[why agent research/automation cannot resolve it; exact policy link/quote if required]
Rekomendasi:
[suggested choice, short reason and principal trade-off]
Bahan review:
[direct file/section/preview links and what to inspect; representative example]
Pertanyaan:
[one self-contained question, explicit acceptance/action boundary]
Setelah jawaban Anda:
[concrete automatic resumption and blockers that remain]
```

Add completed evidence, retained approvals, owner, 2–3 answer choices, and work
while waiting only when they help assess this need. Complex packages retain all
relevant scope, authority and evidence in supporting detail; this shorter display
does not change parser fields, approval boundaries, or mandatory review material.

Product review names the experience assessed, shows an example result, links a
walkthrough, and asks specific acceptance. Distinguish prototype experience,
qualification/real-provider first slice, and release/UAT; none substitutes for another.
Manual testing supplies setup, short steps, expected result, and reporting format
(`scenario; environment; actual result; error/evidence`), plus why available
automation cannot exercise that environment. Agent-runnable checks stay with agent.
Access requests name an approved local secret destination; never paste secrets in chat.

## Response and continuation

Silence, timeout, preselection and ambiguous "oke" are not blanket approval.
An unambiguous answer to one explicitly scoped question resolves that need only.
Reconcile the response with existing authority and evidence, retain partial progress,
and report newly resolved/remaining needs, each owner/next action, blocked scope and
scope that can run. Persist through the existing STATE writer, not a new ledger.
Resume at the last position; reuse valid evidence and do not repeat completed review
or approval without an invalidating delta.

Within active authorized work, perform owner handoffs internally and return to
the caller after evidence reconciliation. Announce receiving route and scope;
load its contract and check its authority before acting. `/sc-ui`, review, research
and status stay read-only; PRD/FSD/pointer writes use their owning routes, product
code uses authorized `/sc-work`. Standalone read-only requests return findings;
they do not authorize remediation. Never end with only "run /sc-X" when that
step is already authorized. Continue independent ready work while waiting;
never offer "continue anyway" across a mandatory gate.
