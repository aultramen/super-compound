# ADR-0001 - Loop Run Controller v2 Boundary

## Metadata

- ID: `ADR-0001`
- Status: `ACCEPTED`
- Accepted by: Project Owner (user)
- Acceptance basis: explicit request on 2026-07-17 to implement the supplied architecture
- Linked FSD: `FSD-LER2#TDEC-001` through `FSD-LER2#TDEC-012`

## Context

Super Compound has governed workflows but no shared machine-enforced runtime. Extending workflow prose, hooks, STATE, or the existing work-package ledger into a controller would mix authority, execution evidence, and lifecycle state. The boundary must also remain portable across hosts and safe for external side effects.

## Decision Contract

- `DEC-001`: Implement an internal deep `LoopRunController`. It validates and persists state only; it never executes shell, Git, network, model, or provider actions.
- `DEC-002`: Make an append-only, hash-linked event log the operational lifecycle authority. Treat snapshots as derived caches and work-package ledgers as execution evidence.
- `DEC-003`: Use strict clean-break v2 schemas and fail-closed modes. No implicit upgrade or v1 runtime fallback is permitted.
- `DEC-004`: Treat budget confirmation as a logical human admission gate bound to exact run, authority, verifier, policy, risk, queue item, version, and expiry.
- `DEC-005`: Isolate side effects behind stable-ID host adapters. The framework ships no real external operations; automated writes must be reversible, idempotent, allowlisted, and reconcilable.
- `DEC-006`: Keep the exact 17-route public surface. The controller is internal and `/sc-work` remains the primary executor.

## Options considered

1. Extend `work-package.mjs`: rejected because the ledger is evidence, not lifecycle authority.
2. Encode state in workflow prose/STATE/hooks: rejected because it is not atomic, host-neutral, or machine-enforced.
3. Add a public `/loop` workflow: rejected because it expands the public surface without adding a necessary authority boundary.
4. Adopt a vendor scheduler/controller: rejected because it introduces lock-in and does not solve framework-level authority or safety semantics.

## Consequences

- Additional schemas, CLI tools, tests, migration, and workflow wiring are required.
- Runtime metadata remains local and ignored; durable authority/eval/release evidence remains tracked.
- Hard ENFORCE requires host capability attestation. Hosts without interception/isolation can still use OBSERVE.
- Clean-break migration requires explicit replan rather than automatic prose conversion.

## Prohibited patterns

- Controller-initiated shell/network/model/provider execution.
- Direct `ready -> verified` work-package transitions.
- Snapshot-as-authority, v1 fallback, automatic retry of unknown effects, wildcard approvals, arbitrary commands/URLs, or self-approved model recommendations.
- Storing raw prompts, chain-of-thought, secrets, PII, or raw untrusted payloads in run/eval/telemetry state.

## Implementation obligations

- `OBL-001`: Schema/model separation with unsupported-keyword rejection.
- `OBL-002`: Event-first durable persistence, CAS, lock, and safe repair.
- `OBL-003`: Human budget approval before admission/action/write/dispatch.
- `OBL-004`: Pure adapter boundary with durable intent and reconciliation.
- `OBL-005`: Exact 17-route full/compact conformance and no `/loop`.

## Fitness functions

- Static purity test proves controller modules do not import process/network/provider execution APIs.
- Crash injection proves event replay and snapshot repair are deterministic.
- Admission matrix proves no implementation/external mutation without a valid approval.
- Fault matrix proves at-most-one effect and no auto-retry for indeterminate outcomes.
- Route conformance proves exactly 17 full and 17 compact routes.
