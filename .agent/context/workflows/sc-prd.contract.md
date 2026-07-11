# /sc-prd Runtime Contract

Purpose: convert an approved BRD into observable product requirements.

Load approved BRD refs, exploration notes, advisory research notes, and PRD skeleton. Define users, scope, behavior, acceptance, edge cases, product security/privacy/compliance, and `OPEN-*` blockers. A factual blocker becomes `OPEN-RESEARCH-*`; run targeted research and return, or return to `/sc-explore` if business authority must change. Do not invent implementation internals.
Requirements may remain a chat draft while shaping, but before approval and
`/sc-plan` they must be saved at `docs/prd/prd-<feature>.md`. Domain modeling is
advisory read-only unless a separate glossary mutation has an explicit owner.
