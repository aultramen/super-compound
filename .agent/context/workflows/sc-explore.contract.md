# /sc-explore Runtime Contract

Purpose: resolve fuzzy intent into BRD-ready business context. The BRD is the
only durable output; prototype code stays throwaway under `.scratch/prototypes/`
and is never a production seed.

knowledge-search.mjs "<scope>" first; Accepted decisions bind through authority; observed lessons are advisory.
For unresolved decisions, use brainstorming/references/questions-and-options.md:
ask small batches of consequential decisions with settled prerequisites plus
recommendation/reason/trade-off. Discover facts first; investigate pending facts
while asking independent decisions. Wait for answers; partial answers stay open,
recommendations are not approval, corrections reopen affected descendants.
Skip grilling concrete scope; capture in the owning BRD/PRD/FSD, no extra gate.
Load user request, nearby context, prior brainstorms, and accepted ADRs only if
relevant. Use the BRD skeleton; record objectives, scope, non-goals, rules,
acceptance, and `OPEN-*`. A prototype is throwaway/non-production and must stay
isolated under `.scratch/prototypes/`. Route a blocking named fact through
`OPEN-RESEARCH-*` and `/sc-research`, then return; research never decides policy.
Each prototype answers one decision, records evidence, and ends `discard`,
`revise`, or `promote decision`; `HIGH_INTERACTION` runtime evidence may be
interactive, and must be runnable for timing, runtime responsive,
keyboard/focus, realtime, or offline risk. Accepted decisions move into BRD/PRD/FSD.
Its supporting locator is an external URL plus revision or repository-relative
throwaway path plus digest, with decision question, reviewer, date, and
disposition. UI evidence returns to `/sc-ui`; it is never authority.
Exploration may remain a chat draft, but before approval and `/sc-prd` it must
be saved at `docs/brd/brd-<feature>.md`. Use brainstorming and domain modeling
advisory read-only modes unless a separate sidecar mutation is explicitly owned.
Checkpoint automatically and continue; /sc-pause is only for actual stops.

Stage approvals and execution authority: agentic-delivery/references/workflow-integration.md.

Stage mode: approve BRD before PRD authoring.
