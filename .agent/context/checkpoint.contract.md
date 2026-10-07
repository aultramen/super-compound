# Human Input Runtime Contract

## Summary

Load only when human input, a blocker, response reconciliation or an authorized
handoff occurs. This is presentation/resumption guidance, not approval authority.
Risk and stage authority: `skills/agentic-delivery/references/workflow-integration.md`.

## Before interrupting

Research discoverable facts and run available checks first. Check existing
authorization against operation, target, scope, revision, material risk and
provenance; unchanged semantic approval persists through evidence-only updates.
Preserve separately configured stage gates; exception mode adds no artifact
approval ceremony. Reapproval names only the
concrete delta and retained approvals. OPEN/DRAFT/HIGH_INTERACTION alone adds no gate.
Split mixed blockers into human decision/acceptance, action authorization,
agent research/test, environment-only testing and external access/action under
existing artifacts/STATE, each with owner, affected scope, evidence and next action.
Approval resolves its named decision/action, never missing technical proof.
Preserve mandatory security, accessibility, contract and integrity checks.

## Answerable package

Prioritize human/external needs blocking the current goal. Use stable Q<n> IDs,
a concise question, why input is necessary, recommendation/consequence, and
automatic resume. Default to at most three actionable questions per batch;
summarize all material blocked scopes and remaining unresolved IDs without
discarding them. Agent-researchable facts and authorized reversible choices
remain agent work. Retain unanswered IDs; partial replies never reset the list.

Show all ready items and pending dependencies in an expandable complete list or
on demand, grouped by owner/scope/stage. Include each pending prerequisite and
next action; never hide a material blocker or imply it is approved. Details use
full absolute clickable review paths and explicit approval target/revision when
applicable; verify files/sections exist. Keep stored refs repository-relative.
A host dialog is an input aid, not a cap on the retained needs registry.

For a multi-item approval package, include both reply examples with actual IDs;
for a single simple question, show only the necessary reply guidance:

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

Within active authorized work, load a receiving contract only for a real owner change;
announce a material phase change once, not each routine internal handoff,
check authority and hand off internally. UI/review/research/status stay read-only;
artifact writes use their owner and product code uses authorized sc-work.
A standalone read-only request returns findings without remediation authority.
Never require another command merely to transfer already-authorized work.
