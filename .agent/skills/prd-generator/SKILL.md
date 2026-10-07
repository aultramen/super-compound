---
name: prd-generator
description: "Use when an approved BRD must be translated into observable product requirements before FSD planning."
---

# PRD Generator

## Summary

Apply this procedure within its authorized scope and use `.agent/context/output-style.md` for every documentation file created or updated: summary first, relevant HLD, preserved evidence and parser fields.

Define users, observable product behavior, rules, acceptance criteria, and outcomes between BRD exploration and technical FSD planning.

## When to Use

Use for full-tier scope after business authority exists and before `/sc-plan`.
If required business authority is missing, return upstream. When an existing
PRD covers the same clear scope, revise the canonical PRD and preserve its IDs
and provenance without asking a revise-or-create question. Create a separate
document only for a distinct requested scope; ask only when that boundary is
materially ambiguous and context cannot resolve it.

Bounded draft packages: [approval policy](../agentic-delivery/references/workflow-integration.md).

## Route

- For evidence collection, clarifying questions, required sections, and the compact shape, load [PRD authoring](references/prd-authoring.md).
- For story sizing, validation, storage, and downstream routing, load [validation and handoff](references/validation-and-handoff.md).
- Load the validation branch only after a draft exists.
- For product AI runtime, load [AI context and output](references/ai-context-and-output.md).

## Invariants

- Save durable output to `docs/prd/prd-<feature-name>.md`; author from
  `.agent/templates/agentic-delivery/skeletons/PRD-Skeleton.md`, then load only
  a specific section on demand from the full PRD reference library.
- Trace requirements with qualified references such as `BRD-CCC#BREQ-001`; do not duplicate source prose when an ID is sufficient.
- Preserve BRD business policy, scope, acceptance decisions, and domain language. The PRD must not invent technical implementation, schemas, databases, or internal architecture beyond known repository constraints.
- Every goal maps to at least one story or requirement; every story has specific, verifiable acceptance criteria and negative cases where risk warrants them.
- UI-bearing PRDs set `ui_delivery_profile`, cover every named state or
  `N/A - factual reason`, record responsive/accessibility intent, and route the draft through
  read-only `/sc-ui` before approval. `HIGH_INTERACTION` needs evidence matching
  its runtime risk.
- Prefer vertical user-value stories that fit one focused implementation session.
- Record unresolved decisions as concrete `OPEN-*` blockers. Do not disguise missing product decisions as implementation freedom.

## Red Flags

- Writing from assumptions while approved source material or repository evidence is available.
- Horizontal layer stories, vague “works correctly” criteria, missing non-goals, or untraceable requirements.
- Technical design masquerading as product requirements.
- UI requirements without accessibility/responsiveness, or data/security/privacy requirements without failure and abuse cases.
- Proceeding to FSD while a scope- or policy-changing open item remains.

For unresolved product choices, use [brainstorming rounds](../brainstorming/references/questions-and-options.md); preserve the owning authority and skip settled scope.

## Integration

Upstream: `/sc-explore`, `brainstorming`, `agentic-delivery`, `domain-modeling`, `codebase-design`, and `interface-design`. Downstream: `writing-plans`, `issue-workflow`, and `plan-verification`. The full-tier pipeline is BRD → PRD → FSD/GOAL → execution. A PRD-only request ends with the PRD; active authorized delivery continues internally to its next owner under persistent authorization and the configured exception or stage policy in `workflow-integration.md`.
