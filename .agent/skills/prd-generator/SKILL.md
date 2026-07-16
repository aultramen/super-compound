---
name: prd-generator
description: "Use when an approved BRD must be translated into observable product requirements before FSD planning."
---

# PRD Generator

Define users, observable product behavior, rules, acceptance criteria, and outcomes between BRD exploration and technical FSD planning. Announce use before authoring.

## When to Use

Use after an approved BRD exists and before `/sc-plan`. If no BRD is approved, return upstream. If a PRD already covers the topic, ask whether to revise it or create a separately scoped document.

## Route

- For evidence collection, clarifying questions, required sections, and the compact shape, load [PRD authoring](references/prd-authoring.md).
- For story sizing, validation, storage, and downstream routing, load [validation and handoff](references/validation-and-handoff.md).
- Load the validation branch only after a draft exists.

## Invariants

- Save durable output to `docs/prd/prd-<feature-name>.md`; author from
  `.agent/templates/agentic-delivery/skeletons/PRD-Skeleton.md`, then load only
  a specific section on demand from the full PRD reference library.
- Trace requirements with qualified references such as `BRD-CCC#BREQ-001`; do not duplicate source prose when an ID is sufficient.
- Preserve BRD business policy, scope, acceptance decisions, and domain language. The PRD must not invent technical implementation, schemas, databases, or internal architecture beyond known repository constraints.
- Every goal maps to at least one story or requirement; every story has specific, verifiable acceptance criteria and negative cases where risk warrants them.
- UI-bearing PRDs set `ui_delivery_profile`, cover every named state or approved
  N/A, record responsive/accessibility intent, and route the draft through
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

## Integration

Upstream: `/sc-explore`, `brainstorming`, `agentic-delivery`, `domain-modeling`, `codebase-design`, and `interface-design`. Downstream: `writing-plans`, `issue-workflow`, and `plan-verification`. The pipeline is BRD → PRD → FSD/GOAL → execution; stop after saving and reporting the PRD unless further work is explicitly requested.
