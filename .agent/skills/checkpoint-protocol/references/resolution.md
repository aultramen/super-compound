# Resolution and Resumption

## Summary

Reconcile only the need actually answered, retain approvals and unresolved
evidence, then resume through the authorized owner from the last position.

After receiving the response:

1. Acknowledge the supplied information, choice, confirmation, result, credential readiness, action, or review outcome.
2. Match the answer to the named target/scope/revision and need. A clear answer
   to one explicit question resolves that need only. Ambiguous "oke", silence,
   timeout and preselected choices never authorize other stages or actions.
3. Reconcile through the owning PRD/FSD/work route and existing STATE writer
   (`state-management`). Remove only resolved subneeds; retain technical failures,
   access gaps and mandatory tests. Link durable decisions to authoritative
   acceptance/authorization provenance; update position and next action.
4. Report what just resolved, what remains with each owner and next action,
   blocked scope and independent authorized work. Do not re-ask a settled decision
   because evidence is still missing.
5. Resume from the exact position before the checkpoint. Reuse evidence with
   valid identity; do not repeat completed research, review or approval without
   an invalidating change. Perform authorized owner handoffs internally.
6. If another input remains, use the same runtime package for only its unresolved
   part; continue independent safe work. A partial response need not freeze the
   rest of the authorized work.

For denied confirmation, failed manual testing, rejected review, or incomplete deployment, preserve evidence and route back to planning, debugging, or gap closure. Never treat silence, ambiguity, or partial execution as approval.

## Bulk, exceptions and partial answers

Use the latest displayed question batch for the active work, with stable `Q<n>` IDs
mapped to existing `OPEN-*` needs or named approval targets. Preserve the list's
target, revision, stage and recommendation in its owning artifact/STATE refs;
do not create a separate decision ledger. Resolve explicit intent in the user's
language, not a magic phrase parser. These Indonesian replies illustrate it:

| Reply | Resolution |
| --- | --- |
| `Setuju semua rekomendasi` | Accept recommendations for the displayed batch only, within each displayed scope; undisplayed and pending items are excluded. |
| `Setuju semua kecuali Q2: gunakan tabel` | Accept other displayed recommendations and apply the supplied answer to Q2. |
| `Setuju semua kecuali Q2` | Accept other displayed recommendations; leave Q2 open without inferring an alternative. |
| `Q1: ya; Q3: opsi B` | Resolve only Q1 and Q3; keep every unanswered ID open. |
| Unknown ID or conflicting answers | Clarify only the ambiguous portion; retain clear independent answers. Do not guess the intended ID or select between contradictory answers. |

An unknown exception ID makes the bulk scope ambiguous: do not approve a potentially
excluded item until clarified. Separate explicit answers unaffected by that
ambiguity may still resolve. If the list/target/revision changed before a reply,
reconcile what the reply actually refers to; ask only about the stale/unclear delta.
Never carry blanket agreement to a future list, future revision or later stage.

Bulk agreement accepts an information/test/access recommendation as an intended
action only. It does not supply absent business facts, create test evidence,
remove failed checks, or assert credentials/access are ready. Retain those
subneeds until the requested report or verifiable evidence arrives. Approval of
prototype experience, real-provider qualification, release/UAT and execution
authorization remains separate by displayed target, revision and stage.

When an answer is corrected, reopen only affected descendants and invalidated
approval scope. Explain the dependency and next action, keep independent answers
settled, and recompute the prioritized batch and complete ready/pending registry
without renumbering unresolved IDs. Surface all material blocked scope; retain
undisplayed needs and continue independent authorized work.
Route changed material decisions through their owning artifact's existing gate.
