# /sc-explore Runtime Contract

Purpose: resolve fuzzy intent into BRD-ready business context.

Load user request, nearby context, prior brainstorms, and accepted ADRs only if
relevant. Use the BRD skeleton; record objectives, scope, non-goals, rules,
acceptance, and `OPEN-*`. A prototype is throwaway/non-production and must be
isolated from implementation. Route a blocking named fact through
`OPEN-RESEARCH-*` and `/sc-research`, then return; research never decides policy.
Exploration may remain a chat draft, but before approval and `/sc-prd` it must
be saved at `docs/brd/brd-<feature>.md`. Use brainstorming and domain modeling
advisory read-only modes unless a separate sidecar mutation is explicitly owned.
