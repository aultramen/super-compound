# /sc-prd Runtime Contract

Purpose: convert an approved BRD into observable product requirements.

knowledge-search.mjs "<scope>" first; ERR-*/LRN-* hits bind.
Load approved BRD refs, exploration notes, advisory research notes, and PRD skeleton. Define users, scope, behavior, acceptance, edge cases, product security/privacy/compliance, and `OPEN-*` blockers. A factual blocker becomes `OPEN-RESEARCH-*`; run targeted research and return, or return to `/sc-explore` if business authority must change. Do not invent implementation internals.
Requirements may remain a chat draft while shaping, but before approval and
`/sc-plan` they must be saved at `docs/prd/prd-<feature>.md`. Domain modeling is
advisory read-only unless a separate glossary mutation has an explicit owner.

Set `ui_delivery_profile` as `NOT_APPLICABLE | STANDARD | HIGH_INTERACTION` and
`experience_baseline_status` as `DRAFT | VALIDATED | EXCEPTION_APPROVED` (or
`NOT_APPLICABLE` for non-UI). Route every UI-bearing draft through `/sc-ui`
before approval. `HIGH_INTERACTION` requires interactive evidence; all states
need coverage or `N/A - reason + approver`. Runnable evidence is
mandatory for timing, runtime responsive, keyboard/focus, realtime, or offline
risk. A UI-bearing `DRAFT` returns to `/sc-ui`; an exception permits only the
first slice, never scale-out. Only an approved baseline routes to `/sc-plan`.
If work remains, end with /sc-pause.
