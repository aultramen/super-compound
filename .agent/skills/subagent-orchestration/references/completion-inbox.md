# Durable Completion Inbox

## Summary

One scheduler owns a run. CLI mutations run serially; in-process ledger queues,
strict atomic replacement and version checks provide consistency, not exclusion
between independent scheduler processes. Existing v2 ledgers without new
metadata remain valid; older rejected schemas do not gain verification authority.

Pin `completionContract: {path, digest}` for each goal before completion results;
use `runCompletionContract: {path, digest}` when the run must prove a combined
outcome. These snapshots derive the full criteria from request/FSD, not a worker's
chosen subset. Pin optional create `assignment: {workerId, attempt}` for
receipt-enabled work. A worker saves its report and real verifier evidence before
submitting; submission is not completion authority. Include **Evidence of
Completion** only when every criterion is supported, per
`verification-before-completion/SKILL.md`.
The scheduler invokes `work-package.mjs submit --run <run> --goal <goal>
--input-file <json>` with workerId, attempt, reportPath, evidence and optionally
expectedVersion. The report must be the scheduler-owned report. Receipt identity
binds worker, goal, attempt, report bytes, evidence and constraint digest.
Identical submissions are no-ops and keep the ledger version.

Inspect the diff, scope and fresh verification/review evidence, then invoke
`classify` with receiptId, expectedVersion and status `implemented` or `verified`.
Ordered transitions still apply: in-progress -> implemented -> verified; a
worker report cannot jump the required review. Classification is durable before
acknowledgement. Then `ack` with receiptId and expectedVersion. An interrupted
classified receipt needs only acknowledgement. Replayed classifications/acks
are no-ops; `record` remains available for existing direct workflows.

Both `record` and `classify` must pass the same completion evidence validator
before writing `verified`. Validate all expected/observed outcome assertions,
coverage and provenance, not only digests or recipe exit codes. Failed, skipped,
partial, stale, prose-only or wrong-scope proof must leave the ledger unpromoted.
The coordinator opens/inspects manual artifacts; the gate checks the observation
record and digest, not visual meaning. Incomplete human labels come from the
verification skill; preserve machine enums and receipt idempotency.

Changed report/evidence or constraints blocks the affected goal with a typed
reconciliation reason. A lost worker is classified using `workerAvailable:false`.
Previously verified valid work is preserved; historical metadata alone does not
release a new dependency or justify current completion. After revalidation, use the existing
typed recovery/replan path; preserve old receipts as evidence, rather than
silently overwriting their identity. Inbox limits fail visibly and never evict
unacknowledged completions. Scheduler and worker identity are supplied by the
owning workflow; file digests do not authenticate arbitrary callers.
