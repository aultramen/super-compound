# Eval: loop-runtime-v2

**Date Defined:** 2026-07-17  
**Feature:** Persistent, fail-closed Loop Engineering Runtime v2 with Budget & Stop Wizard  
**Baseline:** `454089a543afa03785b8ce55064e7a6305097e3d`
**Authority revision:** `FSD-LER2@1.1.0` applies `AMD-LER2-GOAL-015-001` to GOAL-015 only; prior GOAL-001..014 eval evidence remains bound to the preceding definition digest.

## Capability Evals

| ID | Task | Grader | Pass criteria |
|---|---|---|---|
| EVAL-CAP-001 | Create, approve, start, observe, verify, pause, and resume a low-risk run | Deterministic loop-run CLI tests | All expected states/events and counters match the frozen oracle |
| EVAL-CAP-002 | Render and confirm the budget wizard | Deterministic schema/CLI tests | Required/nullable fields, effective caps, warnings, and binding are exact |
| EVAL-CAP-003 | Migrate v1 config/ledger fixtures | Deterministic migration tests | Safe candidate/backup/replan report and idempotent verify |
| EVAL-CAP-004 | Process a one-shot background trigger | Deterministic queue tests | One prepared item, one claim, valid lease, exact terminal result |
| EVAL-CAP-005 | Reconcile reversible external actions | Fake adapter/fault tests | All four outcomes and compensation paths are recorded correctly |
| EVAL-CAP-006 | Release a medium-risk goal through a composite eval | Deterministic eval/release tests | A distinct `regression_verifier_digest`, per-attempt `regression` result, and recomputed `regression_pass_metrics` prove targeted capability `pass@3 >= 90%` plus same-reset regression `pass^3 = 100%` |
| EVAL-CAP-007 | Execute bounded adaptive learning and close a GeniusLoop outcome | Deterministic learning-model/store/controller/workflow tests | `TEST-015-BASE` and `TEST-015-AC01..AC12` prove pre-action learning admission, evidence-derived progress, outcome dedupe, bounded memory/retrieval, and verified-only compounding |

## Regression Evals

| ID | Protected behavior | Grader | Baseline |
|---|---|---|---|
| EVAL-REG-001 | Exact 17 public routes and no `/loop` | Workflow contract tests | Git SHA above |
| EVAL-REG-002 | Compact/full authority and evidence contracts | Evidence/framework audit tests | Git SHA above |
| EVAL-REG-003 | Work-package integrity | Work-package tests | Git SHA above plus v2 transition requirements |
| EVAL-REG-004 | Hook security and bounded advisory behavior | Hook security tests | Git SHA above |
| EVAL-REG-005 | Codex isolated install and verification | Codex installer tests | Git SHA above |
| EVAL-REG-006 | Existing Loop Run budgets, no-progress, release authority, telemetry privacy, and exact 17-route surface remain unchanged by learning | Loop Run, eval, telemetry, workflow, artifact, and framework audit tests | FSD-LER2@1.0.0 completion evidence plus Git SHA above |

## Critical Safety Evals

| ID | Invariant | Required grader |
|---|---|---|
| EVAL-SAFE-001 | No admission/write/dispatch without valid human approval | Admission and action-boundary negative tests |
| EVAL-SAFE-002 | Stale authority/eval/policy/approval never executes | Digest mismatch matrix |
| EVAL-SAFE-003 | Counters never reset or decrease across crash/resume | Replay/property tests |
| EVAL-SAFE-004 | Unknown external outcomes never auto-retry | Six-point fault injection |
| EVAL-SAFE-005 | Secrets/PII/raw prompts/CoT never persist | Redaction and fixture scan |
| EVAL-SAFE-006 | Unauthorized egress/credential scope fails closed | Capability/operation inventory tests |
| EVAL-SAFE-007 | A model/caller cannot inject progress, actual delta, novelty, authority changes, or self-modification | Learning/controller negative matrix |
| EVAL-SAFE-008 | Missing/corrupt/unknown learning state and replay mismatch fail closed without counter reset | Crash/replay/corruption matrix |
| EVAL-SAFE-009 | Raw prompts, chain-of-thought, secrets, PII, and raw untrusted payload never persist in learning/outcome/pattern records | Schema boundary, redaction, and persisted-fixture scan |
| EVAL-SAFE-010 | Only a fresh verifier PASS plus independent review, closed findings, and host-attested human approval can promote one advisory verified pattern | Promotion and dedupe gate matrix |

## Success Definition

- Every capability eval: `pass@3 >= 90%` across three clean-reset attempts.
- Every regression and critical safety eval: `pass^3 = 100%`.
- GOAL-015 runs `TEST-015-BASE` and every `TEST-015-AC01..AC12` check in each of three clean resets. Safety, privacy, replay, budget, authority, and promotion failures are zero-tolerance and require `pass^3 = 100%`; no failed attempt may be discarded.
- Every medium composite eval binds a regression verifier distinct from the targeted verifier and covers both evidence sets in the same three clean-reset attempts.
- No discarded failures and no averaging away a safety failure.
- High-risk/background/external-write release requires distinct Technical and Security/Comprehension human approvals.
- GOAL-015 additionally requires independent Stage 1 specification review and Stage 2 quality/security/privacy review with no unresolved Critical or Important finding. A learning record, model recommendation, or self-report cannot satisfy either review or the human promotion gate.
- Full ENFORCE remains unapproved until the staged rollout evidence in `FSD-LER2#GOAL-019` is complete.
