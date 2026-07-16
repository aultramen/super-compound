# UI Contract Readiness

This reference is the canonical cross-phase rule set for UI-bearing delivery.
Workflows route here; they do not redefine the policy. It adds gates to the
existing PRD, FSD, goal-pointer, implementation, and verification authorities.

## Activation And Profiles

Set `ui_delivery_profile` for every scope:

- `NOT_APPLICABLE`: no interactive end-user surface. The UI score and gates are
  skipped with a reason and approver.
- `STANDARD`: canonical page, form, or CRUD interaction. Wireframe, static, or
  clickable evidence may be sufficient when it resolves the material risk.
- `HIGH_INTERACTION`: conditional multi-step flow, optimistic update, realtime,
  offline, gesture/drag, complex keyboard/focus, dense responsive data, or
  long-running asynchronous behavior.

An interactive surface defaults to `STANDARD` when no explicit classification
exists. `HIGH_INTERACTION` requires interactive evidence. Runnable evidence is
required when the risk is timing, runtime responsive behavior, keyboard/focus,
realtime, or offline behavior. In brownfield work, first characterize current
UI, API, design-system, and compatibility behavior as evidence; existing
behavior is not product authority.

## Evidence Selection And Record

- A static image validates visual direction or a stable layout, not interaction.
- A wireframe validates hierarchy, content priority, and basic screen scope.
- A state diagram is required when branching, role/permission transitions,
  asynchronous recovery, or multiple screens make state relationships material.
- A clickable prototype validates navigation and simple interaction sequencing,
  but not runtime behavior.
- Runnable evidence validates timing, runtime responsive behavior,
  keyboard/focus, realtime, offline, or other browser/runtime-dependent risk.

Evidence remains supporting evidence. Its locator is an external URL plus
revision or a repository-relative throwaway path plus digest, accompanied by
the decision question, reviewer, review date, and `discard | revise | promote
decision` disposition. The accepted decision moves into PRD or FSD authority;
prototype code is never a production seed.

## Statuses And Transition Rules

PRD `experience_baseline_status`:

```text
NOT_APPLICABLE | DRAFT | VALIDATED | EXCEPTION_APPROVED
```

FSD `ui_contract_readiness`:

```text
NOT_APPLICABLE | DRAFT | BLOCKED | READY_FOR_SLICE
```

`EXCEPTION_APPROVED` permits only the first vertical slice. Parallel scale-out
remains blocked until the experience baseline is `VALIDATED`. Scale-out is not
a mutable FSD status: it is derived from a `verified` first-slice issue and the
issue-board dependency graph.

## Authority And Decision Rights

- PRD owns the validated experience baseline and observable UI behavior.
- FSD Section 8 owns semantic Screen & Interaction Contract mappings.
- OpenAPI, JSON Schema, AsyncAPI, or an approved equivalent owns the exact wire
  shape delegated by the FSD.
- `ui_api_contract` is a machine-readable index, not another authority.
- Mock, fixtures, generated types, and typed clients are derived assets.
- Business Owner approves outcome, scope, observable behavior, visual
  acceptance, and UAT. PM coordinates priority and delivery impact. Technical
  Manager approves FSD, contract, integration, security, and data integrity.
- Security, accessibility baseline, contract conformance, and data-integrity
  failures cannot be waived as a visual or business preference.
- A developer stack override needs an approved `TDEC-*` plus compensating
  verification. Use an ADR only for cross-system or costly-to-reverse choices.

If FSD semantics and the machine contract conflict, create a blocking `OPEN-*`;
do not silently select one.

## Readiness Score

Minimum score is 90/100. `N/A` earns points only with a reason and approver.
`NOT_APPLICABLE` skips the score. A score never compensates for a hard-gate
failure.

| Area | Allocation |
|---|---|
| Product flow/state (25) | journey + AC 5; state applicability 10; permission/recovery 5; baseline approval 5 |
| Interaction/responsive/a11y (20) | actions/transitions 5; responsive 5; accessibility 5; risk-appropriate evidence 5 |
| UI-data-API mapping (20) | visible/editable data 5; actions to operations 5; outcomes to states 5; null/empty/redaction/concurrency semantics 5 |
| Executable contract (15) | pinned schema 3; deterministic fixtures 3; matching mock 3; typed consumer/equivalent 3; provider + consumer tests 3 |
| Traceability (10) | AC to tests 5; journey/state to tests 5 |
| Governance (10) | ownership/approval 3; version/change policy 3; no blocking `OPEN-*` 4 |

## Hard Gates

All must pass for `READY_FOR_SLICE`:

1. Experience baseline is `VALIDATED` or `EXCEPTION_APPROVED`.
2. Every critical state is covered or approved `N/A`.
3. One hundred percent of visible/editable data and network actions are mapped.
4. Schema and fixture revisions match and a validation command exists.
5. Mock and typed consumer derive from the same revision, or an approved
   `TDEC-*` documents an equivalent with compensating verification.
6. Responsive, accessibility, provider, consumer, and QA verification refs
   exist.
7. `HIGH_INTERACTION` evidence addresses runtime risk or has an explicit
   exception.
8. No blocking `OPEN-*` remains.

## Contract And Goal Boundary

Use stable IDs `UI-STATE-*`, `UIMAP-*`, `SCHEMA-*`, and `CONTRACT-*`. The FSD
maps journey/AC -> screen/action/state -> data -> operation/schema ->
result/error -> fixture/test. Exact schemas remain in the delegated machine
contract.

The `ui_api_contract` index pins the contract ID/profile/readiness/version,
PRD/FSD authority refs, repository-relative machine-contract paths and
revisions, fixture catalog, derived mock/typed-consumer revisions, provider and
consumer tests, first-slice goal/real-integration refs, owners, approvers, and
blocking `OPEN-*`.

UI delivery roles and gates are:

| `ui_delivery_role` | `required_gate` |
|---|---|
| `NOT_APPLICABLE` | `NOT_APPLICABLE` |
| `CONTRACT_ENABLER` | `NOT_APPLICABLE` |
| `FIRST_VERTICAL_SLICE` | `READY_FOR_SLICE` |
| `SCALE_OUT_SLICE` | `FIRST_VERTICAL_SLICE_VERIFIED` |
| `HARDENING` | gate selected by its dependencies |

`/sc-plan` writes only the FSD and issue pointers. If machine assets are absent,
it creates a `CONTRACT_ENABLER` goal. An FSD with readiness `DRAFT` or `BLOCKED`
may be approved only to make that bounded enabler ready; first-slice and
scale-out issues remain blocked. After the enabler is verified, return to
`/sc-plan`, update the FSD index, rerun score/hard gates, and obtain Technical
Manager approval for the updated contract. Only
`READY_FOR_SLICE` releases exactly one active `FIRST_VERTICAL_SLICE` for the
critical/highest-risk flow. Every `SCALE_OUT_SLICE` depends on the verified
first-slice issue. `/sc-plan` also creates exactly one `HARDENING` goal that
depends on all applicable UI delivery slices and owns final merged-system
integration, responsive, accessibility, E2E, visual-regression, and UAT evidence.

`CONTRACT_ENABLER` materializes schema, deterministic and edge fixtures, mock,
typed consumer, and contract tests. `FIRST_VERTICAL_SLICE` must use the real
provider and prove auth/permission, success, and at least one representative
failure. Mock-only evidence is not integration proof and cannot open scale-out.

Parallel scale-out requires at least two independent execution streams whose
time saving exceeds coordination overhead, a verified first slice, the same
pinned contract version, no unresolved dependency/shared-file overlap, a single
writer for schemas/generated artifacts/migrations/lockfiles, isolated
worktrees. After the streams merge, merged-system integration verification is
mandatory before `HARDENING` or feature completion.

## Integration Ready And Done

Frontend/backend integration is ready when the PRD baseline is acceptable, FSD
readiness is `READY_FOR_SLICE`, all hard gates pass, the pointer pins qualified
contract/fixture/test refs, and the contract enabler has produced a matching
schema, mock, deterministic fixtures, typed consumer, and provider/consumer test
seams. Frontend may then build against the pinned derived consumer while backend
builds against the provider contract; neither may change semantics silently.

A `FIRST_VERTICAL_SLICE` is verified only when the tested real-provider revision
matches the pointer, mapped success and representative failure states pass,
auth/permission and scoped responsive/accessibility behavior are proven, and
`integration-checking` evidence is recorded. The issue must have no blocking
`OPEN-*`; mock-only evidence cannot release dependents.

Feature/release verification is complete only when the `HARDENING` goal records
merged-system integration, full mapped responsive/accessibility, E2E,
visual-regression, and Business Owner UAT evidence for all delivery slices.

## Change Routing And Compatibility

Classify a change before editing:

- `EVIDENCE_ONLY`: no authority changes; retain the evidence ref.
- `PRODUCT_BEHAVIOR`: observable behavior/AC changes; update PRD and invalidate
  affected FSD mappings and not-started goals.
- `TECHNICAL_SEMANTIC`: data/API/interaction semantics change; update FSD and
  record an approved `TDEC-*` when needed.
- `WIRE_COMPATIBLE`: additive wire change; bump/pin the contract per policy,
  regenerate derived assets, revalidate fixtures, and rerun provider/consumer tests.
- `WIRE_BREAKING`: block dependent goals, review PRD/FSD impact, use the approved
  compatibility/migration strategy, bump the breaking version, and reverify.
- `IMPLEMENTATION_DIVERGENCE`: authority is unchanged; return to the owning goal.

Every authority or contract change lists impacted qualified IDs, owner/approver,
version transition, derived assets to regenerate, tests to rerun, and issues to
return to `needs-info` or `blocked`. Never repair drift silently.

A contract version or revision change makes the previous derived
`FIRST_VERTICAL_SLICE_VERIFIED` gate stale for affected not-started or dependent
work. Keep the historical verified issue as immutable audit evidence, but do not
reuse it to release the new revision. `/sc-plan` creates exactly one active
versioned first-slice re-verification pointer for the newly pinned revision and
repoints affected not-started dependents to it; historical pointers remain
immutable. Re-verify that slice before scale-out.

- Outcome, scope, or policy change -> `/sc-explore`.
- Observable behavior or acceptance change -> `/sc-prd`.
- Data, API, schema, or technical interaction change -> `/sc-plan`.
- Implementation divergence from unchanged authority -> owning `/sc-work` goal.
- New preference after acceptance -> new backlog/change request.

New artifacts, not-started UI goals, and changed contracts use these gates.
Completed/verified goals are not rewritten or revalidated retroactively as
historical work; the contract-revision rule above controls whether their proof
can release new dependents. In-flight UI goals receive a targeted readiness
supplement, not a full rewrite. Artifact contract 1.0 remains readable; no
automatic project migration is performed.
