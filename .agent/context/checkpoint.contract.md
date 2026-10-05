# Human Input Runtime Contract

## Summary

Load only when human input, a blocker, response reconciliation or an authorized
handoff occurs. This is presentation/resumption guidance, not approval authority.
Risk and stage authority: `skills/agentic-delivery/references/workflow-integration.md`.

## Before interrupting

Research discoverable facts and run available checks first. Check existing
authorization against operation, target, scope, revision, material risk and
provenance; unchanged semantic approval persists through evidence-only updates.
Preserve BRD, PRD, FSD and execution gates separately. Reapproval names only the
concrete delta and retained approvals. OPEN/DRAFT/HIGH_INTERACTION alone adds no gate.
Split mixed blockers into human decision/acceptance, action authorization,
agent research/test, environment-only testing and external access/action under
existing artifacts/STATE, each with owner, affected scope, evidence and next action.
Approval resolves its named decision/action, never missing technical proof.
Preserve mandatory security, accessibility, contract and integrity checks.

## Answerable package

For a simple need use a short item: stable Q<n> ID mapped to the existing need,
concrete question and why human input is required, recommendation with evidence
and consequence, review material, explicit approval target/revision/stage when
applicable, and the automatic resume step with remaining blockers. No empty fields.
Show all ready active-work items together, grouped by owner/scope/stage; show
dependent items as pending with prerequisite ID, owner and next action. No arbitrary cap.
Use full absolute clickable review paths; verify files/sections exist. Keep stored
refs repository-relative. A host dialog is an input aid; present the complete
ready list and pending dependencies first when its limits cannot fit that list.

Include both reply examples, localized and using an actual listed ID:

```text
Saya setuju semua rekomendasi pada daftar di atas.
Saya setuju semua rekomendasi kecuali Q1: [jawaban khusus untuk Q1].
```

An exception without a replacement stays open. Partial answers are welcome;
approval covers displayed targets/revisions/stages only, never pending or future work.
Silence, elapsed time, preselection or ambiguous agreement never grants approval.

For complex/mixed needs, product acceptance, manual tests, credentials or missing
review material, load [detailed package](../skills/checkpoint-protocol/references/answerable-package.md#answerable-package).
It supplies per-need presentation detail without changing these boundaries.

## Response and continuation

On replies load [resolution](../skills/checkpoint-protocol/references/resolution.md)
for bulk agreement, exceptions, partial answers, unknown IDs and corrections.
Retain resolved evidence and approvals; persist through the existing STATE writer.
Resume at the last position, skip verified goals and reuse valid fingerprinted
evidence. Continue independent authorized work while waiting.

Within active authorized work, announce receiving route/scope, load its contract,
check authority and hand off internally. UI/review/research/status stay read-only;
artifact writes use their owner and product code uses authorized sc-work.
A standalone read-only request returns findings without remediation authority.
Never require another command merely to transfer already-authorized work.
