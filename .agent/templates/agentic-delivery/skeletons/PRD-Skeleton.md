# {{PROJECT_NAME}} - Product Requirements Document

## Summary

<Explain the feature, users, expected result, increment scope and material risks; name the product decision requested at this revision. Refer to the BRD for business rationale.>

<!-- Apply .agent/context/output-style.md. For systems, workflows, integrations or architecture, add a relevant Mermaid HLD without renumbering protected sections. Status-only records need no decorative diagram. -->

Use the full PRD template only for sections that need detailed expansion.
Apply [authoring applicability](../../../skills/agentic-delivery/references/templates-and-outputs.md#applicability-and-expansion).

## Minimum Completeness Gate

Every profile keeps: metadata and approver; problem/evidence;
objective/outcome/metric; scope/non-goal; actors and permission intent;
canonical business rules/state; requirements and acceptance;
negative/failure/degraded behavior; security/privacy/AI assessment;
dependency/risk/open items; UAT/release gate; traceability and FSD handoff
manifest. Use `N/A - reason` instead of deleting a mandatory decision.

## High-Level Design

<!-- Replace this illustrative view with the main actors/components and relationships from this artifact's qualified authority. Keep implementation detail in its owning section. -->
```mermaid
flowchart LR
 Actor[Primary actor] --> Capability[In-scope capability]
 Capability --> Outcome[Required outcome]
```

## Metadata

ID: PRD-{{PROJECT}}  
Artifact contract version: `2.0.0`
Status: DRAFT / APPROVED  
Version: {{PRD_VERSION}}
Product owner / approver: {{NAME_OR_ROLE}}
Upstream: BRD-{{PROJECT}}#{{IDS}}
ui_delivery_profile: NOT_APPLICABLE / STANDARD / HIGH_INTERACTION
experience_baseline_status: NOT_APPLICABLE / DRAFT / VALIDATED / EXCEPTION_APPROVED

## Product Contract

- Users/roles, allowed and forbidden actions, scope and non-goals.
- Main flow: trigger -> user action -> observable result -> next step.
- `FR-*` -> `AC-*` -> qualified BRD refs: expected behavior and testable acceptance.
- Relevant validation, empty, error, permission, conflict and degraded behavior:
  message, recovery and acceptance refs, without fictitious providers/states.
- Product rules/state and observable permission intent; reference business rules
  rather than redefining them. FSD must enforce permissions beyond hidden buttons.
- Product-level security, privacy, compliance, accessibility and observable NFRs;
  expand notifications/reporting/analytics when required by the product scope.
- UAT/release gate: user steps, expected result, owner and actual evidence only
  after testing; an approved PRD is not integration proof.

## UI Experience Gate

- Critical journey and feature/AC refs.
- State applicability: loading, empty, success, validation, error, forbidden,
  stale/conflict, partial/degraded, offline, and async; each is `COVERED` or
  `N/A - factual reason`; states sharing a disposition may be grouped on
  one line.
- Responsive/accessibility intent and validation evidence refs.
- Business approver and blocking OPEN (`OPEN-*`) refs.

## Traceability

Map `FR-*`, `AC-*`, risks, assumptions, dependencies, and `OPEN-*` blockers to BRD refs.

## Handoff

State the FSD inputs required and product decisions FSD must not invent.
Include the existing versioned handoff manifest and experience evidence/approver
refs when required. PRD-only scope ends here; it does not authorize FSD or code.

## AI Context and Output (conditional)

For product AI runtime only: specify actor/source attribution and versions,
chronology, authorized selection boundaries/omissions, truncation indicators,
and output-language policy from explicit requirements and selected context
(including mixed/empty/ambiguous cases). Reuse versioned output validation,
authority, fallback, and required review/edit/confirm/regenerate controls.
Expand PRD 9.1.17 for product decisions; otherwise record N/A with reason.
