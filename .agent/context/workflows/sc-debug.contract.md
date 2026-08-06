Writes: `.agent/tools/workflow-admission.mjs`.
Diagnosis is read-only; no wizard. Without an active FSD-authorized run, return
`OPEN-LOOP-AUTHORITY` before any test or fix: no write. Else require the
`START`/`RESUME` wizard, `ACTION_INTENDED`, and `source-write`. Reproduce, prove
root cause, add a regression test, fix/verify, and save non-trivial evidence at
`docs/debug/YYYY-MM-DD-<slug>.md`.
