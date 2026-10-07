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
- Collect independent needs with the same owner/scope in one coordinated
  checkpoint; preserve opted-in stage/authority boundaries. Resolve agent-owned
  checks and authorized reversible choices without asking. Prioritize the
  highest-priority human/external needs that unlock the current goal; do not
  collect unrelated backlog needs or ask a chain depending on unseen answers.

## Answerable package

Render in the user's language; these Indonesian labels illustrate the format.
Lead with the blocked result and, by default, at most three highest-priority
actionable human/external questions. This is a progressive display, not an
approval limit: expand when the user requests the full list or a decision must
be assessed together. Keep the complete ready/pending unresolved inventory in
the existing owning artifact or STATE when writes are authorized; for read-only
scope keep it in expandable conversation detail without creating a sidecar.
Assign every item a stable `Q<n>` ID mapped to its existing `OPEN-*` need or
approval target; do not renumber unresolved items on partial replies. Always
summarize every material block and retained unresolved ID, with an openable
inventory link or expandable detail. Show dependent items as pending with their
prerequisite ID, owner and next action, not as answerable questions. Keep digests
and raw gate output in supporting detail. No empty placeholders.

Use this per-item format for decisions, information, tests, access and approvals:

```text
PERLU INPUT ANDA — [blocked result; affected owner/scope]
Q1 — [self-contained question and explicit acceptance/action boundary]
Rekomendasi: [choice/action and required answer/report format]
Mengapa perlu Anda; alasan dan konsekuensi: [why automation cannot resolve it; key trade-off]
Bahan review: [verified clickable absolute path and relevant section]
Setelah jawaban Anda: [automatic resumption; remaining blockers]
Belum selesai: [all unresolved IDs/material blocks; ready or pending; inventory link/detail]
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

If a host dialog limits questions, use it for the current prioritized batch
with the same IDs. Keep the complete ready/pending registry accessible in
conversation detail or its authorized existing artifact; never silently drop
items or count undisplayed recommendations as accepted.

For multiple independent displayed recommendations, provide compact bulk and
exception reply examples when they help (substitute an actual displayed ID
for Q2). A single question needs only its specific answer format:

```text
Saya setuju semua rekomendasi pada daftar di atas.
Saya setuju semua rekomendasi kecuali Q2: [jawaban khusus untuk Q2].
```

Explain that an exception without a replacement answer stays open; partial
answers are welcome. Approval covers only each displayed target, revision and
stage, not undisplayed or pending items or future stages. Render those boundaries
per approval; stored inventory is not blanket approval.

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

### Concrete short example

Illustrative authoring review only, not an active approval. This example has one
ready item and no dependent item; a real package prioritizes current questions
and retains the complete ready/pending inventory under the existing contract. The source
below exists in this repository; resolve paths from the actual workspace at runtime.

```text
PERLU INPUT ANDA — Isi ringkasan PRD
Siap dijawab: 1, owner reviewer produk, stage authoring PRD.
Q1 — Apakah ringkasan menampilkan pengguna, scope, hasil, risiko dan keputusan yang diminta?
Mengapa perlu Anda: Penerimaan penyajian untuk reviewer produk belum diberikan.
Rekomendasi: Ya; metadata dan bukti tetap di bagian existing pada dokumen yang sama.
Alasan dan konsekuensi: Reviewer menemukan keputusan lebih cepat; semua detail wajib tetap tersedia. Kecepatan review belum diukur.
Bahan review: [../../agentic-delivery/references/templates-and-outputs.md](../../agentic-delivery/references/templates-and-outputs.md)
Bagian: Applicability and Expansion; periksa isi wajib dan risiko yang tidak boleh disembunyikan.
Target: proposal penyajian PRD dalam contoh ini, revisi r1, stage authoring; bukan FSD atau execution.
Setelah jawaban Anda: Owner melanjutkan authoring PRD yang authorized; approval tidak menciptakan hasil tes atau izin tahap berikutnya.
Jawab Q1: ya, atau sebutkan bagian yang perlu diperbaiki.
```

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
the caller after evidence reconciliation. Name receiving scope only when it changes;
load its contract and check its authority before acting. `/sc-ui`, review, research
and status stay read-only; PRD/FSD/pointer writes use their owning routes, product
code uses authorized `/sc-work`. Standalone read-only requests return findings;
they do not authorize remediation. Never end with only "run /sc-X" when that
step is already authorized. Continue independent ready work while waiting;
never offer "continue anyway" across a mandatory gate.
