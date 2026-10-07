# {{PROJECT_NAME}} - Functional Specification Document

## Summary

<Explain the affected components, approach/reuse, changed contracts and material risks; name the technical decision requested at this revision. Refer to PRD behavior instead of copying it.>

<!-- Apply .agent/context/output-style.md. For systems, workflows, integrations or architecture, add a relevant Mermaid HLD without renumbering protected sections. Status-only records need no decorative diagram. -->

Use the full FSD template only for sections that need detailed expansion.
Apply [authoring applicability](../../../skills/agentic-delivery/references/templates-and-outputs.md#applicability-and-expansion).

## High-Level Design

<!-- Replace this illustrative view with the main actors/components and relationships from this artifact's qualified authority. Keep implementation detail in its owning section. -->
```mermaid
flowchart LR
 Actor[Primary actor] --> Capability[In-scope capability]
 Capability --> Outcome[Required outcome]
```

## Metadata

ID: FSD-{{PROJECT}}  
Artifact contract version: `2.0.0`
Status: DRAFT / APPROVED  
Version: {{FSD_VERSION}}
Technical owner / approver: {{NAME_OR_ROLE}}
Upstream: PRD-{{PROJECT}}#{{IDS}}, BRD-{{PROJECT}}#{{IDS}}  
ADR applicability: NOT_REQUIRED / LINKED
ui_delivery_profile: NOT_APPLICABLE / STANDARD / HIGH_INTERACTION
ui_contract_readiness: NOT_APPLICABLE / DRAFT / BLOCKED / READY_FOR_SLICE

## Technical Contract

- Affected components, reused architecture and meaningful data/control flow.
- Applicable domain model, invariants, source-of-truth, states and identifiers.
- Changed/reused data, API/event/interface, UI, job and integration contracts:
  semantic behavior, canonical contract ref/version and proving TEST refs.
- Security/privacy enforcement, trust boundaries and negative tests for applicable
  risk; observability and NFR contracts required by the approved scope.
- Relevant error/recovery, retry/idempotency and concurrency behavior.
- Tests/fixtures/commands and expected evidence; rollout, rollback/recovery and
  operations. For irreversible effects specify compensation, not fictional rollback.

## Screen & Interaction Contract

Topology: LOCAL_ONLY maps local screen/state/data behavior to tests without
artificial wire/schema/mock/provider/consumer assets or first-provider roles.
Use `topology: LOCAL_ONLY`, `network_actions: []`, mapped UI verification refs,
and no blocking OPEN refs in the existing index. NETWORKED remains the default.
Verify local behavior/accessibility in the existing goal; add separate hardening
only for outstanding merged/cross-slice obligations, not because a UI exists.

For networked UI-bearing scope, map `UI-STATE-*` and `UIMAP-*` to versioned `SCHEMA-*`
and `CONTRACT-*` refs. Pin deterministic fixture, matching mock, typed consumer
revisions, provider/consumer tests, responsive/accessibility evidence,
and the real `FIRST_VERTICAL_SLICE`. Expand only FSD Section 8 and the contract
manifest when detailed authoring is required.
For `NOT_APPLICABLE`, record an explicit factual reason. For networked UI scope,
include one final `HARDENING` goal when merged verification obligations remain;
it depends on all applicable delivery slices. UAT requires a Business Owner only
when acceptance/policy or unresolved material human judgment requires it.

## Decisions

Use approved `TDEC-*` records or linked `ACCEPTED` ADR refs. Stop on missing authority.
Record each decision once: rationale/trade-off, ADR applicability and qualified
GOAL/TEST obligations; goals reference it rather than creating a second decision.

## Goals

Define `GOAL-*` packets with UI delivery role, required gate, contract refs,
scope, dependencies, stop conditions, and verification refs.
Use the existing goal-packet grammar: entry prerequisites are not completion
proof; done conditions describe the outcome this goal produces. Record actual
pass/fail/skip and evidence identity after checks run, never from approval alone.
Before results, derive and pin a `completion_contract_v1` covering every linked
requirement and AC; reference maintained recipe/observation checks and expected
outcomes. Completion requires full actual outcome evidence and **Evidence of
Completion** under `verification-before-completion`; the final multi-goal outcome
also needs combined integration proof where required. Issue/STATE files carry
contract/digest and evidence locators rather than copying this authority.
Graph/traceability views cite these same qualified goals and verification refs; they do not create a second authority.

## AI Context and Output (conditional)

For product AI runtime only: specify actor/source attribution and versions,
chronology, authorized selection boundaries/omissions, truncation indicators,
and output-language policy from explicit requirements and selected context
(including mixed/empty/ambiguous cases). Reuse versioned output validation,
authority, fallback, and required review/edit/confirm/regenerate controls.
Expand FSD Section 11 for exact contracts; otherwise record N/A with reason.
