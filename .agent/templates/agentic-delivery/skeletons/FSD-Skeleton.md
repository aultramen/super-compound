# {{PROJECT_NAME}} - Functional Specification Document

Use the full FSD template only for sections that need detailed expansion.

## Metadata

ID: FSD-{{PROJECT}}  
Artifact contract version: `2.0.0`
Status: DRAFT / APPROVED  
Upstream: PRD-{{PROJECT}}#{{IDS}}, BRD-{{PROJECT}}#{{IDS}}  
ADR applicability: NOT_REQUIRED / LINKED
ui_delivery_profile: NOT_APPLICABLE / STANDARD / HIGH_INTERACTION
ui_contract_readiness: NOT_APPLICABLE / DRAFT / BLOCKED / READY_FOR_SLICE

## Technical Contract

- Domain model, invariants, source-of-truth, states, and identifiers.
- Architecture, components, dependency rules, trust boundaries, sequences.
- Feature, data, API/event/interface, UI, job, integration, AI, security, privacy, observability, and NFR contracts.
- Tests, fixtures, verification commands, rollout, rollback, and operations.

## Screen & Interaction Contract

For UI-bearing scope, map `UI-STATE-*` and `UIMAP-*` to versioned `SCHEMA-*`
and `CONTRACT-*` refs. Pin deterministic fixture, matching mock, typed consumer
revisions, provider/consumer tests, responsive/accessibility evidence,
and the real `FIRST_VERTICAL_SLICE`. Expand only FSD Section 8 and the contract
manifest when detailed authoring is required.
For `NOT_APPLICABLE`, record an explicit reason and approver. For UI scope,
include one final `HARDENING` goal that depends on all applicable delivery slices.

## Decisions

Use approved `TDEC-*` records or linked `ACCEPTED` ADR refs. Stop on missing authority.

## Goals

Define `GOAL-*` packets with UI delivery role, required gate, contract refs,
scope, dependencies, stop conditions, and verification refs.
