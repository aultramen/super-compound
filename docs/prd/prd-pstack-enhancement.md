# pstack Enhancement - Product Requirements

ID: PRD-PSTACK
Artifact contract version: `2.0.0`
Status: APPROVED
Approver/source: user's 2026-10-04 implementation instruction.
Upstream: BRD-PSTACK#BREQ-001 through BRD-PSTACK#BREQ-005.
ui_delivery_profile: NOT_APPLICABLE
experience_baseline_status: NOT_APPLICABLE

## Requirements and Acceptance

| Requirement | Acceptance | Business ref |
|---|---|---|
| FR-001 active assets/portability | AC-001 exact retired paths excluded, new paths active, failures propagate; legacy locators/origins remain readable | BREQ-003 |
| FR-002 instruction recovery | AC-002 scoped constraints/source/supersession survive checkpoint and fresh/corrected dispatch; mandatory overflow blocks | BREQ-002 |
| FR-003 completion inbox | AC-003 received/classified/acknowledged survive interruption; duplicates no-op; stale/lost-worker evidence targets the owning goal | BREQ-002 |
| FR-004 prevention lifecycle | AC-004 existing check first; additive only within scope; failed/deferred versions persist; one new candidate/closeout, two attempts/version | BREQ-001, BREQ-005 |
| FR-005 maintenance/recipes | AC-005 maximum three pending jobs per lifecycle flush; only maintenance retries; proof survives cleanup; effectiveness remains evidence-backed | BREQ-001, BREQ-002 |
| FR-006 paired measurement | AC-006 all ten attempts retained, identical prompt/config/grader/fixture, anonymous grading, correctness preserved, >=10% median savings above variation | BREQ-004 |
| FR-007 public parity | AC-007 no new skill/workflow, contracts route on demand, installer/audit/token/docs/Windows recovery checks pass | BREQ-005 |

Scope: local framework, existing runtime paths and optional metadata. Actor
permissions remain those of owning routes; no new execution/release authority.
Failures preserve prior bytes and unfinished inputs; missing evidence is unknown,
not success. Applied patterns require three independent origins; one verified
defect can get its regression. Skill/workflow/policy changes need proposals.

Security/privacy: confined paths, bounded reads, no secrets or transcript sweep;
no new auth/access model. Product AI runtime: N/A (agent framework instructions).
UI states/accessibility/UAT: N/A, no screen or interactive flow added.
Release gate: deterministic verification plus honest pilot verdict, no deployment.
Risks/dependencies: CLI availability, auth, model access and five-minute limit;
timeouts/failures stay in the report. Runtime parity on other hosts is unmeasured.
Handoff: FSD must retain optional v2 compatibility, single scheduler and existing
atomic/version primitives. Do not resurrect Loop Runtime v2 or add public routes.
