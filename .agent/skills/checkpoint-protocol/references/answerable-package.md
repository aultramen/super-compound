# Human Input Runtime Contract

## Summary

Use this contract for human input, blocker reporting, and authorized handoffs.
It is the shared presentation/resumption contract, not a new approval authority.
Risk and stage policy remain in `../../agentic-delivery/references/workflow-integration.md`.

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
  checkpoint; keep stage/authority boundaries separate. Show all ready questions
  and approvals for the active work together, grouped by owner/stage. Do not
  collect unrelated backlog needs or ask a chain depending on unseen answers.

## Answerable package

Render in the user's language; these Indonesian labels illustrate the format.
Lead with the concrete need. Number every ready item with a stable `Q<n>` ID,
mapped to its existing `OPEN-*` need or approval target; do not renumber unresolved
items on partial replies. Show dependent items as pending with their prerequisite
ID, owner and next action, not as answerable questions. No arbitrary question cap.
Keep digests and raw gate output in supporting detail. No empty placeholders.

Use this per-item format for decisions, information, tests, access and approvals:

```text
PERLU INPUT ANDA — [concrete title]
Siap dijawab: [count; grouped by owner/stage when needed]
Q1 — [self-contained question and explicit acceptance/action boundary]
Yang masih diperlukan:
[specific unresolved need, affected deliverable, owner and existing need/target]
Mengapa perlu Anda:
[why agent research/automation cannot resolve it; exact policy link/quote if required]
Rekomendasi:
[concrete suggested choice or action and required answer/report format]
Alasan dan konsekuensi:
[evidence supporting recommendation; consequences of it and meaningful alternatives]
Bahan review:
[clickable full absolute file path, relevant section and what to inspect; example]
Setelah jawaban Anda:
[concrete automatic resumption and blockers that remain]
Ulangi format untuk semua item siap dijawab.
Tertunda: [ID, prerequisite ID/need, owner and next action; omit when none]
```

Resolve review paths against the current workspace and verify files/sections
exist before displaying them. Show the complete absolute path as the clickable
label and target, for example:

```text
[/project/docs/prd.md](/project/docs/prd.md)
Section: Acceptance; inspect the changed behavior
```

Windows targets use drive-qualified absolute paths, such as
`D:/project/docs/prd.md`. For spaces use
`angle brackets around the link target`; on POSIX use `/...`.
These are syntax examples, not existing review files. Keep stored document refs
repository-relative and portable. If a planned document does not exist, prepare
authorized review material or link available evidence and name the gap; never
invent a file, section or approval-ready target. External previews may supplement
the available local material with a direct URL and revision.

Every item has a concrete recommendation. Information requests recommend the
fields/example to supply; tests recommend setup, steps and result format; access
requests recommend the approved local destination and readiness report. Agreement
with that action is not the missing information, test result or access readiness.

If a host dialog limits the number of questions, show the complete ready list,
pending dependencies and answer examples in conversation text first; use dialogs
only as an input aid with the same IDs. Do not silently hide or defer ready items.

Always include both reply examples, localized to the user's language, after the
list whenever asking for an answer or approval (substitute an actual listed ID
for Q2; for a single item use Q1):

```text
Saya setuju semua rekomendasi pada daftar di atas.
Saya setuju semua rekomendasi kecuali Q2: [jawaban khusus untuk Q2].
```

Explain that an exception without a replacement answer stays open; partial
answers are welcome. Approval covers only each displayed target, revision and
stage, not pending items or future stages. Render those boundaries per approval.

Add completed evidence, retained approvals, 2–3 answer choices, and work
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
Apply [resolution and resumption](resolution.md)
for bulk agreement, exceptions, partial answers, unknown IDs and corrections.
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
