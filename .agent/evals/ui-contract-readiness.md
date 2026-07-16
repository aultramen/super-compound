# Eval: UI Contract Readiness

**Date Defined:** 2026-07-16
**Feature:** UI-aware gated delivery for product, UX, frontend, and backend alignment
**Baseline:** Git `943706f0b1eca5d42df0a0ede77a5943cde45050`
**Reset condition:** Each attempt starts in a fresh agent context, reads only this
definition plus the referenced framework files, and must not see another
attempt's answer.

## Response Contract

For every case, return one JSON object with exactly these keys:
`eval_id`, `profile`, `experience_baseline_status`, `ui_contract_readiness`,
`verdict`, `blocking_reasons`, `next_owner`, and `scale_out`. Use only values
defined by the canonical UI contract; `blocking_reasons` is a sorted array of
case facts, not invented requirements.

## Capability Evals

### CAP-UI-001 — Simple CRUD

**Task input:** Greenfield web CRUD. The Business Owner validated the PRD.
Loading, empty, success, validation, error, and forbidden are covered;
stale/conflict, partial/degraded, offline, and async are approved `N/A` with
reason and approver. A wireframe resolves the stable-layout risk. Responsive and
accessibility refs exist. All visible/editable data and actions map to a pinned
OpenAPI revision. Schema, deterministic fixtures, mock, typed consumer, and
provider/consumer test refs use that revision. There are no blocking `OPEN-*`.

**Binary pass criteria:** `STANDARD`, `VALIDATED`, `READY_FOR_SLICE`, `PASS`, no
blockers, `/sc-plan`, scale-out `BLOCKED_PENDING_FIRST_SLICE`; runnable evidence
must not be required.

### CAP-UI-002 — Multi-role approval

**Task input:** UI-bearing multi-role approval with a claimed readiness score 100.
Success/loading/error are mapped, but forbidden and stale/conflict behavior
have neither coverage nor approved `N/A`. All executable contract assets match.

**Binary pass criteria:** `STANDARD`, baseline `DRAFT`, readiness `BLOCKED`,
verdict `NEEDS_REVISION`, both missing states named as blockers, next owner
`/sc-prd`, scale-out `BLOCKED`.
The score must not hide the hard-gate failure.

### CAP-UI-003 — Realtime/offline flow

**Task input:** A validated collaborative editor includes realtime reconnect,
offline queueing, dense responsive data, and complex keyboard/focus behavior.
Only static images and a clickable navigation prototype exist; other mappings
and contract assets are complete.

**Binary pass criteria:** `HIGH_INTERACTION`, baseline `VALIDATED`, readiness
`BLOCKED`, verdict `NEEDS_REVISION`, missing runnable evidence for
realtime/offline, responsive, and keyboard/focus risks named, next owner
`/sc-prd`, scale-out `BLOCKED`.

## Regression Evals

`NOT_APPLICABLE` backend-only/CLI compatibility is a protected regression path.

| Eval ID | Protected behavior and concrete input | Binary grader |
|---|---|---|
| REG-UI-001 | Backend-only/CLI scope and an unchanged artifact-contract 1.0 document with no UI fields | Remains readable; new backend planning records approved `NOT_APPLICABLE`; no UI bundle or retroactive rewrite |
| REG-UI-002 | UI network action lacks operation/schema mapping | `BLOCKED`, blocking `OPEN-*`, next owner `/sc-plan` |
| REG-UI-003 | Fixture revision differs from schema revision | Contract hard gate fails even if score is 100 |
| REG-UI-004 | First slice has mock-only success | Not `FIRST_VERTICAL_SLICE_VERIFIED`; scale-out `BLOCKED` |
| REG-UI-005 | Real provider proves auth/permission, success, representative failure, and integration checking under a `VALIDATED` baseline | First slice may become `verified`; dependent promotion is owned by `/sc-plan` |
| REG-UI-006 | Brownfield UI has no current UI/API/design-system/compatibility characterization | `BLOCKED`; characterization evidence required before approval |
| REG-UI-007 | Developer stack override has no approved `TDEC-*` or compensating verification | `BLOCKED`; next owner `/sc-plan` |
| REG-UI-008 | Pinned contract revision changes after a historical verified first slice | Historical record stays immutable, derived scale-out gate becomes stale, one active versioned re-verification pointer is required |
| REG-UI-009 | An in-flight UI goal predates artifact contract 1.1 | Targeted readiness supplement; no full artifact rewrite |
| REG-UI-010 | Workflow/public-route regression | Node structural grader proves 17 routes, authority routing, mock-only rejection, and non-UI compatibility |

## Graders

- Capability cases: exact-field deterministic comparison to the binary criteria;
  an independent attempt fails a case when any required value/blocker is absent
  or an extra requirement is invented.
- Regression cases 1–9: rubric-free binary comparison to the table by an
  independent reviewer reading the canonical contract.
- Regression case 10: `node --test .agent/tools/workflow-contracts.test.mjs
  .agent/tools/artifact-contracts.test.mjs` must exit 0.
- Human gate: Business Owner visual acceptance/UAT is not simulated by this
  framework capability eval and remains `NOT_APPLICABLE` for these synthetic cases.

## Success Definition

- Three independent attempts are recorded without discarded failures.
- Capability `pass@1 >= 70%` and `pass@3 >= 90%`.
- Regression `pass^3 = 100%` for route count, authority, mock-only rejection,
  contract revision behavior, legacy/non-UI compatibility, and in-flight handling.
- Pilot outcome claims remain separate until three comparable features provide a baseline.
