# {{PROJECT_NAME}} - Business Requirements Document

## Summary

<Explain the business problem, impact, proposed scope and outcome; name material risks and the business decision requested at this revision.>

<!-- Apply .agent/context/output-style.md. For systems, workflows, integrations or architecture, add a relevant Mermaid HLD without renumbering protected sections. Status-only records need no decorative diagram. -->

Use the full BRD template only for sections that need detailed expansion.
Apply [authoring applicability](../../../skills/agentic-delivery/references/templates-and-outputs.md#applicability-and-expansion).

## Profile Gate

Profile: MINIMAL / STANDARD / HIGH_RISK

MINIMAL is forbidden for regulatory impact, sensitive data, external vendor or
data egress, material financial investment, high-risk automation/AI,
cross-department process change, or irreversible migration. Expand only the
risk-relevant full-template section for STANDARD/HIGH_RISK work.

## High-Level Design

<!-- Replace this illustrative view with the main actors/components and relationships from this artifact's qualified authority. Keep implementation detail in its owning section. -->
```mermaid
flowchart LR
 Actor[Primary actor] --> Capability[In-scope capability]
 Capability --> Outcome[Required outcome]
```

## Metadata

ID: BRD-{{PROJECT}}  
Status: DRAFT / APPROVED  
Version: {{BRD_VERSION}}
Business owner / approver: {{NAME_OR_ROLE}}
Sources: {{REQUESTS_EVIDENCE_LINKS}}

## Business Contract

- Problem and business impact with sources; distinguish facts from hypotheses.
- `BREQ-*`: outcomes and success measures, baseline/source or honestly unmeasured,
  proposed target and measurement owner; never invent root cause or ROI.
- Scope, non-goals, constraints and current-to-target business flow.
- Stakeholders, decision rights and business rules/policies with their owner.
- Business acceptance (`BAC-*`), acceptance owner, applicable pause/rollback
  criteria and material risks/OPEN decisions.
- Assess information/reporting/records/controls, assumptions and dependencies;
  expand cost/benefit and operational readiness only for applicable business risk.

## Traceability

List `BREQ-*`, business acceptance IDs, risks, assumptions, dependencies, and `OPEN-*` blockers.

## Handoff

State the PRD inputs required and decisions PRD/FSD must not invent.
Approval is recorded only after the business owner grants it; PRD consumes the
qualified BREQ/BAC/rule refs without copying the business case.
