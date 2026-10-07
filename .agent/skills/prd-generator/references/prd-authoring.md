# PRD Authoring

## Summary

Author one canonical PRD from approved business authority, keeping observable
behavior, acceptance and applicable risk coverage in the same reviewer artifact.

## Gather evidence

Read the approved `docs/brd/` artifact, relevant `docs/brainstorms/`, existing `docs/prd/`, and current conversation. Search `docs/progress.md`, `docs/STATE.md`, accepted ADRs or solution records, and domain notes when present. For UI work, reuse `interface-design` findings and the existing design system.

Use `domain-modeling` when actors, roles, or glossary terms are ambiguous. Use `codebase-design` only when public seams or module boundaries must be understood for testable product requirements.

For unresolved human/external decisions use the prioritized frontier in
`brainstorming/references/questions-and-options.md`; preserve approved business
decisions and route material changes upstream. Reuse the canonical PRD for the
same clear scope. If asked to synthesize known context, draft it and place
remaining uncertainty under Open Questions without interviewing settled scope.

## Required coverage

A full agentic PRD covers metadata, source IDs, approver, problem, objective, outcome, metric, scope, non-goals, actors, permission intent, canonical rules, state semantics, features, requirements, acceptance criteria, failure/degraded behavior, security, privacy, compliance, AI, dependencies, risks, UAT, release gate, traceability, and FSD handoff.

Start from `.agent/templates/agentic-delivery/skeletons/PRD-Skeleton.md` for every
profile; do not introduce an alternate compact shape. Its Summary serves the
product reviewer; Product Contract covers users/permissions, main flow, FR/AC,
failure/recovery and UAT. Keep metadata, UI gates, qualified refs and handoff.
Apply [shared applicability and expansion](../../agentic-delivery/references/templates-and-outputs.md#applicability-and-expansion)
instead of filling every reference-library section with N/A. Upstream refs may
supply approved business rationale/rules without duplicating those decisions.
Testing decisions name the highest practical public behavior or seam; they do
not prescribe internal design. PRD-only scope ends after the requested artifact
and applicable validation; missing BRD authority is reported, not permission to
author other stages or implement code.

For product AI runtime, load [AI context and output](ai-context-and-output.md) for selected-context product decisions and acceptance.
