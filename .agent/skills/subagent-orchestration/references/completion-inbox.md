# Durable Completion Inbox

One scheduler owns a run. CLI mutations run serially; in-process ledger queues,
strict atomic replacement and version checks provide consistency, not exclusion
between independent scheduler processes. Existing v2 ledgers without new
metadata remain valid; older rejected schemas do not gain verification authority.

Pin optional create `assignment: {workerId, attempt}` for receipt-enabled work.
A worker saves its report and real verifier evidence before sending completion.
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

Changed report/evidence or constraints blocks the affected goal with a typed
reconciliation reason. A lost worker is classified using `workerAvailable:false`.
Previously verified valid work is preserved. After revalidation, use the existing
typed recovery/replan path; preserve old receipts as evidence, rather than
silently overwriting their identity. Inbox limits fail visibly and never evict
unacknowledged completions. Scheduler and worker identity are supplied by the
owning workflow; file digests do not authenticate arbitrary callers.
