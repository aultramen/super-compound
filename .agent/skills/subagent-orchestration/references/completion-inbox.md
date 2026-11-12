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

## External Execution Receipts

Use this branch only for selected or recovered authorized external execution,
or an authoritative requirement about execution identity. Use the existing
native facility or established adapter within its authority; this procedure adds
no provider, controller, ledger fields or verification gate. Ordinary delegation
needs no additional model/provider identity evidence unless its authoritative
contract requires it. Native orchestration also leaves unproved identity unknown.

```mermaid
flowchart LR
    A[Authorized request and restrictions] --> B[Existing execution route]
    B --> C[Observed facts or unknown]
    C --> D[Report and evidenceRefs]
    D --> E[Existing completion validator]
```

1. Before dispatch, bind authorization to the recipient/provider, host and any
   intermediary, the material exposed, task scope and required restrictions.
   Distinguish capabilities **requested**, **available** and actually **enforced**:
   a prompt request or advertised tool does not enforce a restriction. Check
   required access, filesystem, network, credential and output limits through the
   existing host/adapter controls. A route unable to enforce a required
   restriction is unavailable; preserve the reason and use only an authorized
   alternative. A fallback never silently expands exposure or capability.
2. Record the requested recipient/provider, host/harness, intermediaries, model
   and effort separately from observed values. Preserve aliases and `inherit`
   as requests. Record each fallback/substitution, its reason and any mismatch;
   keep the original request rather than relabeling it as the observed route.
3. Inspect execution metadata from the serving provider or trusted host and
   identify who attests to each fact and at what trust level. Bind it to this
   run, goal, worker/attempt, request identity and relevant source/configuration
   identities; retain the evidence locator and digest. Check the metadata's
   origin and association with this execution, not just the values it contains.
   Adapter assertions establish what the adapter reports, not backend
   attestation. Worker self-report, configuration, successful dispatch and file
   digests do not authenticate the served model/provider. Preserve missing,
   unavailable, inconsistent or untrusted observations as **unknown**, with the
   limitation and attestation level; never fill them from the requested values.
4. Keep exact model identity separate from an observed model family. A family
   observation cannot attest to a specific requested model. Requested effort
   likewise remains separate from served effort; an accepted flag is no proof
   that the backend applied it. Report partial trustworthy observations at the
   level they support, retaining unknown fields, mismatches and fallback history.
5. Save these facts and raw sanitized execution evidence in the existing report
   and bounded evidence artifacts. Reference them through existing `evidenceRefs`
   so the normal receipt binds their bytes to the worker, goal and attempt.
   Keep execution/terminal status, output/integration verification and cleanup
   outcomes distinct. Inspect actual outputs against the pinned acceptance
   criteria, then use the unchanged submission/classification/acknowledgement
   procedure above. Receipt existence or process exit zero never supplies
   completion authority. Missing identity alone does not block ordinary outcome
   verification; an identity-dependent acceptance or comparison remains unproved
   until its required trustworthy evidence exists.

Existing Codex pilot, session-baseline and eval-execution request records use
legacy `model` values as requested/configured identity unless separate trusted
serving metadata proves otherwise. Their flags, projected agent models and native
subagent configuration do not establish observed backend identity. Retain these
records and their original meanings; label observed identity unknown when it was
not captured. Synthetic fixtures and controlled subprocess receipts are **MOCK**
evidence of contract handling, never live-provider compatibility, model identity
or cross-model capability evidence.
