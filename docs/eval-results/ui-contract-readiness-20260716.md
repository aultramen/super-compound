# Eval Report: UI Contract Readiness

**Date:** 2026-07-16
**Baseline:** `943706f0b1eca5d42df0a0ede77a5943cde45050`
**Scored attempts:** 3 fresh-context attempts

| Eval | Attempt 1 | Attempt 2 | Attempt 3 | Metric |
|---|---|---|---|---|
| CAP-UI-001 Simple CRUD | PASS | PASS | PASS | pass@3 PASS |
| CAP-UI-002 Multi-role approval | PASS | PASS | PASS | pass@3 PASS |
| CAP-UI-003 Realtime/offline | PASS | PASS | PASS | pass@3 PASS |
| REG-UI-001 Legacy/non-UI | PASS | PASS | PASS | pass^3 PASS |
| REG-UI-002 Missing operation/schema | PASS | PASS | PASS | pass^3 PASS |
| REG-UI-003 Fixture/schema mismatch | PASS | PASS | PASS | pass^3 PASS |
| REG-UI-004 Mock-only first slice | PASS | PASS | PASS | pass^3 PASS |
| REG-UI-005 Real first slice | PASS | PASS | PASS | pass^3 PASS |
| REG-UI-006 Brownfield characterization | PASS | PASS | PASS | pass^3 PASS |
| REG-UI-007 Stack override governance | PASS | PASS | PASS | pass^3 PASS |
| REG-UI-008 Contract revision invalidation | PASS | PASS | PASS | pass^3 PASS |
| REG-UI-009 In-flight supplement | PASS | PASS | PASS | pass^3 PASS |
| REG-UI-010 Structural routes/authority | PASS | PASS | PASS | pass^3 PASS |

**Capability pass@1:** 100% (3/3)
**Capability pass@3:** 100% (3/3)
**Capability pass^3:** 100% (3/3)
**Regression pass^3:** 100% (10/10)
**Human gates:** `NOT_APPLICABLE` for synthetic cases; Business Owner visual
acceptance and UAT remain mandatory in a real `HARDENING` goal.
**Verdict:** APPROVED for framework capability and regression behavior.

Three earlier calibration runs are retained in the raw log but excluded from
metrics because the initial eval definition omitted two required baseline-status
oracles. The definition was corrected and all scored attempts were rerun from
fresh contexts. This verdict does not claim the pilot outcome target; reduction
of preventable rework still requires three comparable production features.

Raw history: `.agent/evals/ui-contract-readiness.log`.
