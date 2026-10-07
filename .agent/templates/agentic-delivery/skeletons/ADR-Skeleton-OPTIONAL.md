# ADR-{{NNNN}} - {{TITLE}}

## Summary

<State the one material architecture decision, why it is needed, its main consequence and the decision requested at this revision.>

<!-- Apply .agent/context/output-style.md. For systems, workflows, integrations or architecture, add a relevant Mermaid HLD without renumbering protected sections. Status-only records need no decorative diagram. -->

Use ADR only for cross-system, high-risk, costly-to-reverse, security/privacy-sensitive, vendor-locking, platform-level, or policy-required decisions.
One decision per ADR; apply [authoring applicability](../../../skills/agentic-delivery/references/templates-and-outputs.md#applicability-and-expansion).

## Metadata

Status: PROPOSED / ACCEPTED / SUPERSEDED  
Version / date: {{ADR_VERSION_DATE}}
Owner / approver: {{NAME_OR_ROLE}}
Linked FSD: FSD-{{PROJECT}}#{{IDS}}

## Decision Contract

- Context, constraints and why a local FSD TDEC is insufficient.
- Viable options and their relevant advantages/risks; never invent alternatives.
- Selected option with rationale, consequences, accepted trade-offs, and prohibited patterns.
- Implementation obligations translated into qualified FSD/GOAL/TEST refs.
- Accepted consequences, fitness functions/evidence and factual revisit triggers.

Only `ACCEPTED` ADRs may govern implementation.
Approval provenance is retained by the existing mechanism; the summary never
turns PROPOSED into ACCEPTED or makes ADR a mandatory phase after FSD.
