# pstack Enhancement - Functional Specification

ID: FSD-PSTACK
Artifact contract version: `2.0.0`
Status: APPROVED
Approval/source: user's 2026-10-04 supplied plan and implementation instruction.
Upstream: PRD-PSTACK#FR-001 through PRD-PSTACK#FR-007; BRD-PSTACK#BREQ-001 through BREQ-005.
ADR applicability: NOT_REQUIRED (extends existing utilities and ledger).
ui_delivery_profile: NOT_APPLICABLE
ui_contract_readiness: NOT_APPLICABLE

## Technical Contract

- TDEC-001: Exact paths from retirement commit select active surfaces through
  one helper. Audit still hashes physical retired files. Baseline Git blobs stay
  untouched; active-only selection applies to after/distribution/runtime.
- TDEC-002: Public locators use `/`; reads accept legacy separators; origins stay
  stable. Optional metadata extends existing work_package_ledger_v2, with bounded
  validators, one scheduler, in-process serialization, atomic replace and CAS.
- TDEC-003: Constraints bind ID/instruction/source/scope/supersedes plus digest.
  Corrections append history; fresh dispatch reconstructs relevant mandatory text.
- TDEC-004: Completion receipt binds assignment/report/evidence/constraint bytes.
  Classify before ack; valid verified work never becomes new implementation.
- TDEC-005: Prevention receipt binds origin/knowledge/scope/reproducer/check and
  before/after proof. Candidates/negative dispositions persist losslessly; limits
  fail visibly. Scope and evidence truth remain owning-workflow responsibilities.
- TDEC-006: Verification recipe executes project argv with bounded steps, saves
  proof before cleanup and detects erased proof. Repeated comparison requires
  identity, actual work, correctness, medians and variation. Cached input is not
  added twice; fields absent from runtime stay unknown.

## Goals and Verification

| Goal | Scope | Dependencies | Product refs | Verification |
|---|---|---|---|---|
| GOAL-001 | active registry, runner/install/audit/retrieval/fixture, Windows locator; freeze runtime baseline | none | FR-001 | TEST-001 |
| GOAL-002 | constraint/checkpoint/dispatch, receipt inbox, prevention lifecycle, bounded recovery/effectiveness | GOAL-001 | FR-002..FR-005 | TEST-002 |
| GOAL-003 | paired evaluator, Codex adapter, recipes, compact/full routes and docs, Windows CI | GOAL-002 | FR-006, FR-007 | TEST-003 |
| GOAL-004 | five paired Codex Windows trials, result/limitations, final suites and audit | GOAL-003 | FR-006, FR-007 | TEST-004 |

All roles/gates: NOT_APPLICABLE (CLI/local framework, no UI). Stop only affected
work for missing authority/access, stale proof or exhausted explicit limits.
Do not commit/publish; maintain files and user edits. Schema/runtime retirement
is not revived. File ownership follows each goal; shared state has one writer.

- TEST-001: knowledge-search, memory-maintenance, active-assets, codex-install,
  framework-audit, token-benchmark and agent-projection tests.
- TEST-002: instruction-context, completion-receipts, prevention-checks,
  maintenance-recovery, work-package and file-state tests.
- TEST-003: paired-eval, adaptive-eval, codex-pilot, verification-recipe, workflow
  contract tests, all skill/hook/Python checks; `npm run bench`.
- TEST-004: ten recorded attempts, external artifact/action grading, every
  failure retained; `npm test`, Python suites, `npm run audit`, documentation checks.

## Evidence and Operations

Criteria: `.agent/evals/pstack-enhancement.md`. Gap mapping and implementation
status: `docs/audits/2026-10-04-pstack-gap-analysis.md`. Pilot and final evidence:
`docs/eval-results/pstack-20261004.md`. Procedures live in existing skill
references and are loaded on demand. Rollback uses scoped diffs against the
preserved input snapshot; no automatic WIP commits, global install, or deletion.
