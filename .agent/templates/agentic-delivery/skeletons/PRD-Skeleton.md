# {{PROJECT_NAME}} - Product Requirements Document

Use the full PRD template only for sections that need detailed expansion.

## Minimum Completeness Gate

Every profile keeps: metadata and approver; problem/evidence;
objective/outcome/metric; scope/non-goal; actors and permission intent;
canonical business rules/state; requirements and acceptance;
negative/failure/degraded behavior; security/privacy/AI assessment;
dependency/risk/open items; UAT/release gate; traceability and FSD handoff
manifest. Use `N/A - reason` instead of deleting a mandatory decision.

## Metadata

ID: PRD-{{PROJECT}}  
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
  `N/A - reason + approver`.
- Responsive/accessibility intent and validation evidence refs.
- Business approver and blocking OPEN (`OPEN-*`) refs.

## Traceability

Map `FR-*`, `AC-*`, risks, assumptions, dependencies, and `OPEN-*` blockers to BRD refs.

## Handoff

State the FSD inputs required and product decisions FSD must not invent.
