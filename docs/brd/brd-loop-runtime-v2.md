# Loop Engineering Runtime v2 - Business Requirements Document

## Profile Gate

Profile: HIGH_RISK

## Metadata

- ID: `BRD-LER2`
- Version: `1.0.0`
- Status: `APPROVED`
- Approved by: Project Owner (user)
- Approval basis: explicit request on 2026-07-17 to implement the supplied Loop Engineering Runtime v2 plan
- Sources: `docs/audits/2026-07-16-loop-engineering-gap-audit.md`; the approved implementation plan in the 2026-07-17 conversation

## Business Contract

### Objectives

- `BREQ-001`: Convert Super Compound's governed delivery lifecycle into a persistent, deterministic, machine-enforced loop runtime without adding a public `/loop` route.
- `BREQ-002`: Make execution budgets visible and human-confirmed before any implementation or external write.
- `BREQ-003`: Preserve BRD -> PRD -> FSD -> GOAL authority and require fresh verifier evidence before success.
- `BREQ-004`: Make every run resumable, crash-safe, idempotent, and bounded by typed terminal outcomes.
- `BREQ-005`: Permit only reversible, allowlisted external writes with durable intent, reconciliation, and human governance.
- `BREQ-006`: Provide portable one-shot automation, privacy-safe telemetry, and measurable convergence without vendor lock-in.
- `BREQ-007`: Preserve the exact 17-route public surface and correct historical or current capability overclaims.

### Measurable outcomes

- All audit gaps `LE-01` through `LE-15` have implementation authority, tests, and goal ownership.
- No `START`, `RESUME`, action intent, source write, external write, or worker dispatch can proceed without valid admission evidence.
- `max_iterations` is explicitly confirmed by a human for every start/resume; nullable user limits never remove stricter policy limits.
- Every terminal result has durable evidence, an owner, and a typed reason.
- Existing routes and compact contracts remain exactly 17 and contain no `/loop` alias.
- Critical safety and regression evals achieve `pass^3 = 100%`; ordinary capability evals achieve `pass@3 >= 90%`.

### Scope

- Internal Loop Run control plane, strict schemas, persistent state, budget wizard, migration, eval/review gates, telemetry, action adapter, local queue, background isolation, documentation, and packaging.
- Machine-readable migration of legacy config and work-package ledgers.

### Non-goals

- A public `/loop` workflow.
- A daemon, recurring scheduler, vendor-specific adapter, or real external operation shipped by the framework.
- Automatic rewriting of legacy BRD/PRD/FSD/issues.
- Storing prompts, chain-of-thought, secrets, raw PII, or untrusted raw payloads.
- Replacing deterministic verification or human risk acceptance with a model judge.

### Policies and business rules

- `BRULE-001`: Clean break v2; v1 runtime artifacts cannot authorize v2 execution and there is no runtime fallback.
- `BRULE-002`: Human confirmation is logical admission authority. A model may recommend but cannot approve.
- `BRULE-003`: Only `max_iterations` is mandatory user input; optional null values mean no additional user cap, not removal of upstream policy.
- `BRULE-004`: Background/high-risk execution requires finite effective runtime/no-progress caps and verifiable isolation/capabilities.
- `BRULE-005`: Unknown external outcomes never auto-retry.
- `BRULE-006`: High-risk/background release requires independent checking and human comprehension acceptance.

## Business Acceptance

- `BAC-001`: Demonstrate fail-closed admission before implementation/external writes.
- `BAC-002`: Demonstrate monotonic budgets and idempotent resume after injected crashes.
- `BAC-003`: Demonstrate stale authority, missing eval, and evidence-less verification rejection.
- `BAC-004`: Demonstrate at-most-once allowlisted external effect and all four reconciliation outcomes.
- `BAC-005`: Demonstrate privacy-safe telemetry with unknown usage preserved as unknown.
- `BAC-006`: Demonstrate full/compact conformance across exactly 17 workflows.
- `BAC-007`: Complete staged `DISABLED -> OBSERVE -> bounded ENFORCE` evidence before runtime claims.

## Risk Register

| Risk | Control |
|---|---|
| Runaway or hanging loop | Mandatory iterations plus finite effective runtime/action/no-progress policy |
| Stale authority | Full-file SHA-256 pins revalidated at every admission/action/release boundary |
| Duplicate/ambiguous external effect | Durable intent, idempotency key, authoritative readback, reconciliation |
| Approval replay | Approval binding to run, phase, goal, policy, verifier, risk, queue item, version, and expiry |
| Secret/PII leakage | Structured redacted evidence only; fail-closed persistence/export policies |
| Automation outruns review | Global/reviewer caps, dedicated worktrees, leases, quarantine, human gates |

## Traceability

| BRD requirement | Audit gaps | Business acceptance |
|---|---|---|
| BREQ-001 | LE-01, LE-06, LE-11 | BAC-002, BAC-006 |
| BREQ-002 | LE-02, LE-15 | BAC-001, BAC-007 |
| BREQ-003 | LE-03, LE-04, LE-05, LE-07, LE-08 | BAC-003 |
| BREQ-004 | LE-01, LE-02, LE-06 | BAC-002 |
| BREQ-005 | LE-10, LE-13 | BAC-004 |
| BREQ-006 | LE-09, LE-12, LE-13 | BAC-005, BAC-007 |
| BREQ-007 | LE-11, LE-14 | BAC-006 |

## Handoff

The PRD must preserve these policies and define observable runtime behavior. The FSD owns exact schemas, state transitions, interfaces, migration, verification, and rollout. Product or implementation artifacts must not invent a public route, permissive fallback, or autonomous external operation.
