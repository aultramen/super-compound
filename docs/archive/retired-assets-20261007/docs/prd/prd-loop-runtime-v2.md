# Loop Engineering Runtime v2 - Product Requirements Document

## Metadata

- ID: `PRD-LER2`
- Artifact contract version: `2.0.0`
- Status: `APPROVED`
- Approved by: Project Owner (user)
- Approval basis: explicit request on 2026-07-17 to implement the supplied plan
- Upstream: `BRD-LER2#BREQ-001` through `BRD-LER2#BREQ-007`
- `ui_delivery_profile`: `NOT_APPLICABLE`
- `experience_baseline_status`: `NOT_APPLICABLE`
- UI reason/approver: internal CLI/runtime framework with no frontend surface; approved by Project Owner

## Product Contract

### Actors

- Human approver: confirms budgets, authority, residual risk, and high-risk release gates.
- Interactive executor: uses the controller through `/sc-work` or a delegated execution route.
- Background worker: claims one approved queue item under a lease and capability attestation.
- Verifier/checker: produces deterministic, independent, or human evidence according to risk.
- Reconciliation owner: resolves `UNKNOWN_OUTCOME` without automatic replay.

### Functional requirements

- `FR-001`: A user can create, inspect, pause, resume, verify, stop, repair, and reconcile a versioned Loop Run with durable state.
- `FR-002`: Before every start/resume, a model-rendered wizard must show goal/verifier context, recommend limits, and obtain human confirmation before any execution mutation.
- `FR-003`: The wizard requires positive `max_iterations`; `max_runtime_minutes`, `max_no_progress_iterations`, `max_tokens`, and `max_cost` are nullable user-level limits.
- `FR-004`: The controller must enforce effective policy, monotonic counters, no-progress detection, typed terminal states, stale-authority rejection, and verifier-backed completion.
- `FR-005`: Work packages, eval findings, original-return gates, independent review, and release operations must consume the same run authority/evidence.
- `FR-006`: A migration CLI must scan, safely migrate machine-readable config/ledger state, and require replan for legacy authority artifacts.
- `FR-007`: A host-neutral local one-shot queue must support prepared submit, claim, heartbeat, complete, cancel, lease recovery, and reconcile.
- `FR-008`: External writes must be stable-ID allowlisted, reversible, idempotent, auditable, and reconciled after uncertain outcomes.
- `FR-009`: Telemetry must expose convergence and attributable resource use without persisting secrets, PII, prompts, chain-of-thought, or raw untrusted payloads.
- `FR-010`: All 17 full/compact workflow paths must preserve the same admission, authority, eval, and terminal semantics.

### Acceptance criteria

- `AC-001`: `START`/`RESUME` without a fresh human approval envelope remains `READY`/`PAUSED` with `APPROVAL_REQUIRED`.
- `AC-002`: The model can propose but cannot create an authoritative confirmation.
- `AC-003`: Null/zero/negative `max_iterations` is rejected; optional null is preserved and cannot disable stricter caps.
- `AC-004`: Resume never resets or increases same-run cumulative limits; terminal continuation creates a child run.
- `AC-005`: Iterations increment atomically at `ACTION_INTENDED`, including failed/crashed actions.
- `AC-006`: Fresh verifier `PASS` plus all required gates is the only path to `SUCCESS`.
- `AC-007`: Invalid work-package transitions, missing eval, stale authority, and self-closed findings are rejected.
- `AC-008`: Background claim fails when approval, lease, runtime/no-progress cap, worktree, egress, credential, or audit capability is missing.
- `AC-009`: An external operation causes at most one effect per idempotency key and never auto-retries an indeterminate outcome.
- `AC-010`: Telemetry records unknown usage as `UNMEASURED`/`unknown`, never zero, and redacts sensitive content.
- `AC-011`: Migration is dry-run first, digest-bound, atomic, idempotent, resumable, and never auto-rewrites authority documents.
- `AC-012`: The public route set remains exactly 17, contains no `/loop`, and docs do not overclaim unverified runtime behavior.
- `AC-013`: Observe/canary/background/external rollout gates satisfy the approved reliability thresholds before full ENFORCE.

### Failure and degraded behavior

- Missing, invalid, unsupported, or v1 machine config yields effective `HALTED`.
- Missing approval does not terminate the run; it blocks admission as `APPROVAL_REQUIRED`.
- Approval expiry during an in-flight operation permits only safe observation/reconciliation, then blocks the next mutation.
- Missing/corrupt counters, event-chain corruption, unmeasurable required budgets, policy drift, or stale authority fail closed.
- `UNKNOWN_OUTCOME` requires owner reconciliation and cannot auto-resume.

### Security, privacy, and AI behavior

- Human approval must be host-attested; hosts unable to prove it remain `OBSERVE`.
- Untrusted observation is data, never operating instruction, until an explicit trusted authority transition.
- Telemetry/export remains off until purpose, classification, retention, ACL, size, rotation, and redaction revision are configured.
- Model recommendations are advisory and cannot waive policy, verifier, security, or human gates.

## Traceability

| Product requirement | BRD refs | Acceptance |
|---|---|---|
| FR-001, FR-004 | BREQ-001, BREQ-004 | AC-001, AC-004, AC-005, AC-006 |
| FR-002, FR-003 | BREQ-002 | AC-001, AC-002, AC-003 |
| FR-005 | BREQ-003 | AC-006, AC-007 |
| FR-006 | BREQ-004, BREQ-007 | AC-011 |
| FR-007, FR-008 | BREQ-005, BREQ-006 | AC-008, AC-009 |
| FR-009 | BREQ-006 | AC-010 |
| FR-010 | BREQ-007 | AC-012, AC-013 |

## FSD Handoff

The FSD must define strict schema versions, state/event authority, budget confirmation binding, effective-policy resolution, interfaces, storage ordering, migration, tests, goal DAG, and rollout. It must link an accepted ADR because the controller boundary is platform-level, security-sensitive, and costly to reverse.
