# {{PROJECT_NAME}} - Product Requirements Document

## Summary

<State purpose, scope, key information, and decision/outcome for this document.>

<!-- Apply .agent/context/output-style.md. For systems, workflows, integrations or architecture, add a relevant Mermaid HLD without renumbering protected sections. Status-only records need no decorative diagram. -->

Use the full PRD template only for sections that need detailed expansion.

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
Upstream: BRD-{{PROJECT}}#{{IDS}}
ui_delivery_profile: NOT_APPLICABLE / STANDARD / HIGH_INTERACTION
experience_baseline_status: NOT_APPLICABLE / DRAFT / VALIDATED / EXCEPTION_APPROVED

## Product Contract

- Users, roles, jobs, journeys, feature scope, and non-goals.
- Functional requirements, acceptance criteria, edge/negative/recovery behavior.
- Product rules, states, permissions, notifications, reporting, analytics.
- Product-level security, privacy, compliance, accessibility, and NFR intent.

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

## AI Context and Output (conditional)

For product AI runtime only: specify actor/source attribution and versions,
chronology, authorized selection boundaries/omissions, truncation indicators,
and output-language policy from explicit requirements and selected context
(including mixed/empty/ambiguous cases). Reuse versioned output validation,
authority, fallback, and required review/edit/confirm/regenerate controls.
Expand PRD 9.1.17 for product decisions; otherwise record N/A with reason.
