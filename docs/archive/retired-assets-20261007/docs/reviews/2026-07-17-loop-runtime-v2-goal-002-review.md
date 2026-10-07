# GOAL-002 Independent Review

Date: 2026-07-17  
Authority: `FSD-LER2@1.0.0#GOAL-002`, `#TEST-002`, `#TDEC-002`, `#TDEC-006`  
Baseline: `454089a543afa03785b8ce55064e7a6305097e3d`  
Reviewed worktree: `.sc-worktrees/super-compound-lrv2-g002`  
Reviewer role: fresh read-only spec and code-quality reviewer

## Verdict

- Spec compliance: **FAIL**.
- Code quality and security: **FAIL**.
- Integration gate: **BLOCKED**. The worktree patch must not be copied into the primary workspace until a separately approved child run closes every P1/P2 finding and the original verifier plus adversarial repros pass.

The existing focused suite passed `35/35` and the broad suite passed `126/126`, but neither suite covered the blocking cases below.

## Findings

| ID | Severity | Category | Finding and evidence |
|---|---|---|---|
| G2-R1 | P1 | truth / concurrency | `withOwnerLock` reclaims an active owner from directory mtime alone. A 120 ms active operation with `staleMs=20` produced two concurrent owners (`maxActive=2`). There is no heartbeat, fencing, or pre-commit ownership check. |
| G2-R2 | P1 | truth / integrity | Retrying `createWorkPackage` for a verified goal reconstructs the record without `evidence`, producing an invalid terminal ledger that fails the next read. Retry is not idempotent. |
| G2-R3 | P1 | truth / evidence | Verification accepts nonexistent evidence paths and does not bind referenced content by digest. Missing or later-mutated evidence can therefore authorize `verified`. |
| G2-R4 | P2 | wiring | The documented `record` CLI cannot pass `expectedVersion`, evidence, reason, or recovery; normal v2 use fails at CAS admission. `create` also cannot pin expected digests. |
| G2-R5 | P2 | artifact / parity | The ledger schema permits path forms rejected by runtime validation, including backslash traversal, UNC paths, NTFS alternate streams, and unsafe `baselineDirty` keys. |
| G2-R6 | P2 | truth / I/O | Bounded reads use `stat` followed by unrestricted `readFile`; atomic write has no bound; append size checking is raceable. Work-package retains duplicate confinement/read helpers. |
| G2-R7 | P2 | truth / numeric safety | Incrementing `Number.MAX_SAFE_INTEGER` persists an unsafe ledger version and makes the next read fail. |

## Positive evidence retained

- The seven-file scheduler allowlist was respected.
- V1/unknown ledgers, direct `ready -> verified`, nominal CAS conflicts, and stale authority/eval/reviewer digests are rejected.
- Token benchmark delegates path resolution without changing its public API.
- Atomic replacement uses a same-directory temporary file, file sync, rename, cleanup, and reports unsupported directory sync instead of overclaiming durability.
- Windows junction confinement passed the reviewer repro.

## Required re-verification

After gap closure:

1. Re-run every reviewer repro for G2-R1 through G2-R7.
2. Re-run `TEST-002` three times from clean processes.
3. Run the broad framework and hook-security suites.
4. Repeat independent spec review, then code-quality/security review.
5. Integrate only after both verdicts are `PASS`.
