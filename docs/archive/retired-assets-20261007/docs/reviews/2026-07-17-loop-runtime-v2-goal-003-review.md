# GOAL-003 Independent Review

Date: 2026-07-17  
Authority: `FSD-LER2@1.0.0#GOAL-003`, `#TEST-003`, `#TDEC-001`, `#TDEC-004`  
Baseline: `454089a543afa03785b8ce55064e7a6305097e3d`  
Reviewed worktree: `.sc-worktrees/super-compound-lrv2-g003`  
Reviewer role: fresh read-only spec and code-quality reviewer

## Verdict

- Spec compliance: **FAIL**.
- Code quality and security: **FAIL**.
- Integration gate: **BLOCKED**. The worktree patch remains isolated until a separately approved child run closes all P1 findings and fresh adversarial review passes.

The owned suite passed `14/14`, the broad tools suite passed `115/115`, and syntax/purity checks passed. Independent repros nevertheless violated mandatory invariants.

## Findings

| ID | Severity | Category | Finding and evidence |
|---|---|---|---|
| G3-R1 | P1 | artifact / validator | Supported JSON Schema keywords are not type/invariant checked. Malformed `required`, length, numeric, enum, and uniqueness values are accepted and one case crashes instance validation. Floating `multipleOf` and strict calendar validation are also incorrect. |
| G3-R2 | P1 | truth / lifecycle | Pause from `OBSERVED` or `VERIFYING` resumes to `RUNNING`, allowing a second action before mandatory verification. |
| G3-R3 | P1 | truth / convergence | No-progress trusts caller `positive_delta`; changing a diff digest on otherwise identical failures keeps the counter at zero. |
| G3-R4 | P1 | artifact / state parity | Unknown budget fields, invalid phase/time, and unbounded raw fingerprint/reason values can produce model states rejected by the state schema. |
| G3-R5 | P1 | truth / time | Approval is accepted exactly at expiry and timezone-less timestamps are environment-dependent. |
| G3-R6 | P1 | truth / accounting | Runtime-minute conversion and version/sequence increments can overflow. Active runtime lacks verification/backoff accounting seams. |
| G3-R7 | P1 | wiring / config | Config loading omits the required byte digest; `approval_ttl_minutes` is required by config but rejected by effective-policy resolution. |
| G3-R8 | P1 | artifact / persistence | The run contract omits nonnumeric effective-policy fields and the event schema permits semantic events such as `STARTED` and `BUDGET_CONFIRMED` with empty data. |

## Additional findings

- P2: `uniqueItems` is quadratic and several arrays have no `maxItems` bound.
- P2: the reducer has no transition that emits `verification_status=STALE`.
- P2: tests favor happy-path state mutation and missed all adversarial cases.
- P3: large validator/reducer functions and duplicate digest validation reduce auditability.

## Positive evidence retained

- Exact v2 discriminators, top-level unknown-field rejection, positive mandatory `max_iterations`, nullable optional caps, and v1 rejection work.
- Local acyclic `$ref`, composition keywords, restrictive policy merges, normal-path immutability, four reconciliation outcomes, and static controller purity work.
- Missing/v1/invalid config evaluates to `HALTED`, and finite ENFORCE runtime/no-progress checks work on normal values.

## Required re-verification

1. Re-run adversarial repros G3-R1 through G3-R8.
2. Re-run `TEST-003` three times from clean processes.
3. Run the broad tools suite and static purity check.
4. Repeat independent spec review and then code/security review.
5. Integrate only after both stages return `PASS`.
