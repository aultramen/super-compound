# Loop Engineering Runtime v2

Loop Runtime v2 is the fail-closed execution boundary for Super Compound. Its machine authority is `.agent/context/project-config.json`; Markdown configuration is human guidance only. The public surface remains exactly 18 workflows under `workflow_invariants_v2`. There is no public `/loop` route.

## Operating modes

- `DISABLED` permits status, validation, and migration but no execution admission.
- `OBSERVE` permits deterministic replay and simulation without implementation or external mutation.
- `ENFORCE` is available only when the host proves hard source-write interception, required metering, and durable persistence.
- `HALTED` denies new START, RESUME, claim, dispatch, and mutation until an owner repairs the fault and returns the runtime to `DISABLED` or `OBSERVE`.

Hooks remain advisory. They can warn or collect local evidence, but only the controller, hard write interceptor, action adapter, event log, and effective-policy evaluator provide hard enforcement.

### WSL host enforcement

The default CLI verifier fails closed unless its ENFORCE capability is bound to the canonical repository root, native read-write `ext4` workspace, current WSL2 kernel/boot and root-owned machine identity, exact `bwrap` and verifier digests, hard-interceptor policy, full project-config bytes, and current `config_version`/`mode_version`. The host capability is local, single-host evidence with a maximum 60-minute lifetime; it is never portable Windows-host authority.

Untrusted source-producing commands run with the system and repository mounted read-only, a private `/tmp`, cleared environment, and user/PID/UTS/IPC namespaces. An admitted source change is committed only through a privately minted, opaque, expiring, single-use capability bound to the interceptor, root, path, intent, full config digest, and config/mode versions. The broker then uses expected-preimage CAS, file sync, atomic replace, directory sync, and digest readback. A copied or structurally fabricated admission has no authority. Linux directory-sync errors remain fatal. Deterministic failure injection can target every durability stage without relying on host-specific error behavior.

Every config mutation increments `config_version`. A mode change also increments `mode_version`; a same-mode recovery/config update preserves `mode_version`. The owner CLI requires the current digest plus both expected versions:

```text
node .agent/tools/loop-run.mjs mode transition \
  --expected-digest sha256:<current> \
  --expected-config-version <current> \
  --expected-mode-version <current> \
  --target OBSERVE|ENFORCE|DISABLED \
  --input-file <candidate.json> \
  --owner-actor <host-verified-owner> \
  --owner-attestation HOST_OWNER_ACTION
```

## Budget & Stop Wizard

The Budget & Stop Wizard is required before every `START` and `RESUME`, background submit or claim, worker dispatch, `ACTION_INTENDED`, implementation write, and external mutation. A model may recommend limits and explain them, but it cannot approve its own proposal. A host-proven human actor must choose `Confirm` or `Cancel`.

| Guardrail | Human input | Meaning |
|---|---|---|
| `max_iterations` | Required positive integer | Cumulative action/observation/verification cycles for the run |
| `max_runtime_minutes` | Optional or `null` | Additional human-layer active-runtime cap |
| `max_no_progress_iterations` | Optional or `null` | Additional consecutive no-progress cap |
| `max_tokens` | Optional or `null` | Aggregate attributed token cap, including child agents |
| `max_cost` | Optional or `null` | Project billing-currency cap |

`null` means that the human adds no cap at that layer. It does not remove or disable a stricter global, project, FSD, operation, risk, or capability limit. The wizard must show the effective merged values and explicitly warn about every `null`.

An approval envelope binds one run and phase, the goal and authority digests, verifier and eval digests, effective policy, risk, approver, expected version, and expiry. Background approval also binds one queue item. A mismatch or stale digest yields `APPROVAL_REQUIRED` without changing the lifecycle state.

Approval must be consumed before its wall-clock expiry. Once validly consumed, expiry does not interrupt an otherwise unchanged active run. Fresh human approval is required after a pause, material authority or effective-policy change, risk increase, lease loss, or `UNKNOWN_OUTCOME`; neither a model nor a worker may renew approval automatically.

## Accounting and stopping

One iteration starts atomically at `ACTION_INTENDED` and covers the action, authoritative observation, and verification cycle. A failed or crashed action still counts. Every project-source write belongs to an active iteration.

Active runtime includes running, observation, verification, in-flight action, backoff, and resuming time. It excludes paused time, approval wait, and queue-claim wait. Counters are cumulative and monotonic across RESUME. Terminal continuation creates a separately approved child run; a terminal history is never reopened.

Stop evaluation is fail-closed:

1. Safety, policy, corruption, or unknown-outcome gate.
2. Fresh required verifier `PASS` produces success.
3. Iteration, runtime, no-progress, token, or cost exhaustion stops execution.
4. Otherwise another approved iteration may begin.

Unknown token or cost attribution is recorded as unknown, never as zero. A finite effective token or cost cap requires trustworthy metering or reservation.

## Workflow and write gates

`.agent/context/workflow-invariants.json` owns five runtime fields for each of the 18 routes: `loopRuntimeRole`, `writeClasses`, `wizardPolicy`, `requiredOperationGate`, and `loopStateAccess`.

- Read-only review, audit, UI inspection, status, and pre-fix diagnosis do not need the wizard.
- Planning routes may write authority artifacts only.
- `/sc-work`, the fix phase of `/sc-debug`, launch implementation handoff, background execution, and every implementation write consume the same budget and write gate.
- `/sc-go` commit, push, Pull Request, or other external mutation consumes the same run-bound approval and operation gate.
- Unknown paths default to implementation writes and are denied before approval.

## Background and external operations

Background submission allocates a run and queue item before approval. An item is claimable only while its exact single-use envelope is valid. Lease loss requires new approval; wildcard, reusable, recurring, or multi-run approvals are forbidden.

External writes must be reversible and allowlisted. The adapter persists durable intent before dispatch, uses an idempotency key, performs authoritative readback and reconciliation, and records recovery evidence. An ambiguous outcome becomes `UNKNOWN_OUTCOME` and is never automatically retried.

The shipped canonical policy remains `external_write_policy: DENY`. Host enablement does not add a provider operation or authorize any external mutation.

## Persistence, privacy, and migration

Each run has an immutable contract, hash-linked append-only events, and a derived snapshot. Events are persisted before snapshots with expected-version CAS. Corrupt or decreasing counters halt execution. Raw prompts, chain-of-thought, secrets, PII, and raw untrusted payloads are not stored.

Migration is dry-run first and changes only machine-readable config and ledger state. Legacy PRD, FSD, issue, or active v1 run authority must be replanned. A legacy verified item becomes implemented and requires fresh verification; ambiguous legacy effects remain unknown.

## Claim boundary

The local package is a one-shot reference runtime. The framework does not provide or claim a daemon, recurring scheduler, vendor adapter, or real provider operation. It does not modify model weights, prompts, policies, verifiers, goals, budgets, or framework authority from learned evidence.

Whole-framework `ENFORCE` claims require attributable paired full and compact traces for each of all 18 routes plus fresh durability, recovery, security, budget, and release evidence. Until those gates pass, documentation and status must report the narrower proven mode.

Run `node .agent/tools/release-cutover.mjs --expected-output-digest ABSENT` to execute three fresh full-suite resets, migration and fault/recovery checks, paired OBSERVE route traces, benchmark regeneration, audit regeneration, background fixture validation, and the fake external fault matrix. The fixed, CAS-protected receipt is written under `.scratch/loop-runtime/recovery/LER2-RECOVERY-IMPLEMENTATION-01/`. This verifier never changes mode or treats its own local result as production host attestation; a missing live bounded-ENFORCE canary remains `APPROVAL_REQUIRED`.
