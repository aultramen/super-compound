# /sc-explore Runtime Contract

Purpose: resolve fuzzy intent into BRD-ready business context.

Load user request, nearby context, prior brainstorms, and accepted ADRs only if
relevant. Use the BRD skeleton; record objectives, scope, non-goals, rules,
acceptance, and `OPEN-*`. A prototype is throwaway/non-production and must be
isolated from implementation. Route a blocking named fact through
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
